import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProblemException } from '../common/errors/problem';
import { AuthService } from './auth.service';
import type { TokenPair } from './auth.types';
import type {
  GovernmentRegisterDto,
  IndustryOnboardingDto,
  IndustryRegisterDto,
  InstituteOnboardingDto,
  InstituteRegisterDto,
  StudentOnboardingDto,
  StudentRegisterDto,
} from './registration.dto';

/**
 * Account provisioning.
 *
 * Three rules hold everywhere in this file.
 *
 * **The client never chooses its own authority.** A signup body carries a
 * *requested* role; what gets written is decided here. A student is granted
 * `student` immediately because a student holds no power over anyone else. A
 * government or industry applicant is granted the role they asked for but with
 * `status: pending`, and `AccountStatusGuard` keeps that account in its waiting
 * room until a reviewer acts. The alternative — trusting the form — would let
 * anybody self-issue a Deputy Commissioner's ability to approve public funding.
 *
 * **Identity, membership and permission are three different records.** `User`
 * is the login, `OrgMembership` is who the person is inside the organisation,
 * `UserRole` is what they may do. Keeping them apart is what lets a second CSR
 * officer or a second panchayat operator be added later without a second
 * signup flow.
 *
 * **Every automated check a reviewer would otherwise do by hand is recorded.**
 * `AccountVerification.signals` holds the email domain class, whether the work
 * email matches the declared website, and any existing body at the same
 * jurisdiction — so review is reading evidence, not guessing.
 */
@Injectable()
export class RegistrationService {
  private readonly logger = new Logger('Registration');

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /* ============================================================ student === */

  async registerStudent(dto: StudentRegisterDto, userAgent?: string): Promise<TokenPair> {
    await this.assertEmailFree(dto.email);

    const user = await this.prisma.user.create({
      data: {
        kind: 'citizen',
        status: 'active',
        displayName: dto.fullName,
        email: dto.email,
        passwordHash: await this.auth.hashPassword(dto.password),
        roles: { create: { role: { connect: { key: 'student' } } } },
      },
    });

    this.logger.log(`Student registered (${user.id})`);
    return this.auth.issueFor(user, userAgent);
  }

  /**
   * Completes the student wizard.
   *
   * Idempotent: re-running it updates the profile rather than failing, so a
   * student can walk back through the wizard from settings.
   */
  async completeStudentOnboarding(userId: string, dto: StudentOnboardingDto): Promise<void> {
    const org = dto.orgId
      ? await this.prisma.organization.findFirst({
          where: { id: dto.orgId, type: 'institution', deletedAt: null },
          select: { id: true, name: true },
        })
      : null;

    const data = {
      orgId: org?.id ?? null,
      institutionName: org?.name ?? dto.institutionName,
      degree: dto.degree,
      branch: dto.branch,
      currentYear: dto.currentYear,
      graduationYear: dto.graduationYear,
      enrollmentNo: dto.enrollmentNo ?? null,
      state: dto.state,
      district: dto.district,
      skills: dto.skills,
      interests: dto.interests,
      onboardedAt: new Date(),
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.studentProfile.upsert({
        where: { userId },
        create: { userId, ...data },
        update: data,
      });

      if (dto.phone) {
        const taken = await tx.user.findFirst({
          where: { phone: dto.phone, id: { not: userId } },
          select: { id: true },
        });
        if (taken) {
          throw ProblemException.conflict('That phone number is already on another account.');
        }
        await tx.user.update({ where: { id: userId }, data: { phone: dto.phone } });
      }

      // Scope the student's role to their institution, so campus-level
      // features (leaderboards, faculty mentoring) have something to key on.
      if (org) {
        const role = await tx.role.findUniqueOrThrow({ where: { key: 'student' } });
        await tx.userRole.deleteMany({ where: { userId, roleId: role.id } });
        await tx.userRole.create({ data: { userId, roleId: role.id, orgId: org.id } });
      }
    });
  }

  /* ========================================================= government === */

  async registerGovernment(dto: GovernmentRegisterDto, userAgent?: string): Promise<TokenPair> {
    await this.assertEmailFree(dto.email);
    await this.assertPhoneFree(dto.phone);

    if (dto.lgdCode) {
      const clash = await this.prisma.governmentBodyProfile.findUnique({
        where: { lgdCode: dto.lgdCode },
        select: { orgId: true },
      });
      if (clash) {
        throw ProblemException.conflict(
          'An authority with that LGD code is already registered. Ask your colleague to invite you instead.',
        );
      }
    }

    const jurisdiction = dto.jurisdictionId
      ? await this.prisma.jurisdiction.findUnique({
          where: { id: dto.jurisdictionId },
          select: { id: true },
        })
      : null;

    // What a reviewer would otherwise have to check by hand.
    const existing = await this.prisma.governmentBodyProfile.findMany({
      where: { state: dto.state, district: dto.district, bodyName: dto.bodyName },
      select: { orgId: true },
    });
    const signals = {
      emailDomainClass: govEmailClass(dto.email),
      lgdCodeProvided: Boolean(dto.lgdCode),
      jurisdictionResolved: Boolean(jurisdiction),
      duplicateOrgIds: existing.map((e) => e.orgId),
      requestedAt: new Date().toISOString(),
    };

    const user = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          type: 'government_body',
          name: dto.bodyName,
          jurisdictionId: jurisdiction?.id ?? null,
          govBody: {
            create: {
              bodyType: dto.bodyType,
              bodyName: dto.bodyName,
              lgdCode: dto.lgdCode ?? null,
              state: dto.state,
              district: dto.district,
              block: dto.block ?? null,
              officeAddress: dto.officeAddress ?? null,
              pincode: dto.pincode ?? null,
            },
          },
          locations: {
            create: {
              kind: 'office',
              label: 'Registered office',
              state: dto.state,
              district: dto.district,
              city: dto.block ?? dto.district,
              pincode: dto.pincode ?? null,
              isPrimary: true,
            },
          },
        },
      });

      const role = await tx.role.findUniqueOrThrow({ where: { key: dto.requestedRoleKey } });

      const created = await tx.user.create({
        data: {
          kind: 'staff',
          // The account exists, holds a session, and can do nothing until a
          // reviewer says otherwise.
          status: 'pending',
          displayName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          passwordHash: await this.auth.hashPassword(dto.password),
          roles: {
            create: {
              roleId: role.id,
              orgId: org.id,
              jurisdictionId: jurisdiction?.id ?? null,
            },
          },
          orgMemberships: {
            create: {
              orgId: org.id,
              designation: dto.designation,
              officialEmail: dto.email,
              officialPhone: dto.phone,
              isPrimaryContact: true,
            },
          },
        },
      });

      await tx.accountVerification.create({
        data: {
          subjectType: 'organization',
          subjectId: org.id,
          status: 'pending',
          requestedRoleKey: dto.requestedRoleKey,
          jurisdictionId: jurisdiction?.id ?? null,
          submittedById: created.id,
          signals: signals as Prisma.InputJsonValue,
        },
      });

      return created;
    });

    this.logger.log(`Government account pending review (${user.id})`);
    return this.auth.issueFor(user, userAgent);
  }

  /* =========================================================== industry === */

  async registerIndustry(dto: IndustryRegisterDto, userAgent?: string): Promise<TokenPair> {
    await this.assertEmailFree(dto.email);
    await this.assertPhoneFree(dto.phone);

    const websiteHost = hostOf(dto.website);
    const emailHost = dto.email.split('@')[1] ?? '';
    const duplicates = await this.prisma.organization.findMany({
      where: { type: 'industry', legalName: dto.legalName, deletedAt: null },
      select: { id: true },
    });

    const signals = {
      emailDomain: emailHost,
      websiteHost,
      websiteMatchesEmail: Boolean(websiteHost) && emailHost.endsWith(baseDomain(websiteHost)),
      freeEmailProvider: FREE_EMAIL.has(emailHost),
      duplicateOrgIds: duplicates.map((d) => d.id),
      requestedAt: new Date().toISOString(),
    };

    const user = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          type: 'industry',
          name: dto.companyName,
          legalName: dto.legalName,
          sector: dto.sector,
          industryInfo: {
            create: {
              orgSize: dto.orgSize,
              sector: dto.sector,
              website: dto.website,
              // The match profile is the onboarding wizard's job. Nothing here
              // yet, and `onboardedAt` stays null until it is filled in.
              csrThemes: [],
              geographies: [dto.state],
              technologyDomains: [],
              capabilities: [],
              sdgPreferences: [],
              provenDomains: [],
            },
          },
          locations: {
            create: {
              kind: 'headquarters',
              label: 'Headquarters',
              state: dto.state,
              district: dto.district ?? null,
              city: dto.city,
              pincode: dto.pincode ?? null,
              isPrimary: true,
            },
          },
        },
      });

      const role = await tx.role.findUniqueOrThrow({ where: { key: 'industry_admin' } });

      const created = await tx.user.create({
        data: {
          kind: 'staff',
          status: 'pending',
          displayName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          passwordHash: await this.auth.hashPassword(dto.password),
          roles: { create: { roleId: role.id, orgId: org.id } },
          orgMemberships: {
            create: {
              orgId: org.id,
              designation: dto.designation,
              officialEmail: dto.email,
              officialPhone: dto.phone,
              isPrimaryContact: true,
            },
          },
        },
      });

      await tx.accountVerification.create({
        data: {
          subjectType: 'organization',
          subjectId: org.id,
          status: 'pending',
          requestedRoleKey: 'industry_admin',
          submittedById: created.id,
          signals: signals as Prisma.InputJsonValue,
        },
      });

      return created;
    });

    this.logger.log(`Industry account pending review (${user.id})`);
    return this.auth.issueFor(user, userAgent);
  }

  /** Fills in the match profile and the branch list. Idempotent. */
  async completeIndustryOnboarding(userId: string, dto: IndustryOnboardingDto): Promise<void> {
    const membership = await this.prisma.orgMembership.findFirst({
      where: { userId, org: { type: 'industry' } },
      select: { orgId: true },
    });
    if (!membership) {
      throw ProblemException.forbidden('This account is not attached to an industry partner.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.industryProfile.update({
        where: { orgId: membership.orgId },
        data: {
          csrThemes: dto.csrThemes,
          geographies: dto.geographies,
          technologyDomains: dto.technologyDomains,
          capabilities: dto.capabilities,
          sdgPreferences: dto.sdgPreferences,
          fundingMin: dto.fundingMin,
          fundingMax: dto.fundingMax,
          employeeCount: dto.employeeCount ?? null,
          yearEstablished: dto.yearEstablished ?? null,
          csrFinancialYear: dto.csrFinancialYear ?? null,
          csrAllocated: dto.csrAllocated ?? null,
          csrPreferredCeiling: dto.csrPreferredCeiling ?? null,
          onboardedAt: new Date(),
        },
      });

      // Branches are rows, never a text field — the dashboard has to be able to
      // ask "which of our sites is nearest this challenge".
      await tx.orgLocation.deleteMany({
        where: { orgId: membership.orgId, kind: { not: 'headquarters' } },
      });
      if (dto.branches.length) {
        await tx.orgLocation.createMany({
          data: dto.branches.map((b) => ({
            orgId: membership.orgId,
            kind: b.kind,
            label: b.label ?? null,
            state: b.state,
            district: b.district ?? null,
            city: b.city,
            pincode: b.pincode ?? null,
          })),
        });
      }
    });
  }

  /* ========================================================== institute === */

  /**
   * Registers an institution and the registrar who administers it.
   *
   * The branch that matters is `claimOrgId`. Six institutions are already on
   * the register — students pick their college from it during onboarding — so
   * a registrar signing up for one of them must attach to the *existing*
   * organisation. Creating a second row would split the roster: the students
   * who already named that college would sit under an organisation nobody
   * administers, and the new one would open on an empty dashboard.
   *
   * A claim is therefore a claim, not a grant. The account is `pending` either
   * way and a reviewer decides — which is the whole point of recording the
   * claim as a signal rather than acting on it.
   */
  async registerInstitute(dto: InstituteRegisterDto, userAgent?: string): Promise<TokenPair> {
    await this.assertEmailFree(dto.email);
    await this.assertPhoneFree(dto.phone);

    const claimed = dto.claimOrgId
      ? await this.prisma.organization.findFirst({
          where: { id: dto.claimOrgId, type: 'institution', deletedAt: null },
          select: {
            id: true,
            name: true,
            institution: { select: { emailDomains: true } },
            memberships: { select: { userId: true }, take: 1 },
          },
        })
      : null;

    if (dto.claimOrgId && !claimed) {
      throw ProblemException.notFound('That institution is not on the register.');
    }
    if (claimed?.memberships.length) {
      throw ProblemException.conflict(
        'That institution already has an administrator. Ask them to invite you instead.',
      );
    }

    const emailHost = dto.email.split('@')[1] ?? '';
    const websiteHost = dto.website ? hostOf(dto.website) : '';
    const duplicates = await this.prisma.organization.findMany({
      where: {
        type: 'institution',
        deletedAt: null,
        name: { equals: dto.institutionName, mode: 'insensitive' },
        ...(claimed ? { id: { not: claimed.id } } : {}),
      },
      select: { id: true },
    });

    // What a reviewer would otherwise check by hand. An academic domain is the
    // strongest signal an institution can offer, and the registrar's own
    // address sitting on it is most of the review.
    const signals = {
      emailDomain: emailHost,
      emailDomainClass: academicEmailClass(dto.email),
      websiteHost,
      // Recorded only when a website was declared. Writing `false` for an
      // applicant who gave no website reads to them as a failed check on
      // something they were never asked for.
      ...(websiteHost ? { websiteMatchesEmail: emailHost.endsWith(baseDomain(websiteHost)) } : {}),
      /** True when the address is already a registered domain of the claim. */
      matchesRegisteredDomain: (claimed?.institution?.emailDomains ?? []).some((d) =>
        emailHost.endsWith(d),
      ),
      claimedExistingOrg: claimed?.id ?? null,
      aisheCodeProvided: Boolean(dto.aisheCode),
      duplicateOrgIds: duplicates.map((d) => d.id),
      requestedAt: new Date().toISOString(),
    };

    const user = await this.prisma.$transaction(async (tx) => {
      const orgId = claimed
        ? (
            await tx.organization.update({
              where: { id: claimed.id },
              data: {
                institution: {
                  update: {
                    institutionType: dto.institutionType,
                    website: dto.website ?? undefined,
                    officialEmail: dto.email,
                    officialPhone: dto.phone,
                    establishedYear: dto.establishedYear ?? undefined,
                    aisheCode: dto.aisheCode ?? undefined,
                  },
                },
              },
              select: { id: true },
            })
          ).id
        : (
            await tx.organization.create({
              data: {
                type: 'institution',
                name: dto.institutionName,
                institution: {
                  create: {
                    shortName: dto.shortName,
                    institutionType: dto.institutionType,
                    city: dto.city,
                    state: dto.state,
                    district: dto.district ?? null,
                    aisheCode: dto.aisheCode ?? null,
                    website: dto.website ?? null,
                    officialEmail: dto.email,
                    officialPhone: dto.phone,
                    establishedYear: dto.establishedYear ?? null,
                    focusAreas: [],
                    labs: [],
                    emailDomains: emailHost && !FREE_EMAIL.has(emailHost) ? [emailHost] : [],
                  },
                },
                locations: {
                  create: {
                    kind: 'headquarters',
                    label: 'Main campus',
                    state: dto.state,
                    district: dto.district ?? null,
                    city: dto.city,
                    pincode: dto.pincode ?? null,
                    isPrimary: true,
                  },
                },
              },
              select: { id: true },
            })
          ).id;

      const role = await tx.role.findUniqueOrThrow({ where: { key: 'institute_admin' } });

      const created = await tx.user.create({
        data: {
          kind: 'staff',
          // An institution vouches for students and signs off their work. That
          // is authority over other people's record, so it waits for review.
          status: 'pending',
          displayName: dto.fullName,
          email: dto.email,
          phone: dto.phone,
          passwordHash: await this.auth.hashPassword(dto.password),
          roles: { create: { roleId: role.id, orgId } },
          orgMemberships: {
            create: {
              orgId,
              designation: dto.designation,
              officialEmail: dto.email,
              officialPhone: dto.phone,
              isPrimaryContact: true,
            },
          },
        },
      });

      await tx.accountVerification.create({
        data: {
          subjectType: 'organization',
          subjectId: orgId,
          status: 'pending',
          requestedRoleKey: 'institute_admin',
          submittedById: created.id,
          signals: signals as Prisma.InputJsonValue,
        },
      });

      return created;
    });

    this.logger.log(`Institute account pending review (${user.id})`);
    return this.auth.issueFor(user, userAgent);
  }

  /**
   * Completes the institute wizard: the academic structure, and the profile
   * fields the portal renders.
   *
   * Idempotent, and department reconciliation is by `code` rather than by
   * position — re-running the wizard after adding a department must not
   * re-create the existing ones, because faculty, students and teams already
   * point at them. A department that disappears from the submission is soft
   * deleted, never dropped, for the same reason.
   */
  async completeInstituteOnboarding(userId: string, dto: InstituteOnboardingDto): Promise<void> {
    const membership = await this.prisma.orgMembership.findFirst({
      where: { userId, org: { type: 'institution' } },
      select: { orgId: true },
    });
    if (!membership) {
      throw ProblemException.forbidden('This account is not attached to an institution.');
    }
    const orgId = membership.orgId;

    const codes = dto.departments.map((d) => d.code.toUpperCase());
    if (new Set(codes).size !== codes.length) {
      throw ProblemException.badRequest('Two departments share the same code.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.institutionProfile.update({
        where: { orgId },
        data: {
          focusAreas: dto.focusAreas,
          labs: dto.labs,
          emailDomains: dto.emailDomains,
          accreditation: dto.accreditation ?? undefined,
          officialEmail: dto.officialEmail ?? undefined,
          officialPhone: dto.officialPhone ?? undefined,
          onboardedAt: new Date(),
        },
      });

      if (dto.about) {
        await tx.organization.update({ where: { id: orgId }, data: { about: dto.about } });
      }

      const existing = await tx.instituteDepartment.findMany({
        where: { orgId },
        select: { id: true, code: true },
      });
      const byCode = new Map(existing.map((d) => [d.code, d]));

      for (const dept of dto.departments) {
        const code = dept.code.toUpperCase();
        const row = byCode.get(code)
          ? await tx.instituteDepartment.update({
              where: { id: byCode.get(code)!.id },
              data: { name: dept.name, deletedAt: null },
              select: { id: true },
            })
          : await tx.instituteDepartment.create({
              data: { orgId, name: dept.name, code },
              select: { id: true },
            });

        for (const program of dept.programs) {
          const clash = await tx.program.findFirst({
            where: { orgId, departmentId: row.id, name: program.name, deletedAt: null },
            select: { id: true },
          });
          if (clash) continue;
          await tx.program.create({
            data: {
              orgId,
              departmentId: row.id,
              name: program.name,
              level: program.level,
              durationYears: program.durationYears,
              intake: program.intake ?? null,
            },
          });
        }
      }

      // Departments the registrar removed. Soft deleted, because faculty,
      // students and teams still reference them.
      const dropped = existing.filter((d) => !codes.includes(d.code)).map((d) => d.id);
      if (dropped.length) {
        await tx.instituteDepartment.updateMany({
          where: { id: { in: dropped } },
          data: { deletedAt: new Date() },
        });
      }
    });
  }

  /* ============================================================ helpers === */

  /** Whether an email is free. Used by the live "email taken" check on signup. */
  async isEmailAvailable(email: string): Promise<boolean> {
    const row = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    return row === null;
  }

  private async assertEmailFree(email: string): Promise<void> {
    if (!(await this.isEmailAvailable(email))) {
      throw ProblemException.conflict('An account already exists for that email address.');
    }
  }

  private async assertPhoneFree(phone: string): Promise<void> {
    const row = await this.prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (row) {
      throw ProblemException.conflict('An account already exists for that phone number.');
    }
  }
}

/* ------------------------------------------------------------------------ */

const FREE_EMAIL = new Set([
  'gmail.com',
  'yahoo.com',
  'yahoo.in',
  'outlook.com',
  'hotmail.com',
  'rediffmail.com',
  'proton.me',
  'icloud.com',
]);

/**
 * How much a government email address proves on its own.
 *
 * `.gov.in` and `.nic.in` are issued by the state; `.org.in` or a free provider
 * proves nothing and simply means the reviewer has more to do.
 */
/**
 * How much an institution's email address proves on its own.
 *
 * `.ac.in` and `.edu` are issued through an accreditation process; a free
 * provider proves nothing and simply means the reviewer has more to do.
 */
function academicEmailClass(email: string): 'academic' | 'institutional' | 'free' | 'other' {
  const host = email.split('@')[1] ?? '';
  if (host.endsWith('.ac.in') || host.endsWith('.edu') || host.endsWith('.edu.in')) {
    return 'academic';
  }
  if (FREE_EMAIL.has(host)) return 'free';
  if (host.endsWith('.in') || host.endsWith('.org')) return 'institutional';
  return 'other';
}

function govEmailClass(email: string): 'official' | 'institutional' | 'free' | 'other' {
  const host = email.split('@')[1] ?? '';
  if (host.endsWith('.gov.in') || host.endsWith('.nic.in')) return 'official';
  if (FREE_EMAIL.has(host)) return 'free';
  if (host.endsWith('.in') || host.endsWith('.org')) return 'institutional';
  return 'other';
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/** "careers.nirvaha.co.in" → "nirvaha.co.in" is close enough for a signal. */
function baseDomain(host: string): string {
  const parts = host.split('.');
  return parts.length <= 2 ? host : parts.slice(-3).join('.');
}
