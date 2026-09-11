/**
 * Jan Setu — industry domain model.
 *
 * The government model in `lib/gov/types.ts` describes a problem from the
 * administration's side: who validated it, who owns it, whose budget pays. This
 * module describes the same lifecycle from the side of a company that can help
 * carry it:
 *
 *   validated challenge → industry discovery → explainable match → evaluation →
 *   fund / mentor / supply technology → university + student team → prototype →
 *   testing → pilot → deployment → measured impact
 *
 * Two rules shape everything here.
 *
 * First, industry is not a wallet. Every place money appears, the six other
 * contributions appear beside it, because a company that lends an IoT lab and
 * two engineers to a student team is doing more for the outcome than one that
 * wires a cheque and leaves.
 *
 * Second, industry is an outside party. A `Challenge` is deliberately not a
 * `Problem` — it is the redacted projection of one, produced by
 * `visibility.ts`. Citizen identities, verbatim reports, officer notes and
 * internal audit entries never reach this model, so a screen cannot leak what
 * it was never given.
 *
 * Nothing here is UI. Screens read these shapes through `service.ts`.
 */

import type { IconName } from "@/components/icon";
import type { Actor, AuditEntry, Severity } from "@/lib/gov/types";

export type { AuditEntry, Actor, Severity };

/* ============================================================= company === */

/** The seven ways a company can carry a challenge. Money is one of them. */
export type SupportKind =
  | "fund"
  | "mentor"
  | "technology"
  | "prototype"
  | "test"
  | "deploy"
  | "partner";

export const SUPPORT_KINDS: SupportKind[] = [
  "fund",
  "mentor",
  "technology",
  "prototype",
  "test",
  "deploy",
  "partner",
];

export type SupportMeta = {
  kind: SupportKind;
  label: string;
  /** What the company actually gives — the noun, not the gesture. */
  gives: string;
  icon: IconName;
  blurb: string;
};

/** A domain the platform files challenges and CSR spending under. */
export type Domain =
  | "water"
  | "health"
  | "education"
  | "agriculture"
  | "environment"
  | "energy"
  | "infrastructure"
  | "accessibility"
  | "rural";

/** A capability a company can actually put behind a deployment. */
export type Capability =
  | "manufacturing"
  | "testing"
  | "field-deployment"
  | "software"
  | "hardware"
  | "logistics"
  | "training"
  | "certification";

export type MentorRole =
  | "hardware"
  | "iot"
  | "product"
  | "data"
  | "manufacturing"
  | "field-ops"
  | "go-to-market"
  | "regulatory";

export type EmployeeMentor = {
  id: string;
  name: string;
  title: string;
  /** Business unit, not personal contact detail — this profile is shared. */
  unit: string;
  roles: MentorRole[];
  hoursPerMonth: number;
  /** Assignments the mentor is already carrying. */
  activeTeams: number;
  languages: string[];
};

export type CompanyProfile = {
  id: string;
  name: string;
  legalName: string;
  sector: string;
  about: string;
  headquarters: string;
  employees: number;
  /** Powers matching — the technologies the company can genuinely bring. */
  technologyDomains: string[];
  csrThemes: Domain[];
  /** States the company is registered to spend and deploy in. */
  geographies: string[];
  sdgPreferences: number[];
  capabilities: Capability[];
  /** The project size the company will look at, in rupees. */
  fundingRange: { min: number; max: number };
  csrBudget: CsrBudget;
  mentors: EmployeeMentor[];
  targetCommunities: string[];
  /** Domains the company has actually delivered in before — evidence, not intent. */
  provenDomains: Domain[];
};

export type CsrBudget = {
  financialYear: string;
  allocated: number;
  /**
   * CSR the company has committed outside Jan Setu — direct grants, employee
   * volunteering programmes, trust transfers.
   *
   * Modelled separately because the platform only ever accounts for its own
   * share, and a ledger that silently treated the whole budget as committed
   * here would overstate what this portal delivered. Everything committed
   * *through* the platform is derived from the projects, so a new commitment
   * moves the available figure the moment it is made.
   */
  committedElsewhere: number;
  disbursed: number;
  /** Per-domain split of the allocation, as a share of 100. */
  allocation: { domain: Domain; share: number }[];
  /** The largest single project the board has pre-approved. */
  preferredProjectCeiling: number;
};

/* =========================================================== challenge === */

export type ChallengeStatus =
  | "awaiting_partner"
  | "partially_funded"
  | "fully_funded"
  | "in_delivery"
  | "delivered";

/**
 * What the platform will show an outside partner about a validated problem.
 *
 * Everything here is either aggregate (counts, averages, cluster labels) or
 * already public (the government's validation, the department that owns it).
 * `visibility.ts` is the only module allowed to construct one.
 */
export type Challenge = {
  id: string;
  title: string;
  /** One-paragraph brief written for a partner, not an officer. */
  summary: string;
  domain: Domain;
  status: ChallengeStatus;
  severity: Severity;
  /** The government's published priority, 0–100. */
  priority: number;

  /* -- where ---------------------------------------------------------- */
  state: string;
  district: string;
  block: string;
  /** Village names only. No coordinates leave the government surface. */
  villages: string[];

  /* -- how much it matters -------------------------------------------- */
  affected: number;
  /** Aggregate report volume. Individual reports are never exposed. */
  reportCount: number;
  durationDays: number;
  /** The intake model's cluster label, which is already a public artefact. */
  clusterLabel: string;
  aiConfidence: number;
  /** Deprivation-weighted, 0–100 — why this village and not a louder one. */
  deprivationIndex: number;

  /* -- the government's position -------------------------------------- */
  governmentValidated: boolean;
  /** Designation only. Officers are not named to outside parties. */
  validatedBy?: string;
  department: string;
  sanctionReference?: string;

  /* -- what it needs -------------------------------------------------- */
  estimatedCost: number;
  fundingRequired: number;
  contributions: Contribution[];
  supportNeeded: SupportKind[];
  technologies: string[];
  capabilitiesNeeded: Capability[];
  timelineDays: number;
  sdgs: number[];

  /* -- who is already on it ------------------------------------------- */
  universityId?: string;
  teamId?: string;
  projectId?: string;

  /** What success is defined as, before anyone commits to it. */
  expectedOutcomes: Outcome[];
  /** Where each headline figure came from — no number without its source. */
  evidence: EvidenceLine[];
  publishedAt: string;
  /** Industry response window; after it the government funding fallback fires. */
  responseDueAt?: string;
};

export type Outcome = {
  label: string;
  target: string;
  method: string;
};

export type EvidenceLine = {
  label: string;
  value: string;
  source: string;
};

/* ============================================================= funding === */

export type ContributorKind = "industry" | "government" | "philanthropy";

export type Contribution = {
  id: string;
  party: string;
  kind: ContributorKind;
  amount: number;
  status: "proposed" | "committed" | "disbursed";
  at?: string;
  /** Set on the row that belongs to the signed-in company. */
  isSelf?: boolean;
};

export type CommitmentStatus =
  | "intent"
  | "proposal_submitted"
  | "awaiting_government"
  | "committed"
  | "disbursing"
  | "closed";

/**
 * A funding commitment.
 *
 * There is no payment rail behind this and the UI says so. What the record
 * models is an undertaking that the government countersigns — the state a real
 * CSR agreement sits in for weeks before any money moves.
 */
export type FundingCommitment = {
  id: string;
  challengeId: string;
  amount: number;
  status: CommitmentStatus;
  /** Support the company offered alongside the money. */
  alsoOffering: SupportKind[];
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  /** Tranches tied to milestones, so money follows delivery. */
  tranches: { label: string; amount: number; releasedOn: string; released: boolean }[];
  note?: string;
};

/* ========================================================= university === */

export type University = {
  id: string;
  name: string;
  shortName: string;
  city: string;
  state: string;
  accreditation: string;
  focusAreas: string[];
  labs: string[];
  activeProjects: number;
  studentsEngaged: number;
  facultyCount: number;
  /** Delivery record on Jan Setu projects, 0–100. Not a brand ranking. */
  deliveryScore: number;
  since: string;
};

export type Faculty = {
  id: string;
  name: string;
  designation: string;
  universityId: string;
  expertise: string[];
};

/**
 * A student team as an industry partner may see it.
 *
 * First names, discipline and year — enough to hold a design review, not
 * enough to identify or contact a student outside the platform.
 */
export type StudentTeam = {
  id: string;
  name: string;
  universityId: string;
  facultyId: string;
  memberCount: number;
  members: { firstName: string; year: string; discipline: string }[];
  skills: string[];
  stage: ProjectStage;
  /** Roles the team has asked an industry mentor to cover. */
  mentorRolesWanted: MentorRole[];
};

/* ========================================================= mentorship === */

export type MentorshipRequest = {
  id: string;
  challengeId: string;
  projectId?: string;
  teamId: string;
  universityId: string;
  roles: MentorRole[];
  hoursPerMonth: number;
  stage: ProjectStage;
  askedAt: string;
  /** What the team says it is stuck on — the reason a mentor is worth it. */
  need: string;
};

export type MentorSession = {
  id: string;
  at: string;
  topic: string;
  mentorId: string;
  minutes: number;
  done: boolean;
};

export type MentorAssignment = {
  id: string;
  requestId: string;
  mentorId: string;
  teamId: string;
  projectId: string;
  roles: MentorRole[];
  since: string;
  sessions: MentorSession[];
  openQuestions: { id: string; from: string; at: string; question: string; answered: boolean }[];
  documentsShared: number;
  feedbackRequests: number;
};

/* ============================================================ project === */

export type ProjectStage =
  | "discovery"
  | "team_formed"
  | "funded"
  | "research"
  | "prototype"
  | "testing"
  | "pilot"
  | "deployment"
  | "impact";

export type MilestoneStatus = "complete" | "active" | "pending" | "changes_requested";

export type Milestone = {
  id: string;
  label: string;
  detail: string;
  status: MilestoneStatus;
  percent: number;
  dueAt: string;
  completedAt?: string;
  /** Deliverables the team attached — an approval needs something to read. */
  deliverables: string[];
  /** True once the team submits it and the industry partner owes a decision. */
  awaitingReview: boolean;
  reviewedBy?: string;
  reviewNote?: string;
  /** Tranche released when this milestone is approved, if any. */
  trancheAmount?: number;
};

export type Pilot = {
  location: string;
  villages: number;
  durationDays: number;
  dayOfPlan: number;
  users: number;
  adoption: number;
  reliability: number;
  issues: { id: string; label: string; severity: Severity; open: boolean }[];
  feedback: { quote: string; from: string; village: string }[];
  metrics: { label: string; value: string; target: string; met: boolean }[];
};

export type ProjectDocument = {
  id: string;
  name: string;
  kind: "spec" | "report" | "approval" | "data" | "financial";
  sizeKb: number;
  at: string;
  by: string;
  /** Documents the government marks internal never reach this list. */
  sharedWith: ("industry" | "university" | "government")[];
};

export type ImpactMetric = {
  label: string;
  value: number;
  unit: string;
  baseline?: number;
  /** How it is measured — an impact number with no method is a claim. */
  method: string;
};

export type IndustryProject = {
  id: string;
  challengeId: string;
  title: string;
  stage: ProjectStage;
  progress: number;
  universityId: string;
  teamId: string;
  facultyId: string;
  /** The government body accountable for the outcome. */
  governmentBody: string;
  governmentRole: string;
  startedAt: string;
  expectedCompletion: string;
  investment: { committed: number; disbursed: number };
  coFunders: Contribution[];
  peopleImpacted: number;
  villages: number;
  /**
   * Citizen problem clusters this project closed.
   *
   * One project usually closes several: the Booty Basti lighting work retired
   * five separate complaint clusters, not one. Counting projects understates
   * what was actually resolved, which is why this is tracked separately.
   */
  clustersClosed: number;
  milestones: Milestone[];
  pilot?: Pilot;
  documents: ProjectDocument[];
  impact: ImpactMetric[];
  sdgs: number[];
  /** Support kinds this company is actually providing on this project. */
  providing: SupportKind[];
  audit: AuditEntry[];
};

/* ========================================================== messaging === */

export type ThreadParticipant = {
  id: string;
  name: string;
  role: "Government" | "Faculty" | "Student" | "Industry" | "University";
  organisation: string;
};

export type Message = {
  id: string;
  threadId: string;
  authorId: string;
  at: string;
  body: string;
  attachment?: string;
};

/**
 * Conversation is anchored to a project, never to a person.
 *
 * A general inbox between companies and student teams would be a social
 * network with none of a social network's safeguards; a thread that only exists
 * because a project exists keeps every message accountable to a piece of work.
 */
export type MessageThread = {
  id: string;
  projectId: string;
  subject: string;
  participants: ThreadParticipant[];
  messages: Message[];
  unread: number;
  updatedAt: string;
};

/* ========================================================= automation === */

export type AutomationStatus = "healthy" | "attention" | "paused";

export type AutomationCategory =
  | "discovery"
  | "eligibility"
  | "mentorship"
  | "delivery"
  | "reporting";

export type IndustryAutomation = {
  id: string;
  name: string;
  description: string;
  category: AutomationCategory;
  status: AutomationStatus;
  enabled: boolean;
  lastRunAt: string;
  nextAction: string;
  /** What the last run actually produced — the proof it is doing something. */
  results: { label: string; value: string; href?: string }[];
  runsThisWeek: number;
  /** Rules that decide money always end at a person. */
  requiresHuman: boolean;
};

/* ============================================================= alerts === */

export type AlertKind =
  | "new_match"
  | "funding_opportunity"
  | "mentor_request"
  | "milestone_review"
  | "government_approval"
  | "impact_update"
  | "deadline";

export type IndustryAlert = {
  id: string;
  kind: AlertKind;
  title: string;
  detail: string;
  at: string;
  read: boolean;
  /** Every alert can be acted on where it is read. */
  action?: { label: string; href: string };
  challengeId?: string;
  projectId?: string;
};

/* ============================================================= impact === */

export type ImpactSnapshot = {
  investment: number;
  peopleImpacted: number;
  problemsSolved: number;
  projectsCompleted: number;
  villages: number;
  studentsMentored: number;
  universities: number;
  pilotsDeployed: number;
  technologiesDeployed: number;
  sdgsContributed: number[];
};

export type MonthPoint = {
  month: string;
  investment: number;
  peopleImpacted: number;
};

/* ======================================================== recognition === */

/**
 * A leaderboard rank.
 *
 * `score` deliberately excludes rupees. A ranking that money can buy tells a
 * reader which company is largest, which they already knew; this one is built
 * from outcomes, delivery and the time employees actually gave.
 */
export type LeaderboardEntry = {
  rank: number;
  previousRank: number;
  companyId: string;
  company: string;
  sector: string;
  score: number;
  factors: { label: string; value: string; points: number }[];
  isSelf: boolean;
};

/* =============================================================== sdg === */

export type Sdg = {
  number: number;
  title: string;
  short: string;
};
