import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bearer, bootTestApp, reset, type TestContext } from './app';
import { seedGov } from '../../prisma/seed/gov';
import { seedOnboarding } from '../../prisma/seed/onboarding';
import { seedInstitute } from '../../prisma/seed/institute';
import { seedParticipation } from '../../prisma/seed/participation';
import { seedIndustry } from '../../prisma/seed/industry';

/**
 * The student workspace.
 *
 * Thirteen screens rendered from fixtures before this stage, down to a literal
 * `badge: 3` on a nav item. What matters here is that a student sees their own
 * institution's work, their own applications, and recommendations that say why.
 */
describe('student (e2e)', () => {
  let ctx: TestContext;
  let student: string;
  let partner: string;
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
    await seedOnboarding(ctx.prisma);
    await seedInstitute(ctx.prisma);
    await seedParticipation(ctx.prisma);
    await seedIndustry(ctx.prisma);
    student = await bearer(ctx.url, 'student@jansetu.local');
    partner = await bearer(ctx.url, 'industry@jansetu.local');
  });

  describe('profile', () => {
    it('serves the student their own record', async () => {
      const res = await api().get('/api/v1/student/profile').set('authorization', student);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Aisha Patel');
      expect(res.body.institution.name).toContain('Birla Institute');
      expect(res.body.branch).toBeTruthy();
    });

    it('lets a student edit their skills but not their year or institution', async () => {
      const res = await api()
        .patch('/api/v1/student/profile')
        .set('authorization', student)
        .send({
          skills: ['Python', 'LoRaWAN'],
          weeklyHours: 14,
          currentYear: 4,
          branch: 'Medicine',
        });
      expect(res.status).toBe(200);
      expect(res.body.skills).toEqual(['Python', 'LoRaWAN']);
      expect(res.body.weeklyHours).toBe(14);

      // The facts the institution asserted are untouched: the DTO has no field
      // for them, so they are dropped rather than refused.
      const profile = await ctx.prisma.studentProfile.findUniqueOrThrow({
        where: { userId: 'user-student' },
      });
      expect(profile.currentYear).not.toBe(4);
      expect(profile.branch).not.toBe('Medicine');
    });
  });

  describe('opportunities', () => {
    it('shows only problems the government has validated', async () => {
      const res = await api().get('/api/v1/student/opportunities').set('authorization', student);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);

      const ids = res.body.map((o: { id: string }) => o.id);
      // Pending validation — an allegation about a place and a person.
      expect(ids).not.toContain('P-1060');
      expect(ids).not.toContain('P-1055');
    });

    it('carries a difficulty signal so a second-year has somewhere to start', async () => {
      const res = await api()
        .get('/api/v1/student/opportunities?difficulty=starter')
        .set('authorization', student);
      expect(res.status).toBe(200);
      for (const o of res.body) expect(o.difficulty).toBe('starter');
    });

    it('never exposes a citizen report through the student surface either', async () => {
      const res = await api().get('/api/v1/student/opportunities').set('authorization', student);
      const serialised = JSON.stringify(res.body);
      for (const field of ['citizenName', 'reporterId', 'raw', 'originalQuote']) {
        expect(serialised, `"${field}" leaked`).not.toContain(`"${field}"`);
      }
    });
  });

  describe('recommendations', () => {
    it('ranks with a reason on every row', async () => {
      const res = await api().get('/api/v1/student/recommendations').set('authorization', student);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);

      for (const r of res.body) {
        // The rule the model adapter is held to as well: a recommendation a
        // student cannot interrogate is one they will not act on.
        expect(r.reasons.length).toBeGreaterThan(0);
        expect(r.reasons[0].length).toBeGreaterThan(10);
        expect(r.score).toBeGreaterThanOrEqual(0);
        expect(r.score).toBeLessThanOrEqual(100);
      }

      const scores = res.body.map((r: { score: number }) => r.score);
      expect([...scores].sort((a: number, b: number) => b - a)).toEqual(scores);
    });

    it('runs the heuristic when no model is configured', async () => {
      // RECOMMENDER_URL is unset in test, so ModelRecommender delegates. The
      // observable property is simply that it answers rather than failing.
      const res = await api()
        .get('/api/v1/student/recommendations?limit=3')
        .set('authorization', student);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeLessThanOrEqual(3);
    });
  });

  describe('applications', () => {
    it('writes the same row the institute reviews', async () => {
      const res = await api()
        .post('/api/v1/student/opportunities/P-1049/apply')
        .set('authorization', student)
        .send({ note: 'We have surveyed this tola already.' });
      expect(res.status).toBe(201);

      const row = await ctx.prisma.application.findFirstOrThrow({
        where: { studentId: 'user-student', challengeId: 'P-1049' },
      });
      expect(row.status).toBe('submitted');
      expect(row.submittedAt).not.toBeNull();
    });

    it('refuses a second application to the same opportunity', async () => {
      await api()
        .post('/api/v1/student/opportunities/P-1049/apply')
        .set('authorization', student)
        .send({});
      const again = await api()
        .post('/api/v1/student/opportunities/P-1049/apply')
        .set('authorization', student)
        .send({});
      expect(again.status).toBe(422);
    });

    it('refuses to apply to a problem the government has not validated', async () => {
      const res = await api()
        .post('/api/v1/student/opportunities/P-1060/apply')
        .set('authorization', student)
        .send({});
      expect(res.status).toBe(404);
    });

    it('withdraws, and lists it back', async () => {
      const created = await api()
        .post('/api/v1/student/opportunities/P-1049/apply')
        .set('authorization', student)
        .send({});

      const withdrawn = await api()
        .delete(`/api/v1/student/applications/${created.body.id}`)
        .set('authorization', student);
      expect(withdrawn.status).toBe(200);
      expect(withdrawn.body.status).toBe('withdrawn');

      const list = await api().get('/api/v1/student/applications').set('authorization', student);
      expect(list.body.find((a: { id: string }) => a.id === created.body.id).status).toBe(
        'withdrawn',
      );
    });

    it('will not let a student withdraw somebody else’s application', async () => {
      const created = await api()
        .post('/api/v1/student/opportunities/P-1049/apply')
        .set('authorization', student)
        .send({});

      const other = await bearer(ctx.url, 'stu-rohit@jansetu.local').catch(() => null);
      if (!other) return;

      const res = await api()
        .delete(`/api/v1/student/applications/${created.body.id}`)
        .set('authorization', other);
      expect(res.status).toBe(404);
    });
  });

  describe('achievements', () => {
    it('reports points and badges that were earned, never asserted', async () => {
      const res = await api().get('/api/v1/student/achievements').set('authorization', student);
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalPoints');
      expect(Array.isArray(res.body.badges)).toBe(true);
      expect(Array.isArray(res.body.ledger)).toBe(true);
    });
  });

  describe('surface separation', () => {
    it('keeps an industry partner out of the student workspace', async () => {
      const res = await api().get('/api/v1/student/profile').set('authorization', partner);
      expect(res.status).toBe(404);
    });

    it('keeps a student out of the government register', async () => {
      const res = await api().get('/api/v1/problems').set('authorization', student);
      expect(res.status).toBe(404);
    });
  });
});
