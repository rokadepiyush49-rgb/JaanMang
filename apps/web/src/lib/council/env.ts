/**
 * Server-only configuration for the AI Project Council.
 *
 * Read lazily through getters rather than captured at module load: Next
 * evaluates route modules during `next build`, where `.env.local` is not
 * necessarily present, and a top-level throw there fails the build instead
 * of the request that actually needed the key.
 */

import "server-only";

/** Groq's default. Supports strict JSON-schema output, which the verdict needs. */
const DEFAULT_MODEL = "openai/gpt-oss-120b";

/**
 * Spoken debate turns are the bulk of a session's calls and the easiest work
 * in the app, so they default to a smaller model. Groq meters rate limits per
 * model, which also keeps debate traffic off the bucket the verdict depends on.
 */
const DEFAULT_DEBATE_MODEL = "openai/gpt-oss-20b";

export class MissingKeyError extends Error {
  constructor(name: string) {
    super(
      `${name} is not set. Add it to apps/web/.env.local — get a free key at https://console.groq.com/keys`,
    );
    this.name = "MissingKeyError";
  }
}

export const serverEnv = {
  get groqApiKey(): string {
    const key = process.env.GROQ_API_KEY?.trim();
    if (!key) throw new MissingKeyError("GROQ_API_KEY");
    return key;
  },

  /** True when a key is present, for endpoints that degrade instead of failing. */
  get hasGroqKey(): boolean {
    return Boolean(process.env.GROQ_API_KEY?.trim());
  },

  get groqModel(): string {
    return process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL;
  },

  get groqDebateModel(): string {
    return process.env.GROQ_DEBATE_MODEL?.trim() || DEFAULT_DEBATE_MODEL;
  },
};
