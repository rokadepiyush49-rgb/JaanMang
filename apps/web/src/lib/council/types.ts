/**
 * The wire contract between the council UI and its route handlers.
 *
 * The session is deliberately *stateless on the server*: the client owns the
 * transcript and posts it back with every turn. There is no database in this
 * app, and a council session is a single sitting that nobody resumes a week
 * later — so persisting it would buy nothing and cost a schema, a migration
 * and a failure mode. If sessions ever need to be revisited, this file is
 * the shape to store; nothing else has to change.
 *
 * Keep this file free of server-only imports — the client imports it too.
 */

// Type-only, and therefore erased at compile time — `debate-policy.ts` imports
// `CouncilMessage` back from here, and a value import either way would be a
// real cycle.
import type { DebatePhase } from "@/lib/council/debate-policy";

export type { DebatePhase };

/** Who produced a transcript entry. */
export type SpeakerKind = "agent" | "student" | "system";

export interface CouncilMessage {
  id: string;
  /** Agent id from `roster.ts`, or "student" / "system". */
  speakerId: string;
  kind: SpeakerKind;
  /** What was said. This is also what gets spoken aloud. */
  content: string;
  /** ISO timestamp, set when the turn was produced. */
  at: string;
  /**
   * Short labels the agent attached to its own turn — "Power deficit
   * identified", "Budget realistic". Rendered as chips under the message.
   */
  tags?: CouncilTag[];
}

export interface CouncilTag {
  label: string;
  /** `risk` renders in the danger palette; `note` is neutral. */
  tone: "risk" | "note";
}

/** Everything the student told us at setup. Fixed for the life of a session. */
export interface ProjectBrief {
  title: string;
  problem: string;
  solution: string;
  demographic?: string;
  phase?: string;
  /** Names only — file contents are not uploaded anywhere in this build. */
  attachments?: string[];
}

export interface CouncilSession {
  id: string;
  brief: ProjectBrief;
  /** Agent ids the student seated, in roster order. */
  seatedAgentIds: string[];
  transcript: CouncilMessage[];
}

// ---- POST /api/council/turn ----------------------------------------------

export interface TurnRequest {
  brief: ProjectBrief;
  seatedAgentIds: string[];
  transcript: CouncilMessage[];
  /** The student's interjection, spoken before the agent's turn if present. */
  studentMessage?: string;
}

export interface TurnResponse {
  /** The student's interjection echoed back with an id, when one was sent. */
  studentMessage: CouncilMessage | null;
  /** The agent turn just produced, or null once the session is complete. */
  message: CouncilMessage | null;
  /** Which agent should be shown as "thinking" next, for the typing indicator. */
  nextSpeakerId: string | null;
  phase: DebatePhase | null;
  progress: SessionProgress;
  complete: boolean;
}

export interface SessionProgress {
  turnsTaken: number;
  turnsPlanned: number;
  /** 0–1, for the progress bar. */
  fraction: number;
}

// ---- POST /api/council/verdict -------------------------------------------

export interface TurnRequestBase {
  brief: ProjectBrief;
  seatedAgentIds: string[];
  transcript: CouncilMessage[];
}

export type VerdictRequest = TurnRequestBase;

/**
 * The five dimensions the council scores. These are fixed rather than
 * derived from the seated agents, so two sessions on the same project stay
 * comparable even when the student seats a different panel.
 */
export type ScoreDimension =
  | "practicality"
  | "socialImpact"
  | "technicalFeasibility"
  | "financialViability"
  | "novelty";

export interface DimensionScore {
  dimension: ScoreDimension;
  /** 0–100. */
  value: number;
  /** One sentence justifying the number. */
  rationale: string;
}

export interface VerdictResponse {
  /** 0–100 overall readiness. */
  readiness: number;
  /** Short call on the project, e.g. "Viable with edits". */
  headline: string;
  scores: DimensionScore[];
  strengths: string[];
  concerns: string[];
  /** Concrete next steps, ordered most-important first. */
  actions: string[];
  /** The council's rewrite of the student's own words. */
  refinement: ProposalRefinement;
}

export interface ProposalRefinement {
  /** The student's original text, quoted back so the diff is visible. */
  original: string;
  /** The council's stronger version. */
  refined: string;
  /**
   * Phrases inside `refined` that the UI highlights as the substantive
   * upgrades. Each must appear verbatim in `refined` or it is dropped.
   */
  highlights: string[];
  /** Which seated agent drove the rewrite. */
  creditedAgentId: string;
}

// ---- Errors ---------------------------------------------------------------

export interface ApiError {
  error: string;
  code:
    | "INVALID_INPUT"
    | "MISSING_KEY"
    | "RATE_LIMITED"
    | "UPSTREAM_FAILED"
    | "TTS_FAILED";
  /** Present when the fix is a specific action the developer can take. */
  remedy?: string;
}
