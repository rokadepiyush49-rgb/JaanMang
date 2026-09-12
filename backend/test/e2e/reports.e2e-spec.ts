import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { bearer, bootTestApp, reset, type TestContext } from './app';
import { seedGov } from '../../prisma/seed/gov';
import { ClusteringService } from '../../src/reports/clustering.service';
import { citizenVotesFactor } from '../../src/reports/clustering.math';
import {
  DEFAULT_WEIGHTS,
  scoreOf,
  type PriorityFactors,
} from '../../src/problems/priority/priority.engine';

/**
 * Citizen intake, clustering and voting.
 *
 * The first test here is the one the whole product rests on: forty people
 * reporting the same handpump have to become one demand weighing forty, not
 * forty items in a queue. If it ever goes red, the platform is a ticketing
 * system with extra steps.
 */
describe('reports (e2e)', () => {
  let ctx: TestContext;
  let clustering: ClusteringService;
  let citizen: string;
  const api = () => request(ctx.url);

  /** Nagri's registered coordinates, from the seeded village register. */
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
    await ctx.prisma.user.create({
      data: {
        id: 'cit-test',
        kind: 'citizen',
        displayName: 'Test Citizen',
        email: 'cit-test@jansetu.local',
        passwordHash: await import('argon2').then((a) =>
          a.hash('jansetu-dev', { type: a.argon2id }),
        ),
        emailVerifiedAt: new Date(),
        roles: { create: { roleId: role.id } },
      },
    });
    citizen = await bearer(ctx.url, 'cit-test@jansetu.local');
  });

  /** Forty phrasings of one broken handpump, as forty different people. */
  const HANDPUMP_REPORTS = Array.from({ length: 40 }, (_, i) => {
    const phrasings = [
      'The handpump near the school has been dry for six days, no water at all',
      'Handpump at the school is not giving water since last week',
      'No water from the hand pump by the school, six days now',
      'School ke paas wala chapakal sukha pada hai, paani nahi aa raha',
      'Hand pump near school broken, we walk to the next tola for water',
    ];
    return {
      text: `${phrasings[i % phrasings.length]} (${i + 1})`,
      // Scattered over ~200 m, as forty phones in one hamlet would be.
      lat: NAGRI.lat + (i % 7) * 0.0003,
      lng: NAGRI.lng + (i % 5) * 0.0003,
      citizenName: `Reporter ${i + 1}`,
      language: 'hi',
    };
  });

  describe('the central claim: forty reports are one demand weighing forty', () => {
    it('clusters forty near-identical reports into one problem of weight forty', async () => {
      const reportIds: string[] = [];
      for (const body of HANDPUMP_REPORTS) {
        const res = await api().post('/api/v1/reports').send(body);
        expect(res.status).toBe(201);
        expect(res.body.clusteringPending).toBe(true);
        // Classified without a model configured — the keyword pass is the path
        // a fresh clone takes, so it is the path the tests take. Five of these
        // forty are romanised Hindi, which is how most of them really arrive.
        expect(res.body.understood.category).toBe('water');
        expect(res.body.understood.readBy).toBe('keywords');
        reportIds.push(res.body.id);
      }

      const run = await clustering.run();
      expect(run.considered).toBe(40);

      const problems = await problemsHolding(ctx, reportIds);

      // One problem, not forty.
      expect(problems).toHaveLength(1);
      expect(problems[0]._count.reports).toBe(40);
      expect(problems[0].reportCount).toBe(40);
      expect(problems[0].category).toBe('water');
    });

    it('scores that problem higher than the same problem reported once', async () => {
      const first = await api().post('/api/v1/reports').send(HANDPUMP_REPORTS[0]);
      await clustering.run();

      const once = await factorsOf(ctx, first.body.id);
      const scoreOnce = scoreOf(once, [], DEFAULT_WEIGHTS);

      for (const body of HANDPUMP_REPORTS.slice(1)) {
        await api().post('/api/v1/reports').send(body);
      }
      await clustering.run();

      const forty = await factorsOf(ctx, first.body.id);
      const scoreForty = scoreOf(forty, [], DEFAULT_WEIGHTS);

      expect(forty.repeatedDemand).toBeGreaterThan(once.repeatedDemand);
      expect(scoreForty).toBeGreaterThan(scoreOnce);
    });

    it('a report the classifier is unsure about becomes its own problem', async () => {
      // No category term in it at all: confidence lands under the threshold, so
      // clustering must not guess it into the handpump cluster beside it.
      await api().post('/api/v1/reports').send(HANDPUMP_REPORTS[0]);
      await clustering.run();

      const vague = await api()
        .post('/api/v1/reports')
        .send({ text: 'Something has been wrong here for a long while now', ...NAGRI });
      expect(vague.status).toBe(201);
      expect(vague.body.understood.confidence).toBeLessThan(0.55);

      const before = await ctx.prisma.problem.count();
      await clustering.run();
      expect(await ctx.prisma.problem.count()).toBe(before + 1);
    });
  });

  describe('intake', () => {
    it('is open to anyone — no session required', async () => {
      const res = await api()
        .post('/api/v1/reports')
        .send({ text: 'Street light pole near the market is dead, dark since Tuesday', ...NAGRI });
      expect(res.status).toBe(201);
      expect(res.body.understood.category).toBe('streetlight');
      expect(res.body.village.name).toBeTruthy();
    });

    it('files once however many times a flaky connection delivers the retry', async () => {
      const key = randomUUID();
      const body = { text: 'Drain outside the anganwadi is overflowing into the road', ...NAGRI };

      const first = await api().post('/api/v1/reports').set('Idempotency-Key', key).send(body);
      const retry = await api().post('/api/v1/reports').set('Idempotency-Key', key).send(body);
      const third = await api().post('/api/v1/reports').set('Idempotency-Key', key).send(body);

      expect(first.status).toBe(201);
      expect(retry.status).toBe(201);
      expect(retry.headers['idempotency-replayed']).toBe('true');
      expect(retry.body.id).toBe(first.body.id);
      expect(third.body.id).toBe(first.body.id);

      expect(await ctx.prisma.citizenReport.count({ where: { raw: body.text } })).toBe(1);
    });

    it('refuses a key reused for a different report rather than replaying the old one', async () => {
      const key = randomUUID();
      await api()
        .post('/api/v1/reports')
        .set('Idempotency-Key', key)
        .send({ text: 'Handpump at the school is dry again this week', ...NAGRI });

      const different = await api()
        .post('/api/v1/reports')
        .set('Idempotency-Key', key)
        .send({ text: 'A completely different problem about the school roof', ...NAGRI });

      expect(different.status).toBe(409);
      expect(different.body.code).toBe('CONFLICT');
    });

    it('rejects coordinates outside every covered district', async () => {
      const res = await api()
        .post('/api/v1/reports')
        .send({ text: 'Handpump broken near the school here', lat: 48.85, lng: 2.35 });
      expect(res.status).toBe(400);
      expect(res.body.detail).toContain('outside every district');
    });

    it('lets a citizen see their own reports and what became of them', async () => {
      await api()
        .post('/api/v1/reports')
        .set('authorization', citizen)
        .send({ text: 'Handpump near the school has been dry for six days now', ...NAGRI });
      await clustering.run();

      const res = await api().get('/api/v1/reports/mine').set('authorization', citizen);
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].problem).not.toBeNull();
      expect(res.body.items[0].understood.category).toBe('water');
    });
  });

  describe('voting', () => {
    it('counts a vote separately from a report and moves the score', async () => {
      const before = await ctx.prisma.problemFactors.findUniqueOrThrow({
        where: { problemId: 'P-1012' },
      });

      const res = await api().post('/api/v1/problems/P-1012/vote').set('authorization', citizen);
      expect(res.status).toBe(200);
      expect(res.body.votedByMe).toBe(true);
      expect(res.body.voteCount).toBe(1);

      const after = await ctx.prisma.problemFactors.findUniqueOrThrow({
        where: { problemId: 'P-1012' },
      });
      // The vote factor was recomputed from the votes actually cast. It drops
      // rather than rises here, and that is the correct answer: the fixture
      // shipped P-1012 with a hand-authored 88 describing a village meeting's
      // worth of votes, and this database holds exactly one.
      expect(after.citizenVotes).not.toBe(before.citizenVotes);
      expect(after.citizenVotes).toBe(citizenVotesFactor(1, 3400));

      // And the other seven are untouched. A vote says nothing about
      // deprivation, duration or severity, and must not be able to rewrite an
      // officer's assessment of them.
      expect(after.repeatedDemand).toBe(before.repeatedDemand);
      expect(after.severity).toBe(before.severity);
      expect(after.deprivation).toBe(before.deprivation);
      expect(after.duration).toBe(before.duration);

      const problem = await ctx.prisma.problem.findUniqueOrThrow({ where: { id: 'P-1012' } });
      expect(problem.voteCount).toBe(1);
      // Voting is not reporting: the report count must not have moved.
      expect(problem.reportCount).toBe(18);
    });

    it('is idempotent — voting twice is not two votes', async () => {
      await api().post('/api/v1/problems/P-1012/vote').set('authorization', citizen);
      const second = await api().post('/api/v1/problems/P-1012/vote').set('authorization', citizen);

      expect(second.status).toBe(200);
      expect(second.body.voteCount).toBe(1);
      expect(await ctx.prisma.problemVote.count({ where: { problemId: 'P-1012' } })).toBe(1);
    });

    it('withdraws a vote, and withdrawing twice is not an error', async () => {
      await api().post('/api/v1/problems/P-1012/vote').set('authorization', citizen);

      const first = await api()
        .delete('/api/v1/problems/P-1012/vote')
        .set('authorization', citizen);
      const again = await api()
        .delete('/api/v1/problems/P-1012/vote')
        .set('authorization', citizen);

      expect(first.body.voteCount).toBe(0);
      expect(first.body.votedByMe).toBe(false);
      expect(again.status).toBe(200);
      expect(again.body.voteCount).toBe(0);
    });

    it('requires a session — voting is not anonymous', async () => {
      const res = await api().post('/api/v1/problems/P-1012/vote');
      expect(res.status).toBe(401);
    });

    it('closes voting once a problem is resolved', async () => {
      const res = await api().post('/api/v1/problems/P-1003/vote').set('authorization', citizen);
      expect(res.status).toBe(409);
      expect(res.body.detail).toContain('voting has closed');
    });
  });
});

/**
 * Problems holding any of these reports.
 *
 * By report id, not by matching text: the gov fixture already seeds a handpump
 * problem in Tigra, so a `contains: 'andpump'` query silently measured the
 * seed rather than the forty reports the test had just filed.
 */
async function problemsHolding(ctx: TestContext, reportIds: string[]) {
  return ctx.prisma.problem.findMany({
    where: { reports: { some: { id: { in: reportIds } } } },
    include: { _count: { select: { reports: true } } },
  });
}

/** The factors of the problem that ended up holding `reportId`. */
async function factorsOf(ctx: TestContext, reportId: string): Promise<PriorityFactors> {
  const problem = await ctx.prisma.problem.findFirstOrThrow({
    where: { reports: { some: { id: reportId } } },
    include: { factors: true },
  });
  const f = problem.factors;
  if (!f) throw new Error('no factors computed');
  return {
    populationImpact: f.populationImpact,
    severity: f.severity,
    deprivation: f.deprivation,
    coverage: f.coverage,
    duration: f.duration,
    recurrence: f.recurrence,
    repeatedDemand: f.repeatedDemand,
    citizenVotes: f.citizenVotes,
  };
}
