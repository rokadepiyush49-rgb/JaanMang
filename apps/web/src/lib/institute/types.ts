/**
 * Jan Setu — institute domain model.
 *
 * These are the shapes `backend/src/institute/institute.service.ts` returns,
 * mirrored here so screens are typed against the API rather than against the
 * database. The difference matters: the service deliberately projects a
 * narrower student than `StudentProfile` holds — no resume, no portfolio, no
 * personal links — and a type copied from Prisma would quietly invite a screen
 * to render a field it is never sent.
 *
 * Nothing here is UI. Screens read these through `service.ts`.
 */

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

/** The pipeline, in the order the platform runs it. */
export const STAGES: ProjectStage[] = [
  "discovery",
  "team_formed",
  "funded",
  "research",
  "prototype",
  "testing",
  "pilot",
  "deployment",
  "impact",
];

export const STAGE_LABEL: Record<ProjectStage, string> = {
  discovery: "Discovery",
  team_formed: "Team formed",
  funded: "Funded",
  research: "Research",
  prototype: "Prototype",
  testing: "Testing",
  pilot: "Pilot",
  deployment: "Deployment",
  impact: "Impact",
};

export type TeamStatus = "forming" | "active" | "submitted" | "completed" | "archived";
export type MilestoneStatus = "complete" | "active" | "pending" | "changes_requested";
export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "shortlisted"
  | "accepted"
  | "rejected"
  | "withdrawn";
export type ProgramLevel =
  | "certificate"
  | "diploma"
  | "undergraduate"
  | "postgraduate"
  | "doctoral";

/* ============================================================== profile === */

export type InstituteProfile = {
  id: string;
  name: string;
  about: string | null;
  shortName: string;
  institutionType: string;
  accreditation: string | null;
  aisheCode: string | null;
  website: string | null;
  officialEmail: string | null;
  officialPhone: string | null;
  establishedYear: number | null;
  logoUrl: string | null;
  city: string;
  state: string;
  district: string | null;
  focusAreas: string[];
  labs: string[];
  emailDomains: string[];
  onboardedAt: string | null;
  verification: {
    status: "pending" | "verified" | "rejected" | "info_requested";
    reviewedAt: string | null;
    reason: string | null;
  };
  administrators: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    designation: string;
    isPrimaryContact: boolean;
  }[];
  counts: {
    departments: number;
    programs: number;
    students: number;
    verifiedStudents: number;
    faculty: number;
    teams: number;
  };
  /** A named checklist, not a bare percentage — see the service comment. */
  completion: {
    percent: number;
    done: number;
    total: number;
    missing: { key: string; label: string }[];
  };
};

/* ======================================================== academic tree === */

export type Program = {
  id: string;
  departmentId: string;
  name: string;
  level: ProgramLevel;
  durationYears: number;
  intake: number | null;
  eligibility: string | null;
  status: "active" | "paused" | "archived";
};

export type Department = {
  id: string;
  name: string;
  code: string;
  hodFacultyId: string | null;
  hodName: string | null;
  facultyStrength: number | null;
  facultyCount: number;
  studentCount: number;
  teamCount: number;
  programs: Program[];
};

/* ============================================================= students === */

export type RosterStudent = {
  id: string;
  name: string;
  email: string | null;
  photoUrl: string | null;
  degree: string;
  branch: string;
  currentYear: number;
  graduationYear: number;
  enrollmentNo: string | null;
  district: string;
  skills: string[];
  interests: string[];
  departmentId: string | null;
  departmentName: string | null;
  programId: string | null;
  programName: string | null;
  verifiedAt: string | null;
  onboarded: boolean;
  team: { id: string; name: string; stage: ProjectStage; status: TeamStatus } | null;
  emailOnInstitutionDomain: boolean;
};

/* ============================================================== faculty === */

export type FacultyMember = {
  id: string;
  name: string;
  email: string | null;
  photoUrl: string | null;
  accountStatus: "active" | "suspended" | "pending";
  designation: string;
  expertise: string[];
  departmentId: string | null;
  departmentName: string | null;
  officialPhone: string | null;
  guideCapacity: number;
  teams: { id: string; name: string; stage: ProjectStage; status: TeamStatus }[];
  activeTeams: number;
  available: boolean;
  since: string;
};

/* ================================================================ teams === */

export type TeamMember = {
  id: string;
  userId: string | null;
  firstName: string;
  year: string;
  discipline: string;
};

export type Team = {
  id: string;
  name: string;
  title: string | null;
  status: TeamStatus;
  stage: ProjectStage;
  skills: string[];
  memberCount: number;
  departmentId: string | null;
  department: { name: string; code: string } | null;
  guide: { id: string; name: string; designation: string } | null;
  problem: { id: string; title: string; category: string; severity: string } | null;
  members: TeamMember[];
  projectId: string | null;
  progress: number;
  approvedAt: string | null;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TeamDetail = Team & {
  projects: Project[];
  applications: {
    id: string;
    studentId: string;
    status: ApplicationStatus;
    note: string | null;
    opportunityRef: string | null;
    submittedAt: string | null;
    decidedAt: string | null;
  }[];
};

/* ============================================================= projects === */

export type Milestone = {
  id: string;
  label: string;
  detail: string | null;
  status: MilestoneStatus;
  percent: number;
  deliverables: string[];
  awaitingReview: boolean;
  reviewNote: string | null;
  dueAt: string | null;
  completedAt: string | null;
};

export type Project = {
  id: string;
  title: string;
  kind: "gov" | "industry";
  phase: "planning" | "implementation" | "testing" | "completed";
  stage: ProjectStage | null;
  progress: number;
  startedAt: string | null;
  dueAt: string | null;
  problem?: { id: string; title: string; category: string } | null;
  team?: {
    id: string;
    name: string;
    status: TeamStatus;
    department: string | null;
    guide: string | null;
    guideId: string | null;
  } | null;
  milestones: Milestone[];
  awaitingReview: number;
};

export type ProjectDetail = Project & {
  members: { firstName: string; year: string; discipline: string }[];
  skills: string[];
  documents: { id: string; name: string; kind: string; sizeKb: number; at: string; uploadedBy: string }[];
  pilot: {
    location: string;
    villages: number;
    users: number;
    adoption: number;
    reliability: number;
    dayOfPlan: number;
    durationDays: number;
  } | null;
};

/* ========================================================== submissions === */

export type Submission = {
  id: string;
  label: string;
  detail: string | null;
  status: MilestoneStatus;
  percent: number;
  deliverables: string[];
  dueAt: string | null;
  submittedAt: string;
  project: { id: string; title: string; stage: ProjectStage | null; progress: number };
  team: { id: string | null; name: string; department: string | null; guide: string | null };
};

/* ========================================================= applications === */

export type InstituteApplication = {
  id: string;
  status: ApplicationStatus;
  note: string | null;
  opportunityRef: string | null;
  challengeId: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  student: { id: string; name: string; branch: string; currentYear: number } | null;
  team: { id: string; name: string } | null;
};

/* ======================================================== opportunities === */

export type Opportunity = {
  id: string;
  title: string;
  summary: string | null;
  category: string;
  severity: "low" | "medium" | "high" | "critical";
  status: string;
  stage: string;
  affected: number;
  reportCount: number;
  estimatedCost: number;
  jurisdiction: { id: string; name: string; level: string };
  postedAt: string;
  ourTeam: { id: string; name: string } | null;
  nearby: boolean;
};

export type Partner = {
  id: string;
  name: string;
  sector: string | null;
  about: string | null;
  city: string | null;
  state: string | null;
  csrThemes: string[];
  technologyDomains: string[];
  capabilities: string[];
  geographies: string[];
  connected: boolean;
  sharedProblems: number;
  committed: number;
};

/* ============================================================ dashboard === */

export type Overview = {
  counts: {
    students: number;
    verifiedStudents: number;
    unverifiedStudents: number;
    faculty: number;
    departments: number;
    programs: number;
    teams: number;
    projects: number;
    completedProjects: number;
    awaitingReview: number;
    applications: number;
  };
  pipeline: { stage: ProjectStage; label: string; teams: number }[];
  needs: {
    submissions: Submission[];
    unguidedTeams: { id: string; name: string; department: string | null; members: number }[];
    emptyTeams: { id: string; name: string; department: string | null }[];
    unverifiedStudents: {
      id: string;
      name: string;
      email: string | null;
      branch: string;
      currentYear: number;
    }[];
  };
  byDepartment: {
    id: string;
    name: string;
    code: string;
    students: number;
    faculty: number;
    teams: number;
    completed: number;
    avgProgress: number;
  }[];
  recent: { kind: "team" | "project"; id: string; at: string; title: string; detail: string }[];
};

export type Analytics = {
  participation: { students: number; engaged: number; rate: number };
  teams: { total: number; guided: number; completed: number; active: number };
  delivery: {
    projects: number;
    completed: number;
    avgProgress: number;
    milestonesComplete: number;
    milestonesTotal: number;
    awaitingReview: number;
    changesRequested: number;
  };
  applications: {
    total: number;
    accepted: number;
    rejected: number;
    open: number;
    selectionRate: number | null;
  };
  stages: { stage: ProjectStage; label: string; teams: number }[];
};

export type Notification = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  actionLabel: string | null;
  actionHref: string | null;
  read: boolean;
  createdAt: string;
};
