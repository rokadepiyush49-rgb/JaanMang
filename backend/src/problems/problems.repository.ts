import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../rbac/scope.service';
import type { AuthPrincipal } from '../auth/auth.types';

/** Everything the problem mapper needs to build a full `ProblemDto`. */
export const PROBLEM_INCLUDE = {
  villages: { select: { villageId: true } },
  ai: true,
  factors: true,
  adjustments: { orderBy: { createdAt: 'asc' } },
  sponsorship: true,
  sponsorMatches: { orderBy: { createdAt: 'asc' } },
  funding: true,
  projects: { where: { kind: 'gov' as const }, take: 1 },
  evidence: true,
  verificationRequest: true,
  audit: { orderBy: { at: 'asc' } },
} satisfies Prisma.ProblemInclude;

export type ProblemRow = Prisma.ProblemGetPayload<{ include: typeof PROBLEM_INCLUDE }>;

/**
 * All problem reads and writes go through here, and every one is
 * jurisdiction-scoped: the `where` starts from `ScopeService.jurisdictionFilter`
 * so a query can never return a row outside the caller's subtree, and a
 * forgotten filter fails closed (returns nothing rather than everything).
 */
@Injectable()
export class ProblemsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: ScopeService,
  ) {}

  async list(
    principal: AuthPrincipal,
    filters: { status?: string; category?: string; departmentId?: string },
  ): Promise<ProblemRow[]> {
    const scopeWhere = await this.scope.jurisdictionFilter(principal);
    return this.prisma.problem.findMany({
      where: {
        deletedAt: null,
        ...scopeWhere,
        ...(filters.status ? { status: filters.status as never } : {}),
        ...(filters.category ? { category: filters.category as never } : {}),
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      },
      include: PROBLEM_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** One problem, or null when it is absent OR outside the caller's scope. */
  async findScoped(principal: AuthPrincipal, id: string): Promise<ProblemRow | null> {
    const scopeWhere = await this.scope.jurisdictionFilter(principal);
    return this.prisma.problem.findFirst({
      where: { id, deletedAt: null, ...scopeWhere },
      include: PROBLEM_INCLUDE,
    });
  }

  reportsFor(problemId: string) {
    return this.prisma.citizenReport.findMany({
      where: { problemId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** The published weighting for a jurisdiction, falling back to the state default. */
  async publishedWeights(jurisdictionId?: string): Promise<Prisma.JsonValue | null> {
    const specific = jurisdictionId
      ? await this.prisma.priorityWeightSet.findFirst({
          where: { jurisdictionId, published: true },
          orderBy: { createdAt: 'desc' },
        })
      : null;
    if (specific) return specific.weights;

    const fallback = await this.prisma.priorityWeightSet.findFirst({
      where: { jurisdictionId: null, published: true },
      orderBy: { createdAt: 'desc' },
    });
    return fallback?.weights ?? null;
  }

  transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(fn);
  }

  get client(): PrismaService {
    return this.prisma;
  }
}
