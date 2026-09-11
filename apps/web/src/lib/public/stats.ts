import "server-only";
import { BACKEND } from "@/lib/auth/proxy-handler";

/**
 * The public statistics the landing page renders.
 *
 * Read server-side from `/api/v1/public/stats`, which counts the live figures
 * from the tables that hold them and reads the historical series from
 * `platform_year_stats`. Every row carries its own `provenance` line, and the
 * page prints it — the product refuses to show a resolution-time metric it
 * cannot compute from its sources, and a marketing page does not get an
 * exemption from that rule.
 *
 * If the backend is unreachable the page still renders: `FALLBACK` is the same
 * shape with zeroes and a provenance line that says the figures could not be
 * loaded, which is more honest than a hard-coded number that looks real.
 */

export type YearPoint = {
  year: number;
  reportsSubmitted: number;
  problemsValidated: number;
  problemsResolved: number;
  citizensVerifying: number;
  villagesCovered: number;
  panchayatsOnboard: number;
  studentsEngaged: number;
  partnerOrgs: number;
  fundsRouted: number;
  provenance: string;
};

export type PlatformStats = {
  totals: {
    reportsSubmitted: number;
    problemsValidated: number;
    problemsResolved: number;
    citizensVerifying: number;
    villagesCovered: number;
    panchayatsOnboard: number;
    studentsEngaged: number;
    partnerOrgs: number;
    fundsRouted: number;
  };
  series: YearPoint[];
  growth: {
    fromYear: number;
    toYear: number;
    reportsMultiple: number;
    resolutionRate: number;
    panchayatsAdded: number;
  } | null;
  live: {
    reports: number;
    problems: number;
    resolved: number;
    villages: number;
    localBodies: number;
    partnerOrgs: number;
    students: number;
  };
  categories: { category: string; problems: number; affected: number }[];
  weeklyTrend: { week: string; reported: number; resolved: number }[];
  provenance: string;
  available: boolean;
};

const FALLBACK: PlatformStats = {
  totals: {
    reportsSubmitted: 0,
    problemsValidated: 0,
    problemsResolved: 0,
    citizensVerifying: 0,
    villagesCovered: 0,
    panchayatsOnboard: 0,
    studentsEngaged: 0,
    partnerOrgs: 0,
    fundsRouted: 0,
  },
  series: [],
  growth: null,
  live: {
    reports: 0,
    problems: 0,
    resolved: 0,
    villages: 0,
    localBodies: 0,
    partnerOrgs: 0,
    students: 0,
  },
  categories: [],
  weeklyTrend: [],
  provenance: "Statistics could not be loaded — the API was unreachable.",
  available: false,
};

export async function fetchPlatformStats(): Promise<PlatformStats> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/public/stats`, { cache: "no-store" });
    if (!res.ok) return FALLBACK;
    const json = (await res.json()) as Omit<PlatformStats, "available">;
    return { ...json, available: true };
  } catch {
    return FALLBACK;
  }
}
