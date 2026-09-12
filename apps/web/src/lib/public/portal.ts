import "server-only";
import { BACKEND } from "@/lib/auth/proxy-handler";

/**
 * The public portal's data.
 *
 * Read server-side and directly from the API — no session, because there is no
 * session: these pages are the one part of the product a stranger can open. A
 * failure renders an honest empty state rather than a hard-coded number that
 * looks real, which is the same rule `stats.ts` already follows.
 */

export type PublicProblem = {
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
  department: string | null;
  estimatedCost: number;
  reportedAt: string;
  updatedAt: string;
  verification: { asked: number; confirmed: number; denied: number; pending: number } | null;
};

export type EvidenceSideDto = {
  photos: number;
  note: string | null;
  images: { key: string; url: string }[];
};

export type PublicProblemDetail = PublicProblem & {
  evidence: { before: EvidenceSideDto | null; after: EvidenceSideDto | null };
  project: {
    id: string;
    title: string;
    phase: string;
    progress: number;
    budget: number;
    spent: number;
    startedAt: string | null;
    rating: number | null;
    ratingCount: number;
  } | null;
  ledger: {
    amount: number;
    department: string;
    fiscalYear: string;
    stage: string;
    at: string;
  }[];
};

export type PublicImpact = {
  totals: {
    problemsPublished: number;
    problemsVerified: number;
    citizensAffected: number;
    reportsFiled: number;
    fundsCommitted: number;
    fundsDisbursed: number;
    beforeAfterPairs: number;
    averageDeliveryRating: number | null;
  };
  districts: {
    name: string;
    population: number | null;
    problems: number;
    verified: number;
    affected: number;
    reports: number;
    committed: number;
  }[];
  sdgs: { number: number; citizensAffected: number }[];
  categories: { category: string; problems: number; verified: number }[];
  provenance: string;
  computedAt: string;
};

export type PublicLedger = {
  entries: {
    title: string;
    amount: number;
    department: string;
    fiscalYear: string;
    stage: string;
    at: string;
    problemId: string | null;
    verifiedByCitizens: boolean;
  }[];
  total: number;
  fiscalYears: string[];
};

export type PublicLeaderboard = {
  scope: string;
  computedAt: string | null;
  entries: {
    rank: number;
    previousRank: number | null;
    subjectId: string;
    name: string;
    score: number;
    breakdown: Record<string, unknown>;
  }[];
  formula: { label: string; weight: string }[];
};

async function get<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/public/${path}`, { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    // The portal renders its empty state. A page that 500s because the API is
    // restarting is a worse answer than one that says it has nothing to show.
    return fallback;
  }
}

export const Portal = {
  problems: (query: Record<string, string | undefined> = {}) => {
    const search = new URLSearchParams(
      Object.entries(query).filter(([, v]) => Boolean(v)) as [string, string][],
    ).toString();
    return get<PublicProblem[]>(`problems${search ? `?${search}` : ""}`, []);
  },

  problem: async (id: string): Promise<PublicProblemDetail | null> => {
    try {
      const res = await fetch(`${BACKEND}/api/v1/public/problems/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!res.ok) return null;
      return (await res.json()) as PublicProblemDetail;
    } catch {
      return null;
    }
  },

  impact: () =>
    get<PublicImpact>("impact", {
      totals: {
        problemsPublished: 0,
        problemsVerified: 0,
        citizensAffected: 0,
        reportsFiled: 0,
        fundsCommitted: 0,
        fundsDisbursed: 0,
        beforeAfterPairs: 0,
        averageDeliveryRating: null,
      },
      districts: [],
      sdgs: [],
      categories: [],
      provenance: "The impact figures could not be loaded.",
      computedAt: new Date().toISOString(),
    }),

  ledger: (fiscalYear?: string) =>
    get<PublicLedger>(`ledger${fiscalYear ? `?fiscalYear=${fiscalYear}` : ""}`, {
      entries: [],
      total: 0,
      fiscalYears: [],
    }),

  leaderboard: (scope: string) =>
    get<PublicLeaderboard>(`leaderboard/${scope}`, {
      scope,
      computedAt: null,
      entries: [],
      formula: [],
    }),
};

/** The UN goals, for labelling. Facts about the world, not rows in a database. */
export const SDG_LABEL: Record<number, string> = {
  1: "No Poverty",
  2: "Zero Hunger",
  3: "Good Health and Well-being",
  4: "Quality Education",
  5: "Gender Equality",
  6: "Clean Water and Sanitation",
  7: "Affordable and Clean Energy",
  8: "Decent Work and Economic Growth",
  9: "Industry, Innovation and Infrastructure",
  10: "Reduced Inequalities",
  11: "Sustainable Cities and Communities",
  12: "Responsible Consumption and Production",
  13: "Climate Action",
  14: "Life Below Water",
  15: "Life on Land",
  16: "Peace, Justice and Strong Institutions",
  17: "Partnerships for the Goals",
};

export const CATEGORY_LABEL: Record<string, string> = {
  water: "Water supply",
  roads: "Roads",
  drainage: "Drainage",
  streetlight: "Street lighting",
  waste: "Waste collection",
  bridge: "Bridges",
  sanitation: "Sanitation",
  school: "Schools",
  health: "Health",
};

export function rupees(value: number): string {
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(1)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}
