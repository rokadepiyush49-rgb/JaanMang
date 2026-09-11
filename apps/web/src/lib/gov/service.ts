/**
 * The data access boundary for the government workspace.
 *
 * Every function below is a real call to `/api/v1/gov/*` or
 * `/api/v1/geography/*`. It did not use to be: the problem lifecycle was
 * server-backed while officers, departments, sponsors, villages, jurisdictions,
 * automations, alerts, users, reports and the weekly trend all returned the
 * fixtures in `mock-data.ts` — even though the endpoints serving exactly those
 * shapes already existed. The workspace therefore showed a roster of invented
 * officers next to real problems, and routing a problem to a "department" that
 * had no row behind it was a mutation against a name the database had never
 * heard of.
 *
 * `mock-data.ts` is still in the tree because the backend seed is generated
 * from it (`backend/prisma/seed/`) and because `lib/industry` has not been
 * wired yet. Nothing in the government workspace reads it any more.
 *
 * ── On `seed` ──────────────────────────────────────────────────────────────
 * `seed` is the synchronous reference cache the screens read through
 * `govSeed` — twelve of them look up a village or a department name during
 * render, and threading an async call through all of those lookups would be a
 * rewrite rather than a wiring change. So it starts *empty* and is filled in
 * place by `loadReference()` before the workspace renders anything (the shell
 * holds a skeleton until the store reports hydrated). Empty is the right
 * initial value: a half-rendered screen shows nothing rather than showing
 * fiction.
 */

import { api } from "@/lib/api/client";
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
  WeeklyTrendPoint,
} from "./types";

/** Kept for `/gov/settings`, which shows the reader where its data comes from. */
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
  return api.get<CitizenReport[]>(
    problemId ? `gov/reports?problemId=${encodeURIComponent(problemId)}` : "gov/reports",
  );
}

export async function listOfficers(): Promise<Officer[]> {
  return api.get<Officer[]>("gov/officers");
}

export async function listDepartments(): Promise<Department[]> {
  return api.get<Department[]>("gov/departments");
}

export async function listSponsors(): Promise<Sponsor[]> {
  return api.get<Sponsor[]>("gov/sponsors");
}

export async function listVillages(): Promise<Village[]> {
  return api.get<Village[]>("geography/villages");
}

export async function listJurisdictions(): Promise<Jurisdiction[]> {
  return api.get<Jurisdiction[]>("geography/jurisdictions");
}

export async function listAutomations(): Promise<Automation[]> {
  return api.get<Automation[]>("gov/automations");
}

export async function listAlerts(): Promise<GovAlert[]> {
  return api.get<GovAlert[]>("gov/alerts");
}

export async function listUsers(): Promise<GovUser[]> {
  return api.get<GovUser[]>("gov/users");
}

export async function weeklyTrend(): Promise<WeeklyTrendPoint[]> {
  return api.get<WeeklyTrendPoint[]>("gov/analytics/weekly-trend");
}

/* ======================================================= the reference === */

export type GovReference = {
  reports: CitizenReport[];
  officers: Officer[];
  departments: Department[];
  sponsors: Sponsor[];
  villages: Village[];
  jurisdictions: Jurisdiction[];
  automations: Automation[];
  alerts: GovAlert[];
  users: GovUser[];
  trend: WeeklyTrendPoint[];
};

/**
 * The synchronous reference the screens read from. Empty until `loadReference`
 * fills it; see the note at the top of this file for why it is mutated in place
 * rather than being held in React state.
 *
 * `problems` is here only because two screens want the unscoped total — "12 of
 * 40 records in the system" — which is a different number from the list the
 * officer is allowed to see.
 */
export const seed: GovReference & { problems: Problem[] } = {
  problems: [],
  reports: [],
  officers: [],
  departments: [],
  sponsors: [],
  villages: [],
  jurisdictions: [],
  automations: [],
  alerts: [],
  users: [],
  trend: [],
};

/**
 * Fetch every reference list in one round of parallel requests and write them
 * into `seed`.
 *
 * All ten are issued together rather than sequentially: they are independent
 * reads and the workspace is blocked on the slowest one either way. A single
 * rejection fails the whole load, which is the honest outcome — a workspace
 * missing its department list is not a workspace with a smaller department
 * list, it is one that will mis-render every routing dialog.
 */
export async function loadReference(): Promise<GovReference> {
  const [
    reports,
    officers,
    departments,
    sponsors,
    villages,
    jurisdictions,
    automations,
    alerts,
    users,
    trend,
  ] = await Promise.all([
    listReports(),
    listOfficers(),
    listDepartments(),
    listSponsors(),
    listVillages(),
    listJurisdictions(),
    listAutomations(),
    listAlerts(),
    listUsers(),
    weeklyTrend(),
  ]);

  const reference: GovReference = {
    reports,
    officers,
    departments,
    sponsors,
    villages,
    jurisdictions,
    automations,
    alerts,
    users,
    trend,
  };

  Object.assign(seed, reference);
  return reference;
}

/** Records the unscoped problem total the register footer quotes. */
export function setSeedProblems(problems: Problem[]): void {
  seed.problems = problems;
}
