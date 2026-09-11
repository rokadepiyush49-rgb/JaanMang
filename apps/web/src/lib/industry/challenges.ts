/**
 * The challenge catalogue.
 *
 * Two sources feed it, and they are kept apart on purpose.
 *
 * `ENRICHMENT` is the industry-facing overlay on problems that already exist in
 * the government fixture. A partner looking at P-1042 is looking at the very
 * record an officer validated in `/gov` — the same 43 reports, the same 4,281
 * people, the same priority of 94. What this file adds is the layer the
 * government has no reason to hold: which technologies a solution needs, which
 * capability gap is the real obstacle, which SDGs it serves, and what success
 * would be defined as before anyone commits. Nothing here overrides a
 * government figure; it only annotates one.
 *
 * `NATIVE_CHALLENGES` are challenges published to the marketplace by
 * jurisdictions outside the Nagri fixture — Palamu, Khunti, Simdega, and the
 * Odisha and Maharashtra districts this company is also registered to work in.
 * They exist so the marketplace spans the nine domains rather than the six the
 * Nagri sample happens to contain, and so the match engine has genuine misses
 * to score against: a Bastar challenge in a state the company cannot deploy in
 * should score low, and does.
 */

import type { IconName } from "@/components/icon";
import type { Tint } from "@/components/ui";
import type { ProblemCategory } from "@/lib/gov/types";
import { d, h } from "./mock-data";
import type {
  Capability,
  Challenge,
  ChallengeStatus,
  Contribution,
  Domain,
  EvidenceLine,
  Outcome,
  SupportKind,
} from "./types";

/* ============================================================ domains === */

export const DOMAIN_LABEL: Record<Domain, string> = {
  water: "Water & Sanitation",
  health: "Healthcare",
  education: "Education",
  agriculture: "Agriculture",
  environment: "Environment",
  energy: "Energy",
  infrastructure: "Infrastructure",
  accessibility: "Accessibility",
  rural: "Rural Development",
};

/** Short form, for chips and filter pills where the row is already tight. */
export const DOMAIN_SHORT: Record<Domain, string> = {
  water: "Water",
  health: "Healthcare",
  education: "Education",
  agriculture: "Agriculture",
  environment: "Environment",
  energy: "Energy",
  infrastructure: "Infrastructure",
  accessibility: "Accessibility",
  rural: "Rural Dev",
};

export const DOMAIN_ICON: Record<Domain, IconName> = {
  water: "droplet",
  health: "heart",
  education: "graduation",
  agriculture: "leaf",
  environment: "globe",
  energy: "zap",
  infrastructure: "landmark",
  accessibility: "users",
  rural: "map-pin",
};

/** Which of the six tile washes each domain takes. Stable across every screen. */
export const DOMAIN_TINT: Record<Domain, Tint> = {
  water: "blue",
  health: "orchid",
  education: "navy",
  agriculture: "mint",
  environment: "mint",
  energy: "amber",
  infrastructure: "clay",
  accessibility: "orchid",
  rural: "clay",
};

export const DOMAINS: Domain[] = [
  "education",
  "health",
  "agriculture",
  "water",
  "environment",
  "energy",
  "infrastructure",
  "accessibility",
  "rural",
];

/** The government's problem categories, read as an industry domain. */
export const CATEGORY_DOMAIN: Record<ProblemCategory, Domain> = {
  water: "water",
  sanitation: "water",
  roads: "infrastructure",
  bridge: "infrastructure",
  drainage: "infrastructure",
  streetlight: "energy",
  waste: "environment",
  school: "education",
  health: "health",
};

/* ========================================================= enrichment === */

export type ChallengeEnrichment = {
  /** Written for a partner deciding whether to engage, not for an officer. */
  summary: string;
  domain?: Domain;
  /**
   * Overrides the status derived from the government record.
   *
   * Needed because the two surfaces update on different clocks: a problem can
   * still read "awaiting sponsorship" in the department's queue for days after
   * a partner has committed and a project has opened.
   */
  status?: ChallengeStatus;
  technologies: string[];
  capabilitiesNeeded: Capability[];
  supportNeeded: SupportKind[];
  sdgs: number[];
  timelineDays: number;
  universityId?: string;
  teamId?: string;
  projectId?: string;
  expectedOutcomes: Outcome[];
  /** Money already on the table, ours included where it is. */
  contributions?: Contribution[];
  evidence?: EvidenceLine[];
  sanctionReference?: string;
};

export const ENRICHMENT: Record<string, ChallengeEnrichment> = {
  "P-1042": {
    summary:
      "Piped supply to three villages has been down for three days and the handpump fallback is dry. The panchayat needs the pump-house valve assembly replaced and, more importantly, instrumentation that reports a failure the day it happens instead of three days later. A BIT Mesra team has a working pressure-node prototype and no way to field it.",
    technologies: [
      "IoT & Telemetry",
      "LoRaWAN",
      "Water Systems",
      "Sensors & Instrumentation",
      "Hydraulic Systems",
      "AI/ML",
    ],
    capabilitiesNeeded: ["hardware", "field-deployment", "certification"],
    supportNeeded: ["fund", "mentor", "technology", "deploy"],
    sdgs: [6, 9, 11],
    timelineDays: 90,
    universityId: "u-bit",
    teamId: "t-dhara",
    sanctionReference: "JH-RAN-WS-2026-114",
    expectedOutcomes: [
      { label: "Supply restored", target: "3 villages, within 14 days", method: "Panchayat water register, verified against citizen confirmation" },
      { label: "Outage detection time", target: "3 days → under 6 hours", method: "Time between telemetry alarm and the first citizen report, over 90 days" },
      { label: "Repeat outage reports", target: "95% reduction", method: "Report volume for this cluster, 90 days before against 90 days after" },
      { label: "Panchayat can operate it", target: "2 staff certified", method: "Handover checklist countersigned by the Junior Engineer" },
    ],
    evidence: [
      { label: "Expected demand reduction", value: "95%", source: "Modelled from the 2025 Ormanjhi deployment: 41 reports in the 90 days before, 2 after" },
      { label: "Cost basis", value: "₹6.2 L", source: "Rural Works schedule of rates 2026 + BIT Mesra bill of materials" },
    ],
    contributions: [
      { id: "c-1042-a", party: "Tata Steel Foundation", kind: "industry", amount: 150000, status: "proposed", at: h(6) },
    ],
  },

  "P-1038": {
    summary:
      "A 1.4 km approach road has washed out for the third time in 24 months, cutting Pithoria off from the block headquarters during rain. The previous repair did not hold, so the department wants the drainage cross-section re-specified rather than the surface relaid — which is a design problem a civil engineering department can take on.",
    technologies: ["GIS", "Hydrology", "Materials"],
    capabilitiesNeeded: ["field-deployment", "logistics"],
    supportNeeded: ["fund", "mentor", "partner"],
    sdgs: [9, 11],
    timelineDays: 150,
    expectedOutcomes: [
      { label: "Washout recurrence", target: "0 over two monsoons", method: "Department inspection after each monsoon, published to the problem record" },
      { label: "Connectivity days lost", target: "18 → under 3 per year", method: "Block transport log" },
    ],
    evidence: [
      { label: "Recurrence", value: "3rd washout in 24 months", source: "Rural Works Department repair history at the same chainage" },
    ],
  },

  "P-1051": {
    status: "in_delivery",
    summary:
      "Eleven poles on the Booty Basti main road have been dark for six weeks, on a stretch with a girls' school and a bus stop. The ward wants solar units with fault telemetry so a failure raises a ticket instead of waiting for a complaint. NIT Jamshedpur has the controller design and needs the field electronics.",
    technologies: ["Solar & Power Electronics", "IoT & Telemetry", "Embedded Systems"],
    capabilitiesNeeded: ["hardware", "field-deployment", "training"],
    supportNeeded: ["fund", "technology", "deploy"],
    sdgs: [7, 11],
    timelineDays: 75,
    universityId: "u-nit",
    teamId: "t-roshni",
    projectId: "CDP-102",
    expectedOutcomes: [
      { label: "Lit hours", target: "97% of dark hours", method: "Controller uptime log, sampled monthly" },
      { label: "Fault-to-repair time", target: "42 days → 5 days", method: "Ticket timestamps from the telemetry backend" },
    ],
    contributions: [
      { id: "c-1051-self", party: "Nirvaha Technologies", kind: "industry", amount: 360000, status: "disbursed", at: d(210), isSelf: true },
    ],
  },

  "P-1012": {
    status: "in_delivery",
    summary:
      "The Kanchi stream crossing has a cracked deck panel and is under a load restriction that adds 11 km to every trip from Tigra. Before a repair estimate can be written the department needs a real load rating, which means instrumenting the deck — work a structural engineering department can do well and cheaply.",
    technologies: ["Sensors & Instrumentation", "Structural Monitoring", "Embedded Systems"],
    capabilitiesNeeded: ["hardware", "testing", "field-deployment"],
    supportNeeded: ["fund", "technology", "test", "mentor"],
    sdgs: [9, 11],
    timelineDays: 120,
    universityId: "u-bit",
    teamId: "t-prahari",
    projectId: "CDP-108",
    expectedOutcomes: [
      { label: "Load rating established", target: "Signed rating note", method: "District engineer's office acceptance of the instrumented rating" },
      { label: "Detour distance removed", target: "11 km per trip", method: "Block transport survey after the restriction lifts" },
    ],
    contributions: [
      { id: "c-1012-self", party: "Nirvaha Technologies", kind: "industry", amount: 1130000, status: "disbursed", at: d(154), isSelf: true },
    ],
  },

  "P-1008": {
    status: "in_delivery",
    summary:
      "Two classrooms at Chandaghasi Middle School are unusable in rain, and the same roof failure has taken the school's rainwater tank out of service. A BIT Mesra civil team has designed a repair that restores both at once, and needs the retrofit hardware and a manufacturing read on the tap assembly.",
    technologies: ["Water Systems", "Materials", "Rainwater Harvesting"],
    capabilitiesNeeded: ["manufacturing", "field-deployment"],
    supportNeeded: ["fund", "mentor", "prototype", "deploy"],
    sdgs: [4, 6],
    timelineDays: 100,
    universityId: "u-bit",
    teamId: "t-saksham",
    projectId: "CDP-104",
    expectedOutcomes: [
      { label: "Classroom days lost to rain", target: "22 → 0 per year", method: "School attendance and closure register" },
      { label: "Tank back in service", target: "8,000 L, year round", method: "Headmaster's monthly return to the block education office" },
    ],
    contributions: [
      { id: "c-1008-self", party: "Nirvaha Technologies", kind: "industry", amount: 340000, status: "committed", at: d(42), isSelf: true },
    ],
  },

  "P-1024": {
    summary:
      "The Nagri bazaar public toilet has been unusable since the water connection and cleaning contract both lapsed. The fix is largely contractual rather than technical, and the government has funded it — this is listed so partners can see the whole pipeline, not because it needs money.",
    technologies: ["Water Systems"],
    capabilitiesNeeded: [],
    supportNeeded: [],
    sdgs: [6, 11],
    timelineDays: 45,
    expectedOutcomes: [
      { label: "Facility in service", target: "Daily, with a named cleaner", method: "Citizen verification — 22 original reporters asked to confirm" },
    ],
  },

  "P-1003": {
    summary:
      "The Nagri PHC lost mains power during three deliveries in a month and its backup did not carry the load. NIT Jamshedpur instrumented the supply, found the fault was battery health rather than generator capacity, and the fix is now handed over and verified.",
    technologies: ["Solar & Power Electronics", "IoT & Telemetry", "Embedded Systems"],
    capabilitiesNeeded: ["hardware", "testing", "field-deployment"],
    supportNeeded: ["fund", "technology", "test"],
    sdgs: [3, 7, 9],
    timelineDays: 90,
    universityId: "u-nit",
    teamId: "t-ujjwal",
    projectId: "CDP-105",
    expectedOutcomes: [
      { label: "Unbacked outages during deliveries", target: "3 per month → 0", method: "PHC incident register plus continuous supply telemetry" },
      { label: "Battery replacement warned in advance", target: "30 days' notice", method: "State-of-health model against actual replacement dates" },
    ],
    contributions: [
      { id: "c-1003-self", party: "Nirvaha Technologies", kind: "industry", amount: 450000, status: "disbursed", at: d(272), isSelf: true },
      { id: "c-1003-b", party: "Usha Martin Foundation", kind: "industry", amount: 200000, status: "disbursed", at: d(260) },
    ],
  },

  "P-1046": {
    status: "in_delivery",
    summary:
      "The drain beside the Hesag weekly market backs into eleven houses whenever heavy rain coincides with market day. A CUJ team has built an early-warning model on the drain level, and the honest finding so far is that it raises too many false alarms — which is the part industry help would fix.",
    technologies: ["IoT & Telemetry", "AI/ML", "Cloud & Data Platforms"],
    capabilitiesNeeded: ["hardware", "software", "field-deployment"],
    supportNeeded: ["fund", "mentor", "technology"],
    sdgs: [6, 11, 13],
    timelineDays: 110,
    universityId: "u-cuj",
    teamId: "t-tarang",
    projectId: "CDP-103",
    expectedOutcomes: [
      { label: "False alarm rate", target: "87% → under 20%", method: "Alerts raised against overflows confirmed by the ward" },
      { label: "Households given usable warning", target: "11, at least 2 hours ahead", method: "Alert timestamps against the ward's flooding log" },
    ],
    contributions: [
      { id: "c-1046-self", party: "Nirvaha Technologies", kind: "industry", amount: 520000, status: "disbursed", at: d(78), isSelf: true },
    ],
  },

  "P-1055": {
    summary:
      "Ward 4 in Kanke Chowk has had no waste collection for nine days. It is a routing and accountability failure rather than an engineering one, and the block has it in validation — listed here for pipeline visibility.",
    technologies: ["GIS", "Cloud & Data Platforms"],
    capabilitiesNeeded: ["software"],
    supportNeeded: ["technology"],
    sdgs: [11, 12],
    timelineDays: 60,
    expectedOutcomes: [
      { label: "Collection days missed", target: "9 → 0 per month", method: "Route completion log against the ward schedule" },
    ],
  },

  "P-1060": {
    summary:
      "Handpump water at Tigra tola has turned discoloured, in a hamlet whose deprivation index is the highest in the panchayat and which has no alternative source. CUJ built a field-portable screening kit for exactly this; it works on the bench and drifts in the heat.",
    technologies: ["Sensors & Instrumentation", "Water Systems", "Embedded Systems", "Cloud & Data Platforms"],
    capabilitiesNeeded: ["hardware", "testing", "certification"],
    supportNeeded: ["fund", "mentor", "test", "technology"],
    sdgs: [3, 6, 9],
    timelineDays: 120,
    universityId: "u-cuj",
    teamId: "t-nirmal",
    expectedOutcomes: [
      { label: "Screening turnaround", target: "11 days → same day", method: "Time from sample to result, against the district lab baseline" },
      { label: "Households on a tested source", target: "620 of 620", method: "Panchayat water register cross-checked with test records" },
    ],
  },

  "P-1035": {
    summary:
      "A collapsed culvert on the Ormanjhi link road has cut the direct route to the block hospital for 2,450 people. The department has the design; what it does not have is a partner, and the industry response window closes tomorrow before it falls back to the government funding queue.",
    technologies: ["Materials", "GIS"],
    capabilitiesNeeded: ["field-deployment", "logistics"],
    supportNeeded: ["fund", "deploy", "partner"],
    sdgs: [9, 11],
    timelineDays: 120,
    expectedOutcomes: [
      { label: "Route restored", target: "Direct access to the block hospital", method: "Rural Works completion certificate" },
      { label: "Ambulance response time", target: "48 min → 22 min", method: "Block health transport log, 90 days after" },
    ],
    contributions: [
      { id: "c-1035-a", party: "Central Coalfields CSR Cell", kind: "industry", amount: 300000, status: "proposed", at: d(2) },
    ],
  },

  "P-1049": {
    summary:
      "The Booty Basti anganwadi centre has no toilet, which is the reason attendance falls off for older girls. It is a small, well-understood build, and small is the point: it is the kind of thing a partner can close in a quarter.",
    technologies: ["Water Systems"],
    capabilitiesNeeded: ["field-deployment"],
    supportNeeded: ["fund", "deploy"],
    sdgs: [4, 6, 10],
    timelineDays: 60,
    expectedOutcomes: [
      { label: "Facility built and connected", target: "1 unit, with running water", method: "Block education office inspection" },
      { label: "Attendance of girls over 8", target: "+18 percentage points", method: "Anganwadi attendance register, two terms after" },
    ],
  },
};

/* ==================================================== native challenges === */

type NativeSeed = Partial<Challenge> &
  Pick<
    Challenge,
    | "id"
    | "title"
    | "summary"
    | "domain"
    | "state"
    | "district"
    | "block"
    | "villages"
    | "affected"
    | "estimatedCost"
  >;

/** Defaults keep the fixture readable; each challenge overrides what matters. */
function challenge(seed: NativeSeed): Challenge {
  const base: Challenge = {
    id: seed.id,
    title: seed.title,
    summary: seed.summary,
    domain: seed.domain,
    status: "awaiting_partner",
    severity: "medium",
    priority: 70,
    state: seed.state,
    district: seed.district,
    block: seed.block,
    villages: seed.villages,
    affected: seed.affected,
    reportCount: 20,
    durationDays: 30,
    clusterLabel: seed.title,
    aiConfidence: 88,
    deprivationIndex: 60,
    governmentValidated: true,
    department: "District Administration",
    estimatedCost: seed.estimatedCost,
    fundingRequired: seed.estimatedCost,
    contributions: [],
    supportNeeded: ["fund", "mentor"],
    technologies: [],
    capabilitiesNeeded: [],
    timelineDays: 120,
    sdgs: [9, 17],
    expectedOutcomes: [],
    evidence: [],
    publishedAt: d(10),
  };
  return { ...base, ...seed };
}

export const NATIVE_CHALLENGES: Challenge[] = [
  challenge({
    id: "C-2101",
    title: "No cold storage in the Ormanjhi vegetable belt",
    summary:
      "Six villages grow tomato and leafy vegetables for the Ranchi market and lose roughly a fifth of every harvest between picking and sale. There is no cold storage within 40 km, and grid supply is too unreliable for a conventional cold room. BAU has a solar-backed design that holds temperature; what it does not have is a unit cost the farmer groups can afford.",
    domain: "agriculture",
    severity: "high",
    priority: 81,
    state: "Jharkhand",
    district: "Ranchi District",
    block: "Ormanjhi Block",
    villages: ["Ormanjhi", "Sikidiri", "Getalsud", "Hutup", "Chutupalu", "Rukka"],
    affected: 1860,
    reportCount: 34,
    durationDays: 240,
    clusterLabel: "Post-Harvest Loss — Ormanjhi vegetable belt",
    aiConfidence: 89,
    deprivationIndex: 62,
    department: "Agriculture & Farmers' Welfare",
    estimatedCost: 640000,
    fundingRequired: 0,
    status: "in_delivery",
    supportNeeded: ["fund", "mentor", "prototype", "partner"],
    technologies: ["Solar & Power Electronics", "Refrigeration", "IoT & Telemetry"],
    capabilitiesNeeded: ["manufacturing", "testing", "logistics"],
    timelineDays: 180,
    sdgs: [2, 7, 12],
    universityId: "u-bau",
    teamId: "t-anna",
    projectId: "CDP-106",
    contributions: [
      { id: "c-2101-self", party: "Nirvaha Technologies", kind: "industry", amount: 640000, status: "committed", at: d(118), isSelf: true },
    ],
    publishedAt: d(120),
    expectedOutcomes: [
      { label: "Post-harvest loss", target: "21% → under 8%", method: "Weighbridge records at the Ormanjhi collection point, one season before and after" },
      { label: "Unit cost", target: "₹2.4 L → ₹1.6 L", method: "Bill of materials at a 25-unit production run" },
      { label: "Farmer realisation", target: "+₹9 per kg", method: "Mandi price received, against the pre-project baseline" },
    ],
    evidence: [
      { label: "Loss rate", value: "21%", source: "BAU post-harvest survey of 240 growers, 2025 kharif season" },
      { label: "Nearest cold storage", value: "41 km", source: "Directorate of Horticulture facility register" },
    ],
  }),

  challenge({
    id: "C-2104",
    title: "Solar micro-grids failing unnoticed across Khunti",
    summary:
      "Fourteen village micro-grids installed under a state programme are running at partial output and nobody knows which ones until a village complains. There is no telemetry on any of them. Diagnosing a failed charge controller currently means a technician driving to the village to find out.",
    domain: "energy",
    severity: "high",
    priority: 78,
    state: "Jharkhand",
    district: "Khunti District",
    block: "Murhu Block",
    villages: ["Murhu", "Torpa", "Karra", "Rania"],
    affected: 3240,
    reportCount: 47,
    durationDays: 180,
    clusterLabel: "Micro-grid Underperformance — Khunti",
    aiConfidence: 91,
    deprivationIndex: 74,
    department: "Jharkhand Renewable Energy Development Agency",
    estimatedCost: 880000,
    fundingRequired: 880000,
    supportNeeded: ["fund", "technology", "mentor", "deploy"],
    technologies: ["Solar & Power Electronics", "IoT & Telemetry", "Cloud & Data Platforms", "Embedded Systems"],
    capabilitiesNeeded: ["hardware", "software", "field-deployment", "training"],
    timelineDays: 150,
    sdgs: [7, 9, 11],
    publishedAt: d(6),
    expectedOutcomes: [
      { label: "Time to detect a failed grid", target: "23 days → under 1 day", method: "Telemetry alarm against the JREDA complaint register" },
      { label: "Average grid output", target: "61% → 90% of rated", method: "Monthly generation logs across all 14 sites" },
    ],
    evidence: [
      { label: "Sites underperforming", value: "9 of 14", source: "JREDA spot audit, August 2026" },
      { label: "Mean detection delay", value: "23 days", source: "Interval between output drop and the first village complaint, 2025–26" },
    ],
  }),

  challenge({
    id: "C-2108",
    title: "Rural health sub-centres running blind on diagnostics",
    summary:
      "Eleven sub-centres in Gumla refer every blood test to a district lab 60 km away, and about a third of patients never make the trip. A point-of-care kiosk with a tele-consult link would close most of those referrals, but it has to work on intermittent power and 2G.",
    domain: "health",
    severity: "critical",
    priority: 86,
    state: "Jharkhand",
    district: "Gumla District",
    block: "Bharno Block",
    villages: ["Bharno", "Sisai", "Kamdara", "Basia", "Palkot"],
    affected: 8400,
    reportCount: 62,
    durationDays: 300,
    clusterLabel: "Diagnostic Access — Gumla sub-centres",
    aiConfidence: 93,
    deprivationIndex: 79,
    department: "National Health Mission, Jharkhand",
    estimatedCost: 1200000,
    fundingRequired: 900000,
    contributions: [
      { id: "c-2108-a", party: "National Health Mission", kind: "government", amount: 300000, status: "committed", at: d(18) },
    ],
    supportNeeded: ["fund", "technology", "mentor", "deploy", "partner"],
    technologies: ["Cloud & Data Platforms", "Embedded Systems", "AI/ML", "Sensors & Instrumentation"],
    capabilitiesNeeded: ["hardware", "software", "field-deployment", "training", "certification"],
    timelineDays: 210,
    sdgs: [3, 9, 10],
    publishedAt: d(9),
    expectedOutcomes: [
      { label: "Referrals completed", target: "64% → 90%", method: "NHM referral tracking against sub-centre records" },
      { label: "Time to result", target: "6 days → same visit", method: "Kiosk log against the district lab turnaround baseline" },
    ],
    evidence: [
      { label: "Referrals abandoned", value: "36%", source: "NHM Gumla referral audit, 2025–26" },
      { label: "Distance to district lab", value: "58–72 km", source: "Block health facility register" },
    ],
  }),

  challenge({
    id: "C-2112",
    title: "Public buildings in Ranchi are unmapped for accessibility",
    summary:
      "The municipal corporation cannot say which of its 214 public buildings a wheelchair user can enter, because nobody has ever surveyed them against the Harmonised Guidelines. Without that baseline the accessibility budget is spent on whichever building complains loudest.",
    domain: "accessibility",
    severity: "medium",
    priority: 72,
    state: "Jharkhand",
    district: "Ranchi District",
    block: "Ranchi Municipal Corporation",
    villages: ["Ward 12", "Ward 18", "Ward 24", "Ward 31", "Ward 39"],
    affected: 960,
    reportCount: 28,
    durationDays: 400,
    clusterLabel: "Accessibility Gap — Ranchi public buildings",
    aiConfidence: 84,
    deprivationIndex: 48,
    department: "Ranchi Municipal Corporation",
    estimatedCost: 280000,
    fundingRequired: 0,
    status: "in_delivery",
    supportNeeded: ["fund", "mentor", "technology"],
    technologies: ["GIS", "Cloud & Data Platforms", "Mobile Data Collection"],
    capabilitiesNeeded: ["software", "training"],
    timelineDays: 150,
    sdgs: [10, 11],
    universityId: "u-xiss",
    teamId: "t-samarth",
    projectId: "CDP-107",
    contributions: [
      { id: "c-2112-self", party: "Nirvaha Technologies", kind: "industry", amount: 280000, status: "committed", at: d(68), isSelf: true },
    ],
    publishedAt: d(75),
    expectedOutcomes: [
      { label: "Buildings surveyed", target: "214 of 214", method: "Audit instrument submissions verified by the corporation's engineer" },
      { label: "Budget allocated on evidence", target: "100% of the FY28 accessibility head", method: "Municipal budget note citing the audit ranking" },
    ],
    evidence: [
      { label: "Buildings with any accessibility record", value: "0 of 214", source: "Ranchi Municipal Corporation estate register, 2026" },
      { label: "Registered disabled residents in the wards", value: "960", source: "RPwD district registration data" },
    ],
  }),

  challenge({
    id: "C-2117",
    title: "Market waste in Ranchi wards has no segregation at source",
    summary:
      "Four ward markets generate about 2.8 tonnes of mixed waste daily that goes straight to landfill, including roughly 900 kg of compostable vegetable waste. The corporation wants segregation at the market itself rather than a sorting line downstream.",
    domain: "environment",
    severity: "medium",
    priority: 68,
    state: "Jharkhand",
    district: "Ranchi District",
    block: "Ranchi Municipal Corporation",
    villages: ["Kanke Market", "Doranda Market", "Lalpur Market", "Bariatu Market"],
    affected: 4600,
    reportCount: 41,
    durationDays: 200,
    clusterLabel: "Waste Segregation — Ranchi ward markets",
    aiConfidence: 86,
    deprivationIndex: 44,
    department: "Ranchi Municipal Corporation",
    estimatedCost: 460000,
    fundingRequired: 460000,
    supportNeeded: ["fund", "prototype", "deploy", "partner"],
    technologies: ["Composting", "Cloud & Data Platforms", "GIS"],
    capabilitiesNeeded: ["manufacturing", "logistics", "training"],
    timelineDays: 180,
    sdgs: [11, 12, 13],
    publishedAt: d(14),
    expectedOutcomes: [
      { label: "Waste diverted from landfill", target: "900 kg/day", method: "Weighbridge records at the transfer station" },
      { label: "Compost produced", target: "6 tonnes/month", method: "Corporation horticulture wing offtake receipts" },
    ],
    evidence: [
      { label: "Daily market waste", value: "2.8 t", source: "Ranchi Municipal Corporation collection weighbridge, monthly average" },
      { label: "Compostable fraction", value: "32%", source: "Characterisation study, Ranchi Municipal Corporation 2025" },
    ],
  }),

  challenge({
    id: "C-2121",
    title: "Government school science labs unusable in Simdega",
    summary:
      "Nineteen upper-primary schools have a science lab room and no working equipment, so practical work is taught from the blackboard. The block wants low-cost kits that a teacher can maintain, not imported apparatus that breaks and never gets repaired.",
    domain: "education",
    severity: "high",
    priority: 76,
    state: "Jharkhand",
    district: "Simdega District",
    block: "Kolebira Block",
    villages: ["Kolebira", "Bano", "Jaldega", "Thethaitangar"],
    affected: 2740,
    reportCount: 33,
    durationDays: 500,
    clusterLabel: "School Infrastructure — Simdega science labs",
    aiConfidence: 90,
    deprivationIndex: 77,
    department: "Department of School Education & Literacy",
    estimatedCost: 720000,
    fundingRequired: 720000,
    supportNeeded: ["fund", "prototype", "mentor", "deploy"],
    technologies: ["Materials", "Embedded Systems"],
    capabilitiesNeeded: ["manufacturing", "logistics", "training"],
    timelineDays: 180,
    sdgs: [4, 9, 10],
    publishedAt: d(21),
    expectedOutcomes: [
      { label: "Schools with a working lab", target: "19 of 19", method: "Block education officer inspection with a photographic record" },
      { label: "Practicals actually conducted", target: "0 → 24 per year per school", method: "Teacher practical register, sampled termly" },
    ],
    evidence: [
      { label: "Schools with a lab room but no equipment", value: "19 of 22", source: "UDISE+ 2025–26 returns for Kolebira block" },
    ],
  }),

  challenge({
    id: "C-2126",
    title: "Fluoride above permissible limits across Palamu handpumps",
    summary:
      "District testing found fluoride over 1.5 mg/L in 34 of 96 handpumps sampled, in a belt with documented skeletal fluorosis. Testing is annual because it means carrying samples to Daltonganj — so a pump that turns bad in March is not found until the following year.",
    domain: "water",
    severity: "critical",
    priority: 88,
    state: "Jharkhand",
    district: "Palamu District",
    block: "Chainpur Block",
    villages: ["Chainpur", "Panki", "Tarhasi", "Manatu", "Nawa Bazar"],
    affected: 6100,
    reportCount: 58,
    durationDays: 365,
    clusterLabel: "Water Quality — Palamu fluoride belt",
    aiConfidence: 94,
    deprivationIndex: 81,
    department: "Drinking Water & Sanitation Department",
    estimatedCost: 1450000,
    /* Phase one is funded and running; the block extension is not. This is the
       partial-funding case the ledger exists for. */
    fundingRequired: 670000,
    status: "partially_funded",
    universityId: "u-cuj",
    teamId: "t-nirmal",
    projectId: "CDP-101",
    contributions: [
      { id: "c-2126-a", party: "Jal Jeevan Mission (State share)", kind: "government", amount: 300000, status: "committed", at: d(120) },
      { id: "c-2126-self", party: "Nirvaha Technologies", kind: "industry", amount: 480000, status: "disbursed", at: d(96), isSelf: true },
      { id: "c-2126-c", party: "Tata Steel Foundation", kind: "industry", amount: 200000, status: "proposed", at: d(5) },
    ],
    supportNeeded: ["fund", "technology", "test", "mentor", "deploy"],
    technologies: ["Water Systems", "Sensors & Instrumentation", "Cloud & Data Platforms", "AI/ML"],
    capabilitiesNeeded: ["hardware", "testing", "certification", "field-deployment"],
    timelineDays: 240,
    sdgs: [3, 6, 9],
    publishedAt: d(4),
    expectedOutcomes: [
      { label: "Testing frequency", target: "annual → monthly", method: "Test records lodged against each pump in the district register" },
      { label: "Households moved off an unsafe source", target: "1,240", method: "Panchayat water register reconciled with test results" },
      { label: "New fluorosis presentations", target: "no increase over 3 years", method: "PHC case register, tracked by the district health office" },
    ],
    evidence: [
      { label: "Pumps over 1.5 mg/L", value: "34 of 96", source: "Palamu district water testing laboratory, 2025–26 annual round" },
      { label: "Existing fluorosis cases", value: "212", source: "District health office fluorosis register" },
    ],
  }),

  challenge({
    id: "C-2130",
    title: "Milk cooperatives in Keonjhar losing the evening collection",
    summary:
      "Eleven tribal dairy cooperatives have no chilling within reach, so the evening collection either sells at a distress price or spoils. A bulk cooler at each collection point needs to survive eight-hour power cuts, which is a design constraint rather than a procurement one.",
    domain: "agriculture",
    severity: "high",
    priority: 79,
    state: "Odisha",
    district: "Keonjhar District",
    block: "Ghatgaon Block",
    villages: ["Ghatgaon", "Harichandanpur", "Telkoi", "Banspal"],
    affected: 2280,
    reportCount: 29,
    durationDays: 270,
    clusterLabel: "Cold Chain — Keonjhar dairy cooperatives",
    aiConfidence: 87,
    deprivationIndex: 76,
    department: "Odisha Livestock Resources Development Society",
    estimatedCost: 980000,
    fundingRequired: 980000,
    supportNeeded: ["fund", "prototype", "mentor", "partner", "deploy"],
    technologies: ["Refrigeration", "Solar & Power Electronics", "IoT & Telemetry"],
    capabilitiesNeeded: ["manufacturing", "testing", "logistics", "field-deployment"],
    timelineDays: 200,
    sdgs: [2, 7, 12],
    publishedAt: d(2),
    expectedOutcomes: [
      { label: "Evening collection retained", target: "0% → 85%", method: "Cooperative procurement records, evening shift" },
      { label: "Producer price for the evening lot", target: "+₹6 per litre", method: "Society payment registers, six months after" },
    ],
    evidence: [
      { label: "Evening collection lost or distress-sold", value: "100%", source: "OLRDS cooperative procurement audit, Ghatgaon cluster 2026" },
      { label: "Typical power availability", value: "14 h/day", source: "TPWODL feeder logs for the Ghatgaon feeder" },
    ],
  }),

  challenge({
    id: "C-2134",
    title: "Water table around Sundargarh mining belt is unmonitored",
    summary:
      "Villages ringing three active mine leases report wells failing earlier each summer, and there is no independent monitoring to say whether that is drawdown or drought. Without data the dispute stays a dispute.",
    domain: "environment",
    severity: "high",
    priority: 80,
    state: "Odisha",
    district: "Sundargarh District",
    block: "Koira Block",
    villages: ["Koira", "Barsuan", "Tensa", "Bonaigarh"],
    affected: 5400,
    reportCount: 71,
    durationDays: 420,
    clusterLabel: "Groundwater Depletion — Sundargarh mining belt",
    aiConfidence: 88,
    deprivationIndex: 72,
    department: "Central Ground Water Board — Odisha Region",
    estimatedCost: 760000,
    fundingRequired: 760000,
    supportNeeded: ["fund", "technology", "test", "partner"],
    technologies: ["Sensors & Instrumentation", "IoT & Telemetry", "GIS", "Cloud & Data Platforms"],
    capabilitiesNeeded: ["hardware", "software", "field-deployment", "certification"],
    timelineDays: 300,
    sdgs: [6, 12, 13],
    publishedAt: d(11),
    expectedOutcomes: [
      { label: "Monitored wells", target: "0 → 24, logging daily", method: "Piezometer network reporting into the CGWB portal" },
      { label: "Findings published", target: "quarterly, publicly", method: "CGWB regional bulletin with the village-level series attached" },
    ],
    evidence: [
      { label: "Wells reported failing earlier each year", value: "38", source: "Panchayat resolutions filed 2023–2026, four gram sabhas" },
      { label: "Independent monitoring points", value: "0", source: "CGWB Odisha observation-well network map" },
    ],
  }),

  challenge({
    id: "C-2139",
    title: "Anganwadi nutrition data arrives too late to act on",
    summary:
      "Growth monitoring in 46 anganwadi centres is recorded on paper and reaches the block office six to eight weeks later, by which time a child sliding into moderate acute malnutrition has slid further. The registers are good; the latency is the problem.",
    domain: "health",
    severity: "high",
    priority: 77,
    state: "Maharashtra",
    district: "Nashik District",
    block: "Peth Taluka",
    villages: ["Peth", "Karanjali", "Kohor", "Jogmodi"],
    affected: 3120,
    reportCount: 24,
    durationDays: 340,
    clusterLabel: "Nutrition Surveillance — Peth anganwadi centres",
    aiConfidence: 85,
    deprivationIndex: 69,
    department: "Integrated Child Development Services, Nashik",
    estimatedCost: 540000,
    fundingRequired: 540000,
    supportNeeded: ["fund", "technology", "mentor", "deploy"],
    technologies: ["Mobile Data Collection", "Cloud & Data Platforms", "AI/ML"],
    capabilitiesNeeded: ["software", "training", "field-deployment"],
    timelineDays: 160,
    sdgs: [2, 3, 10],
    publishedAt: d(16),
    expectedOutcomes: [
      { label: "Data latency", target: "7 weeks → under 48 hours", method: "Timestamp between measurement and block dashboard availability" },
      { label: "Children referred within a fortnight of crossing the threshold", target: "31% → 85%", method: "ICDS referral records matched to growth measurements" },
    ],
    evidence: [
      { label: "Median reporting delay", value: "7 weeks", source: "ICDS Nashik register-to-dashboard audit, 2025–26" },
      { label: "Centres covered", value: "46", source: "ICDS Peth project office" },
    ],
  }),

  challenge({
    id: "C-2143",
    title: "Canal seepage losing water before it reaches the tail",
    summary:
      "Tail-end farmers on a Baramati distributary receive water for four days of a fourteen-day rotation, and the irrigation division cannot say where the loss occurs along the 12 km reach. Locating the seepage is the whole problem; lining the canal is the easy part.",
    domain: "water",
    severity: "high",
    priority: 82,
    state: "Maharashtra",
    district: "Pune District",
    block: "Baramati Taluka",
    villages: ["Malegaon", "Katphal", "Sonwadi", "Undavadi"],
    affected: 2800,
    reportCount: 47,
    durationDays: 380,
    clusterLabel: "Irrigation Loss — Baramati distributary",
    aiConfidence: 92,
    deprivationIndex: 51,
    department: "Water Resources Department, Pune Irrigation Circle",
    estimatedCost: 1350000,
    fundingRequired: 1350000,
    supportNeeded: ["fund", "technology", "mentor", "test", "deploy"],
    technologies: ["Sensors & Instrumentation", "IoT & Telemetry", "GIS", "AI/ML", "Water Systems"],
    capabilitiesNeeded: ["hardware", "software", "field-deployment", "testing"],
    timelineDays: 210,
    sdgs: [2, 6, 9],
    publishedAt: d(8),
    expectedOutcomes: [
      { label: "Seepage points located", target: "to within 50 m", method: "Acoustic and flow-differential survey verified by trial excavation" },
      { label: "Tail-end water days", target: "4 → 9 per rotation", method: "Irrigation division rotation register, one season after remediation" },
    ],
    evidence: [
      { label: "Conveyance loss", value: "31%", source: "Pune Irrigation Circle discharge measurement, head against tail, 2026 rabi" },
      { label: "Command area affected", value: "450 ha", source: "Water Resources Department command area statement" },
    ],
  }),

  challenge({
    id: "C-2147",
    title: "Blind students in Pune have no accessible lab material",
    summary:
      "Four schools for the visually impaired teach science with no tactile diagrams, because commercial ones cost more than the annual materials budget. The requirement is a printable, teacher-producible alternative rather than a purchase.",
    domain: "accessibility",
    severity: "medium",
    priority: 66,
    state: "Maharashtra",
    district: "Pune District",
    block: "Pune City",
    villages: ["Kothrud", "Hadapsar", "Yerawada", "Kondhwa"],
    affected: 640,
    reportCount: 17,
    durationDays: 300,
    clusterLabel: "Assistive Education — Pune visually impaired schools",
    aiConfidence: 82,
    deprivationIndex: 41,
    department: "Directorate of Education, Pune Division",
    estimatedCost: 320000,
    fundingRequired: 320000,
    supportNeeded: ["fund", "prototype", "mentor"],
    technologies: ["3D Printing", "Materials", "Assistive Technology"],
    capabilitiesNeeded: ["manufacturing", "training"],
    timelineDays: 140,
    sdgs: [4, 10],
    publishedAt: d(26),
    expectedOutcomes: [
      { label: "Tactile diagram sets produced", target: "1 per science topic, 4 schools", method: "School inventory countersigned by the head teacher" },
      { label: "Cost per set", target: "₹4,200 → under ₹600", method: "Materials and print time at the school's own printer" },
    ],
    evidence: [
      { label: "Schools with any tactile science material", value: "0 of 4", source: "Directorate of Education inventory return, 2026" },
    ],
  }),

  challenge({
    id: "C-2151",
    title: "Riverbank erosion threatening Bastar hamlets",
    summary:
      "Three hamlets on the Indravati have lost eleven metres of bank in two monsoons and there is no early-warning of a slump. The district wants a monitoring approach it can extend along the reach itself.",
    domain: "environment",
    severity: "critical",
    priority: 84,
    state: "Chhattisgarh",
    district: "Bastar District",
    block: "Lohandiguda Block",
    villages: ["Lohandiguda", "Chitrakote", "Kilepal"],
    affected: 1740,
    reportCount: 39,
    durationDays: 300,
    clusterLabel: "Riverbank Erosion — Indravati reach",
    aiConfidence: 86,
    deprivationIndex: 83,
    department: "Water Resources Department, Chhattisgarh",
    estimatedCost: 1120000,
    fundingRequired: 1120000,
    supportNeeded: ["fund", "technology", "partner"],
    technologies: ["Sensors & Instrumentation", "GIS", "Remote Sensing"],
    capabilitiesNeeded: ["hardware", "field-deployment"],
    timelineDays: 240,
    sdgs: [11, 13],
    publishedAt: d(5),
    expectedOutcomes: [
      { label: "Bank movement monitored", target: "continuous, 3 hamlets", method: "Inclinometer and GNSS series reported to the district" },
      { label: "Households warned before a slump", target: "all 340", method: "Warning timestamps against recorded slump events" },
    ],
    evidence: [
      { label: "Bank lost", value: "11 m in 2 monsoons", source: "Chhattisgarh WRD cross-section survey, 2024 and 2026" },
    ],
  }),
];
