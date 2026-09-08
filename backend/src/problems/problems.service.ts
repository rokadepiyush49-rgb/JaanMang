import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ProblemException } from '../common/errors/problem';
import type { AuthPrincipal } from '../auth/auth.types';
import {
  DEFAULT_WEIGHTS,
  isPriorityWeights,
  rankProblems,
  type PriorityWeights,
} from './priority/priority.engine';
import { toProblemDto } from './problems.mapper';
import { ProblemsRepository, type ProblemRow } from './problems.repository';
import type { ProblemDto, RankedProblemDto } from './problem.types';

interface ListArgs {
  status?: string;
  category?: string;
  departmentId?: string;
  weights?: PriorityWeights;
}

/**
 * The government problem lifecycle. Each mutation mirrors a case in the
 * `apps/web/src/lib/gov/store.tsx` reducer — same state transition, same audit
 * entries — but committed to Postgres in a transaction.
 */
@Injectable()
export class ProblemsService {
  constructor(
    private readonly repo: ProblemsRepository,
    private readonly audit: AuditService,
  ) {}

  /* --------------------------------------------------------------- reads */

  async list(principal: AuthPrincipal, args: ListArgs): Promise<RankedProblemDto[]> {
    const rows = await this.repo.list(principal, args);
    return this.rank(rows, args.weights, await this.baselineWeights(principal));
  }

  async get(principal: AuthPrincipal, id: string): Promise<RankedProblemDto> {
    const row = await this.requireScoped(principal, id);
    // Rank within the caller's visible set so `rank` is meaningful on a detail page.
    const all = await this.repo.list(principal, {});
    const baseline = await this.baselineWeights(principal);
    const ranked = this.rank(all, undefined, baseline);
    return ranked.find((p) => p.id === id) ?? this.rankOne(row, baseline);
  }

  reports(principal: AuthPrincipal, id: string) {
    return this.requireScoped(principal, id).then(() => this.repo.reportsFor(id));
  }

  async audits(principal: AuthPrincipal, id: string) {
    await this.requireScoped(principal, id);
    return this.audit.forProblem(id);
  }

  /* ----------------------------------------------------------- mutations */

  /** apps/web store: `problem/validate`. */
  async validate(principal: AuthPrincipal, id: string): Promise<RankedProblemDto> {
    const problem = await this.requireScoped(principal, id);
    if (problem.status !== 'pending_validation') {
      throw ProblemException.invalidState('This problem has already been validated or rejected.');
    }
    const eligible = problem.sponsorship?.eligible ?? false;

    await this.repo.transaction(async (tx) => {
      await tx.problem.update({
        where: { id },
        data: {
          stage: 'prioritised',
          status: eligible ? 'awaiting_sponsorship' : 'funding_required',
          updatedAt: new Date(),
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
            action: 'Validated problem',
          },
          {
            entityType: 'problem',
            entityId: id,
            actor: 'System',
            action: eligible
              ? 'Sponsorship eligibility confirmed'
              : 'Marked for government funding — not CSR eligible',
            detail: 'Automatic on validation',
          },
        ],
        tx,
      );
    });

    return this.get(principal, id);
  }

  /** apps/web store: `problem/reject`. */
  async reject(principal: AuthPrincipal, id: string, reason: string): Promise<RankedProblemDto> {
    const problem = await this.requireScoped(principal, id);
    if (problem.status === 'rejected') {
      throw ProblemException.invalidState('This problem is already rejected.');
    }

    await this.repo.transaction(async (tx) => {
      await tx.problem.update({
        where: { id },
        data: { status: 'rejected', updatedAt: new Date() },
      });
      await this.audit.record(
        {
          entityType: 'problem',
          entityId: id,
          actor: 'Officer',
          actorUserId: principal.userId,
          actorName: principal.displayName,
          action: 'Rejected problem',
          detail: reason,
        },
        tx,
      );
    });

    return this.get(principal, id);
  }

  /** apps/web store: `problem/route`. */
  async route(
    principal: AuthPrincipal,
    id: string,
    departmentId: string,
    reason: string,
  ): Promise<RankedProblemDto> {
    const problem = await this.requireScoped(principal, id);

    const department = await this.repo.client.department.findUnique({
      where: { id: departmentId },
    });
    if (!department) throw ProblemException.badRequest('Unknown department.');
    if (problem.departmentId === departmentId) {
      throw ProblemException.invalidState('The problem is already routed to that department.');
    }

    await this.repo.transaction(async (tx) => {
      await tx.problem.update({
        where: { id },
        data: { departmentId, assignedOfficerId: null, updatedAt: new Date() },
      });
      await tx.problemAi.update({
        where: { problemId: id },
        data: {
          routingOverridden: {
            byOfficerId: principal.userId,
            departmentId,
            reason,
            at: new Date().toISOString(),
          } satisfies Prisma.InputJsonValue,
        },
      });
      await this.audit.record(
        {
          entityType: 'problem',
          entityId: id,
          actor: 'Officer',
          actorUserId: principal.userId,
          actorName: principal.displayName,
          action: 'Routing overridden',
          detail: reason,
        },
        tx,
      );
    });

    return this.get(principal, id);
  }

  /* --------------------------------------------------------------- weights */

  async publishedWeights(principal: AuthPrincipal): Promise<PriorityWeights> {
    return this.baselineWeights(principal);
  }

  async publishWeights(
    principal: AuthPrincipal,
    weights: PriorityWeights,
    jurisdictionId?: string,
  ): Promise<PriorityWeights> {
    if (jurisdictionId) await this.requireScopeForJurisdiction(principal, jurisdictionId);
    await this.repo.client.priorityWeightSet.create({
      data: {
        jurisdictionId: jurisdictionId ?? null,
        published: true,
        weights: weights as Prisma.InputJsonValue,
        createdById: principal.userId,
      },
    });
    return weights;
  }

  /* ---------------------------------------------------------------- helpers */

  private async requireScoped(principal: AuthPrincipal, id: string): Promise<ProblemRow> {
    const row = await this.repo.findScoped(principal, id);
    if (!row) throw ProblemException.outOfScope();
    return row;
  }

  private async requireScopeForJurisdiction(principal: AuthPrincipal, jurisdictionId: string) {
    // Reuses the same 404 semantics as a problem outside scope.
    const rows = await this.repo.list(principal, {});
    const inScope =
      principal.roles.includes('admin') ||
      principal.jurisdictionIds.includes(jurisdictionId) ||
      rows.some((r) => r.jurisdictionId === jurisdictionId);
    if (!inScope) throw ProblemException.outOfScope();
  }

  private async baselineWeights(_principal: AuthPrincipal): Promise<PriorityWeights> {
    const raw = await this.repo.publishedWeights();
    return isPriorityWeights(raw) ? raw : DEFAULT_WEIGHTS;
  }

  private rank(
    rows: ProblemRow[],
    weights: PriorityWeights | undefined,
    baseline: PriorityWeights,
  ): RankedProblemDto[] {
    const dtos = rows.map(toProblemDto);
    const active = weights ?? baseline;
    const ranked = rankProblems(
      dtos.map((d) => ({
        id: d.id,
        affected: d.affected,
        factors: d.factors,
        adjustments: d.adjustments,
      })),
      active,
      weights ? baseline : undefined,
    );
    const byId = new Map(dtos.map((d) => [d.id, d]));
    return ranked.map((r) => ({
      ...(byId.get(r.problem.id) as ProblemDto),
      score: r.score,
      rank: r.rank,
      previousRank: r.previousRank,
    }));
  }

  private rankOne(row: ProblemRow, baseline: PriorityWeights): RankedProblemDto {
    const [only] = this.rank([row], undefined, baseline);
    return only;
  }
}
