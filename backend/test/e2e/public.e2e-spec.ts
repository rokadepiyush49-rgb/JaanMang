import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bootTestApp, reset, type TestContext } from './app';
import { seedGov } from '../../prisma/seed/gov';
import { seedOnboarding } from '../../prisma/seed/onboarding';
import { seedInstitute } from '../../prisma/seed/institute';
import { seedParticipation } from '../../prisma/seed/participation';
import { RecognitionService } from '../../src/recognition/recognition.service';

/**
 * The public portal and the recognition layer.
 *
 * Everything here is reachable with no account at all, which makes it the
 * strictest redaction boundary on the platform — and the only place the
 * product's claims can be checked by somebody who does not work for it.
 */
describe('public (e2e)', () => {
  let ctx: TestContext;
  let recognition: RecognitionService;
  const api = () => request(ctx.url);

  /** Nothing individual may appear on any public response. */
  const FORBIDDEN = [
    'citizenName',
    'reporterId',
    'verifierId',
    'raw',
    'originalQuote',
    'budgetAllocated',
    'budgetCommitted',
    'departmentBudgetAvailable',
    'approvedByName',
    'actorName',
    'lat',
    'lng',
    'phone',
    'email',
  ];

  beforeAll(async () => {
    ctx = await bootTestApp();
    recognition = ctx.app.get(RecognitionService);
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await reset(ctx.prisma);
    await seedGov(ctx.prisma);
    await seedOnboarding(ctx.prisma);
    await seedInstitute(ctx.prisma);
    await seedParticipation(ctx.prisma);
  });

  describe('no account required, and nothing individual crosses', () => {
    it('serves published problems to a stranger', async () => {
      const res = await api().get('/api/v1/public/problems');
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);

      const serialised = JSON.stringify(res.body);
      for (const field of FORBIDDEN) {
        expect(serialised, `"${field}" leaked to the public portal`).not.toContain(`"${field}"`);
      }
    });

    it('hides an unvalidated problem from the public entirely', async () => {
      const list = await api().get('/api/v1/public/problems');
      expect(list.body.map((p: { id: string }) => p.id)).not.toContain('P-1060');

      const direct = await api().get('/api/v1/public/problems/P-1060');
      expect(direct.status).toBe(404);
    });

    it('serves one problem with its ledger and evidence, and no identities', async () => {
      const res = await api().get('/api/v1/public/problems/P-1042');
      expect(res.status).toBe(200);
      expect(res.body.villages.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('evidence');
      expect(res.body).toHaveProperty('ledger');

      const serialised = JSON.stringify(res.body);
      for (const field of FORBIDDEN) {
        expect(serialised, `"${field}" leaked`).not.toContain(`"${field}"`);
      }
    });

    it('filters by district, category and SDG', async () => {
      const water = await api().get('/api/v1/public/problems?category=water');
      expect(water.body.every((p: { category: string }) => p.category === 'water')).toBe(true);

      const sdg6 = await api().get('/api/v1/public/problems?sdg=6');
      expect(sdg6.body.length).toBeGreaterThan(0);
      expect(sdg6.body.every((p: { sdgs: number[] }) => p.sdgs.includes(6))).toBe(true);
    });
  });

  describe('impact', () => {
    it('counts only problems the citizens confirmed, not the ones an officer closed', async () => {
      const res = await api().get('/api/v1/public/impact');
      expect(res.status).toBe(200);

      // The seed has resolved problems but no confirmed Verification rows, so
      // the verified count is honestly zero rather than borrowing the
      // government's own "resolved" tally.
      const resolved = await ctx.prisma.problem.count({ where: { status: 'resolved' } });
      expect(resolved).toBeGreaterThan(0);
      expect(res.body.totals.problemsVerified).toBe(0);

      expect(res.body.totals.problemsPublished).toBeGreaterThan(0);
      expect(res.body.districts.length).toBeGreaterThan(0);
      expect(res.body.provenance).toContain('confirmed the work was done');
    });

    it('publishes the funding ledger', async () => {
      const res = await api().get('/api/v1/public/ledger');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('entries');
      expect(res.body).toHaveProperty('total');
    });
  });

  describe('the recognition layer', () => {
    beforeEach(async () => {
      await recognition.recomputeAll();
    });

    it('ranks on verified outcomes, and publishes the formula', async () => {
      const res = await api().get('/api/v1/public/leaderboard/citizens');
      expect(res.status).toBe(200);
      expect(res.body.formula.length).toBeGreaterThan(0);

      // Ordered, and every entry carries the components of its own score so a
      // ranking can be argued with.
      const ranks = res.body.entries.map((e: { rank: number }) => e.rank);
      expect(ranks).toEqual([...ranks].sort((a: number, b: number) => a - b));
      for (const entry of res.body.entries) {
        expect(entry.breakdown).toBeTruthy();
        expect(entry.score).toBeGreaterThan(0);
      }
    });

    it('leaves out subjects who have done nothing rather than ranking them last', async () => {
      const res = await api().get('/api/v1/public/leaderboard/students');
      const zero = res.body.entries.filter((e: { score: number }) => e.score === 0);
      expect(zero).toHaveLength(0);
    });

    it('serves every scope', async () => {
      for (const scope of ['citizens', 'students', 'institutes', 'partners', 'officers']) {
        const res = await api().get(`/api/v1/public/leaderboard/${scope}`);
        expect(res.status, scope).toBe(200);
        expect(res.body.scope).toBe(scope);
      }
    });

    it('refuses a scope that does not exist', async () => {
      const res = await api().get('/api/v1/public/leaderboard/mayors');
      expect(res.status).toBe(404);
    });

    it('awards a badge only when its rule actually holds', async () => {
      const badge = await ctx.prisma.badge.findUniqueOrThrow({ where: { key: 'first_report' } });

      // Clear the seeded awards so the cron has to decide for itself.
      await ctx.prisma.badgeEarned.deleteMany({ where: { badgeId: badge.id } });
      const result = await recognition.recomputeAll();
      expect(result.badges).toBeGreaterThan(0);

      const earned = await ctx.prisma.badgeEarned.findFirst({ where: { badgeId: badge.id } });
      expect(earned).not.toBeNull();
      // The snapshot that fired the rule, so a holder can see which reports
      // earned it rather than just being told they qualified.
      expect(earned!.evidence).toMatchObject({ threshold: 1 });
      expect((earned!.evidence as { reports_validated: number }).reports_validated).toBeGreaterThan(
        0,
      );

      // `verifier_10` needs ten confirmed verifications. Nobody has any.
      const verifier = await ctx.prisma.badge.findUniqueOrThrow({ where: { key: 'verifier_10' } });
      expect(await ctx.prisma.badgeEarned.count({ where: { badgeId: verifier.id } })).toBe(0);
    });

    it('does not re-award a badge somebody already holds', async () => {
      const before = await ctx.prisma.badgeEarned.findMany({
        select: { id: true, earnedAt: true },
        orderBy: { id: 'asc' },
      });
      await recognition.recomputeAll();
      const after = await ctx.prisma.badgeEarned.findMany({
        select: { id: true, earnedAt: true },
        orderBy: { id: 'asc' },
      });
      // Same rows, same timestamps. A badge earned on the day the rule said so
      // stays earned, and its date does not drift every time the cron runs.
      expect(after).toEqual(before);
    });

    it('is idempotent — recomputing does not duplicate badges or rows', async () => {
      const badgesBefore = await ctx.prisma.badgeEarned.count();
      const entriesBefore = await ctx.prisma.leaderboardEntry.count();

      await recognition.recomputeAll();

      expect(await ctx.prisma.badgeEarned.count()).toBe(badgesBefore);
      expect(await ctx.prisma.leaderboardEntry.count()).toBe(entriesBefore);
    });
  });
});
