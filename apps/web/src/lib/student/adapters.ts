import type { IconName } from "@/components/icon";
import type {
  Achievements,
  Opportunity as ApiOpportunity,
  Candidate,
  Partner,
  Recommendation,
  StudentApplication,
  StudentProfile,
  StudentProject as ApiProject,
} from "./service";

/**
 * API shapes → the shapes the thirteen screens render.
 *
 * A deliberate seam rather than a rewrite of every screen. The screens were
 * built against `lib/data.ts`, and most of what they read has a real
 * equivalent — a category is a category, a status is a status. What this file
 * exists to make visible is the handful of fields that had *no* equivalent,
 * because they were invented by the fixture:
 *
 *   STUDENT.streak      — a login streak nothing ever counted. Dropped.
 *   STUDENT.rankOf      — "12 of 1,840" when there were ten accounts. Dropped;
 *                         the rank comes from LeaderboardEntry or is absent.
 *   profileComplete: 78 — now computed from fields that change what the
 *                         product can do for somebody.
 *   Opportunity.reward  — no stipend exists on a civic problem. Replaced with
 *                         the estimated cost of the work.
 *   Application.next    — a "next step" nobody was tracking. Replaced with the
 *                         real status.
 *   Achievement.progress— progress toward an unearned badge. Badges are earned
 *                         from a rule the recognition cron evaluates; until it
 *                         runs there is no partial state to report.
 *
 * Every one of those was a number on a screen that no system produced. Dropping
 * them is the point of the stage, not a regression.
 */

const TINTS = ["navy", "mint", "amber", "orchid", "clay", "blue"] as const;
export type Tint = (typeof TINTS)[number];

/** Stable per-id, so a card does not change colour between renders. */
function tintOf(id: string): Tint {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 997;
  return TINTS[hash % TINTS.length];
}

const CATEGORY_ICON: Record<string, IconName> = {
  water: "droplet",
  roads: "map",
  drainage: "droplet",
  streetlight: "zap",
  waste: "leaf",
  bridge: "landmark",
  sanitation: "shield",
  school: "graduation",
  health: "heart",
};

const SEVERITY_URGENCY: Record<string, "Critical" | "High" | "Moderate"> = {
  critical: "Critical",
  high: "High",
  medium: "Moderate",
  low: "Moderate",
};

const CATEGORY_LABEL: Record<string, string> = {
  water: "Water",
  roads: "Roads",
  drainage: "Drainage",
  streetlight: "Street lighting",
  waste: "Waste",
  bridge: "Bridges",
  sanitation: "Sanitation",
  school: "Education",
  health: "Health",
};

/* ====================================================== opportunities === */

export type ViewOpportunity = {
  id: string;
  title: string;
  org: string;
  kind: string;
  location: string;
  mode: string;
  reward: string;
  closes: string;
  match?: number;
  tint: Tint;
  icon: IconName;
  skills: string[];
  difficulty: string;
  teamCount: number;
  affected: number;
};

export function toViewOpportunity(
  o: ApiOpportunity,
  match?: number,
): ViewOpportunity {
  return {
    id: o.id,
    title: o.title,
    org: o.department ?? o.district,
    /* The fixture's `kind` was Internship/Hackathon/Fellowship. A civic problem
       has a category, not an employment type, so the filter runs on that. */
    kind: CATEGORY_LABEL[o.category] ?? o.category,
    location: o.villages[0] ?? o.district,
    mode: o.villages.length > 1 ? "Multi-village" : "On-site",
    /* Not a stipend. The scale of the work, which is what a student actually
       wants to know before joining. */
    reward: o.estimatedCost > 0 ? `₹${(o.estimatedCost / 100000).toFixed(1)} L project` : "Unfunded",
    closes: o.publishedAt,
    match,
    tint: tintOf(o.id),
    icon: CATEGORY_ICON[o.category] ?? "target",
    skills: o.skills,
    difficulty: o.difficulty,
    teamCount: o.teamCount,
    affected: o.affected,
  };
}

/* ======================================================= applications === */

const STATUS_STAGE: Record<string, string> = {
  draft: "Submitted",
  submitted: "Submitted",
  under_review: "Under Review",
  shortlisted: "Interview",
  accepted: "Offer",
  rejected: "Not selected",
  withdrawn: "Not selected",
};

const STATUS_TONE: Record<string, "neutral" | "info" | "warning" | "success" | "critical"> = {
  draft: "neutral",
  submitted: "info",
  under_review: "warning",
  shortlisted: "warning",
  accepted: "success",
  rejected: "critical",
  withdrawn: "neutral",
};

export type ViewApplication = {
  id: string;
  role: string;
  org: string;
  submitted: string;
  stage: string;
  tone: "neutral" | "info" | "warning" | "success" | "critical";
  next: string;
  rawStatus: string;
};

export function toViewApplication(a: StudentApplication): ViewApplication {
  return {
    id: a.id,
    role: a.challenge?.title ?? a.opportunityRef ?? "Opportunity",
    org: a.team?.name ?? "Applied individually",
    submitted: a.submittedAt ?? a.createdAt,
    stage: STATUS_STAGE[a.status] ?? a.status,
    tone: STATUS_TONE[a.status] ?? "neutral",
    /* The real status, in words. The fixture's `next` was a sentence about a
       step nothing was tracking. */
    next: a.status.replace(/_/g, " "),
    rawStatus: a.status,
  };
}

/* =========================================================== projects === */

const PHASE_TONE: Record<string, "success" | "info" | "warning" | "neutral"> = {
  planning: "neutral",
  implementation: "info",
  testing: "warning",
  completed: "success",
};

export type ViewProject = {
  id: string;
  title: string;
  partner: string;
  status: string;
  statusTone: "success" | "info" | "warning" | "neutral";
  note: string;
  stage: number;
  percent: number;
  team: string[];
  tint: Tint;
  icon: IconName;
};

export function toViewProject(p: ApiProject): ViewProject {
  const done = p.milestones.filter((m) => m.status === "complete").length;
  return {
    id: p.id,
    title: p.title,
    partner: p.team?.name ?? "Unassigned",
    status: p.phase.charAt(0).toUpperCase() + p.phase.slice(1),
    statusTone: PHASE_TONE[p.phase] ?? "neutral",
    note: p.problem?.title ?? "",
    stage: Math.min(5, done),
    percent: p.progress,
    /* First names only, from the team the student is in. */
    team: p.team ? [p.team.name] : [],
    tint: tintOf(p.id),
    icon: CATEGORY_ICON[p.problem?.category ?? ""] ?? "rocket",
  };
}

/* ======================================================= achievements === */

export type ViewAchievement = {
  id: string;
  label: string;
  description: string;
  icon: IconName;
  tint: Tint;
  earned: boolean;
  date?: string;
  /**
   * Progress toward an unearned badge.
   *
   * Always absent. Badges are earned from rules the recognition cron
   * evaluates, and it records the metric snapshot at the moment a rule fired —
   * not a running total toward one. Kept on the type because the screen has a
   * progress affordance that will be correct the day partial state exists, and
   * `undefined` renders as "not started" rather than as a fabricated 60%.
   */
  progress?: number;
};

const TIER_ICON: Record<string, IconName> = {
  bronze: "award",
  silver: "star",
  gold: "trophy",
  platinum: "sparkles",
};

/**
 * Earned badges only.
 *
 * The fixture showed locked badges with a progress bar toward each. Badges are
 * earned from rules the recognition cron evaluates, and until it has run there
 * is no partial state to report — so an unearned badge is simply absent rather
 * than shown at 60%.
 */
export function toViewAchievements(a: Achievements): ViewAchievement[] {
  return a.badges.map((b) => ({
    id: b.key,
    label: b.name,
    description: b.description,
    icon: TIER_ICON[b.tier] ?? "award",
    tint: tintOf(b.key),
    earned: true,
    date: b.earnedAt,
  }));
}

/* ========================================================== explorer === */

export type ViewChallenge = {
  id: string;
  title: string;
  summary: string;
  category: string;
  match?: number;
  location: string;
  teams: string;
  urgency: "Critical" | "High" | "Moderate";
  region: string;
  hackathon?: boolean;
};

export function toViewChallenge(o: ApiOpportunity, match?: number): ViewChallenge {
  return {
    id: o.id,
    title: o.title,
    summary: o.summary,
    category: CATEGORY_LABEL[o.category] ?? o.category,
    match,
    location: o.villages.join(", ") || o.district,
    teams: `${o.teamCount} team${o.teamCount === 1 ? "" : "s"}`,
    urgency: SEVERITY_URGENCY[o.severity] ?? "Moderate",
    region: o.district,
  };
}

/** The filter vocabulary, derived from what is actually on the list. */
export function filtersFrom(opportunities: ApiOpportunity[]) {
  const categories = [...new Set(opportunities.map((o) => CATEGORY_LABEL[o.category] ?? o.category))];
  const regions = [...new Set(opportunities.map((o) => o.district))];
  return {
    categories: ["All categories", ...categories.sort()],
    urgency: ["Any urgency", "Critical", "High", "Moderate"],
    regions: ["All regions", ...regions.sort()],
  };
}

/* ============================================================ people === */

export function toViewCandidate(c: Candidate) {
  return {
    id: c.id,
    name: c.name,
    college: c.college,
    points: c.points,
    skills: c.skills,
  };
}

export function toViewPartner(p: Partner) {
  return {
    name: p.name,
    sector: p.sector,
    /* Challenges they are engaged on. The fixture's `open` was a count of job
       openings, which this platform does not hold. */
    open: p.engagements,
    focus: p.focus,
  };
}

/** Match percentages by problem id, from the recommender. */
export function matchMap(recommendations: Recommendation[]): Map<string, number> {
  return new Map(recommendations.map((r) => [r.problemId, r.score]));
}

/** The greeting line under a student's name. */
export function greeting(profile: StudentProfile): string {
  return profile.name.split(" ")[0];
}
