import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * `/api/v1/public` — what an anonymous visitor may read.
 *
 * The landing page is the only consumer. Two rules govern it.
 *
 * **Nothing individual crosses.** Every figure here is an aggregate or a count.
 * No citizen name, no verbatim report, no coordinate, no officer — the same
 * boundary `apps/web/src/lib/industry/visibility.ts` enforces for partners,
 * applied to the widest audience there is.
 *
 * **No number without its source.** The live counters are counted from the
 * tables that hold the records. The historical series comes from
 * `platform_year_stats`, and each row carries the `provenance` string the page
 * prints beside it. The product refuses to display an SLA metric it cannot
 * compute; a marketing page does not get an exemption from that rule.
 */
@ApiTags('public')
@Controller({ path: 'public', version: '1' })
@Throttle({ default: { ttl: 60_000, limit: process.env.NODE_ENV === 'test' ? 100_000 : 60 } })
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get('stats')
  @ApiOperation({ summary: 'Platform statistics for the public landing page' })
  async stats() {
    const [
      years,
      reportsLive,
      problemsLive,
      resolvedLive,
      villagesLive,
      panchayatsLive,
      partnersLive,
      studentsLive,
      categoryRows,
      weeklyTrend,
    ] = await Promise.all([
      this.prisma.platformYearStat.findMany({ orderBy: { year: 'asc' } }),
      this.prisma.citizenReport.count({ where: { deletedAt: null } }),
      this.prisma.problem.count({ where: { deletedAt: null } }),
      this.prisma.problem.count({ where: { status: 'resolved', deletedAt: null } }),
      this.prisma.village.count(),
      this.prisma.jurisdiction.count({ where: { level: { in: ['panchayat', 'ulb'] } } }),
      this.prisma.organization.count({ where: { type: 'industry', deletedAt: null } }),
      this.prisma.studentProfile.count(),
      this.prisma.problem.groupBy({
        by: ['category'],
        _count: { _all: true },
        _sum: { affected: true },
        where: { deletedAt: null },
      }),
      this.prisma.weeklyTrendPoint.findMany({ orderBy: { week: 'asc' }, take: 12 }),
    ]);

    const latest = years.at(-1);
    const first = years.at(0);

    return {
      /* The headline figures — the cumulative series plus what this deployment
         currently holds. */
      totals: {
        reportsSubmitted: sum(years, 'reportsSubmitted'),
        problemsValidated: sum(years, 'problemsValidated'),
        problemsResolved: sum(years, 'problemsResolved'),
        citizensVerifying: latest?.citizensVerifying ?? 0,
        villagesCovered: latest?.villagesCovered ?? 0,
        panchayatsOnboard: latest?.panchayatsOnboard ?? 0,
        studentsEngaged: latest?.studentsEngaged ?? 0,
        partnerOrgs: latest?.partnerOrgs ?? 0,
        fundsRouted: years.reduce((t, y) => t + Number(y.fundsRouted), 0),
      },

      /* Year on year, for the chart. */
      series: years.map((y) => ({
        year: y.year,
        reportsSubmitted: y.reportsSubmitted,
        problemsValidated: y.problemsValidated,
        problemsResolved: y.problemsResolved,
        citizensVerifying: y.citizensVerifying,
        villagesCovered: y.villagesCovered,
        panchayatsOnboard: y.panchayatsOnboard,
        studentsEngaged: y.studentsEngaged,
        partnerOrgs: y.partnerOrgs,
        fundsRouted: Number(y.fundsRouted),
        provenance: y.provenance,
      })),

      /* Growth across the window the series covers. */
      growth:
        first && latest && first.year !== latest.year
          ? {
              fromYear: first.year,
              toYear: latest.year,
              reportsMultiple: round1(
                latest.reportsSubmitted / Math.max(1, first.reportsSubmitted),
              ),
              resolutionRate: pct(latest.problemsResolved, latest.problemsValidated),
              panchayatsAdded: latest.panchayatsOnboard - first.panchayatsOnboard,
            }
          : null,

      /* What this database actually holds right now, labelled as such. */
      live: {
        reports: reportsLive,
        problems: problemsLive,
        resolved: resolvedLive,
        villages: villagesLive,
        localBodies: panchayatsLive,
        partnerOrgs: partnersLive,
        students: studentsLive,
      },

      categories: categoryRows
        .map((row) => ({
          category: row.category,
          problems: row._count._all,
          affected: row._sum.affected ?? 0,
        }))
        .sort((a, b) => b.problems - a.problems),

      weeklyTrend: weeklyTrend.map((w) => ({
        week: w.week,
        reported: w.reported,
        resolved: w.resolved,
      })),

      provenance:
        'Live figures are counted from this deployment. The year series is modelled on the Mission Antyodaya, BBMP grievance and NFHS-5 corpora listed in docs/SOURCES.md — realistic, not real. No time-to-resolution metric appears anywhere, because the source schema cannot compute one.',
    };
  }
}

function sum<K extends string>(rows: Record<K, number>[], key: K): number {
  return rows.reduce((total, row) => total + row[key], 0);
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}
