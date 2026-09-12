import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bearer, bootTestApp, reset, type TestContext } from './app';
import { seedGov } from '../../prisma/seed/gov';
import { ClusteringService } from '../../src/reports/clustering.service';

/** A one-pixel PNG. Real bytes, so the magic-number check is exercised. */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

/**
 * The whole loop, end to end.
 *
 * report → cluster → validate → fund → deliver → upload evidence → verify →
 * rate. One test walks all of it, and that single test is the proof the product
 * works: everything else in this repository is a step inside it.
 */
describe('verification (e2e)', () => {
  let ctx: TestContext;
  let clustering: ClusteringService;
  let district: string;
  let reporter: string;
  let bystander: string;
  const api = () => request(ctx.url);

  const NAGRI = { lat: 23.3812, lng: 85.2536 };

  beforeAll(async () => {
    ctx = await bootTestApp();
    clustering = ctx.app.get(ClusteringService);
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await reset(ctx.prisma);
    await seedGov(ctx.prisma);

    const role = await ctx.prisma.role.findUniqueOrThrow({ where: { key: 'citizen' } });
    const argon2 = await import('argon2');
    const hash = await argon2.hash('jansetu-dev', { type: argon2.argon2id });
    for (const id of ['cit-reporter', 'cit-bystander']) {
      await ctx.prisma.user.create({
        data: {
          id,
          kind: 'citizen',
          displayName: id,
          email: `${id}@jansetu.local`,
          passwordHash: hash,
          emailVerifiedAt: new Date(),
          roles: { create: { roleId: role.id } },
        },
      });
    }

    district = await bearer(ctx.url, 'user-district@jansetu.local');
    reporter = await bearer(ctx.url, 'cit-reporter@jansetu.local');
    bystander = await bearer(ctx.url, 'cit-bystander@jansetu.local');
  });

  /* ============================================================= uploads === */

  describe('uploads', () => {
    it('issues a key and accepts the bytes', async () => {
      const presign = await api()
        .post('/api/v1/uploads/presign')
        .set('authorization', reporter)
        .send({ contentType: 'image/png', sizeBytes: PNG.byteLength });
      expect(presign.status).toBe(200);
      expect(presign.body.key).toMatch(/\.png$/);
      // No R2 configured in test, so the local driver serves it.
      expect(presign.body.driver).toBe('local');

      const put = await api()
        .put(presign.body.url.replace('/api/v1', '/api/v1'))
        .set('authorization', reporter)
        .set('content-type', 'image/png')
        .send(PNG);
      expect(put.status).toBe(201);

      const served = await api().get(`/api/v1/uploads/${encodeURIComponent(presign.body.key)}`);
      expect(served.status).toBe(200);
      expect(served.headers['content-type']).toContain('image/png');
      expect(served.headers['x-content-type-options']).toBe('nosniff');
    });

    it('refuses a type that is not an image or a PDF', async () => {
      const res = await api()
        .post('/api/v1/uploads/presign')
        .set('authorization', reporter)
        .send({ contentType: 'text/html', sizeBytes: 100 });
      expect(res.status).toBe(400);
      expect(res.body.detail).toContain('not accepted');
    });

    it('refuses bytes that do not match the declared type', async () => {
      // The attack every upload endpoint eventually meets: HTML declared as an
      // image, then served from the platform's own origin.
      const presign = await api()
        .post('/api/v1/uploads/presign')
        .set('authorization', reporter)
        .send({ contentType: 'image/png', sizeBytes: 40 });

      const put = await api()
        .put(presign.body.url)
        .set('authorization', reporter)
        .set('content-type', 'image/png')
        .send(Buffer.from('<html><script>alert(1)</script></html>'));
      expect(put.status).toBe(400);
      expect(put.body.detail).toContain('does not match the declared type');
    });

    it('refuses a key that tries to escape the upload directory', async () => {
      const res = await api()
        .put(`/api/v1/uploads/local/${encodeURIComponent('../../etc/passwd.png')}`)
        .set('authorization', reporter)
        .set('content-type', 'image/png')
        .send(PNG);
      expect(res.status).toBe(400);
    });
  });

  /* ====================================================== the whole loop === */

  describe('report → cluster → validate → fund → deliver → verify → rate', () => {
    it('closes the loop, with the reporters deciding it was closed', async () => {
      /* 1. Two citizens report the same thing. */
      const first = await api()
        .post('/api/v1/reports')
        .set('authorization', reporter)
        .send({
          text: 'Handpump by the school has been dry for a week, no water at all',
          ...NAGRI,
        });
      expect(first.status).toBe(201);

      await api()
        .post('/api/v1/reports')
        .set('authorization', bystander)
        .send({ text: 'No water from the hand pump near the school for days now', ...NAGRI });

      /* 2. Clustering makes them one problem. */
      await clustering.run();
      const report = await ctx.prisma.citizenReport.findUniqueOrThrow({
        where: { id: first.body.id },
      });
      const problemId = report.problemId!;
      expect(problemId).toBeTruthy();
      expect(
        (await ctx.prisma.problem.findUniqueOrThrow({ where: { id: problemId } })).reportCount,
      ).toBe(2);

      /* 3. The government validates and routes it. */
      await api().post(`/api/v1/problems/${problemId}/validate`).set('authorization', district);
      await api()
        .post(`/api/v1/problems/${problemId}/route`)
        .set('authorization', district)
        .send({ departmentId: 'dept-water', reason: 'Drinking water supply.' });

      /* 4. Funding is approved — budget, ledger and project in one transaction. */
      const funded = await api()
        .post(`/api/v1/problems/${problemId}/funding/approve`)
        .set('authorization', district)
        .send({ amount: 120000 });
      expect(funded.status).toBe(200);

      const project = await ctx.prisma.project.findFirstOrThrow({
        where: { problemId, kind: 'gov' },
      });

      /* 5. Before-evidence goes up while the work is outstanding. */
      const beforeKey = await upload(reporter);
      const beforeEvidence = await api()
        .post(`/api/v1/gov/problems/${problemId}/evidence`)
        .set('authorization', district)
        .send({ side: 'before', keys: [beforeKey], note: 'Dry pump head.' });
      expect(beforeEvidence.status).toBe(200);
      expect(beforeEvidence.body.before.photos).toBe(1);

      /* 6. The work is done, which asks the reporters rather than closing it. */
      await api()
        .post(`/api/v1/problems/${problemId}/project/progress`)
        .set('authorization', district)
        .send({ progress: 100 });
      const completed = await api()
        .post(`/api/v1/problems/${problemId}/project/complete`)
        .set('authorization', district);
      expect(completed.status).toBe(200);

      const afterComplete = await ctx.prisma.problem.findUniqueOrThrow({
        where: { id: problemId },
      });
      expect(afterComplete.status).toBe('verification_pending');

      /* 7. After-evidence: the other half of the pair. */
      const afterKey = await upload(district);
      await api()
        .post(`/api/v1/gov/problems/${problemId}/evidence`)
        .set('authorization', district)
        .send({ side: 'after', keys: [afterKey], note: 'Pump running.' });

      const pair = await api().get(`/api/v1/verification/problems/${problemId}/evidence`);
      expect(pair.body.before.images).toHaveLength(1);
      expect(pair.body.after.images).toHaveLength(1);
      expect(pair.body.after.images[0].url).toContain('/uploads/');

      /* 8. The request reached both reporters — and nobody else. */
      const mine = await api().get('/api/v1/verification/mine').set('authorization', reporter);
      expect(mine.status).toBe(200);
      expect(mine.body.map((r: { problemId: string }) => r.problemId)).toContain(problemId);
      expect(mine.body[0].evidence.after).not.toBeNull();

      /* 9. Both confirm. The citizens close it, not the officer. */
      const confirmed = await api()
        .post(`/api/v1/verification/problems/${problemId}`)
        .set('authorization', reporter)
        .send({ fixed: true, note: 'Water is back.' });
      expect(confirmed.status).toBe(200);
      expect(confirmed.body.confirmed).toBe(1);
      // Still open: one reporter has not answered.
      expect(confirmed.body.problemStatus).toBe('verification_pending');

      const settled = await api()
        .post(`/api/v1/verification/problems/${problemId}`)
        .set('authorization', bystander)
        .send({ fixed: true });
      expect(settled.body.confirmed).toBe(2);
      expect(settled.body.pending).toBe(0);
      expect(settled.body.problemStatus).toBe('resolved');
      expect(settled.body.problemStage).toBe('impact');

      /* 10. And rating — a different question from verification. */
      const rated = await api()
        .post(`/api/v1/verification/projects/${project.id}/rate`)
        .set('authorization', reporter)
        .send({
          stars: 4,
          comment: 'Works, but took two weeks longer than we were told.',
          timeliness: 2,
          quality: 5,
        });
      expect(rated.status).toBe(200);

      const summary = await api().get(`/api/v1/verification/projects/${project.id}/ratings`);
      expect(summary.body.count).toBe(1);
      expect(summary.body.average).toBe(4);
      expect(summary.body.timeliness).toBe(2);
      // The comment crosses; the commenter does not.
      expect(JSON.stringify(summary.body)).not.toContain('cit-reporter');
    });
  });

  /* ============================================================ standing === */

  describe('standing', () => {
    let problemId: string;
    let projectId: string;

    beforeEach(async () => {
      const filed = await api()
        .post('/api/v1/reports')
        .set('authorization', reporter)
        .send({ text: 'Handpump by the school is dry, no water for days', ...NAGRI });
      await clustering.run();
      problemId = (
        await ctx.prisma.citizenReport.findUniqueOrThrow({ where: { id: filed.body.id } })
      ).problemId!;

      await api().post(`/api/v1/problems/${problemId}/validate`).set('authorization', district);
      await api()
        .post(`/api/v1/problems/${problemId}/route`)
        .set('authorization', district)
        .send({ departmentId: 'dept-water', reason: 'Water.' });
      await api()
        .post(`/api/v1/problems/${problemId}/funding/approve`)
        .set('authorization', district)
        .send({ amount: 90000 });
      await api()
        .post(`/api/v1/problems/${problemId}/project/complete`)
        .set('authorization', district);
      projectId = (await ctx.prisma.project.findFirstOrThrow({ where: { problemId } })).id;
    });

    it('will not let somebody who did not report it verify it', async () => {
      // The whole point of addressing the request to the reporters. An
      // "anyone can verify" design is an "anyone can be recruited" design.
      const res = await api()
        .post(`/api/v1/verification/problems/${problemId}`)
        .set('authorization', bystander)
        .send({ fixed: true });
      expect(res.status).toBe(404);

      expect(await ctx.prisma.verification.count({ where: { problemId } })).toBe(0);
    });

    it('will not let them rate it either', async () => {
      const res = await api()
        .post(`/api/v1/verification/projects/${projectId}/rate`)
        .set('authorization', bystander)
        .send({ stars: 5 });
      expect(res.status).toBe(404);
    });

    it('replaces a verdict rather than counting it twice', async () => {
      await api()
        .post(`/api/v1/verification/problems/${problemId}`)
        .set('authorization', reporter)
        .send({ fixed: true });
      const changed = await api()
        .post(`/api/v1/verification/problems/${problemId}`)
        .set('authorization', reporter)
        .send({ fixed: false, note: 'Went back — it is dry again.' });

      expect(changed.body.confirmed).toBe(0);
      expect(changed.body.denied).toBe(1);
      expect(await ctx.prisma.verification.count({ where: { problemId } })).toBe(1);
    });

    it('sends a denied problem back to delivery instead of resolving it', async () => {
      const res = await api()
        .post(`/api/v1/verification/problems/${problemId}`)
        .set('authorization', reporter)
        .send({ fixed: false, note: 'Still dry.' });
      expect(res.body.pending).toBe(0);
      expect(res.body.problemStatus).toBe('in_progress');
    });

    it('refuses a rating on a project that is not finished', async () => {
      // Somebody with standing gets 422 "not finished yet"; somebody without
      // gets 404, and never learns whether it is finished. Standing is checked
      // first for exactly that reason.
      const unfinished = await ctx.prisma.project.findFirstOrThrow({ where: { id: 'PRJ-204' } });
      const outsider = await api()
        .post(`/api/v1/verification/projects/${unfinished.id}/rate`)
        .set('authorization', reporter)
        .send({ stars: 5 });
      expect(outsider.status).toBe(404);

      // And the reporter of *this* project, before it completes.
      await ctx.prisma.project.update({
        where: { id: projectId },
        data: { phase: 'implementation' },
      });
      const tooEarly = await api()
        .post(`/api/v1/verification/projects/${projectId}/rate`)
        .set('authorization', reporter)
        .send({ stars: 5 });
      expect(tooEarly.status).toBe(422);
      expect(tooEarly.body.detail).toContain('not finished yet');
    });
  });

  /* =========================================================== the appeal === */

  describe('the ranking appeal', () => {
    it('records an objection and lets an officer answer it in the open', async () => {
      const objection = await api()
        .post('/api/v1/verification/problems/P-1042/object')
        .set('authorization', reporter)
        .send({ reason: 'Three villages, not one — the coverage factor is wrong.' });
      expect(objection.status).toBe(201);

      const listed = await api()
        .get('/api/v1/gov/problems/P-1042/objections')
        .set('authorization', district);
      expect(listed.body).toHaveLength(1);
      expect(listed.body[0].status).toBe('open');

      const adjusted = await api()
        .post('/api/v1/gov/problems/P-1042/adjust-priority')
        .set('authorization', district)
        .send({
          label: 'Coverage under-counted',
          points: 6,
          reason: 'Objection upheld: the problem spans three villages, not one.',
          objectionId: objection.body.id,
        });
      expect(adjusted.status).toBe(200);

      const after = await api()
        .get('/api/v1/gov/problems/P-1042/objections')
        .set('authorization', district);
      expect(after.body[0].status).toBe('upheld');

      // The correction is visible in the score's decomposition, not an
      // unexplained movement.
      const adjustment = await ctx.prisma.priorityAdjustment.findFirstOrThrow({
        where: { problemId: 'P-1042', label: 'Coverage under-counted' },
      });
      expect(adjustment.points).toBe(6);
    });

    it('refuses an adjustment larger than the bound', async () => {
      const res = await api()
        .post('/api/v1/gov/problems/P-1042/adjust-priority')
        .set('authorization', district)
        .send({ label: 'Big', points: 40, reason: 'Because I say so, at length.' });
      expect(res.status).toBe(400);
    });
  });

  /** Presign, PUT, return the key. */
  async function upload(auth: string): Promise<string> {
    const presign = await api()
      .post('/api/v1/uploads/presign')
      .set('authorization', auth)
      .send({ contentType: 'image/png', sizeBytes: PNG.byteLength });
    await api()
      .put(presign.body.url)
      .set('authorization', auth)
      .set('content-type', 'image/png')
      .send(PNG);
    return presign.body.key as string;
  }
});
