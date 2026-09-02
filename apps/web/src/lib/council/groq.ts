/**
 * Groq transport. Calls Groq's OpenAI-compatible Chat Completions API
 * directly with `fetch` rather than pulling in an SDK — one less dependency
 * to keep in step with a fast-moving provider, and it runs unchanged in
 * every Next runtime.
 *
 * Nothing outside `lib/council/` should import this file. Agent personas go
 * through `lib/council/client.ts`; the structured verdict goes through
 * `lib/council/verdict.ts`.
 */

import { serverEnv } from "@/lib/council/env";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Standard JSON Schema, as Groq's `response_format` expects. Note this is a
 * different dialect from Google's — lowercase `type` values, and no
 * `propertyOrdering`.
 */
export type JsonSchema = {
  type: "object" | "array" | "string" | "number" | "integer" | "boolean";
  description?: string;
  enum?: string[];
  items?: JsonSchema;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
};

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface GenerateOptions {
  systemPrompt?: string;
  /** Oldest first. A single user turn is the common case. */
  turns: ChatTurn[];
  maxOutputTokens?: number;
  temperature?: number;
  /** Set to request JSON matching a schema instead of prose. */
  responseSchema?: JsonSchema;
  /** Overrides `GROQ_MODEL` for this call. Used to keep cheap work off the big model. */
  model?: string;
  signal?: AbortSignal;
}

interface ChatCompletion {
  choices?: Array<{
    message?: { content?: string | null };
    finish_reason?: string;
  }>;
  error?: { message?: string; type?: string; code?: string };
}

/** Thrown for anything the caller might want to surface or retry on. */
export class GroqError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GroqError";
  }

  /** True when the council hit a per-minute token or request ceiling. */
  get isRateLimit() {
    return this.status === 429;
  }
}

/** How many times a rate-limited request is re-sent before giving up. */
const MAX_RATE_LIMIT_RETRIES = 3;

/** Ceiling on a single wait, so a long `retry-after` cannot hang a request. */
const MAX_RETRY_DELAY_MS = 10_000;

/**
 * Reasoning models bill their private thinking against the same
 * `max_completion_tokens` budget as the visible answer, and Groq's current
 * chat models all reason by default. A debate turn is capped at 180-260
 * tokens, which a default-effort model spends entirely on reasoning — the
 * reply comes back with an empty `content` and `finish_reason: "length"`,
 * which surfaces as "Groq returned no content". Low effort keeps thinking
 * to a few dozen tokens and leaves the budget for the answer.
 *
 * Not every model accepts the field (`qwen/qwen3.6-27b` takes only `none`
 * or `default`), so `post` drops it and re-sends if the model objects.
 */
const REASONING_EFFORT = "low";

/**
 * Groq reports how long to wait in two places, and neither is guaranteed:
 * a `retry-after` header in seconds, and a "Please try again in 340ms"
 * sentence inside the error message. The header is authoritative when
 * present; the sentence is the fallback, since the header is occasionally
 * absent on token-per-minute rejections. Failing both, back off
 * exponentially rather than hammering.
 */
export function retryDelayMs(
  headers: Headers | undefined,
  message: string | undefined,
  attempt: number,
): number {
  const header = headers?.get("retry-after");
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
    }
  }

  // e.g. "Please try again in 340ms." / "...in 1.5s." / "...in 2m30.5s."
  const match = message?.match(/try again in\s+(?:(\d+)m)?([\d.]+)(ms|s)\b/i);
  if (match) {
    const minutes = match[1] ? Number(match[1]) : 0;
    const value = Number(match[2]);
    if (Number.isFinite(value)) {
      const tail = match[3]!.toLowerCase() === "ms" ? value : value * 1000;
      return Math.min(minutes * 60_000 + tail, MAX_RETRY_DELAY_MS);
    }
  }

  return Math.min(500 * 2 ** attempt, MAX_RETRY_DELAY_MS);
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new GroqError("Request aborted."));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new GroqError("Request aborted."));
      },
      { once: true },
    );
  });
}

/**
 * Groq follows OpenAI's strict structured-output subset: every object must
 * refuse extra keys and list all of its properties as required. Applying it
 * here rather than by hand keeps the schema definitions readable and makes
 * it impossible to forget on a nested object.
 */
function toStrictSchema(schema: JsonSchema): JsonSchema {
  if (schema.type === "array" && schema.items) {
    return { ...schema, items: toStrictSchema(schema.items) };
  }

  if (schema.type === "object" && schema.properties) {
    const properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, toStrictSchema(value)]),
    );
    return {
      ...schema,
      properties,
      required: Object.keys(properties),
      additionalProperties: false,
    };
  }

  return schema;
}

function messagesFor(options: GenerateOptions, schemaHint?: string) {
  const system = [options.systemPrompt, schemaHint].filter(Boolean).join("\n\n");
  return [
    ...(system ? [{ role: "system" as const, content: system }] : []),
    ...options.turns
      .filter((turn) => turn.content.trim().length > 0)
      .map((turn) => ({ role: turn.role, content: turn.content.trim() })),
  ];
}

async function postOnce(body: Record<string, unknown>, signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serverEnv.groqApiKey}`,
      },
      body: JSON.stringify(body),
      signal,
      cache: "no-store",
    });
  } catch (error) {
    throw new GroqError(
      `Could not reach Groq: ${error instanceof Error ? error.message : "network error"}`,
    );
  }

  const payload = (await response.json().catch(() => null)) as ChatCompletion | null;
  return { response, payload };
}

/**
 * Retries token-per-minute rejections in place.
 *
 * A council session issues one request per agent turn with nothing
 * between them, so on a small per-minute budget it is normal to overshoot
 * by a few hundred tokens and be told to wait a few hundred milliseconds.
 * Surfacing that to the caller ends the session on a delay shorter than a
 * page transition, so it is absorbed here instead. Every other status —
 * including the 400 that drives the JSON-mode fallback — is returned
 * untouched for the caller to interpret.
 */
async function postWithRateLimitRetries(body: Record<string, unknown>, signal?: AbortSignal) {
  for (let attempt = 0; ; attempt++) {
    const result = await postOnce(body, signal);
    if (result.response.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) {
      return result;
    }
    await sleep(
      retryDelayMs(result.response.headers, result.payload?.error?.message, attempt),
      signal,
    );
  }
}

/**
 * A model that does not take `reasoning_effort` rejects the entire request
 * with a 400 naming the field, so a pinned `GROQ_MODEL` would otherwise be
 * broken by a parameter it never asked for. Re-send once without it. This
 * has to happen before the caller sees the 400, since the schema path reads
 * any 400 as "this model has no `json_schema` support" and falls back.
 */
async function post(body: Record<string, unknown>, signal?: AbortSignal) {
  const result = await postWithRateLimitRetries(body, signal);

  const rejectedTheField =
    result.response.status === 400 &&
    "reasoning_effort" in body &&
    result.payload?.error?.message?.includes("reasoning_effort");
  if (!rejectedTheField) return result;

  const withoutEffort = { ...body };
  delete withoutEffort.reasoning_effort;
  return postWithRateLimitRetries(withoutEffort, signal);
}

function readText(payload: ChatCompletion | null, model: string) {
  const choice = payload?.choices?.[0];
  const text = (choice?.message?.content ?? "").trim();

  if (!text) {
    throw new GroqError(
      `Groq returned no content from "${model}"${choice?.finish_reason ? ` (finish_reason: ${choice.finish_reason})` : ""}.`,
    );
  }

  return text;
}

function failure(status: number, payload: ChatCompletion | null, model: string) {
  const detail =
    payload?.error?.message ?? (status === 404 ? `no such model "${model}"` : `HTTP ${status}`);

  // Groq's own 404 text ("does not exist or you do not have access to it")
  // reads like a billing problem, but the usual cause is a model that has
  // since been retired. Point at the list that settles which it is.
  const hint =
    status === 404
      ? ` Groq may have retired "${model}" — list the ids your key can reach at https://api.groq.com/openai/v1/models, then set GROQ_MODEL to one of them.`
      : "";

  return new GroqError(`Groq request failed (${status}): ${detail}${hint}`, status);
}

async function generate(options: GenerateOptions): Promise<string> {
  const model = options.model ?? serverEnv.groqModel;

  const base = {
    model,
    temperature: options.temperature ?? 0.8,
    max_completion_tokens: options.maxOutputTokens ?? 512,
    reasoning_effort: REASONING_EFFORT,
  };

  if (!options.responseSchema) {
    const { response, payload } = await post(
      { ...base, messages: messagesFor(options) },
      options.signal,
    );
    if (!response.ok) throw failure(response.status, payload, model);
    return readText(payload, model);
  }

  const strict = toStrictSchema(options.responseSchema);

  // Preferred: the model validates against the schema itself, which is what
  // keeps enum fields (verdicts, vote ids, severities) honest.
  const schemaAttempt = await post(
    {
      ...base,
      messages: messagesFor(options),
      response_format: {
        type: "json_schema",
        json_schema: { name: "council_output", schema: strict, strict: true },
      },
    },
    options.signal,
  );

  if (schemaAttempt.response.ok) return readText(schemaAttempt.payload, model);

  // Only a handful of Groq models accept `json_schema`. The rest reject it
  // with a 400, so fall back to plain JSON mode and put the schema in the
  // prompt instead — the `normalise*` helpers in the callers are what make
  // that safe. Any other status is a real error, not a capability gap.
  if (schemaAttempt.response.status !== 400) {
    throw failure(schemaAttempt.response.status, schemaAttempt.payload, model);
  }

  const jsonModeAttempt = await post(
    {
      ...base,
      messages: messagesFor(
        options,
        [
          "Respond with a single JSON object and nothing else — no prose, no markdown fence.",
          "It must validate against this JSON Schema, including every `enum` constraint exactly as written:",
          JSON.stringify(strict),
        ].join("\n"),
      ),
      response_format: { type: "json_object" },
    },
    options.signal,
  );

  if (!jsonModeAttempt.response.ok) {
    throw failure(jsonModeAttempt.response.status, jsonModeAttempt.payload, model);
  }

  return readText(jsonModeAttempt.payload, model);
}

/** Prose completion — used for an agent's spoken turn in a council session. */
export function generateText(options: Omit<GenerateOptions, "responseSchema">): Promise<string> {
  return generate(options);
}

/**
 * Schema-constrained completion. JSON mode still occasionally wraps output
 * in a fence, so the response is stripped before parsing.
 */
export async function generateJson<T>(
  options: GenerateOptions & { responseSchema: JsonSchema },
): Promise<T> {
  const raw = await generate({ temperature: 0.5, maxOutputTokens: 4096, ...options });
  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new GroqError("Groq returned malformed JSON.");
  }

  // `JSON.parse` also accepts `null`, a bare string and a top-level array,
  // none of which a caller can read fields from. Rejecting them here turns a
  // wrong top-level shape into a GroqError the session can report and retry,
  // rather than a TypeError thrown later inside a normaliser.
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new GroqError("Groq returned JSON that was not an object.");
  }

  return parsed as T;
}
