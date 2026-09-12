import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bearer, bootTestApp, reset, type TestContext } from './app';
import { seedGov } from '../../prisma/seed/gov';
import { seedOnboarding } from '../../prisma/seed/onboarding';
import { seedInstitute } from '../../prisma/seed/institute';
import { seedParticipation } from '../../prisma/seed/participation';
import { seedIndustry } from '../../prisma/seed/industry';

/**
 * The industry portal, and above all the boundary it sits behind.
 *
 * The portal's data was redacted in the browser before this stage: a module in
 * `apps/web/src/lib/industry/` decided what a partner may see of a citizen's
 * problem, and what it hid was names, phone numbers, verbatim complaints and
 * household coordinates. The tests that matter here are the ones that try to
 * get at those through the API and fail.
 */
describe('industry (e2e)', () => {
  let ctx: TestContext;
  let partner: string;
  let district: string;
  const api = () => request(ctx.url);

  /** Everything that must never appear in an industry response, anywhere. */
  const FORBIDDEN = [
    'reporterId',
    'citizenName',
    'phone',
    'raw',
    'originalQuote',
    'budgetCommitted',
    'budgetAllocated',
    'departmentBudgetAvailable',
    'enrollmentNo',
    'lat',
    'lng',
  ];

  beforeAll(async () => {
    ctx = await bootTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await reset(ctx.prisma);
    // The whole chain, in the order seed.ts runs it: the talent view reads the
    // institute's teams and the CSR position reads the benefits participation
    // creates, so a partial seed tests a portal that is not the one shipped.
    await seedGov(ctx.prisma);
    await seedOnboarding(ctx.prisma);
    await seedInstitute(ctx.prisma);
    await seedParticipation(ctx.prisma);
    await seedIndustry(ctx.prisma);
    partner = await bearer(ctx.url, 'industry@jansetu.local');
    district = await bearer(ctx.url, 'user-district@jansetu.local');
  });

  /* ======================================================== the boundary === */

  describe('the redaction boundary', () => {
    it('never emits a citizen-identifying field in the challenge list', async () => {
      const res = await api().get('/api/v1/industry/challenges').set('authorization', partner);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);

      const serialised = JSON.stringify(res.body);
      for (const field of FORBIDDEN) {
        expect(serialised, `"${field}" leaked into the challenge list`).not.toContain(`"${field}"`);
      }
    });

    it('never emits one on a single challenge, asked for by id', async () => {
      const res = await api()
        .get('/api/v1/industry/challenges/P-1042')
        .set('authorization', partner);
      expect(res.status).toBe(200);

      const serialised = JSON.stringify(res.body);
      for (const field of FORBIDDEN) {
        expect(serialised, `"${field}" leaked into the challenge detail`).not.toContain(
          `"${field}"`,
        );
      }
      // Village names cross; coordinates do not.
      expect(res.body.villages).toContain('Nagri');
      expect(res.body.affected).toBeGreaterThan(0);
      expect(res.body.reportCount).toBeGreaterThan(0);
    });

    it('hides an unvalidated problem completely, rather than redacting it', async () => {
      // P-1060 is pending_validation: an allegation about a place and a person
      // that industry has no standing to read at all.
      const problem = await ctx.prisma.problem.findUniqueOrThrow({ where: { id: 'P-1060' } });
      expect(problem.status).toBe('pending_validation');

      const list = await api().get('/api/v1/industry/challenges').set('authorization', partner);
      expect(list.body.map((c: { id: string }) => c.id)).not.toContain('P-1060');

      // And a 404, not a redacted 200 that would confirm it exists.
      const direct = await api()
        .get('/api/v1/industry/challenges/P-1060')
        .set('authorization', partner);
      expect(direct.status).toBe(404);
    });

    it('will not let a partner reach the government problem route at all', async () => {
      // 404 rather than 403, and deliberately: SurfaceGuard refuses to confirm
      // that a route exists and is forbidden, because that is itself a
      // disclosure about how the platform is arranged.
      const res = await api().get('/api/v1/problems/P-1042').set('authorization', partner);
      expect(res.status).toBe(404);

      const list = await api().get('/api/v1/problems').set('authorization', partner);
      expect(list.status).toBe(404);

      // Nor the reports behind it, which is where the verbatim text lives.
      const reports = await api()
        .get('/api/v1/problems/P-1042/reports')
        .set('authorization', partner);
      expect(reports.status).toBe(404);
    });

    it('collapses citizens into a count on the public timeline, and officers into an office', async () => {
      const res = await api()
        .get('/api/v1/industry/challenges/P-1042/timeline')
        .set('authorization', partner);
      expect(res.status).toBe(200);

      const citizen = res.body.filter((e: { actor: string }) => e.actor === 'Citizen');
      // At most one citizen row, and it names a number rather than a person.
      expect(citizen.length).toBeLessThanOrEqual(1);
      if (citizen.length === 1) {
        expect(citizen[0].actorName).toMatch(/^\d+ residents$/);
      }

      // The officer's own name is in the government audit trail and must not
      // be in this one.
      const officers = res.body.filter((e: { actor: string }) => e.actor === 'Officer');
      for (const entry of officers) {
        expect(entry.actorName).toMatch(/administration$/);
        expect(entry.actorName).not.toContain('Rajesh');
      }
    });

    it('gives a partner first names only in the talent view', async () => {
      const res = await api().get('/api/v1/industry/talent').set('authorization', partner);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);

      const serialised = JSON.stringify(res.body);
      for (const field of ['enrollmentNo', 'email', 'phone', 'resumeUrl', 'lastName']) {
        expect(serialised, `"${field}" leaked into the talent view`).not.toContain(`"${field}"`);
      }
      for (const team of res.body) {
        for (const member of team.members) {
          expect(Object.keys(member).sort()).toEqual(['discipline', 'firstName', 'year']);
        }
      }
    });

    it('publishes the policy it enforces', async () => {
      const res = await api()
        .get('/api/v1/industry/visibility-policy')
        .set('authorization', partner);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0]).toHaveProperty('visible');
      expect(res.body[0]).toHaveProperty('hidden');
    });

    it('keeps a government officer out of the industry portal', async () => {
      const res = await api().get('/api/v1/industry/challenges').set('authorization', district);
      expect(res.status).toBe(404);
    });
  });

  /* ============================================================== company === */

  describe('company profile', () => {
    it('serves the profile the match engine reads', async () => {
      const res = await api().get('/api/v1/industry/profile').set('authorization', partner);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Nirvaha Technologies');
      expect(res.body.csrThemes).toContain('water');
      expect(res.body.fundingRange.max).toBeGreaterThan(res.body.fundingRange.min);
    });

    it('updates it, and the match engine reads the new value immediately', async () => {
      const before = await api()
        .get('/api/v1/industry/challenges/P-1038/match')
        .set('authorization', partner);
      // P-1038 is infrastructure, which is not a declared theme.
      expect(before.body.factors.find((f: { key: string }) => f.key === 'csrTheme').score).toBe(45);

      const patch = await api()
        .patch('/api/v1/industry/profile')
        .set('authorization', partner)
        .send({
          csrThemes: ['water', 'rural', 'education', 'health', 'environment', 'infrastructure'],
        });
      expect(patch.status).toBe(200);

      const after = await api()
        .get('/api/v1/industry/challenges/P-1038/match')
        .set('authorization', partner);
      expect(after.body.factors.find((f: { key: string }) => f.key === 'csrTheme').score).toBe(100);
    });
  });

  /* ================================================================ match === */

  describe('the match engine', () => {
    it('decomposes a score into five factors that each carry their evidence', async () => {
      const res = await api()
        .get('/api/v1/industry/challenges/P-1042/match')
        .set('authorization', partner);
      expect(res.status).toBe(200);
      expect(res.body.factors).toHaveLength(5);
      for (const factor of res.body.factors) {
        expect(factor.evidence.length).toBeGreaterThan(10);
        expect(factor.score).toBeGreaterThanOrEqual(0);
        expect(factor.score).toBeLessThanOrEqual(100);
      }
      // The five weights sum to 100, so a score is a percentage of something.
      expect(res.body.factors.reduce((s: number, f: { weight: number }) => s + f.weight, 0)).toBe(
        100,
      );
    });

    it('ranks a water challenge in Jharkhand above one outside every declared theme', async () => {
      const res = await api().get('/api/v1/industry/matches').set('authorization', partner);
      expect(res.status).toBe(200);

      const scores = new Map<string, number>(
        res.body.map((r: { challenge: { id: string }; match: { score: number } }) => [
          r.challenge.id,
          r.match.score,
        ]),
      );
      // P-1042 is water, in Jharkhand, inside the funding band; P-1038 is
      // infrastructure, which the company's board did not approve.
      expect(scores.get('P-1042')!).toBeGreaterThan(scores.get('P-1038')!);

      // Returned best first.
      const returned = res.body.map((r: { match: { score: number } }) => r.match.score);
      expect([...returned].sort((a: number, b: number) => b - a)).toEqual(returned);
    });
  });

  /* ================================================================== CSR === */

  describe('CSR', () => {
    it('reports only this company’s own committed spend', async () => {
      const res = await api()
        .get('/api/v1/industry/csr?financialYear=2026-27')
        .set('authorization', partner);
      expect(res.status).toBe(200);

      // P-1008 is Nirvaha's; P-1003 is Tata's and must not be counted here.
      expect(res.body.benefits.map((b: { problemId: string }) => b.problemId)).toEqual(['P-1008']);
      expect(res.body.committed).toBe(480000);
      expect(res.body.outstanding).toBe(1);
    });
  });

  /* ========================================================= commitments === */

  describe('commitments', () => {
    it('puts a partner’s interest into the officer’s own queue', async () => {
      const res = await api()
        .post('/api/v1/industry/challenges/P-1049/commit')
        .set('authorization', partner)
        .send({ kind: 'proposal', amount: 210000, note: 'Can fund the whole build.' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('proposal');
      // The platform moves no money and says so rather than implying a rail.
      expect(res.body.paymentsEnabled).toBe(false);

      // Same row the government sponsorship tab reads — not a parallel table.
      const match = await ctx.prisma.sponsorshipMatch.findUniqueOrThrow({
        where: { problemId_sponsorId: { problemId: 'P-1049', sponsorId: 'sp-nirvaha' } },
      });
      expect(match.status).toBe('proposal');
      expect(Number(match.proposalAmount)).toBe(210000);
    });

    it('refuses to commit to a problem the government has not validated', async () => {
      const res = await api()
        .post('/api/v1/industry/challenges/P-1060/commit')
        .set('authorization', partner)
        .send({ kind: 'interest' });
      expect(res.status).toBe(404);
    });

    it('cannot approve its own sponsorship — that is the government’s decision', async () => {
      const res = await api()
        .post('/api/v1/problems/P-1049/sponsorship/approve')
        .set('authorization', partner)
        .send({ sponsorId: 'sp-nirvaha' });
      expect(res.status).toBe(404);
    });
  });
});
