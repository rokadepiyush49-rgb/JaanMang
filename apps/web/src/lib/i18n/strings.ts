/**
 * Every string the council feature shows, in both languages.
 *
 * One flat object per locale rather than per-component files: the whole point
 * of a dictionary is that a missing translation is a *type error*, and that
 * only works if both objects are checked against one shape. `satisfies
 * Record<Locale, Strings>` below is what enforces it — add a key to `en` and
 * the build fails until `hi` has it too.
 *
 * Interpolated strings are functions, not templates with placeholders. A
 * `"{n} advisors"` string has to be parsed and substituted at runtime, and
 * nothing checks that the caller passed `n`; a function signature does.
 *
 * ## Scope
 *
 * Council pages only, as agreed. The rest of the app is still English — this
 * dictionary is not a whole-app i18n layer and should not grow into one
 * without the same care being applied to the engine (see `lib/council/hindi.ts`
 * for why translating the UI alone would silently break speaker selection).
 *
 * Keep this file free of server-only imports.
 */

import type { Locale } from "@/lib/i18n/locale";

const en = {
  // ---- landing -----------------------------------------------------------
  landingTitle: "Bring your project to the council.",
  landingBody:
    "Let specialized AI agents challenge your assumptions, identify risks, and help turn your idea into a stronger, more feasible project.",
  landingCta: "Start New Analysis",
  landingPrivacy: "Private workspace. Insights are generated securely.",
  workspaceReady: "Workspace Ready",
  councilCore: "Council Core",
  lensPolicy: "Policy",
  lensFeasibility: "Feasibility",

  // ---- setup -------------------------------------------------------------
  councilName: "AI Project Council",
  problemExplorer: "Problem Explorer",
  setupTitle: "Council Initialization",
  setupSubtitle:
    "Define your project parameters and select the specialized AI agents to form your advisory council for comprehensive analysis.",
  projectDetails: "Project Details",
  projectDetailsHint: "Core structural information for the council to analyze.",
  fieldTitle: "Project Title",
  fieldTitlePlaceholder: "e.g., Rural Broadband Initiative",
  fieldProblem: "Problem Statement",
  fieldProblemPlaceholder: "Describe the specific problem this project aims to solve…",
  fieldSolution: "Proposed Solution",
  fieldSolutionPlaceholder: "Detail your approach and methodology…",
  fieldDemographic: "Target Demographic",
  fieldDemographicPlaceholder: "e.g., Students, Farmers",
  fieldPhase: "Current Phase",
  documents: "Supporting Documents",
  documentsHint: "Upload research, whitepapers, or data sets.",
  add: "Add",
  filePrompt: "Click to select files",
  fileHint: "PDF, DOCX, CSV or XLSX up to 25 MB each",
  removeFile: (file: string) => `Remove ${file}`,
  assembly: "Council Assembly",
  assemblyHint: "Select AI personas to review your project from multiple critical perspectives.",
  selectedCount: (n: number) => `${n} Selected`,
  convene: "Convene the Council",
  cancel: "Cancel",

  // ---- session -----------------------------------------------------------
  statusIdle: "Council ready",
  statusRunning: "Council is in session",
  statusPaused: "Council paused",
  statusComplete: "Council has finished",
  statusError: "Council interrupted",
  hintIdle: "Press start when you are ready.",
  hintPaused: "Held for your input.",
  hintComplete: "Review the verdict when you are ready.",
  hasTheFloor: (name: string) => `${name} has the floor…`,
  isThinking: (name: string) => `${name} is thinking…`,
  turnsOf: (taken: number, planned: number) => `${taken}/${planned} turns`,
  mute: "Mute the council",
  unmute: "Unmute the council",
  seatedReady: (n: number) =>
    `${n} advisors are seated and ready to review your proposal. They will speak aloud — turn your volume up.`,
  begin: "Begin the session",
  speaking: "Speaking",
  you: "You",
  proposer: "Proposer",
  stopped: "The council stopped",
  tryAgain: "Try again",
  replyLabel: "Your response to the council",
  replyPlaceholder: "Answer a question or defend your approach…",
  replyEnded: "The session has ended — open the verdict.",
  voiceBrowser: "Speaking with your browser's built-in voices.",
  voiceNeural: "Speaking with neural voices.",
  voiceIdle: "Your reply is read out to the council on its next turn.",
  start: "Start",
  submit: "Submit",
  pause: "Pause the council",
  resume: "Resume the council",
  insights: "Council Insights",
  notSpokenYet: (name: string) => `${name} has not spoken yet.`,
  turnCount: (n: number) => `${n} ${n === 1 ? "turn" : "turns"}`,
  flagCount: (n: number) => `${n} ${n === 1 ? "flag" : "flags"}`,
  viewVerdict: "View the verdict",
  verdictLocked: "Verdict unlocks at the end",
  loadingSession: "Loading your session…",
  noSession: "No project found — taking you back to setup…",

  // ---- phases ------------------------------------------------------------
  phaseDiagnosis: "Diagnosis",
  phaseChallenge: "Challenge",
  phaseRefinement: "Refinement",

  // ---- verdict -----------------------------------------------------------
  verdictTitle: "Verdict & Analysis",
  verdictCrumb: "Council Verdict",
  weighing: "The council is weighing everything that was said…",
  verdictFailed: "The verdict could not be written",
  readiness: "Overall Readiness",
  strengths: "Strongest Areas",
  concerns: "Major Concerns",
  actions: "Do these next",
  actionsHint: "The council's concrete next steps, most important first.",
  improvementLoop: "Project Improvement Loop",
  improvementHint: "The council's rewrite of your own proposal, sharpened rather than replaced.",
  yourProposal: "Your Proposal",
  refinedProposal: "Refined Proposal",
  creditedTo: (role: string) => `Agent: ${role}`,
  restart: "Restart for New Iteration",
  exportReport: "Export Final Report",
  toTeam: "Take it to team formation",
  backToSession: "Back to session",
  noSessionShort: "No session found.",

  // ---- scored dimensions -------------------------------------------------
  dimPracticality: "Practicality",
  dimSocialImpact: "Social Impact Potential",
  dimTechnicalFeasibility: "Technical Feasibility",
  dimFinancialViability: "Financial Sustainability",
  dimNovelty: "Originality",

  // ---- switcher ----------------------------------------------------------
  language: "Language",
};

/** The shape both locales must satisfy. Derived, so it can never drift. */
type Strings = typeof en;

const hi: Strings = {
  // ---- landing -----------------------------------------------------------
  landingTitle: "अपना प्रोजेक्ट परिषद के सामने रखिए।",
  landingBody:
    "विशेषज्ञ AI सलाहकार आपकी मान्यताओं को परखेंगे, जोखिम पहचानेंगे, और आपके विचार को ज़्यादा मज़बूत और व्यावहारिक बनाने में मदद करेंगे।",
  landingCta: "नया विश्लेषण शुरू करें",
  landingPrivacy: "निजी कार्यक्षेत्र। विश्लेषण सुरक्षित रूप से तैयार होता है।",
  workspaceReady: "कार्यक्षेत्र तैयार है",
  councilCore: "परिषद केंद्र",
  lensPolicy: "नीति",
  lensFeasibility: "व्यावहारिकता",

  // ---- setup -------------------------------------------------------------
  councilName: "AI प्रोजेक्ट परिषद",
  problemExplorer: "समस्या खोज",
  setupTitle: "परिषद की शुरुआत",
  setupSubtitle:
    "अपने प्रोजेक्ट का ब्यौरा भरिए और वे AI सलाहकार चुनिए जो अलग-अलग नज़रिए से उसकी गहराई से जाँच करेंगे।",
  projectDetails: "प्रोजेक्ट का विवरण",
  projectDetailsHint: "परिषद को जाँचने के लिए बुनियादी जानकारी।",
  fieldTitle: "प्रोजेक्ट का नाम",
  fieldTitlePlaceholder: "जैसे, ग्रामीण ब्रॉडबैंड पहल",
  fieldProblem: "समस्या का विवरण",
  fieldProblemPlaceholder: "वह समस्या बताइए जिसे यह प्रोजेक्ट हल करना चाहता है…",
  fieldSolution: "प्रस्तावित समाधान",
  fieldSolutionPlaceholder: "अपना तरीका और कार्यप्रणाली विस्तार से लिखिए…",
  fieldDemographic: "लक्षित समुदाय",
  fieldDemographicPlaceholder: "जैसे, छात्र, किसान",
  fieldPhase: "वर्तमान चरण",
  documents: "सहायक दस्तावेज़",
  documentsHint: "शोध, श्वेतपत्र या डेटा सेट अपलोड कीजिए।",
  add: "जोड़ें",
  filePrompt: "फ़ाइल चुनने के लिए क्लिक कीजिए",
  fileHint: "PDF, DOCX, CSV या XLSX — हर एक 25 MB तक",
  removeFile: (file: string) => `${file} हटाएँ`,
  assembly: "परिषद का गठन",
  assemblyHint: "वे AI सलाहकार चुनिए जो आपके प्रोजेक्ट को अलग-अलग अहम नज़रिए से परखेंगे।",
  selectedCount: (n: number) => `${n} चुने गए`,
  convene: "परिषद बुलाइए",
  cancel: "रद्द करें",

  // ---- session -----------------------------------------------------------
  statusIdle: "परिषद तैयार है",
  statusRunning: "परिषद की बैठक चल रही है",
  statusPaused: "परिषद रुकी हुई है",
  statusComplete: "परिषद की बैठक समाप्त",
  statusError: "परिषद रुक गई",
  hintIdle: "तैयार हों तो शुरू कीजिए।",
  hintPaused: "आपके जवाब का इंतज़ार है।",
  hintComplete: "जब चाहें फ़ैसला देखिए।",
  hasTheFloor: (name: string) => `${name} बोल रही/रहे हैं…`,
  isThinking: (name: string) => `${name} सोच रही/रहे हैं…`,
  turnsOf: (taken: number, planned: number) => `${taken}/${planned} बारी`,
  mute: "परिषद की आवाज़ बंद करें",
  unmute: "परिषद की आवाज़ चालू करें",
  seatedReady: (n: number) =>
    `${n} सलाहकार आपके प्रस्ताव की समीक्षा के लिए तैयार हैं। वे बोलकर बात करेंगे — आवाज़ बढ़ा लीजिए।`,
  begin: "बैठक शुरू कीजिए",
  speaking: "बोल रहे हैं",
  you: "आप",
  proposer: "प्रस्तावक",
  stopped: "परिषद रुक गई",
  tryAgain: "फिर कोशिश करें",
  replyLabel: "परिषद को आपका जवाब",
  replyPlaceholder: "किसी सवाल का जवाब दीजिए या अपना पक्ष रखिए…",
  replyEnded: "बैठक समाप्त हो चुकी है — फ़ैसला देखिए।",
  voiceBrowser: "ब्राउज़र की अपनी आवाज़ से बोल रहे हैं।",
  voiceNeural: "न्यूरल आवाज़ से बोल रहे हैं।",
  voiceIdle: "आपका जवाब परिषद को अगली बारी में सुनाया जाएगा।",
  start: "शुरू",
  submit: "भेजें",
  pause: "परिषद रोकें",
  resume: "परिषद फिर शुरू करें",
  insights: "परिषद के निष्कर्ष",
  notSpokenYet: (name: string) => `${name} ने अभी कुछ नहीं कहा।`,
  turnCount: (n: number) => `${n} बारी`,
  flagCount: (n: number) => `${n} चेतावनी`,
  viewVerdict: "फ़ैसला देखिए",
  verdictLocked: "फ़ैसला बैठक के अंत में खुलेगा",
  loadingSession: "आपकी बैठक खुल रही है…",
  noSession: "कोई प्रोजेक्ट नहीं मिला — आपको वापस ले जा रहे हैं…",

  // ---- phases ------------------------------------------------------------
  phaseDiagnosis: "जाँच",
  phaseChallenge: "बहस",
  phaseRefinement: "सुधार",

  // ---- verdict -----------------------------------------------------------
  verdictTitle: "फ़ैसला और विश्लेषण",
  verdictCrumb: "परिषद का फ़ैसला",
  weighing: "परिषद बैठक की हर बात पर विचार कर रही है…",
  verdictFailed: "फ़ैसला तैयार नहीं हो सका",
  readiness: "कुल तैयारी",
  strengths: "सबसे मज़बूत पक्ष",
  concerns: "बड़ी चिंताएँ",
  actions: "अब ये कीजिए",
  actionsHint: "परिषद के ठोस अगले कदम, सबसे ज़रूरी पहले।",
  improvementLoop: "प्रोजेक्ट सुधार चक्र",
  improvementHint: "परिषद ने आपके ही प्रस्ताव को बदला नहीं, धार दी है।",
  yourProposal: "आपका प्रस्ताव",
  refinedProposal: "बेहतर प्रस्ताव",
  creditedTo: (role: string) => `सलाहकार: ${role}`,
  restart: "नए सिरे से शुरू करें",
  exportReport: "अंतिम रिपोर्ट डाउनलोड करें",
  toTeam: "टीम बनाने की ओर बढ़िए",
  backToSession: "बैठक पर वापस",
  noSessionShort: "कोई बैठक नहीं मिली।",

  // ---- scored dimensions -------------------------------------------------
  dimPracticality: "व्यावहारिकता",
  dimSocialImpact: "सामाजिक प्रभाव",
  dimTechnicalFeasibility: "तकनीकी व्यवहार्यता",
  dimFinancialViability: "आर्थिक स्थिरता",
  dimNovelty: "मौलिकता",

  // ---- switcher ----------------------------------------------------------
  language: "भाषा",
};

export const STRINGS = { en, hi } satisfies Record<Locale, Strings>;

export type { Strings };

/** The dictionary for one locale. Call it `t` at the use site. */
export function stringsFor(locale: Locale): Strings {
  return STRINGS[locale];
}
