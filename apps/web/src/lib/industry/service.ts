/**
 * The data access boundary for the industry portal.
 *
 * Screens never import a fixture directly — they go through these services.
 * Each is already async and already shaped like an HTTP client, so connecting
 * the real backend in `/backend/api` means replacing a function body, not
 * touching a component:
 *
 *   export async function listChallenges() {
 *     const res = await fetch(`${API}/industry/challenges`, { headers: auth() });
 *     return (await res.json()) as Challenge[];
 *   }
 *
 * The services are grouped by the thing they serve rather than by the table
 * they read, which is why `ChallengeService.get` returns a challenge already
 * projected through `visibility.ts`: a caller must not be able to obtain the
 * unredacted government record by asking a different service for it.
 */

import {
  ALERTS,
  AUTOMATIONS,
  COMPANY,
  FACULTY,
  LEADERBOARD,
  LEADERBOARD_FORMULA,
  MENTOR_ASSIGNMENTS,
  MENTORSHIP_REQUESTS,
  MONTHLY,
  SDGS,
  TEAMS,
  THREADS,
  UNIVERSITIES,
} from "./mock-data";
import { PROJECTS } from "./projects";
import { PUBLIC_CHALLENGES, publicTimeline, REDACTIONS } from "./visibility";
import type {
  Challenge,
  CompanyProfile,
  IndustryAlert,
  IndustryAutomation,
  IndustryProject,
  MentorAssignment,
  MentorshipRequest,
  MessageThread,
} from "./types";

/** Set false once `/backend/api` serves these routes. */
export const USING_MOCK_DATA = true;

/* ========================================================== challenges === */

export const ChallengeService = {
  async list(): Promise<Challenge[]> {
    return PUBLIC_CHALLENGES;
  },
  async get(id: string): Promise<Challenge | undefined> {
    return PUBLIC_CHALLENGES.find((c) => c.id === id);
  },
  /** The public audit trail, already stripped of citizen and officer identity. */
  async timeline(id: string) {
    return publicTimeline(id);
  },
  /** The redaction policy, so a screen can show a partner where the line is. */
  async visibilityPolicy() {
    return REDACTIONS;
  },
};

/* ============================================================ funding === */

export const FundingService = {
  async listCommitments() {
    /* Commitments are created in-session against the live store; there is no
       seeded backlog because every one of them would be a financial record
       this demo has no authority to assert. */
    return [];
  },
  /**
   * Whether the platform can move money. It cannot, and every funding screen
   * says so rather than implying a rail exists behind the button.
   */
  paymentsEnabled(): boolean {
    return false;
  },
};

/* ========================================================= mentorship === */

export const MentorshipService = {
  async listRequests(): Promise<MentorshipRequest[]> {
    return MENTORSHIP_REQUESTS;
  },
  async listAssignments(): Promise<MentorAssignment[]> {
    return MENTOR_ASSIGNMENTS;
  },
};

/* =========================================================== projects === */

export const ProjectService = {
  async list(): Promise<IndustryProject[]> {
    return PROJECTS;
  },
  async get(id: string): Promise<IndustryProject | undefined> {
    return PROJECTS.find((p) => p.id === id);
  },
};

/* ========================================================== university === */

export const UniversityService = {
  async list() {
    return UNIVERSITIES;
  },
  async faculty() {
    return FACULTY;
  },
  async teams() {
    return TEAMS;
  },
};

/* ============================================================= impact === */

export const ImpactService = {
  async monthly() {
    return MONTHLY;
  },
  async sdgs() {
    return SDGS;
  },
  async leaderboard() {
    return { entries: LEADERBOARD, formula: LEADERBOARD_FORMULA };
  },
};

/* ============================================================ company === */

export const CompanyProfileService = {
  async get(): Promise<CompanyProfile> {
    return COMPANY;
  },
  async update(patch: Partial<CompanyProfile>): Promise<CompanyProfile> {
    /* The live store holds the edit; this is where the PATCH will go. */
    return { ...COMPANY, ...patch };
  },
};

/* ====================================================== notifications === */

export const NotificationService = {
  async list(): Promise<IndustryAlert[]> {
    return ALERTS;
  },
};

/* ========================================================= automation === */

export const AutomationService = {
  async list(): Promise<IndustryAutomation[]> {
    return AUTOMATIONS;
  },
};

/* =========================================================== messages === */

export const MessageService = {
  async listThreads(): Promise<MessageThread[]> {
    return THREADS;
  },
};

/* ============================================================ reports === */

export type CsrReportRequest = {
  financialYear: string;
  includeProjectIds: string[];
  format: "pdf" | "xlsx";
};

export const ReportService = {
  /**
   * Export is not implemented, and this says so rather than downloading an
   * empty file. The abstraction exists so the screen is already wired when a
   * renderer lands behind it.
   */
  exportEnabled(): boolean {
    return false;
  },
  async generate(request: CsrReportRequest) {
    return {
      request,
      generatedAt: new Date().toISOString(),
      status: "prepared" as const,
      note: "Prepared from verified project data. Export renderer not yet implemented.",
    };
  },
};

/** The synchronous seed the client store hydrates from on first render. */
export const seed = {
  company: COMPANY,
  challenges: PUBLIC_CHALLENGES,
  projects: PROJECTS,
  requests: MENTORSHIP_REQUESTS,
  assignments: MENTOR_ASSIGNMENTS,
  automations: AUTOMATIONS,
  alerts: ALERTS,
  threads: THREADS,
  universities: UNIVERSITIES,
  faculty: FACULTY,
  teams: TEAMS,
  monthly: MONTHLY,
  leaderboard: LEADERBOARD,
  leaderboardFormula: LEADERBOARD_FORMULA,
  sdgs: SDGS,
  redactions: REDACTIONS,
};
