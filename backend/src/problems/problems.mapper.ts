import { Prisma } from '@prisma/client';
import type { ProblemRow } from './problems.repository';
import type {
  AiIntelligence,
  AuditEntry,
  Evidence,
  Funding,
  PriorityFactors,
  Project,
  ProblemDto,
  Sponsorship,
  Verification,
} from './problem.types';

/** Prisma Decimal | number | null → number. */
const num = (v: Prisma.Decimal | number | null | undefined): number =>
  v == null ? 0 : typeof v === 'number' ? v : v.toNumber();

const iso = (v: Date | null | undefined): string | undefined => v?.toISOString();

/**
 * DB row → the exact `Problem` shape apps/web/src/lib/gov/types.ts describes.
 * The web mock returned nested objects; so does this.
 */
export function toProblemDto(row: ProblemRow): ProblemDto {
  const factors: PriorityFactors = {
    populationImpact: row.factors?.populationImpact ?? 0,
    severity: row.factors?.severity ?? 0,
    deprivation: row.factors?.deprivation ?? 0,
    coverage: row.factors?.coverage ?? 0,
    duration: row.factors?.duration ?? 0,
    recurrence: row.factors?.recurrence ?? 0,
    repeatedDemand: row.factors?.repeatedDemand ?? 0,
    citizenVotes: row.factors?.citizenVotes ?? 0,
  };

  const ai: AiIntelligence = {
    category: (row.ai?.category ?? row.category) as AiIntelligence['category'],
    categoryConfidence: row.ai?.categoryConfidence ?? 0,
    severity: (row.ai?.severity ?? row.severity) as AiIntelligence['severity'],
    durationDays: row.ai?.durationDays ?? 0,
    affected: row.ai?.affected ?? row.affected,
    similarReports: row.ai?.similarReports ?? 0,
    clusterLabel: row.ai?.clusterLabel ?? row.title,
    originalQuote: row.ai?.originalQuote ?? '',
    originalLanguage: row.ai?.originalLanguage ?? 'Hindi',
    interpretation: (row.ai?.interpretation as AiIntelligence['interpretation']) ?? [],
    routedDepartmentId: row.ai?.routedDepartmentId ?? row.departmentId ?? '',
    routingReason: row.ai?.routingReason ?? '',
    routingOverridden:
      (row.ai?.routingOverridden as AiIntelligence['routingOverridden']) ?? undefined,
  };

  const sponsorship: Sponsorship = {
    status: (row.sponsorship?.status ?? 'not_eligible') as Sponsorship['status'],
    eligible: row.sponsorship?.eligible ?? false,
    invitedAt: iso(row.sponsorship?.invitedAt),
    responseDueAt: iso(row.sponsorship?.responseDueAt),
    approvedSponsorId: row.sponsorship?.approvedSponsorId ?? undefined,
    approvedAmount:
      row.sponsorship?.approvedAmount != null ? num(row.sponsorship.approvedAmount) : undefined,
    failureReason: row.sponsorship?.failureReason ?? undefined,
    matches: (row.sponsorMatches ?? []).map((m) => ({
      sponsorId: m.sponsorId,
      score: m.score,
      reasons: m.reasons,
      status: m.status as Sponsorship['matches'][number]['status'],
      respondedAt: iso(m.respondedAt),
      proposalAmount: m.proposalAmount != null ? num(m.proposalAmount) : undefined,
      note: m.note ?? undefined,
    })),
  };

  const funding: Funding = {
    status: (row.funding?.status ?? 'not_required') as Funding['status'],
    required: num(row.funding?.required),
    source: row.funding?.source ?? undefined,
    departmentBudgetAvailable: num(row.funding?.departmentBudgetAvailable),
    fundable: row.funding?.fundable ?? false,
    approvedAt: iso(row.funding?.approvedAt),
    approvedBy: row.funding?.approvedByName ?? undefined,
    note: row.funding?.note ?? undefined,
  };

  const govProject = row.projects?.[0];
  const project: Project | undefined = govProject
    ? {
        id: govProject.id,
        contractor: govProject.contractor ?? '',
        officerId: govProject.officerId ?? '',
        phase: govProject.phase as Project['phase'],
        progress: govProject.progress,
        budget: num(govProject.budget),
        spent: num(govProject.spent),
        startedAt: iso(govProject.startedAt) ?? '',
        dueAt: iso(govProject.dueAt) ?? '',
        dayOfPlan: govProject.dayOfPlan ?? 0,
        planDays: govProject.planDays ?? 0,
        milestones: (govProject.govMilestones as unknown as Project['milestones']) ?? [],
      }
    : undefined;

  const evidence: Evidence = {
    before: (row.evidence?.before as unknown as Evidence['before']) ?? {
      photos: 0,
      activeReports: 0,
      note: '',
    },
    after: (row.evidence?.after as unknown as Evidence['after']) ?? undefined,
  };

  const verification: Verification = {
    requestedAt: iso(row.verificationRequest?.requestedAt),
    asked: row.verificationRequest?.asked ?? 0,
    confirmed: row.verificationRequest?.confirmed ?? 0,
    denied: row.verificationRequest?.denied ?? 0,
    pending: row.verificationRequest?.pending ?? 0,
  };

  const audit: AuditEntry[] = (row.audit ?? []).map((a) => ({
    id: a.id,
    at: a.at.toISOString(),
    actor: a.actor as AuditEntry['actor'],
    actorName: a.actorName ?? undefined,
    action: a.action,
    detail: a.detail ?? undefined,
    automated: a.automated,
  }));

  return {
    id: row.id,
    title: row.title,
    category: row.category as ProblemDto['category'],
    status: row.status as ProblemDto['status'],
    severity: row.severity as ProblemDto['severity'],
    stage: row.stage as ProblemDto['stage'],
    jurisdictionId: row.jurisdictionId,
    villageIds: (row.villages ?? []).map((v) => v.villageId),
    reportCount: row.reportCount,
    duplicateCount: row.duplicateCount,
    affected: row.affected,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    slaDueAt: iso(row.slaDueAt) ?? row.createdAt.toISOString(),
    factors,
    adjustments: (row.adjustments ?? []).map((a) => ({
      label: a.label,
      points: a.points,
      reason: a.reason,
    })),
    estimatedCost: num(row.estimatedCost),
    departmentId: row.departmentId ?? '',
    assignedOfficerId: row.assignedOfficerId ?? undefined,
    ai,
    sponsorship,
    funding,
    project,
    evidence,
    verification,
    audit,
  };
}
