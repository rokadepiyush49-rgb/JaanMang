/**
 * The data access boundary for the government workspace.
 *
 * Screens never import `mock-data` directly — they go through this module. The
 * functions are already async and already shaped like an HTTP client, so
 * connecting the real backend (`/backend/api`) is a matter of replacing each
 * body with a `fetch`, leaving every component untouched.
 *
 *   export async function listProblems() {
 *     const res = await fetch(`${API}/gov/problems`, { headers: authHeaders() });
 *     return (await res.json()) as Problem[];
 *   }
 */

import {
  ALERTS,
  AUTOMATIONS,
  DEPARTMENTS,
  GOV_USERS,
  JURISDICTIONS,
  OFFICERS,
  PROBLEMS,
  REPORTS,
  SPONSORS,
  VILLAGES,
  WEEKLY_TREND,
} from "./mock-data";
import type {
  Automation,
  CitizenReport,
  Department,
  GovAlert,
  GovUser,
  Jurisdiction,
  Officer,
  Problem,
  Sponsor,
  Village,
} from "./types";

/**
 * The problem lifecycle is served by the backend now (`GovProvider` in
 * `store.tsx` loads `/api/gov/problems` on mount and validate/reject/route
 * persist). The reference reads below still return fixtures until their own
 * stages land; `seed` is what the store hydrates its not-yet-wired slices from.
 */
export const USING_MOCK_DATA = false;

export async function listProblems(): Promise<Problem[]> {
  const { GovApi } = await import("./api");
  return GovApi.listProblems();
}

export async function getProblem(id: string): Promise<Problem | undefined> {
  const { GovApi } = await import("./api");
  return GovApi.getProblem(id);
}

export async function listReports(problemId?: string): Promise<CitizenReport[]> {
  return problemId ? REPORTS.filter((r) => r.problemId === problemId) : REPORTS;
}

export async function listOfficers(): Promise<Officer[]> {
  return OFFICERS;
}

export async function listDepartments(): Promise<Department[]> {
  return DEPARTMENTS;
}

export async function listSponsors(): Promise<Sponsor[]> {
  return SPONSORS;
}

export async function listVillages(): Promise<Village[]> {
  return VILLAGES;
}

export async function listJurisdictions(): Promise<Jurisdiction[]> {
  return JURISDICTIONS;
}

export async function listAutomations(): Promise<Automation[]> {
  return AUTOMATIONS;
}

export async function listAlerts(): Promise<GovAlert[]> {
  return ALERTS;
}

export async function listUsers(): Promise<GovUser[]> {
  return GOV_USERS;
}

export async function weeklyTrend() {
  return WEEKLY_TREND;
}

/** The synchronous seed the client store hydrates from on first render. */
export const seed = {
  problems: PROBLEMS,
  reports: REPORTS,
  officers: OFFICERS,
  departments: DEPARTMENTS,
  sponsors: SPONSORS,
  villages: VILLAGES,
  jurisdictions: JURISDICTIONS,
  automations: AUTOMATIONS,
  alerts: ALERTS,
  users: GOV_USERS,
  trend: WEEKLY_TREND,
};
