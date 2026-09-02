/**
 * Request validation for the council routes.
 *
 * The session is stateless — the client posts the whole transcript back on
 * every turn — which means the request body is the *only* thing standing
 * between a caller and the prompt. Everything here exists to stop unbounded
 * or malformed input reaching the model: a transcript with ten thousand
 * entries is a bill, and a `seatedAgentIds` of unknown strings is a session
 * where nobody can ever speak.
 */

import "server-only";

import { COUNCIL_AGENTS } from "@/lib/council/roster";
import type { CouncilMessage, ProjectBrief, SpeakerKind } from "@/lib/council/types";

/** Ceilings, chosen to be far above any honest session and far below abuse. */
const LIMITS = {
  title: 200,
  text: 8_000,
  short: 200,
  attachments: 20,
  transcript: 200,
  message: 8_000,
  studentMessage: 4_000,
} as const;

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

const KNOWN_AGENT_IDS = new Set(COUNCIL_AGENTS.map((agent) => agent.id));

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

function optionalStr(value: unknown, max: number): string | undefined {
  const out = str(value, max);
  return out.length > 0 ? out : undefined;
}

export function parseBrief(value: unknown): ProjectBrief {
  const raw = (value ?? {}) as Record<string, unknown>;

  const title = str(raw.title, LIMITS.title);
  if (!title) throw new ValidationError("A project title is required.");

  const problem = str(raw.problem, LIMITS.text);
  const solution = str(raw.solution, LIMITS.text);
  if (!problem && !solution) {
    throw new ValidationError(
      "Describe either the problem or the proposed solution — the council has nothing to review otherwise.",
    );
  }

  const attachments = Array.isArray(raw.attachments)
    ? raw.attachments
        .slice(0, LIMITS.attachments)
        .map((name) => str(name, LIMITS.short))
        .filter(Boolean)
    : undefined;

  return {
    title,
    problem,
    solution,
    ...(optionalStr(raw.demographic, LIMITS.short)
      ? { demographic: optionalStr(raw.demographic, LIMITS.short)! }
      : {}),
    ...(optionalStr(raw.phase, LIMITS.short)
      ? { phase: optionalStr(raw.phase, LIMITS.short)! }
      : {}),
    ...(attachments?.length ? { attachments } : {}),
  };
}

/**
 * Unknown ids are dropped rather than rejected, so a stale client that still
 * seats a renamed agent degrades to a smaller council instead of a 400.
 * An empty result is fatal — a session with no seats can never advance.
 */
export function parseSeatedAgentIds(value: unknown): string[] {
  const ids = Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === "string"))].filter((id) =>
        KNOWN_AGENT_IDS.has(id),
      )
    : [];

  if (ids.length === 0) {
    throw new ValidationError("Seat at least one council agent before starting a session.");
  }

  // Roster order, so the tie-break in speaker scoring is stable regardless of
  // the order the client happened to send.
  return COUNCIL_AGENTS.map((agent) => agent.id).filter((id) => ids.includes(id));
}

const KINDS: readonly SpeakerKind[] = ["agent", "student", "system"];

/**
 * Rebuilds the transcript from the wire, keeping only well-formed entries.
 *
 * Entries are reconstructed field by field rather than passed through, so a
 * client cannot smuggle extra keys into an object that ends up interpolated
 * into a prompt. Only the newest `LIMITS.transcript` entries are kept — the
 * prompt window is six, so anything beyond that is cost without effect.
 */
export function parseTranscript(value: unknown): CouncilMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .slice(-LIMITS.transcript)
    .map((entry, index): CouncilMessage | null => {
      if (!entry || typeof entry !== "object") return null;
      const raw = entry as Record<string, unknown>;

      const content = str(raw.content, LIMITS.message);
      if (!content) return null;

      const kind = KINDS.includes(raw.kind as SpeakerKind)
        ? (raw.kind as SpeakerKind)
        : "system";

      const speakerId =
        kind === "agent" ? str(raw.speakerId, LIMITS.short) : kind;
      // An agent entry naming no known seat would be attributed to a persona
      // that does not exist, so it is dropped rather than guessed at.
      if (kind === "agent" && !KNOWN_AGENT_IDS.has(speakerId)) return null;

      const at = str(raw.at, 40);

      return {
        id: str(raw.id, 100) || `msg_${index}`,
        speakerId,
        kind,
        content,
        at: at && !Number.isNaN(Date.parse(at)) ? at : new Date().toISOString(),
        ...(Array.isArray(raw.tags)
          ? {
              tags: raw.tags
                .slice(0, 2)
                .map((tag) => {
                  const t = (tag ?? {}) as Record<string, unknown>;
                  const label = str(t.label, 48);
                  return label
                    ? { label, tone: t.tone === "risk" ? ("risk" as const) : ("note" as const) }
                    : null;
                })
                .filter((tag): tag is NonNullable<typeof tag> => tag !== null),
            }
          : {}),
      };
    })
    .filter((message): message is CouncilMessage => message !== null);
}

export function parseStudentMessage(value: unknown): string | undefined {
  return optionalStr(value, LIMITS.studentMessage);
}
