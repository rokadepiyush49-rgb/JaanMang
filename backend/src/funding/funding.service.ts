import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ProblemException } from '../common/errors/problem';
import { ProblemsRepository } from '../problems/problems.repository';
import { ProblemsService } from '../problems/problems.service';
import type { AuthPrincipal } from '../auth/auth.types';
import type { RankedProblemDto } from '../problems/problem.types';
import type { ApproveFundingDto, RejectFundingDto } from './funding.dto';

/**
 * Uncommitted budget for a department.
 *
 * `budgetSpent` is a subset of `budgetCommitted`, not a second claim on top of
 * it: money is committed when it is sanctioned and spent as it is disbursed
 * against that commitment. Subtracting both — the obvious first guess — made
 * every department in the seeded district look overdrawn (PWD by ₹11.6 lakh)
 * and would have refused every funding approval in the product.
 *
 * `apps/web/src/app/gov/departments/page.tsx` has always rendered the free
 * figure as allocated − committed. This is the same arithmetic, server-side.
 */
export function uncommitted(department: {
  budgetAllocated: Prisma.Decimal;
  budgetCommitted: Prisma.Decimal;
}): Prisma.Decimal {
  return department.budgetAllocated.minus(department.budgetCommitted);
}

/** Default delivery window for a project created by a funding approval. */
const PROJECT_DAYS = 60;

/**
 * Government funding.
 *
 * The rule this module exists to enforce: **a funding approval is one
 * transaction**. It moves a department's committed budget, writes the
 * commitment, writes the allocation, writes the public ledger entry and creates
 * the project — and either all of that happens or none of it does.
 *
 * A committed budget with no ledger entry is not a missing row, it is a corrupt
 * book: the department's remaining balance says the money is spoken for and
 * nothing in the public record says what for. That is precisely the failure the
 * platform claims to prevent, so it cannot be a failure mode of the platform.
 */
@Injectable()
export class FundingService {
  constructor(
    private readonly repo: ProblemsRepository,
    private readonly problems: ProblemsService,
    private readonly audit: AuditService,
  ) {}

  /** apps/web store: `funding/approve`. */
  async approve(
    principal: AuthPrincipal,
    id: string,
    dto: ApproveFundingDto,
  ): Promise<RankedProblemDto> {
    const problem = await this.require(principal, id);

    if (problem.funding?.status === 'approved') {
      throw ProblemException.invalidState('This funding has already been approved.');
    }
    if (problem.funding?.status === 'not_required') {
      throw ProblemException.invalidState(
        'This problem is sponsored by industry, so there is no government funding to approve.',
      );
    }
    if (!problem.departmentId) {
      throw ProblemException.invalidState(
        'Route this problem to a department before approving funding — the money comes out of a department budget, so there has to be one.',
      );
    }

    const amount =
      dto.amount !== undefined
        ? new Prisma.Decimal(dto.amount)
        : problem.funding?.required.greaterThan(0)
          ? problem.funding.required
          : problem.estimatedCost;

    await this.repo.transaction(async (tx) => {
      const now = new Date();

      // Re-read the department *inside* the transaction. The balance check and
      // the commitment have to see the same row, or two officers approving at
      // once can both pass a check against a budget only one of them can spend.
      const department = await tx.department.findUniqueOrThrow({
        where: { id: problem.departmentId! },
      });
      const available = uncommitted(department);

      if (available.lessThan(amount)) {
        throw ProblemException.invalidState(
          `${department.name} has ₹${available.toString()} uncommitted and this needs ₹${amount.toString()}. ` +
            'Reallocate, or seek industry sponsorship.',
        );
      }

      const source = dto.source ?? department.name;
      const fiscalYear = fiscalYearOf(now);

      await tx.department.update({
        where: { id: department.id },
        data: { budgetCommitted: { increment: amount } },
      });

      await tx.funding.upsert({
        where: { problemId: id },
        update: {
          status: 'approved',
          required: amount,
          source,
          approvedAt: now,
          approvedById: principal.userId,
          approvedByName: principal.displayName,
          departmentBudgetAvailable: available.minus(amount),
          fundable: true,
          note: dto.note ?? null,
        },
        create: {
          problemId: id,
          status: 'approved',
          required: amount,
          source,
          approvedAt: now,
          approvedById: principal.userId,
          approvedByName: principal.displayName,
          departmentBudgetAvailable: available.minus(amount),
          fundable: true,
          note: dto.note ?? null,
        },
      });

      // No `FundingCommitment` row here, despite the name. That model requires
      // a `sponsorOrgId` and carries `alsoOffering` and `tranches`: it is the
      // industry CSR commitment, and government money has no sponsor
      // organisation to point it at. Writing one with a fabricated org to
      // satisfy the shape would put a fictional sponsor in the CSR reports
      // stage 04 builds on top of it. Government funding is Funding +
      // Allocation + LedgerEntry.
      await tx.allocation.create({
        data: {
          problemId: id,
          amount,
          approvedById: principal.userId,
          status: 'approved',
          approvedAt: now,
        },
      });

      // The public record. This row is what the impact portal reads, and it is
      // written here rather than by a later job so that it cannot be missing.
      await tx.ledgerEntry.create({
        data: {
          problemId: id,
          title: problem.title,
          amount,
          department: source,
          fiscalYear,
          stage: 'committed',
          at: now,
        },
      });

      await tx.problem.update({
        where: { id },
        data: { stage: 'assigned', status: 'in_progress', updatedAt: now },
      });

      // One project per problem. `upsert` is not available on a non-unique
      // shape here, so it is a find-then-create — inside the transaction, so a
      // double submission cannot produce two.
      const existing = await tx.project.findFirst({ where: { problemId: id, kind: 'gov' } });
      if (!existing) {
        await tx.project.create({
          data: {
            kind: 'gov',
            problemId: id,
            title: problem.title,
            phase: 'planning',
            progress: 0,
            budget: amount,
            spent: 0,
            contractor: 'To be tendered',
            officerId: problem.assignedOfficerId,
            startedAt: now,
            dueAt: new Date(now.getTime() + PROJECT_DAYS * 24 * 36e5),
            planDays: PROJECT_DAYS,
            dayOfPlan: 0,
            sdgGoals: problem.sdgGoals,
            govMilestones: [
              { label: 'Tender & work order', done: false },
              { label: 'Mobilisation', done: false },
              { label: 'Execution', done: false },
              { label: 'Completion & handover', done: false },
            ],
          },
        });
      }

      await this.audit.recordMany(
        [
          {
            entityType: 'problem',
            entityId: id,
            actor: 'Officer',
            actorUserId: principal.userId,
            actorName: principal.displayName,
            action: `Approved ₹${lakhs(amount)} L from ${source}`,
            detail: dto.note,
          },
          {
            entityType: 'problem',
            entityId: id,
            actor: 'System',
            action: 'Committed against the department budget and written to the public ledger',
            detail: `${department.name} · ${fiscalYear}`,
          },
          {
            entityType: 'problem',
            entityId: id,
            actor: 'System',
            action: existing
              ? 'Existing project retained'
              : 'Project created — awaiting officer assignment',
          },
        ],
        tx,
      );
    });

    return this.problems.get(principal, id);
  }

  /** apps/web store: `funding/reject`. */
  async reject(
    principal: AuthPrincipal,
    id: string,
    dto: RejectFundingDto,
  ): Promise<RankedProblemDto> {
    const problem = await this.require(principal, id);
    if (problem.funding?.status === 'approved') {
      throw ProblemException.invalidState(
        'This funding is already approved. Rejecting it now would leave the budget committed — reverse the allocation instead.',
      );
    }

    await this.repo.transaction(async (tx) => {
      await tx.funding.upsert({
        where: { problemId: id },
        update: { status: 'rejected', note: dto.reason },
        create: { problemId: id, status: 'rejected', note: dto.reason },
      });
      await tx.problem.update({ where: { id }, data: { updatedAt: new Date() } });
      await this.audit.record(
        {
          entityType: 'problem',
          entityId: id,
          actor: 'Officer',
          actorUserId: principal.userId,
          actorName: principal.displayName,
          action: 'Funding rejected',
          detail: dto.reason,
        },
        tx,
      );
    });

    return this.problems.get(principal, id);
  }

  private async require(principal: AuthPrincipal, id: string) {
    const problem = await this.repo.findScoped(principal, id);
    if (!problem) throw ProblemException.notFound('No such problem in your jurisdiction.');
    return problem;
  }
}

/** Indian financial year: 1 April to 31 March. */
function fiscalYearOf(date: Date): string {
  const year = date.getFullYear();
  const start = date.getMonth() >= 3 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

function lakhs(amount: Prisma.Decimal): string {
  return amount.dividedBy(1e5).toFixed(1);
}
