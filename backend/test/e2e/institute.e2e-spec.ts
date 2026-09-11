import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import * as argon2 from 'argon2';
import request from 'supertest';
import { bearer, bootTestApp, reset, type TestContext } from './app';
import type { PrismaService } from '../../src/prisma/prisma.service';

/**
 * The institute surface, end to end.
 *
 * Three things are worth testing here and almost nothing else is:
 *
 *   1. **Isolation between surfaces.** `/institute/*` must be invisible to a
 *      student, a government officer and an industry partner — invisible as in
 *      404, not 403, because telling a student the roster endpoint exists is
 *      itself a disclosure.
 *   2. **Isolation between institutions.** Every read is scoped to the
 *      institution on the session, and an id belonging to another institution
 *      must read as not found rather than as a valid target.
 *   3. **Authority inside one institution.** A faculty guide holds
 *      `institute.team.manage` and an administrator holds it too — the
 *      permission is identical and the *scope* is not. A guide must not be able
 *      to touch a team they were not given.
 *
 * The happy paths are covered incidentally: a test that a guide cannot assign
 * somebody else's team is worthless unless assigning their own team works.
 */
describe('Institute surface (e2e)', () => {
  let ctx: TestContext;

  /* Two institutions, so cross-tenant leakage has something to leak *to*.
     The second one is addressed through the ids below rather than by name. */
  const ORG_A = 'org-inst-a';

  const ids = {
    adminA: 'u-admin-a',
    adminB: 'u-admin-b',
    guideA: 'u-guide-a',
    otherGuideA: 'u-guide-a2',
    studentA: 'u-student-a',
    studentB: 'u-student-b',
    deptA: 'dept-a',
    deptB: 'dept-b',
    teamA: 'team-a',
    teamOtherA: 'team-a2',
    teamB: 'team-b',
  };

  const api = () => request(ctx.url);

  beforeAll(async () => {
    ctx = await bootTestApp();
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(async () => {
    await reset(ctx.prisma);
    await seedTwoInstitutions(ctx.prisma);
  });

  /* ======================================================== surfaces === */

  describe('surface isolation', () => {
    it('refuses an anonymous caller', async () => {
      await api().get('/api/v1/institute/overview').expect(401);
    });

    it.each([
      ['a student', 'student@a.test'],
      ['an industry partner', 'industry@a.test'],
      ['a government officer', 'gov@a.test'],
    ])('hides the roster from %s (404, not 403)', async (_who, email) => {
      const token = await bearer(ctx.url, email);
      await api().get('/api/v1/institute/students').set('authorization', token).expect(404);
    });

    it('lets an institute administrator in', async () => {
      const token = await bearer(ctx.url, 'admin@a.test');
      const res = await api().get('/api/v1/institute/overview').set('authorization', token);
      expect(res.status).toBe(200);
      expect(res.body.counts.students).toBe(1);
    });

    it('keeps an institute administrator out of the government workspace', async () => {
      const token = await bearer(ctx.url, 'admin@a.test');
      await api().get('/api/v1/gov/officers').set('authorization', token).expect(404);
    });
  });

  /* =================================================== data ownership === */

  describe('institution isolation', () => {
    it('returns only this institution’s students', async () => {
      const token = await bearer(ctx.url, 'admin@a.test');
      const res = await api().get('/api/v1/institute/students').set('authorization', token);
      expect(res.body.map((s: { id: string }) => s.id)).toEqual([ids.studentA]);
    });

    it('returns only this institution’s teams', async () => {
      const token = await bearer(ctx.url, 'admin@a.test');
      const res = await api().get('/api/v1/institute/teams').set('authorization', token);
      expect(res.body.map((t: { id: string }) => t.id).sort()).toEqual([ids.teamA, ids.teamOtherA]);
    });

    it('404s a team belonging to another institution', async () => {
      const token = await bearer(ctx.url, 'admin@a.test');
      await api()
        .get(`/api/v1/institute/teams/${ids.teamB}`)
        .set('authorization', token)
        .expect(404);
    });

    it('refuses to place a student from another institution', async () => {
      const token = await bearer(ctx.url, 'admin@a.test');
      await api()
        .patch(`/api/v1/institute/students/${ids.studentB}`)
        .set('authorization', token)
        .send({ verified: true })
        .expect(404);
    });

    it('refuses to put another institution’s student on our team', async () => {
      const token = await bearer(ctx.url, 'admin@a.test');
      await api()
        .post(`/api/v1/institute/teams/${ids.teamA}/members`)
        .set('authorization', token)
        .send({ studentIds: [ids.studentB] })
        .expect(404);
    });

    it('refuses to make another institution’s department ours', async () => {
      const token = await bearer(ctx.url, 'admin@a.test');
      await api()
        .patch(`/api/v1/institute/teams/${ids.teamA}`)
        .set('authorization', token)
        .send({ departmentId: ids.deptB })
        .expect(404);
    });
  });

  /* ========================================================= authority === */

  describe('roles inside one institution', () => {
    it('an administrator may add faculty; a guide may not', async () => {
      const admin = await bearer(ctx.url, 'admin@a.test');
      const guide = await bearer(ctx.url, 'guide@a.test');

      await api()
        .post('/api/v1/institute/faculty')
        .set('authorization', guide)
        .send({
          fullName: 'New Person',
          email: 'new@a.test',
          designation: 'Lecturer',
          password: 'abcd1234',
        })
        .expect(403);

      await api()
        .post('/api/v1/institute/faculty')
        .set('authorization', admin)
        .send({
          fullName: 'New Person',
          email: 'new@a.test',
          designation: 'Lecturer',
          password: 'abcd1234',
        })
        .expect(201);
    });

    it('an administrator may verify a student; a guide may not', async () => {
      const guide = await bearer(ctx.url, 'guide@a.test');
      await api()
        .patch(`/api/v1/institute/students/${ids.studentA}`)
        .set('authorization', guide)
        .send({ verified: true })
        .expect(403);

      const admin = await bearer(ctx.url, 'admin@a.test');
      await api()
        .patch(`/api/v1/institute/students/${ids.studentA}`)
        .set('authorization', admin)
        .send({ verified: true })
        .expect(200);
    });

    it('a guide sees only the teams they guide', async () => {
      const guide = await bearer(ctx.url, 'guide@a.test');
      const res = await api().get('/api/v1/institute/teams').set('authorization', guide);
      expect(res.body.map((t: { id: string }) => t.id)).toEqual([ids.teamA]);
    });

    it('a guide cannot reassign a colleague’s team', async () => {
      const guide = await bearer(ctx.url, 'guide@a.test');
      await api()
        .post(`/api/v1/institute/teams/${ids.teamOtherA}/guide`)
        .set('authorization', guide)
        .send({ facultyId: ids.guideA })
        .expect(404);
    });
  });

  /* ====================================================== assignment === */

  describe('assigning students and a guide', () => {
    it('assigns a guide and advances a team that already has members', async () => {
      const admin = await bearer(ctx.url, 'admin@a.test');

      await api()
        .post(`/api/v1/institute/teams/${ids.teamOtherA}/members`)
        .set('authorization', admin)
        .send({ studentIds: [ids.studentA] })
        .expect(200);

      await api()
        .post(`/api/v1/institute/teams/${ids.teamOtherA}/guide`)
        .set('authorization', admin)
        .send({ facultyId: ids.otherGuideA })
        .expect(200);

      const res = await api()
        .get(`/api/v1/institute/teams/${ids.teamOtherA}`)
        .set('authorization', admin);
      expect(res.body.guide.id).toBe(ids.otherGuideA);
      expect(res.body.memberCount).toBe(1);
      // A team with members and a guide has been formed, by definition.
      expect(res.body.stage).toBe('team_formed');
    });

    it('refuses a guide who is already at their declared capacity', async () => {
      const admin = await bearer(ctx.url, 'admin@a.test');
      // guideA has capacity 1 and already guides teamA.
      const res = await api()
        .post(`/api/v1/institute/teams/${ids.teamOtherA}/guide`)
        .set('authorization', admin)
        .send({ facultyId: ids.otherGuideA });
      expect(res.status).toBe(200);

      const clash = await api()
        .post(`/api/v1/institute/teams/${ids.teamOtherA}/guide`)
        .set('authorization', admin)
        .send({ facultyId: ids.guideA });
      expect(clash.status).toBe(422);
      expect(clash.body.detail).toMatch(/capacity/i);
    });

    it('refuses to put one student on two active teams', async () => {
      const admin = await bearer(ctx.url, 'admin@a.test');
      await api()
        .post(`/api/v1/institute/teams/${ids.teamA}/members`)
        .set('authorization', admin)
        .send({ studentIds: [ids.studentA] })
        .expect(200);

      const res = await api()
        .post(`/api/v1/institute/teams/${ids.teamOtherA}/members`)
        .set('authorization', admin)
        .send({ studentIds: [ids.studentA] });
      expect(res.status).toBe(409);
      expect(res.body.detail).toMatch(/another active team/i);
    });
  });

  /* ===================================================== submissions === */

  describe('the submission decision', () => {
    it('approving advances the project and empties the queue', async () => {
      const admin = await bearer(ctx.url, 'admin@a.test');

      const before = await api().get('/api/v1/institute/submissions').set('authorization', admin);
      expect(before.body).toHaveLength(1);
      const milestoneId = before.body[0].id;

      await api()
        .post(`/api/v1/institute/submissions/${milestoneId}/approve`)
        .set('authorization', admin)
        .send({})
        .expect(200);

      const after = await api().get('/api/v1/institute/submissions').set('authorization', admin);
      expect(after.body).toHaveLength(0);

      const project = await api().get('/api/v1/institute/projects').set('authorization', admin);
      expect(project.body[0].progress).toBe(60);
    });

    it('refuses a second decision on the same submission', async () => {
      const admin = await bearer(ctx.url, 'admin@a.test');
      const queue = await api().get('/api/v1/institute/submissions').set('authorization', admin);
      const milestoneId = queue.body[0].id;

      await api()
        .post(`/api/v1/institute/submissions/${milestoneId}/approve`)
        .set('authorization', admin)
        .send({})
        .expect(200);

      await api()
        .post(`/api/v1/institute/submissions/${milestoneId}/approve`)
        .set('authorization', admin)
        .send({})
        .expect(422);
    });

    it('requires a written reason when asking for changes', async () => {
      const admin = await bearer(ctx.url, 'admin@a.test');
      const queue = await api().get('/api/v1/institute/submissions').set('authorization', admin);
      const milestoneId = queue.body[0].id;

      await api()
        .post(`/api/v1/institute/submissions/${milestoneId}/request-changes`)
        .set('authorization', admin)
        .send({})
        .expect(400);

      await api()
        .post(`/api/v1/institute/submissions/${milestoneId}/request-changes`)
        .set('authorization', admin)
        .send({ note: 'Re-run the model with the observed section loss.' })
        .expect(200);

      const projects = await api().get('/api/v1/institute/projects').set('authorization', admin);
      const milestone = projects.body[0].milestones.find(
        (m: { id: string }) => m.id === milestoneId,
      );
      expect(milestone.status).toBe('changes_requested');
      expect(milestone.awaitingReview).toBe(false);
      // Asking for changes must not advance the project.
      expect(projects.body[0].progress).toBe(20);
    });

    it('hides another institution’s submissions', async () => {
      const other = await bearer(ctx.url, 'admin@b.test');
      const res = await api().get('/api/v1/institute/submissions').set('authorization', other);
      expect(res.body).toEqual([]);
    });
  });

  /* ========================================================= analytics === */

  describe('analytics', () => {
    /*
     * Participation once reported 120%, because it counted `TeamMember` rows
     * rather than distinct students — a student who finishes one team and joins
     * another holds two. A rate above 100% discredits every other figure on the
     * page, so it is worth a test of its own.
     */
    it('counts a student on two teams once', async () => {
      const admin = await bearer(ctx.url, 'admin@a.test');

      await api()
        .post(`/api/v1/institute/teams/${ids.teamA}/members`)
        .set('authorization', admin)
        .send({ studentIds: [ids.studentA] })
        .expect(200);

      // Close that team, then put the same student on the next one — exactly
      // the shape that produced the double count.
      await api()
        .patch(`/api/v1/institute/teams/${ids.teamA}`)
        .set('authorization', admin)
        .send({ status: 'completed' })
        .expect(200);

      await api()
        .post(`/api/v1/institute/teams/${ids.teamOtherA}/members`)
        .set('authorization', admin)
        .send({ studentIds: [ids.studentA] })
        .expect(200);

      const res = await api().get('/api/v1/institute/analytics').set('authorization', admin);
      expect(res.body.participation.students).toBe(1);
      expect(res.body.participation.engaged).toBe(1);
      expect(res.body.participation.rate).toBe(100);
    });

    it('reports zero participation rather than dividing by zero', async () => {
      const other = await bearer(ctx.url, 'admin@b.test');
      const res = await api().get('/api/v1/institute/analytics').set('authorization', other);
      expect(res.body.participation.engaged).toBe(0);
      expect(res.body.participation.rate).toBe(0);
      // Nothing decided, so there is no selection rate to report.
      expect(res.body.applications.selectionRate).toBeNull();
    });
  });

  /* ====================================================== registration === */

  describe('registration', () => {
    it('creates a pending account with a verification record', async () => {
      const res = await api()
        .post('/api/v1/auth/register/institute')
        .send({
          fullName: 'A Registrar',
          designation: 'Registrar',
          email: 'registrar@newcollege.ac.in',
          phone: '+919000000001',
          password: 'abcd1234',
          institutionName: 'New College',
          shortName: 'NC',
          institutionType: 'college',
          state: 'Jharkhand',
          city: 'Ranchi',
        })
        .expect(201);

      const me = await api()
        .get('/api/v1/auth/me')
        .set('authorization', `Bearer ${res.body.accessToken}`)
        .expect(200);

      expect(me.body.surface).toBe('institute');
      // A pending account holds a session and reaches nothing.
      expect(me.body.status).toBe('pending');
      expect(me.body.onboarded).toBe(false);

      await api()
        .get('/api/v1/institute/overview')
        .set('authorization', `Bearer ${res.body.accessToken}`)
        .expect(403);

      const verification = await ctx.prisma.accountVerification.findFirst({
        where: { requestedRoleKey: 'institute_admin', submittedById: me.body.id },
      });
      expect(verification?.status).toBe('pending');
    });

    it('refuses to claim an institution that already has an administrator', async () => {
      const res = await api().post('/api/v1/auth/register/institute').send({
        fullName: 'An Impostor',
        designation: 'Registrar',
        email: 'impostor@a.test',
        phone: '+919000000002',
        password: 'abcd1234',
        claimOrgId: ORG_A,
        institutionName: 'Institution A',
        shortName: 'IA',
        institutionType: 'college',
        state: 'Jharkhand',
        city: 'Ranchi',
      });
      expect(res.status).toBe(409);
      expect(res.body.detail).toMatch(/already has an administrator/i);
    });
  });
});

/* ------------------------------------------------------------------------ */

/**
 * Two institutions with the smallest shape the tests need: an administrator, a
 * guide at capacity 1, a second guide, one student, two teams, and one project
 * whose second milestone is awaiting a decision.
 */
async function seedTwoInstitutions(prisma: PrismaService): Promise<void> {
  const hash = await argon2.hash('jansetu-dev', { type: argon2.argon2id });
  const roleId = async (key: string) =>
    (await prisma.role.findUniqueOrThrow({ where: { key }, select: { id: true } })).id;

  for (const [orgId, letter] of [
    ['org-inst-a', 'a'],
    ['org-inst-b', 'b'],
  ] as const) {
    await prisma.organization.create({
      data: {
        id: orgId,
        type: 'institution',
        name: `Institution ${letter.toUpperCase()}`,
        institution: {
          create: {
            shortName: letter.toUpperCase(),
            city: 'Ranchi',
            state: 'Jharkhand',
            institutionType: 'college',
            emailDomains: [`${letter}.test`],
            onboardedAt: new Date(),
          },
        },
      },
    });

    await prisma.instituteDepartment.create({
      data: { id: `dept-${letter}`, orgId, name: 'Computer Science', code: 'CSE' },
    });

    await prisma.user.create({
      data: {
        id: `u-admin-${letter}`,
        kind: 'staff',
        displayName: 'Registrar',
        email: `admin@${letter}.test`,
        passwordHash: hash,
        emailVerifiedAt: new Date(),
        roles: { create: { roleId: await roleId('institute_admin'), orgId } },
        orgMemberships: { create: { orgId, designation: 'Registrar', isPrimaryContact: true } },
      },
    });

    await prisma.user.create({
      data: {
        id: `u-student-${letter}`,
        kind: 'citizen',
        displayName: 'A Student',
        email: `student@${letter}.test`,
        passwordHash: hash,
        roles: { create: { roleId: await roleId('student'), orgId } },
        studentProfile: {
          create: {
            orgId,
            institutionName: `Institution ${letter.toUpperCase()}`,
            degree: 'B.Tech',
            branch: 'Computer Science',
            currentYear: 3,
            graduationYear: 2028,
            state: 'Jharkhand',
            district: 'Ranchi',
            skills: ['React'],
            verifiedAt: new Date(),
            onboardedAt: new Date(),
          },
        },
      },
    });
  }

  /* Institution A's faculty. `guideA` has capacity 1 on purpose. */
  for (const [id, email, capacity] of [
    ['u-guide-a', 'guide@a.test', 1],
    ['u-guide-a2', 'guide2@a.test', 4],
  ] as const) {
    await prisma.user.create({
      data: {
        id,
        kind: 'staff',
        displayName: 'A Guide',
        email,
        passwordHash: hash,
        emailVerifiedAt: new Date(),
        roles: { create: { roleId: await roleId('faculty'), orgId: 'org-inst-a' } },
        orgMemberships: { create: { orgId: 'org-inst-a', designation: 'Professor' } },
        faculty: {
          create: {
            orgId: 'org-inst-a',
            designation: 'Professor',
            departmentId: 'dept-a',
            expertise: ['React'],
            guideCapacity: capacity,
          },
        },
      },
    });
  }

  await prisma.studentTeam.create({
    data: {
      id: 'team-a',
      orgId: 'org-inst-a',
      name: 'Team A',
      facultyId: 'u-guide-a',
      departmentId: 'dept-a',
      status: 'active',
      stage: 'research',
    },
  });
  await prisma.studentTeam.create({
    data: { id: 'team-a2', orgId: 'org-inst-a', name: 'Team A2', departmentId: 'dept-a' },
  });
  await prisma.studentTeam.create({
    data: { id: 'team-b', orgId: 'org-inst-b', name: 'Team B', departmentId: 'dept-b' },
  });

  await prisma.project.create({
    data: {
      id: 'proj-a',
      kind: 'gov',
      teamId: 'team-a',
      universityId: 'org-inst-a',
      title: 'Project A',
      progress: 20,
      milestones: {
        create: [
          { label: 'One', status: 'complete', percent: 20, completedAt: new Date() },
          { label: 'Two', status: 'active', percent: 60, awaitingReview: true },
        ],
      },
    },
  });

  /* The other three surfaces, so isolation has something to refuse. */
  await prisma.user.create({
    data: {
      kind: 'staff',
      displayName: 'A Partner',
      email: 'industry@a.test',
      passwordHash: hash,
      emailVerifiedAt: new Date(),
      roles: { create: { roleId: await roleId('industry_admin') } },
    },
  });
  await prisma.user.create({
    data: {
      kind: 'staff',
      displayName: 'An Officer',
      email: 'gov@a.test',
      passwordHash: hash,
      emailVerifiedAt: new Date(),
      roles: { create: { roleId: await roleId('gov_district') } },
    },
  });
}
