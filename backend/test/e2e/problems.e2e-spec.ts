import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bearer, bootTestApp, reset, type TestContext } from './app';
import { seedGov } from '../../prisma/seed/gov';

/**
 * The stage-4 vertical slice: `/gov` problems end to end against the seeded
 * fixtures. Covers the ranking (parity with the priority engine), the three
 * mutations mirrored from apps/web's store, jurisdiction scoping (404 for a
 * sibling), and permission gating (403 without the permission).
 */
describe('problems (e2e)', () => {
  let ctx: TestContext;
  let district: string;
  let panchayat: string;
  const api = () => request(ctx.url);

  beforeAll(async () => {
    ctx = await bootTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await reset(ctx.prisma);
    await seedGov(ctx.prisma);
    district = await bearer(ctx.url, 'user-district@jansetu.local');
    panchayat = await bearer(ctx.url, 'user-gp@jansetu.local');
  });

  describe('list & ranking', () => {
    it('the DC sees all 12 problems, ranked, P-1042 first', async () => {
      const res = await api().get('/api/v1/problems').set('authorization', district);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(12);
      expect(res.body[0].id).toBe('P-1042');
      expect(res.body[0].rank).toBe(1);
      expect(res.body.map((p: { rank: number }) => p.rank)).toEqual(
        Array.from({ length: 12 }, (_, i) => i + 1),
      );
    });

    it('returns the full nested Problem shape apps/web expects', async () => {
      const res = await api().get('/api/v1/problems/P-1042').set('authorization', district);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: 'P-1042',
        villageIds: ['v-nagri', 'v-hesag', 'v-chandaghasi'],
        factors: { populationImpact: 96 },
        ai: { clusterLabel: expect.stringContaining('Water Supply') },
        sponsorship: { matches: expect.any(Array) },
        funding: { required: 620000 },
      });
      expect(res.body.sponsorship.matches).toHaveLength(3);
      expect(res.body.audit.length).toBeGreaterThanOrEqual(9);
    });

    it('filters by status', async () => {
      const res = await api()
        .get('/api/v1/problems?filter[status]=pending_validation')
        .set('authorization', district);
      expect(res.body.every((p: { status: string }) => p.status === 'pending_validation')).toBe(
        true,
      );
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('re-ranks under a weights override and carries previousRank', async () => {
      const weights = JSON.stringify({
        populationImpact: 5,
        severity: 5,
        deprivation: 5,
        coverage: 5,
        duration: 5,
        recurrence: 5,
        repeatedDemand: 60,
        citizenVotes: 10,
      });
      const res = await api()
        .get(`/api/v1/problems?weights=${encodeURIComponent(weights)}`)
        .set('authorization', district);
      expect(res.status).toBe(200);
      expect(
        res.body.every((p: { previousRank?: number }) => typeof p.previousRank === 'number'),
      ).toBe(true);
    });
  });

  describe('jurisdiction scoping', () => {
    it('a panchayat secretary sees only their panchayat', async () => {
      const res = await api().get('/api/v1/problems').set('authorization', panchayat);
      expect(
        res.body.every((p: { jurisdictionId: string }) => p.jurisdictionId === 'gp-nagri'),
      ).toBe(true);
      expect(res.body.length).toBeLessThan(12);
    });

    it('a problem in a sibling panchayat is a 404, not a 403', async () => {
      const res = await api().get('/api/v1/problems/P-1038').set('authorization', panchayat);
      expect(res.status).toBe(404);
      expect(res.body.code).toBe('OUT_OF_SCOPE');
    });
  });

  describe('validate', () => {
    it('transitions a pending problem and writes the audit pair', async () => {
      const before = await api()
        .get('/api/v1/problems/P-1055/audit')
        .set('authorization', district);
      const res = await api()
        .post('/api/v1/problems/P-1055/validate')
        .set('authorization', district);

      expect(res.status).toBe(201);
      expect(res.body.stage).toBe('prioritised');
      expect(res.body.status).toBe('funding_required'); // P-1055 is not CSR-eligible

      const after = await api().get('/api/v1/problems/P-1055/audit').set('authorization', district);
      expect(after.body.length).toBe(before.body.length + 2);
      expect(after.body.at(-2)).toMatchObject({ actor: 'Officer', action: 'Validated problem' });
      expect(after.body.at(-1)).toMatchObject({ actor: 'System' });
    });

    it('persists across a reload', async () => {
      await api().post('/api/v1/problems/P-1055/validate').set('authorization', district);
      const reload = await api().get('/api/v1/problems/P-1055').set('authorization', district);
      expect(reload.body.status).toBe('funding_required');
    });

    it('rejects a second validate with 422', async () => {
      await api().post('/api/v1/problems/P-1055/validate').set('authorization', district);
      const again = await api()
        .post('/api/v1/problems/P-1055/validate')
        .set('authorization', district);
      expect(again.status).toBe(422);
      expect(again.body.code).toBe('INVALID_STATE');
    });
  });

  describe('reject', () => {
    it('sets rejected and records the reason', async () => {
      const res = await api()
        .post('/api/v1/problems/P-1060/reject')
        .set('authorization', district)
        .send({ reason: 'Duplicate of an existing works order' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('rejected');
      const audit = await api().get('/api/v1/problems/P-1060/audit').set('authorization', district);
      expect(audit.body.at(-1)).toMatchObject({
        action: 'Rejected problem',
        detail: 'Duplicate of an existing works order',
      });
    });

    it('requires a reason', async () => {
      const res = await api()
        .post('/api/v1/problems/P-1060/reject')
        .set('authorization', district)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  describe('route', () => {
    it('changes the department, clears the officer and records the override', async () => {
      const res = await api()
        .post('/api/v1/problems/P-1051/route')
        .set('authorization', district)
        .send({ departmentId: 'dept-pwd', reason: 'Structural, not electrical' });
      expect(res.status).toBe(201);
      expect(res.body.departmentId).toBe('dept-pwd');
      expect(res.body.assignedOfficerId).toBeUndefined();
      expect(res.body.ai.routingOverridden).toMatchObject({
        departmentId: 'dept-pwd',
        reason: 'Structural, not electrical',
      });
    });

    it('rejects an unknown department', async () => {
      const res = await api()
        .post('/api/v1/problems/P-1051/route')
        .set('authorization', district)
        .send({ departmentId: 'dept-nope', reason: 'x y z' });
      expect(res.status).toBe(400);
    });
  });

  describe('permissions', () => {
    it('a role without settings.manage cannot publish weights (403)', async () => {
      const res = await api()
        .post('/api/v1/problems/priority/weights')
        .set('authorization', panchayat)
        .send({
          weights: {
            populationImpact: 30,
            severity: 20,
            deprivation: 20,
            coverage: 10,
            duration: 10,
            recurrence: 5,
            repeatedDemand: 3,
            citizenVotes: 2,
          },
        });
      expect(res.status).toBe(403);
      expect(res.body.detail).toContain('settings.manage');
    });

    it('the DC can publish weights and the new weighting is returned by /priority', async () => {
      const weights = {
        populationImpact: 40,
        severity: 25,
        deprivation: 15,
        coverage: 10,
        duration: 5,
        recurrence: 3,
        repeatedDemand: 1,
        citizenVotes: 1,
      };
      const pub = await api()
        .post('/api/v1/problems/priority/weights')
        .set('authorization', district)
        .send({ weights });
      expect(pub.status).toBe(201);

      const read = await api().get('/api/v1/problems/priority').set('authorization', district);
      expect(read.body.weights).toMatchObject(weights);
    });
  });

  describe('reference reads', () => {
    it.each([
      ['/api/v1/gov/departments', 5],
      ['/api/v1/gov/officers', 5],
      ['/api/v1/gov/sponsors', 5],
      ['/api/v1/gov/automations', 13],
      ['/api/v1/geography/jurisdictions', 6],
      ['/api/v1/geography/villages', 8],
      ['/api/v1/gov/analytics/weekly-trend', 12],
    ])('%s returns %i rows', async (path, count) => {
      const res = await api().get(path).set('authorization', district);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(count);
    });

    it('/gov/users marks the caller with isSelf', async () => {
      const res = await api().get('/api/v1/gov/users').set('authorization', district);
      expect(res.body.find((u: { id: string }) => u.id === 'user-district')?.isSelf).toBe(true);
    });
  });
});
