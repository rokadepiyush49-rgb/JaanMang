/**
 * What an industry partner is allowed to see.
 *
 * This is the only module permitted to turn a government `Problem` into an
 * industry `Challenge`, and it is deliberately the narrowest part of the
 * codebase. Everything a screen renders about a citizen problem has passed
 * through here, so a component cannot leak a field it was never handed.
 *
 * The rules, stated once:
 *
 *   • A problem is invisible until the government validates it. An unvalidated
 *     report is an allegation about a place and a person, and industry has no
 *     standing to read it.
 *   • Citizen identities never cross. Not names, not phone numbers, not the
 *     verbatim text of what somebody said about their own village, and not the
 *     coordinates of where they said it. Volume and cluster are aggregate and
 *     do cross, because "43 reports over 3 days" is what makes the case.
 *   • Officer identities are reduced to designations. The decision is public;
 *     who signed it is the government's business.
 *   • Internal government notes, routing overrides, rejection reasons and
 *     department budget positions do not cross at all.
 *   • Students appear as a team, a first name, a year and a discipline. Enough
 *     to hold a design review, not enough to approach someone off-platform.
 *
 * When real authentication arrives, the caller supplies a session instead of a
 * company id and nothing else in this file changes.
 */

import { JURISDICTIONS, PROBLEMS, VILLAGES } from "@/lib/gov/mock-data";
import { DEFAULT_WEIGHTS, scoreOf } from "@/lib/gov/priority";
import type { AuditEntry, Problem, Stage } from "@/lib/gov/types";
import { CATEGORY_DOMAIN, ENRICHMENT, NATIVE_CHALLENGES } from "./challenges";
import type { Challenge, ChallengeStatus, Contribution } from "./types";

/* ============================================================== policy === */

/**
 * The redaction policy, in the form a person can read.
 *
 * It is exported because the portal shows it: a partner who can see exactly
 * where the line is drawn trusts the data on their side of it more, not less.
 */
export const REDACTIONS: { visible: string; hidden: string }[] = [
  {
    visible: "Report volume, cluster label, duration and severity",
    hidden: "Individual reports, reporter names, phone numbers and verbatim text",
  },
  {
    visible: "Village names, population and deprivation index",
    hidden: "Report coordinates and any household-level location",
  },
  {
    visible: "That the government validated it, and which department owns it",
    hidden: "Which officer validated it, and their internal assessment notes",
  },
  {
    visible: "Estimated cost, funding required and every committed contribution",
    hidden: "Department budget positions and government funding deliberations",
  },
  {
    visible: "University, faculty mentor, team name, disciplines and first names",
    hidden: "Student surnames, contact details, marks and enrolment records",
  },
  {
    visible: "Milestones, deliverables and documents shared with you",
    hidden: "Government-internal documents and other partners' proposals",
  },
];

/** Stages at or beyond which a problem has been validated by a person. */
const PUBLISHED_STAGES: Stage[] = [
  "validated",
  "prioritised",
  "sponsorship",
  "funded",
  "assigned",
  "implementation",
  "verification",
  "impact",
];

export function isPublishable(problem: Problem): boolean {
  if (problem.status === "rejected" || problem.status === "pending_validation") return false;
  return PUBLISHED_STAGES.includes(problem.stage);
}

/* =========================================================== geography === */

function jurisdictionChain(id: string): string[] {
  const chain: string[] = [];
  let current = JURISDICTIONS.find((j) => j.id === id);
  while (current) {
    chain.push(current.name);
    const parentId: string | undefined = current.parentId;
    current = parentId ? JURISDICTIONS.find((j) => j.id === parentId) : undefined;
  }
  return chain;
}

/** Village names only — the coordinates stay on the government surface. */
function villageNames(ids: string[]): string[] {
  return ids.map((id) => VILLAGES.find((v) => v.id === id)?.name ?? id);
}

/** Population-weighted deprivation across the affected villages, as 0–100. */
function deprivationIndex(ids: string[]): number {
  const villages = ids
    .map((id) => VILLAGES.find((v) => v.id === id))
    .filter((v): v is NonNullable<typeof v> => Boolean(v));
  if (!villages.length) return 50;
  const population = villages.reduce((s, v) => s + v.population, 0);
  const weighted = villages.reduce((s, v) => s + v.deprivation * v.population, 0);
  return Math.round((weighted / Math.max(1, population)) * 100);
}

/* ============================================================ funding === */

/**
 * Money already on the table.
 *
 * Government contributions come from the problem's own funding record; industry
 * contributions come from the sponsorship record and from the enrichment, which
 * is where other partners' commitments live. Nothing is invented here — a
 * challenge with no contributions renders an empty ledger rather than a zero.
 */
function contributionsFor(problem: Problem): Contribution[] {
  const rows: Contribution[] = [];

  if (problem.sponsorship.status === "approved" && problem.sponsorship.approvedAmount) {
    const sponsor = problem.sponsorship.matches.find(
      (m) => m.sponsorId === problem.sponsorship.approvedSponsorId,
    );
    rows.push({
      id: `${problem.id}-sponsor`,
      party: sponsorLabel(sponsor?.sponsorId),
      kind: "industry",
      amount: problem.sponsorship.approvedAmount,
      status: "committed",
    });
  }

  if (problem.funding.status === "approved") {
    rows.push({
      id: `${problem.id}-gov`,
      party: problem.funding.source ?? "Government of Jharkhand",
      kind: "government",
      amount: problem.funding.required,
      status: "committed",
      at: problem.funding.approvedAt,
    });
  }

  const extra = ENRICHMENT[problem.id]?.contributions ?? [];
  return [...rows, ...extra];
}

const SPONSOR_LABEL: Record<string, string> = {
  "sp-tata": "Tata Steel Foundation",
  "sp-jindal": "Jindal Rural Infra Trust",
  "sp-hindalco": "Hindalco Community Trust",
  "sp-cclmine": "Central Coalfields CSR Cell",
  "sp-usha": "Usha Martin Foundation",
};

function sponsorLabel(id?: string) {
  return (id && SPONSOR_LABEL[id]) || "Industry partner";
}

function statusFor(problem: Problem, required: number, committed: number): ChallengeStatus {
  if (problem.status === "resolved") return "delivered";
  if (problem.status === "in_progress" || problem.status === "verification_pending") {
    return "in_delivery";
  }
  if (committed >= required && required > 0) return "fully_funded";
  if (committed > 0) return "partially_funded";
  return "awaiting_partner";
}

/* ========================================================= projection === */

/**
 * The projection itself.
 *
 * Every field is either copied from a government figure, derived from one by a
 * function in this file, or supplied by the industry enrichment. There is no
 * fourth source, which is what makes the numbers on an industry screen the same
 * numbers an officer is looking at.
 */
export function toChallenge(problem: Problem): Challenge {
  const enrichment = ENRICHMENT[problem.id];
  const chain = jurisdictionChain(problem.jurisdictionId);
  const contributions = contributionsFor(problem);
  const committed = contributions
    .filter((c) => c.status !== "proposed")
    .reduce((s, c) => s + c.amount, 0);
  const required = Math.max(0, problem.estimatedCost - committed);

  return {
    id: problem.id,
    title: problem.title,
    summary: enrichment?.summary ?? problem.ai.clusterLabel,
    domain: enrichment?.domain ?? CATEGORY_DOMAIN[problem.category],
    status: enrichment?.status ?? statusFor(problem, problem.estimatedCost, committed),
    severity: problem.severity,
    priority: scoreOf(problem, DEFAULT_WEIGHTS),

    state: chain[chain.length - 1] ?? "Jharkhand",
    district: chain.find((_, i) => i === chain.length - 2) ?? "Ranchi District",
    block: chain.length >= 3 ? chain[chain.length - 3] : chain[0],
    villages: villageNames(problem.villageIds),

    /* Aggregate only. `REPORTS` in the government fixture is never read here. */
    affected: problem.affected,
    reportCount: problem.reportCount,
    durationDays: problem.ai.durationDays,
    clusterLabel: problem.ai.clusterLabel,
    aiConfidence: problem.ai.categoryConfidence,
    deprivationIndex: deprivationIndex(problem.villageIds),

    governmentValidated: PUBLISHED_STAGES.includes(problem.stage),
    /* Designation and office, never the officer's name. */
    validatedBy: `${chain[0]} · ${departmentLabel(problem.departmentId)}`,
    department: departmentLabel(problem.departmentId),
    sanctionReference: enrichment?.sanctionReference,

    estimatedCost: problem.estimatedCost,
    fundingRequired: required,
    contributions,
    supportNeeded: enrichment?.supportNeeded ?? ["fund"],
    technologies: enrichment?.technologies ?? [],
    capabilitiesNeeded: enrichment?.capabilitiesNeeded ?? [],
    timelineDays: enrichment?.timelineDays ?? 120,
    sdgs: enrichment?.sdgs ?? [9, 17],

    universityId: enrichment?.universityId,
    teamId: enrichment?.teamId,
    projectId: enrichment?.projectId,

    expectedOutcomes: enrichment?.expectedOutcomes ?? [],
    evidence: [
      { label: "People affected", value: problem.affected.toLocaleString("en-IN"), source: `${problem.reportCount} citizen reports clustered as "${problem.ai.clusterLabel}", ${problem.ai.categoryConfidence}% classification confidence` },
      { label: "Villages", value: String(problem.villageIds.length), source: "Gram panchayat village register" },
      { label: "Duration", value: `${problem.ai.durationDays} days`, source: "Interval between the first report and the latest, unresolved" },
      { label: "Priority", value: `${scoreOf(problem, DEFAULT_WEIGHTS)} / 100`, source: "State priority weighting — population impact, severity, deprivation, coverage, duration, recurrence, repeated demand" },
      ...(enrichment?.evidence ?? []),
    ],
    publishedAt: problem.updatedAt,
    responseDueAt: problem.sponsorship.responseDueAt,
  };
}

const DEPARTMENT_LABEL: Record<string, string> = {
  "dept-water": "Drinking Water & Sanitation",
  "dept-pwd": "Rural Works",
  "dept-elec": "Electrical & Street Lighting",
  "dept-swm": "Solid Waste & Drainage",
  "dept-social": "Education & Health Infrastructure",
};

function departmentLabel(id: string) {
  return DEPARTMENT_LABEL[id] ?? "District Administration";
}

/* ============================================================ catalogue === */

/**
 * Every challenge an industry partner may see, government-derived first.
 *
 * Computed once at module load because the underlying fixtures are constant;
 * when a real API replaces them this becomes an async call in `service.ts` and
 * the shape returned does not change.
 */
export const PUBLIC_CHALLENGES: Challenge[] = [
  ...PROBLEMS.filter(isPublishable).map(toChallenge),
  ...NATIVE_CHALLENGES,
];

export function findChallenge(id: string): Challenge | undefined {
  return PUBLIC_CHALLENGES.find((c) => c.id === id);
}

/* ============================================================ timeline === */

/**
 * The public timeline of a challenge.
 *
 * Citizen entries are collapsed into a count, because "43 people reported this"
 * carries the weight without naming any of them. Officer entries keep the
 * decision and drop the officer. System and AI entries pass through unchanged —
 * they describe what the platform did, which is exactly what a partner is
 * entitled to audit.
 */
export function publicTimeline(problemId: string): AuditEntry[] {
  const problem = PROBLEMS.find((p) => p.id === problemId);
  if (!problem) return [];

  const citizenEntries = problem.audit.filter((e) => e.actor === "Citizen");
  const rest = problem.audit
    .filter((e) => e.actor !== "Citizen")
    .map((e) =>
      e.actor === "Officer"
        ? { ...e, actorName: `${problem.jurisdictionId.startsWith("gp") ? "Gram panchayat" : "District"} administration` }
        : e,
    );

  if (!citizenEntries.length) return rest;

  const first = citizenEntries[0];
  const collapsed: AuditEntry = {
    id: `${problemId}-citizen`,
    at: first.at,
    actor: "Citizen",
    actorName: `${problem.reportCount} residents`,
    action: `Reported by ${problem.reportCount} residents`,
    detail: `${problem.duplicateCount} duplicate reports folded in. Individual reports are not shared with partners.`,
    automated: false,
  };
  return [collapsed, ...rest].sort((a, b) => a.at.localeCompare(b.at));
}
