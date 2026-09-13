import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ProblemException } from '../common/errors/problem';
import { ProblemsRepository } from '../problems/problems.repository';
import { ProblemsService } from '../problems/problems.service';
import { uncommitted } from '../funding/funding.service';
import type { AuthPrincipal } from '../auth/auth.types';
import type { RankedProblemDto } from '../problems/problem.types';
import type { ApproveSponsorshipDto, DeclineSponsorshipDto } from './sponsorship.dto';

/** How long industry has to answer before the government fallback arms. */
const RESPONSE_WINDOW_HOURS = 96;

/**
 * Industry sponsorship, persisted.
 *
 * Every method here mirrors one case in `apps/web/src/lib/gov/store.tsx` — the
 * same state transition and the same audit entries the reducer produced — with
 * the difference that it survives a reload. The reducer stays as the optimistic
 * half; this is the authority.
 *
 * The one piece of real logic is the fallback. When the last sponsor in play
 * declines, government funding is triggered without anybody pressing anything:
 * an officer should not have to notice that industry ran out, and a problem
 * should not sit waiting for a sponsor who is never coming.
 */
@Injectable()
export class SponsorshipService {
  constructor(
    private readonly repo: ProblemsRepository,
    private readonly problems: ProblemsService,
    private readonly audit: AuditService,
  ) {}

  /** apps/web store: `sponsorship/invite`. */
  async invite(principal: AuthPrincipal, id: string): Promise<RankedProblemDto> {
    const problem = await this.require(principal, id);

    if (!problem.sponsorship?.eligible) {
      throw ProblemException.invalidState(
        'This problem is not eligible for industry sponsorship. It goes to government funding instead.',
      );
    }
    if (problem.sponsorship.status === 'approved') {
      throw ProblemException.invalidState('This problem already has an approved sponsor.');
    }

    const matches = problem.sponsorMatches.filter((m) => m.status === 'matched');
    if (matches.length === 0) {
      throw ProblemException.invalidState(
        'No matched industries to invite. Run the matcher, or fall back to government funding.',
      );
    }

    const now = new Date();
    const dueAt = new Date(now.getTime() + RESPONSE_WINDOW_HOURS * 36e5);

    await this.repo.transaction(async (tx) => {
      await tx.problem.update({
        where: { id },
        data: { stage: 'sponsorship', status: 'awaiting_sponsorship', updatedAt: now },
      });
      await tx.sponsorship.update({
        where: { problemId: id },
        data: { status: 'invited', invitedAt: now, responseDueAt: dueAt },
      });
      await tx.sponsorshipMatch.updateMany({
        where: { problemId: id, status: 'matched' },
        data: { status: 'invited' },
      });
      await this.audit.recordMany(
        [
          {
            entityType: 'problem',
            entityId: id,
            actor: 'Officer',
            actorUserId: principal.userId,
            actorName: principal.displayName,
            action: `Sponsorship invitations sent to ${matches.length} industries`,
          },
          {
            entityType: 'problem',
            entityId: id,
            actor: 'System',
            action: `Industry response SLA set to ${RESPONSE_WINDOW_HOURS} hours`,
            detail: 'Funding fallback armed on expiry',
          },
        ],
        tx,
      );
    });

    return this.problems.get(principal, id);
  }

  /** apps/web store: `sponsorship/approve`. */
  async approve(
    principal: AuthPrincipal,
    id: string,
    dto: ApproveSponsorshipDto,
  ): Promise<RankedProblemDto> {
    const problem = await this.require(principal, id);
    const match = problem.sponsorMatches.find((m) => m.sponsorId === dto.sponsorId);

    if (!match) {
      throw ProblemException.notFound('That sponsor is not matched to this problem.');
    }
    if (match.status === 'declined') {
      throw ProblemException.invalidState('That sponsor has already declined.');
    }
    if (problem.sponsorship?.status === 'approved') {
      throw ProblemException.invalidState('This problem already has an approved sponsor.');
    }

    // The negotiated figure, the sponsor's proposal, or the estimate — in that
    // order of authority. Whichever it is, it is what the ledger records.
    const amount =
      dto.amount !== undefined
        ? new Prisma.Decimal(dto.amount)
        : (match.proposalAmount ?? problem.estimatedCost);

    await this.repo.transaction(async (tx) => {
      const now = new Date();
      await tx.problem.update({
        where: { id },
        data: { stage: 'funded', status: 'in_progress', updatedAt: now },
      });
      await tx.sponsorship.update({
        where: { problemId: id },
        data: {
          status: 'approved',
          approvedSponsorId: dto.sponsorId,
          approvedAmount: amount,
        },
      });
      await tx.sponsorshipMatch.update({
        where: { problemId_sponsorId: { problemId: id, sponsorId: dto.sponsorId } },
        data: { status: 'approved', respondedAt: now },
      });
      // Industry is paying, so the government funding requirement goes away.
      // Left as a row rather than deleted: "not required, because industry
      // funded it" is a different fact from "never considered".
      await tx.funding.upsert({
        where: { problemId: id },
        update: { status: 'not_required', note: 'Fully sponsored by industry.' },
        create: {
          problemId: id,
          status: 'not_required',
          note: 'Fully sponsored by industry.',
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
            action: 'Accepted industry sponsorship',
            detail: `${match.sponsorId} · ₹${amount.toString()}`,
          },
          {
            entityType: 'problem',
            entityId: id,
            actor: 'System',
            action: 'Problem moved to implementation queue',
          },
        ],
        tx,
      );
    });

    return this.problems.get(principal, id);
  }

  /**
   * apps/web store: `sponsorship/decline`.
   *
   * Declining the last sponsor in play triggers the government fallback in the
   * same transaction, which is the behaviour the reducer had and the reason
   * this is not simply an UPDATE.
   */
  async decline(
    principal: AuthPrincipal,
    id: string,
    dto: DeclineSponsorshipDto,
  ): Promise<RankedProblemDto> {
    const problem = await this.require(principal, id);
    const match = problem.sponsorMatches.find((m) => m.sponsorId === dto.sponsorId);

    if (!match) {
      throw ProblemException.notFound('That sponsor is not matched to this problem.');
    }
    if (problem.sponsorship?.status === 'approved') {
      throw ProblemException.invalidState(
        'This problem already has an approved sponsor; a decline now would change nothing.',
      );
    }

    const stillAlive = problem.sponsorMatches.some(
      (m) => m.sponsorId !== dto.sponsorId && m.status !== 'declined',
    );

    await this.repo.transaction(async (tx) => {
      const now = new Date();
      await tx.sponsorshipMatch.update({
        where: { problemId_sponsorId: { problemId: id, sponsorId: dto.sponsorId } },
        data: { status: 'declined', respondedAt: now, note: dto.reason },
      });
      await this.audit.record(
        {
          entityType: 'problem',
          entityId: id,
          actor: 'Industry',
          actorName: match.sponsorId,
          action: 'Sponsorship declined',
          detail: dto.reason,
        },
        tx,
      );

      if (!stillAlive) await this.applyFallback(principal, id, tx, 'automatic');
    });

    return this.problems.get(principal, id);
  }

  /** apps/web store: `sponsorship/fallback`, taken deliberately by an officer. */
  async fallback(principal: AuthPrincipal, id: string): Promise<RankedProblemDto> {
    const problem = await this.require(principal, id);
    if (problem.sponsorship?.status === 'approved') {
      throw ProblemException.invalidState(
        'This problem has an approved sponsor. Withdraw that before falling back to government funding.',
      );
    }

    await this.repo.transaction((tx) => this.applyFallback(principal, id, tx, 'manual'));
    return this.problems.get(principal, id);
  }

  /**
   * Industry failed; government pays.
   *
   * Shared by the manual route and the automatic one so the two cannot drift —
   * a fallback that behaved differently depending on whether a human pressed it
   * would be a genuinely confusing thing to debug six months later.
   *
   * Note what it does *not* do: approve the funding. It recommends a source and
   * says whether the department can afford it. Someone with `funding.approve`
   * still has to decide, because moving public money is a decision a person
   * makes.
   */
  private async applyFallback(
    principal: AuthPrincipal,
    id: string,
    tx: Prisma.TransactionClient,
    trigger: 'manual' | 'automatic',
  ): Promise<void> {
    const problem = await tx.problem.findUniqueOrThrow({
      where: { id },
      include: { funding: true, sponsorship: true, department: true },
    });

    const required = problem.estimatedCost;
    const available = problem.department ? uncommitted(problem.department) : new Prisma.Decimal(0);

    await tx.problem.update({
      where: { id },
      data: { stage: 'funded', status: 'funding_required', updatedAt: new Date() },
    });

    await tx.sponsorship.update({
      where: { problemId: id },
      data: {
        status: 'declined',
        failureReason:
          problem.sponsorship?.failureReason ??
          'No eligible sponsor accepted within the industry response window.',
      },
    });

    await tx.funding.upsert({
      where: { problemId: id },
      update: {
        status: 'recommended',
        required,
        departmentBudgetAvailable: available,
        fundable: available.greaterThanOrEqualTo(required),
        source: problem.department?.name ?? null,
        note:
          trigger === 'automatic'
            ? 'Fallback triggered automatically when industry sponsorship failed.'
            : 'Fallback triggered by an officer.',
      },
      create: {
        problemId: id,
        status: 'recommended',
        required,
        departmentBudgetAvailable: available,
        fundable: available.greaterThanOrEqualTo(required),
        source: problem.department?.name ?? null,
        note:
          trigger === 'automatic'
            ? 'Fallback triggered automatically when industry sponsorship failed.'
            : 'Fallback triggered by an officer.',
      },
    });

    await this.audit.recordMany(
      [
        {
          entityType: 'problem',
          entityId: id,
          actor: trigger === 'automatic' ? 'System' : 'Officer',
          actorUserId: trigger === 'manual' ? principal.userId : undefined,
          actorName: trigger === 'manual' ? principal.displayName : undefined,
          action: 'Industry sponsorship marked failed',
          detail: trigger === 'automatic' ? 'Every matched industry declined' : undefined,
        },
        {
          entityType: 'problem',
          entityId: id,
          actor: 'System',
          action: 'Government funding workflow triggered',
          detail: 'Recommended source attached from the department’s budget heads',
        },
      ],
      tx,
    );
  }

  private async require(principal: AuthPrincipal, id: string) {
    const problem = await this.repo.findScoped(principal, id);
    if (!problem) throw ProblemException.notFound('No such problem in your jurisdiction.');
    return problem;
  }
}
