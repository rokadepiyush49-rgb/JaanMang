/**
 * The data access boundary for the industry portal.
 *
 * Screens never import a fixture — they go through these services, and every
 * one of them is now a call to `/api/backend/industry/*` through the same
 * session-attaching proxy the government and institute surfaces use.
 *
 * The important consequence is not that the data is real. It is that
 * `visibility.ts` no longer exists on this side: the redaction that decides
 * what a partner may see of a citizen's problem happens on the server, before
 * the response is written. A client cannot opt out of a projection it never
 * receives. Nothing in this file can widen what the API returns, which is the
 * whole point of having moved it.
 */

import { api } from "@/lib/api/client";
import type {
  Challenge,
  CompanyProfile,
  IndustryAlert,
  IndustryProject,
  LeaderboardEntry,
  MentorAssignment,
  MentorshipRequest,
  MessageThread,
  StudentTeam,
  University,
} from "./types";

/* ========================================================== challenges === */

export const ChallengeService = {
  list: () => api.get<Challenge[]>("industry/challenges"),
  get: (id: string) => api.get<Challenge>(`industry/challenges/${id}`),
  /** The public audit trail, already stripped of citizen and officer identity. */
  timeline: (id: string) => api.get<unknown[]>(`industry/challenges/${id}/timeline`),
  /** The redaction policy, so a screen can show a partner where the line is. */
  visibilityPolicy: () =>
    api.get<{ visible: string; hidden: string }[]>("industry/visibility-policy"),
};

/* =============================================================== match === */

export type MatchFactorDto = {
  key: string;
  label: string;
  weight: number;
  score: number;
  level: "yes" | "partial" | "no";
  evidence: string;
  lever?: string;
};

export type MatchResultDto = {
  score: number;
  band: "strong" | "good" | "possible" | "weak";
  factors: MatchFactorDto[];
  modifiers: { label: string; points: number; reason: string }[];
  headline: string;
  gap?: string;
  reasons: string[];
};

export const MatchService = {
  /** Every challenge scored against this company, best first. */
  all: () => api.get<{ challenge: Challenge; match: MatchResultDto }[]>("industry/matches"),
  one: (id: string) => api.get<MatchResultDto>(`industry/challenges/${id}/match`),
};

/* ============================================================= funding === */

export type CommitmentDto = {
  problemId: string;
  title: string;
  category: string;
  problemStatus: string;
  status: string;
  score: number;
  reasons: string[];
  proposalAmount: number | null;
  note?: string;
  respondedAt: string | null;
};

export const FundingService = {
  listCommitments: () => api.get<CommitmentDto[]>("industry/commitments"),

  /**
   * Express interest, or put a number on it.
   *
   * Writes the same row the government's sponsorship tab reads, so a partner's
   * interest lands in the officer's queue rather than in a parallel table
   * nobody looks at. It approves nothing.
   */
  commit: (challengeId: string, body: { kind: "interest" | "proposal"; amount?: number; note?: string }) =>
    api.post<{ problemId: string; status: string; paymentsEnabled: boolean }>(
      `industry/challenges/${challengeId}/commit`,
      body,
    ),

  /**
   * Whether the platform can move money. It cannot, and every funding screen
   * says so rather than implying a rail exists behind the button.
   */
  paymentsEnabled(): boolean {
    return false;
  },
};

/* ============================================================== CSR === */

export type CsrBenefitDto = {
  problemId: string;
  title: string;
  category: string;
  sdgs: number[];
  amount: number;
  qualifyingSection: string;
  scheduleViiItem?: string;
  estimatedRelief: number;
  csrSpendBefore: number;
  csrSpendAfter: number;
  documentation: string;
  certificateNo?: string;
  certifiedAt: string | null;
  note?: string;
};

export type CsrPositionDto = {
  financialYear: string;
  allocated: number;
  committed: number;
  remaining: number;
  estimatedRelief: number;
  certified: number;
  outstanding: number;
  benefits: CsrBenefitDto[];
};

export const CsrService = {
  position: (financialYear?: string) =>
    api.get<CsrPositionDto>(
      `industry/csr${financialYear ? `?financialYear=${encodeURIComponent(financialYear)}` : ""}`,
    ),
};

/* ========================================================= mentorship === */

export const MentorshipService = {
  listRequests: () => api.get<MentorshipRequest[]>("industry/mentorship/requests"),
  listAssignments: () => api.get<MentorAssignment[]>("industry/mentorship/assignments"),
  offer: (requestId: string, roles: string[]) =>
    api.post<{ id: string }>(`industry/mentorship/requests/${requestId}/assign`, { roles }),
};

/* =========================================================== projects === */

export const ProjectService = {
  list: () => api.get<IndustryProject[]>("industry/projects"),
};

/* ========================================================== university === */

/**
 * The API returns these already shaped as the portal's own `University` and
 * `StudentTeam`, so no adapter sits in between. That is deliberate: an adapter
 * is a second place for the redaction to be got wrong, and the narrowing that
 * matters — a team member is a first name, a year and a discipline, and
 * nothing else — is done in one place on the server.
 */
export const UniversityService = {
  list: () => api.get<University[]>("industry/universities"),
  teams: (query: { skill?: string; institution?: string } = {}) => {
    const search = new URLSearchParams(
      Object.entries(query).filter(([, v]) => Boolean(v)) as [string, string][],
    ).toString();
    return api.get<StudentTeam[]>(`industry/talent${search ? `?${search}` : ""}`);
  },
};

/* ============================================================= impact === */

export type ImpactDto = {
  totals: {
    projects: number;
    delivered: number;
    committed: number;
    disbursed: number;
    peopleImpacted: number;
    villages: number;
    clustersClosed: number;
  };
  monthly: { month: string; investment: number; peopleImpacted: number }[];
  sdgs: { number: number; peopleImpacted: number }[];
  leaderboard: LeaderboardEntry[];
  leaderboardFormula: { label: string; weight: number }[];
};

export const ImpactService = {
  get: () => api.get<ImpactDto>("industry/impact"),
};

/* ============================================================ company === */

export const CompanyProfileService = {
  get: () => api.get<CompanyProfile>("industry/profile"),
  update: (patch: Record<string, unknown>) =>
    api.patch<CompanyProfile>("industry/profile", patch),
};

/* ====================================================== notifications === */

export const NotificationService = {
  list: () => api.get<IndustryAlert[]>("industry/notifications"),
};

/* =========================================================== messages === */

export const MessageService = {
  listThreads: () => api.get<MessageThread[]>("industry/messages"),
  post: (threadId: string, body: string) =>
    api.post<{ id: string; body: string; at: string }>(`industry/messages/${threadId}`, { body }),
};

/* ============================================================ reports === */

export type CsrReportRequest = {
  financialYear: string;
  includeProjectIds: string[];
  format: "pdf" | "xlsx";
};

export const ReportService = {
  /**
   * PDF export renders in the browser — see `csr-report.ts`. It is enabled
   * because there is now real, server-verified data to put in it; before this
   * stage the honest answer was that there was not.
   */
  exportEnabled(): boolean {
    return true;
  },
};

/** Everything the portal needs on first render, in one round trip's worth of calls. */
export async function loadIndustryWorkspace() {
  const [
    company,
    matches,
    projects,
    requests,
    assignments,
    alerts,
    threads,
    impact,
    policy,
    universities,
    teams,
  ] = await Promise.all([
    CompanyProfileService.get(),
    MatchService.all(),
    ProjectService.list(),
    MentorshipService.listRequests(),
    MentorshipService.listAssignments(),
    NotificationService.list(),
    MessageService.listThreads(),
    ImpactService.get(),
    ChallengeService.visibilityPolicy(),
    UniversityService.list(),
    UniversityService.teams(),
  ]);

  return {
    company,
    challenges: matches.map((m) => m.challenge),
    matches,
    projects,
    requests,
    assignments,
    alerts,
    threads,
    impact,
    redactions: policy,
    universities,
    teams,
  };
}
