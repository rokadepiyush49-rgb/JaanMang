/**
 * Derived readings shared by more than one screen.
 *
 * Keeping these out of components is what makes the home page's "₹42.0 L
 * deployed" and the CSR ledger's the same computation rather than two that
 * happen to agree today. Every function here is pure and takes its inputs
 * explicitly, so a screen reading live store state and a screen reading the
 * fixture get identical answers.
 *
 * The rule this module holds to: no figure is a constant. Every total is a fold
 * over the projects, the ledger or the catalogue, so a change to one project
 * moves every screen that reports on it.
 */

import { SDGS } from "./vocabulary";
import { matchChallenge, type MatchContext, type MatchResult } from "./match";
import type {
  Challenge,
  CompanyProfile,
  Contribution,
  Domain,
  IndustryProject,
  MentorAssignment,
  MentorshipRequest,
  Milestone,
  StudentTeam,
  University,
} from "./types";

/* ============================================================= lookups === */

/**
 * The lookups used to close over fixture arrays — `UNIVERSITIES.find(...)`,
 * `TEAMS.find(...)` — which is how a module with no arguments ended up
 * deciding what a screen could see. They take their data as a parameter now,
 * because the data is the signed-in company's and arrives from the API.
 *
 * `sdgTitle` is the exception and stays closed over `SDGS`: the UN goals are
 * facts about the world, not rows in this database.
 */
export function university(list: University[], id?: string): University | undefined {
  return list.find((u) => u.id === id);
}

export function universityName(list: University[], id?: string): string {
  return university(list, id)?.shortName ?? "Not yet assigned";
}

export function team(list: StudentTeam[], id?: string): StudentTeam | undefined {
  return list.find((t) => t.id === id);
}

export function sdgTitle(n: number) {
  return SDGS.find((s) => s.number === n)?.short ?? `SDG ${n}`;
}

/* =========================================================== portfolio === */

export type PortfolioTotals = {
  projects: number;
  committed: number;
  disbursed: number;
  peopleImpacted: number;
  communities: number;
  students: number;
  universities: number;
  pilotsRunning: number;
  completed: number;
  clustersClosed: number;
  /** Committed rupees per person reached. The number CSR is actually judged on. */
  costPerBeneficiary: number;
  technologies: number;
  sdgs: number[];
};

export function portfolioTotals(
  projects: IndustryProject[],
  teams: StudentTeam[] = [],
): PortfolioTotals {
  const committed = projects.reduce((s, p) => s + p.investment.committed, 0);
  const peopleImpacted = projects.reduce((s, p) => s + p.peopleImpacted, 0);
  const technologies = new Set(
    projects.flatMap((p) => team(teams, p.teamId)?.skills ?? []),
  );

  return {
    projects: projects.length,
    committed,
    disbursed: projects.reduce((s, p) => s + p.investment.disbursed, 0),
    peopleImpacted,
    communities: projects.reduce((s, p) => s + p.villages, 0),
    students: projects.reduce((s, p) => s + (team(teams, p.teamId)?.memberCount ?? 0), 0),
    universities: new Set(projects.map((p) => p.universityId)).size,
    pilotsRunning: projects.filter((p) => p.stage === "pilot").length,
    completed: projects.filter((p) => p.stage === "impact").length,
    clustersClosed: projects.reduce((s, p) => s + p.clustersClosed, 0),
    costPerBeneficiary: peopleImpacted ? Math.round(committed / peopleImpacted) : 0,
    technologies: technologies.size,
    sdgs: [...new Set(projects.flatMap((p) => p.sdgs))].sort((a, b) => a - b),
  };
}

/* ============================================================= review === */

/** Milestones the company owes a decision on, newest deadline first. */
export function awaitingReview(projects: IndustryProject[]): {
  project: IndustryProject;
  milestone: Milestone;
}[] {
  return projects
    .flatMap((p) => p.milestones.filter((m) => m.awaitingReview).map((m) => ({ project: p, milestone: m })))
    .sort((a, b) => a.milestone.dueAt.localeCompare(b.milestone.dueAt));
}

/** Money that cannot move until somebody here reviews something. */
export function heldTranches(projects: IndustryProject[]): number {
  return awaitingReview(projects).reduce((s, r) => s + (r.milestone.trancheAmount ?? 0), 0);
}

/** Milestones delivered on or before the date they were promised. */
export function deliveryRecord(projects: IndustryProject[]) {
  const completed = projects.flatMap((p) => p.milestones.filter((m) => m.completedAt));
  const onTime = completed.filter((m) => (m.completedAt ?? "") <= m.dueAt);
  return {
    completed: completed.length,
    onTime: onTime.length,
    percent: completed.length ? Math.round((onTime.length / completed.length) * 100) : 0,
  };
}

/** Pilot success metrics met, across every running pilot. */
export function pilotTargets(projects: IndustryProject[]) {
  const metrics = projects.flatMap((p) => p.pilot?.metrics ?? []);
  const met = metrics.filter((m) => m.met);
  return {
    total: metrics.length,
    met: met.length,
    percent: metrics.length ? Math.round((met.length / metrics.length) * 100) : 0,
  };
}

/* =============================================================== csr === */

export type CsrBook = {
  financialYear: string;
  allocated: number;
  /** Everything committed, on the platform and off it. */
  committed: number;
  /** The share this platform accounts for — derived from the projects. */
  committedOnPlatform: number;
  /** Direct grants and programmes outside Jan Setu. */
  committedElsewhere: number;
  disbursed: number;
  available: number;
  /** Planned share against what has actually been committed in each domain. */
  byDomain: {
    domain: Domain;
    plannedShare: number;
    plannedAmount: number;
    committed: number;
    projects: number;
  }[];
};

export function csrBook(
  company: CompanyProfile,
  projects: IndustryProject[],
  challenges: Challenge[],
): CsrBook {
  const { csrBudget } = company;
  const disbursed = projects.reduce((s, p) => s + p.investment.disbursed, 0);
  /* Derived, so committing to a challenge moves the available figure in the
     header the moment the commitment is made. */
  const committedOnPlatform = projects.reduce((s, p) => s + p.investment.committed, 0);
  const committed = committedOnPlatform + csrBudget.committedElsewhere;

  const domainOf = (p: IndustryProject) =>
    challenges.find((c) => c.id === p.challengeId)?.domain;

  const byDomain = csrBudget.allocation.map((a) => {
    const mine = projects.filter((p) => domainOf(p) === a.domain);
    return {
      domain: a.domain,
      plannedShare: a.share,
      plannedAmount: Math.round((csrBudget.allocated * a.share) / 100),
      committed: mine.reduce((s, p) => s + p.investment.committed, 0),
      projects: mine.length,
    };
  });

  /* Domains carrying money that the board never allocated a share to are shown
     rather than silently folded into the last row — an unplanned commitment is
     exactly the thing a CSR committee needs to see. */
  const planned = new Set(csrBudget.allocation.map((a) => a.domain));
  for (const p of projects) {
    const domain = domainOf(p);
    if (!domain || planned.has(domain)) continue;
    const existing = byDomain.find((b) => b.domain === domain);
    if (existing) {
      existing.committed += p.investment.committed;
      existing.projects += 1;
    } else {
      byDomain.push({
        domain,
        plannedShare: 0,
        plannedAmount: 0,
        committed: p.investment.committed,
        projects: 1,
      });
    }
  }

  return {
    financialYear: csrBudget.financialYear,
    allocated: csrBudget.allocated,
    committed,
    committedOnPlatform,
    committedElsewhere: csrBudget.committedElsewhere,
    disbursed,
    available: Math.max(0, csrBudget.allocated - committed),
    byDomain: byDomain.sort((a, b) => b.committed - a.committed || b.plannedShare - a.plannedShare),
  };
}

/* ============================================================ funding === */

export type Ledger = {
  required: number;
  committed: number;
  proposed: number;
  outstanding: number;
  percent: number;
  ours: number;
  rows: Contribution[];
  fullyFunded: boolean;
};

/**
 * The funding position of one challenge.
 *
 * Proposed money is counted separately from committed money and never folded
 * into the progress bar. A partner who reads a bar as "80% funded" and finds
 * that half of it was somebody's unsigned intent will not read the next one.
 */
export function ledger(challenge: Challenge): Ledger {
  const rows = challenge.contributions;
  const committed = rows
    .filter((c) => c.status !== "proposed")
    .reduce((s, c) => s + c.amount, 0);
  const proposed = rows.filter((c) => c.status === "proposed").reduce((s, c) => s + c.amount, 0);
  const required = challenge.estimatedCost;

  return {
    required,
    committed,
    proposed,
    outstanding: Math.max(0, required - committed),
    percent: required ? Math.min(100, Math.round((committed / required) * 100)) : 0,
    ours: rows.filter((c) => c.isSelf).reduce((s, c) => s + c.amount, 0),
    rows,
    fullyFunded: committed >= required && required > 0,
  };
}

/* ========================================================= mentorship === */

/**
 * Requests nobody has answered yet.
 *
 * A request stays in the fixture after it is filled, because the assignment
 * that answered it points back at it — so "open" has to mean "no assignment
 * references this", not "exists". Counting the filled ones would put a standing
 * badge on the sidebar that never clears.
 */
export function openRequests(
  requests: MentorshipRequest[],
  assignments: MentorAssignment[],
): MentorshipRequest[] {
  const answered = new Set(assignments.map((a) => a.requestId));
  return requests.filter((r) => !answered.has(r.id));
}

export function mentorLoad(assignments: MentorAssignment[]) {
  const sessions = assignments.flatMap((a) => a.sessions);
  return {
    assignments: assignments.length,
    teams: new Set(assignments.map((a) => a.teamId)).size,
    upcoming: sessions.filter((s) => !s.done).length,
    hoursGiven: Math.round(sessions.filter((s) => s.done).reduce((s, x) => s + x.minutes, 0) / 60),
    openQuestions: assignments.flatMap((a) => a.openQuestions).filter((q) => !q.answered).length,
    feedbackRequests: assignments.reduce((s, a) => s + a.feedbackRequests, 0),
  };
}

/* ============================================================= match === */

/**
 * The context the match engine needs about relationships this company already
 * has. Derived from live projects and assignments rather than declared, so it
 * updates the moment a commitment is made.
 */
export function matchContext(
  projects: IndustryProject[],
  assignments: MentorAssignment[],
): MatchContext {
  return {
    partnerUniversityIds: [...new Set(projects.map((p) => p.universityId))],
    mentoredTeamIds: [...new Set(assignments.map((a) => a.teamId))],
  };
}

export type ScoredChallenge = { challenge: Challenge; match: MatchResult };

export function scoreAll(
  challenges: Challenge[],
  company: CompanyProfile,
  context: MatchContext,
): ScoredChallenge[] {
  return challenges.map((challenge) => ({
    challenge,
    match: matchChallenge(challenge, company, context),
  }));
}

/** Challenges still open to a partner — the only ones worth recommending. */
export function isOpen(challenge: Challenge) {
  return challenge.status === "awaiting_partner" || challenge.status === "partially_funded";
}

/**
 * The recommendation set: open challenges the company is not already delivering,
 * above the match threshold, best first.
 */
export function recommended(
  challenges: Challenge[],
  company: CompanyProfile,
  context: MatchContext,
  { threshold = 70, engagedIds = [] as string[] } = {},
): ScoredChallenge[] {
  return scoreAll(challenges.filter(isOpen), company, context)
    .filter((r) => r.match.score >= threshold && !engagedIds.includes(r.challenge.id))
    .sort((a, b) => b.match.score - a.match.score);
}

/* ============================================================= impact === */

export type SdgRollup = {
  number: number;
  short: string;
  projects: number;
  peopleImpacted: number;
  investment: number;
};

export function sdgRollup(projects: IndustryProject[]): SdgRollup[] {
  const map = new Map<number, SdgRollup>();
  for (const project of projects) {
    for (const n of project.sdgs) {
      const row = map.get(n) ?? {
        number: n,
        short: sdgTitle(n),
        projects: 0,
        peopleImpacted: 0,
        investment: 0,
      };
      row.projects += 1;
      row.peopleImpacted += project.peopleImpacted;
      row.investment += project.investment.committed;
      map.set(n, row);
    }
  }
  return [...map.values()].sort((a, b) => b.projects - a.projects || a.number - b.number);
}

export type UniversityRollup = {
  university: University;
  projects: IndustryProject[];
  students: number;
  investment: number;
  peopleImpacted: number;
};

export function universityRollup(
  projects: IndustryProject[],
  universities: University[],
  teams: StudentTeam[] = [],
): UniversityRollup[] {
  return universities.map((u) => {
    const mine = projects.filter((p) => p.universityId === u.id);
    return {
      university: u,
      projects: mine,
      students: mine.reduce((s, p) => s + (team(teams, p.teamId)?.memberCount ?? 0), 0),
      investment: mine.reduce((s, p) => s + p.investment.committed, 0),
      peopleImpacted: mine.reduce((s, p) => s + p.peopleImpacted, 0),
    };
  }).sort((a, b) => b.projects.length - a.projects.length || b.investment - a.investment);
}

export function domainRollup(projects: IndustryProject[], challenges: Challenge[]) {
  const map = new Map<Domain, { domain: Domain; projects: number; investment: number; peopleImpacted: number }>();
  for (const project of projects) {
    const domain = challenges.find((c) => c.id === project.challengeId)?.domain;
    if (!domain) continue;
    const row = map.get(domain) ?? { domain, projects: 0, investment: 0, peopleImpacted: 0 };
    row.projects += 1;
    row.investment += project.investment.committed;
    row.peopleImpacted += project.peopleImpacted;
    map.set(domain, row);
  }
  return [...map.values()].sort((a, b) => b.investment - a.investment);
}

export function geographyRollup(projects: IndustryProject[], challenges: Challenge[]) {
  const map = new Map<string, { state: string; projects: number; investment: number; peopleImpacted: number }>();
  for (const project of projects) {
    const state = challenges.find((c) => c.id === project.challengeId)?.state ?? "Unattributed";
    const row = map.get(state) ?? { state, projects: 0, investment: 0, peopleImpacted: 0 };
    row.projects += 1;
    row.investment += project.investment.committed;
    row.peopleImpacted += project.peopleImpacted;
    map.set(state, row);
  }
  return [...map.values()].sort((a, b) => b.investment - a.investment);
}

/* ================================================== impact per rupee === */

export type ImpactPerRupee = {
  investment: number;
  peopleImpacted: number;
  costPerBeneficiary: number;
  /** Verified against reported, so the reader knows how much is confirmed. */
  verifiedPeople: number;
  verifiedShare: number;
  clustersClosed: number;
  costPerClusterClosed: number;
};

/**
 * The CSR question, answered honestly.
 *
 * Reported reach and verified reach are separated, because a project at
 * prototype stage has a beneficiary count that is a plan, and one whose citizen
 * verification has closed has a beneficiary count that is a finding. Reporting
 * them as one number is how CSR impact claims stop meaning anything.
 */
export function impactPerRupee(projects: IndustryProject[]): ImpactPerRupee {
  const investment = projects.reduce((s, p) => s + p.investment.committed, 0);
  const peopleImpacted = projects.reduce((s, p) => s + p.peopleImpacted, 0);
  const verified = projects.filter((p) => p.stage === "impact" || p.stage === "deployment");
  const verifiedPeople = verified.reduce((s, p) => s + p.peopleImpacted, 0);
  const clustersClosed = projects.reduce((s, p) => s + p.clustersClosed, 0);

  return {
    investment,
    peopleImpacted,
    costPerBeneficiary: peopleImpacted ? Math.round(investment / peopleImpacted) : 0,
    verifiedPeople,
    verifiedShare: peopleImpacted ? Math.round((verifiedPeople / peopleImpacted) * 100) : 0,
    clustersClosed,
    costPerClusterClosed: clustersClosed ? Math.round(investment / clustersClosed) : 0,
  };
}
