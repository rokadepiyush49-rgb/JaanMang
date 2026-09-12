import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { $Enums } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProblemCode, ProblemException } from '../common/errors/problem';
import type { AuthPrincipal } from '../auth/auth.types';
import { IntakeAiService } from './intake-ai.service';
import { ClusteringService } from './clustering.service';
import { haversineM } from './clustering.math';
import type { CreateReportDto, MyReportsQueryDto } from './reports.dto';

/** Beyond this, "nearest village" is a guess rather than a location. */
const MAX_VILLAGE_DISTANCE_M = 25_000;

@Injectable()
export class ReportsService {
  private readonly logger = new Logger('Reports');

  constructor(
    private readonly prisma: PrismaService,
    private readonly intake: IntakeAiService,
    private readonly clustering: ClusteringService,
  ) {}

  /**
   * File a report.
   *
   * The order of operations is the point. The row is written first and the
   * clustering runs later on a schedule, so the citizen's answer does not wait
   * on it — and so a clustering bug can never be a reason a report was lost.
   * The AI read happens inline because it is bounded, degrades to a keyword
   * pass, and is what makes the response able to say what was understood.
   */
  async create(dto: CreateReportDto, reporter?: AuthPrincipal) {
    const village = await this.resolveVillage(dto);

    const reading = await this.intake.read(dto.text, {
      category: dto.category as $Enums.ProblemCategory | undefined,
      village: village.name,
    });

    // A citizen who marked something critical is not overruled by a keyword
    // table. They are standing in front of it; the model is not.
    const severity = (dto.urgency as $Enums.Severity | undefined) ?? reading.severity;

    const report = await this.prisma.citizenReport.create({
      data: {
        reporterId: reporter?.userId ?? null,
        citizenName: dto.citizenName ?? reporter?.displayName ?? 'Anonymous',
        channel: dto.photoIds?.length ? 'photo' : 'web',
        raw: dto.text,
        language: dto.language,
        villageId: village.id,
        lat: dto.lat,
        lng: dto.lng,
        photos: dto.photoIds?.length ?? 0,
        aiConfidence: reading.confidence,
        aiCategory: reading.category,
        aiSeverity: severity,
        aiTitle: reading.title,
        aiSummary: reading.summary,
        aiKeywords: reading.keywords,
        aiSource: reading.source,
      },
      select: { id: true, createdAt: true },
    });

    return {
      id: report.id,
      receivedAt: report.createdAt,
      village: { id: village.id, name: village.name },
      /**
       * What the pipeline understood, returned so the citizen sees it rather
       * than being told "thank you" by a black box. `clusteringPending` is
       * honest about the fact that this is not yet attached to a problem.
       */
      understood: {
        title: reading.title,
        summary: reading.summary,
        category: reading.category,
        severity,
        confidence: reading.confidence,
        readBy: reading.source,
      },
      clusteringPending: true,
    };
  }

  /**
   * Nearest village to the coordinates, from the register.
   *
   * Not PostGIS: the register is a district's worth of villages, and a table
   * scan over a few hundred rows is faster than the round trip to set up
   * anything cleverer. Revisit when there is a state's worth.
   */
  private async resolveVillage(dto: CreateReportDto) {
    if (dto.villageId) {
      const named = await this.prisma.village.findUnique({ where: { id: dto.villageId } });
      if (!named) {
        throw new ProblemException(
          HttpStatus.BAD_REQUEST,
          ProblemCode.VALIDATION_FAILED,
          `No village with id "${dto.villageId}" is on the register.`,
        );
      }
      return named;
    }

    const villages = await this.prisma.village.findMany();
    if (villages.length === 0) {
      throw new ProblemException(
        HttpStatus.SERVICE_UNAVAILABLE,
        ProblemCode.INVALID_STATE,
        'The village register is empty, so a report cannot be placed. Seed the database.',
      );
    }

    let nearest = villages[0];
    let nearestM = haversineM(dto, nearest);
    for (const v of villages.slice(1)) {
      const m = haversineM(dto, v);
      if (m < nearestM) {
        nearest = v;
        nearestM = m;
      }
    }

    if (nearestM > MAX_VILLAGE_DISTANCE_M) {
      throw new ProblemException(
        HttpStatus.BAD_REQUEST,
        ProblemCode.VALIDATION_FAILED,
        'Those coordinates are outside every district this platform covers. ' +
          'If the location is right, the district has not been onboarded yet.',
      );
    }

    return nearest;
  }

  /** A citizen's own reports, newest first, with whatever became of each. */
  async mine(user: AuthPrincipal, query: MyReportsQueryDto) {
    const rows = await this.prisma.citizenReport.findMany({
      where: { reporterId: user.userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        raw: true,
        createdAt: true,
        photos: true,
        aiTitle: true,
        aiCategory: true,
        aiSeverity: true,
        aiConfidence: true,
        village: { select: { id: true, name: true } },
        problem: {
          select: {
            id: true,
            title: true,
            status: true,
            stage: true,
            reportCount: true,
            voteCount: true,
          },
        },
      },
    });

    const items = rows.slice(0, query.limit);
    return {
      items: items.map((r) => ({
        id: r.id,
        text: r.raw,
        filedAt: r.createdAt,
        photos: r.photos,
        village: r.village,
        understood: {
          title: r.aiTitle,
          category: r.aiCategory,
          severity: r.aiSeverity,
          confidence: r.aiConfidence,
        },
        /**
         * Null until clustering has run. The client shows "being reviewed"
         * rather than inventing a status, because "we have not looked at it
         * yet" is a true and useful thing to tell somebody.
         */
        problem: r.problem,
      })),
      nextCursor: rows.length > query.limit ? items[items.length - 1]?.id : undefined,
    };
  }

  /* --------------------------------------------------------------- votes -- */

  /**
   * "I agree this matters."
   *
   * The vote and the problem's counter move in one transaction, because a
   * counter that can disagree with the rows it counts is worse than no counter.
   * Re-voting is not an error — a client that retries, or a citizen who taps
   * twice, gets the same answer as the first time.
   */
  async vote(problemId: string, user: AuthPrincipal) {
    await this.assertVotable(problemId);

    const existing = await this.prisma.problemVote.findUnique({
      where: { userId_problemId: { userId: user.userId, problemId } },
    });

    if (!existing) {
      await this.prisma.$transaction([
        this.prisma.problemVote.create({ data: { problemId, userId: user.userId } }),
        this.prisma.problem.update({
          where: { id: problemId },
          data: { voteCount: { increment: 1 } },
        }),
      ]);
      // The vote is one of the eight need factors, so the score has to move now
      // rather than at the next cron — an officer refreshing the queue after a
      // village meeting should see what changed. Only the vote factor moves:
      // see `recomputeVotes` for why a vote must not re-derive the other seven.
      await this.clustering.recomputeVotes(problemId);
    }

    return this.voteState(problemId, user.userId);
  }

  /** Withdrawing a vote. Also idempotent. */
  async unvote(problemId: string, user: AuthPrincipal) {
    await this.assertVotable(problemId);

    const existing = await this.prisma.problemVote.findUnique({
      where: { userId_problemId: { userId: user.userId, problemId } },
    });

    if (existing) {
      await this.prisma.$transaction([
        this.prisma.problemVote.delete({ where: { id: existing.id } }),
        this.prisma.problem.update({
          where: { id: problemId },
          data: { voteCount: { decrement: 1 } },
        }),
      ]);
      await this.clustering.recomputeVotes(problemId);
    }

    return this.voteState(problemId, user.userId);
  }

  private async assertVotable(problemId: string): Promise<void> {
    const problem = await this.prisma.problem.findFirst({
      where: { id: problemId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!problem) {
      throw new ProblemException(HttpStatus.NOT_FOUND, ProblemCode.NOT_FOUND, 'No such problem.');
    }
    // Voting on something already fixed or refused is not a signal anyone can
    // act on, and letting it through would inflate a leaderboard later.
    if (problem.status === 'resolved' || problem.status === 'rejected') {
      throw new ProblemException(
        HttpStatus.CONFLICT,
        ProblemCode.INVALID_STATE,
        `This problem is ${problem.status}; voting has closed. Verification and rating are how you have a say now.`,
      );
    }
  }

  private async voteState(problemId: string, userId: string) {
    const [problem, mine] = await Promise.all([
      this.prisma.problem.findUniqueOrThrow({
        where: { id: problemId },
        select: { id: true, voteCount: true, reportCount: true },
      }),
      this.prisma.problemVote.findUnique({
        where: { userId_problemId: { userId, problemId } },
        select: { createdAt: true },
      }),
    ]);

    return {
      problemId: problem.id,
      voteCount: problem.voteCount,
      reportCount: problem.reportCount,
      votedByMe: Boolean(mine),
      votedAt: mine?.createdAt ?? null,
    };
  }
}
