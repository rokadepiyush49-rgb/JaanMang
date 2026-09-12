import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as argon2 from 'argon2';
import { $Enums, Prisma, PrismaClient } from '@prisma/client';

/**
 * Seeds the government workspace from the fixtures apps/web was reviewed
 * against — same 12 problems, same ~96 reports, same priority factors, same
 * Nagri / Ranchi geography. Extracted by `npm run fixtures:extract` into
 * fixtures/gov.json so the numbers can never drift from the web app.
 *
 * The three government users get a dev password so `/gov/login` works out of
 * the box:  <id>@jansetu.local  /  jansetu-dev
 */

const DEV_PASSWORD = 'jansetu-dev';

type Fixture = {
  defaultWeights: Record<string, number>;
  jurisdictions: {
    id: string;
    level: string;
    name: string;
    parentId?: string;
    population: number;
  }[];
  villages: {
    id: string;
    name: string;
    jurisdictionId: string;
    population: number;
    deprivation: number;
    lat: number;
    lng: number;
  }[];
  departments: {
    id: string;
    name: string;
    shortName: string;
    categories: string[];
    headOfficerId: string;
    budgetAllocated: number;
    budgetCommitted: number;
    budgetSpent: number;
    slaHours: number;
  }[];
  officers: {
    id: string;
    name: string;
    designation: string;
    departmentId: string;
    jurisdictionId: string;
    phone: string;
    activeTasks: number;
    criticalTasks: number;
    overdue: number;
    completionRate: number;
    avgResolutionDays: number;
    capacity: number;
  }[];
  govUsers: {
    id: string;
    name: string;
    designation: string;
    level: 'panchayat' | 'block' | 'district';
    jurisdictionId: string;
    permissions: string[];
  }[];
  sponsors: {
    id: string;
    name: string;
    sector: string;
    csrThemes: string[];
    csrGeographies: string[];
    csrBudgetRemaining: number;
    responseRate: number;
  }[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  problems: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reports: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  automations: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  alerts: any[];
  weeklyTrend: { week: string; reported: number; resolved: number; priorityAvg: number }[];
};

const LEVEL_ROLE: Record<string, string> = {
  panchayat: 'gov_panchayat',
  block: 'gov_block',
  district: 'gov_district',
};

export async function seedGov(prisma: PrismaClient): Promise<{ devLogins: string[] }> {
  const fixture = JSON.parse(
    readFileSync(resolve(__dirname, 'fixtures/gov.json'), 'utf8'),
  ) as Fixture;

  /* -- geography ---------------------------------------------------------- */
  for (const j of fixture.jurisdictions) {
    await prisma.jurisdiction.create({
      data: {
        id: j.id,
        level: j.level as Prisma.JurisdictionCreateInput['level'],
        name: j.name,
        parentId: j.parentId ?? null,
        population: j.population,
      },
    });
  }
  for (const v of fixture.villages) {
    await prisma.village.create({ data: v });
  }

  /* -- departments ------------------------------------------------------- */
  for (const dep of fixture.departments) {
    await prisma.department.create({
      data: {
        id: dep.id,
        name: dep.name,
        shortName: dep.shortName,
        categories: dep.categories as Prisma.DepartmentCreateInput['categories'],
        headOfficerId: dep.headOfficerId,
        budgetAllocated: dep.budgetAllocated,
        budgetCommitted: dep.budgetCommitted,
        budgetSpent: dep.budgetSpent,
        slaHours: dep.slaHours,
      },
    });
  }

  /* -- officers (User + Officer + gov_field_officer role) --------------- */
  const fieldRole = await prisma.role.findUniqueOrThrow({ where: { key: 'gov_field_officer' } });
  for (const o of fixture.officers) {
    await prisma.user.create({
      data: {
        id: o.id,
        kind: 'staff',
        displayName: o.name,
        email: `${o.id}@jansetu.local`,
        phone: o.phone.replace(/\s/g, ''),
        officer: {
          create: {
            departmentId: o.departmentId,
            jurisdictionId: o.jurisdictionId,
            designation: o.designation,
            phone: o.phone,
            capacity: o.capacity,
            activeTasks: o.activeTasks,
            criticalTasks: o.criticalTasks,
            overdue: o.overdue,
            completionRate: o.completionRate,
            avgResolutionDays: o.avgResolutionDays,
          },
        },
        roles: { create: { roleId: fieldRole.id, jurisdictionId: o.jurisdictionId } },
      },
    });
  }

  /* -- government decision-makers -------------------------------------- */
  const devLogins: string[] = [];
  const passwordHash = await argon2.hash(DEV_PASSWORD, { type: argon2.argon2id });
  for (const u of fixture.govUsers) {
    const role = await prisma.role.findUniqueOrThrow({ where: { key: LEVEL_ROLE[u.level] } });
    const email = `${u.id}@jansetu.local`;
    await prisma.user.create({
      data: {
        id: u.id,
        kind: 'staff',
        displayName: u.name,
        email,
        passwordHash,
        emailVerifiedAt: new Date(),
        roles: { create: { roleId: role.id, jurisdictionId: u.jurisdictionId } },
      },
    });
    devLogins.push(`${email}  (${u.designation})`);
  }

  /* -- sponsors -------------------------------------------------------- */
  for (const s of fixture.sponsors) {
    await prisma.sponsor.create({
      data: {
        id: s.id,
        name: s.name,
        sector: s.sector,
        csrThemes: s.csrThemes,
        csrGeographies: s.csrGeographies,
        csrBudgetRemaining: s.csrBudgetRemaining,
        responseRate: s.responseRate,
      },
    });
  }

  /* -- published priority weighting ---------------------------------- */
  await prisma.priorityWeightSet.create({
    data: { jurisdictionId: null, published: true, weights: fixture.defaultWeights },
  });

  /* -- problems + every dependent record ---------------------------- */
  const userByName = await buildNameIndex(prisma);

  for (const p of fixture.problems) {
    await prisma.problem.create({
      data: {
        id: p.id,
        title: p.title,
        category: p.category,
        status: p.status,
        severity: p.severity,
        stage: p.stage,
        jurisdictionId: p.jurisdictionId,
        reportCount: p.reportCount,
        // `voteCount` is deliberately NOT seeded here, even though the fixture
        // carries one for the web mock store. A vote is a row, and a counter
        // that disagrees with the rows it counts is worse than no counter:
        // seeding 19 here with no ProblemVote rows to match would mean the
        // first real vote *lowered* the count from 19 to 1. seedParticipation
        // creates the votes and sets the counter from them, in that order.
        duplicateCount: p.duplicateCount,
        affected: p.affected,
        slaDueAt: date(p.slaDueAt),
        estimatedCost: p.estimatedCost,
        departmentId: p.departmentId,
        assignedOfficerId: p.assignedOfficerId ?? null,
        createdAt: date(p.createdAt)!,
        updatedAt: date(p.updatedAt)!,

        villages: {
          create: (p.villageIds as string[]).map((villageId) => ({ villageId })),
        },

        ai: {
          create: {
            category: p.ai.category,
            categoryConfidence: p.ai.categoryConfidence,
            severity: p.ai.severity,
            durationDays: p.ai.durationDays,
            affected: p.ai.affected,
            similarReports: p.ai.similarReports,
            clusterLabel: p.ai.clusterLabel,
            originalQuote: p.ai.originalQuote,
            originalLanguage: p.ai.originalLanguage,
            interpretation: p.ai.interpretation,
            routedDepartmentId: p.ai.routedDepartmentId ?? null,
            routingReason: p.ai.routingReason,
            routingOverridden: p.ai.routingOverridden ?? Prisma.DbNull,
          },
        },

        factors: { create: p.factors },

        adjustments: {
          create: (p.adjustments as { label: string; points: number; reason: string }[]).map(
            (a) => a,
          ),
        },

        sponsorship: {
          create: {
            status: p.sponsorship.status,
            eligible: p.sponsorship.eligible,
            invitedAt: date(p.sponsorship.invitedAt),
            responseDueAt: date(p.sponsorship.responseDueAt),
            approvedSponsorId: p.sponsorship.approvedSponsorId ?? null,
            approvedAmount: p.sponsorship.approvedAmount ?? null,
            failureReason: p.sponsorship.failureReason ?? null,
          },
        },

        sponsorMatches: {
          create: (p.sponsorship.matches as SponsorMatchSeed[]).map((m) => ({
            sponsor: { connect: { id: m.sponsorId } },
            score: m.score,
            reasons: m.reasons,
            status: m.status as $Enums.SponsorMatchStatus,
            respondedAt: date(m.respondedAt),
            proposalAmount: m.proposalAmount ?? null,
            note: m.note ?? null,
          })),
        },

        funding: {
          create: {
            status: p.funding.status,
            required: p.funding.required,
            source: p.funding.source ?? null,
            departmentBudgetAvailable: p.funding.departmentBudgetAvailable,
            fundable: p.funding.fundable,
            approvedAt: date(p.funding.approvedAt),
            approvedByName: p.funding.approvedBy ?? null,
            approvedById: p.funding.approvedBy
              ? (userByName.get(norm(p.funding.approvedBy)) ?? null)
              : null,
            note: p.funding.note ?? null,
          },
        },

        evidence: {
          create: { before: p.evidence.before, after: p.evidence.after ?? Prisma.DbNull },
        },

        verificationRequest: {
          create: {
            requestedAt: date(p.verification.requestedAt),
            asked: p.verification.asked,
            confirmed: p.verification.confirmed,
            denied: p.verification.denied,
            pending: p.verification.pending,
          },
        },

        ...(p.project
          ? {
              projects: {
                create: {
                  id: p.project.id,
                  kind: 'gov' as const,
                  title: p.title,
                  phase: p.project.phase,
                  progress: p.project.progress,
                  budget: p.project.budget,
                  spent: p.project.spent,
                  contractor: p.project.contractor,
                  officerId: p.project.officerId || null,
                  startedAt: date(p.project.startedAt),
                  dueAt: date(p.project.dueAt),
                  planDays: p.project.planDays,
                  dayOfPlan: p.project.dayOfPlan,
                  govMilestones: p.project.milestones,
                },
              },
            }
          : {}),

        audit: {
          create: (p.audit as AuditSeed[]).map((a) => ({
            entityType: 'problem',
            entityId: p.id as string,
            at: date(a.at)!,
            actor: a.actor as $Enums.AuditActor,
            actorName: a.actorName ?? null,
            actorUserId: a.actorName ? (userByName.get(norm(a.actorName)) ?? null) : null,
            action: a.action,
            detail: a.detail ?? null,
            automated: a.automated,
          })),
        },
      },
    });
  }

  /* -- individual citizen reports --------------------------------- */
  for (const r of fixture.reports) {
    await prisma.citizenReport.create({
      data: {
        id: r.id,
        problemId: r.problemId,
        citizenName: r.citizenName,
        channel: r.channel,
        raw: r.raw,
        language: r.language,
        villageId: r.villageId,
        lat: r.lat,
        lng: r.lng,
        photos: r.photos,
        aiConfidence: r.aiConfidence,
        createdAt: date(r.at)!,
        // duplicateOf points at "<problemId>-R1"; wired in a second pass below.
      },
    });
  }
  for (const r of fixture.reports) {
    if (r.duplicateOf) {
      await prisma.citizenReport.update({
        where: { id: r.id },
        data: { duplicateOfId: r.duplicateOf },
      });
    }
  }

  /* -- automations, alerts, trend -------------------------------- */
  for (const a of fixture.automations) {
    await prisma.automation.create({
      data: {
        id: a.id,
        scope: 'gov',
        name: a.name,
        description: a.description,
        status: a.status,
        enabled: a.enabled,
        lastRunAt: date(a.lastRunAt),
        nextAction: a.nextAction,
        affectedRecords: a.affectedRecords,
        runsToday: a.runsToday,
      },
    });
  }

  const govUserIds = fixture.govUsers.map((u) => u.id);
  for (const al of fixture.alerts) {
    for (const userId of govUserIds) {
      await prisma.notification.create({
        data: {
          userId,
          kind: al.kind,
          title: al.title,
          detail: al.detail,
          read: al.read,
          actionLabel: al.actionLabel ?? null,
          actionHref: al.problemId ? `/gov/problems/${al.problemId}` : null,
          entityType: al.problemId ? 'problem' : null,
          entityId: al.problemId ?? null,
          createdAt: date(al.at)!,
        },
      });
    }
  }

  for (const w of fixture.weeklyTrend) {
    await prisma.weeklyTrendPoint.create({ data: w });
  }

  return { devLogins };
}

type SponsorMatchSeed = {
  sponsorId: string;
  score: number;
  reasons: string[];
  status: string;
  respondedAt?: string;
  proposalAmount?: number;
  note?: string;
};
type AuditSeed = {
  at: string;
  actor: string;
  actorName?: string;
  action: string;
  detail?: string;
  automated: boolean;
};

function date(v: string | null | undefined): Date | null {
  return v ? new Date(v) : null;
}

/** "Rajesh Sharma" / "Shri Rajesh Sharma, IAS" → the same key. */
function norm(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(shri|smt|dr|ias|ips)\b\.?/g, '')
    .replace(/[^a-z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function buildNameIndex(prisma: PrismaClient): Promise<Map<string, string>> {
  const users = await prisma.user.findMany({ select: { id: true, displayName: true } });
  const index = new Map<string, string>();
  for (const u of users) {
    index.set(norm(u.displayName), u.id);
    // also index the last two words ("Rekha Toppo") for audit entries that drop the honorific
    const parts = norm(u.displayName).split(' ');
    if (parts.length >= 2) index.set(parts.slice(-2).join(' '), u.id);
  }
  return index;
}
