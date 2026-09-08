import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { ScopeService } from '../../src/rbac/scope.service';
import { seedGov } from '../../prisma/seed/gov';
import { bootTestApp, reset, type TestContext } from './app';
import type { AuthPrincipal } from '../../src/auth/auth.types';

/**
 * Ports the `scopeIds` / `scopeProblems` cases from apps/web/src/lib/gov/rbac.ts
 * to the recursive-CTE implementation, against the real seeded jurisdiction
 * tree (state → district → block → 3 panchayats).
 */
describe('ScopeService (e2e)', () => {
  let ctx: TestContext;
  let scope: ScopeService;

  const principal = (roles: string[], jurisdictionIds: string[]): AuthPrincipal => ({
    userId: 'u',
    kind: 'staff',
    displayName: 'x',
    roles,
    permissions: new Set(),
    orgIds: [],
    jurisdictionIds,
  });

  beforeAll(async () => {
    ctx = await bootTestApp();
    scope = ctx.app.get(ScopeService);
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await reset(ctx.prisma);
    await seedGov(ctx.prisma);
  });

  it('a panchayat secretary sees only their own panchayat', async () => {
    const ids = await scope.subtree(['gp-nagri']);
    expect(ids).toEqual(['gp-nagri']);
  });

  it('a BDO sees the block and every panchayat under it', async () => {
    const ids = (await scope.subtree(['jh-ran-blk'])).sort();
    expect(ids).toEqual(['gp-nagri', 'gp-ormanjhi', 'gp-pithoria', 'jh-ran-blk']);
  });

  it('the DC sees the whole district subtree', async () => {
    const ids = await scope.subtree(['jh-ran']);
    expect(ids).toContain('jh-ran');
    expect(ids).toContain('jh-ran-blk');
    expect(ids).toContain('gp-nagri');
    expect(ids).not.toContain('jh'); // nothing above
  });

  it('jurisdictionFilter scopes a query to the subtree', async () => {
    const filter = await scope.jurisdictionFilter(principal(['gov_panchayat'], ['gp-nagri']));
    expect(filter).toEqual({ jurisdictionId: { in: ['gp-nagri'] } });

    const visible = await ctx.prisma.problem.findMany({ where: filter });
    // Nagri GP problems only — Pithoria and Ormanjhi problems are out of scope.
    expect(visible.every((p) => p.jurisdictionId === 'gp-nagri')).toBe(true);
    expect(visible.length).toBeGreaterThan(0);
  });

  it('an admin is unscoped (no filter, sees every problem)', async () => {
    const filter = await scope.jurisdictionFilter(principal(['admin'], []));
    expect(filter).toBeUndefined();
    const all = await ctx.prisma.problem.findMany({ where: filter });
    expect(all).toHaveLength(12);
  });

  it('a gov user with no jurisdiction sees nothing', async () => {
    const filter = await scope.jurisdictionFilter(principal(['gov_block'], []));
    expect(filter).toEqual({ jurisdictionId: { in: [] } });
    const none = await ctx.prisma.problem.findMany({ where: filter });
    expect(none).toHaveLength(0);
  });

  it('assertJurisdiction throws OUT_OF_SCOPE (404) for a sibling jurisdiction', async () => {
    const nagri = principal(['gov_panchayat'], ['gp-nagri']);
    await expect(scope.assertJurisdiction(nagri, 'gp-nagri')).resolves.toBeUndefined();
    await expect(scope.assertJurisdiction(nagri, 'gp-pithoria')).rejects.toMatchObject({
      status: 404,
    });
  });
});
