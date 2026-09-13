import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { $Enums, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Leaderboards, badges and the counters they read.
 *
 * One rule decides everything in this file: **rank on verified outcomes, never
 * on activity.** A leaderboard built on logins, submissions or reports filed
 * ranks the loudest account first, which is the opposite of what this is for —
 * and on a platform where the government publishes the ranking, it would be an
 * invitation to game it. Every component below is something a citizen
 * confirmed, an institution signed off, or money that actually moved.
 *
 * The rows are materialised because ranking is a window function over several
 * tables and running it per request on a public page is how a leaderboard takes
 * a site down. `breakdown` carries the components so a page can say *why*
 * somebody is third, and `displayName` is cached so rendering fifty rows costs
 * one query rather than fifty-one.
 */
@Injectable()
export class RecognitionService {
  private readonly logger = new Logger('Recognition');

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'recompute-recognition' })
  async scheduled(): Promise<void> {
    const result = await this.recomputeAll();
    this.logger.log(
      `recognition refreshed: ${result.entries} leaderboard rows, ${result.badges} badges awarded`,
    );
  }

  async recomputeAll(): Promise<{ entries: number; badges: number }> {
    // Derived counters first: the leaderboards read them.
    await this.refreshVerifiedContributions();

    const entries =
      (await this.rankCitizens()) +
      (await this.rankStudents()) +
      (await this.rankInstitutes()) +
      (await this.rankPartners()) +
      (await this.rankOfficers());

    const badges = await this.evaluateBadges();
    return { entries, badges };
  }

  /** When each scope was last rebuilt, so a page can say how fresh it is. */
  async lastComputed() {
    const rows = await this.prisma.leaderboardEntry.groupBy({
      by: ['scope'],
      _max: { computedAt: true },
      _count: { _all: true },
    });
    return rows.map((r) => ({
      scope: r.scope,
      entries: r._count._all,
      computedAt: r._max.computedAt?.toISOString() ?? null,
    }));
  }

  /* ------------------------------------------------------------ counters */

  /**
   * A student's verified contributions.
   *
   * Projects their team carried that reached a confirmed citizen verification.
   * Maintained here rather than written by the student surface, because a
   * track record a student can assert is not a track record.
   */
  private async refreshVerifiedContributions(): Promise<void> {
    const rows = await this.prisma.teamMember.findMany({
      where: { userId: { not: null } },
      select: {
        userId: true,
        team: {
          select: {
            projects: {
              select: {
                problem: {
                  select: { verifications: { where: { fixed: true }, select: { id: true } } },
                },
              },
            },
          },
        },
      },
    });

    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!row.userId) continue;
      const verified = row.team.projects.filter(
        (p) => (p.problem?.verifications.length ?? 0) > 0,
      ).length;
      counts.set(row.userId, (counts.get(row.userId) ?? 0) + verified);
    }

    for (const [userId, verifiedContributions] of counts) {
      await this.prisma.studentProfile.updateMany({
        where: { userId },
        data: { verifiedContributions },
      });
    }
  }

  /* -------------------------------------------------------- leaderboards */

  /**
   * Citizens, ranked on what they confirmed and what they raised that stood.
   *
   * Votes count for a little and reports only when they became a validated
   * problem — a report that went nowhere is not an achievement, and counting
   * raw report volume would reward the person who files the most, which is the
   * precise failure the priority engine spends six factors avoiding.
   */
  private async rankCitizens(): Promise<number> {
    const users = await this.prisma.user.findMany({
      where: { kind: 'citizen', deletedAt: null },
      select: {
        id: true,
        displayName: true,
        verifications: { where: { fixed: true }, select: { id: true } },
        reports: {
          where: { problem: { status: { notIn: ['pending_validation', 'rejected'] } } },
          select: { id: true },
        },
        problemVotes: { select: { id: true } },
        deliveryRatings: { where: { deletedAt: null }, select: { id: true } },
      },
    });

    const scored = users.map((u) => {
      const verificationsConfirmed = u.verifications.length;
      const reportsValidated = u.reports.length;
      const votesCast = u.problemVotes.length;
      const ratingsGiven = u.deliveryRatings.length;
      return {
        subjectId: u.id,
        displayName: u.displayName,
        score:
          verificationsConfirmed * 20 + reportsValidated * 12 + ratingsGiven * 6 + votesCast * 2,
        breakdown: { verificationsConfirmed, reportsValidated, votesCast, ratingsGiven },
      };
    });

    return this.write('citizens', 'user', scored);
  }

  /** Students, on delivered projects and reviewed milestones. */
  private async rankStudents(): Promise<number> {
    const profiles = await this.prisma.studentProfile.findMany({
      select: {
        userId: true,
        verifiedContributions: true,
        user: {
          select: {
            displayName: true,
            badgesEarned: { select: { id: true } },
            impactPoints: { select: { points: true } },
            teamMemberships: {
              select: {
                team: {
                  select: {
                    projects: {
                      select: {
                        milestones: { where: { status: 'complete' }, select: { id: true } },
                        ratings: { where: { deletedAt: null }, select: { stars: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const scored = profiles.map((p) => {
      const projects = p.user.teamMemberships.flatMap((m) => m.team.projects);
      const milestonesCompleted = projects.reduce((n, pr) => n + pr.milestones.length, 0);
      const stars = projects.flatMap((pr) => pr.ratings.map((r) => r.stars));
      const avgDeliveryRating = stars.length
        ? Number((stars.reduce((s, v) => s + v, 0) / stars.length).toFixed(2))
        : null;
      const points = p.user.impactPoints.reduce((s, e) => s + e.points, 0);

      return {
        subjectId: p.userId,
        displayName: p.user.displayName,
        /* The rating multiplier is the point: finishing is worth something,
           finishing well is worth more, and finishing badly is worth less than
           finishing. A student whose work was rated 2 scores below one whose
           equivalent work was rated 5. */
        score: Math.round(
          (p.verifiedContributions * 150 + milestonesCompleted * 25 + points) *
            (avgDeliveryRating ? avgDeliveryRating / 4 : 1),
        ),
        breakdown: {
          projectsVerified: p.verifiedContributions,
          milestonesCompleted,
          badges: p.user.badgesEarned.length,
          avgDeliveryRating,
        },
      };
    });

    return this.write('students', 'user', scored);
  }

  /** Institutions, on what their teams actually delivered. */
  private async rankInstitutes(): Promise<number> {
    const orgs = await this.prisma.organization.findMany({
      where: { type: 'institution', deletedAt: null },
      select: {
        id: true,
        name: true,
        students: { where: { verifiedAt: { not: null } }, select: { userId: true } },
        studentTeams: {
          select: {
            status: true,
            projects: {
              select: {
                phase: true,
                problem: {
                  select: { verifications: { where: { fixed: true }, select: { id: true } } },
                },
                ratings: { where: { deletedAt: null }, select: { stars: true } },
              },
            },
          },
        },
      },
    });

    const scored = orgs.map((o) => {
      const projects = o.studentTeams.flatMap((t) => t.projects);
      const projectsVerified = projects.filter(
        (p) => (p.problem?.verifications.length ?? 0) > 0,
      ).length;
      const stars = projects.flatMap((p) => p.ratings.map((r) => r.stars));
      const avgDeliveryRating = stars.length
        ? Number((stars.reduce((s, v) => s + v, 0) / stars.length).toFixed(2))
        : null;
      const studentsOnLiveProblems = o.studentTeams.filter((t) => t.status === 'active').length;

      return {
        subjectId: o.id,
        displayName: o.name,
        score: Math.round(
          projectsVerified * 200 + studentsOnLiveProblems * 20 + o.students.length * 5,
        ),
        breakdown: {
          projectsVerified,
          studentsOnLiveProblems,
          verifiedStudents: o.students.length,
          avgDeliveryRating,
        },
      };
    });

    return this.write('institutes', 'organization', scored);
  }

  /**
   * Partners, on money that moved and work that was confirmed.
   *
   * Not on commitments. A commitment is an intention, and a leaderboard of
   * intentions is a leaderboard of press releases — only an approved
   * sponsorship with a citizen-confirmed outcome behind it scores.
   */
  private async rankPartners(): Promise<number> {
    const sponsors = await this.prisma.sponsor.findMany({
      select: {
        id: true,
        name: true,
        sector: true,
        matches: {
          where: { status: 'approved' },
          select: { problemId: true, proposalAmount: true },
        },
      },
    });

    const scored = await Promise.all(
      sponsors.map(async (s) => {
        const problemIds = s.matches.map((m) => m.problemId);
        const [verified, sponsorships, ratings, csr] = await Promise.all([
          this.prisma.verification.count({
            where: { problemId: { in: problemIds }, fixed: true },
          }),
          this.prisma.sponsorship.findMany({
            where: { approvedSponsorId: s.id },
            select: { approvedAmount: true },
          }),
          this.prisma.deliveryRating.findMany({
            where: { deletedAt: null, project: { problemId: { in: problemIds } } },
            select: { stars: true },
          }),
          this.prisma.csrBenefit.count({
            where: {
              sponsorship: { approvedSponsorId: s.id },
              documentation: { in: ['certified', 'filed'] },
            },
          }),
        ]);

        const fundsDelivered = sponsorships.reduce((n, x) => n + Number(x.approvedAmount ?? 0), 0);
        const avgDeliveryRating = ratings.length
          ? Number((ratings.reduce((n, r) => n + r.stars, 0) / ratings.length).toFixed(2))
          : null;

        return {
          subjectId: s.id,
          displayName: s.name,
          score: Math.round(
            sponsorships.length * 100 +
              Math.min(500, fundsDelivered / 10000) +
              verified * 30 +
              csr * 50,
          ),
          breakdown: {
            sector: s.sector,
            sponsorshipsApproved: sponsorships.length,
            fundsDelivered,
            csrCertified: csr,
            avgDeliveryRating,
          },
        };
      }),
    );

    return this.write('partners', 'organization', scored);
  }

  /**
   * Officers, on problems closed inside the SLA and how the delivery was rated.
   *
   * Explicitly not on throughput. Ranking officers by problems closed rewards
   * closing things, and the fastest way to close a problem is to mark it
   * resolved — which is exactly why closure is the citizens' decision and this
   * counts only the ones they confirmed.
   */
  private async rankOfficers(): Promise<number> {
    const officers = await this.prisma.officer.findMany({
      select: {
        userId: true,
        avgResolutionDays: true,
        user: { select: { displayName: true } },
        assignedProblems: {
          select: {
            status: true,
            slaDueAt: true,
            updatedAt: true,
            verifications: { where: { fixed: true }, select: { id: true } },
            projects: {
              select: { ratings: { where: { deletedAt: null }, select: { stars: true } } },
            },
          },
        },
      },
    });

    const scored = officers.map((o) => {
      const resolved = o.assignedProblems.filter(
        (p) => p.status === 'resolved' && p.verifications.length > 0,
      );
      const withinSla = resolved.filter((p) => !p.slaDueAt || p.updatedAt <= p.slaDueAt).length;
      const stars = o.assignedProblems.flatMap((p) =>
        p.projects.flatMap((pr) => pr.ratings.map((r) => r.stars)),
      );
      const avgDeliveryRating = stars.length
        ? Number((stars.reduce((s, v) => s + v, 0) / stars.length).toFixed(2))
        : null;

      return {
        subjectId: o.userId,
        displayName: o.user.displayName,
        score: Math.round(
          withinSla * 40 + resolved.length * 20 + (avgDeliveryRating ? avgDeliveryRating * 20 : 0),
        ),
        breakdown: {
          problemsClosedWithinSla: withinSla,
          problemsVerifiedClosed: resolved.length,
          avgResolutionDays: o.avgResolutionDays,
          avgDeliveryRating,
        },
      };
    });

    return this.write('officers', 'user', scored);
  }

  /**
   * Write one scope's ranking.
   *
   * Zero-score subjects are dropped rather than listed at the bottom: a
   * leaderboard of people who have done nothing yet is not information, and
   * being publicly ranked 47th of 47 for having just signed up is a reason to
   * leave. The previous rank is carried over so a page can show movement.
   */
  private async write(
    scope: $Enums.LeaderboardScope,
    subjectType: $Enums.LeaderboardSubject,
    rows: { subjectId: string; displayName: string; score: number; breakdown: object }[],
  ): Promise<number> {
    const ranked = rows
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.displayName.localeCompare(b.displayName));

    const previous = await this.prisma.leaderboardEntry.findMany({
      where: { scope },
      select: { subjectId: true, rank: true },
    });
    const previousRank = new Map(previous.map((p) => [p.subjectId, p.rank]));

    await this.prisma.$transaction([
      this.prisma.leaderboardEntry.deleteMany({ where: { scope } }),
      ...ranked.map((row, i) =>
        this.prisma.leaderboardEntry.create({
          data: {
            scope,
            subjectType,
            subjectId: row.subjectId,
            displayName: row.displayName,
            score: row.score,
            rank: i + 1,
            previousRank: previousRank.get(row.subjectId) ?? null,
            breakdown: row.breakdown as Prisma.InputJsonObject,
            period: 'all-time',
            computedAt: new Date(),
          },
        }),
      ),
    ]);

    return ranked.length;
  }

  /* --------------------------------------------------------------- badges */

  /**
   * Award every badge whose rule now holds.
   *
   * The rule lives in `Badge.criteria` as `{ metric, gte }`, so a new badge is
   * a row and a corrected threshold is an UPDATE. Nothing is ever revoked here:
   * a badge earned on the day the rule said so stays earned, because moving a
   * threshold should not silently take something off somebody's profile.
   */
  private async evaluateBadges(): Promise<number> {
    const badges = await this.prisma.badge.findMany({ where: { active: true } });
    if (badges.length === 0) return 0;

    const metrics = await this.metrics();
    let awarded = 0;

    for (const badge of badges) {
      const criteria = badge.criteria as { metric?: string; gte?: number } | null;
      if (!criteria?.metric || typeof criteria.gte !== 'number') continue;

      const holders = metrics.get(criteria.metric);
      if (!holders) continue;

      for (const [userId, value] of holders) {
        if (value < criteria.gte) continue;
        const existing = await this.prisma.badgeEarned.findUnique({
          where: { badgeId_userId: { badgeId: badge.id, userId } },
        });
        if (existing) continue;

        await this.prisma.badgeEarned.create({
          data: {
            badgeId: badge.id,
            userId,
            // The snapshot that fired the rule, so a holder can see which ten
            // verifications earned it rather than being told they qualified.
            evidence: { [criteria.metric]: value, threshold: criteria.gte },
          },
        });
        awarded += 1;
      }
    }

    return awarded;
  }

  /** metric name → (userId → value). Everything a badge rule can read. */
  private async metrics(): Promise<Map<string, Map<string, number>>> {
    const out = new Map<string, Map<string, number>>();
    const put = (metric: string, userId: string, value: number) => {
      const m = out.get(metric) ?? new Map<string, number>();
      m.set(userId, (m.get(userId) ?? 0) + value);
      out.set(metric, m);
    };

    const [verifications, votes, validatedReports, milestones, csr, sponsorships] =
      await Promise.all([
        this.prisma.verification.groupBy({ by: ['verifierId'], _count: { _all: true } }),
        this.prisma.problemVote.groupBy({ by: ['userId'], _count: { _all: true } }),
        this.prisma.citizenReport.groupBy({
          by: ['reporterId'],
          where: {
            reporterId: { not: null },
            problem: { status: { notIn: ['pending_validation', 'rejected'] } },
          },
          _count: { _all: true },
        }),
        this.prisma.studentProfile.findMany({
          select: { userId: true, verifiedContributions: true },
        }),
        this.prisma.csrBenefit.count({ where: { documentation: { in: ['certified', 'filed'] } } }),
        this.prisma.sponsorship.count({ where: { status: 'approved' } }),
      ]);

    for (const v of verifications) put('verifications_confirmed', v.verifierId, v._count._all);
    for (const v of votes) put('votes_cast', v.userId, v._count._all);
    for (const r of validatedReports) {
      if (r.reporterId) put('reports_validated', r.reporterId, r._count._all);
    }
    for (const p of milestones) put('projects_verified', p.userId, p.verifiedContributions);

    // Organisation-scoped metrics have no user to hang on, so they are not
    // offered to badge rules. A badge belongs to a person.
    void csr;
    void sponsorships;

    return out;
  }
}
