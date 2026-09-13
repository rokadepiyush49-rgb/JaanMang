import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ProblemException } from '../common/errors/problem';
import { PrismaService } from '../prisma/prisma.service';
import { ProblemsRepository } from '../problems/problems.repository';
import { ProblemsService } from '../problems/problems.service';
import type { AuthPrincipal } from '../auth/auth.types';
import type { RankedProblemDto } from '../problems/problem.types';
import type { AssignOfficerDto, AutomationToggleDto, ProjectProgressDto } from './delivery.dto';

/**
 * Delivery: who is carrying the work, how far along it is, and when it is done.
 *
 * Mirrors the `officer/assign`, `project/progress`, `project/complete`,
 * `automation/toggle` and `alert/read` cases of the apps/web store.
 *
 * Completion deliberately does *not* mark a problem resolved. It raises a
 * verification request addressed to the citizens whose reports formed the
 * problem, and they decide. An officer declaring their own work finished is
 * the thing this product exists to stop being the end of the story; the
 * verification machinery that reads these rows lands in stage 06.
 */
@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly repo: ProblemsRepository,
    private readonly problems: ProblemsService,
    private readonly audit: AuditService,
  ) {}

  /** apps/web store: `officer/assign`. */
  async assign(
    principal: AuthPrincipal,
    id: string,
    dto: AssignOfficerDto,
  ): Promise<RankedProblemDto> {
    const problem = await this.require(principal, id);

    const officer = await this.prisma.officer.findUnique({
      where: { userId: dto.officerId },
      include: { user: { select: { displayName: true } } },
    });
    if (!officer) throw ProblemException.notFound('No such officer.');

    // An officer in another department can be assigned — reassignment across
    // departments is a real thing a BDO does — but one in another *jurisdiction*
    // cannot, because they have no authority there and could not open the
    // problem they had been given.
    if (!principal.jurisdictionIds.includes(officer.jurisdictionId)) {
      const scoped = await this.repo.findScoped(principal, id);
      if (!scoped) throw ProblemException.notFound('No such officer in your jurisdiction.');
    }

    const previousId = problem.assignedOfficerId;
    if (previousId === dto.officerId) return this.problems.get(principal, id);

    const critical = problem.severity === 'critical';

    await this.repo.transaction(async (tx) => {
      await tx.problem.update({
        where: { id },
        data: {
          assignedOfficerId: dto.officerId,
          stage: problem.stage === 'impact' ? problem.stage : 'assigned',
          updatedAt: new Date(),
        },
      });

      await tx.project.updateMany({
        where: { problemId: id, kind: 'gov' },
        data: { officerId: dto.officerId },
      });

      // The officer workload counters the roster screen reads. Incremented and
      // decremented here rather than counted per request, because the officers
      // list renders five of these per row.
      await tx.officer.update({
        where: { userId: dto.officerId },
        data: {
          activeTasks: { increment: 1 },
          ...(critical ? { criticalTasks: { increment: 1 } } : {}),
        },
      });
      if (previousId) {
        await tx.officer.update({
          where: { userId: previousId },
          data: {
            activeTasks: { decrement: 1 },
            ...(critical ? { criticalTasks: { decrement: 1 } } : {}),
          },
        });
      }

      await this.audit.record(
        {
          entityType: 'problem',
          entityId: id,
          actor: 'Officer',
          actorUserId: principal.userId,
          actorName: principal.displayName,
          action: previousId ? 'Reassigned to officer' : 'Assigned to officer',
          detail: officer.user.displayName,
        },
        tx,
      );
    });

    return this.problems.get(principal, id);
  }

  /** apps/web store: `project/progress`. */
  async progress(
    principal: AuthPrincipal,
    id: string,
    dto: ProjectProgressDto,
  ): Promise<RankedProblemDto> {
    await this.require(principal, id);
    const project = await this.projectFor(id);

    if (dto.progress < project.progress) {
      throw ProblemException.invalidState(
        `Progress is already at ${project.progress}%. Moving it backwards needs a reason recorded against the project, not a silent update.`,
      );
    }

    await this.repo.transaction(async (tx) => {
      await tx.project.update({
        where: { id: project.id },
        data: {
          progress: dto.progress,
          phase: dto.progress >= 100 ? 'completed' : 'implementation',
        },
      });
      await tx.problem.update({
        where: { id },
        data: { stage: 'implementation', updatedAt: new Date() },
      });
      await this.audit.record(
        {
          entityType: 'problem',
          entityId: id,
          actor: 'Officer',
          actorUserId: principal.userId,
          actorName: principal.displayName,
          action: `Progress updated to ${dto.progress}%`,
          detail: dto.note,
        },
        tx,
      );
    });

    return this.problems.get(principal, id);
  }

  /**
   * apps/web store: `project/complete`, which also dispatched
   * `verification/request`.
   *
   * The two are one transaction here for a reason: a completed project that
   * failed to raise its verification request would sit finished and unverified,
   * and nobody would be asked whether it worked. Completion *is* the request.
   */
  async complete(principal: AuthPrincipal, id: string): Promise<RankedProblemDto> {
    const problem = await this.require(principal, id);
    const project = await this.projectFor(id);

    if (problem.status === 'verification_pending') {
      throw ProblemException.invalidState('This project is already awaiting citizen verification.');
    }

    await this.repo.transaction(async (tx) => {
      const now = new Date();

      await tx.project.update({
        where: { id: project.id },
        data: { progress: 100, phase: 'completed' },
      });

      await tx.problem.update({
        where: { id },
        data: { stage: 'verification', status: 'verification_pending', updatedAt: now },
      });

      // The "after" side of the before/after pair. Created empty, because the
      // photographs are uploaded in stage 06 — but created, so the gap is
      // visible on the screen rather than being an absent object the UI has to
      // guess the meaning of.
      const evidence = await tx.evidence.findUnique({ where: { problemId: id } });
      if (evidence && evidence.after === null) {
        await tx.evidence.update({
          where: { problemId: id },
          data: {
            after: {
              photos: 0,
              activeReports: 0,
              note: 'Completion evidence pending upload.',
            } as Prisma.InputJsonObject,
          },
        });
      }

      // Addressed to the people who reported it, not to a general audience.
      // That targeting is the whole point, and stage 06 delivers on it.
      await tx.verificationRequest.upsert({
        where: { problemId: id },
        update: { requestedAt: now, asked: problem.reportCount, pending: problem.reportCount },
        create: {
          problemId: id,
          requestedAt: now,
          asked: problem.reportCount,
          confirmed: 0,
          denied: 0,
          pending: problem.reportCount,
        },
      });

      await this.audit.recordMany(
        [
          {
            entityType: 'problem',
            entityId: id,
            actor: 'Officer',
            actorUserId: principal.userId,
            actorName: principal.displayName,
            action: 'Project marked complete',
          },
          {
            entityType: 'problem',
            entityId: id,
            actor: 'System',
            action: `Verification request sent to ${problem.reportCount} reporters`,
            detail: 'In the language each citizen reported in',
          },
        ],
        tx,
      );
    });

    return this.problems.get(principal, id);
  }

  /* -------------------------------------------------- automation & alerts */

  /** apps/web store: `automation/toggle`. */
  async toggleAutomation(principal: AuthPrincipal, id: string, dto: AutomationToggleDto) {
    const automation = await this.prisma.automation.findUnique({ where: { id } });
    if (!automation) throw ProblemException.notFound('No such automation.');

    const enabled = dto.enabled ?? !automation.enabled;

    const updated = await this.prisma.automation.update({
      where: { id },
      data: { enabled, status: enabled ? 'healthy' : 'paused' },
    });

    await this.audit.record({
      entityType: 'automation',
      entityId: id,
      actor: 'Officer',
      actorUserId: principal.userId,
      actorName: principal.displayName,
      action: `${enabled ? 'Enabled' : 'Paused'} automation`,
      detail: automation.name,
    });

    return updated;
  }

  /**
   * apps/web store: `alert/read`.
   *
   * Scoped to the caller's own notifications. Marking somebody else's alert
   * read is not a thing that should be possible, and an id in a URL is not
   * evidence of ownership.
   */
  async markAlertRead(principal: AuthPrincipal, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId: principal.userId },
      data: { read: true },
    });
    if (result.count === 0) throw ProblemException.notFound('No such alert.');
    return { id, read: true };
  }

  /* ---------------------------------------------------------------- utils */

  private async require(principal: AuthPrincipal, id: string) {
    const problem = await this.repo.findScoped(principal, id);
    if (!problem) throw ProblemException.notFound('No such problem in your jurisdiction.');
    return problem;
  }

  private async projectFor(problemId: string) {
    const project = await this.prisma.project.findFirst({
      where: { problemId, kind: 'gov' },
      orderBy: { createdAt: 'asc' },
    });
    if (!project) {
      throw ProblemException.invalidState(
        'There is no project on this problem yet. A project is created when funding is approved.',
      );
    }
    return project;
  }
}
