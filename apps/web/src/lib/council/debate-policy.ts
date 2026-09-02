/**
 * Turn-taking for a council session.
 *
 * Deliberately free of any server-only import: the session UI needs the same
 * answers as the route handler (who speaks next, which phase we are in, how
 * far through we are), and duplicating the policy is how the two drift apart.
 *
 * Selection is *scored*, not a rota. A rota produces six prepared statements
 * read into the same room — the student says "we have no budget for SIM
 * cards" and the next speaker is whoever happens to be up. Scoring means the
 * financial seat takes that, and the architect waits.
 */

import {
  getAgent,
  topicAuthority,
  type DebateTopic,
} from "@/lib/council/roster";
import { detectTopic, type TopicReading } from "@/lib/council/topics";
import type { CouncilMessage } from "@/lib/council/types";
import type { Locale } from "@/lib/i18n/locale";

// ---- Phases ---------------------------------------------------------------

/**
 * A useful review has movements, and each asks a different thing of the room.
 *
 * Boardroom's phases were opening / cross-examination / closing, which suit a
 * panel deciding whether to invest. This council is not deciding anything —
 * it is making a proposal practical — so the arc ends on *what to change*
 * rather than on a vote.
 */
export type DebatePhase = "diagnosis" | "challenge" | "refinement";

export const DEBATE_PHASES: readonly DebatePhase[] = [
  "diagnosis",
  "challenge",
  "refinement",
] as const;

export const PHASE_LABEL: Record<DebatePhase, string> = {
  diagnosis: "Diagnosis",
  challenge: "Challenge",
  refinement: "Refinement",
};

/** What the prompt tells an agent this phase is for. */
export const PHASE_BRIEF: Record<DebatePhase, string> = {
  diagnosis:
    "This is the diagnosis round. Give your first read on the proposal from your own seat. Name the single " +
    "biggest gap between what the student has written and what would survive contact with reality. Be " +
    "specific about which sentence or assumption you are reacting to.",
  challenge:
    "This is the challenge round. Do not restate your diagnosis. Put a direct question to a named colleague " +
    "whose reasoning you doubt, or answer one that was put to you. Disagreement is the point of this round — " +
    "if you agree with everyone, you are not reading closely enough.",
  refinement:
    "This is the refinement round. Stop diagnosing and start prescribing. Name one concrete change to the " +
    "proposal — a scope cut, a different technology, a specific stakeholder to talk to, a number to go and " +
    "find — that would most improve its practicality. Say what it fixes.",
};

/** The same three briefs in Hindi — composed, not translated. See `personas.ts`. */
export const PHASE_BRIEF_HI: Record<DebatePhase, string> = {
  diagnosis:
    "यह जाँच का दौर है। अपनी सीट से प्रस्ताव पर पहली राय दीजिए। छात्र ने जो लिखा है और जो ज़मीन पर टिक पाएगा — " +
    "उनके बीच की सबसे बड़ी खाई एक वाक्य में बताइए। यह भी साफ़ कीजिए कि आप किस पंक्ति या किस मान्यता पर प्रतिक्रिया दे रहे हैं।",
  challenge:
    "यह बहस का दौर है। अपनी पिछली बात दोहराइए मत। किसी सहयोगी का नाम लेकर उनके तर्क पर सीधा सवाल कीजिए, या जो सवाल " +
    "आप पर उठा है उसका जवाब दीजिए। असहमति ही इस दौर का मक़सद है — अगर आप सबसे सहमत हैं तो आपने ध्यान से पढ़ा नहीं।",
  refinement:
    "यह सुधार का दौर है। कमियाँ गिनाना बंद कीजिए, अब उपाय बताइए। प्रस्ताव में एक ठोस बदलाव सुझाइए — दायरा घटाना, " +
    "दूसरी तकनीक, किसी ख़ास व्यक्ति से बात, या कोई आँकड़ा जो छात्र को जाकर निकालना है — जो इसे सबसे ज़्यादा व्यावहारिक " +
    "बनाए। और यह भी कहिए कि इससे क्या ठीक होता है।",
};

export function phaseBrief(phase: DebatePhase, locale: Locale): string {
  return locale === "hi" ? PHASE_BRIEF_HI[phase] : PHASE_BRIEF[phase];
}

export const PHASE_LABEL_HI: Record<DebatePhase, string> = {
  diagnosis: "जाँच",
  challenge: "बहस",
  refinement: "सुधार",
};

export function phaseName(phase: DebatePhase, locale: Locale): string {
  return locale === "hi" ? PHASE_LABEL_HI[phase] : PHASE_LABEL[phase];
}

export interface PhaseProfile {
  /** Turns each seated agent takes in each phase. 0 skips the phase. */
  turnsPerAgent: Record<DebatePhase, number>;
}

/**
 * Named profiles, because session length is a demo constraint as much as a
 * product one. `standard` is the real thing; `quick` drops the challenge
 * round to fit a live demo slot, at the cost of the disagreement that makes
 * the council look like a council.
 */
export const PHASE_PROFILES: Record<string, PhaseProfile> = {
  standard: { turnsPerAgent: { diagnosis: 1, challenge: 1, refinement: 1 } },
  quick: { turnsPerAgent: { diagnosis: 1, challenge: 0, refinement: 1 } },
  deep: { turnsPerAgent: { diagnosis: 1, challenge: 2, refinement: 1 } },
};

export const DEFAULT_PHASE_PROFILE = "standard";

/**
 * Resolved from `NEXT_PUBLIC_COUNCIL_PROFILE` so the client and the route
 * handler agree without another round-trip. Unknown values fall back rather
 * than throwing — a typo in `.env.local` should not take the council down.
 */
export function resolvePhaseProfile(name?: string): PhaseProfile {
  const key = (
    name ??
    process.env.NEXT_PUBLIC_COUNCIL_PROFILE ??
    DEFAULT_PHASE_PROFILE
  ).trim();
  return PHASE_PROFILES[key] ?? PHASE_PROFILES[DEFAULT_PHASE_PROFILE]!;
}

// ---- Turn accounting ------------------------------------------------------

export interface ProgressInput {
  seatedAgentIds: string[];
  transcript: CouncilMessage[];
  /** Defaults to the env-resolved profile. Injectable for tests. */
  profile?: PhaseProfile;
}

function agentTurns(transcript: CouncilMessage[]) {
  return transcript.filter((message) => message.kind === "agent");
}

/** Total agent turns planned for a phase. */
function phaseCapacity(seats: number, profile: PhaseProfile, phase: DebatePhase) {
  return seats * profile.turnsPerAgent[phase];
}

/** Turns taken so far, keyed by agent id. Seated-but-silent ids map to 0. */
export function turnCounts({ seatedAgentIds, transcript }: ProgressInput) {
  const counts = new Map<string, number>(seatedAgentIds.map((id) => [id, 0]));
  for (const message of agentTurns(transcript)) {
    const current = counts.get(message.speakerId);
    if (current !== undefined) counts.set(message.speakerId, current + 1);
  }
  return counts;
}

/**
 * Which phase the session is in, derived from the transcript rather than
 * stored.
 *
 * Derived state cannot disagree with the transcript, which matters because
 * the client and the server both compute it independently.
 */
export function currentPhase(state: ProgressInput): DebatePhase | null {
  const profile = state.profile ?? resolvePhaseProfile();
  const seats = state.seatedAgentIds.length;
  if (seats === 0) return null;

  const seated = new Set(state.seatedAgentIds);
  let spoken = agentTurns(state.transcript).filter((message) =>
    seated.has(message.speakerId),
  ).length;

  for (const phase of DEBATE_PHASES) {
    const capacity = phaseCapacity(seats, profile, phase);
    if (capacity === 0) continue;
    if (spoken < capacity) return phase;
    spoken -= capacity;
  }
  return null;
}

/** Turns each agent has taken *within the current phase*. */
function phaseTurnCounts(state: ProgressInput, phase: DebatePhase) {
  const profile = state.profile ?? resolvePhaseProfile();
  const seats = state.seatedAgentIds.length;
  const seated = new Set(state.seatedAgentIds);

  let offset = 0;
  for (const candidate of DEBATE_PHASES) {
    if (candidate === phase) break;
    offset += phaseCapacity(seats, profile, candidate);
  }

  const counts = new Map<string, number>(state.seatedAgentIds.map((id) => [id, 0]));
  const turns = agentTurns(state.transcript).filter((message) =>
    seated.has(message.speakerId),
  );
  for (const message of turns.slice(offset)) {
    counts.set(message.speakerId, (counts.get(message.speakerId) ?? 0) + 1);
  }
  return counts;
}

// ---- Scoring --------------------------------------------------------------

/**
 * Weights sum to 1, so a score reads as 0–1.
 *
 * Relevance dominates by design: the whole point is that the right person
 * answers the question in front of the room. Fairness is the counterweight
 * that stops a session about architecture becoming the Arjun show.
 */
export const SPEAKER_WEIGHTS = {
  relevance: 0.45,
  fairness: 0.2,
  studentMention: 0.15,
  disagreement: 0.1,
  priority: 0.1,
} as const;

/** Subtracted from the final score; not part of the weighted sum. */
const RECENCY_PENALTY = 0.3;

/** How many student turns back a mention still pulls a speaker forward. */
const MENTION_WINDOW = 3;

/** Markers that make a message a challenge rather than a passing reference. */
const CHALLENGE_MARKERS = [
  "disagree", "not convinced", "pushback", "push back", "challenge", "wrong",
  "doubt", "however", "but i", "that assumes", "assumption", "why do you",
  "how do you", "justify", "explain", "unconvinced", "overstates", "understates",
  "too optimistic", "sceptical", "skeptical", "unrealistic", "hand-wave",

  // --- Devanagari. Without these a Hindi session records no challenges at
  // all: an agent is only pulled back to answer when someone disagreed with
  // them *by name*, and the disagreement half was English-only.
  "असहमत", "सहमत नहीं", "मैं असहमत", "लेकिन", "परंतु", "हालाँकि", "हालांकि",
  "संदेह", "शक", "कैसे", "क्यों", "यह मान लेना", "मान्यता", "अवास्तविक",
  "ग़लत", "गलत", "उचित नहीं", "पर्याप्त नहीं", "स्पष्ट कीजिए", "जवाब दीजिए",
  "बहुत आशावादी", "आपत्ति",
];

export interface SpeakerScore {
  agentId: string;
  score: number;
  /** Component breakdown, surfaced so the UI can explain the pick. */
  parts: {
    relevance: number;
    fairness: number;
    studentMention: number;
    disagreement: number;
    priority: number;
    recencyPenalty: number;
  };
}

/** Whole-word, case-insensitive check for any of `needles` in `haystack`. */
function mentionsAny(haystack: string, needles: string[]): boolean {
  const text = ` ${haystack.toLowerCase()} `;
  return needles.some((needle) => {
    const term = needle.toLowerCase();
    const at = text.indexOf(term);
    if (at === -1) return false;
    const before = text[at - 1] ?? " ";
    const after = text[at + term.length] ?? " ";
    return !/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after);
  });
}

/** Names the student might plausibly use for this agent. */
export function addressTerms(agentId: string): string[] {
  const agent = getAgent(agentId);
  const [first, ...rest] = agent.personName.replace(/^Dr\.?\s+/i, "").split(/\s+/);
  return [
    agentId,
    ...(first ? [first] : []),
    ...(rest.length ? [rest.join(" ")] : []),
    agent.name,
    ...agent.aliases,
  ]
    .filter(Boolean)
    .map((term) => term.toLowerCase());
}

export interface SpeakerSelectionInput extends ProgressInput {
  /** Student message not yet in the transcript — the newest thing said. */
  pendingStudentMessage?: string;
  /** Pre-computed to avoid detecting the topic twice per turn. */
  topic?: TopicReading;
}

/**
 * Scores every eligible agent and returns them best-first.
 *
 * Exported so the UI can show *why* someone has the floor — that explanation
 * is most of what makes this read as orchestration rather than a shuffle.
 */
export function scoreSpeakers(input: SpeakerSelectionInput): SpeakerScore[] {
  const profile = input.profile ?? resolvePhaseProfile();
  const phase = currentPhase({ ...input, profile });
  if (!phase) return [];

  const allowance = profile.turnsPerAgent[phase];
  const inPhase = phaseTurnCounts({ ...input, profile }, phase);
  const totals = turnCounts({ ...input, profile });
  const topic =
    input.topic ?? detectTopic(input.transcript, input.pendingStudentMessage);

  const turns = agentTurns(input.transcript);
  const lastSpeakerId = turns[turns.length - 1]?.speakerId ?? null;
  const secondLastSpeakerId = turns[turns.length - 2]?.speakerId ?? null;

  // Student messages that could be addressing someone, newest last.
  const studentTexts = [
    ...input.transcript
      .filter((message) => message.kind === "student")
      .map((message) => message.content),
    ...(input.pendingStudentMessage?.trim() ? [input.pendingStudentMessage] : []),
  ].slice(-MENTION_WINDOW);

  const eligible = input.seatedAgentIds.filter(
    (id) => (inPhase.get(id) ?? 0) < allowance,
  );
  if (eligible.length === 0) return [];

  const maxTotal = Math.max(1, ...[...totals.values()]);

  const scored = eligible.map<SpeakerScore>((agentId) => {
    const terms = addressTerms(agentId);

    // --- relevance: authority on the current topic, damped by how sure we
    // are it *is* the topic. A weak read should not override fairness.
    const authority = topicAuthority(agentId, topic.topic);
    const relevance =
      topic.topic === "general"
        ? 0.5
        : 0.5 + (authority - 0.5) * Math.max(0.35, topic.confidence);

    // --- fairness: under-spoken agents rise. Measured across the whole
    // session rather than the phase, so someone quiet in diagnosis is pulled
    // forward during challenge.
    const fairness = 1 - (totals.get(agentId) ?? 0) / maxTotal;

    // --- student mention: being named is close to being handed the floor,
    // decaying as the conversation moves past it.
    let studentMention = 0;
    studentTexts.forEach((text, index) => {
      if (!mentionsAny(text, terms)) return;
      const age = studentTexts.length - 1 - index;
      studentMention = Math.max(studentMention, 1 - age * 0.35);
    });

    // --- disagreement: a colleague challenged this person by name since they
    // last spoke and they have not answered. A council where challenges go
    // unanswered is a council reading statements aloud.
    let disagreement = 0;
    const lastOwnTurnAt = turns.map((m) => m.speakerId).lastIndexOf(agentId);
    turns.forEach((message, index) => {
      if (index <= lastOwnTurnAt) return;
      if (message.speakerId === agentId) return;
      if (!mentionsAny(message.content, terms)) return;
      if (!mentionsAny(message.content, CHALLENGE_MARKERS)) return;
      const age = turns.length - 1 - index;
      disagreement = Math.max(disagreement, 1 - age * 0.25);
    });

    const priority = getAgent(agentId).priority;

    // --- recency: nobody speaks twice in a row, and speaking two turns ago
    // still costs you.
    let recencyPenalty = 0;
    if (agentId === lastSpeakerId) recencyPenalty = 1;
    else if (agentId === secondLastSpeakerId) recencyPenalty = 0.4;

    const base =
      SPEAKER_WEIGHTS.relevance * relevance +
      SPEAKER_WEIGHTS.fairness * clamp01(fairness) +
      SPEAKER_WEIGHTS.studentMention * clamp01(studentMention) +
      SPEAKER_WEIGHTS.disagreement * clamp01(disagreement) +
      SPEAKER_WEIGHTS.priority * priority;

    return {
      agentId,
      score: base - RECENCY_PENALTY * recencyPenalty,
      parts: {
        relevance: round2(relevance),
        fairness: round2(clamp01(fairness)),
        studentMention: round2(clamp01(studentMention)),
        disagreement: round2(clamp01(disagreement)),
        priority: round2(priority),
        recencyPenalty: round2(recencyPenalty),
      },
    };
  });

  /*
    There is deliberately no starvation guard.

    A phase ends only once the transcript holds `seats × allowance` agent
    turns, and only under-allowance agents are eligible to contribute them —
    so every seated agent reaches their allowance by construction. Eligibility
    filtering *is* the guarantee, and a bonus on top of it would only inflate
    every score equally and make the ranking unreadable in the UI.
  */

  return scored.sort((a, b) =>
    b.score === a.score
      ? input.seatedAgentIds.indexOf(a.agentId) - input.seatedAgentIds.indexOf(b.agentId)
      : b.score - a.score,
  );
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
function round2(value: number) {
  return Math.round(value * 100) / 100;
}

/** Whoever scores highest. Returns null once the session is out of turns. */
export function pickNextSpeaker(input: SpeakerSelectionInput): string | null {
  return scoreSpeakers(input)[0]?.agentId ?? null;
}

/** True once every seated agent has taken all of their turns. */
export function isSessionComplete(state: ProgressInput) {
  return currentPhase(state) === null;
}

/** Turns taken out of turns planned, for the session progress readout. */
export function sessionProgress(state: ProgressInput) {
  const profile = state.profile ?? resolvePhaseProfile();
  const seats = state.seatedAgentIds.length;
  const seated = new Set(state.seatedAgentIds);
  const turnsPlanned = DEBATE_PHASES.reduce(
    (sum, phase) => sum + phaseCapacity(seats, profile, phase),
    0,
  );
  const taken = agentTurns(state.transcript).filter((message) =>
    seated.has(message.speakerId),
  ).length;
  const turnsTaken = Math.min(taken, turnsPlanned);

  return {
    turnsTaken,
    turnsPlanned,
    fraction: turnsPlanned === 0 ? 0 : turnsTaken / turnsPlanned,
  };
}

export type { DebateTopic };
