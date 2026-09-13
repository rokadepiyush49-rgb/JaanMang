import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { $Enums, Prisma } from '@prisma/client';
import { AppConfigService } from '../config/app-config.service';
import { PrismaService } from '../prisma/prisma.service';
import { IntakeAiService, canonicalTerms } from './intake-ai.service';
import {
  type ClusterThresholds,
  type MatchCandidate,
  citizenVotesFactor,
  computeFactors,
  findMatch,
  haversineM,
  tokenise,
} from './clustering.math';

/**
 * What two reports are compared on: their own words, plus the canonical terms
 * behind those words.
 *
 * The second half is what lets an English report and a Hinglish one about the
 * same handpump recognise each other — lexically they share almost nothing.
 */
function comparableTokens(text: string): Set<string> {
  const tokens = tokenise(text);
  for (const term of canonicalTerms(text)) tokens.add(term);
  return tokens;
}

/** Problems still open enough to absorb a new report. */
const OPEN_STATUSES: $Enums.ProblemStatus[] = [
  'pending_validation',
  'awaiting_sponsorship',
  'funding_required',
  'in_progress',
];

/** How far back to look for a problem to join. */
const CANDIDATE_WINDOW_DAYS = 120;

/** Same category, same villages, resolved — the recurrence signal. */
const RECURRENCE_WINDOW_MONTHS = 24;

export interface ClusterRun {
  considered: number;
  attached: number;
  created: number;
  clustersTouched: number;
}

/**
 * Turns loose citizen reports into problems, and problems into clusters.
 *
 * This is where the product's central claim is actually computed: forty people
 * reporting the same handpump become one demand weighing forty, rather than
 * forty items in a queue that an officer closes one at a time.
 *
 * It runs on a schedule rather than at intake for two reasons. A report filed
 * at the moment of a burst should be able to join the problem the next report
 * creates, which a synchronous pass cannot do without holding the request. And
 * intake must answer a citizen on a bad rural connection in milliseconds; the
 * expensive part belongs off that path.
 *
 * The bias throughout is to split rather than merge. A wrongly split problem is
 * two rows an officer merges in a second. A wrongly merged one buries somebody's
 * report inside somebody else's, where nobody will look for it again.
 */
@Injectable()
export class ClusteringService {
  private readonly logger = new Logger('Clustering');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly intake: IntakeAiService,
  ) {}

  private get thresholds(): ClusterThresholds {
    const c = this.config.clustering;
    return {
      confidenceMin: c.confidenceMin,
      radiusM: c.radiusM,
      similarityMin: c.similarityMin,
    };
  }

  @Cron(CronExpression.EVERY_5_MINUTES, { name: 'cluster-pending-reports' })
  async scheduled(): Promise<void> {
    if (!this.config.clustering.cronEnabled) return;
    const run = await this.run();
    if (run.considered > 0) {
      this.logger.log(
        `clustered ${run.considered} report(s): ${run.attached} attached, ${run.created} new problem(s)`,
      );
    }
  }

  /**
   * Cluster every unattached report, oldest first.
   *
   * Oldest first is deliberate: the first person to report a thing should be
   * the one whose words title the problem, not whoever happened to be last in
   * the batch.
   */
  async run(limit = 500): Promise<ClusterRun> {
    const pending = await this.prisma.citizenReport.findMany({
      where: { problemId: null, deletedAt: null },
      // Id breaks the tie. A burst of reports from one village meeting lands
      // inside the same millisecond, and with only `createdAt` to sort by,
      // Postgres is free to return them in any order — so which report titled
      // the resulting problem changed between runs, and so did its category.
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: limit,
      include: { village: true },
    });

    const result: ClusterRun = {
      considered: pending.length,
      attached: 0,
      created: 0,
      clustersTouched: 0,
    };
    if (pending.length === 0) return result;

    const touched = new Set<string>();

    for (const report of pending) {
      const candidates = await this.candidatesNear(report.village, report.createdAt);
      const match = findMatch(
        {
          category: report.aiCategory ?? this.intake.keywordRead(report.raw).category,
          confidence: report.aiConfidence,
          lat: report.lat,
          lng: report.lng,
          tokens: comparableTokens(report.raw),
        },
        candidates,
        this.thresholds,
      );

      if (match) {
        await this.attach(report.id, match.problemId, report.villageId);
        touched.add(match.problemId);
        result.attached += 1;
      } else {
        const problemId = await this.createProblemFrom(report);
        touched.add(problemId);
        result.created += 1;
      }
    }

    for (const problemId of touched) await this.recompute(problemId);
    await this.rebuildClusters([...touched]);
    result.clustersTouched = touched.size;

    return result;
  }

  /* --------------------------------------------------------- candidates -- */

  /**
   * Open problems near enough to be worth comparing.
   *
   * Narrowed in SQL to the jurisdiction and a recency window, then compared in
   * memory — a proper geospatial index is the right answer at a scale this is
   * nowhere near, and a bounding box on a district of eight villages would be
   * every row anyway.
   */
  private async candidatesNear(
    village: { jurisdictionId: string; lat: number; lng: number },
    before: Date,
  ): Promise<MatchCandidate[]> {
    const since = new Date(before.getTime() - CANDIDATE_WINDOW_DAYS * 86_400_000);

    const problems = await this.prisma.problem.findMany({
      where: {
        deletedAt: null,
        status: { in: OPEN_STATUSES },
        jurisdictionId: village.jurisdictionId,
        createdAt: { gte: since },
      },
      select: {
        id: true,
        title: true,
        category: true,
        ai: { select: { clusterLabel: true, originalQuote: true } },
        villages: { select: { village: { select: { lat: true, lng: true } } } },
        reports: {
          select: { raw: true, lat: true, lng: true },
          take: 12,
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return problems
      .map((p) => {
        // Where the problem *is* comes from the reports on it, not from the
        // centroid of the villages they fall in. A village is kilometres
        // across, and its registered coordinate is one point in it: two
        // reports of the same handpump filed fifty metres apart can both sit
        // two kilometres from that point, and comparing each to the point
        // rather than to each other put them outside the matching radius.
        const points: { lat: number; lng: number }[] =
          p.reports.length > 0 ? p.reports : p.villages.map((v) => v.village);
        if (points.length === 0) return null;
        const lat = points.reduce((n, v) => n + v.lat, 0) / points.length;
        const lng = points.reduce((n, v) => n + v.lng, 0) / points.length;
        return {
          problemId: p.id,
          category: p.category,
          lat,
          lng,
          // Compare against the problem's own words *and* the reports already
          // on it: a problem accumulates vocabulary, and matching only the
          // title would reject the tenth phrasing of the same complaint.
          tokens: comparableTokens(
            [
              p.title,
              p.ai?.clusterLabel ?? '',
              p.ai?.originalQuote ?? '',
              ...p.reports.map((r) => r.raw),
            ].join(' '),
          ),
        } satisfies MatchCandidate;
      })
      .filter((c): c is MatchCandidate => c !== null);
  }

  /* ------------------------------------------------------------- attach -- */

  private async attach(reportId: string, problemId: string, villageId: string): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.citizenReport.update({ where: { id: reportId }, data: { problemId } }),
      this.prisma.problemVillage.upsert({
        where: { problemId_villageId: { problemId, villageId } },
        update: {},
        create: { problemId, villageId },
      }),
    ]);
  }

  /**
   * A report that matched nothing becomes its own problem.
   *
   * Including — especially — a report the classifier was unsure about. The
   * alternative, holding low-confidence reports back for a human to sort, is a
   * queue nobody drains, and a citizen's report sitting in it is indisputably
   * lost. Better a thin problem an officer can merge than a report nobody sees.
   *
   * The `ProblemAi` row is written here rather than at intake because it
   * describes a problem, and until this moment there was not one.
   */
  private async createProblemFrom(report: {
    id: string;
    raw: string;
    language: string;
    villageId: string;
    village: { jurisdictionId: string; name: string };
    aiCategory: $Enums.ProblemCategory | null;
    aiSeverity: $Enums.Severity | null;
    aiTitle: string | null;
    aiSummary: string | null;
    aiConfidence: number;
    aiSource: string | null;
    createdAt: Date;
  }): Promise<string> {
    const reading = report.aiCategory
      ? null
      : this.intake.keywordRead(report.raw, { village: report.village.name });

    const category = report.aiCategory ?? reading?.category ?? 'water';
    const severity = report.aiSeverity ?? reading?.severity ?? 'medium';
    const title = report.aiTitle ?? reading?.title ?? 'Citizen report';

    const problem = await this.prisma.problem.create({
      data: {
        title,
        category,
        severity,
        status: 'pending_validation',
        stage: 'ai_processed',
        jurisdictionId: report.village.jurisdictionId,
        createdAt: report.createdAt,
        villages: { create: { villageId: report.villageId } },
        reports: { connect: { id: report.id } },
        ai: {
          create: {
            category,
            categoryConfidence: report.aiConfidence,
            severity,
            durationDays: 0,
            affected: 0,
            similarReports: 0,
            clusterLabel: report.village.name,
            originalQuote: report.raw.slice(0, 500),
            originalLanguage: report.language,
            interpretation: (reading?.interpretation ?? [
              { label: 'Read by', value: report.aiSource ?? 'unknown' },
              { label: 'Summary', value: report.aiSummary ?? title },
            ]) as never,
            routingReason: 'Awaiting validation — no department assigned at intake.',
          },
        },
      },
    });
    return problem.id;
  }

  /* ---------------------------------------------------------- recompute -- */

  /**
   * Recount the votes and recompute only the factor they feed.
   *
   * Deliberately not the full `recompute`. A vote is new information about
   * demand and about nothing else: it says nothing about how deprived the
   * village is, how long the problem has been open, or how severe it is. A
   * vote that silently re-derived all eight factors would let one tap rewrite
   * an officer's severity assessment, which is both wrong and very hard to
   * explain afterwards.
   */
  async recomputeVotes(problemId: string): Promise<void> {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        affected: true,
        factors: { select: { citizenVotes: true } },
        _count: { select: { votes: true } },
      },
    });
    if (!problem?.factors) return;

    await this.prisma.problemFactors.update({
      where: { problemId },
      // The same curve `computeFactors` uses, from the same function, so the
      // factor cannot mean one thing after a vote and another after a report.
      data: { citizenVotes: citizenVotesFactor(problem._count.votes, problem.affected) },
    });
  }

  /**
   * Rebuild a problem's counts and its eight need factors from the rows that
   * now hang off it. Everything here is derived, so it is safe to re-run and
   * never drifts from the reports it describes.
   */
  async recompute(problemId: string): Promise<void> {
    const problem = await this.prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        villages: { select: { village: true } },
        reports: { select: { createdAt: true }, orderBy: { createdAt: 'asc' } },
        jurisdiction: { select: { population: true, id: true } },
        _count: { select: { reports: true, votes: true } },
      },
    });
    if (!problem) return;

    const villages = problem.villages.map((v) => v.village);
    const jurisdictionVillageCount = await this.prisma.village.count({
      where: { jurisdictionId: problem.jurisdictionId },
    });

    const priorOccurrences = await this.prisma.problem.count({
      where: {
        id: { not: problemId },
        category: problem.category,
        status: 'resolved',
        updatedAt: { gte: monthsAgo(RECURRENCE_WINDOW_MONTHS) },
        villages: { some: { villageId: { in: villages.map((v) => v.id) } } },
      },
    });

    const factors = computeFactors({
      severity: problem.severity,
      villages: villages.map((v) => ({ population: v.population, deprivation: v.deprivation })),
      jurisdictionPopulation: problem.jurisdiction.population,
      jurisdictionVillageCount,
      firstReportedAt: problem.reports[0]?.createdAt ?? problem.createdAt,
      now: new Date(),
      priorOccurrences,
      reportCount: problem._count.reports,
      voteCount: problem._count.votes,
    });

    const affected = villages.reduce((n, v) => n + v.population, 0);

    await this.prisma.$transaction([
      this.prisma.problem.update({
        where: { id: problemId },
        data: {
          reportCount: problem._count.reports,
          voteCount: problem._count.votes,
          affected,
        },
      }),
      this.prisma.problemFactors.upsert({
        where: { problemId },
        update: factors,
        create: { problemId, ...factors },
      }),
    ]);
  }

  /* ----------------------------------------------------------- clusters -- */

  /**
   * Materialise the `Cluster` rows the government register reads.
   *
   * A cluster is one problem's geography and weight made queryable — the row
   * that lets a screen say "43 reports, three villages, 4,281 people" without
   * walking the reports on every render.
   */
  private async rebuildClusters(problemIds: string[]): Promise<void> {
    for (const problemId of problemIds) {
      const problem = await this.prisma.problem.findUnique({
        where: { id: problemId },
        include: {
          villages: { select: { village: true } },
          clusters: { select: { clusterId: true } },
          _count: { select: { reports: true } },
        },
      });
      if (!problem || problem.villages.length === 0) continue;

      const points = problem.villages.map((v) => v.village);
      const centroidLat = points.reduce((n, v) => n + v.lat, 0) / points.length;
      const centroidLng = points.reduce((n, v) => n + v.lng, 0) / points.length;
      const radiusM = Math.max(
        250,
        ...points.map((p) => haversineM({ lat: centroidLat, lng: centroidLng }, p)),
      );

      const data = {
        title: problem.title,
        category: problem.category,
        label: points.map((p) => p.name).join(', '),
        reportCount: problem._count.reports,
        affected: points.reduce((n, v) => n + v.population, 0),
        centroidLat,
        centroidLng,
        radiusM,
      };

      const existingId = problem.clusters[0]?.clusterId;
      if (existingId) {
        await this.prisma.cluster.update({ where: { id: existingId }, data });
        continue;
      }

      await this.prisma.cluster.create({
        data: {
          ...data,
          code: `C-${problemId.slice(0, 8).toUpperCase()}`,
          problems: { create: { problemId } },
        },
      });
    }
  }
}

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d;
}

/** Re-exported so the reports service can share one Prisma error shape. */
export type { Prisma };
