/**
 * Saved views — the shared vocabulary between the KPI cards, the problems
 * table, the map and the alert actions.
 *
 * A KPI that cannot be opened is decoration. Every headline figure on the
 * overview is defined here as a predicate, so clicking it lands on the problems
 * table showing exactly the rows that produced the number.
 */

import { sla } from "./format";
import type { Problem, ProblemCategory, RankedProblem } from "./types";

export type ViewKey =
  | "all"
  | "active"
  | "critical"
  | "pending_validation"
  | "awaiting_sponsorship"
  | "funding_required"
  | "in_progress"
  | "overdue"
  | "verification_pending"
  | "resolved";

export const VIEWS: Record<ViewKey, { label: string; description: string; test: (p: Problem) => boolean }> = {
  all: { label: "All problems", description: "Every problem in your jurisdiction", test: () => true },
  active: {
    label: "Active problems",
    description: "Open problems at any stage before citizen verification closes",
    test: (p) => p.status !== "resolved" && p.status !== "rejected",
  },
  critical: {
    label: "Critical problems",
    description: "Severity critical and still open",
    test: (p) => p.severity === "critical" && p.status !== "resolved",
  },
  pending_validation: {
    label: "Pending validation",
    description: "Classified and clustered — waiting for an officer to confirm",
    test: (p) => p.status === "pending_validation",
  },
  awaiting_sponsorship: {
    label: "Awaiting sponsorship",
    description: "With industry, inside the CSR response window",
    test: (p) => p.status === "awaiting_sponsorship",
  },
  funding_required: {
    label: "Government funding required",
    description: "Industry route closed — needs a government funding decision",
    test: (p) => p.status === "funding_required",
  },
  in_progress: {
    label: "In progress",
    description: "Funded and under implementation",
    test: (p) => p.status === "in_progress",
  },
  overdue: {
    label: "SLA breached",
    description: "Past the committed date for the current stage",
    test: (p) => sla(p.slaDueAt).breached && p.status !== "resolved",
  },
  verification_pending: {
    label: "Citizen verification pending",
    description: "Work finished — waiting for reporters to confirm",
    test: (p) => p.status === "verification_pending",
  },
  resolved: {
    label: "Resolved & verified",
    description: "Closed by citizen confirmation",
    test: (p) => p.status === "resolved",
  },
};

export function isViewKey(value: string | null | undefined): value is ViewKey {
  return !!value && value in VIEWS;
}

export const CATEGORY_LABEL: Record<ProblemCategory, string> = {
  water: "Water Supply",
  roads: "Roads",
  drainage: "Drainage",
  streetlight: "Street Lighting",
  waste: "Waste Collection",
  bridge: "Bridges",
  sanitation: "Sanitation",
  school: "School Infrastructure",
  health: "Health Infrastructure",
};

export const CATEGORY_ICON = {
  water: "droplet",
  roads: "map",
  drainage: "droplet",
  streetlight: "bulb",
  waste: "leaf",
  bridge: "landmark",
  sanitation: "shield",
  school: "graduation",
  health: "heart",
} as const;

export type ProblemFilters = {
  view: ViewKey;
  query: string;
  category: string;
  village: string;
  department: string;
  sponsorship: string;
  funding: string;
};

export const EMPTY_FILTERS: ProblemFilters = {
  view: "active",
  query: "",
  category: "All",
  village: "All",
  department: "All",
  sponsorship: "All",
  funding: "All",
};

/** Applied in the order a person would read them: view, then text, then facets. */
export function applyFilters(
  problems: RankedProblem[],
  filters: ProblemFilters,
  lookup: { villageName: (id: string) => string; departmentName: (id: string) => string },
): RankedProblem[] {
  const q = filters.query.trim().toLowerCase();
  return problems.filter((p) => {
    if (!VIEWS[filters.view].test(p)) return false;
    if (filters.category !== "All" && CATEGORY_LABEL[p.category] !== filters.category) return false;
    if (filters.village !== "All" && !p.villageIds.some((v) => lookup.villageName(v) === filters.village))
      return false;
    if (filters.department !== "All" && lookup.departmentName(p.departmentId) !== filters.department)
      return false;
    if (filters.sponsorship !== "All" && p.sponsorship.status !== filters.sponsorship) return false;
    if (filters.funding !== "All" && p.funding.status !== filters.funding) return false;
    if (q) {
      const haystack = [
        p.id,
        p.title,
        CATEGORY_LABEL[p.category],
        p.ai.clusterLabel,
        ...p.villageIds.map(lookup.villageName),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
