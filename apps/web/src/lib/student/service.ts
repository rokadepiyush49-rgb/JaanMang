import { api } from "@/lib/api/client";

/**
 * The student workspace's data access boundary.
 *
 * Replaces `lib/data.ts`, which was 982 lines of fixtures imported by sixteen
 * files — down to a literal `badge: 3` on the notifications nav item. Every
 * function here is a call through the same session-attaching proxy the other
 * surfaces use, and everything it returns is the same row the institute and
 * the government are looking at, seen from the student's side.
 */

export type StudentProfile = {
  id: string;
  name: string;
  email: string | null;
  photoUrl?: string;
  locale: string;
  institution: { id: string | null; name: string };
  degree: string;
  branch: string;
  currentYear: number;
  graduationYear: number;
  department?: { id: string; name: string; code: string };
  program?: { id: string; name: string; level: string };
  state: string;
  district: string;
  skills: string[];
  interests: string[];
  preferredCategories: string[];
  preferredDistricts: string[];
  sdgInterests: number[];
  weeklyHours?: number;
  verifiedContributions: number;
  /** Whether the institution has confirmed this person is really enrolled. */
  verified: boolean;
  links: { resume?: string; github?: string; linkedin?: string; portfolio?: string };
  onboardedAt: string | null;
};

export type Difficulty = "starter" | "intermediate" | "advanced";

export type Opportunity = {
  id: string;
  title: string;
  summary: string;
  category: string;
  severity: string;
  status: string;
  stage: string | null;
  district: string;
  villages: string[];
  affected: number;
  reportCount: number;
  voteCount: number;
  sdgs: number[];
  department?: string;
  estimatedCost: number;
  skills: string[];
  capabilitiesNeeded: string[];
  timelineDays: number;
  difficulty: Difficulty;
  priority: number;
  teamCount: number;
  proposalCount: number;
  myInstitutionIsOn: boolean;
  publishedAt: string;
};

export type Recommendation = {
  problemId: string;
  score: number;
  /** Never empty — see the recommender's README. */
  reasons: string[];
  title: string;
  summary: string;
  category: string;
  severity: string;
  district: string;
  affected: number;
  sdgs: number[];
  skills: string[];
};

export type StudentApplication = {
  id: string;
  challengeId?: string;
  challenge?: { id: string; title: string; category: string; status: string };
  opportunityRef?: string;
  team?: { id: string; name: string; status: string; problemId: string | null };
  status: string;
  note?: string;
  submittedAt: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type StudentMilestone = {
  id: string;
  label: string;
  detail?: string;
  status: string;
  percent: number;
  dueAt: string | null;
  completedAt: string | null;
  deliverables: string[];
  awaitingReview: boolean;
  reviewNote?: string;
};

export type StudentProject = {
  id: string;
  title: string;
  problem?: { id: string; title: string; category: string; affected: number; sdgGoals: number[] };
  team?: { id: string; name: string; memberCount: number };
  phase: string;
  stage: string | null;
  progress: number;
  startedAt: string | null;
  dueAt: string | null;
  sdgs: number[];
  milestones: StudentMilestone[];
};

export type StudentTeam = {
  id: string;
  name: string;
  institution: string;
  status: string;
  stage: string;
  skills: string[];
  memberCount: number;
  problem?: { id: string; title: string; category: string };
  guide?: { name: string; designation: string };
  members: { firstName: string; year: string; discipline: string; isMe: boolean }[];
  projects: { id: string; title: string; phase: string; progress: number }[];
  mentorRolesWanted: string[];
};

export type Achievements = {
  totalPoints: number;
  verifiedContributions: number;
  rank?: { rank: number; score: number; previousRank: number | null; breakdown: unknown };
  ledger: { id: string; source: string; points: number; at: string }[];
  achievements: { key: string; points: number; awardedAt: string }[];
  badges: {
    key: string;
    name: string;
    description: string;
    tier: string;
    icon?: string;
    points: number;
    evidence: unknown;
    earnedAt: string;
  }[];
  awards: {
    id: string;
    name: string;
    description?: string;
    citation?: string;
    period?: string;
    grantedAt: string;
  }[];
};

export type StudentNotification = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  actionLabel?: string;
  actionHref?: string;
  at: string;
  read: boolean;
};

export type Candidate = {
  id: string;
  name: string;
  college: string;
  branch: string;
  year: number;
  skills: string[];
  interests: string[];
  points: number;
  verifiedContributions: number;
};

export type Partner = {
  id: string;
  name: string;
  sector: string;
  focus: string[];
  technologies: string[];
  engagements: number;
};

export type Proposal = {
  id: string;
  problem: { id: string; title: string; category: string };
  team?: { id: string; name: string };
  title: string;
  summary: string;
  approach: string;
  estimatedCost: number;
  durationDays?: number;
  needs: string[];
  status: string;
  submittedAt: string | null;
  reviewedAt: string | null;
  decisionNote?: string;
};

export type Hackathon = {
  id: string;
  code: string;
  title: string;
  about?: string;
  host?: string;
  status: string;
  mode?: string;
  venue?: string;
  registrationClosesAt: string | null;
  startsAt: string;
  endsAt: string;
  prizePool: number;
  maxTeamSize?: number;
  problems: { id: string; title: string; category: string; track?: string }[];
  teamCount: number;
  myEntries: {
    teamId: string;
    teamName: string;
    finalRank?: number;
    score?: number;
    withdrawn: boolean;
  }[];
};

export const StudentApi = {
  profile: () => api.get<StudentProfile>("student/profile"),
  updateProfile: (patch: Record<string, unknown>) =>
    api.patch<StudentProfile>("student/profile", patch),

  opportunities: (query: { category?: string; difficulty?: Difficulty } = {}) => {
    const search = new URLSearchParams(
      Object.entries(query).filter(([, v]) => Boolean(v)) as [string, string][],
    ).toString();
    return api.get<Opportunity[]>(`student/opportunities${search ? `?${search}` : ""}`);
  },
  recommendations: (limit = 12) =>
    api.get<Recommendation[]>(`student/recommendations?limit=${limit}`),

  applications: () => api.get<StudentApplication[]>("student/applications"),
  apply: (problemId: string, body: { teamId?: string; note?: string } = {}) =>
    api.post<{ id: string; status: string }>(
      `student/opportunities/${problemId}/apply`,
      body,
    ),
  withdraw: (applicationId: string) =>
    api.del<{ id: string; status: string }>(`student/applications/${applicationId}`),

  projects: () => api.get<StudentProject[]>("student/projects"),
  teams: () => api.get<StudentTeam[]>("student/teams"),
  achievements: () => api.get<Achievements>("student/achievements"),

  notifications: () => api.get<StudentNotification[]>("student/notifications"),
  readNotification: (id: string) =>
    api.post<{ id: string; read: boolean }>(`student/notifications/${id}/read`),

  candidates: (skill?: string) =>
    api.get<Candidate[]>(`student/candidates${skill ? `?skill=${encodeURIComponent(skill)}` : ""}`),
  partners: () => api.get<Partner[]>("student/partners"),
  proposals: () => api.get<Proposal[]>("student/proposals"),
  hackathons: () => api.get<Hackathon[]>("student/hackathons"),
};

/** Everything the workspace needs on first render. */
export async function loadStudentWorkspace() {
  const [profile, opportunities, recommendations, applications, projects, teams, achievements, notifications] =
    await Promise.all([
      StudentApi.profile(),
      StudentApi.opportunities(),
      StudentApi.recommendations(),
      StudentApi.applications(),
      StudentApi.projects(),
      StudentApi.teams(),
      StudentApi.achievements(),
      StudentApi.notifications(),
    ]);

  return {
    profile,
    opportunities,
    recommendations,
    applications,
    projects,
    teams,
    achievements,
    notifications,
  };
}

/* ============================================================ derived === */

/**
 * How complete a profile is, as a percentage.
 *
 * The fixture carried a `profileComplete: 85` that meant nothing. This counts
 * the fields that actually change what the product can do for somebody: skills
 * and preferences feed the recommender, the links are what an institution or a
 * partner reads, and verification is the institution's own confirmation.
 */
export function profileCompleteness(p: StudentProfile): number {
  const checks = [
    p.skills.length > 0,
    p.interests.length > 0,
    p.preferredCategories.length > 0,
    p.preferredDistricts.length > 0,
    p.sdgInterests.length > 0,
    p.weeklyHours !== undefined,
    Boolean(p.links.github || p.links.portfolio),
    Boolean(p.links.resume),
    p.verified,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

/** "Computer Science & Engineering · 3rd year" — the line under a name. */
export function studentRole(p: StudentProfile): string {
  const suffix = ["th", "st", "nd", "rd"][p.currentYear % 10] ?? "th";
  return `${p.branch} · ${p.currentYear}${p.currentYear > 3 ? "th" : suffix} year`;
}

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  starter: "Good first project",
  intermediate: "Intermediate",
  advanced: "Advanced",
};
