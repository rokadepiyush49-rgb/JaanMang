import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProblemException } from '../common/errors/problem';
import type { AuthPrincipal } from '../auth/auth.types';

/**
 * Jurisdiction scoping — the server-side form of `scopeProblems()` /
 * `scopeIds()` in apps/web/src/lib/gov/rbac.ts.
 *
 * The rule: a government user sees their own jurisdiction and everything beneath
 * it, and nothing above or beside it. A panchayat secretary sees Nagri; the BDO
 * sees every panchayat in Ranchi block; the DC sees the district. The `admin`
 * role is unscoped.
 *
 * Every `/gov` list query passes through `jurisdictionFilter()`, and every
 * `/gov` detail/mutation through `assertJurisdiction()` — an out-of-scope record
 * is a 404, never a 403, so its existence is not disclosed.
 */
@Injectable()
export class ScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /** True when this principal is not jurisdiction-scoped (platform admin). */
  isUnscoped(principal: AuthPrincipal): boolean {
    return principal.roles.includes('admin');
  }

  /**
   * Every jurisdiction id at or below any of `roots`, via one recursive CTE.
   * Returns `roots` unchanged when empty is passed nothing to expand.
   */
  async subtree(roots: string[]): Promise<string[]> {
    if (roots.length === 0) return [];
    // Prisma keeps column names camelCase (no @map); quote "parentId" for raw SQL.
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      WITH RECURSIVE subtree AS (
        SELECT id FROM jurisdictions WHERE id = ANY(${roots})
        UNION ALL
        SELECT j.id FROM jurisdictions j
        JOIN subtree s ON j."parentId" = s.id
      )
      SELECT id FROM subtree
    `;
    return rows.map((r) => r.id);
  }

  /**
   * A Prisma `where` fragment that limits `jurisdictionId` to the principal's
   * subtree. `undefined` means "no restriction" (admin). An empty-but-defined
   * result (a gov user with no jurisdiction) yields a filter that matches
   * nothing, which is correct — they have been granted no scope.
   */
  async jurisdictionFilter(
    principal: AuthPrincipal,
  ): Promise<{ jurisdictionId: { in: string[] } } | undefined> {
    if (this.isUnscoped(principal)) return undefined;
    const ids = await this.subtree(principal.jurisdictionIds);
    return { jurisdictionId: { in: ids } };
  }

  /** Whether a specific jurisdiction is inside the principal's scope. */
  async canSeeJurisdiction(principal: AuthPrincipal, jurisdictionId: string): Promise<boolean> {
    if (this.isUnscoped(principal)) return true;
    const ids = new Set(await this.subtree(principal.jurisdictionIds));
    return ids.has(jurisdictionId);
  }

  /** Throws a 404 (`OUT_OF_SCOPE`) when the jurisdiction is not in scope. */
  async assertJurisdiction(principal: AuthPrincipal, jurisdictionId: string): Promise<void> {
    if (!(await this.canSeeJurisdiction(principal, jurisdictionId))) {
      throw ProblemException.outOfScope();
    }
  }
}
