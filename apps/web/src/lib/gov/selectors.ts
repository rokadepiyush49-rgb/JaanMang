/**
 * Derived readings shared by more than one screen.
 *
 * Keeping these out of components means the overview's "₹32 L sponsored" and
 * the funding screen's are the same computation, not two that happen to agree
 * today.
 */

import { sla } from "./format";
import { govSeed } from "./store";
import type { Department, Officer, Problem, RankedProblem } from "./types";

export function villageName(id: string) {
  return govSeed.villages.find((v) => v.id === id)?.name ?? id;
}

export function departmentName(id: string) {
  return govSeed.departments.find((d) => d.id === id)?.shortName ?? id;
}

export function department(id: string): Department | undefined {
  return govSeed.departments.find((d) => d.id === id);
}

export function sponsorName(id: string) {
  return govSeed.sponsors.find((s) => s.id === id)?.name ?? id;
}

export function sponsor(id: string) {
  return govSeed.sponsors.find((s) => s.id === id);
}

export function officerName(id: string | undefined, officers: Officer[]) {
  if (!id) return "Unassigned";
  return officers.find((o) => o.id === id)?.name ?? "Unassigned";
}

export function villagePopulation(problem: Problem) {
  return problem.villageIds.reduce(
    (sum, id) => sum + (govSeed.villages.find((v) => v.id === id)?.population ?? 0),
    0,
  );
}

/* ============================================================== money === */

export type MoneyBook = {
  allocated: number;
  committed: number;
  spent: number;
  available: number;
  sponsored: number;
  governmentFunded: number;
  pendingRequests: number;
  pendingAmount: number;
};

export function moneyBook(problems: Problem[]): MoneyBook {
  const allocated = govSeed.departments.reduce((s, d) => s + d.budgetAllocated, 0);
  const committed = govSeed.departments.reduce((s, d) => s + d.budgetCommitted, 0);
  const spent = govSeed.departments.reduce((s, d) => s + d.budgetSpent, 0);

  const sponsored = problems
    .filter((p) => p.sponsorship.status === "approved")
    .reduce((s, p) => s + (p.sponsorship.approvedAmount ?? 0), 0);

  const governmentFunded = problems
    .filter((p) => p.funding.status === "approved")
    .reduce((s, p) => s + p.funding.required, 0);

  const pending = problems.filter(
    (p) => p.funding.status === "recommended" || p.funding.status === "pending",
  );

  return {
    allocated,
    committed,
    spent,
    available: allocated - committed,
    sponsored,
    governmentFunded,
    pendingRequests: pending.length,
    pendingAmount: pending.reduce((s, p) => s + p.funding.required, 0),
  };
}

/* ============================================================== work === */

/** The load an officer is actually carrying, weighted so critical work counts. */
export function officerLoad(officer: Officer) {
  const weighted = officer.activeTasks + officer.criticalTasks * 1.5 + officer.overdue * 2;
  return Math.min(140, Math.round((weighted / officer.capacity) * 100));
}

/**
 * Who the next piece of work should go to: right department, lightest weighted
 * load, best completion record as the tie-break. The officer may ignore it —
 * that is the point of a recommendation.
 */
export function recommendOfficer(problem: Problem, officers: Officer[]): Officer | undefined {
  const eligible = officers.filter((o) => o.departmentId === problem.departmentId);
  return [...eligible].sort(
    (a, b) => officerLoad(a) - officerLoad(b) || b.completionRate - a.completionRate,
  )[0];
}

/* ============================================================= counts === */

export function kpiCounts(problems: RankedProblem[]) {
  const open = problems.filter((p) => p.status !== "resolved" && p.status !== "rejected");
  return {
    active: open.length,
    critical: open.filter((p) => p.severity === "critical").length,
    pendingValidation: problems.filter((p) => p.status === "pending_validation").length,
    awaitingSponsorship: problems.filter((p) => p.status === "awaiting_sponsorship").length,
    fundingRequired: problems.filter((p) => p.status === "funding_required").length,
    inProgress: problems.filter((p) => p.status === "in_progress").length,
    overdue: open.filter((p) => sla(p.slaDueAt).breached).length,
    resolved: problems.filter((p) => p.status === "resolved").length,
    verificationPending: problems.filter((p) => p.status === "verification_pending").length,
    citizensAffected: open.reduce((s, p) => s + p.affected, 0),
    reports: problems.reduce((s, p) => s + p.reportCount, 0),
    duplicates: problems.reduce((s, p) => s + p.duplicateCount, 0),
  };
}

/* ========================================================= next action === */

export type NextAction = {
  label: string;
  href: string;
  tone: "primary" | "outline";
};

/** Every problem in a queue must say what it is waiting for. */
export function nextAction(p: Problem): NextAction {
  switch (p.status) {
    case "pending_validation":
      return { label: "Validate", href: `/gov/problems/${p.id}`, tone: "primary" };
    case "awaiting_sponsorship":
      return {
        label: p.sponsorship.status === "awaiting" ? "Request sponsorship" : "Review sponsors",
        href: `/gov/problems/${p.id}#sponsorship`,
        tone: "primary",
      };
    case "funding_required":
      return { label: "Approve funding", href: `/gov/problems/${p.id}#funding`, tone: "primary" };
    case "in_progress":
      return p.assignedOfficerId
        ? { label: "Open project", href: `/gov/problems/${p.id}#project`, tone: "outline" }
        : { label: "Assign officer", href: `/gov/problems/${p.id}#assignment`, tone: "primary" };
    case "verification_pending":
      return { label: "Verify resolution", href: `/gov/problems/${p.id}#verification`, tone: "outline" };
    default:
      return { label: "Open", href: `/gov/problems/${p.id}`, tone: "outline" };
  }
}
