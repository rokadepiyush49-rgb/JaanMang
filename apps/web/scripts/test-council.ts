/**
 * Exercises the deterministic half of the council engine.
 *
 * Everything asserted here runs without an API key: topic detection, phase
 * accounting, speaker selection, memory extraction, tag parsing and request
 * validation. That is most of what makes the council behave like a council —
 * the model only writes the prose — so it is worth being able to check it
 * without spending a token or waiting on a rate limit.
 *
 *   npm run test:council
 */

import {
  currentPhase,
  isSessionComplete,
  pickNextSpeaker,
  scoreSpeakers,
  sessionProgress,
  PHASE_PROFILES,
} from "@/lib/council/debate-policy";
import { buildCouncilMemory, studentQuestionIn } from "@/lib/council/memory";
import { parseTags, stripSpeakerPrefix } from "@/lib/council/orchestrator";
import { COUNCIL_AGENTS } from "@/lib/council/roster";
import { normaliseRefinement } from "@/lib/council/verdict";
import { detectTopic } from "@/lib/council/topics";
import { pickVoice, voiceProfileFor } from "@/lib/council/voices";
import { parseSeatedAgentIds, parseTranscript, parseBrief, ValidationError } from "@/lib/council/validate";
import type { CouncilMessage } from "@/lib/council/types";

let failures = 0;
let checks = 0;

function check(label: string, condition: boolean, detail?: unknown) {
  checks += 1;
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.log(`  ✗ ${label}`);
    if (detail !== undefined) console.log(`      got: ${JSON.stringify(detail)}`);
  }
}

function section(name: string) {
  console.log(`\n${name}`);
}

const PROFILE = PHASE_PROFILES.standard!;
const SEATS = ["citizen", "technical", "financial", "legal", "ip", "industry"];

let counter = 0;
function agentTurn(speakerId: string, content: string): CouncilMessage {
  counter += 1;
  return {
    id: `m${counter}`,
    speakerId,
    kind: "agent",
    content,
    at: new Date().toISOString(),
  };
}
function studentTurn(content: string): CouncilMessage {
  counter += 1;
  return { id: `s${counter}`, speakerId: "student", kind: "student", content, at: new Date().toISOString() };
}

/* ------------------------------------------------------------- roster --- */

section("Roster");
check("six agents are seated by default in the roster", COUNCIL_AGENTS.length === 6);
check(
  "every agent has a non-zero floor on every topic — nobody is disqualified from an argument",
  COUNCIL_AGENTS.every((agent) => Object.values(agent.topics).every((weight) => weight > 0)),
);
check(
  "every topic is owned (weight 1.0) by at least one agent",
  (["technical", "financial", "social", "legal", "novelty", "market"] as const).every((topic) =>
    COUNCIL_AGENTS.some((agent) => agent.topics[topic] === 1),
  ),
);
check(
  "agent ids are unique",
  new Set(COUNCIL_AGENTS.map((a) => a.id)).size === COUNCIL_AGENTS.length,
);

/* ------------------------------------------------------------- topics --- */

section("Topic detection");
check(
  "budget talk reads as financial",
  detectTopic([studentTurn("We have no idea who pays the running cost in year two.")]).topic ===
    "financial",
  detectTopic([studentTurn("We have no idea who pays the running cost in year two.")]).topic,
);
check(
  "village adoption talk reads as social",
  detectTopic([studentTurn("The gram panchayat has not been consulted and literacy is low.")])
    .topic === "social",
  detectTopic([studentTurn("The gram panchayat has not been consulted and literacy is low.")]).topic,
);
check(
  "DPDP and consent read as legal",
  detectTopic([studentTurn("We store personal data and have no consent flow under DPDP.")]).topic ===
    "legal",
  detectTopic([studentTurn("We store personal data and have no consent flow under DPDP.")]).topic,
);
check(
  "an empty transcript is 'general', not a coin flip",
  detectTopic([]).topic === "general",
);
check(
  "'impact' does not fire the legal list via the word 'act'",
  detectTopic([studentTurn("This has real impact for the community and the beneficiaries.")])
    .topic === "social",
  detectTopic([studentTurn("This has real impact for the community and the beneficiaries.")]).topic,
);
check(
  "a pending student message outweighs the previous agent turn",
  detectTopic(
    [agentTurn("technical", "The architecture, the API and the database all need work.")],
    "Forget that — who pays the running cost and the recurring cost?",
  ).topic === "financial",
  detectTopic(
    [agentTurn("technical", "The architecture, the API and the database all need work.")],
    "Forget that — who pays the running cost and the recurring cost?",
  ).topic,
);

/* -------------------------------------------------------------- phases --- */

section("Phases and progress");
check(
  "an empty session starts in diagnosis",
  currentPhase({ seatedAgentIds: SEATS, transcript: [], profile: PROFILE }) === "diagnosis",
);

const afterOneRound = SEATS.map((id) => agentTurn(id, "A first read on the proposal."));
check(
  "after one turn each, the session is in challenge",
  currentPhase({ seatedAgentIds: SEATS, transcript: afterOneRound, profile: PROFILE }) ===
    "challenge",
);

const afterTwoRounds = [...afterOneRound, ...SEATS.map((id) => agentTurn(id, "A challenge."))];
check(
  "after two turns each, the session is in refinement",
  currentPhase({ seatedAgentIds: SEATS, transcript: afterTwoRounds, profile: PROFILE }) ===
    "refinement",
);

const afterThreeRounds = [...afterTwoRounds, ...SEATS.map((id) => agentTurn(id, "A prescription."))];
check(
  "after three turns each, the session is complete",
  isSessionComplete({ seatedAgentIds: SEATS, transcript: afterThreeRounds, profile: PROFILE }),
);
check(
  "student turns do not consume an agent's allowance",
  currentPhase({
    seatedAgentIds: SEATS,
    transcript: [...afterOneRound, studentTurn("Here is my answer."), studentTurn("And another.")],
    profile: PROFILE,
  }) === "challenge",
);

const progress = sessionProgress({
  seatedAgentIds: SEATS,
  transcript: afterOneRound,
  profile: PROFILE,
});
check(
  "progress counts 6 of 18 turns for a full six-seat panel",
  progress.turnsTaken === 6 && progress.turnsPlanned === 18,
  progress,
);

/* ---------------------------------------------------- speaker selection --- */

section("Speaker selection");

const financialQuestion = {
  seatedAgentIds: SEATS,
  transcript: [] as CouncilMessage[],
  pendingStudentMessage: "Honestly we have no budget — what is the running cost per beneficiary?",
  profile: PROFILE,
};
check(
  "a budget question hands the floor to the financial seat",
  pickNextSpeaker(financialQuestion) === "financial",
  pickNextSpeaker(financialQuestion),
);

check(
  "a consent question hands the floor to the legal seat",
  pickNextSpeaker({
    seatedAgentIds: SEATS,
    transcript: [],
    pendingStudentMessage: "We collect personal data from minors with no consent flow.",
    profile: PROFILE,
  }) === "legal",
  pickNextSpeaker({
    seatedAgentIds: SEATS,
    transcript: [],
    pendingStudentMessage: "We collect personal data from minors with no consent flow.",
    profile: PROFILE,
  }),
);

check(
  "naming an agent directly pulls them forward",
  pickNextSpeaker({
    seatedAgentIds: SEATS,
    transcript: [],
    pendingStudentMessage: "Kavita, would the village actually use this?",
    profile: PROFILE,
  }) === "citizen",
  pickNextSpeaker({
    seatedAgentIds: SEATS,
    transcript: [],
    pendingStudentMessage: "Kavita, would the village actually use this?",
    profile: PROFILE,
  }),
);

check(
  "nobody speaks twice in a row",
  pickNextSpeaker({
    seatedAgentIds: SEATS,
    transcript: [agentTurn("financial", "The running cost and the budget are unaddressed.")],
    pendingStudentMessage: "Tell me more about the budget and the recurring cost.",
    profile: PROFILE,
  }) !== "financial",
);

// Everyone must get their turn even when one topic dominates the whole phase.
{
  let transcript: CouncilMessage[] = [];
  const spoke: string[] = [];
  for (let i = 0; i < SEATS.length; i += 1) {
    const next = pickNextSpeaker({
      seatedAgentIds: SEATS,
      transcript,
      pendingStudentMessage: "Everything here is about the architecture, the API and the database.",
      profile: PROFILE,
    });
    if (!next) break;
    spoke.push(next);
    transcript = [...transcript, agentTurn(next, "Noted.")];
  }
  check(
    "a single-topic phase still gives every seat exactly one turn",
    spoke.length === 6 && new Set(spoke).size === 6,
    spoke,
  );
  check("the topic owner still goes first", spoke[0] === "technical", spoke[0]);
}

check(
  "selection returns nothing once the session is out of turns",
  scoreSpeakers({ seatedAgentIds: SEATS, transcript: afterThreeRounds, profile: PROFILE }).length === 0,
);

/* -------------------------------------------------------------- memory --- */

section("Memory");
{
  const transcript = [
    agentTurn(
      "technical",
      "The distributed sensor network is sound, but the edge nodes draw more power than the solar array can supply.",
    ),
    agentTurn(
      "financial",
      "I disagree with Arjun — upgrading the panels blows the phase one budget by sixty thousand rupees.",
    ),
  ];
  const memory = buildCouncilMemory({ transcript, seatedAgentIds: SEATS });

  check(
    "an agent's own claim is recorded so they cannot repeat it",
    (memory.byAgent.technical?.positionsTaken.length ?? 0) > 0,
  );
  check(
    "a named disagreement lands as an open challenge on the target",
    (memory.byAgent.technical?.openChallenges.length ?? 0) > 0,
    memory.byAgent.technical?.openChallenges,
  );
  check(
    "the challenger does not challenge themselves",
    (memory.byAgent.financial?.openChallenges.length ?? 0) === 0,
  );
  check("claims from both agents reach the shared table", memory.keyClaims.length === 2, memory.keyClaims.length);

  const answered = buildCouncilMemory({
    transcript: [...transcript, agentTurn("technical", "Fair — I will drop the polling frequency instead.")],
    seatedAgentIds: SEATS,
  });
  check(
    "a challenge closes once the target speaks again",
    (answered.byAgent.technical?.openChallenges.length ?? 0) === 0,
    answered.byAgent.technical?.openChallenges,
  );
}

section("Questions to the student");
check(
  "a question naming a colleague is that colleague's to answer, not the student's",
  studentQuestionIn(
    agentTurn("financial", "Arjun, how do you justify that power budget?"),
    SEATS,
  ) === null,
);
check(
  "a question naming nobody is put to the student",
  studentQuestionIn(
    agentTurn("financial", "What is your cost per beneficiary?"),
    SEATS,
  ) !== null,
);

/* ----------------------------------------------------------------- tags --- */

section("Tag parsing");
{
  const parsed = parseTags(
    "The power budget does not close.\nYou need a bigger array or fewer readings.\n[risk] Power deficit unresolved",
  );
  check("the trailing marker is stripped from the spoken text", !parsed.content.includes("[risk]"));
  check("the tag label survives", parsed.tags[0]?.label === "Power deficit unresolved", parsed.tags);
  check("the tone is read as a risk", parsed.tags[0]?.tone === "risk");
}
{
  const parsed = parseTags("A mid-sentence [risk] mention stays put.");
  check(
    "a marker inside the prose is left alone rather than punching a hole in it",
    parsed.content.includes("[risk]") && parsed.tags.length === 0,
    parsed,
  );
}
{
  const parsed = parseTags("Nothing labelled here.");
  check("a turn with no marker parses cleanly", parsed.tags.length === 0 && parsed.content.length > 0);
}

// Variants seen from real models. `[ risk]` is not hypothetical — it came back
// on the very first live turn and slipped through the strict form.
{
  const variants: Array<[label: string, raw: string]> = [
    ["a space inside the bracket", "Body text.\n\n[ risk] Offline usability missing"],
    ["an upper-case marker", "Body text.\n[RISK] Offline usability missing"],
    ["a bullet before the marker", "Body text.\n- [risk] Offline usability missing"],
    ["bold markers around it", "Body text.\n**[risk]** Offline usability missing"],
    ["a colon after the marker", "Body text.\n[risk]: Offline usability missing"],
  ];
  for (const [label, raw] of variants) {
    const parsed = parseTags(raw);
    check(
      `${label} still yields a chip and leaves clean prose`,
      parsed.tags.length === 1 &&
        parsed.tags[0]!.tone === "risk" &&
        parsed.tags[0]!.label === "Offline usability missing" &&
        parsed.content === "Body text.",
      parsed,
    );
  }
}
{
  const parsed = parseTags("Body.\n[note] **Budget is realistic.**");
  check(
    "bold and a full stop are stripped off the chip label",
    parsed.tags[0]?.label === "Budget is realistic" && parsed.tags[0]?.tone === "note",
    parsed.tags,
  );
}

/* --------------------------------------- regressions from the first run --- */

section("Regressions from the first live session");
{
  // "…cannot be considered viable. [risk] Inadequate post-grant funding plan"
  const parsed = parseTags(
    "The grant cannot cover a year of operations. [risk] Inadequate post-grant funding plan",
  );
  check(
    "a marker sharing the prose's last line is lifted out, keeping the sentence intact",
    parsed.tags.length === 1 &&
      parsed.tags[0]!.label === "Inadequate post-grant funding plan" &&
      parsed.content === "The grant cannot cover a year of operations.",
    parsed,
  );
}
{
  const parsed = parseTags("We flagged the [risk] of a stockout mid-sentence and moved on.");
  check(
    "an inline mention with no sentence end before it is left alone",
    parsed.tags.length === 0 && parsed.content.includes("[risk]"),
    parsed,
  );
}
{
  const full = "Smartphone-only design ignores ASHA hardware reality entirely";
  const label = parseTags(`Body.\n[risk] ${full}`).tags[0]!.label;
  const kept = label.replace(/…$/, "");

  check("an over-long label is truncated with an ellipsis", label.endsWith("…"), label);
  check("the chip label stays short enough to render", label.length <= 46, label.length);
  check(
    "the cut lands on a word boundary — the kept text is a whole-word prefix of the original",
    full.startsWith(kept) && (full[kept.length] === " " || full.length === kept.length),
    label,
  );
}
{
  // The second live session invented `[question]`, which is not in the prompt.
  const parsed = parseTags("Body text.\n[question] Voice-access feasibility for ASHAs");
  check(
    "a tone word the prompt never offered still parses, as a neutral note",
    parsed.tags.length === 1 &&
      parsed.tags[0]!.tone === "note" &&
      parsed.tags[0]!.label === "Voice-access feasibility for ASHAs" &&
      parsed.content === "Body text.",
    parsed,
  );
}
{
  const parsed = parseTags("Body text.\n[blocker] No consent path for minors");
  check(
    "a risk synonym is coloured as a risk, not a note",
    parsed.tags[0]?.tone === "risk",
    parsed.tags,
  );
}
{
  const parsed = parseTags("Body text.\n[action] Talk to the district health office");
  check(
    "an unknown-but-positive word falls back to a note",
    parsed.tags[0]?.tone === "note",
    parsed.tags,
  );
}
{
  check(
    "a leaked 'Name (Role):' self-prefix is stripped",
    stripSpeakerPrefix(
      "Rohan Desai (Financial Strategist): The grant cannot cover a year.",
      "Rohan Desai",
    ) === "The grant cannot cover a year.",
  );
  check(
    "a bare first-name prefix is stripped too",
    stripSpeakerPrefix("Kavita: The village was never consulted.", "Kavita Munda") ===
      "The village was never consulted.",
  );
  check(
    "the honorific form is handled",
    stripSpeakerPrefix("Neha: Prior art exists.", "Dr. Neha Iyer") === "Prior art exists.",
  );
  check(
    "addressing a COLLEAGUE by name is never stripped",
    stripSpeakerPrefix("Arjun, your power budget does not close.", "Rohan Desai") ===
      "Arjun, your power budget does not close.",
  );
  check(
    "a normal opening sentence is untouched",
    stripSpeakerPrefix("The proposal assumes every worker owns a smartphone.", "Kavita Munda") ===
      "The proposal assumes every worker owns a smartphone.",
  );
}

section("Verdict refinement");
{
  const brief = { title: "T", problem: "P", solution: "We will build an app for ASHA workers." };
  const seats = ["citizen", "technical"];

  const out = normaliseRefinement(
    {
      refined:
        "We will deliver the household list [[via USSD on any 2G feature phone]] and measure [[women screened per month]].",
      creditedAgentId: "citizen",
    },
    brief,
    seats,
  );

  check("inline markers yield highlights", out.highlights.length === 2, out.highlights);
  check(
    "the brackets are stripped from the text the student reads",
    !out.refined.includes("[[") && !out.refined.includes("]]"),
    out.refined,
  );
  check(
    "every highlight is present VERBATIM in the cleaned text — the guarantee the renderer needs",
    out.highlights.every((phrase) => out.refined.includes(phrase)),
    out,
  );
  check(
    "the phrase is exactly what was between the brackets",
    out.highlights[0] === "via USSD on any 2G feature phone",
    out.highlights[0],
  );

  const whole = normaliseRefinement(
    { refined: "[[We will deliver the household list via USSD to every ASHA worker in Dumka.]]" },
    brief,
    seats,
  );
  check(
    "a marker wrapping the whole rewrite is rejected rather than highlighting everything",
    whole.highlights.length === 0 && !whole.refined.includes("[["),
    whole,
  );

  const none = normaliseRefinement(
    { refined: "We will deliver the household list via USSD to ASHA workers." },
    brief,
    seats,
  );
  check(
    "a rewrite with no markers still renders, just unmarked",
    none.highlights.length === 0 && none.refined.length > 0,
    none,
  );

  const noRewrite = normaliseRefinement({}, brief, seats);
  check(
    "a missing rewrite falls back to the student's own words rather than blank",
    noRewrite.refined === brief.solution && noRewrite.original === brief.solution,
    noRewrite,
  );
  check(
    "an unseated credited agent falls back to a seated one",
    normaliseRefinement({ refined: "x y z" }, brief, ["technical"]).creditedAgentId === "technical",
  );
}

/* ----------------------------------------------------------- validation --- */

section("Request validation");
check(
  "unknown agent ids are dropped rather than rejected",
  JSON.stringify(parseSeatedAgentIds(["citizen", "ceo", "cfo"])) === JSON.stringify(["citizen"]),
  parseSeatedAgentIds(["citizen", "ceo", "cfo"]),
);
check(
  "seats come back in roster order regardless of the order sent",
  JSON.stringify(parseSeatedAgentIds(["industry", "citizen", "technical"])) ===
    JSON.stringify(["citizen", "technical", "industry"]),
  parseSeatedAgentIds(["industry", "citizen", "technical"]),
);
check("an empty panel is rejected", (() => {
  try {
    parseSeatedAgentIds([]);
    return false;
  } catch (error) {
    return error instanceof ValidationError;
  }
})());
check("a brief with no title is rejected", (() => {
  try {
    parseBrief({ problem: "Something" });
    return false;
  } catch (error) {
    return error instanceof ValidationError;
  }
})());
check("a brief with a title but no content is rejected", (() => {
  try {
    parseBrief({ title: "My project" });
    return false;
  } catch (error) {
    return error instanceof ValidationError;
  }
})());
check(
  "an agent entry naming an unknown seat is dropped from the transcript",
  parseTranscript([
    { id: "a", speakerId: "cfo", kind: "agent", content: "Hello", at: new Date().toISOString() },
    { id: "b", speakerId: "citizen", kind: "agent", content: "Hello", at: new Date().toISOString() },
  ]).length === 1,
);
check(
  "entries are rebuilt field by field, so extra keys cannot ride along",
  !("injected" in (parseTranscript([
    { id: "a", speakerId: "citizen", kind: "agent", content: "Hi", at: new Date().toISOString(), injected: "x" },
  ])[0] ?? {})),
);
check("an empty-content entry is dropped", parseTranscript([{ id: "a", kind: "student", content: "   " }]).length === 0);


/* --------------------------------------------------------------- voices --- */

section("Voice assignment");
{
  /**
   * The real `getVoices()` list from a stock macOS 15 machine, captured in the
   * browser. Half of it is novelty voices, which is the whole reason this is
   * worth asserting on — ranking by name alone put "Bad News" at the front.
   */
  const MAC_VOICES = [
    ["Rishi", "en-IN"], ["Albert", "en-US"], ["Bad News", "en-US"], ["Bahh", "en-US"],
    ["Bells", "en-US"], ["Boing", "en-US"], ["Bubbles", "en-US"], ["Cellos", "en-US"],
    ["Daniel", "en-GB"], ["Eddy (English (United Kingdom))", "en-GB"],
    ["Flo (English (United States))", "en-US"], ["Fred", "en-US"], ["Good News", "en-US"],
    ["Grandma (English (United States))", "en-US"], ["Grandpa (English (United States))", "en-US"],
    ["Jester", "en-US"], ["Junior", "en-US"], ["Karen", "en-AU"], ["Kathy", "en-US"],
    ["Moira", "en-IE"], ["Organ", "en-US"], ["Ralph", "en-US"],
    ["Reed (English (United States))", "en-US"], ["Rocko (English (United States))", "en-US"],
    ["Samantha", "en-US"], ["Sandy (English (United States))", "en-US"],
    ["Shelley (English (United States))", "en-US"], ["Superstar", "en-US"],
    ["Tessa", "en-ZA"], ["Trinoids", "en-US"], ["Whisper", "en-US"], ["Wobble", "en-US"],
    ["Zarvox", "en-US"],
  ].map(([name, lang]) => ({
    name: name!,
    lang: lang!,
    voiceURI: name!,
    localService: true,
    default: false,
  })) as SpeechSynthesisVoice[];

  const NOVELTY = [
    "Bad News", "Bahh", "Bells", "Boing", "Bubbles", "Cellos", "Good News", "Jester",
    "Organ", "Superstar", "Trinoids", "Whisper", "Wobble", "Zarvox", "Albert", "Junior",
    "Kathy", "Ralph", "Fred",
  ];

  const taken = new Set<string>();
  const assigned: Record<string, string> = {};
  for (const agent of COUNCIL_AGENTS) {
    const voice = pickVoice(MAC_VOICES, voiceProfileFor(agent.id), taken);
    if (voice) {
      taken.add(voice.voiceURI);
      assigned[agent.id] = voice.name;
    }
  }

  check("every agent is assigned a voice", Object.keys(assigned).length === 6, assigned);
  check(
    "no council member is given a novelty voice",
    Object.values(assigned).every((name) => !NOVELTY.includes(name)),
    assigned,
  );
  check(
    "all six voices are distinct on a machine with this many to spare",
    new Set(Object.values(assigned)).size === 6,
    assigned,
  );
  console.log(`      assigned: ${JSON.stringify(assigned)}`);

  // One voice, six speakers: everyone must still get it rather than going mute.
  const single = [MAC_VOICES.find((v) => v.name === "Samantha")!];
  const solo = new Set<string>();
  const soloAssigned = COUNCIL_AGENTS.map((agent) => {
    const voice = pickVoice(single, voiceProfileFor(agent.id), solo);
    if (voice) solo.add(voice.voiceURI);
    return voice?.name ?? null;
  });
  check(
    "with only one voice available, every agent still gets it rather than none",
    soloAssigned.every((name) => name === "Samantha"),
    soloAssigned,
  );

  check("an empty voice list returns null rather than throwing", pickVoice([], voiceProfileFor("citizen"), new Set()) === null);
}

/* ---------------------------------------------------------------- done --- */

console.log(`\n${checks - failures}/${checks} checks passed.`);
if (failures > 0) {
  console.log(`${failures} FAILED`);
  process.exit(1);
}
