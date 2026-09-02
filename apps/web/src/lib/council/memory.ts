/**
 * What the room remembers.
 *
 * An agent's memory is *derived from the transcript*, never stored. The
 * transcript is already the single source of truth for a session, so a
 * parallel memory structure could only ever disagree with it.
 *
 * Extraction is deterministic string work rather than a summarisation call.
 * Memory is rebuilt before every turn; an LLM pass here would add a request
 * per turn purely to restate text we already hold.
 *
 * Keep this file free of server-only imports.
 */

import { addressTerms } from "@/lib/council/debate-policy";
import { getAgent, type DebateTopic } from "@/lib/council/roster";
import { detectTopic } from "@/lib/council/topics";
import type { CouncilMessage } from "@/lib/council/types";

export interface AgentMemory {
  agentId: string;
  /** Points this agent has already made — the anti-repetition list. */
  positionsTaken: string[];
  /** Questions they asked that nobody has picked up. */
  unansweredQuestions: string[];
  /** Challenges aimed at them they have not yet answered. */
  openChallenges: Array<{ from: string; quote: string }>;
  /** Topics they have already spoken to. */
  topicsCovered: DebateTopic[];
}

export interface CouncilMemory {
  byAgent: Record<string, AgentMemory>;
  /** The strongest claim each agent has put on the table, newest first. */
  keyClaims: Array<{ agentId: string; speaker: string; role: string; claim: string }>;
  /** Questions put to the student that they have not answered. */
  openStudentQuestions: Array<{ from: string; question: string }>;
}

const CHALLENGE_MARKERS = [
  "disagree", "not convinced", "pushback", "push back", "challenge", "doubt",
  "however", "that assumes", "assumption", "why do you", "how do you",
  "justify", "unconvinced", "overstates", "understates", "too optimistic",
  "sceptical", "skeptical", "i'd argue", "i would argue", "unrealistic",

  // --- Devanagari. Without these a Hindi session records no challenges at
  // all: an agent is only pulled back to answer when someone disagreed with
  // them *by name*, and the disagreement half was English-only.
  "असहमत", "सहमत नहीं", "मैं असहमत", "लेकिन", "परंतु", "हालाँकि", "हालांकि",
  "संदेह", "शक", "कैसे", "क्यों", "यह मान लेना", "मान्यता", "अवास्तविक",
  "ग़लत", "गलत", "उचित नहीं", "पर्याप्त नहीं", "स्पष्ट कीजिए", "जवाब दीजिए",
  "बहुत आशावादी", "आपत्ति",
];

/** Filler openers that carry no position and pollute the memory list. */
const LOW_SIGNAL = [
  "let's get to it", "let me start", "thanks", "thank you", "good morning",
  "to be clear", "first of all", "i'll be brief", "let me be direct",
];

/**
 * Sentence terminators, including Devanagari.
 *
 * `।` (U+0964, the danda) is how a Hindi sentence ends. Left out, a whole
 * Hindi turn parses as a single sentence, and three things downstream break
 * at once: `keyClaimOf` returns the entire turn as one "claim", the
 * anti-repetition list becomes useless, and a question put to the student is
 * never isolated. None of it errors — the council just quietly stops
 * remembering anything in Hindi.
 */
const SENTENCE_END = /[^.!?।]+[.!?।]*/g;

function sentences(text: string): string[] {
  return (text.match(SENTENCE_END) ?? [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function isQuestion(sentence: string) {
  return sentence.trimEnd().endsWith("?");
}

function containsAny(haystack: string, needles: string[]) {
  const text = haystack.toLowerCase();
  return needles.some((needle) => text.includes(needle));
}

/**
 * The most substantive statement in a message.
 *
 * Longest declarative sentence, which in practice is the one carrying the
 * actual position — openers and sign-offs are short, the argument is not.
 */
function keyClaimOf(message: string): string | null {
  const candidates = sentences(message)
    .filter((sentence) => !isQuestion(sentence))
    .filter((sentence) => sentence.length > 40)
    .filter((sentence) => !containsAny(sentence, LOW_SIGNAL));
  if (candidates.length === 0) return null;
  return candidates.reduce((longest, sentence) =>
    sentence.length > longest.length ? sentence : longest,
  );
}

function condense(sentence: string, max = 180) {
  const clean = sentence.replace(/\s+/g, " ").trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).trimEnd()}…`;
}

/**
 * The question an agent just put to the student, if they put one.
 *
 * Distinguishing "a question for the student" from "a question for a
 * colleague" is the whole job here — the challenge round is full of questions
 * aimed at other agents, and pausing the session for those would stall it on
 * every turn of the middle phase.
 *
 * The rule: it is for the student when the question does not name a seated
 * colleague. A question naming Rohan is Rohan's to answer.
 */
export function studentQuestionIn(
  message: CouncilMessage,
  seatedAgentIds: string[],
): string | null {
  const questions = sentences(message.content).filter(isQuestion);
  if (questions.length === 0) return null;

  // The last question is the one left hanging in the room.
  for (const question of [...questions].reverse()) {
    const lower = question.toLowerCase();
    const namesColleague = seatedAgentIds.some(
      (id) =>
        id !== message.speakerId &&
        addressTerms(id).some((term) => lower.includes(term)),
    );
    if (!namesColleague) return condense(question, 220);
  }
  return null;
}

export interface MemoryInput {
  transcript: CouncilMessage[];
  seatedAgentIds: string[];
}

/**
 * How many of an agent's own prior points to carry forward.
 *
 * Capped because the whole memory block rides in the system prompt on every
 * turn. Unbounded, a long session would spend more of its token budget
 * reminding an agent what they said than letting them say anything new.
 */
const MAX_POSITIONS = 4;
const MAX_KEY_CLAIMS = 6;

export function buildCouncilMemory(input: MemoryInput): CouncilMemory {
  const { transcript, seatedAgentIds } = input;
  const relevant = transcript.filter((message) => message.kind !== "system");

  const byAgent: Record<string, AgentMemory> = {};
  for (const id of seatedAgentIds) {
    byAgent[id] = {
      agentId: id,
      positionsTaken: [],
      unansweredQuestions: [],
      openChallenges: [],
      topicsCovered: [],
    };
  }

  // Index of each agent's most recent turn — anything aimed at them before
  // that has already had its chance to be answered.
  const lastTurnIndex = new Map<string, number>();
  relevant.forEach((message, index) => {
    if (byAgent[message.speakerId]) lastTurnIndex.set(message.speakerId, index);
  });
  const lastStudentIndex = relevant.map((m) => m.kind).lastIndexOf("student");

  const keyClaims: CouncilMemory["keyClaims"] = [];
  const openStudentQuestions: CouncilMemory["openStudentQuestions"] = [];

  relevant.forEach((message, index) => {
    const memory = byAgent[message.speakerId];

    if (memory) {
      const agent = getAgent(message.speakerId);

      // --- their own positions, for the anti-repetition instruction
      const claim = keyClaimOf(message.content);
      if (claim) {
        memory.positionsTaken.push(condense(claim));
        keyClaims.push({
          agentId: message.speakerId,
          speaker: agent.personName,
          role: agent.name,
          claim: condense(claim),
        });
      }

      const reading = detectTopic([message]);
      if (reading.topic !== "general" && !memory.topicsCovered.includes(reading.topic)) {
        memory.topicsCovered.push(reading.topic);
      }

      // --- questions they put to the student, still open if the student has
      // not spoken since.
      for (const sentence of sentences(message.content)) {
        if (!isQuestion(sentence)) continue;
        if (lastStudentIndex > index) continue;
        memory.unansweredQuestions.push(condense(sentence));
        openStudentQuestions.push({
          from: agent.personName,
          question: condense(sentence),
        });
      }
    }

    // --- challenges: this message names another seated agent and carries a
    // disagreement marker. Open only if the target has not spoken since.
    if (!containsAny(message.content, CHALLENGE_MARKERS)) return;
    for (const targetId of seatedAgentIds) {
      if (targetId === message.speakerId) continue;
      const terms = addressTerms(targetId);
      const named = terms.some((term) => message.content.toLowerCase().includes(term));
      if (!named) continue;
      if ((lastTurnIndex.get(targetId) ?? -1) > index) continue;

      const quote =
        sentences(message.content).find(
          (sentence) =>
            terms.some((term) => sentence.toLowerCase().includes(term)) ||
            containsAny(sentence, CHALLENGE_MARKERS),
        ) ?? message.content;

      const from =
        message.kind === "student" ? "The student" : getAgent(message.speakerId).personName;
      byAgent[targetId]!.openChallenges.push({ from, quote: condense(quote) });
    }
  });

  for (const memory of Object.values(byAgent)) {
    // Keep the most recent points; the oldest are least likely to still be
    // live in the argument.
    memory.positionsTaken = memory.positionsTaken.slice(-MAX_POSITIONS);
    memory.unansweredQuestions = memory.unansweredQuestions.slice(-3);
    memory.openChallenges = memory.openChallenges.slice(-3);
  }

  return {
    byAgent,
    keyClaims: keyClaims.slice(-MAX_KEY_CLAIMS).reverse(),
    openStudentQuestions: openStudentQuestions.slice(-4),
  };
}
