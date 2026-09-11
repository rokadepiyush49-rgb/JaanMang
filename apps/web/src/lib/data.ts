import type { IconName } from "@/components/icon";
import { COUNCIL_AGENTS } from "@/lib/council/roster";
import type { Locale } from "@/lib/i18n/locale";

/* Static content transcribed from the Stitch reference screens. All values are
   presentation fixtures — swap for API calls when the backend lands. */

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
};

/* The student's own work. `Challenges` points at the existing Problem
   Explorer — it is already the challenge browser, so the route keeps working
   and only the label changes to the word students use for it. */
export const NAV_MAIN = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/profile", label: "My Profile", icon: "user" },
  { href: "/opportunities", label: "Opportunities", icon: "briefcase" },
  { href: "/projects", label: "Projects", icon: "rocket" },
  { href: "/applications", label: "Applications", icon: "file-pen" },
  { href: "/problem-explorer", label: "Challenges", icon: "bulb" },
  { href: "/achievements", label: "Achievements", icon: "trophy" },
  { href: "/notifications", label: "Notifications", icon: "bell", badge: 3 },
] satisfies NavItem[];

/* The shared surfaces the student visits but does not own. */
export const NAV_EXPLORE = [
  { href: "/impact-hub", label: "Impact Hub", icon: "trending-up" },
  { href: "/industry-hub", label: "Industry Hub", icon: "factory" },
  { href: "/council", label: "AI Project Council", icon: "users" },
] satisfies NavItem[];

/** Phone navigation. Five destinations, the middle one raised — the shape the
    Citizen app's floating bar uses, with the student's primary action in the
    slot the app gives to Report. */
export const BOTTOM_NAV = [
  { href: "/dashboard", label: "Home", icon: "dashboard" },
  { href: "/problem-explorer", label: "Explore", icon: "bulb" },
  { href: "/collaborate/new", label: "New", icon: "plus", raised: true },
  { href: "/projects", label: "Projects", icon: "rocket" },
  { href: "/profile", label: "Profile", icon: "user" },
] satisfies (NavItem & { raised?: boolean })[];

/** @deprecated Use `NAV_MAIN` / `NAV_EXPLORE`. */
export const NAV = [...NAV_MAIN, ...NAV_EXPLORE];

/* ------------------------------------------------------------- student --- */

export const STUDENT = {
  name: "Aisha Patel",
  greeting: "Namaste",
  role: "B.Tech Student, Social Innovator",
  institution: "BIT Mesra, Ranchi",
  year: "3rd Year · Computer Science",
  location: "Ranchi, Jharkhand",
  impactScore: 842,
  rank: 12,
  rankOf: 1840,
  streak: 14,
  skills: ["React", "Node.js", "IoT", "Data Analysis", "UI/UX"],
  interests: ["Sustainability", "Public Health", "Education"],
  profileComplete: 78,
};

export const OVERALL_PROGRESS = {
  percent: 67,
  label: "Impact goal",
  detail: "2,450 of 3,650 impact points",
  /** The card is 320px wide; the long form belongs in running text. */
  detailShort: "2,450 / 3,650 pts",
  footnote: "Recalculated nightly from verified contributions.",
};

export const PULSE = [
  { icon: "rocket" as IconName, value: "2,450", label: "Impact Points", tint: "navy" as const, delta: "+180" },
  { icon: "clipboard" as IconName, value: "4", label: "Active Projects", tint: "mint" as const, delta: "+1" },
  { icon: "file-pen" as IconName, value: "7", label: "Applications", tint: "amber" as const, delta: "2 new" },
  { icon: "trophy" as IconName, value: "11", label: "Badges Earned", tint: "orchid" as const, delta: "+2" },
];

export type StudentProject = {
  id: string;
  title: string;
  partner: string;
  status: string;
  statusTone: "success" | "info" | "warning" | "neutral";
  note: string;
  stage: number;
  percent: number;
  team: string[];
  tint: "navy" | "mint" | "amber" | "orchid" | "clay" | "blue";
  icon: IconName;
};

export const STUDENT_PROJECTS: StudentProject[] = [
  {
    id: "p1",
    title: "Community Water Harvesting Initiative",
    partner: "Ranchi Municipal Corp.",
    status: "In Progress",
    statusTone: "success",
    note: "Field pilot due in 3 days",
    stage: 4,
    percent: 75,
    team: ["Aisha Patel", "Rohan Kumar", "Priya Mahato"],
    tint: "blue",
    icon: "droplet",
  },
  {
    id: "p2",
    title: "Digital Literacy Campaign",
    partner: "Jharkhand Education Dept.",
    status: "Planning",
    statusTone: "info",
    note: "Kickoff next week",
    stage: 1,
    percent: 15,
    team: ["Aisha Patel", "Sneha Patel"],
    tint: "navy",
    icon: "book",
  },
  {
    id: "p3",
    title: "Anaemia Screening Route Planner",
    partner: "District Health Society, Dumka",
    status: "Under Review",
    statusTone: "warning",
    note: "Awaiting council verdict",
    stage: 3,
    percent: 52,
    team: ["Aisha Patel", "Imran Ansari", "Rohan Kumar", "Sneha Patel"],
    tint: "amber",
    icon: "shield",
  },
  {
    id: "p4",
    title: "Urban Canopy Survey",
    partner: "Ranchi Smart City Corp.",
    status: "Completed",
    statusTone: "neutral",
    note: "Handed over Sep 09",
    stage: 6,
    percent: 100,
    team: ["Aisha Patel", "Priya Mahato"],
    tint: "mint",
    icon: "leaf",
  },
];

export type Opportunity = {
  id: string;
  title: string;
  org: string;
  kind: "Internship" | "Hackathon" | "Fellowship" | "Research" | "Volunteer";
  location: string;
  mode: "On-site" | "Hybrid" | "Remote";
  reward: string;
  closes: string;
  match?: number;
  tint: "navy" | "mint" | "amber" | "orchid" | "clay" | "blue";
  icon: IconName;
  skills: string[];
};

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: "o1",
    title: "Smart City Hackathon 2026",
    org: "Ranchi Smart City Corp.",
    kind: "Hackathon",
    location: "Ranchi",
    mode: "Hybrid",
    reward: "₹1,00,000 pool",
    closes: "Closes in 6 days",
    match: 95,
    tint: "orchid",
    icon: "code",
    skills: ["React", "Data Analysis"],
  },
  {
    id: "o2",
    title: "UI/UX Design Intern",
    org: "Tata Steel Foundation",
    kind: "Internship",
    location: "Jamshedpur",
    mode: "On-site",
    reward: "₹20,000/mo",
    closes: "Closes in 12 days",
    match: 88,
    tint: "mint",
    icon: "briefcase",
    skills: ["UI/UX", "Figma"],
  },
  {
    id: "o3",
    title: "AI for Supply Chain Fellowship",
    org: "HEC Innovation Cell",
    kind: "Fellowship",
    location: "Ranchi",
    mode: "Remote",
    reward: "₹35,000 stipend",
    closes: "Closes in 3 days",
    match: 82,
    tint: "navy",
    icon: "bot",
    skills: ["Python", "Data Analysis"],
  },
  {
    id: "o4",
    title: "Solar Micro-grid Field Research",
    org: "Jharkhand Renewables Ltd.",
    kind: "Research",
    location: "Dumka",
    mode: "On-site",
    reward: "₹22,000/mo",
    closes: "Closes in 18 days",
    match: 74,
    tint: "amber",
    icon: "zap",
    skills: ["IoT", "Field Survey"],
  },
  {
    id: "o5",
    title: "ASHA Digital Companion — Volunteer Build",
    org: "District Health Society",
    kind: "Volunteer",
    location: "Dumka",
    mode: "Hybrid",
    reward: "+400 Impact Pts",
    closes: "Rolling",
    match: 69,
    tint: "clay",
    icon: "heart",
    skills: ["React", "Node.js"],
  },
  {
    id: "o6",
    title: "Mine Reclamation Data Sprint",
    org: "Tata Steel Foundation",
    kind: "Research",
    location: "Dhanbad",
    mode: "Remote",
    reward: "+650 Impact Pts",
    closes: "Closes in 9 days",
    tint: "blue",
    icon: "globe",
    skills: ["GIS", "Data Analysis"],
  },
];

export type Application = {
  id: string;
  role: string;
  org: string;
  submitted: string;
  stage: "Submitted" | "Under Review" | "Interview" | "Offer" | "Not selected";
  tone: "neutral" | "info" | "warning" | "success" | "critical";
  next: string;
};

export const APPLICATIONS: Application[] = [
  {
    id: "a1",
    role: "UI/UX Design Intern",
    org: "Tata Steel Foundation",
    submitted: "Sep 02, 2026",
    stage: "Interview",
    tone: "info",
    next: "Panel call on Sep 11, 3:00 PM",
  },
  {
    id: "a2",
    role: "Smart City Hackathon 2026",
    org: "Ranchi Smart City Corp.",
    submitted: "Aug 29, 2026",
    stage: "Under Review",
    tone: "warning",
    next: "Shortlist announced Sep 14",
  },
  {
    id: "a3",
    role: "AI for Supply Chain Fellowship",
    org: "HEC Innovation Cell",
    submitted: "Aug 21, 2026",
    stage: "Offer",
    tone: "success",
    next: "Accept by Sep 10",
  },
  {
    id: "a4",
    role: "Solar Micro-grid Field Research",
    org: "Jharkhand Renewables Ltd.",
    submitted: "Aug 14, 2026",
    stage: "Submitted",
    tone: "neutral",
    next: "No action needed",
  },
  {
    id: "a5",
    role: "Predictive Maintenance Intern",
    org: "HEC Innovation Cell",
    submitted: "Jul 30, 2026",
    stage: "Not selected",
    tone: "critical",
    next: "Feedback available",
  },
];

export type ActivityItem = {
  id: string;
  icon: IconName;
  tint: "navy" | "mint" | "amber" | "orchid" | "clay" | "blue";
  title: string;
  detail: string;
  when: string;
};

export const RECENT_ACTIVITY: ActivityItem[] = [
  {
    id: "r1",
    icon: "check-circle",
    tint: "mint",
    title: "Milestone verified",
    detail: "Water Harvesting — sensor calibration signed off by the ward officer.",
    when: "2 hours ago",
  },
  {
    id: "r2",
    icon: "users",
    tint: "navy",
    title: "Rohan Kumar joined your team",
    detail: "Anaemia Screening Route Planner",
    when: "Yesterday",
  },
  {
    id: "r3",
    icon: "trophy",
    tint: "orchid",
    title: "Badge earned — Field Researcher",
    detail: "Ten verified field submissions across three districts.",
    when: "2 days ago",
  },
  {
    id: "r4",
    icon: "file-pen",
    tint: "amber",
    title: "Application moved to Interview",
    detail: "UI/UX Design Intern at Tata Steel Foundation",
    when: "3 days ago",
  },
  {
    id: "r5",
    icon: "bot",
    tint: "blue",
    title: "Council verdict published",
    detail: "Digital Literacy Campaign scored 78 — two concerns to resolve.",
    when: "5 days ago",
  },
];

export type Notification = {
  id: string;
  icon: IconName;
  tone: "neutral" | "info" | "warning" | "success" | "critical";
  title: string;
  body: string;
  when: string;
  unread: boolean;
};

export const NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    icon: "calendar",
    tone: "warning",
    title: "Interview scheduled",
    body: "Tata Steel Foundation confirmed your panel call for Sep 11 at 3:00 PM.",
    when: "1 hour ago",
    unread: true,
  },
  {
    id: "n2",
    icon: "check-circle",
    tone: "success",
    title: "Offer received",
    body: "You have an offer for the AI for Supply Chain Fellowship. Respond by Sep 10.",
    when: "6 hours ago",
    unread: true,
  },
  {
    id: "n3",
    icon: "alert-circle",
    tone: "critical",
    title: "Deadline approaching",
    body: "Water Harvesting field pilot report is due in 3 days.",
    when: "Yesterday",
    unread: true,
  },
  {
    id: "n4",
    icon: "users",
    tone: "info",
    title: "Team invite",
    body: "Sneha Patel invited you to the Tribal Craft Marketplace team.",
    when: "2 days ago",
    unread: false,
  },
  {
    id: "n5",
    icon: "trophy",
    tone: "neutral",
    title: "Leaderboard update",
    body: "You moved up 4 places to rank 12 across Jharkhand.",
    when: "4 days ago",
    unread: false,
  },
];

export type Deadline = {
  id: string;
  title: string;
  context: string;
  date: string;
  daysLeft: number;
  icon: IconName;
};

export const DEADLINES: Deadline[] = [
  {
    id: "d1",
    title: "Field pilot report",
    context: "Community Water Harvesting",
    date: "Sep 11",
    daysLeft: 3,
    icon: "clipboard",
  },
  {
    id: "d2",
    title: "Fellowship acceptance",
    context: "HEC Innovation Cell",
    date: "Sep 10",
    daysLeft: 2,
    icon: "check-circle",
  },
  {
    id: "d3",
    title: "Hackathon registration closes",
    context: "Smart City Hackathon 2026",
    date: "Sep 14",
    daysLeft: 6,
    icon: "code",
  },
  {
    id: "d4",
    title: "Mid-semester impact review",
    context: "BIT Mesra — Innovation Cell",
    date: "Sep 22",
    daysLeft: 14,
    icon: "graduation",
  },
];

export type Achievement = {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  tint: "navy" | "mint" | "amber" | "orchid" | "clay" | "blue";
  earned: boolean;
  date?: string;
  progress?: number;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "b1",
    label: "Green Initiative",
    description: "Led a project with a verified environmental outcome.",
    icon: "leaf",
    tint: "mint",
    earned: true,
    date: "Aug 2026",
  },
  {
    id: "b2",
    label: "Edu Mentor",
    description: "Mentored twenty learners through a digital literacy drive.",
    icon: "graduation",
    tint: "navy",
    earned: true,
    date: "Jul 2026",
  },
  {
    id: "b3",
    label: "Health Hero",
    description: "Contributed to a public health deployment in the field.",
    icon: "shield",
    tint: "clay",
    earned: true,
    date: "Jun 2026",
  },
  {
    id: "b4",
    label: "Field Researcher",
    description: "Ten verified field submissions across three districts.",
    icon: "map-pin",
    tint: "blue",
    earned: true,
    date: "Sep 2026",
  },
  {
    id: "b5",
    label: "Team Builder",
    description: "Formed a cross-campus team of five or more students.",
    icon: "users",
    tint: "orchid",
    earned: true,
    date: "May 2026",
  },
  {
    id: "b6",
    label: "Data Steward",
    description: "Published three open datasets with full provenance.",
    icon: "bar-chart",
    tint: "amber",
    earned: false,
    progress: 66,
  },
  {
    id: "b7",
    label: "Industry Partner",
    description: "Completed a sponsored industry engagement end to end.",
    icon: "factory",
    tint: "navy",
    earned: false,
    progress: 40,
  },
  {
    id: "b8",
    label: "Council Approved",
    description: "Carry a project through an AI Council verdict above 85.",
    icon: "scale",
    tint: "mint",
    earned: false,
    progress: 78,
  },
];

export const DASHBOARD_ACTIONS = [
  { label: "Find a challenge", icon: "bulb" as IconName, tint: "navy" as const, href: "/problem-explorer" },
  { label: "Start a project", icon: "plus" as IconName, tint: "mint" as const, href: "/collaborate/new" },
  { label: "Build a team", icon: "users" as IconName, tint: "orchid" as const, href: "/collaborate/team" },
  { label: "Ask the Council", icon: "bot" as IconName, tint: "blue" as const, href: "/council" },
  { label: "Log impact", icon: "trending-up" as IconName, tint: "clay" as const, href: "/impact-hub" },
  { label: "Browse partners", icon: "factory" as IconName, tint: "amber" as const, href: "/industry-hub" },
];


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
