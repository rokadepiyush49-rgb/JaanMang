/**
 * The council roster — who sits at the table, and what each seat is for.
 *
 * Client-safe by design. The UI needs names, icons and expertise weights to
 * render the panel and explain why a given agent took the floor; only the
 * system prompts in `personas.ts` are server-only. Splitting them keeps eight
 * paragraphs of prompt text out of the browser bundle.
 *
 * ## Ids are load-bearing
 *
 * `id` ties together the seat in the setup screen, `speakerId` on every
 * transcript message, the voice in `voices.ts`, and the persona in
 * `personas.ts`. Renaming one without the others silently drops an agent's
 * voice or persona, so treat them as stable.
 *
 * ## Why the agents have human names
 *
 * A transcript where "Technical Architect" argues with "Financial Strategist"
 * reads as a spec, not a discussion — and personas addressed by role slip into
 * lecturing the student rather than talking to each other. Named people
 * disagree with named people, which is the behaviour the debate depends on.
 */

import type { IconName } from "@/components/icon";
import type { Locale } from "@/lib/i18n/locale";

/**
 * What the room can be arguing about.
 *
 * Each topic is owned by at least one agent in `expertise` below — a topic no
 * seat owns could never change who speaks, which is the only reason topics are
 * detected at all.
 */
export type ScoredTopic =
  | "technical"
  | "financial"
  | "social"
  | "legal"
  | "novelty"
  | "market";

/** `general` is the *absence* of a topic, so it has no keyword list or column. */
export type DebateTopic = ScoredTopic | "general";

export const DEBATE_TOPICS: readonly ScoredTopic[] = [
  "technical",
  "financial",
  "social",
  "legal",
  "novelty",
  "market",
] as const;

export const TOPIC_LABEL: Record<DebateTopic, string> = {
  technical: "technical feasibility",
  financial: "cost and funding",
  social: "community impact and adoption",
  legal: "compliance and policy",
  novelty: "originality and prior art",
  market: "the existing landscape and deployment",
  general: "the proposal in general",
};

export interface CouncilAgent {
  id: string;
  /** The person. Used in the transcript, in prompts, and when addressed aloud. */
  personName: string;
  /** The seat. Shown as the role chip beside the name. */
  name: string;
  /** One line for the setup screen. */
  blurb: string;
  icon: IconName;
  tone: "impact" | "navy" | "community" | "muted";
  /** Seated by default when the student opens the setup screen. */
  defaultOn: boolean;
  /**
   * 0–1 authority per topic — "how much does the room want to hear from this
   * seat right now".
   *
   * Every agent keeps a non-zero floor everywhere, because a seat with
   * literally nothing to say about cost is not a seat. The floor is what lets
   * the citizen advocate challenge a budget assumption instead of being
   * silently disqualified from the argument.
   */
  topics: Record<ScoredTopic, number>;
  /** 0–1 standing tiebreak, applied when relevance and fairness are level. */
  priority: number;
  /** What this agent is trying to establish. Injected into the prompt. */
  goal: string;
  /**
   * Extra spellings the student might use to address them.
   *
   * Both scripts, in one list — a Hindi transcript writes the name in
   * Devanagari, and mention matching compares against this array, so an
   * English-only list means "कविता, क्या गाँव इसे अपनाएगा?" never reaches
   * Kavita. Lower-cased for the Latin entries; Devanagari is caseless.
   */
  aliases: string[];
}

/**
 * The declared tensions in `personas.ts` are what stop these six converging.
 * Six reasonable people reviewing a student proposal will agree with each
 * other; six people with standing disagreements will not. The topic weights
 * below decide who *speaks*, the personas decide what they *say*.
 */
export const COUNCIL_AGENTS: CouncilAgent[] = [
  {
    id: "citizen",
    personName: "Kavita Munda",
    name: "Citizen & Social Impact",
    blurb:
      "Evaluates community acceptance, social equity, and grassroots impact of the proposal.",
    icon: "users",
    tone: "impact",
    defaultOn: true,
    topics: { technical: 0.3, financial: 0.4, social: 1.0, legal: 0.4, novelty: 0.25, market: 0.35 },
    priority: 0.85,
    goal:
      "Establish who actually uses this on the ground, and whether it survives contact with low literacy, patchy connectivity and people who did not ask for it.",
    aliases: ["citizen", "community", "social", "impact", "kavita", "कविता", "मुंडा", "नागरिक", "सामाजिक"],
  },
  {
    id: "technical",
    personName: "Arjun Mehta",
    name: "Technical Architect",
    blurb:
      "Assesses systemic architecture, data privacy, and technological feasibility at scale.",
    icon: "code",
    tone: "navy",
    defaultOn: true,
    topics: { technical: 1.0, financial: 0.3, social: 0.3, legal: 0.4, novelty: 0.45, market: 0.3 },
    priority: 0.7,
    goal:
      "Decide whether this team can actually build and run this, and name the one technical assumption that breaks first.",
    aliases: ["tech", "technical", "architect", "engineering", "arjun", "अर्जुन", "मेहता", "तकनीकी", "वास्तुकार"],
  },
  {
    id: "financial",
    personName: "Rohan Desai",
    name: "Financial Strategist",
    blurb: "Reviews budget models, funding sustainability, and ROI metrics.",
    icon: "banknote",
    tone: "community",
    defaultOn: true,
    topics: { technical: 0.3, financial: 1.0, social: 0.4, legal: 0.3, novelty: 0.25, market: 0.6 },
    priority: 0.65,
    goal:
      "Find the cost per beneficiary and establish who keeps paying for this after the grant, the prize money or the semester ends.",
    aliases: ["finance", "financial", "budget", "cost", "rohan", "रोहन", "देसाई", "वित्तीय", "लागत", "बजट"],
  },
  {
    id: "legal",
    personName: "Fatima Sheikh",
    name: "Legal & Compliance",
    blurb: "Identifies regulatory hurdles, policy alignment, and compliance risks.",
    icon: "scale",
    tone: "muted",
    defaultOn: false,
    topics: { technical: 0.35, financial: 0.3, social: 0.4, legal: 1.0, novelty: 0.3, market: 0.35 },
    priority: 0.5,
    goal:
      "Surface the permission, privacy or procurement problem that would stop this being deployed, before it is discovered after launch.",
    aliases: ["legal", "compliance", "policy", "counsel", "fatima", "फ़ातिमा", "फातिमा", "शेख़", "शेख", "कानून", "क़ानून", "अनुपालन"],
  },
  {
    id: "ip",
    personName: "Dr. Neha Iyer",
    name: "IP & Innovation",
    blurb: "Checks for novelty, patent potential, and innovative differentiation.",
    icon: "bulb",
    tone: "community",
    defaultOn: true,
    topics: { technical: 0.45, financial: 0.25, social: 0.3, legal: 0.45, novelty: 1.0, market: 0.55 },
    priority: 0.55,
    goal:
      "Separate what is genuinely new here from what already exists, and name the one defensible idea worth protecting.",
    aliases: ["ip", "innovation", "patent", "novelty", "neha", "नेहा", "अय्यर", "मौलिकता", "पेटेंट", "नवाचार"],
  },
  {
    id: "industry",
    personName: "Vikram Rao",
    name: "Industry Specialist",
    blurb: "Provides domain-specific benchmarks and competitor positioning.",
    icon: "bar-chart",
    tone: "muted",
    defaultOn: false,
    topics: { technical: 0.4, financial: 0.55, social: 0.35, legal: 0.4, novelty: 0.5, market: 1.0 },
    priority: 0.6,
    goal:
      "Benchmark this against what already ships in the field and name who would realistically deploy it.",
    aliases: ["industry", "market", "benchmark", "domain", "vikram", "विक्रम", "राव", "उद्योग", "बाज़ार", "बाजार"],
  },
];

/** Neutral profile for an id with no declared seat — never disqualified. */
export const DEFAULT_AGENT: Omit<CouncilAgent, "id"> = {
  personName: "Council Member",
  name: "Advisor",
  blurb: "Evaluates the proposal on its merits.",
  icon: "bot",
  tone: "muted",
  defaultOn: false,
  topics: { technical: 0.5, financial: 0.5, social: 0.5, legal: 0.5, novelty: 0.5, market: 0.5 },
  priority: 0.5,
  goal: "Evaluate the proposal on its merits.",
  aliases: [],
};

export function getAgent(id: string): CouncilAgent {
  return COUNCIL_AGENTS.find((agent) => agent.id === id) ?? { ...DEFAULT_AGENT, id };
}

/**
 * Authority on the current topic, 0–1.
 *
 * `general` returns a flat 0.5 rather than 0: when the room is not on any
 * particular subject, relevance should stop discriminating and let fairness
 * and priority decide, instead of handing the floor to whoever happens to top
 * an arbitrary column.
 */
export function topicAuthority(agentId: string, topic: DebateTopic): number {
  if (topic === "general") return 0.5;
  return getAgent(agentId).topics[topic];
}

/** Display identities for the seated panel, for mention and memory matching. */
export function identitiesFor(seatedAgentIds: string[]) {
  const identities: Record<string, { personName: string; role: string }> = {};
  for (const id of seatedAgentIds) {
    const agent = getAgent(id);
    identities[id] = { personName: agent.personName, role: agent.name };
  }
  return identities;
}

// ---- Localisation ---------------------------------------------------------

/**
 * The panel in Devanagari.
 *
 * An overlay rather than a second roster, because `COUNCIL_AGENTS` carries the
 * ids, the topic weights and the seating order — all of which are language
 * independent, and none of which should be duplicated where the two copies
 * could drift.
 *
 * The names are transliterated, not replaced: Kavita Munda is कविता मुंडा, the
 * same person. A Hindi session that renamed the panel would make its transcript
 * incomparable with an English one on the same project.
 */
const AGENTS_HI: Record<string, { personName: string; name: string; blurb: string }> = {
  citizen: {
    personName: "कविता मुंडा",
    name: "नागरिक और सामाजिक प्रभाव",
    blurb: "समुदाय की स्वीकृति, सामाजिक समानता और ज़मीनी असर को परखती हैं।",
  },
  technical: {
    personName: "अर्जुन मेहता",
    name: "तकनीकी वास्तुकार",
    blurb: "ढाँचा, डेटा निजता और तकनीकी व्यवहार्यता की जाँच करते हैं।",
  },
  financial: {
    personName: "रोहन देसाई",
    name: "वित्तीय रणनीतिकार",
    blurb: "बजट, फंडिंग की स्थिरता और प्रति-लाभार्थी लागत देखते हैं।",
  },
  legal: {
    personName: "फ़ातिमा शेख़",
    name: "कानून और अनुपालन",
    blurb: "नियामक अड़चनें, नीति संगति और अनुपालन जोखिम पहचानती हैं।",
  },
  ip: {
    personName: "डॉ. नेहा अय्यर",
    name: "बौद्धिक संपदा और नवाचार",
    blurb: "मौलिकता, पेटेंट की संभावना और असली नयापन जाँचती हैं।",
  },
  industry: {
    personName: "विक्रम राव",
    name: "उद्योग विशेषज्ञ",
    blurb: "क्षेत्र के मानक और मौजूदा समाधानों से तुलना करते हैं।",
  },
};

/** What each seat is trying to establish, in Hindi. Injected into the prompt. */
const GOALS_HI: Record<string, string> = {
  citizen:
    "यह तय कीजिए कि ज़मीन पर इसे इस्तेमाल कौन करेगा, और क्या यह कम साक्षरता, टूटती कनेक्टिविटी और ऐसे लोगों से टकराकर बच पाएगा जिन्होंने यह माँगा ही नहीं था।",
  technical:
    "यह तय कीजिए कि यह टीम सचमुच इसे बना और चला सकती है या नहीं, और वह एक तकनीकी मान्यता बताइए जो सबसे पहले टूटेगी।",
  financial:
    "प्रति लाभार्थी लागत निकालिए और यह तय कीजिए कि अनुदान, इनाम की रक़म या सेमेस्टर ख़त्म होने के बाद इसका ख़र्च कौन उठाएगा।",
  legal:
    "वह अनुमति, निजता या ख़रीद से जुड़ी अड़चन सामने लाइए जो इसे तैनात होने से रोक देगी — लॉन्च के बाद पता चलने से पहले।",
  ip: "जो यहाँ सचमुच नया है उसे उससे अलग कीजिए जो पहले से मौजूद है, और वह एक बचाव-योग्य विचार बताइए जिसे बचाना सार्थक है।",
  industry:
    "मैदान में पहले से चल रही चीज़ों से इसकी तुलना कीजिए और नाम लेकर बताइए कि इसे असल में तैनात कौन करेगा।",
};

export function agentGoal(id: string, locale: Locale): string {
  return (locale === "hi" ? GOALS_HI[id] : undefined) ?? getAgent(id).goal;
}

/** An agent's display fields in `locale`. Falls back to English for a gap. */
export function localizedAgent(id: string, locale: Locale) {
  const agent = getAgent(id);
  const overlay = locale === "hi" ? AGENTS_HI[id] : undefined;
  return {
    ...agent,
    personName: overlay?.personName ?? agent.personName,
    name: overlay?.name ?? agent.name,
    blurb: overlay?.blurb ?? agent.blurb,
  };
}

/** Display identities for the seated panel, in `locale`. */
export function localizedIdentities(seatedAgentIds: string[], locale: Locale) {
  const identities: Record<string, { personName: string; role: string }> = {};
  for (const id of seatedAgentIds) {
    const agent = localizedAgent(id, locale);
    identities[id] = { personName: agent.personName, role: agent.name };
  }
  return identities;
}

export const TOPIC_LABEL_HI: Record<DebateTopic, string> = {
  technical: "तकनीकी व्यवहार्यता",
  financial: "लागत और फंडिंग",
  social: "समुदाय पर असर और अपनाव",
  legal: "अनुपालन और नीति",
  novelty: "मौलिकता और पहले से मौजूद काम",
  market: "मौजूदा परिदृश्य और तैनाती",
  general: "प्रस्ताव पर आम तौर पर",
};

export function topicLabel(topic: DebateTopic, locale: Locale): string {
  return locale === "hi" ? TOPIC_LABEL_HI[topic] : TOPIC_LABEL[topic];
}
