import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { ProblemException } from '../common/errors/problem';
import type { AuthPrincipal } from '../auth/auth.types';
import type {
  AssignGuideDto,
  AssignMembersDto,
  DepartmentDto,
  DepartmentPatchDto,
  FacultyCreateDto,
  FacultyPatchDto,
  ProgramDto,
  ProgramPatchDto,
  StudentPlacementDto,
  StudentQueryDto,
  TeamCreateDto,
  TeamPatchDto,
  UpdateProfileDto,
} from './institute.dto';

/**
 * Everything the institute portal reads and writes.
 *
 * One rule runs through the whole file: **the institution is resolved from the
 * session, never from the request.** `orgOf` reads `principal.orgIds`, keeps
 * only the one that is an institution, and every query below filters on it.
 * No endpoint accepts an `orgId`, so there is no parameter to tamper with —
 * which matters more here than on any other surface, because these rows are
 * named students.
 *
 * The second rule is that ownership is re-checked on the way *in* as well as
 * on the way out. Assigning a student to a team, a guide to a team or a
 * department to a faculty member all take ids from the client; each one is
 * loaded with `orgId` in the `where` before it is written, so a valid id
 * belonging to a different institution reads as not found rather than as an
 * assignment.
 */
@Injectable()
export class InstituteService {
  private readonly logger = new Logger('Institute');

  constructor(private readonly prisma: PrismaService) {}

  /* ============================================================= context === */

  /** The institution this session administers. */
  async orgOf(principal: AuthPrincipal): Promise<string> {
    if (!principal.orgIds.length) {
      throw ProblemException.forbidden('This account is not attached to an institution.');
    }
    const org = await this.prisma.organization.findFirst({
      where: { id: { in: principal.orgIds }, type: 'institution', deletedAt: null },
      select: { id: true },
    });
    if (!org) {
      throw ProblemException.forbidden('This account is not attached to an institution.');
    }
    return org.id;
  }

  /**
   * Teams this principal may act on.
   *
   * An `institute_admin` may act on every team in the institution. A faculty
   * member may act only on the teams they guide — the permission is the same
   * (`institute.team.manage`), the *scope* is not, and collapsing the two would
   * let any lecturer reassign another lecturer's students.
   */
  private async teamScope(
    principal: AuthPrincipal,
    orgId: string,
  ): Promise<Prisma.StudentTeamWhereInput> {
    const base: Prisma.StudentTeamWhereInput = { orgId, deletedAt: null };
    if (principal.roles.includes('institute_admin') || principal.roles.includes('admin')) {
      return base;
    }
    return { ...base, facultyId: principal.userId };
  }

  /* ============================================================= profile === */

  async profile(orgId: string) {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        about: true,
        institution: true,
        locations: { where: { isPrimary: true }, take: 1 },
        memberships: {
          select: {
            designation: true,
            isPrimaryContact: true,
            user: { select: { id: true, displayName: true, email: true, phone: true } },
          },
        },
      },
    });

    const [departments, programs, students, verifiedStudents, faculty, teams] = await Promise.all([
      this.prisma.instituteDepartment.count({ where: { orgId, deletedAt: null } }),
      this.prisma.program.count({ where: { orgId, deletedAt: null } }),
      this.prisma.studentProfile.count({ where: { orgId } }),
      this.prisma.studentProfile.count({ where: { orgId, verifiedAt: { not: null } } }),
      this.prisma.faculty.count({ where: { orgId, deletedAt: null } }),
      this.prisma.studentTeam.count({ where: { orgId, deletedAt: null } }),
    ]);

    const verification = await this.prisma.accountVerification.findFirst({
      where: { subjectType: 'organization', subjectId: orgId },
      orderBy: { createdAt: 'desc' },
      select: { status: true, reviewedAt: true, reason: true },
    });

    const p = org.institution;
    const location = org.locations[0] ?? null;

    /*
     * Profile completion is a checklist of things the portal actually needs,
     * each named. A bare percentage tells a registrar they are incomplete
     * without telling them what to do, which is why `missing` ships with it.
     */
    const checks: { key: string; label: string; done: boolean }[] = [
      { key: 'type', label: 'Institution type', done: Boolean(p?.institutionType) },
      { key: 'about', label: 'Description', done: Boolean(org.about?.trim()) },
      { key: 'website', label: 'Website', done: Boolean(p?.website) },
      {
        key: 'contact',
        label: 'Official email and phone',
        done: Boolean(p?.officialEmail && p?.officialPhone),
      },
      { key: 'accreditation', label: 'Accreditation', done: Boolean(p?.accreditation) },
      { key: 'aishe', label: 'AISHE / registration number', done: Boolean(p?.aisheCode) },
      { key: 'established', label: 'Year established', done: Boolean(p?.establishedYear) },
      { key: 'address', label: 'Campus address', done: Boolean(location?.city) },
      { key: 'domains', label: 'Email domains', done: (p?.emailDomains.length ?? 0) > 0 },
      { key: 'focus', label: 'Focus areas', done: (p?.focusAreas.length ?? 0) > 0 },
      { key: 'labs', label: 'Labs and facilities', done: (p?.labs.length ?? 0) > 0 },
      { key: 'departments', label: 'At least one department', done: departments > 0 },
      { key: 'programs', label: 'At least one programme', done: programs > 0 },
      { key: 'faculty', label: 'At least one faculty member', done: faculty > 0 },
    ];
    const done = checks.filter((c) => c.done).length;

    return {
      id: org.id,
      name: org.name,
      about: org.about,
      shortName: p?.shortName ?? org.name,
      institutionType: p?.institutionType ?? 'college',
      accreditation: p?.accreditation ?? null,
      aisheCode: p?.aisheCode ?? null,
      website: p?.website ?? null,
      officialEmail: p?.officialEmail ?? null,
      officialPhone: p?.officialPhone ?? null,
      establishedYear: p?.establishedYear ?? null,
      logoUrl: p?.logoUrl ?? null,
      city: p?.city ?? location?.city ?? '',
      state: p?.state ?? location?.state ?? '',
      district: p?.district ?? location?.district ?? null,
      focusAreas: p?.focusAreas ?? [],
      labs: p?.labs ?? [],
      emailDomains: p?.emailDomains ?? [],
      onboardedAt: p?.onboardedAt?.toISOString() ?? null,
      verification: {
        status: verification?.status ?? 'pending',
        reviewedAt: verification?.reviewedAt?.toISOString() ?? null,
        reason: verification?.reason ?? null,
      },
      administrators: org.memberships.map((m) => ({
        id: m.user.id,
        name: m.user.displayName,
        email: m.user.email,
        phone: m.user.phone,
        designation: m.designation,
        isPrimaryContact: m.isPrimaryContact,
      })),
      counts: { departments, programs, students, verifiedStudents, faculty, teams },
      completion: {
        percent: Math.round((done / checks.length) * 100),
        done,
        total: checks.length,
        missing: checks.filter((c) => !c.done).map((c) => ({ key: c.key, label: c.label })),
      },
    };
  }

  async updateProfile(orgId: string, dto: UpdateProfileDto) {
    await this.prisma.$transaction(async (tx) => {
      if (dto.name !== undefined || dto.about !== undefined) {
        await tx.organization.update({
          where: { id: orgId },
          data: { name: dto.name ?? undefined, about: dto.about ?? undefined },
        });
      }
      await tx.institutionProfile.update({
        where: { orgId },
        data: {
          shortName: dto.shortName ?? undefined,
          institutionType: dto.institutionType ?? undefined,
          accreditation: dto.accreditation ?? undefined,
          aisheCode: dto.aisheCode ?? undefined,
          website: dto.website ?? undefined,
          officialEmail: dto.officialEmail ?? undefined,
          officialPhone: dto.officialPhone ?? undefined,
          establishedYear: dto.establishedYear ?? undefined,
          city: dto.city ?? undefined,
          state: dto.state ?? undefined,
          district: dto.district ?? undefined,
          focusAreas: dto.focusAreas ?? undefined,
          labs: dto.labs ?? undefined,
          emailDomains: dto.emailDomains ?? undefined,
        },
      });
    });
    return this.profile(orgId);
  }

  /* ========================================================= departments === */

  async departments(orgId: string) {
    const rows = await this.prisma.instituteDepartment.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { name: 'asc' },
      include: {
        programs: { where: { deletedAt: null }, orderBy: { name: 'asc' } },
        _count: {
          select: {
            faculty: { where: { deletedAt: null } },
            students: true,
            teams: { where: { deletedAt: null } },
          },
        },
      },
    });

    const heads = await this.prisma.faculty.findMany({
      where: { orgId, userId: { in: rows.map((r) => r.hodFacultyId).filter(Boolean) as string[] } },
      select: { userId: true, user: { select: { displayName: true } } },
    });
    const headName = new Map(heads.map((h) => [h.userId, h.user.displayName]));

    return rows.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      hodFacultyId: d.hodFacultyId,
      hodName: d.hodFacultyId ? (headName.get(d.hodFacultyId) ?? null) : null,
      facultyStrength: d.facultyStrength,
      facultyCount: d._count.faculty,
      studentCount: d._count.students,
      teamCount: d._count.teams,
      programs: d.programs.map(programView),
    }));
  }

  async createDepartment(orgId: string, dto: DepartmentDto) {
    await this.assertFacultyOfOrg(orgId, dto.hodFacultyId);
    const clash = await this.prisma.instituteDepartment.findFirst({
      where: { orgId, code: dto.code, deletedAt: null },
      select: { id: true },
    });
    if (clash) throw ProblemException.conflict(`A department already uses the code ${dto.code}.`);

    await this.prisma.instituteDepartment.create({
      data: {
        orgId,
        name: dto.name,
        code: dto.code,
        hodFacultyId: dto.hodFacultyId ?? null,
        facultyStrength: dto.facultyStrength ?? null,
      },
    });
    return this.departments(orgId);
  }

  async updateDepartment(orgId: string, id: string, dto: DepartmentPatchDto) {
    await this.ownDepartment(orgId, id);
    await this.assertFacultyOfOrg(orgId, dto.hodFacultyId);
    if (dto.code) {
      const clash = await this.prisma.instituteDepartment.findFirst({
        where: { orgId, code: dto.code, deletedAt: null, id: { not: id } },
        select: { id: true },
      });
      if (clash) throw ProblemException.conflict(`A department already uses the code ${dto.code}.`);
    }
    await this.prisma.instituteDepartment.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        code: dto.code ?? undefined,
        hodFacultyId: dto.hodFacultyId === undefined ? undefined : dto.hodFacultyId,
        facultyStrength: dto.facultyStrength === undefined ? undefined : dto.facultyStrength,
      },
    });
    return this.departments(orgId);
  }

  /**
   * Soft delete, and only when nothing is standing on it.
   *
   * A department with live teams cannot be removed: the teams would keep a
   * pointer to a row the portal no longer lists, and the analytics would stop
   * adding up. Archiving the teams first is the registrar's decision to make
   * explicitly.
   */
  async deleteDepartment(orgId: string, id: string) {
    await this.ownDepartment(orgId, id);
    const teams = await this.prisma.studentTeam.count({
      where: { departmentId: id, deletedAt: null, status: { notIn: ['completed', 'archived'] } },
    });
    if (teams) {
      throw ProblemException.invalidState(
        `That department still has ${teams} active team${teams === 1 ? '' : 's'}. Close or move them first.`,
      );
    }
    await this.prisma.$transaction([
      this.prisma.program.updateMany({
        where: { departmentId: id },
        data: { deletedAt: new Date() },
      }),
      this.prisma.instituteDepartment.update({ where: { id }, data: { deletedAt: new Date() } }),
    ]);
    return this.departments(orgId);
  }

  /* ============================================================ programs === */

  async createProgram(orgId: string, dto: ProgramDto) {
    await this.ownDepartment(orgId, dto.departmentId);
    await this.prisma.program.create({
      data: {
        orgId,
        departmentId: dto.departmentId,
        name: dto.name,
        level: dto.level,
        durationYears: dto.durationYears,
        intake: dto.intake ?? null,
        eligibility: dto.eligibility ?? null,
        status: dto.status ?? 'active',
      },
    });
    return this.departments(orgId);
  }

  async updateProgram(orgId: string, id: string, dto: ProgramPatchDto) {
    const row = await this.prisma.program.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw ProblemException.notFound('That programme does not exist.');
    if (dto.departmentId) await this.ownDepartment(orgId, dto.departmentId);

    await this.prisma.program.update({
      where: { id },
      data: {
        departmentId: dto.departmentId ?? undefined,
        name: dto.name ?? undefined,
        level: dto.level ?? undefined,
        durationYears: dto.durationYears ?? undefined,
        intake: dto.intake === undefined ? undefined : dto.intake,
        eligibility: dto.eligibility ?? undefined,
        status: dto.status ?? undefined,
      },
    });
    return this.departments(orgId);
  }

  async deleteProgram(orgId: string, id: string) {
    const row = await this.prisma.program.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw ProblemException.notFound('That programme does not exist.');
    await this.prisma.$transaction([
      this.prisma.studentProfile.updateMany({
        where: { programId: id },
        data: { programId: null },
      }),
      this.prisma.program.update({ where: { id }, data: { deletedAt: new Date() } }),
    ]);
    return this.departments(orgId);
  }

  /* ============================================================ students === */

  /**
   * The roster.
   *
   * What is returned is deliberately narrower than `StudentProfile`: name,
   * branch, year, department, skills and participation. The resume, GitHub,
   * portfolio and LinkedIn URLs a student added for their own profile are
   * *not* the institution's to read, and neither is their phone number unless
   * the institution issued it.
   */
  async students(orgId: string, query: StudentQueryDto) {
    const where: Prisma.StudentProfileWhereInput = {
      orgId,
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.programId ? { programId: query.programId } : {}),
      ...(query.year ? { currentYear: query.year } : {}),
      ...(query.status === 'verified' ? { verifiedAt: { not: null } } : {}),
      ...(query.status === 'unverified' ? { verifiedAt: null } : {}),
      ...(query.q
        ? {
            OR: [
              { user: { displayName: { contains: query.q, mode: 'insensitive' } } },
              { branch: { contains: query.q, mode: 'insensitive' } },
              { enrollmentNo: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const rows = await this.prisma.studentProfile.findMany({
      where,
      orderBy: [{ verifiedAt: 'asc' }, { currentYear: 'asc' }],
      take: 500,
      select: {
        userId: true,
        degree: true,
        branch: true,
        currentYear: true,
        graduationYear: true,
        enrollmentNo: true,
        skills: true,
        interests: true,
        district: true,
        verifiedAt: true,
        departmentId: true,
        programId: true,
        onboardedAt: true,
        department: { select: { name: true, code: true } },
        program: { select: { name: true } },
        user: { select: { displayName: true, email: true, photoUrl: true } },
      },
    });

    // Team membership, in one query rather than per row.
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId: { in: rows.map((r) => r.userId) }, team: { orgId, deletedAt: null } },
      select: {
        userId: true,
        team: { select: { id: true, name: true, stage: true, status: true } },
      },
    });
    const teamOf = new Map(memberships.map((m) => [m.userId!, m.team]));

    const domains =
      (
        await this.prisma.institutionProfile.findUnique({
          where: { orgId },
          select: { emailDomains: true },
        })
      )?.emailDomains ?? [];

    return rows.map((s) => ({
      id: s.userId,
      name: s.user.displayName,
      email: s.user.email,
      photoUrl: s.user.photoUrl,
      degree: s.degree,
      branch: s.branch,
      currentYear: s.currentYear,
      graduationYear: s.graduationYear,
      enrollmentNo: s.enrollmentNo,
      district: s.district,
      skills: s.skills,
      interests: s.interests,
      departmentId: s.departmentId,
      departmentName: s.department?.name ?? null,
      programId: s.programId,
      programName: s.program?.name ?? null,
      verifiedAt: s.verifiedAt?.toISOString() ?? null,
      onboarded: s.onboardedAt !== null,
      team: teamOf.get(s.userId) ?? null,
      /** The automatic half of verification: is their address on our domain. */
      emailOnInstitutionDomain: domains.some((d) => (s.user.email ?? '').endsWith(`@${d}`)),
    }));
  }

  async placeStudent(orgId: string, reviewerId: string, userId: string, dto: StudentPlacementDto) {
    const row = await this.prisma.studentProfile.findFirst({
      where: { userId, orgId },
      select: { userId: true },
    });
    if (!row) throw ProblemException.notFound('That student is not on your roster.');

    if (dto.departmentId) await this.ownDepartment(orgId, dto.departmentId);
    if (dto.programId) {
      const program = await this.prisma.program.findFirst({
        where: { id: dto.programId, orgId, deletedAt: null },
        select: { id: true },
      });
      if (!program) throw ProblemException.notFound('That programme does not exist.');
    }

    await this.prisma.studentProfile.update({
      where: { userId },
      data: {
        departmentId: dto.departmentId === undefined ? undefined : dto.departmentId,
        programId: dto.programId === undefined ? undefined : dto.programId,
        ...(dto.verified === undefined
          ? {}
          : dto.verified
            ? { verifiedAt: new Date(), verifiedById: reviewerId }
            : { verifiedAt: null, verifiedById: null }),
      },
    });
    return { ok: true };
  }

  /* ============================================================= faculty === */

  async faculty(orgId: string) {
    const rows = await this.prisma.faculty.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { user: { displayName: 'asc' } },
      select: {
        userId: true,
        designation: true,
        expertise: true,
        departmentId: true,
        officialEmail: true,
        officialPhone: true,
        guideCapacity: true,
        createdAt: true,
        department: { select: { name: true, code: true } },
        user: { select: { displayName: true, email: true, photoUrl: true, status: true } },
        teams: {
          where: { deletedAt: null },
          select: { id: true, name: true, stage: true, status: true },
        },
      },
    });

    return rows.map((f) => {
      const live = f.teams.filter((t) => t.status !== 'completed' && t.status !== 'archived');
      return {
        id: f.userId,
        name: f.user.displayName,
        email: f.officialEmail ?? f.user.email,
        photoUrl: f.user.photoUrl,
        accountStatus: f.user.status,
        designation: f.designation,
        expertise: f.expertise,
        departmentId: f.departmentId,
        departmentName: f.department?.name ?? null,
        officialPhone: f.officialPhone,
        guideCapacity: f.guideCapacity,
        teams: f.teams,
        activeTeams: live.length,
        /** What the team-assignment screen sorts on. */
        available: live.length < f.guideCapacity,
        since: f.createdAt.toISOString(),
      };
    });
  }

  /**
   * Creates a faculty account.
   *
   * Three records, as everywhere else in this codebase: `User` is the login,
   * `Faculty` is who they are inside the institution, `UserRole(faculty, orgId)`
   * is what they may do. The role is scoped to *this* institution, so a person
   * who later joins a second one holds two rows rather than one ambiguous one.
   */
  async createFaculty(orgId: string, dto: FacultyCreateDto) {
    const taken = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });
    if (taken) throw ProblemException.conflict('An account already exists for that email address.');
    if (dto.departmentId) await this.ownDepartment(orgId, dto.departmentId);

    await this.prisma.$transaction(async (tx) => {
      const role = await tx.role.findUniqueOrThrow({ where: { key: 'faculty' } });
      await tx.user.create({
        data: {
          kind: 'staff',
          status: 'active',
          displayName: dto.fullName,
          email: dto.email,
          passwordHash: await argon2.hash(dto.password, { type: argon2.argon2id }),
          roles: { create: { roleId: role.id, orgId } },
          orgMemberships: {
            create: { orgId, designation: dto.designation, officialEmail: dto.email },
          },
          faculty: {
            create: {
              orgId,
              designation: dto.designation,
              expertise: dto.expertise,
              departmentId: dto.departmentId ?? null,
              officialEmail: dto.email,
              officialPhone: dto.officialPhone ?? null,
              guideCapacity: dto.guideCapacity,
            },
          },
        },
      });
    });

    this.logger.log(`Faculty added to ${orgId}`);
    return this.faculty(orgId);
  }

  async updateFaculty(orgId: string, userId: string, dto: FacultyPatchDto) {
    await this.ownFaculty(orgId, userId);
    if (dto.departmentId) await this.ownDepartment(orgId, dto.departmentId);
    await this.prisma.faculty.update({
      where: { userId },
      data: {
        designation: dto.designation ?? undefined,
        expertise: dto.expertise ?? undefined,
        departmentId: dto.departmentId === undefined ? undefined : dto.departmentId,
        officialPhone: dto.officialPhone ?? undefined,
        guideCapacity: dto.guideCapacity ?? undefined,
      },
    });
    return this.faculty(orgId);
  }

  /**
   * Removes a faculty member from the institution.
   *
   * The account is not deleted — it may hold a role elsewhere, and deleting a
   * user who has signed milestone approvals would orphan the audit trail. What
   * is removed is their standing here: the institution's role, and their name
   * from the department. Teams they guide are released so the gap shows up on
   * the dashboard instead of silently pointing at someone who has left.
   */
  async removeFaculty(orgId: string, userId: string) {
    await this.ownFaculty(orgId, userId);
    const role = await this.prisma.role.findUniqueOrThrow({ where: { key: 'faculty' } });
    await this.prisma.$transaction([
      this.prisma.studentTeam.updateMany({
        where: { orgId, facultyId: userId },
        data: { facultyId: null },
      }),
      this.prisma.faculty.update({
        where: { userId },
        data: { deletedAt: new Date(), departmentId: null },
      }),
      this.prisma.instituteDepartment.updateMany({
        where: { orgId, hodFacultyId: userId },
        data: { hodFacultyId: null },
      }),
      this.prisma.userRole.deleteMany({ where: { userId, roleId: role.id, orgId } }),
    ]);
    return this.faculty(orgId);
  }

  /* =============================================================== teams === */

  async teams(principal: AuthPrincipal, orgId: string) {
    const rows = await this.prisma.studentTeam.findMany({
      where: await this.teamScope(principal, orgId),
      orderBy: { updatedAt: 'desc' },
      include: {
        department: { select: { name: true, code: true } },
        faculty: {
          select: { userId: true, designation: true, user: { select: { displayName: true } } },
        },
        problem: { select: { id: true, title: true, category: true, severity: true } },
        members: {
          select: { id: true, userId: true, firstName: true, year: true, discipline: true },
        },
        projects: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            stage: true,
            phase: true,
            progress: true,
            milestones: { select: { id: true, status: true, awaitingReview: true } },
          },
        },
      },
    });
    return rows.map(teamView);
  }

  async team(principal: AuthPrincipal, orgId: string, id: string) {
    const row = await this.prisma.studentTeam.findFirst({
      where: { ...(await this.teamScope(principal, orgId)), id },
      include: {
        department: { select: { name: true, code: true } },
        faculty: {
          select: { userId: true, designation: true, user: { select: { displayName: true } } },
        },
        problem: { select: { id: true, title: true, category: true, severity: true } },
        members: {
          select: { id: true, userId: true, firstName: true, year: true, discipline: true },
        },
        projects: {
          where: { deletedAt: null },
          include: { milestones: { orderBy: { createdAt: 'asc' } } },
        },
        applications: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!row) throw ProblemException.notFound('That team does not exist.');

    return {
      ...teamView(row),
      projects: row.projects.map(projectView),
      applications: row.applications.map((a) => ({
        id: a.id,
        studentId: a.studentId,
        status: a.status,
        note: a.note,
        opportunityRef: a.opportunityRef,
        submittedAt: a.submittedAt?.toISOString() ?? null,
        decidedAt: a.decidedAt?.toISOString() ?? null,
      })),
    };
  }

  async createTeam(orgId: string, dto: TeamCreateDto) {
    if (dto.departmentId) await this.ownDepartment(orgId, dto.departmentId);
    if (dto.facultyId) await this.assertGuideAvailable(orgId, dto.facultyId);
    const members = dto.memberIds.length ? await this.rosterStudents(orgId, dto.memberIds) : [];

    const team = await this.prisma.studentTeam.create({
      data: {
        orgId,
        name: dto.name,
        title: dto.title ?? null,
        departmentId: dto.departmentId ?? null,
        problemId: dto.problemId ?? null,
        facultyId: dto.facultyId ?? null,
        skills: dto.skills,
        memberCount: members.length,
        stage: members.length && dto.facultyId ? 'team_formed' : 'discovery',
        members: {
          create: members.map((m) => ({
            userId: m.userId,
            firstName: m.firstName,
            year: m.year,
            discipline: m.discipline,
          })),
        },
      },
      select: { id: true },
    });
    return { id: team.id };
  }

  async updateTeam(principal: AuthPrincipal, orgId: string, id: string, dto: TeamPatchDto) {
    await this.ownTeam(principal, orgId, id);
    if (dto.departmentId) await this.ownDepartment(orgId, dto.departmentId);

    const timestamps =
      dto.status === 'submitted'
        ? { submittedAt: new Date() }
        : dto.status === 'completed'
          ? { completedAt: new Date() }
          : dto.status === 'active'
            ? { approvedAt: new Date(), approvedById: principal.userId }
            : {};

    await this.prisma.studentTeam.update({
      where: { id },
      data: {
        name: dto.name ?? undefined,
        title: dto.title ?? undefined,
        departmentId: dto.departmentId === undefined ? undefined : dto.departmentId,
        problemId: dto.problemId === undefined ? undefined : dto.problemId,
        skills: dto.skills ?? undefined,
        stage: dto.stage ?? undefined,
        status: dto.status ?? undefined,
        ...timestamps,
      },
    });
    return { ok: true };
  }

  /**
   * Assigns the faculty guide — the action this portal exists for.
   *
   * Both ids are re-read against `orgId` before anything is written, and the
   * guide's current load is checked against their declared capacity: a portal
   * that lets a registrar put a twelfth team on an already overloaded lecturer
   * is a portal that produces twelve unsupervised teams.
   */
  async assignGuide(principal: AuthPrincipal, orgId: string, teamId: string, dto: AssignGuideDto) {
    const team = await this.ownTeam(principal, orgId, teamId);
    if (dto.facultyId) await this.assertGuideAvailable(orgId, dto.facultyId, teamId);

    await this.prisma.studentTeam.update({
      where: { id: teamId },
      data: {
        facultyId: dto.facultyId,
        // A team with a guide and members has been formed, by definition.
        stage:
          dto.facultyId && team.memberCount > 0 && team.stage === 'discovery'
            ? 'team_formed'
            : undefined,
      },
    });
    return { ok: true };
  }

  async addMembers(principal: AuthPrincipal, orgId: string, teamId: string, dto: AssignMembersDto) {
    const team = await this.ownTeam(principal, orgId, teamId);
    const students = await this.rosterStudents(orgId, dto.studentIds);

    const already = await this.prisma.teamMember.findMany({
      where: { teamId, userId: { in: dto.studentIds } },
      select: { userId: true },
    });
    const skip = new Set(already.map((a) => a.userId));

    /*
     * A student belongs to one team at a time. Silently allowing two would make
     * every per-student figure on the dashboard — participation, workload,
     * placement — double count that person.
     */
    const elsewhere = await this.prisma.teamMember.findMany({
      where: {
        userId: { in: dto.studentIds },
        teamId: { not: teamId },
        team: { orgId, deletedAt: null, status: { notIn: ['completed', 'archived'] } },
      },
      select: { userId: true, team: { select: { name: true } } },
    });
    if (elsewhere.length) {
      throw ProblemException.conflict(
        `Already on another active team: ${elsewhere.map((e) => e.team.name).join(', ')}.`,
      );
    }

    const fresh = students.filter((s) => !skip.has(s.userId));
    if (fresh.length) {
      await this.prisma.$transaction([
        this.prisma.teamMember.createMany({
          data: fresh.map((m) => ({
            teamId,
            userId: m.userId,
            firstName: m.firstName,
            year: m.year,
            discipline: m.discipline,
          })),
        }),
        this.prisma.studentTeam.update({
          where: { id: teamId },
          data: {
            memberCount: { increment: fresh.length },
            stage: team.facultyId && team.stage === 'discovery' ? 'team_formed' : undefined,
          },
        }),
      ]);
    }
    return { added: fresh.length };
  }

  async removeMember(principal: AuthPrincipal, orgId: string, teamId: string, userId: string) {
    await this.ownTeam(principal, orgId, teamId);
    const row = await this.prisma.teamMember.findFirst({
      where: { teamId, userId },
      select: { id: true },
    });
    if (!row) throw ProblemException.notFound('That student is not on this team.');

    await this.prisma.$transaction([
      this.prisma.teamMember.delete({ where: { id: row.id } }),
      this.prisma.studentTeam.update({
        where: { id: teamId },
        data: { memberCount: { decrement: 1 } },
      }),
    ]);
    return { ok: true };
  }

  /* ============================================================ projects === */

  async projects(principal: AuthPrincipal, orgId: string) {
    const scope = await this.teamScope(principal, orgId);
    const rows = await this.prisma.project.findMany({
      where: { deletedAt: null, team: { is: scope } },
      orderBy: { updatedAt: 'desc' },
      include: {
        milestones: { orderBy: { createdAt: 'asc' } },
        team: {
          select: {
            id: true,
            name: true,
            status: true,
            department: { select: { name: true, code: true } },
            faculty: { select: { userId: true, user: { select: { displayName: true } } } },
          },
        },
        problem: { select: { id: true, title: true, category: true } },
      },
    });
    return rows.map(projectView);
  }

  async project(principal: AuthPrincipal, orgId: string, id: string) {
    const scope = await this.teamScope(principal, orgId);
    const row = await this.prisma.project.findFirst({
      where: { id, deletedAt: null, team: { is: scope } },
      include: {
        milestones: { orderBy: { createdAt: 'asc' } },
        documents: { orderBy: { at: 'desc' } },
        pilot: true,
        team: {
          select: {
            id: true,
            name: true,
            status: true,
            skills: true,
            department: { select: { name: true, code: true } },
            faculty: { select: { userId: true, user: { select: { displayName: true } } } },
            members: { select: { firstName: true, year: true, discipline: true } },
          },
        },
        problem: { select: { id: true, title: true, category: true, severity: true } },
      },
    });
    if (!row) throw ProblemException.notFound('That project does not exist.');
    return {
      ...projectView(row),
      members: row.team?.members ?? [],
      skills: row.team?.skills ?? [],
      documents: row.documents.map((d) => ({
        id: d.id,
        name: d.name,
        kind: d.kind,
        sizeKb: d.sizeKb,
        at: d.at.toISOString(),
        uploadedBy: d.uploadedBy,
      })),
      pilot: row.pilot
        ? {
            location: row.pilot.location,
            villages: row.pilot.villages,
            users: row.pilot.users,
            adoption: row.pilot.adoption,
            reliability: row.pilot.reliability,
            dayOfPlan: row.pilot.dayOfPlan,
            durationDays: row.pilot.durationDays,
          }
        : null,
    };
  }

  /* ========================================================= submissions === */

  /** Every milestone a team has submitted and nobody has decided on yet. */
  async submissions(principal: AuthPrincipal, orgId: string) {
    const scope = await this.teamScope(principal, orgId);
    const rows = await this.prisma.milestone.findMany({
      where: { awaitingReview: true, project: { deletedAt: null, team: { is: scope } } },
      orderBy: { updatedAt: 'asc' },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            stage: true,
            progress: true,
            team: {
              select: {
                id: true,
                name: true,
                department: { select: { name: true, code: true } },
                faculty: { select: { userId: true, user: { select: { displayName: true } } } },
              },
            },
          },
        },
      },
    });

    return rows.map((m) => ({
      id: m.id,
      label: m.label,
      detail: m.detail,
      status: m.status,
      percent: m.percent,
      deliverables: m.deliverables,
      dueAt: m.dueAt?.toISOString() ?? null,
      submittedAt: m.updatedAt.toISOString(),
      project: {
        id: m.project.id,
        title: m.project.title,
        stage: m.project.stage,
        progress: m.project.progress,
      },
      team: {
        id: m.project.team?.id ?? null,
        name: m.project.team?.name ?? 'Unassigned',
        department: m.project.team?.department?.name ?? null,
        guide: m.project.team?.faculty?.user.displayName ?? null,
      },
    }));
  }

  /**
   * The institution's decision on a submitted milestone.
   *
   * Approving advances the project's progress to the milestone's percentage;
   * asking for changes returns it to the team with a written reason, which is
   * mandatory — "changes requested" with no note is the single most useless
   * state a review system can produce.
   */
  async decideSubmission(
    principal: AuthPrincipal,
    orgId: string,
    milestoneId: string,
    decision: 'approve' | 'changes',
    note?: string,
  ) {
    const scope = await this.teamScope(principal, orgId);
    const milestone = await this.prisma.milestone.findFirst({
      where: { id: milestoneId, project: { deletedAt: null, team: { is: scope } } },
      select: { id: true, percent: true, projectId: true, awaitingReview: true },
    });
    if (!milestone) throw ProblemException.notFound('That submission does not exist.');
    if (!milestone.awaitingReview) {
      throw ProblemException.invalidState('That submission has already been decided.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.milestone.update({
        where: { id: milestoneId },
        data: {
          status: decision === 'approve' ? 'complete' : 'changes_requested',
          awaitingReview: false,
          completedAt: decision === 'approve' ? new Date() : null,
          reviewedById: principal.userId,
          reviewNote: note ?? null,
        },
      });

      if (decision === 'approve') {
        const project = await tx.project.findUniqueOrThrow({
          where: { id: milestone.projectId },
          select: { progress: true },
        });
        const progress = Math.max(project.progress, milestone.percent);
        await tx.project.update({
          where: { id: milestone.projectId },
          data: { progress, phase: progress >= 100 ? 'completed' : undefined },
        });
      }
    });

    return { ok: true };
  }

  /* ======================================================== applications === */

  async applications(orgId: string) {
    const students = await this.prisma.studentProfile.findMany({
      where: { orgId },
      select: {
        userId: true,
        branch: true,
        currentYear: true,
        user: { select: { displayName: true } },
      },
    });
    const byId = new Map(students.map((s) => [s.userId, s]));
    if (!students.length) return [];

    const rows = await this.prisma.application.findMany({
      where: {
        OR: [
          { studentId: { in: students.map((s) => s.userId) } },
          { team: { orgId, deletedAt: null } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
      include: { team: { select: { id: true, name: true } } },
    });

    return rows.map((a) => {
      const student = byId.get(a.studentId);
      return {
        id: a.id,
        status: a.status,
        note: a.note,
        opportunityRef: a.opportunityRef,
        challengeId: a.challengeId,
        submittedAt: a.submittedAt?.toISOString() ?? null,
        decidedAt: a.decidedAt?.toISOString() ?? null,
        createdAt: a.createdAt.toISOString(),
        student: student
          ? {
              id: student.userId,
              name: student.user.displayName,
              branch: student.branch,
              currentYear: student.currentYear,
            }
          : null,
        team: a.team,
      };
    });
  }

  /* ============================================================ overview === */

  /**
   * The dashboard.
   *
   * Built around one question — *where is work stuck, and who is accountable* —
   * so everything here is either a count a registrar checks, or a queue with a
   * name on it. The three `needs` lists are the whole point: a dashboard that
   * reports 14 teams without saying that four of them have no guide has told
   * nobody anything.
   */
  async overview(principal: AuthPrincipal, orgId: string) {
    const scope = await this.teamScope(principal, orgId);

    const [
      students,
      verifiedStudents,
      faculty,
      departments,
      programs,
      teamRows,
      projectRows,
      awaitingReview,
      applications,
    ] = await Promise.all([
      this.prisma.studentProfile.count({ where: { orgId } }),
      this.prisma.studentProfile.count({ where: { orgId, verifiedAt: { not: null } } }),
      this.prisma.faculty.count({ where: { orgId, deletedAt: null } }),
      this.prisma.instituteDepartment.count({ where: { orgId, deletedAt: null } }),
      this.prisma.program.count({ where: { orgId, deletedAt: null } }),
      this.prisma.studentTeam.findMany({
        where: scope,
        select: {
          id: true,
          name: true,
          stage: true,
          status: true,
          facultyId: true,
          memberCount: true,
          updatedAt: true,
          department: { select: { name: true } },
        },
      }),
      this.prisma.project.findMany({
        where: { deletedAt: null, team: { is: scope } },
        select: {
          id: true,
          title: true,
          stage: true,
          phase: true,
          progress: true,
          updatedAt: true,
        },
      }),
      this.prisma.milestone.count({
        where: { awaitingReview: true, project: { deletedAt: null, team: { is: scope } } },
      }),
      this.prisma.application.count({
        where: {
          status: { in: ['submitted', 'under_review'] },
          OR: [{ team: { orgId, deletedAt: null } }, { studentId: { in: [] } }],
        },
      }),
    ]);

    const live = teamRows.filter((t) => t.status !== 'completed' && t.status !== 'archived');

    /* The delivery pipeline, in the order the platform actually runs it. */
    const pipeline = PROJECT_STAGES.map((stage) => ({
      stage,
      label: STAGE_LABEL[stage],
      teams: live.filter((t) => t.stage === stage).length,
    }));

    const unguided = live
      .filter((t) => !t.facultyId)
      .map((t) => ({
        id: t.id,
        name: t.name,
        department: t.department?.name ?? null,
        members: t.memberCount,
      }));
    const emptyTeams = live
      .filter((t) => t.memberCount === 0)
      .map((t) => ({ id: t.id, name: t.name, department: t.department?.name ?? null }));

    const unverified = await this.prisma.studentProfile.findMany({
      where: { orgId, verifiedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        userId: true,
        branch: true,
        currentYear: true,
        user: { select: { displayName: true, email: true } },
      },
    });

    const submissions = await this.submissions(principal, orgId);

    /* Department roll-up — the only grouping a registrar reasons in. */
    const deptRows = await this.prisma.instituteDepartment.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        _count: {
          select: {
            students: true,
            faculty: { where: { deletedAt: null } },
            teams: { where: { deletedAt: null } },
          },
        },
        teams: {
          where: { deletedAt: null },
          select: { id: true, status: true, projects: { select: { progress: true } } },
        },
      },
    });

    const byDepartment = deptRows.map((d) => {
      const completed = d.teams.filter((t) => t.status === 'completed').length;
      const progresses = d.teams.flatMap((t) => t.projects.map((p) => p.progress));
      return {
        id: d.id,
        name: d.name,
        code: d.code,
        students: d._count.students,
        faculty: d._count.faculty,
        teams: d._count.teams,
        completed,
        avgProgress: progresses.length
          ? Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length)
          : 0,
      };
    });

    const recent = [
      ...teamRows.map((t) => ({
        kind: 'team' as const,
        id: t.id,
        at: t.updatedAt.toISOString(),
        title: t.name,
        detail: `${STAGE_LABEL[t.stage]} · ${t.memberCount} member${t.memberCount === 1 ? '' : 's'}`,
      })),
      ...projectRows.map((p) => ({
        kind: 'project' as const,
        id: p.id,
        at: p.updatedAt.toISOString(),
        title: p.title,
        detail: `${p.stage ? STAGE_LABEL[p.stage] : p.phase} · ${p.progress}%`,
      })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8);

    return {
      counts: {
        students,
        verifiedStudents,
        unverifiedStudents: students - verifiedStudents,
        faculty,
        departments,
        programs,
        teams: live.length,
        projects: projectRows.filter((p) => p.phase !== 'completed').length,
        completedProjects: projectRows.filter((p) => p.phase === 'completed').length,
        awaitingReview,
        applications,
      },
      pipeline,
      needs: {
        submissions: submissions.slice(0, 5),
        unguidedTeams: unguided,
        emptyTeams,
        unverifiedStudents: unverified.map((s) => ({
          id: s.userId,
          name: s.user.displayName,
          email: s.user.email,
          branch: s.branch,
          currentYear: s.currentYear,
        })),
      },
      byDepartment,
      recent,
    };
  }

  /* =========================================================== analytics === */

  /**
   * Institutional analytics.
   *
   * Every figure here is derived from rows this institution owns, and each one
   * answers a question a registrar is actually asked: how many of our students
   * are doing anything, how far do teams get before they stall, which
   * departments carry the work, what fraction of what we submit is accepted.
   */
  async analytics(principal: AuthPrincipal, orgId: string) {
    const scope = await this.teamScope(principal, orgId);

    const [students, engagedRows, teams, projects, apps] = await Promise.all([
      this.prisma.studentProfile.count({ where: { orgId } }),
      /*
       * Distinct *students*, not team memberships. A student who finished one
       * team and joined another holds two `TeamMember` rows, and counting rows
       * reported participation above 100% — which is both wrong and the kind of
       * wrong that discredits every other figure on the page.
       */
      this.prisma.teamMember.findMany({
        where: { team: { orgId, deletedAt: null }, userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.studentTeam.findMany({
        where: scope,
        select: { id: true, stage: true, status: true, facultyId: true, departmentId: true },
      }),
      this.prisma.project.findMany({
        where: { deletedAt: null, team: { is: scope } },
        select: {
          id: true,
          phase: true,
          stage: true,
          progress: true,
          milestones: { select: { status: true, awaitingReview: true } },
        },
      }),
      this.prisma.application.findMany({
        where: { team: { orgId, deletedAt: null } },
        select: { status: true },
      }),
    ]);

    const milestones = projects.flatMap((p) => p.milestones);
    const decided = apps.filter((a) => ['accepted', 'rejected'].includes(a.status));

    const engaged = engagedRows.length;

    return {
      participation: {
        students,
        engaged,
        rate: students ? Math.round((engaged / students) * 100) : 0,
      },
      teams: {
        total: teams.length,
        guided: teams.filter((t) => t.facultyId).length,
        completed: teams.filter((t) => t.status === 'completed').length,
        active: teams.filter((t) => t.status === 'active').length,
      },
      delivery: {
        projects: projects.length,
        completed: projects.filter((p) => p.phase === 'completed').length,
        avgProgress: projects.length
          ? Math.round(projects.reduce((a, p) => a + p.progress, 0) / projects.length)
          : 0,
        milestonesComplete: milestones.filter((m) => m.status === 'complete').length,
        milestonesTotal: milestones.length,
        awaitingReview: milestones.filter((m) => m.awaitingReview).length,
        changesRequested: milestones.filter((m) => m.status === 'changes_requested').length,
      },
      applications: {
        total: apps.length,
        accepted: apps.filter((a) => a.status === 'accepted').length,
        rejected: apps.filter((a) => a.status === 'rejected').length,
        open: apps.filter((a) => ['submitted', 'under_review', 'shortlisted'].includes(a.status))
          .length,
        /** Of the applications that got a decision, how many were accepted. */
        selectionRate: decided.length
          ? Math.round(
              (decided.filter((a) => a.status === 'accepted').length / decided.length) * 100,
            )
          : null,
      },
      stages: PROJECT_STAGES.map((stage) => ({
        stage,
        label: STAGE_LABEL[stage],
        teams: teams.filter((t) => t.stage === stage && t.status !== 'archived').length,
      })),
    };
  }

  /* ======================================================= opportunities === */

  /**
   * Validated citizen problems a student team can take on.
   *
   * A redacted projection, the same principle `lib/industry/visibility.ts`
   * applies to the industry surface: an institution gets the brief, the place
   * and the scale, and never the citizen reports, the reporters or the officer
   * notes behind them. There is no `Opportunity` table because there is no
   * separate thing — the opportunity *is* a problem somebody validated.
   */
  async opportunities(orgId: string) {
    const [rows, profile, taken] = await Promise.all([
      this.prisma.problem.findMany({
        // "Validated" is everything past triage: the citizen demand is real,
        // the administration has accepted it, and nobody has closed it.
        where: {
          deletedAt: null,
          status: { in: ['awaiting_sponsorship', 'funding_required', 'in_progress'] },
        },
        orderBy: [{ severity: 'desc' }, { affected: 'desc' }],
        take: 120,
        select: {
          id: true,
          title: true,
          category: true,
          severity: true,
          status: true,
          stage: true,
          affected: true,
          reportCount: true,
          estimatedCost: true,
          createdAt: true,
          jurisdiction: { select: { id: true, name: true, level: true } },
          ai: { select: { clusterLabel: true, routingReason: true } },
        },
      }),
      this.prisma.institutionProfile.findUnique({
        where: { orgId },
        select: { state: true, district: true, focusAreas: true },
      }),
      this.prisma.studentTeam.findMany({
        where: { orgId, deletedAt: null, problemId: { not: null } },
        select: { problemId: true, id: true, name: true },
      }),
    ]);

    const takenBy = new Map(taken.map((t) => [t.problemId!, { id: t.id, name: t.name }]));

    return rows.map((p) => ({
      id: p.id,
      title: p.title,
      summary: p.ai?.clusterLabel ?? null,
      category: p.category,
      severity: p.severity,
      status: p.status,
      stage: p.stage,
      affected: p.affected,
      reportCount: p.reportCount,
      estimatedCost: p.estimatedCost.toNumber(),
      jurisdiction: p.jurisdiction,
      postedAt: p.createdAt.toISOString(),
      /** Whether one of our own teams has already picked this up. */
      ourTeam: takenBy.get(p.id) ?? null,
      /** A cheap relevance hint, not a score: is it in our own district. */
      nearby: Boolean(profile?.district && p.jurisdiction.name === profile.district),
    }));
  }

  /* ============================================================ partners === */

  /**
   * Industry partners, split by whether they already carry our work.
   *
   * A partnership is not its own table yet, so "connected" is derived from
   * something real — a funding commitment against a problem one of our teams is
   * working on. That is a narrower definition than a partnership register would
   * give, and it has the advantage of being true.
   */
  async partners(orgId: string) {
    const ourProblems = await this.prisma.studentTeam.findMany({
      where: { orgId, deletedAt: null, problemId: { not: null } },
      select: { problemId: true },
    });
    const problemIds = ourProblems.map((t) => t.problemId!).filter(Boolean);

    const commitments = problemIds.length
      ? await this.prisma.fundingCommitment.findMany({
          where: { problemId: { in: problemIds } },
          select: { sponsorOrgId: true, problemId: true, amount: true, status: true },
        })
      : [];
    const connectedIds = new Set(commitments.map((c) => c.sponsorOrgId));

    const orgs = await this.prisma.organization.findMany({
      where: { type: 'industry', deletedAt: null },
      orderBy: { name: 'asc' },
      take: 100,
      select: {
        id: true,
        name: true,
        sector: true,
        about: true,
        industryInfo: {
          select: {
            csrThemes: true,
            technologyDomains: true,
            capabilities: true,
            geographies: true,
          },
        },
        locations: { where: { isPrimary: true }, take: 1, select: { city: true, state: true } },
      },
    });

    return orgs.map((o) => {
      const ours = commitments.filter((c) => c.sponsorOrgId === o.id);
      return {
        id: o.id,
        name: o.name,
        sector: o.sector,
        about: o.about,
        city: o.locations[0]?.city ?? null,
        state: o.locations[0]?.state ?? null,
        csrThemes: o.industryInfo?.csrThemes ?? [],
        technologyDomains: o.industryInfo?.technologyDomains ?? [],
        capabilities: o.industryInfo?.capabilities ?? [],
        geographies: o.industryInfo?.geographies ?? [],
        connected: connectedIds.has(o.id),
        sharedProblems: new Set(ours.map((c) => c.problemId)).size,
        committed: ours.reduce((a, c) => a + c.amount.toNumber(), 0),
      };
    });
  }

  /* ======================================================= notifications === */

  async notifications(principal: AuthPrincipal) {
    const rows = await this.prisma.notification.findMany({
      where: { userId: principal.userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      detail: n.detail,
      actionLabel: n.actionLabel,
      actionHref: n.actionHref,
      read: n.read,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async markNotificationsRead(principal: AuthPrincipal) {
    await this.prisma.notification.updateMany({
      where: { userId: principal.userId, read: false },
      data: { read: true },
    });
    return { ok: true };
  }

  /* ============================================================= helpers === */

  private async ownDepartment(orgId: string, id: string) {
    const row = await this.prisma.instituteDepartment.findFirst({
      where: { id, orgId, deletedAt: null },
      select: { id: true },
    });
    if (!row) throw ProblemException.notFound('That department does not exist.');
    return row;
  }

  private async ownFaculty(orgId: string, userId: string) {
    const row = await this.prisma.faculty.findFirst({
      where: { userId, orgId, deletedAt: null },
      select: { userId: true, guideCapacity: true },
    });
    if (!row) throw ProblemException.notFound('That faculty member is not at your institution.');
    return row;
  }

  private async ownTeam(principal: AuthPrincipal, orgId: string, id: string) {
    const row = await this.prisma.studentTeam.findFirst({
      where: { ...(await this.teamScope(principal, orgId)), id },
      select: { id: true, stage: true, memberCount: true, facultyId: true },
    });
    if (!row) throw ProblemException.notFound('That team does not exist.');
    return row;
  }

  /** Both that the person is ours, and that they have room for another team. */
  private async assertGuideAvailable(orgId: string, facultyId: string, exceptTeamId?: string) {
    const faculty = await this.ownFaculty(orgId, facultyId);
    const load = await this.prisma.studentTeam.count({
      where: {
        orgId,
        facultyId,
        deletedAt: null,
        status: { notIn: ['completed', 'archived'] },
        ...(exceptTeamId ? { id: { not: exceptTeamId } } : {}),
      },
    });
    if (load >= faculty.guideCapacity) {
      throw ProblemException.invalidState(
        `That faculty member is already guiding ${load} teams, which is their declared capacity.`,
      );
    }
  }

  private async assertFacultyOfOrg(orgId: string, facultyId: string | null | undefined) {
    if (facultyId) await this.ownFaculty(orgId, facultyId);
  }

  /** Students on this roster, projected to what `TeamMember` stores. */
  private async rosterStudents(orgId: string, ids: string[]) {
    const rows = await this.prisma.studentProfile.findMany({
      where: { userId: { in: ids }, orgId },
      select: {
        userId: true,
        branch: true,
        currentYear: true,
        user: { select: { displayName: true } },
      },
    });
    if (rows.length !== ids.length) {
      throw ProblemException.notFound('One of those students is not on your roster.');
    }
    return rows.map((s) => ({
      userId: s.userId,
      firstName: s.user.displayName.split(' ')[0] ?? s.user.displayName,
      year: `Year ${s.currentYear}`,
      discipline: s.branch,
    }));
  }
}

/* ------------------------------------------------------------------------ */

/** The delivery pipeline, in the order the platform runs it. */
const PROJECT_STAGES = [
  'discovery',
  'team_formed',
  'funded',
  'research',
  'prototype',
  'testing',
  'pilot',
  'deployment',
  'impact',
] as const;

const STAGE_LABEL: Record<string, string> = {
  discovery: 'Discovery',
  team_formed: 'Team formed',
  funded: 'Funded',
  research: 'Research',
  prototype: 'Prototype',
  testing: 'Testing',
  pilot: 'Pilot',
  deployment: 'Deployment',
  impact: 'Impact',
};

function programView(p: {
  id: string;
  departmentId: string;
  name: string;
  level: string;
  durationYears: number;
  intake: number | null;
  eligibility: string | null;
  status: string;
}) {
  return {
    id: p.id,
    departmentId: p.departmentId,
    name: p.name,
    level: p.level,
    durationYears: p.durationYears,
    intake: p.intake,
    eligibility: p.eligibility,
    status: p.status,
  };
}

/**
 * The shape `teamView` needs, written structurally rather than derived from a
 * `GetPayload`: three call sites select slightly different project columns, and
 * a derived type would force all three to agree on columns the view never
 * reads.
 */
type TeamRow = {
  id: string;
  name: string;
  title: string | null;
  status: string;
  stage: string;
  skills: string[];
  memberCount: number;
  departmentId: string | null;
  department: { name: string; code: string } | null;
  faculty: { userId: string; designation: string; user: { displayName: string } } | null;
  problem: { id: string; title: string; category: string; severity: string } | null;
  members: {
    id: string;
    userId: string | null;
    firstName: string;
    year: string;
    discipline: string;
  }[];
  projects: { id: string; progress: number }[];
  approvedAt: Date | null;
  submittedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function teamView(t: TeamRow) {
  const project = t.projects[0] ?? null;
  return {
    id: t.id,
    name: t.name,
    title: t.title,
    status: t.status,
    stage: t.stage,
    skills: t.skills,
    memberCount: t.memberCount,
    departmentId: t.departmentId,
    department: t.department ? { name: t.department.name, code: t.department.code } : null,
    guide: t.faculty
      ? {
          id: t.faculty.userId,
          name: t.faculty.user.displayName,
          designation: t.faculty.designation,
        }
      : null,
    problem: t.problem,
    members: t.members,
    projectId: project?.id ?? null,
    progress: project?.progress ?? 0,
    approvedAt: t.approvedAt?.toISOString() ?? null,
    submittedAt: t.submittedAt?.toISOString() ?? null,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

type ProjectRow = {
  id: string;
  title: string;
  kind: string;
  phase: string;
  stage: string | null;
  progress: number;
  startedAt: Date | null;
  dueAt: Date | null;
  /** Optional because a project nested under a team is already in its context. */
  problem?: { id: string; title: string; category: string } | null;
  team?: {
    id: string;
    name: string;
    status: string;
    department: { name: string; code: string } | null;
    faculty: { userId: string; user: { displayName: string } } | null;
  } | null;
  milestones: {
    id: string;
    label: string;
    detail: string | null;
    status: string;
    percent: number;
    deliverables: string[];
    awaitingReview: boolean;
    reviewNote: string | null;
    dueAt: Date | null;
    completedAt: Date | null;
  }[];
};

function projectView(p: ProjectRow) {
  const milestones = p.milestones.map((m) => ({
    id: m.id,
    label: m.label,
    detail: m.detail,
    status: m.status,
    percent: m.percent,
    deliverables: m.deliverables,
    awaitingReview: m.awaitingReview,
    reviewNote: m.reviewNote,
    dueAt: m.dueAt?.toISOString() ?? null,
    completedAt: m.completedAt?.toISOString() ?? null,
  }));

  return {
    id: p.id,
    title: p.title,
    kind: p.kind,
    phase: p.phase,
    stage: p.stage,
    progress: p.progress,
    startedAt: p.startedAt?.toISOString() ?? null,
    dueAt: p.dueAt?.toISOString() ?? null,
    problem: p.problem ?? null,
    team: p.team
      ? {
          id: p.team.id,
          name: p.team.name,
          status: p.team.status,
          department: p.team.department?.name ?? null,
          guide: p.team.faculty?.user.displayName ?? null,
          guideId: p.team.faculty?.userId ?? null,
        }
      : null,
    milestones,
    awaitingReview: milestones.filter((m) => m.awaitingReview).length,
  };
}
