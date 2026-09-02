/**
 * Runs one turn of a council session.
 *
 * The loop is: read the room (topic) → pick who should speak → assemble
 * everything that agent needs to know → generate → parse. Every step except
 * generation is deterministic, which is what keeps a session reproducible
 * enough to debug.
 */

import "server-only";

import { generateAgentReply, type ConversationEntry } from "@/lib/council/client";
import {
  currentPhase,
  isSessionComplete,
  resolvePhaseProfile,
  scoreSpeakers,
  sessionProgress,
  phaseBrief,
  phaseName,
  type DebatePhase,
  type SpeakerScore,
} from "@/lib/council/debate-policy";
import { buildCouncilMemory, studentQuestionIn, type CouncilMemory } from "@/lib/council/memory";
import { personaForLocale } from "@/lib/council/personas";
import {
  agentGoal,
  getAgent,
  localizedAgent,
  localizedIdentities,
  topicLabel,
} from "@/lib/council/roster";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/locale";
import { detectTopic, type TopicReading } from "@/lib/council/topics";
import type {
  CouncilMessage,
  CouncilTag,
  ProjectBrief,
  SessionProgress,
} from "@/lib/council/types";

export interface SessionState {
  brief: ProjectBrief;
  seatedAgentIds: string[];
  transcript: CouncilMessage[];
  /** The language the council speaks this session. Defaults to English. */
  locale?: Locale;
}

function bullets(lines: string[]) {
  return lines.map((line) => `- ${line}`).join("\n");
}

// ---- Tag markers ----------------------------------------------------------

/**
 * Agents label their own turn with a trailing marker, e.g.
 * `[risk] Power budget unresolved`.
 *
 * The alternative was a JSON-mode call returning `{ content, tags }`, which
 * costs a schema round-trip on every turn and reliably degrades the prose —
 * models write worse dialogue when it has to be a string field. A trailing
 * marker keeps generation in prose mode and parses in one regex.
 *
 * The pattern is written loosely on purpose.
 *
 * The prompt asks for exactly `[risk] <label>`, and the models mostly comply —
 * but the first real session came back with `[ risk] Offline usability…`, a
 * space inside the bracket, which the strict form missed entirely. The cost of
 * a near miss is not a missing chip: the unparsed marker stays in `content`,
 * so it also gets read aloud. Tolerating a bullet, bold markers, inner
 * whitespace and a trailing colon covers every variant seen so far and costs
 * nothing, because the anchors still require the line to be *only* a marker.
 */
const TAG_LINE = /^\s*(?:[-*•]\s*)?\*{0,2}\[\s*([a-z]{2,12})\s*\]\*{0,2}\s*:?\s*(.+?)\s*$/i;

/**
 * Words that mean "this could sink the project". Everything else a model
 * invents becomes a neutral note.
 *
 * The marker word is deliberately not constrained to `risk|note`. The prompt
 * asks for those two and the second live session answered with
 * `[question] Voice-access feasibility for ASHAs` — a word that is not in the
 * schema, so the strict form left the whole marker sitting in the prose to be
 * read aloud. Matching any short bracketed word and mapping it here means an
 * invented label degrades to the wrong *colour*, never to speech.
 */
const RISK_WORDS = new Set([
  "risk", "flag", "blocker", "block", "concern", "warning", "issue", "gap",
  "danger", "critical", "problem",
]);

function toneFor(word: string): CouncilTag["tone"] {
  return RISK_WORDS.has(word.toLowerCase()) ? "risk" : "note";
}

/** Ceiling on tags per turn, so a chatty model cannot flood the chip row. */
const MAX_TAGS = 2;

/**
 * Splits the marker lines off the spoken text.
 *
 * Only *trailing* lines are consumed. A `[risk]` in the middle of a turn is
 * the model narrating rather than labelling, and stripping it there would
 * punch a hole in the sentence that gets read aloud.
 */
/**
 * A marker that shares its line with the end of the prose.
 *
 * Seen repeatedly in the first live session: "…cannot be considered viable.
 * [risk] Inadequate post-grant funding plan". A line-only pattern leaves that
 * in `content`, where it is both a stray chip-less label on screen and
 * something the synthesiser reads out. Requires a sentence end before the
 * bracket so an inline mention mid-argument is still left alone — `।`
 * included, since that is where a Hindi turn ends.
 *
 * The tone word stays ASCII: the prompt asks for `[risk]` / `[note]` in both
 * languages, because a marker written in the same script as the prose is far
 * harder to tell apart from the prose.
 */
const TRAILING_TAG = /([.!?।])\s*\[\s*([a-z]{2,12})\s*\]\s*:?\s*([^\n\[\]]{2,80})\s*$/i;

/** Chip labels are short by design; cut at a word boundary, never mid-word. */
const MAX_LABEL_CHARS = 44;

function cleanLabel(raw: string): string {
  const clean = raw.replace(/^\*+/, "").replace(/[.*\s]+$/, "").trim();
  if (clean.length <= MAX_LABEL_CHARS) return clean;
  const cut = clean.slice(0, MAX_LABEL_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Strips a self-attribution the model prefixed onto its own turn.
 *
 * The transcript is handed over as `Name (Role): text`, and models imitate the
 * format they are shown — one turn came back as "Rohan Desai (Financial
 * Strategist): The 40,000-rupee grant cannot…". The prompt forbids it, which
 * reduces it but does not eliminate it, and the cost of a leak is the
 * synthesiser reading the speaker's own name and job title before every
 * sentence. Only the speaker's own name is stripped, so a turn that genuinely
 * opens by addressing a colleague is untouched.
 */
export function stripSpeakerPrefix(raw: string, personName: string): string {
  const first = personName.replace(/^Dr\.?\s+/i, "").split(/\s+/)[0] ?? personName;
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `^\\s*(?:\\*\\*)?(?:${escape(personName)}|${escape(first)})(?:\\s*\\([^)]*\\))?(?:\\*\\*)?\\s*:\\s*`,
    "i",
  );
  return raw.replace(pattern, "");
}

export function parseTags(raw: string): { content: string; tags: CouncilTag[] } {
  const lines = raw.trimEnd().split("\n");
  const tags: CouncilTag[] = [];

  while (lines.length > 0) {
    const line = lines[lines.length - 1]!;

    // A marker sharing the prose's last line: keep the sentence, take the tag.
    const inline = line.match(TRAILING_TAG);
    if (inline && !TAG_LINE.test(line)) {
      lines[lines.length - 1] = line.slice(0, line.length - inline[0].length) + inline[1];
      tags.unshift({
        tone: toneFor(inline[2]!),
        label: cleanLabel(inline[3]!),
      });
      continue;
    }

    const match = line.match(TAG_LINE);
    if (!match) break;
    lines.pop();
    tags.unshift({
      tone: toneFor(match[1]!),
      // Trailing full stops and bold markers come back on the label when the
      // model writes `[risk] **Something.**` — cosmetic in the prompt, but the
      // label is rendered as a chip where a stray `**` is very visible.
      label: cleanLabel(match[2]!),
    });
  }

  return { content: lines.join("\n").trim(), tags: tags.slice(0, MAX_TAGS) };
}

// ---- Prompt assembly ------------------------------------------------------

interface PromptContext {
  state: SessionState;
  speakerId: string;
  phase: DebatePhase;
  topic: TopicReading;
  memory: CouncilMemory;
  locale: Locale;
}

/**
 * Every fixed heading and instruction in the prompt, per language.
 *
 * Assembled from one table rather than by interpolating a locale into English
 * scaffolding, because a prompt that is Hindi persona inside English headings
 * is a prompt that tells the model two different things about what language
 * this room speaks — and the model splits the difference, which reads as
 * neither.
 */
const PROMPT = {
  en: {
    objective: (goal: string) => `YOUR OBJECTIVE IN THIS SESSION: ${goal}`,
    whyHeading: "WHY THIS COUNCIL EXISTS",
    why:
      "A student has brought a project proposal for review. Your job is to make it more practical — to find " +
      "the gap between what they have written and what would actually work in the field, and to say what " +
      "would close it. You are not deciding whether to fund this and you are not grading it. Be hard on the " +
      "proposal and straightforward with the person.",
    proposal: "THE PROPOSAL",
    fTitle: "Title",
    fProblem: "Problem statement",
    fSolution: "Proposed solution",
    fDemographic: "Target demographic",
    fPhase: "Current phase",
    fDocs: "Supporting documents named (contents not provided)",
    phaseHeading: (label: string) => `SESSION PHASE: ${label}`,
    roomOn: (label: string) => `WHAT THE ROOM IS ON RIGHT NOW: ${label}`,
    alsoHeading: "ALSO AT THE TABLE",
    claimsHeading: "ALREADY ESTABLISHED BY YOUR COLLEAGUES — these points are made, do not make them again",
    claim: (speaker: string, role: string, claim: string) => `${speaker} (${role}) argued: "${claim}"`,
    claimsRule: [
      "You may build on, sharpen, or attack any of the above by name. You may not restate one as though",
      "it were new. If your own seat's reading of this proposal has already been covered, find the thing",
      "nobody has looked at yet — that is what your seat is for.",
    ],
    ownHeading: "YOU HAVE ALREADY MADE THESE POINTS — do not repeat them, build past them",
    challengedHeading: "YOU HAVE BEEN CHALLENGED AND HAVE NOT ANSWERED — answer this first",
    openQuestionsHeading: "QUESTIONS THE STUDENT HAS NOT ANSWERED",
    asked: (from: string, question: string) => `${from} asked: "${question}"`,
    groundingHeading: "GROUNDING",
    grounding: [
      "You have no web access and no data beyond what is written above.",
      "If you cite a figure — a cost, a population, a benchmark — say plainly that it is your own " +
        "estimate. Never present an estimate as a retrieved fact, and never invent a citation, a study " +
        "or a specific named source.",
      "Where you need a number the student has not given, say which number they must go and find.",
    ],
    speakHeading: "HOW TO SPEAK",
    speak: [
      "Speak only as yourself, in first person. Never narrate, never use stage directions, never prefix your name.",
      "Never write another council member's lines or speak on their behalf.",
      "Refer to colleagues by first name when you agree or disagree with them.",
      "Take a position. Agreeing with everyone is worthless to the student.",
      "Never address yourself, and never write your own name before your words.",
      "Say something the room has not heard yet. Echoing a colleague adds nothing.",
      "Where you disagree, say what specifically you disagree with and why.",
      "Where you agree, add something — a condition, a consequence, or a sharper version of the point.",
      "Quote the student's own words when you are reacting to a specific claim.",
      "Do not repeat a question that has already been asked.",
      "You are speaking out loud, not writing a document. No numbered lists, no bullet points, no",
      "headings, no markdown — just what you would actually say in the room.",
      "Stay under 4 sentences. Density beats length, and a turn that runs long is cut off mid-word.",
    ],
    labelHeading: "FINISH WITH A LABEL",
    labelIntro:
      "After your turn, on its own final line, add one label summarising what you just established:",
    labelRules: [
      "`[risk] <up to 5 words>` when you identified something that could sink the project.",
      "`[note] <up to 5 words>` when you confirmed something that holds up, or set a direction.",
    ],
    labelTail:
      "Write the label as a finding, not a topic — `[risk] No consent path for minors`, not `[risk] Legal`. " +
      "Exactly one label. Nothing after it.",
  },
  hi: {
    objective: (goal: string) => `इस बैठक में आपका उद्देश्य: ${goal}`,
    whyHeading: "यह परिषद क्यों है",
    why:
      "एक छात्र अपना प्रोजेक्ट प्रस्ताव समीक्षा के लिए लाया है। आपका काम इसे ज़्यादा व्यावहारिक बनाना है — यह ढूँढ़ना कि " +
      "उसने जो लिखा है और जो मैदान में सचमुच काम करेगा, उनके बीच खाई कहाँ है, और यह बताना कि उसे कैसे पाटा जाए। आप यह " +
      "तय नहीं कर रहे कि इसे पैसा मिलना चाहिए या नहीं, और न ही आप इसे अंक दे रहे हैं। प्रस्ताव पर सख़्त रहिए और व्यक्ति " +
      "से सीधी बात कीजिए।",
    proposal: "प्रस्ताव",
    fTitle: "नाम",
    fProblem: "समस्या",
    fSolution: "प्रस्तावित समाधान",
    fDemographic: "लक्षित समुदाय",
    fPhase: "वर्तमान चरण",
    fDocs: "बताए गए दस्तावेज़ (सामग्री उपलब्ध नहीं)",
    phaseHeading: (label: string) => `बैठक का दौर: ${label}`,
    roomOn: (label: string) => `अभी कमरे में किस पर बात हो रही है: ${label}`,
    alsoHeading: "मेज़ पर और कौन है",
    claimsHeading: "आपके सहयोगी यह पहले ही कह चुके हैं — ये बातें हो चुकीं, इन्हें दोबारा मत कहिए",
    claim: (speaker: string, role: string, claim: string) => `${speaker} (${role}) ने कहा: "${claim}"`,
    claimsRule: [
      "ऊपर की किसी भी बात को आप नाम लेकर आगे बढ़ा सकते हैं, पैना कर सकते हैं, या उस पर हमला कर सकते हैं। लेकिन उसे",
      "नई बात की तरह दोबारा नहीं कह सकते। अगर इस प्रस्ताव पर आपकी सीट की राय पहले ही आ चुकी है, तो वह चीज़ ढूँढ़िए",
      "जिस पर अब तक किसी ने नज़र नहीं डाली — आपकी सीट इसी के लिए है।",
    ],
    ownHeading: "ये बातें आप पहले ही कह चुके हैं — इन्हें दोहराइए मत, इनसे आगे बढ़िए",
    challengedHeading: "आप पर सवाल उठा है और आपने जवाब नहीं दिया — पहले इसका जवाब दीजिए",
    openQuestionsHeading: "जिन सवालों का छात्र ने जवाब नहीं दिया",
    asked: (from: string, question: string) => `${from} ने पूछा: "${question}"`,
    groundingHeading: "आधार",
    grounding: [
      "आपके पास इंटरनेट नहीं है और ऊपर लिखी बातों के अलावा कोई जानकारी नहीं है।",
      "अगर आप कोई आँकड़ा देते हैं — लागत, आबादी, कोई मानक — तो साफ़ कहिए कि यह आपका अपना अनुमान है। अनुमान को " +
        "पक्की जानकारी की तरह पेश मत कीजिए, और कोई हवाला, अध्ययन या स्रोत गढ़िए मत।",
      "जहाँ कोई आँकड़ा चाहिए जो छात्र ने नहीं दिया, वहाँ बताइए कि उसे कौन-सा आँकड़ा जाकर निकालना है।",
    ],
    speakHeading: "कैसे बोलना है",
    speak: [
      "सिर्फ़ अपनी ओर से, पहले पुरुष में बोलिए। विवरण मत दीजिए, मंच-निर्देश मत लिखिए, अपना नाम आगे मत लगाइए।",
      "किसी और सदस्य के संवाद मत लिखिए और न उनकी ओर से बोलिए।",
      "सहमति या असहमति जताते समय सहयोगियों को उनके पहले नाम से पुकारिए।",
      "कोई पक्ष लीजिए। सबसे सहमत हो जाना छात्र के किसी काम का नहीं।",
      "ख़ुद को कभी संबोधित मत कीजिए, और अपने शब्दों से पहले अपना नाम मत लिखिए।",
      "वह कहिए जो कमरे ने अभी तक नहीं सुना। सहयोगी की बात दोहराने से कुछ नहीं जुड़ता।",
      "जहाँ असहमत हों, वहाँ ठीक-ठीक बताइए कि किस बात से और क्यों।",
      "जहाँ सहमत हों, वहाँ कुछ जोड़िए — एक शर्त, एक नतीजा, या उसी बात का पैना रूप।",
      "जब किसी ख़ास दावे पर प्रतिक्रिया दे रहे हों, तो छात्र के अपने शब्द उद्धृत कीजिए।",
      "जो सवाल पहले पूछा जा चुका है, उसे दोबारा मत पूछिए।",
      "आप बोल रहे हैं, दस्तावेज़ नहीं लिख रहे। कोई क्रमांकित सूची नहीं, कोई बुलेट नहीं, कोई शीर्षक नहीं, कोई markdown",
      "नहीं — बस वही जो आप कमरे में सचमुच कहते।",
      "4 वाक्य से कम में कहिए। लंबाई से ज़्यादा घनत्व मायने रखता है, और लंबी बारी बीच शब्द में कट जाती है।",
    ],
    labelHeading: "अंत में एक लेबल लगाइए",
    labelIntro:
      "अपनी बात के बाद, अलग आख़िरी पंक्ति में, एक लेबल जोड़िए जो बताए कि आपने अभी क्या स्थापित किया:",
    labelRules: [
      "`[risk] <5 शब्द तक>` जब आपने ऐसी बात पकड़ी हो जो प्रोजेक्ट को डुबो सकती है।",
      "`[note] <5 शब्द तक>` जब आपने कोई बात सही पाई हो, या कोई दिशा तय की हो।",
    ],
    labelTail:
      "लेबल को निष्कर्ष की तरह लिखिए, विषय की तरह नहीं — `[risk] नाबालिगों की सहमति का रास्ता नहीं`, न कि `[risk] कानून`। " +
      "ठीक एक लेबल। उसके बाद कुछ नहीं। कोष्ठक में `risk` और `note` अंग्रेज़ी में ही लिखिए, बाक़ी हिंदी में।",
  },
} satisfies Record<Locale, unknown>;

/**
 * Builds the whole briefing an agent speaks from.
 *
 * A persona plus the proposal plus "don't repeat anyone" produces six people
 * reading prepared statements into the same room, because nothing in the
 * prompt gives them anything specific to react *to*. Everything below exists
 * to force engagement: claims on the table are named and attributed so they
 * can be attacked by name; the agent's own prior points are listed so
 * repetition is a visible failure rather than the path of least resistance;
 * open challenges are surfaced so a question put to them cannot quietly go
 * unanswered.
 */
function buildSystemPrompt(context: PromptContext): string {
  const { state, speakerId, phase, topic, memory } = context;
  const agent = getAgent(speakerId);
  const identities = identitiesFor(state.seatedAgentIds);
  const own = memory.byAgent[speakerId];
  const { brief } = state;

  const sections: string[] = [
    personaFor(speakerId),
    "",
    `YOUR OBJECTIVE IN THIS SESSION: ${agent.goal}`,
    "",
    "WHY THIS COUNCIL EXISTS",
    "A student has brought a project proposal for review. Your job is to make it more practical — to find " +
      "the gap between what they have written and what would actually work in the field, and to say what " +
      "would close it. You are not deciding whether to fund this and you are not grading it. Be hard on the " +
      "proposal and straightforward with the person.",
    "",
    "THE PROPOSAL",
    bullets(
      [
        `Title: ${brief.title}`,
        brief.problem ? `Problem statement: ${brief.problem}` : null,
        brief.solution ? `Proposed solution: ${brief.solution}` : null,
        brief.demographic ? `Target demographic: ${brief.demographic}` : null,
        brief.phase && brief.phase !== "Select Phase" ? `Current phase: ${brief.phase}` : null,
        brief.attachments?.length
          ? `Supporting documents named (contents not provided): ${brief.attachments.join(", ")}`
          : null,
      ].filter((line): line is string => Boolean(line)),
    ),
    "",
    `SESSION PHASE: ${PHASE_LABEL[phase]}`,
    PHASE_BRIEF[phase],
    "",
    `WHAT THE ROOM IS ON RIGHT NOW: ${TOPIC_LABEL[topic.topic]}`,
  ];

  // --- who else is at the table, so colleagues can be addressed by name
  const others = state.seatedAgentIds
    .filter((id) => id !== speakerId)
    .map((id) => `${identities[id]!.personName} (${identities[id]!.role})`);
  if (others.length) {
    sections.push("", "ALSO AT THE TABLE", bullets(others));
  }

  // --- the live argument
  const othersClaims = memory.keyClaims.filter((claim) => claim.agentId !== speakerId);
  if (othersClaims.length) {
    sections.push(
      "",
      "ALREADY ESTABLISHED BY YOUR COLLEAGUES — these points are made, do not make them again",
      bullets(
        othersClaims.map((claim) => `${claim.speaker} (${claim.role}) argued: "${claim.claim}"`),
      ),
      "",
      // The first live session had four seats independently re-deliver "the
      // grant is too small" and "they only have 2G phones" across seven
      // consecutive turns. Listing colleagues' claims was not enough on its
      // own — without being told what to *do* with the list, a model treats a
      // strong point it agrees with as a point worth restating.
      "You may build on, sharpen, or attack any of the above by name. You may not restate one as though",
      "it were new. If your own seat's reading of this proposal has already been covered, find the thing",
      "nobody has looked at yet — that is what your seat is for.",
    );
  }

  // --- their own history, to stop them restating it
  if (own?.positionsTaken.length) {
    sections.push(
      "",
      "YOU HAVE ALREADY MADE THESE POINTS — do not repeat them, build past them",
      bullets(own.positionsTaken),
    );
  }

  // --- challenges they owe an answer to
  if (own?.openChallenges.length) {
    sections.push(
      "",
      "YOU HAVE BEEN CHALLENGED AND HAVE NOT ANSWERED — answer this first",
      bullets(own.openChallenges.map((c) => `${c.from}: "${c.quote}"`)),
    );
  }

  // --- what the student still owes the council
  if (memory.openStudentQuestions.length) {
    sections.push(
      "",
      "QUESTIONS THE STUDENT HAS NOT ANSWERED",
      bullets(memory.openStudentQuestions.map((q) => `${q.from} asked: "${q.question}"`)),
    );
  }

  sections.push(
    "",
    "GROUNDING",
    bullets([
      "You have no web access and no data beyond what is written above.",
      "If you cite a figure — a cost, a population, a benchmark — say plainly that it is your own " +
        "estimate. Never present an estimate as a retrieved fact, and never invent a citation, a study " +
        "or a specific named source.",
      "Where you need a number the student has not given, say which number they must go and find.",
    ]),
    "",
    "HOW TO SPEAK",
    bullets([
      "Speak only as yourself, in first person. Never narrate, never use stage directions, never prefix your name.",
      "Never write another council member's lines or speak on their behalf.",
      "Refer to colleagues by first name when you agree or disagree with them.",
      "Take a position. Agreeing with everyone is worthless to the student.",
      "Never address yourself, and never write your own name before your words.",
      "Say something the room has not heard yet. Echoing a colleague adds nothing.",
      "Where you disagree, say what specifically you disagree with and why.",
      "Where you agree, add something — a condition, a consequence, or a sharper version of the point.",
      "Quote the student's own words when you are reacting to a specific claim.",
      "Do not repeat a question that has already been asked.",
      "You are speaking out loud, not writing a document. No numbered lists, no bullet points, no",
      "headings, no markdown — just what you would actually say in the room.",
      "Stay under 4 sentences. Density beats length, and a turn that runs long is cut off mid-word.",
    ]),
    "",
    "FINISH WITH A LABEL",
    "After your turn, on its own final line, add one label summarising what you just established:",
    bullets([
      "`[risk] <up to 5 words>` when you identified something that could sink the project.",
      "`[note] <up to 5 words>` when you confirmed something that holds up, or set a direction.",
    ]),
    "Write the label as a finding, not a topic — `[risk] No consent path for minors`, not `[risk] Legal`. " +
      "Exactly one label. Nothing after it.",
  );

  return sections.join("\n");
}

// ---- Advancing the session ------------------------------------------------

export interface AdvanceResult {
  message: CouncilMessage | null;
  complete: boolean;
  phase: DebatePhase | null;
  progress: SessionProgress;
  /** Who is due next, for the typing indicator. Null once complete. */
  nextSpeakerId: string | null;
  /** Why this speaker was chosen — surfaced so the UI can explain the pick. */
  selection?: { phase: DebatePhase; topic: TopicReading; scores: SpeakerScore[] };
  /** Set when the turn ended on a question the student should answer. */
  studentQuestion?: string;
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

/** Builds the student's own transcript entry so their interjections persist. */
export function studentMessage(content: string): CouncilMessage {
  return {
    id: newId("stu"),
    speakerId: "student",
    kind: "student",
    content: content.trim(),
    at: new Date().toISOString(),
  };
}

export async function advanceSession(
  state: SessionState,
  pendingStudentMessage?: string,
  signal?: AbortSignal,
): Promise<AdvanceResult> {
  const profile = resolvePhaseProfile();
  const topic = detectTopic(state.transcript, pendingStudentMessage);

  const selectionInput = {
    seatedAgentIds: state.seatedAgentIds,
    transcript: state.transcript,
    pendingStudentMessage,
    topic,
    profile,
  };

  const scores = scoreSpeakers(selectionInput);
  const speakerId = scores[0]?.agentId ?? null;
  const phase = currentPhase(selectionInput);

  if (!speakerId || !phase) {
    return {
      message: null,
      complete: true,
      phase: null,
      nextSpeakerId: null,
      progress: sessionProgress(selectionInput),
    };
  }

  const memory = buildCouncilMemory({
    transcript: state.transcript,
    seatedAgentIds: state.seatedAgentIds,
  });

  // Attributed line by line, with the speaker's own turns flagged — see
  // `toChatTurns` for why the roles are not used to carry that.
  const conversation: ConversationEntry[] = [
    ...state.transcript
      .filter((message) => message.kind !== "system")
      .map((message) => {
        if (message.kind === "student") {
          return {
            speaker: "The student",
            content: message.content,
            isSelf: false,
            isStudent: true,
          };
        }
        const agent = getAgent(message.speakerId);
        return {
          speaker: `${agent.personName} (${agent.name})`,
          content: message.content,
          isSelf: message.speakerId === speakerId,
          isStudent: false,
        };
      }),
    ...(pendingStudentMessage?.trim()
      ? [
          {
            speaker: "The student",
            content: pendingStudentMessage.trim(),
            isSelf: false,
            isStudent: true,
          },
        ]
      : []),
  ];

  const speaker = getAgent(speakerId);
  const raw = await generateAgentReply({
    systemPrompt: buildSystemPrompt({ state, speakerId, phase, topic, memory }),
    conversation,
    speakerLabel: `${speaker.personName} (${speaker.name})`,
    phase,
    ...(signal ? { signal } : {}),
  });

  const { content, tags } = parseTags(stripSpeakerPrefix(raw, speaker.personName));

  const message: CouncilMessage = {
    id: newId("msg"),
    speakerId,
    kind: "agent",
    // A turn that was *only* a label leaves nothing to say or speak; fall
    // back to the raw text rather than emitting an empty bubble.
    content: content || raw.trim(),
    at: new Date().toISOString(),
    ...(tags.length ? { tags } : {}),
  };

  const nextTranscript = [...state.transcript, message];
  const nextInput = {
    seatedAgentIds: state.seatedAgentIds,
    transcript: nextTranscript,
    profile,
  };
  const complete = isSessionComplete(nextInput);

  // Only worth pausing for while the council still has turns left — a
  // question asked on the final turn has nowhere to go but the verdict.
  const question = complete ? null : studentQuestionIn(message, state.seatedAgentIds);

  return {
    message,
    complete,
    phase,
    nextSpeakerId: complete
      ? null
      : scoreSpeakers({ ...nextInput, topic: detectTopic(nextTranscript) })[0]?.agentId ?? null,
    progress: sessionProgress(nextInput),
    selection: { phase, topic, scores: scores.slice(0, 4) },
    ...(question ? { studentQuestion: question } : {}),
  };
}
