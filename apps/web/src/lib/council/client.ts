/**
 * The one place a persona plus a transcript becomes spoken dialogue.
 *
 * `orchestrator.ts` calls `generateAgentReply` once per turn; nothing else in
 * the app should reach for an AI client directly.
 */

import "server-only";

import { generateText } from "@/lib/council/groq";
import { serverEnv } from "@/lib/council/env";
import type { DebatePhase } from "@/lib/council/debate-policy";

/**
 * How many prior transcript entries a speaker is shown.
 *
 * Sending the whole history makes a session's cost quadratic: with six agents
 * over three phases, the eighteenth speaker would re-send the seventeen turns
 * before it. An agent only needs the last few exchanges to build on or push
 * back against a colleague — the proposal itself is in the system prompt and
 * never scrolls out of view.
 */
export const TRANSCRIPT_WINDOW = 6;

export interface ConversationEntry {
  /** How the line is attributed, e.g. "Rohan Desai (Financial Strategist)". */
  speaker: string;
  content: string;
  /** True when this line was spoken by the agent about to take the turn. */
  isSelf: boolean;
  isStudent: boolean;
}

export interface AgentReplyInput {
  /** Built by the orchestrator from the persona plus everything situational. */
  systemPrompt: string;
  /** Prior transcript, oldest first. */
  conversation: ConversationEntry[];
  /** How this speaker should be addressed in the closing instruction. */
  speakerLabel: string;
  /** Shapes the token budget — the challenge round needs room to argue. */
  phase?: DebatePhase;
  signal?: AbortSignal;
}

/**
 * The whole transcript goes in one `user` message, attributed line by line.
 *
 * The obvious mapping — colleagues' turns as `assistant`, the student's as
 * `user` — is what the first live session shipped, and it produced agents
 * addressing themselves: the technical seat opened with "Arjun, your
 * assumption that all ASHAs can run a smartphone app is a fatal flaw", Arjun
 * being its own name. From the model's side that is the only reading
 * available. Everything in the `assistant` role is, by the API's own
 * semantics, something *it* said, so six personas' turns arrive as one
 * undifferentiated voice it believes is its own, and it cannot tell which
 * points were its and which a colleague's.
 *
 * Flattening to a single attributed block removes the ambiguity entirely: the
 * speaker's own lines are marked `[you]`, everyone else is named, and the
 * closing line says whose turn it is.
 */
function toChatTurns(conversation: ConversationEntry[], speakerLabel: string) {
  const all = conversation.filter((message) => message.content.trim().length > 0);

  // Keep the tail, plus the student's latest turn if the tail scrolled past
  // it — the student is the one participant the council is answering to, so
  // dropping their interjection changes the reply rather than shortening it.
  const windowStart = Math.max(0, all.length - TRANSCRIPT_WINDOW);
  const lastStudentIndex = all.findLastIndex((message) => message.isStudent);
  const kept =
    lastStudentIndex >= 0 && lastStudentIndex < windowStart
      ? [all[lastStudentIndex]!, ...all.slice(windowStart)]
      : all.slice(windowStart);

  const block = kept
    .map((entry) => `${entry.isSelf ? "[you] " : ""}${entry.speaker}: ${entry.content.trim()}`)
    .join("\n\n");

  const instruction = `Your turn, ${speakerLabel}. Speak now, in your own voice, following every instruction you were given.`;

  return [
    {
      role: "user" as const,
      content: kept.length
        ? `WHAT HAS BEEN SAID SO FAR, oldest first. Lines marked [you] are your own earlier turns — never address yourself, and never repeat them.\n\n${block}\n\n---\n${instruction}`
        : `Nobody has spoken yet. You are opening the session.\n\n${instruction}`,
    },
  ];
}

/**
 * Output ceiling per phase.
 *
 * The challenge round is the one that legitimately needs more room: an agent
 * has to name whose reasoning they doubt, say what specifically is wrong with
 * it, and put a question. Diagnosis and refinement stay tight — density is the
 * point, and output tokens are the scarce half of Groq's per-minute budget.
 *
 * Raised once already: the first budgets clipped a refinement turn mid-word
 * when the model answered with a numbered plan. The prompt now forbids lists
 * outright — the turns are read aloud — but the ceiling carries the headroom
 * anyway, because a truncated sentence is the one failure a listener cannot
 * recover from.
 */
const PHASE_TOKEN_BUDGET: Record<DebatePhase, number> = {
  diagnosis: 260,
  challenge: 300,
  refinement: 340,
};

export async function generateAgentReply(input: AgentReplyInput): Promise<string> {
  return generateText({
    systemPrompt: input.systemPrompt,
    turns: toChatTurns(input.conversation, input.speakerLabel),
    model: serverEnv.groqDebateModel,
    maxOutputTokens: PHASE_TOKEN_BUDGET[input.phase ?? "diagnosis"],
    // High enough that six personas don't converge on one voice, low enough
    // that they stay on the argument in front of them.
    temperature: 0.85,
    ...(input.signal ? { signal: input.signal } : {}),
  });
}
