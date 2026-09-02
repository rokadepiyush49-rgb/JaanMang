/**
 * Turns a finished session into the council's verdict.
 *
 * One schema-constrained call, not six. The alternative — asking each agent to
 * score their own dimension — costs six requests and produces scores nobody
 * reconciled, so the technical seat rates feasibility 40 while the summary
 * calls the project ready. A single pass sees the whole transcript and has to
 * make the numbers agree with the prose.
 */

import "server-only";

import { generateJson, type JsonSchema } from "@/lib/council/groq";
import { getAgent } from "@/lib/council/roster";
import { DIMENSIONS } from "@/lib/council/verdict-labels";
import type {
  CouncilMessage,
  DimensionScore,
  ProjectBrief,
  ProposalRefinement,
  ScoreDimension,
  VerdictResponse,
} from "@/lib/council/types";

/**
 * `readiness` is asked for rather than averaged from the dimensions.
 *
 * A mean would let a project with one fatal flaw and four strong scores read
 * as 80% ready, which is exactly the false comfort this whole feature exists
 * to remove. Asking for it separately lets the model weight a blocker as a
 * blocker; `normalise` then checks it has not drifted somewhere absurd.
 */
const SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    readiness: {
      type: "integer",
      description:
        "0-100 overall readiness. This is a judgement, not an average — a single unresolved blocker should hold it below 50 no matter how strong the other dimensions are.",
    },
    headline: {
      type: "string",
      description:
        "At most 4 words summarising the call, e.g. 'Viable with edits', 'Promising but unfunded', 'Not yet feasible'.",
    },
    scores: {
      type: "array",
      description: "Exactly one entry per dimension, all five present.",
      items: {
        type: "object",
        properties: {
          dimension: { type: "string", enum: DIMENSIONS },
          value: { type: "integer", description: "0-100." },
          rationale: {
            type: "string",
            description:
              "One sentence, citing what was actually said in the session or written in the proposal.",
          },
        },
      },
    },
    strengths: {
      type: "array",
      description: "3-5 things that genuinely hold up. Specific, not generic praise.",
      items: { type: "string" },
    },
    concerns: {
      type: "array",
      description:
        "3-5 unresolved problems, most serious first. Name the consequence, not just the topic.",
      items: { type: "string" },
    },
    actions: {
      type: "array",
      description:
        "3-5 concrete next steps the student can start this week, most important first. Each must be something they can actually do — a number to find, a person to talk to, a scope cut to make.",
      items: { type: "string" },
    },
    refinement: {
      type: "object",
      description: "A stronger rewrite of the student's own proposal.",
      properties: {
        refined: {
          type: "string",
          description:
            "2-4 sentences rewriting the student's solution so it states the mechanism, the beneficiary and a measurable outcome. Keep their actual idea — sharpen it, do not replace it. Wrap the 2-4 short phrases that are the real upgrades over the original in [[double square brackets]], inline, e.g. 'We will deliver the list [[via USSD on any feature phone]] and measure [[women screened per month]].' Mark phrases, never whole sentences.",
        },
        creditedAgentId: {
          type: "string",
          description: "The id of the seated agent whose points most shaped this rewrite.",
        },
      },
    },
  },
};

interface RawVerdict {
  readiness?: unknown;
  headline?: unknown;
  scores?: unknown;
  strengths?: unknown;
  concerns?: unknown;
  actions?: unknown;
  refinement?: unknown;
}

function clampScore(value: unknown, fallback = 50): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function stringList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, max);
}

/**
 * Fills in any dimension the model omitted.
 *
 * Groq only enforces the schema on models that support `json_schema`; the
 * others go through plain JSON mode where a missing array entry is entirely
 * possible. A verdict page rendering four bars instead of five is a worse
 * failure than one honest "not assessed", so the gap is filled explicitly.
 */
function normaliseScores(value: unknown): DimensionScore[] {
  const byDimension = new Map<ScoreDimension, DimensionScore>();

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const raw = entry as Record<string, unknown>;
      const dimension = raw.dimension as ScoreDimension;
      if (!DIMENSIONS.includes(dimension) || byDimension.has(dimension)) continue;
      byDimension.set(dimension, {
        dimension,
        value: clampScore(raw.value),
        rationale:
          typeof raw.rationale === "string" && raw.rationale.trim()
            ? raw.rationale.trim()
            : "No rationale was recorded for this dimension.",
      });
    }
  }

  return DIMENSIONS.map(
    (dimension) =>
      byDimension.get(dimension) ?? {
        dimension,
        value: 50,
        rationale: "The council did not reach a clear position on this dimension.",
      },
  );
}

/** Wrapper the model is asked to put around each upgraded phrase. */
const HIGHLIGHT = /\[\[([^\][]{3,120})\]\]/g;

/** A "highlight" covering most of the rewrite is not a highlight. */
const MAX_HIGHLIGHT_SHARE = 0.5;

/**
 * Pulls the marked phrases out of the rewrite and returns clean text.
 *
 * The first design asked for a separate `highlights` array of phrases "copied
 * VERBATIM from `refined`". Models do not do that. Asked directly, this one
 * returned four tidy paraphrases — "Mobile app for ASHA workers to plan daily
 * routes" — none of which appeared in the rewrite at all, so every highlight
 * was correctly discarded and the improvement panel rendered unmarked. The
 * instruction was not the problem; summarising is simply what a model does
 * when asked for a list of key points.
 *
 * Marking the phrases inline instead makes the guarantee structural rather
 * than a request: whatever comes back between the brackets is by construction
 * a substring of the text, because it is cut from it.
 */
function extractHighlights(marked: string): { text: string; highlights: string[] } {
  const highlights: string[] = [];

  for (const match of marked.matchAll(HIGHLIGHT)) {
    const phrase = match[1]!.trim();
    if (phrase.length < 4) continue;
    if (!highlights.includes(phrase)) highlights.push(phrase);
  }

  const text = marked.replace(HIGHLIGHT, "$1").replace(/\s+/g, " ").trim();

  // A model that wrapped a whole sentence has marked nothing useful; showing
  // the entire rewrite highlighted is worse than showing none of it.
  const kept = highlights
    .filter((phrase) => phrase.length <= text.length * MAX_HIGHLIGHT_SHARE)
    .filter((phrase) => text.includes(phrase))
    .slice(0, 4);

  return { text, highlights: kept };
}

export function normaliseRefinement(
  value: unknown,
  brief: ProjectBrief,
  seatedAgentIds: string[],
): ProposalRefinement {
  const raw = (value ?? {}) as Record<string, unknown>;
  const original = (brief.solution || brief.problem).trim();
  const marked =
    typeof raw.refined === "string" && raw.refined.trim() ? raw.refined.trim() : original;

  const { text: refined, highlights } = extractHighlights(marked);

  const credited =
    typeof raw.creditedAgentId === "string" && seatedAgentIds.includes(raw.creditedAgentId)
      ? raw.creditedAgentId
      : seatedAgentIds[0] ?? "citizen";

  return { original, refined, highlights, creditedAgentId: credited };
}

function transcriptFor(transcript: CouncilMessage[]): string {
  return transcript
    .filter((message) => message.kind !== "system")
    .map((message) => {
      if (message.kind === "student") return `The student: ${message.content}`;
      const agent = getAgent(message.speakerId);
      return `${agent.personName} (${agent.name}): ${message.content}`;
    })
    .join("\n\n");
}

export interface VerdictInput {
  brief: ProjectBrief;
  seatedAgentIds: string[];
  transcript: CouncilMessage[];
}

export async function generateVerdict(
  input: VerdictInput,
  signal?: AbortSignal,
): Promise<VerdictResponse> {
  const { brief, seatedAgentIds, transcript } = input;

  const systemPrompt = [
    "You are the chair of an advisory council that has just finished reviewing a student's project",
    "proposal. Write the council's verdict.",
    "",
    "Your job is to help the student make this work, so be concrete and be honest. Do not flatter, and",
    "do not soften a blocker into a suggestion. Everything you write must be traceable to the proposal",
    "or to what was actually said in the session below — do not introduce new objections nobody raised,",
    "and do not cite figures, studies or sources that do not appear in the transcript.",
    "",
    "THE PROPOSAL",
    `Title: ${brief.title}`,
    brief.problem ? `Problem statement: ${brief.problem}` : "",
    brief.solution ? `Proposed solution: ${brief.solution}` : "",
    brief.demographic ? `Target demographic: ${brief.demographic}` : "",
    brief.phase && brief.phase !== "Select Phase" ? `Current phase: ${brief.phase}` : "",
    "",
    "THE SEATED COUNCIL",
    seatedAgentIds
      .map((id) => {
        const agent = getAgent(id);
        return `- ${id}: ${agent.personName}, ${agent.name}`;
      })
      .join("\n"),
    "",
    "THE SESSION TRANSCRIPT",
    transcript.length ? transcriptFor(transcript) : "(The session produced no discussion.)",
  ]
    .filter(Boolean)
    .join("\n");

  const raw = await generateJson<RawVerdict>({
    systemPrompt,
    turns: [
      {
        role: "user",
        content:
          "Write the verdict as JSON. Score every dimension, and make the numbers agree with what you wrote in the concerns.",
      },
    ],
    responseSchema: SCHEMA,
    temperature: 0.4,
    maxOutputTokens: 2_400,
    ...(signal ? { signal } : {}),
  });

  return {
    readiness: clampScore(raw.readiness),
    headline:
      typeof raw.headline === "string" && raw.headline.trim()
        ? raw.headline.trim().slice(0, 40)
        : "Assessment complete",
    scores: normaliseScores(raw.scores),
    strengths: stringList(raw.strengths, 5),
    concerns: stringList(raw.concerns, 5),
    actions: stringList(raw.actions, 5),
    refinement: normaliseRefinement(raw.refinement, brief, seatedAgentIds),
  };
}
