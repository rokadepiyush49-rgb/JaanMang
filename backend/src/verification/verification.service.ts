import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ProblemException } from '../common/errors/problem';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { AuthPrincipal } from '../auth/auth.types';

/** Confirmations must outweigh denials by this much for a problem to close. */
const UPHELD_RATIO = 3;

/**
 * Citizen verification, evidence and delivery rating.
 *
 * This is the link the product's argument rests on: the people who reported a
 * problem are the ones who decide it was fixed, and they see the before-and-
 * after that proves it. Without this the platform is a work-allocation tool
 * with a nice map.
 *
 * Two separations are load-bearing and neither is cosmetic.
 *
 * A verification request goes to the citizens whose reports formed the
 * problem's cluster — not to a general audience, not to anyone nearby, not to
 * whoever opens the app. Somebody who did not report the broken handpump has
 * no standing to say it was fixed, and an "anyone can verify" design is an
 * "anyone can be recruited to verify" design.
 *
 * And rating is a different question from verification. Verification asks
 * whether it was fixed and is a yes or a no with photographic evidence; rating
 * asks how well and is the signal the delivery leaderboards rank on. Merging
 * them loses the second answer — the one that separates a handpump that works
 * from a handpump that works and was finished on time.
 */
@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  /* ------------------------------------------------------- who is asked */

  /**
   * The people entitled to verify this problem.
   *
   * Everyone who filed a report that ended up on it. Deliberately not
   * "everyone in the village": a report is a person putting their name to a
   * claim, and it is that act which earns the say in whether the claim was
   * answered.
   */
  private async reporterIdsFor(problemId: string): Promise<string[]> {
    const reports = await this.prisma.citizenReport.findMany({
      where: { problemId, reporterId: { not: null }, deletedAt: null },
      select: { reporterId: true },
      distinct: ['reporterId'],
    });
    return reports.map((r) => r.reporterId).filter((id): id is string => Boolean(id));
  }

  /** Verification requests addressed to this citizen. */
  async myRequests(principal: AuthPrincipal) {
    const reported = await this.prisma.citizenReport.findMany({
      where: { reporterId: principal.userId, deletedAt: null, problemId: { not: null } },
      select: { problemId: true },
      distinct: ['problemId'],
    });
    const problemIds = reported.map((r) => r.problemId).filter((id): id is string => Boolean(id));
    if (problemIds.length === 0) return [];

    const rows = await this.prisma.verificationRequest.findMany({
      where: { problemId: { in: problemIds }, requestedAt: { not: null } },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            reportCount: true,
            evidence: true,
            villages: { select: { village: { select: { name: true } } } },
            projects: {
              where: { kind: 'gov' },
              select: { id: true, title: true, phase: true, progress: true },
              take: 1,
            },
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    const mine = await this.prisma.verification.findMany({
      where: { problemId: { in: problemIds }, verifierId: principal.userId },
      select: { problemId: true, fixed: true, at: true },
    });
    const answered = new Map(mine.map((v) => [v.problemId, v]));

    const ratings = await this.prisma.deliveryRating.findMany({
      where: { userId: principal.userId, deletedAt: null },
      select: { projectId: true, stars: true },
    });
    const rated = new Set(ratings.map((r) => r.projectId));

    return rows.map((r) => {
      const project = r.problem.projects[0];
      return {
        problemId: r.problemId,
        title: r.problem.title,
        category: r.problem.category,
        status: r.problem.status,
        villages: r.problem.villages.map((v) => v.village.name),
        requestedAt: r.requestedAt?.toISOString() ?? null,
        asked: r.asked,
        confirmed: r.confirmed,
        denied: r.denied,
        pending: r.pending,
        /** The before-and-after pair, so the citizen judges the change. */
        evidence: r.problem.evidence
          ? { before: r.problem.evidence.before, after: r.problem.evidence.after }
          : null,
        project: project ?? null,
        /** What this citizen has already said, if anything. */
        myVerification: answered.get(r.problemId)
          ? {
              fixed: answered.get(r.problemId)!.fixed,
              at: answered.get(r.problemId)!.at.toISOString(),
            }
          : null,
        myRating: project ? rated.has(project.id) : false,
      };
    });
  }

  /* -------------------------------------------------------- the verdict */

  /**
   * Record a citizen's verdict.
   *
   * Re-answering replaces the previous answer rather than adding a second —
   * somebody who looks again a week later and finds the pump dry should be
   * able to say so, and the counts follow. The whole thing is one transaction
   * because the tallies on `VerificationRequest` and the row in `Verification`
   * must never disagree.
   */
  async verify(
    principal: AuthPrincipal,
    problemId: string,
    dto: { fixed: boolean; note?: string; photoKeys?: string[]; lat?: number; lng?: number },
  ) {
    const entitled = await this.reporterIdsFor(problemId);
    if (!entitled.includes(principal.userId)) {
      // 404 rather than 403: whether a particular problem is awaiting
      // verification is not something to confirm to somebody with no standing.
      throw ProblemException.notFound('No verification request for you on this problem.');
    }

    const request = await this.prisma.verificationRequest.findUnique({ where: { problemId } });
    if (!request?.requestedAt) {
      throw ProblemException.invalidState('This problem is not awaiting verification.');
    }

    await this.prisma.$transaction(async (tx) => {
      const previous = await tx.verification.findFirst({
        where: { problemId, verifierId: principal.userId },
      });

      if (previous) {
        await tx.verification.update({
          where: { id: previous.id },
          data: { fixed: dto.fixed, at: new Date(), geoLat: dto.lat, geoLng: dto.lng },
        });
      } else {
        await tx.verification.create({
          data: {
            problemId,
            verifierId: principal.userId,
            kind: 'citizen',
            fixed: dto.fixed,
            geoLat: dto.lat,
            geoLng: dto.lng,
            checklist: dto.note ? ({ note: dto.note } as Prisma.InputJsonObject) : undefined,
          },
        });
      }

      // Recount from the rows rather than incrementing. A counter that can
      // drift from what it counts is the bug this whole codebase keeps
      // refusing to ship.
      const [confirmed, denied] = await Promise.all([
        tx.verification.count({ where: { problemId, fixed: true } }),
        tx.verification.count({ where: { problemId, fixed: false } }),
      ]);
      const pending = Math.max(0, request.asked - confirmed - denied);

      await tx.verificationRequest.update({
        where: { problemId },
        data: { confirmed, denied, pending },
      });

      if (dto.photoKeys?.length) {
        await this.attachEvidence(tx, problemId, 'after', dto.photoKeys, principal.userId);
      }

      /**
       * Citizens close the loop, not the officer.
       *
       * The problem reaches `resolved` only when everybody asked has answered
       * and confirmations outweigh denials three to one. A simple majority is
       * too weak here: the cost of wrongly closing a problem is that the
       * person still without water has no route left.
       */
      const settled = pending === 0;
      const upheld = confirmed >= denied * UPHELD_RATIO && confirmed > 0;

      if (settled) {
        await tx.problem.update({
          where: { id: problemId },
          data: upheld
            ? { status: 'resolved', stage: 'impact', updatedAt: new Date() }
            : { status: 'in_progress', updatedAt: new Date() },
        });
      }

      await this.audit.record(
        {
          entityType: 'problem',
          entityId: problemId,
          actor: 'Citizen',
          actorUserId: principal.userId,
          actorName: principal.displayName,
          action: dto.fixed ? 'Confirmed the work was done' : 'Denied that the work was done',
          detail: dto.note,
          automated: false,
        },
        tx,
      );

      if (settled) {
        await this.audit.record(
          {
            entityType: 'problem',
            entityId: problemId,
            actor: 'System',
            action: upheld
              ? `Resolved — ${confirmed} of ${request.asked} reporters confirmed`
              : `Returned to delivery — ${denied} of ${request.asked} reporters said it is not fixed`,
          },
          tx,
        );
      }
    });

    return this.statusOf(problemId);
  }

  async statusOf(problemId: string) {
    const request = await this.prisma.verificationRequest.findUniqueOrThrow({
      where: { problemId },
      include: { problem: { select: { status: true, stage: true } } },
    });
    return {
      problemId,
      asked: request.asked,
      confirmed: request.confirmed,
      denied: request.denied,
      pending: request.pending,
      settled: request.pending === 0,
      problemStatus: request.problem.status,
      problemStage: request.problem.stage,
    };
  }

  /* -------------------------------------------------------- the evidence */

  /**
   * Attach uploaded photographs to the before or after side of a problem.
   *
   * `Evidence` holds `{ photos, activeReports, note, keys }` per side. The keys
   * are what makes a before/after gallery possible; the counts are what the
   * government screens have always shown.
   */
  async addEvidence(
    principal: AuthPrincipal,
    problemId: string,
    side: 'before' | 'after',
    keys: string[],
    note?: string,
  ) {
    const problem = await this.prisma.problem.findFirst({
      where: { id: problemId, deletedAt: null },
      select: { id: true },
    });
    if (!problem) throw ProblemException.notFound('No such problem.');

    await this.prisma.$transaction((tx) =>
      this.attachEvidence(tx, problemId, side, keys, principal.userId, note),
    );

    await this.audit.record({
      entityType: 'problem',
      entityId: problemId,
      actor: 'Officer',
      actorUserId: principal.userId,
      actorName: principal.displayName,
      action: `Uploaded ${keys.length} ${side} photograph${keys.length === 1 ? '' : 's'}`,
      detail: note,
    });

    return this.evidenceOf(problemId);
  }

  private async attachEvidence(
    tx: Prisma.TransactionClient,
    problemId: string,
    side: 'before' | 'after',
    keys: string[],
    ownerId: string,
    note?: string,
  ): Promise<void> {
    for (const key of keys) {
      await tx.attachment.upsert({
        where: { r2Key: key },
        update: { entityType: 'problem', entityId: problemId, purpose: `evidence-${side}` },
        create: {
          ownerId,
          r2Key: key,
          contentType: contentTypeOf(key),
          sizeBytes: 0,
          purpose: `evidence-${side}`,
          entityType: 'problem',
          entityId: problemId,
        },
      });
    }

    const existing = await tx.evidence.findUnique({ where: { problemId } });
    const current = (existing?.[side] as Record<string, unknown> | null) ?? {};
    const previousKeys = Array.isArray(current.keys) ? (current.keys as string[]) : [];
    const merged = {
      ...current,
      keys: [...new Set([...previousKeys, ...keys])],
      photos: new Set([...previousKeys, ...keys]).size,
      note: note ?? current.note ?? null,
    } as Prisma.InputJsonObject;

    if (existing) {
      await tx.evidence.update({ where: { problemId }, data: { [side]: merged } });
    } else {
      await tx.evidence.create({
        data: {
          problemId,
          before: side === 'before' ? merged : ({ photos: 0, keys: [] } as Prisma.InputJsonObject),
          after: side === 'after' ? merged : undefined,
        },
      });
    }
  }

  /** The before-and-after pair, with URLs a browser can render. */
  async evidenceOf(problemId: string) {
    const row = await this.prisma.evidence.findUnique({ where: { problemId } });
    if (!row) return { problemId, before: null, after: null };

    const side = (value: Prisma.JsonValue | null) => {
      if (!value || typeof value !== 'object') return null;
      const v = value as Record<string, unknown>;
      const keys = Array.isArray(v.keys) ? (v.keys as string[]) : [];
      return {
        photos: typeof v.photos === 'number' ? v.photos : keys.length,
        activeReports: typeof v.activeReports === 'number' ? v.activeReports : null,
        note: typeof v.note === 'string' ? v.note : null,
        images: keys.map((key) => ({ key, url: this.storage.publicUrl(key) })),
      };
    };

    return { problemId, before: side(row.before), after: side(row.after) };
  }

  /* ---------------------------------------------------------- the rating */

  /**
   * How well it was delivered.
   *
   * Open to the reporters of the problem the project came from — the same
   * standing rule as verification. One rating per person per project, replaced
   * rather than duplicated if they change their mind.
   */
  async rate(
    principal: AuthPrincipal,
    projectId: string,
    dto: {
      stars: number;
      comment?: string;
      timeliness?: number;
      quality?: number;
      conduct?: number;
    },
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
      select: { id: true, problemId: true, phase: true },
    });
    if (!project) throw ProblemException.notFound('No such project.');
    if (!project.problemId) {
      throw ProblemException.invalidState('This project is not attached to a citizen problem.');
    }

    /* Standing first, state second. Checking whether the work is finished
       before checking whether this person has any business asking tells an
       outsider the delivery state of a project they cannot see — small, but it
       is the kind of leak that is free to avoid and annoying to find later. */
    const entitled = await this.reporterIdsFor(project.problemId);
    if (!entitled.includes(principal.userId)) {
      throw ProblemException.notFound('No such project.');
    }

    if (project.phase !== 'completed') {
      throw ProblemException.invalidState(
        'This project is not finished yet. Rating it now would be rating work nobody has seen.',
      );
    }

    const rating = await this.prisma.deliveryRating.upsert({
      where: { projectId_userId: { projectId, userId: principal.userId } },
      update: {
        stars: dto.stars,
        comment: dto.comment ?? null,
        timeliness: dto.timeliness ?? null,
        quality: dto.quality ?? null,
        conduct: dto.conduct ?? null,
        deletedAt: null,
      },
      create: {
        projectId,
        userId: principal.userId,
        stars: dto.stars,
        comment: dto.comment ?? null,
        timeliness: dto.timeliness ?? null,
        quality: dto.quality ?? null,
        conduct: dto.conduct ?? null,
      },
      select: { id: true, stars: true },
    });

    await this.audit.record({
      entityType: 'problem',
      entityId: project.problemId,
      actor: 'Citizen',
      actorUserId: principal.userId,
      actorName: principal.displayName,
      action: `Rated the delivery ${dto.stars} out of 5`,
      detail: dto.comment,
      automated: false,
    });

    return { ...rating, projectId };
  }

  /** The rating summary a delivery leaderboard ranks on. */
  async ratingsOf(projectId: string) {
    const rows = await this.prisma.deliveryRating.findMany({
      where: { projectId, deletedAt: null },
      select: {
        stars: true,
        comment: true,
        timeliness: true,
        quality: true,
        conduct: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const mean = (pick: (r: (typeof rows)[number]) => number | null) => {
      const values = rows.map(pick).filter((v): v is number => v !== null);
      return values.length
        ? Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(2))
        : null;
    };

    return {
      projectId,
      count: rows.length,
      average: mean((r) => r.stars),
      timeliness: mean((r) => r.timeliness),
      quality: mean((r) => r.quality),
      conduct: mean((r) => r.conduct),
      // Comments without the commenter. A rating is a citizen's judgement of
      // their own government's work, and attaching a name to it in a public
      // summary is how people stop giving honest ones.
      comments: rows
        .filter((r) => r.comment)
        .map((r) => ({ stars: r.stars, comment: r.comment, at: r.createdAt.toISOString() })),
    };
  }

  /* --------------------------------------------------------- the appeal */

  /**
   * Object to a published ranking.
   *
   * DESIGN.md specifies this path and nothing implemented it. A ranking nobody
   * can contest is a ranking nobody outside the building will believe, and the
   * objection is recorded against the problem so an officer answers it in the
   * open rather than in a phone call.
   */
  async objectToRanking(principal: AuthPrincipal, problemId: string, reason: string) {
    const problem = await this.prisma.problem.findFirst({
      where: { id: problemId, deletedAt: null },
      select: { id: true },
    });
    if (!problem) throw ProblemException.notFound('No such problem.');

    const objection = await this.prisma.rankingObjection.create({
      data: { problemId, userId: principal.userId, reason },
      select: { id: true, status: true, at: true },
    });

    await this.audit.record({
      entityType: 'problem',
      entityId: problemId,
      actor: 'Citizen',
      actorUserId: principal.userId,
      actorName: principal.displayName,
      action: 'Objected to the published ranking',
      detail: reason,
      automated: false,
    });

    return { ...objection, at: objection.at.toISOString(), problemId };
  }

  async objections(problemId: string) {
    const rows = await this.prisma.rankingObjection.findMany({
      where: { problemId },
      orderBy: { at: 'desc' },
    });
    return rows.map((o) => ({
      id: o.id,
      reason: o.reason,
      status: o.status,
      at: o.at.toISOString(),
    }));
  }

  /**
   * An officer's answer: a named, bounded correction to the score.
   *
   * The same shape the priority engine already renders beside every other
   * adjustment, so an appeal that succeeds is visible in the decomposition
   * rather than being an unexplained movement.
   */
  async adjustPriority(
    principal: AuthPrincipal,
    problemId: string,
    dto: { label: string; points: number; reason: string; objectionId?: string },
  ) {
    if (Math.abs(dto.points) > 15) {
      throw ProblemException.badRequest(
        'A priority adjustment is bounded to ±15 points. Anything larger is a re-weighting, ' +
          'which belongs in the published weight set where everybody can see it.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.priorityAdjustment.create({
        data: { problemId, label: dto.label, points: dto.points, reason: dto.reason },
      });
      if (dto.objectionId) {
        await tx.rankingObjection.updateMany({
          where: { id: dto.objectionId, problemId },
          data: { status: 'upheld' },
        });
      }
      await this.audit.record(
        {
          entityType: 'problem',
          entityId: problemId,
          actor: 'Officer',
          actorUserId: principal.userId,
          actorName: principal.displayName,
          action: `Priority adjusted by ${dto.points > 0 ? '+' : ''}${dto.points} — ${dto.label}`,
          detail: dto.reason,
        },
        tx,
      );
    });

    return { problemId, adjusted: dto.points };
  }
}

function contentTypeOf(key: string): string {
  const ext = key.split('.').pop() ?? '';
  return (
    {
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      heic: 'image/heic',
      pdf: 'application/pdf',
    }[ext] ?? 'application/octet-stream'
  );
}
