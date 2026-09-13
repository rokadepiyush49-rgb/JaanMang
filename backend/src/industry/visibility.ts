import { $Enums, Prisma } from '@prisma/client';
import {
  DEFAULT_WEIGHTS,
  scoreOf,
  type PriorityFactors,
} from '../problems/priority/priority.engine';
import type { Domain } from './match.engine';

/**
 * What an industry partner is allowed to see.
 *
 * Ported from `apps/web/src/lib/industry/visibility.ts`, where it ran in the
 * browser. That was the wrong place for it: the module decided, client-side,
 * what a partner may see of a citizen's problem, and what it hid was names,
 * phone numbers, verbatim complaints and household coordinates. A boundary a
 * client enforces is not a boundary — it is a request that the client behave.
 * The API must never emit the unredacted shape to an industry caller, whatever
 * the client does with it.
 *
 * The rules, unchanged from the original, stated once:
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
 *     to hold a design review, not enough to approach somebody off-platform.
 *
 * The single most important property of this file: it builds its output by
 * *naming every field it copies*. It never spreads a database row. A projection
 * written as `{ ...problem, reporters: undefined }` leaks every column somebody
 * adds later; this one cannot, because a new column is simply not mentioned.
 */

/** The redaction policy, in the form a person can read. */
export const REDACTIONS: { visible: string; hidden: string }[] = [
  {
    visible: 'Report volume, cluster label, duration and severity',
    hidden: 'Individual reports, reporter names, phone numbers and verbatim text',
  },
  {
    visible: 'Village names, population and deprivation index',
    hidden: 'Report coordinates and any household-level location',
  },
  {
    visible: 'That the government validated it, and which department owns it',
    hidden: 'Which officer validated it, and their internal assessment notes',
  },
  {
    visible: 'Estimated cost, funding required and every committed contribution',
    hidden: 'Department budget positions and government funding deliberations',
  },
  {
    visible: 'University, faculty mentor, team name, disciplines and first names',
    hidden: 'Student surnames, contact details, marks and enrolment records',
  },
  {
    visible: 'Milestones, deliverables and documents shared with you',
    hidden: "Government-internal documents and other partners' proposals",
  },
];

/** Stages at or beyond which a problem has been validated by a person. */
export const PUBLISHED_STAGES: $Enums.Stage[] = [
  'validated',
  'prioritised',
  'sponsorship',
  'funded',
  'assigned',
  'implementation',
  'verification',
  'impact',
];

/**
 * The `where` clause that makes an unvalidated problem unreachable.
 *
 * Exported and used by *every* industry query rather than filtering after the
 * fact, so a route that forgets to project through `toChallenge` still cannot
 * return a row industry has no standing to read. Defence in depth: the filter
 * stops it leaving the database, the projection stops it leaving the process.
 */
export const PUBLISHABLE_WHERE = {
  deletedAt: null,
  stage: { in: PUBLISHED_STAGES },
  status: { notIn: ['rejected', 'pending_validation'] as $Enums.ProblemStatus[] },
} satisfies Prisma.ProblemWhereInput;

/**
 * Government problem category → industry domain.
 *
 * The domain vocabulary belongs to the industry surface, not to the government
 * one, and it is deliberately shorter: a partner's CSR board approves themes
 * like "Water & Sanitation", not nine municipal categories. Transcribed from
 * `apps/web/src/lib/industry/challenges.ts`; the nine values here are the whole
 * of the `Domain` union and nothing may be invented beyond them, because the
 * match engine's adjacency map is keyed on exactly these.
 */
export const CATEGORY_DOMAIN: Record<$Enums.ProblemCategory, Domain> = {
  water: 'water',
  sanitation: 'water',
  roads: 'infrastructure',
  bridge: 'infrastructure',
  drainage: 'infrastructure',
  streetlight: 'energy',
  waste: 'environment',
  school: 'education',
  health: 'health',
};

const SUPPORT_DEFAULT = ['fund'];

export interface ChallengeSource {
  id: string;
  title: string;
  category: $Enums.ProblemCategory;
  severity: $Enums.Severity;
  status: $Enums.ProblemStatus;
  stage: $Enums.Stage;
  affected: number;
  reportCount: number;
  estimatedCost: Prisma.Decimal;
  sdgGoals: number[];
  updatedAt: Date;
  departmentId: string | null;
  department: { name: string; shortName: string } | null;
  jurisdiction: { id: string; name: string; parentId: string | null };
  villages: { village: { name: string; population: number; deprivation: number } }[];
  ai: { clusterLabel: string; categoryConfidence: number; durationDays: number } | null;
  factors: PriorityFactors | null;
  adjustments: { label: string; points: number; reason: string }[];
  sponsorship: {
    status: $Enums.SponsorshipStatus;
    approvedSponsorId: string | null;
    approvedAmount: Prisma.Decimal | null;
    responseDueAt: Date | null;
  } | null;
  funding: {
    status: $Enums.FundingStatus;
    required: Prisma.Decimal;
    source: string | null;
    approvedAt: Date | null;
  } | null;
  profile: {
    summary: string;
    domain: string;
    technologies: string[];
    capabilitiesNeeded: string[];
    supportNeeded: string[];
    timelineDays: number;
    sanctionReference: string | null;
    expectedOutcomes: Prisma.JsonValue;
    evidence: Prisma.JsonValue;
    publishedAt: Date | null;
  } | null;
  /** Resolved by the caller: the administrative chain, outermost last. */
  jurisdictionChain: string[];
}

export interface Contribution {
  id: string;
  party: string;
  kind: 'industry' | 'government';
  amount: number;
  status: 'committed' | 'proposed';
  at?: string;
}

/**
 * A government problem as an industry partner may see it.
 *
 * Every field is copied from a government figure, derived from one by a
 * function in this file, or supplied by the challenge profile. There is no
 * fourth source, which is what makes the numbers on a partner's screen the
 * same numbers the officer is looking at.
 */
export function toChallenge(p: ChallengeSource): Record<string, unknown> {
  const villages = p.villages.map((v) => v.village);
  const contributions = contributionsFor(p);
  const committed = contributions
    .filter((c) => c.status !== 'proposed')
    .reduce((s, c) => s + c.amount, 0);
  const estimatedCost = Number(p.estimatedCost);
  const priority = p.factors ? scoreOf(p.factors, p.adjustments, DEFAULT_WEIGHTS) : 0;
  const durationDays = p.ai?.durationDays ?? 0;
  const clusterLabel = p.ai?.clusterLabel ?? p.title;
  const chain = p.jurisdictionChain;

  return {
    id: p.id,
    title: p.title,
    summary: p.profile?.summary ?? clusterLabel,
    domain: p.profile?.domain ?? CATEGORY_DOMAIN[p.category],
    status: statusFor(p, estimatedCost, committed),
    severity: p.severity,
    priority,

    /* -- where. Village names only; no coordinates leave the government. -- */
    state: chain[chain.length - 1] ?? 'Jharkhand',
    district: chain[chain.length - 2] ?? 'Ranchi District',
    block: chain.length >= 3 ? chain[chain.length - 3] : chain[0],
    villages: villages.map((v) => v.name),

    /* -- how much it matters. Aggregate only; reports are never listed. -- */
    affected: p.affected,
    reportCount: p.reportCount,
    durationDays,
    clusterLabel,
    aiConfidence: p.ai?.categoryConfidence ?? 0,
    deprivationIndex: deprivationIndex(villages),

    /* -- the government's position. Designation, never a name. ---------- */
    governmentValidated: PUBLISHED_STAGES.includes(p.stage),
    validatedBy: `${p.jurisdiction.name} · ${p.department?.name ?? 'District Administration'}`,
    department: p.department?.name ?? 'District Administration',
    sanctionReference: p.profile?.sanctionReference ?? undefined,

    /* -- what it needs -------------------------------------------------- */
    estimatedCost,
    fundingRequired: Math.max(0, estimatedCost - committed),
    contributions,
    supportNeeded: p.profile?.supportNeeded ?? SUPPORT_DEFAULT,
    technologies: p.profile?.technologies ?? [],
    capabilitiesNeeded: p.profile?.capabilitiesNeeded ?? [],
    timelineDays: p.profile?.timelineDays ?? 120,
    sdgs: p.sdgGoals,

    expectedOutcomes: p.profile?.expectedOutcomes ?? [],
    evidence: [
      {
        label: 'People affected',
        value: p.affected.toLocaleString('en-IN'),
        source: `${p.reportCount} citizen reports clustered as "${clusterLabel}"`,
      },
      {
        label: 'Villages',
        value: String(villages.length),
        source: 'Gram panchayat village register',
      },
      {
        label: 'Duration',
        value: `${durationDays} days`,
        source: 'Interval between the first report and the latest, unresolved',
      },
      {
        label: 'Priority',
        value: `${priority} / 100`,
        source:
          'State priority weighting — population impact, severity, deprivation, coverage, ' +
          'duration, recurrence, repeated demand, citizen votes',
      },
      ...(Array.isArray(p.profile?.evidence) ? p.profile.evidence : []),
    ],
    publishedAt: p.profile?.publishedAt?.toISOString() ?? p.updatedAt.toISOString(),
    responseDueAt: p.sponsorship?.responseDueAt?.toISOString(),
  };
}

/**
 * Money already on the table.
 *
 * Government contributions come from the problem's funding record, industry
 * ones from the sponsorship. Nothing is invented: a challenge with nothing
 * committed renders an empty ledger rather than a zero.
 *
 * Note what is *not* here — `Funding.departmentBudgetAvailable`, the
 * department's position, and any note attached to a funding decision. A partner
 * sees that ₹14.5 lakh was committed; they do not see how much room the
 * department had left or what was said while deciding.
 */
function contributionsFor(p: ChallengeSource): Contribution[] {
  const rows: Contribution[] = [];

  if (p.sponsorship?.status === 'approved' && p.sponsorship.approvedAmount) {
    rows.push({
      id: `${p.id}-sponsor`,
      party: p.sponsorship.approvedSponsorId ?? 'Industry partner',
      kind: 'industry',
      amount: Number(p.sponsorship.approvedAmount),
      status: 'committed',
    });
  }

  if (p.funding?.status === 'approved') {
    rows.push({
      id: `${p.id}-gov`,
      party: p.funding.source ?? 'Government of Jharkhand',
      kind: 'government',
      amount: Number(p.funding.required),
      status: 'committed',
      at: p.funding.approvedAt?.toISOString(),
    });
  }

  return rows;
}

/** Population-weighted deprivation across the affected villages, as 0–100. */
function deprivationIndex(villages: { population: number; deprivation: number }[]): number {
  if (villages.length === 0) return 50;
  const population = villages.reduce((s, v) => s + v.population, 0);
  const weighted = villages.reduce((s, v) => s + v.deprivation * v.population, 0);
  return Math.round((weighted / Math.max(1, population)) * 100);
}

function statusFor(p: ChallengeSource, required: number, committed: number): string {
  if (p.status === 'resolved') return 'delivered';
  if (p.status === 'in_progress' || p.status === 'verification_pending') return 'in_delivery';
  if (committed >= required && required > 0) return 'fully_funded';
  if (committed > 0) return 'partially_funded';
  return 'awaiting_partner';
}

/**
 * The public timeline of a challenge.
 *
 * Citizen entries collapse into a count, because "43 people reported this"
 * carries the weight without naming any of them. Officer entries keep the
 * decision and drop the officer. System and AI entries pass through unchanged —
 * they describe what the platform did, which is exactly what a partner is
 * entitled to audit.
 *
 * The access-log entries the AuditInterceptor writes never appear here: they
 * carry no `problemId`, and this reads a problem's timeline.
 */
export function publicTimeline(
  entries: {
    id: string;
    at: Date;
    actor: $Enums.AuditActor;
    actorName: string | null;
    action: string;
    detail: string | null;
    automated: boolean;
  }[],
  context: { problemId: string; reportCount: number; duplicateCount: number; officeLabel: string },
): Record<string, unknown>[] {
  const citizen = entries.filter((e) => e.actor === 'Citizen');

  const rest = entries
    .filter((e) => e.actor !== 'Citizen')
    .map((e) => ({
      id: e.id,
      at: e.at.toISOString(),
      actor: e.actor,
      // The office, never the officer.
      actorName: e.actor === 'Officer' ? context.officeLabel : (e.actorName ?? undefined),
      action: e.action,
      detail: e.detail ?? undefined,
      automated: e.automated,
    }));

  if (citizen.length === 0) return rest;

  const collapsed = {
    id: `${context.problemId}-citizen`,
    at: citizen[0].at.toISOString(),
    actor: 'Citizen' as const,
    actorName: `${context.reportCount} residents`,
    action: `Reported by ${context.reportCount} residents`,
    detail:
      `${context.duplicateCount} duplicate reports folded in. ` +
      'Individual reports are not shared with partners.',
    automated: false,
  };

  return [collapsed, ...rest].sort((a, b) => String(a.at).localeCompare(String(b.at)));
}
