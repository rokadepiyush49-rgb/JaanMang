import type { IconName } from "@/components/icon";
import { COUNCIL_AGENTS } from "@/lib/council/roster";
import type { Locale } from "@/lib/i18n/locale";

/* Static content transcribed from the Stitch reference screens. All values are
   presentation fixtures — swap for API calls when the backend lands. */

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/problem-explorer", label: "Problem Explorer", icon: "search" },
  { href: "/impact-hub", label: "Impact Hub", icon: "rocket" },
  { href: "/industry-hub", label: "Industry Hub", icon: "factory" },
  { href: "/council", label: "AI Project Council", icon: "users" },
  { href: "/profile", label: "Profile", icon: "user" },
] satisfies { href: string; label: string; icon: IconName }[];

export const QUICK_ACTIONS = [
  { label: "Report Issue", icon: "warning", tone: "danger" },
  { label: "Projects", icon: "clipboard", tone: "navy" },
  { label: "Volunteer", icon: "heart", tone: "impact" },
  { label: "Forums", icon: "message", tone: "community" },
  { label: "Resources", icon: "book", tone: "navy" },
  { label: "Events", icon: "trophy", tone: "navy" },
  { label: "Teams", icon: "users", tone: "navy" },
  { label: "Awards", icon: "award", tone: "impact" },
] satisfies { label: string; icon: IconName; tone: string }[];

export const STAGES = ["Plan", "Res", "Dev", "Test", "Pilot", "Imp"];

export const ACTIVE_PROJECTS = [
  {
    id: "p1",
    title: "Community Water Harvesting Initiative",
    status: "In Progress",
    statusTone: "impact" as const,
    note: "Due in 3 days",
    stage: 4,
    percent: 75,
  },
  {
    id: "p2",
    title: "Digital Literacy Campaign",
    status: "Planning phase",
    statusTone: "navy" as const,
    note: "Kickoff next week",
    stage: 1,
    percent: 15,
  },
];

export const LEADERBOARD = [
  { rank: 1, name: "Ranchi University", short: "RU", points: "12.4k pts" },
  { rank: 2, name: "Vinoba Bhave Uni.", short: "VB", points: "11.8k pts" },
  { rank: 3, name: "Kolhan University", short: "KU", points: "9.2k pts" },
];

export const RECOMMENDED = [
  {
    title: "Smart City Hackathon",
    meta: "+1200 Impact Pts",
    badge: "₹1,00,000",
    badgeTone: "community" as const,
    icon: "code" as IconName,
  },
  {
    title: "UI/UX Design Intern",
    meta: "Industry Partner",
    badge: "₹20,000",
    badgeTone: "impact" as const,
    icon: "briefcase" as IconName,
  },
  {
    title: "AI Supply Chain",
    meta: "High Impact",
    badge: "Sponsored",
    badgeTone: "navy" as const,
    icon: "bot" as IconName,
  },
];

export type Challenge = {
  id: string;
  title: string;
  summary: string;
  category: string;
  match?: number;
  location: string;
  teams: string;
  prize?: string;
  hackathon?: boolean;
  urgency: "Critical" | "High" | "Moderate";
  region: string;
};

export const CHALLENGES: Challenge[] = [
  {
    id: "JH-24-115",
    title: "Smart Irrigation System for Deoghar",
    summary:
      "Develop an automated irrigation network using soil moisture sensors and a React-based dashboard for real-time water management in drought-prone areas.",
    category: "IoT",
    match: 95,
    location: "Deoghar",
    teams: "6 Teams Active",
    urgency: "High",
    region: "Santhal Pargana",
  },
  {
    id: "JH-24-121",
    title: "Air Quality Monitoring Network",
    summary:
      "Analyze particulate matter data from industrial zones in Jamshedpur to predict pollution spikes and suggest mitigation strategies using predictive modeling.",
    category: "Data Analytics",
    match: 92,
    location: "Jamshedpur",
    teams: "3 Teams Active",
    urgency: "Critical",
    region: "Kolhan",
  },
  {
    id: "JH-24-201",
    title: "Jharkhand Smart City Hackathon",
    summary:
      "Build innovative solutions for urban waste management and traffic optimization using open data from Ranchi Smart City Corporation.",
    category: "AI/ML",
    location: "Ranchi (Hybrid)",
    teams: "12 Teams Registered",
    prize: "₹1,00,000 Prize Pool",
    hackathon: true,
    urgency: "High",
    region: "South Chotanagpur",
  },
  {
    id: "JH-24-134",
    title: "Tribal Craft Marketplace",
    summary:
      "Design a low-bandwidth commerce layer that connects Sohrai and Paitkar artisans directly to national buyers, with offline-first order capture.",
    category: "Livelihoods",
    match: 81,
    location: "Khunti",
    teams: "4 Teams Active",
    urgency: "Moderate",
    region: "South Chotanagpur",
  },
  {
    id: "JH-24-147",
    title: "Anaemia Screening Route Planner",
    summary:
      "Optimise ASHA worker visit routes across 60 villages using population health data so screening camps reach the highest-risk households first.",
    category: "Public Health",
    match: 76,
    location: "Dumka",
    teams: "2 Teams Active",
    urgency: "Critical",
    region: "Santhal Pargana",
  },
  {
    id: "JH-24-158",
    title: "Mine Reclamation Land-Use Atlas",
    summary:
      "Map abandoned coal pits across Dhanbad with satellite imagery and propose viable afforestation or solar reuse for each reclaimed parcel.",
    category: "Sustainability",
    location: "Dhanbad",
    teams: "5 Teams Active",
    urgency: "High",
    region: "North Chotanagpur",
  },
];

export const FILTERS = {
  categories: [
    "All Categories",
    "IoT",
    "Data Analytics",
    "AI/ML",
    "Public Health",
    "Sustainability",
    "Livelihoods",
  ],
  urgency: ["Any Urgency", "Critical", "High", "Moderate"],
  regions: [
    "All Regions",
    "South Chotanagpur",
    "North Chotanagpur",
    "Kolhan",
    "Santhal Pargana",
  ],
};

/**
 * Re-exported from the council roster so the setup screen and the engine can
 * never disagree about who is on the panel. `roster.ts` is the source of
 * truth; this alias only exists so existing imports keep working.
 */
export const AGENTS = COUNCIL_AGENTS;

/**
 * Project phases, stored as stable English keys.
 *
 * The value submitted with the brief must not change with the reader's
 * language — it travels into the prompt, and a council asked to weigh a
 * project at stage "प्रोटोटाइप" in one session and "Prototype" in the next
 * would be answering two different questions. Only the label is translated.
 */
export const PHASE_KEYS = [
  "Select Phase",
  "Ideation",
  "Prototype",
  "Pilot",
  "Scale-up",
  "Handover",
] as const;

export type PhaseKey = (typeof PHASE_KEYS)[number];

const PHASE_LABEL_HI: Record<PhaseKey, string> = {
  "Select Phase": "चरण चुनिए",
  Ideation: "विचार",
  Prototype: "प्रोटोटाइप",
  Pilot: "पायलट",
  "Scale-up": "विस्तार",
  Handover: "हस्तांतरण",
};

export function phaseLabel(phase: PhaseKey, locale: Locale): string {
  return locale === "hi" ? PHASE_LABEL_HI[phase] : phase;
}

/** @deprecated Use `PHASE_KEYS` with `phaseLabel`. Kept for untouched callers. */
export const PHASES = PHASE_KEYS;

export const TRANSCRIPT = [
  {
    id: "m1",
    author: "Dr. Sarah Chen",
    role: "Technical",
    time: "10:42 AM",
    tone: "navy" as const,
    body: "I've reviewed the structural proposal. The distributed sensor network approach is technically sound and highly scalable. However, the proposed edge-computing nodes require a continuous power draw that exceeds the current solar array specifications by roughly 15%. We need to optimize the polling frequency or upgrade the panels.",
    tags: [
      { label: "Architecture Approved", tone: "neutral" as const, icon: "globe" as IconName },
      { label: "Power Deficit Identified", tone: "danger" as const, icon: "zap" as IconName },
    ],
  },
  {
    id: "m2",
    author: "Marcus Vance",
    role: "Financial",
    time: "10:44 AM",
    tone: "impact" as const,
    quote: 'Replying to Technical: "…upgrade the panels."',
    body: "I must disagree with the hardware upgrade path. Upgrading the solar arrays will push the Phase 1 budget over our ₹450k cap by at least ₹60k. The fiscal policy strictly prohibits exceeding Phase 1 limits without secondary council approval. We should explore the software optimization route (polling frequency) instead.",
    tags: [],
  },
];

export type InsightPoint = { lead?: string; text: string; danger?: boolean };

export const INSIGHTS: {
  title: string;
  icon: IconName;
  accent: string;
  chips: { label: string; tone: "neutral" | "danger" }[];
  points: InsightPoint[];
}[] = [
  {
    title: "Technical Stance",
    icon: "users",
    accent: "border-l-navy",
    chips: [
      { label: "3 Recommendations", tone: "neutral" },
      { label: "1 Flag", tone: "danger" },
    ],
    points: [
      { text: "Approve distributed nodes architecture." },
      { lead: "Critical:", text: "Resolve 15% power deficit.", danger: true },
      { text: "Suggests upgrading panel wattage." },
    ],
  },
  {
    title: "Financial Stance",
    icon: "landmark",
    accent: "border-l-impact-deep",
    chips: [
      { label: "1 Directive", tone: "neutral" },
      { label: "1 Block", tone: "neutral" },
    ],
    points: [
      { lead: "Enforce:", text: "Strict ₹450k Phase 1 cap." },
      { text: "Blocks hardware upgrade due to ₹60k overrun." },
      { text: "Demands software optimization alternative." },
    ],
  },
];

export const VERDICT_SCORES = [
  { label: "Social Impact Potential", value: 92, tone: "impact" as const },
  { label: "Technical Feasibility", value: 65, tone: "community" as const },
  { label: "Financial Sustainability", value: 80, tone: "navy" as const },
];

export const STRENGTHS = [
  "Clear alignment with local municipal sustainability goals.",
  "Strong grassroots mobilization strategy outlined.",
  "Initial budget estimates are well-researched and realistic.",
];

export const CONCERNS = [
  "Technical infrastructure relies on untested third-party APIs.",
  "Lack of a concrete long-term maintenance plan post-launch.",
  "Data privacy protocols for user collection are vaguely defined.",
];

export const CANDIDATES = [
  {
    id: "aarohi",
    name: "Aarohi Desai",
    college: "BIT Mesra",
    points: 450,
    skills: ["React", "Node.js", "UI/UX"],
  },
  {
    id: "rohan",
    name: "Rohan Kumar",
    college: "Ranchi University",
    points: 320,
    skills: ["Data Science", "Python"],
  },
  {
    id: "sneha",
    name: "Sneha Patel",
    college: "NIT Jamshedpur",
    points: 510,
    skills: ["UI/UX", "Figma"],
  },
  {
    id: "imran",
    name: "Imran Ansari",
    college: "BIT Mesra",
    points: 390,
    skills: ["IoT", "Embedded C"],
  },
  {
    id: "priya",
    name: "Priya Mahato",
    college: "Kolhan University",
    points: 280,
    skills: ["Data Science", "GIS"],
  },
];

export const SKILL_FILTERS = [
  "BIT Mesra",
  "Ranchi University",
  "React",
  "Data Science",
  "UI/UX",
];

export const GOALS = [
  { id: "sustainability", label: "Sustainability", icon: "leaf" as IconName },
  { id: "governance", label: "Governance", icon: "landmark" as IconName },
  { id: "education", label: "Education", icon: "graduation" as IconName },
];

export const CONTRIBUTIONS = [
  {
    icon: "droplet" as IconName,
    tone: "navy" as const,
    title: "Clean Water Mapping Initiative",
    date: "Oct 12, 2023",
    body: "Contributed geospatial data for 45 rural water sources in Ranchi district.",
    kind: "Data Collection",
    points: "+40 Impact Pts",
  },
  {
    icon: "book" as IconName,
    tone: "impact" as const,
    title: "Digital Literacy Workshop",
    date: "Sep 28, 2023",
    body: "Mentored 20 senior citizens on using basic civic mobile applications.",
    kind: "Mentorship",
    points: "+65 Impact Pts",
  },
  {
    icon: "leaf" as IconName,
    tone: "community" as const,
    title: "Urban Canopy Survey",
    date: "Sep 09, 2023",
    body: "Catalogued 120 heritage trees across Morabadi ward for the city green index.",
    kind: "Field Survey",
    points: "+35 Impact Pts",
  },
];

export const BADGES = [
  { label: "Green Initiative", icon: "leaf" as IconName, tone: "impact" as const },
  { label: "Edu Mentor", icon: "graduation" as IconName, tone: "navy" as const },
  { label: "Health Hero", icon: "shield" as IconName, tone: "community" as const },
];

export const CAMPUS_FOCUS = [
  { label: "Environmental", value: 42, icon: "leaf" as IconName, tone: "impact" as const },
  { label: "Education", value: 35, icon: "graduation" as IconName, tone: "navy" as const },
  { label: "Public Health", value: 23, icon: "shield" as IconName, tone: "community" as const },
];

export const PARTNERS = [
  {
    name: "Tata Steel Foundation",
    sector: "Metals & Mining",
    open: 6,
    stipend: "₹25,000/mo",
    focus: ["Circular economy", "Mine reclamation"],
  },
  {
    name: "Ranchi Smart City Corp.",
    sector: "Urban Governance",
    open: 4,
    stipend: "₹18,000/mo",
    focus: ["Traffic AI", "Waste routing"],
  },
  {
    name: "Jharkhand Renewables Ltd.",
    sector: "Energy",
    open: 3,
    stipend: "₹22,000/mo",
    focus: ["Solar micro-grids", "Storage"],
  },
  {
    name: "HEC Innovation Cell",
    sector: "Heavy Engineering",
    open: 2,
    stipend: "₹20,000/mo",
    focus: ["Predictive maintenance"],
  },
];
