/**
 * What the council is currently arguing about.
 *
 * Deliberately keyword-scored rather than model-classified. A topic is read
 * before *every* turn, so an LLM call here would add one request per turn —
 * doubling a session's cost and latency to answer a question a weighted
 * dictionary answers well enough. It is also deterministic, which lets the
 * session UI and the route handler classify identically without a round-trip.
 *
 * Keep this file free of server-only imports.
 */

import {
  DEBATE_TOPICS,
  type DebateTopic,
  type ScoredTopic,
} from "@/lib/council/roster";
import type { CouncilMessage } from "@/lib/council/types";

/**
 * Weighted term lists, tuned for civic and student-innovation proposals
 * rather than startup pitches.
 *
 * Multi-word phrases score higher because they are far less ambiguous:
 * "cost per beneficiary" is unmistakably financial, while "cost" alone shows
 * up in a sentence about latency just as often. Indian civic vocabulary is
 * deliberately present — "gram panchayat", "DPDP", "ASHA worker" — because
 * this council reviews proposals written in it.
 *
 * ## Both scripts live in one list, deliberately
 *
 * A Hindi session was the obvious reason to add a second, switchable
 * dictionary. It would have been the wrong shape. A Hindi transcript is not
 * Hindi-only — "ASHA workers के पास smartphone नहीं है" carries three English
 * terms — so a Hindi-only list would under-score exactly the sentences that
 * matter most, and an English transcript can never contain Devanagari, so the
 * Hindi entries cost it nothing but a few failed `indexOf` calls. One merged
 * list therefore scores mixed-language text correctly and needs no locale
 * parameter threaded through topic detection, speaker scoring and memory.
 *
 * This matters more than it looks: topic detection drives speaker selection.
 * Leave it English-only and a Hindi session silently scores every topic at
 * zero, falls back to "general" on every turn, and the council quietly stops
 * choosing who speaks — it becomes the rota this design exists to avoid.
 */
const TERMS: Record<ScoredTopic, Array<[term: string, weight: number]>> = {
  technical: [
    ["architecture", 3], ["tech stack", 3], ["offline-first", 4], ["offline first", 4],
    ["low bandwidth", 4], ["bandwidth", 2], ["connectivity", 3], ["latency", 3],
    ["scalability", 3], ["scale", 1], ["scaling", 2], ["infrastructure", 3],
    ["server", 2], ["database", 3], ["api", 2], ["backend", 3], ["frontend", 2],
    ["sensor", 3], ["iot", 3], ["hardware", 3], ["prototype", 2], ["algorithm", 3],
    ["machine learning", 3], ["model training", 4], ["accuracy", 2], ["uptime", 3],
    ["maintenance", 2], ["technical debt", 4], ["integration", 2], ["sms", 2],
    ["ussd", 4], ["android", 2], ["build it", 2], ["engineering", 2], ["deploy", 1],
    ["battery", 3], ["solar", 2], ["power", 1], ["gps", 2], ["geo-tag", 3],
    // --- Devanagari
    ["तकनीक", 2], ["तकनीकी", 2], ["ढाँचा", 2], ["ढांचा", 2], ["सर्वर", 3],
    ["ऐप", 2], ["एप", 2], ["सॉफ़्टवेयर", 3], ["सॉफ्टवेयर", 3], ["हार्डवेयर", 3],
    ["इंटरनेट", 3], ["नेटवर्क", 3], ["कनेक्टिविटी", 3], ["बैटरी", 3],
    ["सेंसर", 3], ["डेटा", 2], ["डाटा", 2], ["एल्गोरिदम", 3], ["एल्गोरिद्म", 3],
    ["ऑफ़लाइन", 4], ["ऑफलाइन", 4], ["स्मार्टफोन", 3], ["स्मार्टफ़ोन", 3],
    ["फ़ीचर फ़ोन", 4], ["बनाना", 1], ["बनाएँगे", 1], ["व्यवहार्यता", 2],
  ],
  financial: [
    ["cost per beneficiary", 5], ["unit cost", 4], ["budget", 3], ["funding", 3],
    ["grant", 3], ["cost", 1], ["expense", 2], ["running cost", 4],
    ["operational cost", 4], ["recurring cost", 4], ["sustainability", 2],
    ["revenue", 3], ["monetis", 2], ["monetiz", 2], ["subsidy", 3], ["csr", 3],
    ["sponsor", 2], ["free tier", 3], ["pricing", 3], ["roi", 3],
    ["return on investment", 4], ["crore", 3], ["lakh", 3], ["rupee", 2],
    ["per month", 2], ["year two", 4], ["who pays", 4], ["afford", 2],
    ["financially", 3], ["capital", 2], ["expenditure", 3], ["cash", 2],
    // --- Devanagari
    ["लागत", 3], ["बजट", 3], ["ख़र्च", 3], ["खर्च", 3], ["फंडिंग", 3],
    ["फ़ंडिंग", 3], ["अनुदान", 3], ["पैसा", 2], ["पैसे", 2], ["रुपये", 2],
    ["रुपए", 2], ["लाख", 3], ["करोड़", 3], ["प्रति लाभार्थी", 5], ["लाभार्थी", 2],
    ["कौन देगा", 4], ["कौन भरेगा", 4], ["आर्थिक", 3], ["वित्तीय", 3],
    ["राजस्व", 3], ["सब्सिडी", 3], ["टिकाऊ", 2], ["स्थिरता", 2],
  ],
  social: [
    ["community", 3], ["beneficiar", 3], ["grassroots", 4], ["village", 3],
    ["gram panchayat", 5], ["panchayat", 4], ["rural", 3], ["tribal", 3],
    ["adivasi", 4], ["equity", 3], ["inclusion", 3], ["exclusion", 3],
    ["marginalis", 4], ["marginaliz", 4], ["literacy", 3], ["vernacular", 4],
    ["local language", 4], ["adoption", 3], ["uptake", 3], ["trust", 2],
    ["asha worker", 5], ["anganwadi", 4], ["self-help group", 4], ["ngo", 2],
    ["women", 2], ["farmer", 3], ["citizen", 2], ["user research", 4],
    ["field visit", 4], ["consulted", 3], ["stakeholder", 3], ["behaviour change", 4],
    ["accessib", 3], ["disabilit", 3], ["last mile", 4],
    // --- Devanagari
    ["समुदाय", 3], ["गाँव", 3], ["गांव", 3], ["ग्रामीण", 3], ["पंचायत", 4],
    ["आदिवासी", 4], ["महिला", 2], ["महिलाओं", 2], ["किसान", 3],
    ["आशा कार्यकर्ता", 5], ["आँगनवाड़ी", 4], ["आंगनवाड़ी", 4], ["साक्षरता", 3],
    ["भाषा", 2], ["स्थानीय भाषा", 4], ["नागरिक", 2], ["असर", 2], ["प्रभाव", 2],
    ["समानता", 3], ["बहिष्कृत", 3], ["वंचित", 3], ["अपनाव", 3], ["भरोसा", 2],
    ["ज़मीनी", 3], ["जमीनी", 3], ["हितधारक", 3], ["सुलभता", 3],
  ],
  legal: [
    ["compliance", 3], ["regulation", 3], ["regulatory", 3], ["dpdp", 5],
    ["data protection", 4], ["privacy", 3], ["consent", 3], ["gdpr", 4],
    ["personal data", 4], ["pii", 4], ["licence", 3], ["license", 3],
    ["permission", 3], ["procurement", 4], ["tender", 3], ["mou", 3],
    ["government approval", 4], ["municipal", 3], ["statutory", 4],
    ["liability", 3], ["legal", 3], ["policy", 2], ["act", 1], ["rules", 1],
    ["minor", 2], ["surveillance", 4], ["audit", 2], ["accountab", 3],
    // --- Devanagari
    ["कानून", 3], ["क़ानून", 3], ["कानूनी", 3], ["अनुपालन", 3], ["नियम", 2],
    ["नियामक", 3], ["निजता", 4], ["गोपनीयता", 4], ["सहमति", 3], ["अनुमति", 3],
    ["व्यक्तिगत डेटा", 4], ["लाइसेंस", 3], ["नीति", 2], ["सरकारी मंज़ूरी", 4],
    ["नगर निगम", 3], ["ज़िम्मेदारी", 2], ["उत्तरदायित्व", 3], ["निगरानी", 3],
    ["नाबालिग", 3], ["ख़रीद", 2], ["खरीद", 2],
  ],
  novelty: [
    ["prior art", 5], ["novelty", 4], ["novel", 3], ["patent", 4],
    ["intellectual property", 5], ["differentiat", 4], ["original", 3],
    ["already exists", 5], ["existing solution", 4], ["copy", 2], ["clone", 3],
    ["innovation", 3], ["innovative", 3], ["unique", 3], ["defensible", 4],
    ["research paper", 4], ["published", 2], ["open source", 3], ["reinvent", 4],
    ["breakthrough", 3], ["invention", 3], ["trademark", 3],
    // --- Devanagari
    ["मौलिकता", 4], ["मौलिक", 3], ["नयापन", 4], ["नवाचार", 3], ["पेटेंट", 4],
    ["बौद्धिक संपदा", 5], ["पहले से मौजूद", 5], ["पहले से है", 4], ["नक़ल", 3],
    ["नकल", 3], ["अलग", 2], ["विशिष्ट", 3], ["शोध", 2], ["आविष्कार", 3],
    ["ओपन सोर्स", 3],
  ],
  market: [
    ["benchmark", 4], ["competitor", 4], ["competition", 3], ["market", 2],
    ["landscape", 3], ["industry", 2], ["deploy", 1], ["deployment", 3],
    ["partnership", 3], ["partner", 2], ["pilot", 2], ["scale up", 3],
    ["state government", 4], ["department", 2], ["smart city", 4],
    ["case study", 3], ["best practice", 3], ["standard", 2], ["vendor", 3],
    ["procure", 2], ["who would use", 4], ["demand", 2], ["adoption curve", 4],
    ["comparable", 3], ["similar project", 4], ["track record", 3],
    // --- Devanagari
    ["बाज़ार", 2], ["बाजार", 2], ["उद्योग", 2], ["प्रतिस्पर्धा", 3],
    ["प्रतिद्वंद्वी", 3], ["मानक", 2], ["तुलना", 2], ["साझेदारी", 3],
    ["साझेदार", 2], ["तैनाती", 3], ["पायलट", 2], ["विस्तार", 2],
    ["सरकार", 2], ["विभाग", 2], ["ज़िला", 2], ["जिला", 2], ["कौन इस्तेमाल", 4],
    ["माँग", 2], ["मांग", 2],
  ],
};

/** How many recent transcript entries are read. Older turns have gone stale. */
const TOPIC_WINDOW = 5;

/** Each step back through the window counts for less. */
const RECENCY_DECAY = 0.7;

/**
 * The student's own words weigh more than an agent's.
 *
 * Without it, the topic tracked whatever an agent had just been discussing:
 * a student admitting "we have no idea who pays for the SIM cards" lost to
 * the previous speaker's architecture monologue, and the floor went back to
 * the architect instead of to the financial seat.
 */
const STUDENT_WEIGHT = 2.5;

/**
 * A topic must beat the runner-up by this ratio to be called.
 *
 * Without it, one stray word decides the topic in an otherwise balanced
 * discussion, and speaker selection jitters between two agents turn to turn.
 */
const DOMINANCE_RATIO = 1.25;

export interface TopicReading {
  topic: DebateTopic;
  /** 0–1. How strongly the winning topic beat the field. Drives relevance weight. */
  confidence: number;
  /** Normalised 0–1 score per topic, for prompt context and debugging. */
  scores: Record<ScoredTopic, number>;
}

function emptyScores(): Record<ScoredTopic, number> {
  return { technical: 0, financial: 0, social: 0, legal: 0, novelty: 0, market: 0 };
}

/**
 * Every term across every topic, longest first.
 *
 * Order is what stops nested phrases double-counting: "running cost" and
 * "cost" both match the same span and would contribute twice. Matching
 * longest-first and masking what we consume means the specific phrase wins
 * and the generic word inside it never fires.
 */
const ALL_TERMS: Array<{ topic: ScoredTopic; term: string; weight: number }> =
  DEBATE_TOPICS.flatMap((topic) =>
    TERMS[topic].map(([term, weight]) => ({ topic, term, weight })),
  ).sort((a, b) => b.term.length - a.term.length);

/**
 * Counts occurrences of `term`, blanking each hit so no shorter term can match
 * the same span. Returns the count and the updated haystack.
 *
 * Terms are matched at a word *boundary on the left only*, so stems like
 * "beneficiar" and "marginalis" catch their inflections ("beneficiaries",
 * "marginalised") without needing every form listed. The left boundary is
 * what stops "act" firing inside "impact" — which it did, handing every
 * social-impact discussion to the legal seat.
 *
 * The boundary test only knows about `[a-z0-9]`, so for Devanagari every
 * position counts as a boundary and Hindi terms match anywhere in a word.
 * That is the behaviour we want rather than an oversight: Hindi inflects with
 * suffixes, so "समुदाय" should fire inside "समुदायों" exactly as "beneficiar"
 * fires inside "beneficiaries".
 */
function consumeTerm(haystack: string, term: string): { count: number; rest: string } {
  let count = 0;
  let rest = haystack;
  let from = 0;
  for (;;) {
    const at = rest.indexOf(term, from);
    if (at === -1) break;
    const before = at === 0 ? " " : rest[at - 1]!;
    if (!/[a-z0-9]/.test(before)) {
      count += 1;
      rest = rest.slice(0, at) + " ".repeat(term.length) + rest.slice(at + term.length);
    }
    from = at + term.length;
  }
  return { count, rest };
}

/**
 * Reads the current topic from the tail of the transcript.
 *
 * `extra` is the student's un-persisted message when they interject — it is
 * the newest thing said and often the entire reason the topic just changed,
 * so it must be scored even though it is not in the transcript yet.
 */
export function detectTopic(transcript: CouncilMessage[], extra?: string): TopicReading {
  const texts: Array<{ text: string; fromStudent: boolean }> = [
    ...transcript
      .filter((message) => message.kind !== "system")
      .slice(-TOPIC_WINDOW)
      .map((message) => ({ text: message.content, fromStudent: message.kind === "student" })),
    ...(extra?.trim() ? [{ text: extra, fromStudent: true }] : []),
  ];

  if (texts.length === 0) {
    return { topic: "general", confidence: 0, scores: emptyScores() };
  }

  const scores = emptyScores();
  const newestIndex = texts.length - 1;

  texts.forEach(({ text, fromStudent }, index) => {
    let haystack = ` ${text.toLowerCase()} `;
    const weight =
      RECENCY_DECAY ** (newestIndex - index) * (fromStudent ? STUDENT_WEIGHT : 1);

    for (const { topic, term, weight: termWeight } of ALL_TERMS) {
      const { count, rest } = consumeTerm(haystack, term);
      if (count === 0) continue;
      haystack = rest;
      // Diminishing returns: repeating "scale" six times in one message should
      // not outweigh a message naming three distinct financial concepts.
      scores[topic] += termWeight * weight * (1 + Math.log2(count));
    }
  });

  const ranked = DEBATE_TOPICS.map((topic) => ({ topic, score: scores[topic] })).sort(
    (a, b) => b.score - a.score,
  );
  const best = ranked[0]!;
  const runnerUp = ranked[1]?.score ?? 0;

  if (best.score <= 0 || best.score < runnerUp * DOMINANCE_RATIO) {
    return { topic: "general", confidence: 0, scores: normalise(scores, best.score) };
  }

  // Confidence blends "how much did it win by" with "was there much signal at
  // all" — a single keyword in one short message is a weak read even when
  // nothing competes with it.
  const margin = runnerUp > 0 ? Math.min(1, (best.score - runnerUp) / best.score) : 1;
  const volume = Math.min(1, best.score / 6);

  return {
    topic: best.topic,
    confidence: Math.round(margin * volume * 100) / 100,
    scores: normalise(scores, best.score),
  };
}

function normalise(scores: Record<ScoredTopic, number>, max: number) {
  if (max <= 0) return scores;
  const out = emptyScores();
  for (const topic of DEBATE_TOPICS) {
    out[topic] = Math.round((scores[topic] / max) * 100) / 100;
  }
  return out;
}
