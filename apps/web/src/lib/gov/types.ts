/**
 * Jan Setu — government domain model.
 *
 * These types describe the civic problem lifecycle end to end:
 *
 *   citizen report → AI understanding → cluster → priority → validation →
 *   department routing → industry sponsorship → government funding →
 *   officer assignment → project → evidence → citizen verification → impact
 *
 * Nothing here is UI. The screens read these shapes through
 * `src/lib/gov/service.ts`, so replacing the mock store with a real API means
 * changing that one file.
 */

/* ========================================================= jurisdiction === */

export type GovLevel = "state" | "district" | "block" | "panchayat";

/**
 * One point on the twelve-week intake-vs-resolution chart.
 *
 * `week` is "W1".."W12" and sorts numerically, not lexically — the API orders
 * it correctly, so nothing downstream re-sorts.
 */
export type WeeklyTrendPoint = {
  week: string;
  reported: number;
  resolved: number;
  priorityAvg: number;
};

export type Jurisdiction = {
  id: string;
  level: GovLevel;
  name: string;
  /** Parent in the administrative chain — `undefined` at state level. */
  parentId?: string;
  population: number;
};

export type Village = {
  id: string;
  name: string;
  jurisdictionId: string;
  population: number;
  /**
   * Multidimensional deprivation, 0 (well served) → 1 (most deprived).
   * Sourced from the block development office's SECC extract; it is what
   * stops the ranking from becoming a popularity contest.
   */
  deprivation: number;
  lat: number;
  lng: number;
};

/* ============================================================== people === */

export type Officer = {
  id: string;
  name: string;
  designation: string;
  departmentId: string;
  jurisdictionId: string;
  phone: string;
  /** Rolling operational stats, recomputed nightly from assignment history. */
  activeTasks: number;
  criticalTasks: number;
  overdue: number;
  completionRate: number; // 0–100
  avgResolutionDays: number;
  capacity: number; // tasks the officer can hold before being over-loaded
};

export type GovUser = {
  id: string;
  name: string;
  designation: string;
  level: GovLevel;
  jurisdictionId: string;
  /** Coarse RBAC. `scope` is derived from the jurisdiction subtree. */
  permissions: Permission[];
};

export type Permission =
  | "problem.validate"
  | "problem.route"
  | "sponsorship.invite"
  | "sponsorship.approve"
  | "funding.approve"
  | "officer.assign"
  | "project.update"
  | "settings.manage";

/* ========================================================= departments === */

export type ProblemCategory =
  | "water"
  | "roads"
  | "drainage"
  | "streetlight"
  | "waste"
  | "bridge"
  | "sanitation"
  | "school"
  | "health";

export type Department = {
  id: string;
  name: string;
  shortName: string;
  /** Categories this department owns — the basis of automatic routing. */
  categories: ProblemCategory[];
  headOfficerId: string;
  budgetAllocated: number;
  budgetCommitted: number;
  budgetSpent: number;
  slaHours: number;
};

/* ============================================================= reports === */

export type ReportChannel = "voice" | "text" | "photo" | "ivr" | "field";

export type CitizenReport = {
  id: string;
  problemId: string;
  citizenName: string;
  channel: ReportChannel;
  /** What the citizen actually said or wrote, in their own language. */
  raw: string;
  language: string;
  villageId: string;
  lat: number;
  lng: number;
  at: string; // ISO
  photos: number;
  /** Set when the intake engine folded this into an earlier report. */
  duplicateOf?: string;
  aiConfidence: number; // 0–100
};

/* ============================================================ priority === */

/**
 * The seven need signals. Each is normalised 0–100 by the priority engine so
 * that a weight change is comparable across factors.
 */
export type PriorityFactorKey =
  | "populationImpact"
  | "severity"
  | "deprivation"
  | "coverage"
  | "duration"
  | "recurrence"
  | "repeatedDemand"
  | "citizenVotes";

export type PriorityFactors = Record<PriorityFactorKey, number>;
export type PriorityWeights = Record<PriorityFactorKey, number>;

export type PriorityAdjustment = {
  label: string;
  points: number;
  reason: string;
};

/* ========================================================== lifecycle === */

export type Stage =
  | "reported"
  | "ai_processed"
  | "validated"
  | "prioritised"
  | "sponsorship"
  | "funded"
  | "assigned"
  | "implementation"
  | "verification"
  | "impact";

export type ProblemStatus =
  | "pending_validation"
  | "awaiting_sponsorship"
  | "funding_required"
  | "in_progress"
  | "verification_pending"
  | "resolved"
  | "rejected";

export type Severity = "critical" | "high" | "medium" | "low";

export type SponsorshipStatus =
  | "not_eligible"
  | "awaiting"
  | "invited"
  | "interested"
  | "proposal"
  | "approved"
  | "declined";

export type FundingStatus =
  | "not_required"
  | "pending"
  | "recommended"
  | "approved"
  | "rejected";

/* =========================================================== industry === */

export type Sponsor = {
  id: string;
  name: string;
  sector: string;
  csrThemes: string[];
  csrGeographies: string[];
  csrBudgetRemaining: number;
  responseRate: number; // 0–100, historic
};

export type SponsorMatch = {
  sponsorId: string;
  score: number; // 0–100
  reasons: string[];
  status: "matched" | "invited" | "interested" | "proposal" | "declined" | "approved";
  respondedAt?: string;
  proposalAmount?: number;
  note?: string;
};

export type Sponsorship = {
  status: SponsorshipStatus;
  eligible: boolean;
  matches: SponsorMatch[];
  invitedAt?: string;
  /** Industry response deadline. Expiry triggers the funding fallback. */
  responseDueAt?: string;
  approvedSponsorId?: string;
  approvedAmount?: number;
  failureReason?: string;
};

/* ============================================================ funding === */

export type Funding = {
  status: FundingStatus;
  required: number;
  source?: string;
  departmentBudgetAvailable: number;
  fundable: boolean;
  approvedAt?: string;
  approvedBy?: string;
  note?: string;
};

/* ============================================================ project === */

export type ProjectPhase =
  | "planning"
  | "implementation"
  | "testing"
  | "completed";

export type Project = {
  id: string;
  contractor: string;
  officerId: string;
  phase: ProjectPhase;
  progress: number; // 0–100
  budget: number;
  spent: number;
  startedAt: string;
  dueAt: string;
  dayOfPlan: number;
  planDays: number;
  milestones: { label: string; done: boolean; at?: string }[];
};

/* =========================================================== evidence === */

export type Evidence = {
  before: { photos: number; activeReports: number; note: string };
  after?: { photos: number; activeReports: number; note: string };
};

export type Verification = {
  requestedAt?: string;
  asked: number;
  confirmed: number;
  denied: number;
  pending: number;
};

/* ============================================================== audit === */

export type Actor = "AI" | "System" | "Officer" | "Citizen" | "Industry";

export type AuditEntry = {
  id: string;
  at: string;
  actor: Actor;
  actorName?: string;
  action: string;
  detail?: string;
  automated: boolean;
};

/* ============================================================ problem === */

export type AiIntelligence = {
  category: ProblemCategory;
  categoryConfidence: number;
  severity: Severity;
  durationDays: number;
  affected: number;
  similarReports: number;
  clusterLabel: string;
  /** One representative citizen utterance, kept verbatim. */
  originalQuote: string;
  originalLanguage: string;
  /** The structured reading the intake model produced from that utterance. */
  interpretation: { label: string; value: string }[];
  routedDepartmentId: string;
  routingReason: string;
  routingOverridden?: { byOfficerId: string; departmentId: string; reason: string; at: string };
};

export type Problem = {
  id: string;
  title: string;
  category: ProblemCategory;
  status: ProblemStatus;
  severity: Severity;
  stage: Stage;
  jurisdictionId: string;
  villageIds: string[];
  reportCount: number;
  /**
   * Citizens who agreed this matters without filing a report themselves.
   *
   * A separate number from `reportCount` the whole way through, because the
   * priority engine weights them separately — see `citizenVotes` in
   * `priority.ts`. The most-reported problem in a register is routinely not
   * the most-voted one, and collapsing the two hides that.
   */
  voteCount: number;
  duplicateCount: number;
  affected: number;
  createdAt: string;
  updatedAt: string;
  slaDueAt: string;
  factors: PriorityFactors;
  adjustments: PriorityAdjustment[];
  estimatedCost: number;
  departmentId: string;
  assignedOfficerId?: string;
  ai: AiIntelligence;
  sponsorship: Sponsorship;
  funding: Funding;
  project?: Project;
  evidence: Evidence;
  verification: Verification;
  audit: AuditEntry[];
};

/* ========================================================= automation === */

export type AutomationStatus = "healthy" | "attention" | "paused";

export type Automation = {
  id: string;
  name: string;
  description: string;
  status: AutomationStatus;
  enabled: boolean;
  lastRunAt: string;
  nextAction: string;
  affectedRecords: number;
  runsToday: number;
};

/* ============================================================= alerts === */

export type AlertKind =
  | "sla_breach"
  | "sponsorship_expiring"
  | "verification_pending"
  | "priority_changed"
  | "funding_ready";

export type GovAlert = {
  id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  at: string;
  problemId?: string;
  actionLabel?: string;
  read: boolean;
};

/* ============================================================ derived === */

/** A problem with its engine-computed score and rank attached. */
export type RankedProblem = Problem & {
  score: number;
  rank: number;
  previousRank?: number;
};
