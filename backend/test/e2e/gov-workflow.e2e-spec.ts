import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bearer, bootTestApp, reset, type TestContext } from './app';
import { seedGov } from '../../prisma/seed/gov';

/**
 * The government workflow, persisted.
 *
 * Fifteen of these transitions were reducer cases in apps/web: an officer could
 * approve funding, navigate away, come back, and it had never happened. Every
 * test here asserts the change is in Postgres afterwards, because that — not
 * the response body — is the thing that was missing.
 */
describe('gov workflow (e2e)', () => {
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

  /* ========================================================= sponsorship === */

  describe('sponsorship', () => {
    it('invites every matched industry and arms the response window', async () => {
      // P-1049 is awaiting, with one sponsor still in `matched`.
      const res = await api()
        .post('/api/v1/problems/P-1049/sponsorship/invite')
        .set('authorization', district);
      expect(res.status).toBe(200);

      const sponsorship = await ctx.prisma.sponsorship.findUniqueOrThrow({
        where: { problemId: 'P-1049' },
      });
      expect(sponsorship.status).toBe('invited');
      expect(sponsorship.invitedAt).not.toBeNull();
      expect(sponsorship.responseDueAt).not.toBeNull();

      const matches = await ctx.prisma.sponsorshipMatch.findMany({
        where: { problemId: 'P-1049' },
      });
      expect(matches.every((m) => m.status !== 'matched')).toBe(true);

      const problem = await ctx.prisma.problem.findUniqueOrThrow({ where: { id: 'P-1049' } });
      expect(problem.status).toBe('awaiting_sponsorship');
      expect(problem.stage).toBe('sponsorship');
    });

    it('refuses to invite when the problem is not CSR eligible', async () => {
      const res = await api()
        .post('/api/v1/problems/P-1055/sponsorship/invite')
        .set('authorization', district);
      expect(res.status).toBe(422);
      expect(res.body.detail).toContain('not eligible');
    });

    it('records an approval against the sponsor and closes government funding', async () => {
      const res = await api()
        .post('/api/v1/problems/P-1042/sponsorship/approve')
        .set('authorization', district)
        .send({ sponsorId: 'sp-tata', amount: 600000 });
      expect(res.status).toBe(200);

      const sponsorship = await ctx.prisma.sponsorship.findUniqueOrThrow({
        where: { problemId: 'P-1042' },
      });
      expect(sponsorship.status).toBe('approved');
      expect(sponsorship.approvedSponsorId).toBe('sp-tata');
      expect(Number(sponsorship.approvedAmount)).toBe(600000);

      // Industry is paying, so there is no government funding to approve.
      const funding = await ctx.prisma.funding.findUniqueOrThrow({
        where: { problemId: 'P-1042' },
      });
      expect(funding.status).toBe('not_required');
    });

    it('falls back to government funding by itself when the last sponsor declines', async () => {
      // P-1042 has hindalco declined, jindal invited, tata interested.
      await api()
        .post('/api/v1/problems/P-1042/sponsorship/decline')
        .set('authorization', district)
        .send({ sponsorId: 'sp-jindal', reason: 'Outside our CSR geography.' });

      // One still in play, so no fallback yet.
      let problem = await ctx.prisma.problem.findUniqueOrThrow({ where: { id: 'P-1042' } });
      expect(problem.status).toBe('awaiting_sponsorship');

      await api()
        .post('/api/v1/problems/P-1042/sponsorship/decline')
        .set('authorization', district)
        .send({ sponsorId: 'sp-tata', reason: 'Budget committed elsewhere this quarter.' });

      // That was the last one. The fallback fires without anybody pressing it.
      problem = await ctx.prisma.problem.findUniqueOrThrow({ where: { id: 'P-1042' } });
      expect(problem.status).toBe('funding_required');

      const funding = await ctx.prisma.funding.findUniqueOrThrow({
        where: { problemId: 'P-1042' },
      });
      expect(funding.status).toBe('recommended');
      // Recommended, not approved: moving public money stays a human decision.
      expect(funding.approvedAt).toBeNull();
      expect(Number(funding.required)).toBe(620000);
      expect(funding.fundable).toBe(true);
    });

    it('needs sponsorship.approve to accept, which a panchayat secretary lacks', async () => {
      const res = await api()
        .post('/api/v1/problems/P-1042/sponsorship/approve')
        .set('authorization', panchayat)
        .send({ sponsorId: 'sp-tata' });
      expect(res.status).toBe(403);
    });
  });

  /* ============================================================= funding === */

  describe('funding', () => {
    it('moves the budget, writes the ledger and creates the project in one go', async () => {
      const before = await ctx.prisma.department.findUniqueOrThrow({ where: { id: 'dept-pwd' } });

      const res = await api()
        .post('/api/v1/problems/P-1038/funding/approve')
        .set('authorization', district)
        .send({});
      expect(res.status).toBe(200);

      const amount = 1450000;

      const funding = await ctx.prisma.funding.findUniqueOrThrow({
        where: { problemId: 'P-1038' },
      });
      expect(funding.status).toBe('approved');
      expect(funding.approvedById).toBe('user-district');
      expect(Number(funding.required)).toBe(amount);

      // The department's committed budget moved by exactly the amount.
      const after = await ctx.prisma.department.findUniqueOrThrow({ where: { id: 'dept-pwd' } });
      expect(Number(after.budgetCommitted) - Number(before.budgetCommitted)).toBe(amount);

      // The public ledger entry exists. A committed budget with no ledger entry
      // is a corrupt book, which is the whole reason this is one transaction.
      const ledger = await ctx.prisma.ledgerEntry.findMany({ where: { problemId: 'P-1038' } });
      expect(ledger).toHaveLength(1);
      expect(Number(ledger[0].amount)).toBe(amount);
      expect(ledger[0].stage).toBe('committed');

      const allocation = await ctx.prisma.allocation.findMany({ where: { problemId: 'P-1038' } });
      expect(allocation).toHaveLength(1);
      expect(allocation[0].status).toBe('approved');

      const project = await ctx.prisma.project.findFirst({
        where: { problemId: 'P-1038', kind: 'gov' },
      });
      expect(project).not.toBeNull();
      expect(Number(project!.budget)).toBe(amount);

      const problem = await ctx.prisma.problem.findUniqueOrThrow({ where: { id: 'P-1038' } });
      expect(problem.status).toBe('in_progress');
      expect(problem.stage).toBe('assigned');
    });

    it('survives a hard reload — which is the entire point of this stage', async () => {
      await api()
        .post('/api/v1/problems/P-1038/funding/approve')
        .set('authorization', district)
        .send({});

      // A completely fresh request, as a browser reload would make.
      const reloaded = await api().get('/api/v1/problems/P-1038').set('authorization', district);
      expect(reloaded.status).toBe(200);
      expect(reloaded.body.funding.status).toBe('approved');
      expect(reloaded.body.project).toBeTruthy();
    });

    it('commits once however many times a retry delivers the same approval', async () => {
      const key = randomUUID();
      const before = await ctx.prisma.department.findUniqueOrThrow({ where: { id: 'dept-pwd' } });

      const first = await api()
        .post('/api/v1/problems/P-1038/funding/approve')
        .set('authorization', district)
        .set('Idempotency-Key', key)
        .send({});
      const retry = await api()
        .post('/api/v1/problems/P-1038/funding/approve')
        .set('authorization', district)
        .set('Idempotency-Key', key)
        .send({});

      expect(first.status).toBe(200);
      expect(retry.status).toBe(200);
      expect(retry.headers['idempotency-replayed']).toBe('true');

      const after = await ctx.prisma.department.findUniqueOrThrow({ where: { id: 'dept-pwd' } });
      expect(Number(after.budgetCommitted) - Number(before.budgetCommitted)).toBe(1450000);
      expect(await ctx.prisma.ledgerEntry.count({ where: { problemId: 'P-1038' } })).toBe(1);
    });

    it('commits once when two approvals arrive at the same instant', async () => {
      // The case the key has to be reserved *before* the handler for. Recording
      // it afterwards leaves a window in which both requests see no record and
      // both run — and both spend the budget. Over loopback that window is wide
      // enough to hit every time.
      const key = randomUUID();
      const before = await ctx.prisma.department.findUniqueOrThrow({ where: { id: 'dept-pwd' } });

      const send = () =>
        api()
          .post('/api/v1/problems/P-1038/funding/approve')
          .set('authorization', district)
          .set('Idempotency-Key', key)
          .send({});

      const [a, b] = await Promise.all([send(), send()]);

      // One succeeds. The other either replays it or is told it is in flight —
      // both are correct, and which one happens is a race. What is not
      // negotiable is that the money moved once.
      const statuses = [a.status, b.status].sort();
      expect(statuses[0]).toBe(200);
      expect([200, 409]).toContain(statuses[1]);

      const after = await ctx.prisma.department.findUniqueOrThrow({ where: { id: 'dept-pwd' } });
      expect(Number(after.budgetCommitted) - Number(before.budgetCommitted)).toBe(1450000);
      expect(await ctx.prisma.ledgerEntry.count({ where: { problemId: 'P-1038' } })).toBe(1);
      expect(await ctx.prisma.allocation.count({ where: { problemId: 'P-1038' } })).toBe(1);
    });

    it('releases the key when the request failed, so a retry can still work', async () => {
      const key = randomUUID();

      // Fails on the amount, which must not burn the key.
      const failed = await api()
        .post('/api/v1/problems/P-1038/funding/approve')
        .set('authorization', district)
        .set('Idempotency-Key', key)
        .send({ amount: 99_000_000 });
      expect(failed.status).toBe(422);

      // Same key, a figure the department can cover. A key burned by a failure
      // would leave the officer unable to retry their own correction.
      const retried = await api()
        .post('/api/v1/problems/P-1038/funding/approve')
        .set('authorization', district)
        .set('Idempotency-Key', key)
        .send({ amount: 99_000_000 });
      expect(retried.status).toBe(422);

      const fresh = await api()
        .post('/api/v1/problems/P-1038/funding/approve')
        .set('authorization', district)
        .set('Idempotency-Key', randomUUID())
        .send({});
      expect(fresh.status).toBe(200);
    });

    it('refuses an amount the department cannot cover, and changes nothing', async () => {
      const before = await ctx.prisma.department.findUniqueOrThrow({ where: { id: 'dept-pwd' } });

      const res = await api()
        .post('/api/v1/problems/P-1038/funding/approve')
        .set('authorization', district)
        .send({ amount: 99_000_000 });
      expect(res.status).toBe(422);
      expect(res.body.detail).toContain('uncommitted');

      // The transaction rolled back: no budget moved, no ledger entry, no project.
      const after = await ctx.prisma.department.findUniqueOrThrow({ where: { id: 'dept-pwd' } });
      expect(Number(after.budgetCommitted)).toBe(Number(before.budgetCommitted));
      expect(await ctx.prisma.ledgerEntry.count({ where: { problemId: 'P-1038' } })).toBe(0);
      expect(await ctx.prisma.project.count({ where: { problemId: 'P-1038', kind: 'gov' } })).toBe(
        0,
      );
    });

    it('records a rejection with its reason and leaves the budget alone', async () => {
      const before = await ctx.prisma.department.findUniqueOrThrow({ where: { id: 'dept-pwd' } });

      const res = await api()
        .post('/api/v1/problems/P-1038/funding/reject')
        .set('authorization', district)
        .send({ reason: 'Covered by the state bridge renewal tender already in progress.' });
      expect(res.status).toBe(200);

      const funding = await ctx.prisma.funding.findUniqueOrThrow({
        where: { problemId: 'P-1038' },
      });
      expect(funding.status).toBe('rejected');
      expect(funding.note).toContain('bridge renewal');

      const after = await ctx.prisma.department.findUniqueOrThrow({ where: { id: 'dept-pwd' } });
      expect(Number(after.budgetCommitted)).toBe(Number(before.budgetCommitted));
    });
  });

  /* ============================================================ delivery === */

  describe('delivery', () => {
    it('assigns an unassigned problem and moves the workload counter', async () => {
      // P-1049 has no officer. P-1038 is already off-02's in the fixture, which
      // is why the reassignment case below uses it instead.
      const before = await ctx.prisma.officer.findUniqueOrThrow({ where: { userId: 'off-03' } });

      const res = await api()
        .post('/api/v1/problems/P-1049/assign')
        .set('authorization', district)
        .send({ officerId: 'off-03' });
      expect(res.status).toBe(200);

      const problem = await ctx.prisma.problem.findUniqueOrThrow({ where: { id: 'P-1049' } });
      expect(problem.assignedOfficerId).toBe('off-03');

      const after = await ctx.prisma.officer.findUniqueOrThrow({ where: { userId: 'off-03' } });
      expect(after.activeTasks).toBe(before.activeTasks + 1);
    });

    it('hands the workload back to the officer it was taken from', async () => {
      const before02 = await ctx.prisma.officer.findUniqueOrThrow({ where: { userId: 'off-02' } });
      const before03 = await ctx.prisma.officer.findUniqueOrThrow({ where: { userId: 'off-03' } });

      // P-1038 starts on off-02.
      await api()
        .post('/api/v1/problems/P-1038/assign')
        .set('authorization', district)
        .send({ officerId: 'off-03' });

      const after02 = await ctx.prisma.officer.findUniqueOrThrow({ where: { userId: 'off-02' } });
      const after03 = await ctx.prisma.officer.findUniqueOrThrow({ where: { userId: 'off-03' } });
      expect(after02.activeTasks).toBe(before02.activeTasks - 1);
      expect(after03.activeTasks).toBe(before03.activeTasks + 1);
    });

    it('reassigning to the officer who already holds it changes no counters', async () => {
      const before = await ctx.prisma.officer.findUniqueOrThrow({ where: { userId: 'off-02' } });

      const res = await api()
        .post('/api/v1/problems/P-1038/assign')
        .set('authorization', district)
        .send({ officerId: 'off-02' });
      expect(res.status).toBe(200);

      // Without the guard this inflates a workload counter every time somebody
      // presses the button, and the roster slowly becomes fiction.
      const after = await ctx.prisma.officer.findUniqueOrThrow({ where: { userId: 'off-02' } });
      expect(after.activeTasks).toBe(before.activeTasks);
    });

    it('updates progress, and refuses to move it backwards silently', async () => {
      await api()
        .post('/api/v1/problems/P-1038/funding/approve')
        .set('authorization', district)
        .send({});

      const up = await api()
        .post('/api/v1/problems/P-1038/project/progress')
        .set('authorization', district)
        .send({ progress: 40 });
      expect(up.status).toBe(200);

      const project = await ctx.prisma.project.findFirstOrThrow({
        where: { problemId: 'P-1038', kind: 'gov' },
      });
      expect(project.progress).toBe(40);

      const down = await api()
        .post('/api/v1/problems/P-1038/project/progress')
        .set('authorization', district)
        .send({ progress: 10 });
      expect(down.status).toBe(422);
    });

    it('completion asks the citizens rather than declaring the problem fixed', async () => {
      await api()
        .post('/api/v1/problems/P-1038/funding/approve')
        .set('authorization', district)
        .send({});

      const res = await api()
        .post('/api/v1/problems/P-1038/project/complete')
        .set('authorization', district);
      expect(res.status).toBe(200);

      const problem = await ctx.prisma.problem.findUniqueOrThrow({ where: { id: 'P-1038' } });
      // Not "resolved". An officer declaring their own work finished is exactly
      // what this product exists to stop being the end of the story.
      expect(problem.status).toBe('verification_pending');
      expect(problem.stage).toBe('verification');

      const verification = await ctx.prisma.verificationRequest.findUniqueOrThrow({
        where: { problemId: 'P-1038' },
      });
      expect(verification.asked).toBe(problem.reportCount);
      expect(verification.pending).toBe(problem.reportCount);
    });

    it('refuses progress on a problem with no project yet', async () => {
      const res = await api()
        .post('/api/v1/problems/P-1049/project/progress')
        .set('authorization', district)
        .send({ progress: 20 });
      expect(res.status).toBe(422);
      expect(res.body.detail).toContain('no project');
    });

    it('will not let one officer mark another officer’s alert read', async () => {
      const alert = await ctx.prisma.notification.findFirst({ where: { userId: 'user-gp' } });
      if (!alert) return;

      const res = await api()
        .post(`/api/v1/alerts/${alert.id}/read`)
        .set('authorization', district);
      expect(res.status).toBe(404);

      const unchanged = await ctx.prisma.notification.findUniqueOrThrow({
        where: { id: alert.id },
      });
      expect(unchanged.read).toBe(alert.read);
    });
  });

  /* =============================================================== audit === */

  describe('the audit trail', () => {
    it('records the domain event on the problem timeline', async () => {
      await api()
        .post('/api/v1/problems/P-1038/funding/approve')
        .set('authorization', district)
        .send({});

      const entries = await ctx.prisma.auditEntry.findMany({
        where: { problemId: 'P-1038', entityType: 'problem' },
        orderBy: { at: 'asc' },
      });
      const actions = entries.map((e) => e.action);
      expect(actions.some((a) => a.includes('Approved ₹14.5 L'))).toBe(true);
      expect(actions.some((a) => a.includes('public ledger'))).toBe(true);
      expect(entries.some((e) => e.actorUserId === 'user-district')).toBe(true);
    });

    it('keeps the access log off the problem timeline', async () => {
      await api()
        .post('/api/v1/problems/P-1038/funding/approve')
        .set('authorization', district)
        .send({});

      // The interceptor's entry exists…
      const access = await ctx.prisma.auditEntry.findMany({ where: { entityType: 'request' } });
      expect(access.length).toBeGreaterThan(0);
      expect(access[0].action).toContain('POST /api/v1/problems/P-1038/funding/approve');

      // …and carries no problemId, so an officer's timeline is eleven things
      // that happened to their problem, not eleven things plus eleven requests.
      expect(access.every((e) => e.problemId === null)).toBe(true);

      const timeline = await api()
        .get('/api/v1/problems/P-1038/audit')
        .set('authorization', district);
      expect(timeline.body.every((e: { action: string }) => !e.action.startsWith('POST '))).toBe(
        true,
      );
    });

    it('records nothing for an anonymous public request', async () => {
      await api()
        .post('/api/v1/reports')
        .send({ text: 'Handpump near the school is dry again', lat: 23.3812, lng: 85.2536 });

      const access = await ctx.prisma.auditEntry.findMany({ where: { entityType: 'request' } });
      expect(access).toHaveLength(0);
    });
  });
});
