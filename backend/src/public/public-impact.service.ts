import { Injectable } from '@nestjs/common';
import { $Enums, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLISHABLE_WHERE } from '../industry/visibility';
import { StorageService } from '../storage/storage.service';

/**
 * What an anonymous visitor may read.
 *
 * The only surface where the platform's claims are checkable by a stranger, so
 * it is also the one where the redaction has to be strictest: no citizen name,
 * no verbatim report, no coordinate, no officer, no department budget. Every
 * figure is an aggregate over rows the government also sees, and every one is
 * traceable to a problem id a visitor can open.
 *
 * Reuses `PUBLISHABLE_WHERE` rather than defining a third notion of "visible":
 * the public, a partner and a student are all outsiders to an unvalidated
 * report, and one definition is one thing to get wrong.
 */
@Injectable()
export class PublicImpactService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  /* ---------------------------------------------------------- problems */

  /** Published problems, in the narrowest shape on the platform. */
  async problems(filters: { district?: string; category?: string; sdg?: number } = {}) {
    const rows = await this.prisma.problem.findMany({
      where: {
        ...PUBLISHABLE_WHERE,
        ...(filters.category ? { category: filters.category as $Enums.ProblemCategory } : {}),
        ...(filters.sdg ? { sdgGoals: { has: filters.sdg } } : {}),
      },
      select: {
        id: true,
        title: true,
        category: true,
        severity: true,
        status: true,
        stage: true,
        affected: true,
        reportCount: true,
        voteCount: true,
        sdgGoals: true,
        estimatedCost: true,
        createdAt: true,
        updatedAt: true,
        jurisdiction: { select: { name: true, level: true } },
        villages: { select: { village: { select: { name: true } } } },
        department: { select: { name: true } },
        ai: { select: { clusterLabel: true } },
        verificationRequest: {
          select: { asked: true, confirmed: true, denied: true, pending: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });

    const mapped = rows.map((p) => ({
      id: p.id,
      title: p.title,
      summary: p.ai?.clusterLabel ?? p.title,
      category: p.category,
      severity: p.severity,
      status: p.status,
      stage: p.stage,
      district: p.jurisdiction.name,
      villages: p.villages.map((v) => v.village.name),
      affected: p.affected,
      /* Aggregates. The individual reports, and everybody who filed them,
         stay on the government surface. */
      reportCount: p.reportCount,
      voteCount: p.voteCount,
      sdgs: p.sdgGoals,
      department: p.department?.name ?? null,
      estimatedCost: Number(p.estimatedCost),
      reportedAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      verification: p.verificationRequest
        ? {
            asked: p.verificationRequest.asked,
            confirmed: p.verificationRequest.confirmed,
            denied: p.verificationRequest.denied,
            pending: p.verificationRequest.pending,
          }
        : null,
    }));

    return filters.district
      ? mapped.filter((p) => p.district.toLowerCase().includes(filters.district!.toLowerCase()))
      : mapped;
  }

  /** One published problem, with its evidence pair. */
  async problem(id: string) {
    const [problem] = await this.problems();
    void problem;

    const row = await this.prisma.problem.findFirst({
      where: { ...PUBLISHABLE_WHERE, id },
      select: {
        id: true,
        title: true,
        category: true,
        severity: true,
        status: true,
        stage: true,
        affected: true,
        reportCount: true,
        voteCount: true,
        sdgGoals: true,
        estimatedCost: true,
        createdAt: true,
        updatedAt: true,
        jurisdiction: { select: { name: true } },
        villages: { select: { village: { select: { name: true } } } },
        department: { select: { name: true } },
        ai: { select: { clusterLabel: true } },
        evidence: true,
        verificationRequest: true,
        challengeProfile: { select: { summary: true, expectedOutcomes: true } },
        projects: {
          where: { kind: 'gov' },
          select: {
            id: true,
            title: true,
            phase: true,
            progress: true,
            budget: true,
            spent: true,
            startedAt: true,
            ratings: { where: { deletedAt: null }, select: { stars: true } },
          },
        },
        ledgerEntries: {
          select: { amount: true, department: true, fiscalYear: true, stage: true, at: true },
        },
      },
    });
    if (!row) return null;

    const evidenceSide = (value: Prisma.JsonValue | null | undefined) => {
      if (!value || typeof value !== 'object') return null;
      const v = value as Record<string, unknown>;
      const keys = Array.isArray(v.keys) ? (v.keys as string[]) : [];
      return {
        photos: typeof v.photos === 'number' ? v.photos : keys.length,
        note: typeof v.note === 'string' ? v.note : null,
        images: keys.map((key) => ({ key, url: this.storage.publicUrl(key) })),
      };
    };

    const project = row.projects[0];
    const stars = project?.ratings.map((r) => r.stars) ?? [];

    return {
      id: row.id,
      title: row.title,
      summary: row.challengeProfile?.summary ?? row.ai?.clusterLabel ?? row.title,
      category: row.category,
      severity: row.severity,
      status: row.status,
      stage: row.stage,
      district: row.jurisdiction.name,
      villages: row.villages.map((v) => v.village.name),
      affected: row.affected,
      reportCount: row.reportCount,
      voteCount: row.voteCount,
      sdgs: row.sdgGoals,
      department: row.department?.name ?? null,
      estimatedCost: Number(row.estimatedCost),
      reportedAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      /** The before-and-after. The whole argument of the portal. */
      evidence: {
        before: evidenceSide(row.evidence?.before),
        after: evidenceSide(row.evidence?.after),
      },
      verification: row.verificationRequest
        ? {
            asked: row.verificationRequest.asked,
            confirmed: row.verificationRequest.confirmed,
            denied: row.verificationRequest.denied,
            pending: row.verificationRequest.pending,
          }
        : null,
      project: project
        ? {
            id: project.id,
            title: project.title,
            phase: project.phase,
            progress: project.progress,
            budget: Number(project.budget),
            spent: Number(project.spent),
            startedAt: project.startedAt?.toISOString() ?? null,
            rating: stars.length
              ? Number((stars.reduce((s, v) => s + v, 0) / stars.length).toFixed(2))
              : null,
            ratingCount: stars.length,
          }
        : null,
      /** Every rupee, with the head it came from. */
      ledger: row.ledgerEntries.map((e) => ({
        amount: Number(e.amount),
        department: e.department,
        fiscalYear: e.fiscalYear,
        stage: e.stage,
        at: e.at.toISOString(),
      })),
    };
  }

  /* ------------------------------------------------------------ impact */

  /**
   * Verified impact, per district.
   *
   * "Resolved" here means resolved *and* confirmed by the citizens who
   * reported it. A district rollup counting officer-closed problems would be
   * the same number every government already publishes, and the reason to
   * build this was that nobody believes those.
   */
  async impact() {
    const [problems, ledger, ratings, districts] = await Promise.all([
      this.prisma.problem.findMany({
        where: PUBLISHABLE_WHERE,
        select: {
          id: true,
          status: true,
          affected: true,
          reportCount: true,
          sdgGoals: true,
          category: true,
          jurisdiction: { select: { name: true } },
          verifications: { where: { fixed: true }, select: { id: true } },
          evidence: { select: { after: true } },
        },
      }),
      this.prisma.ledgerEntry.findMany({
        select: { amount: true, department: true, fiscalYear: true, stage: true, problemId: true },
      }),
      this.prisma.deliveryRating.findMany({ where: { deletedAt: null }, select: { stars: true } }),
      this.prisma.jurisdiction.findMany({
        where: { level: 'district' },
        select: { name: true, population: true },
      }),
    ]);

    const verified = problems.filter((p) => p.verifications.length > 0);
    const byDistrict = new Map<
      string,
      { problems: number; verified: number; affected: number; reports: number; committed: number }
    >();

    for (const p of problems) {
      const key = p.jurisdiction.name;
      const row = byDistrict.get(key) ?? {
        problems: 0,
        verified: 0,
        affected: 0,
        reports: 0,
        committed: 0,
      };
      row.problems += 1;
      row.reports += p.reportCount;
      if (p.verifications.length > 0) {
        row.verified += 1;
        row.affected += p.affected;
      }
      byDistrict.set(key, row);
    }

    const problemDistrict = new Map(problems.map((p) => [p.id, p.jurisdiction.name]));
    for (const entry of ledger) {
      const key = entry.problemId ? problemDistrict.get(entry.problemId) : undefined;
      if (!key) continue;
      const row = byDistrict.get(key);
      if (row) row.committed += Number(entry.amount);
    }

    const sdgTotals = new Map<number, number>();
    for (const p of verified) {
      for (const sdg of p.sdgGoals) {
        sdgTotals.set(sdg, (sdgTotals.get(sdg) ?? 0) + p.affected);
      }
    }

    const categoryTotals = new Map<string, { problems: number; verified: number }>();
    for (const p of problems) {
      const row = categoryTotals.get(p.category) ?? { problems: 0, verified: 0 };
      row.problems += 1;
      if (p.verifications.length > 0) row.verified += 1;
      categoryTotals.set(p.category, row);
    }

    return {
      totals: {
        problemsPublished: problems.length,
        /** Confirmed by the people who reported them, not closed by an officer. */
        problemsVerified: verified.length,
        citizensAffected: verified.reduce((n, p) => n + p.affected, 0),
        reportsFiled: problems.reduce((n, p) => n + p.reportCount, 0),
        fundsCommitted: ledger
          .filter((e) => e.stage === 'committed')
          .reduce((n, e) => n + Number(e.amount), 0),
        fundsDisbursed: ledger
          .filter((e) => e.stage === 'disbursed')
          .reduce((n, e) => n + Number(e.amount), 0),
        beforeAfterPairs: problems.filter((p) => p.evidence?.after).length,
        averageDeliveryRating: ratings.length
          ? Number((ratings.reduce((n, r) => n + r.stars, 0) / ratings.length).toFixed(2))
          : null,
      },
      districts: [...byDistrict.entries()]
        .map(([name, row]) => ({
          name,
          population: districts.find((d) => d.name === name)?.population ?? null,
          ...row,
        }))
        .sort((a, b) => b.verified - a.verified || b.problems - a.problems),
      sdgs: [...sdgTotals.entries()]
        .sort(([a], [b]) => a - b)
        .map(([number, citizensAffected]) => ({ number, citizensAffected })),
      categories: [...categoryTotals.entries()]
        .map(([category, row]) => ({ category, ...row }))
        .sort((a, b) => b.problems - a.problems),
      /**
       * The rule every figure above obeys, printed so a reader can check it.
       * The product refuses to show a number it cannot compute from its own
       * records, and a public portal is the last place to make an exception.
       */
      provenance:
        'Verified means the citizens who reported the problem confirmed the work was done. ' +
        'Funds are the public ledger entries written when a department committed them. ' +
        'Nothing on this page is self-reported by a government body or a partner.',
      computedAt: new Date().toISOString(),
    };
  }

  /** The public funding ledger. */
  async ledger(fiscalYear?: string) {
    const rows = await this.prisma.ledgerEntry.findMany({
      where: fiscalYear ? { fiscalYear } : {},
      select: {
        title: true,
        amount: true,
        department: true,
        fiscalYear: true,
        stage: true,
        at: true,
        problemId: true,
        verifiedByCitizens: true,
      },
      orderBy: { at: 'desc' },
      take: 500,
    });

    return {
      entries: rows.map((e) => ({
        title: e.title,
        amount: Number(e.amount),
        department: e.department,
        fiscalYear: e.fiscalYear,
        stage: e.stage,
        at: e.at.toISOString(),
        problemId: e.problemId,
        verifiedByCitizens: e.verifiedByCitizens,
      })),
      total: rows.reduce((n, e) => n + Number(e.amount), 0),
      fiscalYears: [...new Set(rows.map((e) => e.fiscalYear))].sort().reverse(),
    };
  }

  /* ------------------------------------------------------- leaderboard */

  async leaderboard(scope: $Enums.LeaderboardScope, limit = 25) {
    const rows = await this.prisma.leaderboardEntry.findMany({
      where: { scope },
      orderBy: { rank: 'asc' },
      take: limit,
    });

    return {
      scope,
      computedAt: rows[0]?.computedAt.toISOString() ?? null,
      entries: rows.map((e) => ({
        rank: e.rank,
        previousRank: e.previousRank,
        subjectId: e.subjectId,
        name: e.displayName,
        score: e.score,
        /* The components, so a ranking can be argued with. A leaderboard whose
           workings are hidden is a leaderboard nobody outside the building
           believes. */
        breakdown: e.breakdown,
      })),
      formula: FORMULA[scope],
    };
  }
}

/** What each ranking is built from, in the form a reader can check. */
const FORMULA: Record<$Enums.LeaderboardScope, { label: string; weight: string }[]> = {
  citizens: [
    { label: 'Completed works confirmed with evidence', weight: '20 points each' },
    { label: 'Reports that became a validated problem', weight: '12 points each' },
    { label: 'Delivery ratings given', weight: '6 points each' },
    { label: 'Votes cast on other people’s problems', weight: '2 points each' },
  ],
  students: [
    { label: 'Projects verified by the citizens who reported them', weight: '150 points each' },
    { label: 'Milestones completed and reviewed', weight: '25 points each' },
    { label: 'Impact points from verified work', weight: 'as earned' },
    { label: 'Average delivery rating', weight: 'multiplies the total' },
  ],
  institutes: [
    { label: 'Projects verified by citizens', weight: '200 points each' },
    { label: 'Teams active on live problems', weight: '20 points each' },
    { label: 'Students the institution has verified', weight: '5 points each' },
  ],
  partners: [
    { label: 'Sponsorships approved and delivered', weight: '100 points each' },
    { label: 'Funds actually delivered', weight: 'capped at 500 points' },
    { label: 'Citizen confirmations on funded work', weight: '30 points each' },
    { label: 'CSR utilisation certificates filed', weight: '50 points each' },
  ],
  officers: [
    { label: 'Problems closed inside the SLA and confirmed by citizens', weight: '40 points each' },
    { label: 'Problems verified closed', weight: '20 points each' },
    { label: 'Average delivery rating on their projects', weight: '×20' },
  ],
};
