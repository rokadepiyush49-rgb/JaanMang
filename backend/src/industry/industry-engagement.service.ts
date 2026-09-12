import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProblemException } from '../common/errors/problem';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthPrincipal } from '../auth/auth.types';

/**
 * CSR position, commitments, mentorship, messaging and the talent view.
 *
 * The same rule as its sibling: nothing here returns a record as stored. In
 * particular the talent methods, which read student rows — the register holds
 * surnames, enrolment numbers, email addresses and marks, and a partner is
 * entitled to a first name, a year and a discipline. That is enough to hold a
 * design review and not enough to approach somebody off-platform, which is the
 * distinction the whole surface turns on.
 */
@Injectable()
export class IndustryEngagementService {
  constructor(private readonly prisma: PrismaService) {}

  /* ----------------------------------------------------------------- CSR */

  /**
   * The company's CSR position for a financial year.
   *
   * Reads the benefits attached to sponsorships this company actually approved.
   * The `committed` figure is the sum of those sponsorships, not of every
   * sponsorship on the platform — which is why the sponsor id is resolved from
   * the session's organisation rather than taken as a parameter.
   */
  async csrPosition(orgId: string, financialYear?: string) {
    const sponsor = await this.prisma.sponsor.findFirst({ where: { orgId } });
    const info = await this.prisma.industryProfile.findUnique({ where: { orgId } });
    const year = financialYear ?? info?.csrFinancialYear ?? currentFinancialYear();

    const benefits = sponsor
      ? await this.prisma.csrBenefit.findMany({
          where: {
            financialYear: year,
            sponsorship: { approvedSponsorId: sponsor.id },
          },
          include: {
            sponsorship: {
              select: {
                problemId: true,
                approvedAmount: true,
                problem: { select: { title: true, category: true, sdgGoals: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    const committed = benefits.reduce(
      (sum, b) => sum + Number(b.sponsorship.approvedAmount ?? 0),
      0,
    );
    const relief = benefits.reduce((sum, b) => sum + Number(b.estimatedRelief), 0);
    const allocated = Number(info?.csrAllocated ?? 0);

    return {
      financialYear: year,
      allocated,
      committed,
      remaining: Math.max(0, allocated - committed),
      estimatedRelief: relief,
      /** How many are through to a filed utilisation certificate. */
      certified: benefits.filter(
        (b) => b.documentation === 'certified' || b.documentation === 'filed',
      ).length,
      outstanding: benefits.filter(
        (b) => b.documentation !== 'certified' && b.documentation !== 'filed',
      ).length,
      benefits: benefits.map((b) => ({
        problemId: b.problemId,
        title: b.sponsorship.problem.title,
        category: b.sponsorship.problem.category,
        sdgs: b.sponsorship.problem.sdgGoals,
        amount: Number(b.sponsorship.approvedAmount ?? 0),
        qualifyingSection: b.qualifyingSection,
        scheduleViiItem: b.scheduleViiItem ?? undefined,
        estimatedRelief: Number(b.estimatedRelief),
        csrSpendBefore: Number(b.csrSpendBefore),
        csrSpendAfter: Number(b.csrSpendAfter),
        documentation: b.documentation,
        certificateNo: b.certificateNo ?? undefined,
        certifiedAt: b.certifiedAt?.toISOString() ?? null,
        note: b.note ?? undefined,
      })),
    };
  }

  /* --------------------------------------------------------- commitments */

  /**
   * Express interest in a challenge, or commit to it.
   *
   * Writes a `SponsorshipMatch` in the `interested` or `proposal` state — the
   * same row the government's sponsorship tab reads, so a partner's interest
   * appears in the officer's queue rather than in a parallel table nobody
   * looks at.
   *
   * What it does not do is approve anything. Acceptance is the government's
   * decision and lives in `SponsorshipService`; a partner offering money is an
   * offer, not a transaction.
   */
  async commit(
    orgId: string,
    problemId: string,
    dto: { amount?: number; note?: string; kind: 'interest' | 'proposal' },
  ) {
    const sponsor = await this.prisma.sponsor.findFirst({ where: { orgId } });
    if (!sponsor) {
      throw ProblemException.invalidState(
        'This company is not registered as a sponsor, so it cannot commit funding yet.',
      );
    }

    const problem = await this.prisma.problem.findFirst({
      where: {
        id: problemId,
        deletedAt: null,
        stage: {
          in: ['validated', 'prioritised', 'sponsorship', 'funded', 'assigned', 'implementation'],
        },
      },
      select: { id: true },
    });
    if (!problem) throw ProblemException.notFound('No such challenge.');

    const existing = await this.prisma.sponsorshipMatch.findUnique({
      where: { problemId_sponsorId: { problemId, sponsorId: sponsor.id } },
    });
    if (existing?.status === 'approved') {
      throw ProblemException.invalidState('This sponsorship has already been accepted.');
    }
    if (existing?.status === 'declined') {
      throw ProblemException.invalidState(
        'You declined this challenge. Ask the department to re-invite you if that has changed.',
      );
    }

    const updated = await this.prisma.sponsorshipMatch.upsert({
      where: { problemId_sponsorId: { problemId, sponsorId: sponsor.id } },
      update: {
        status: dto.kind === 'proposal' ? 'proposal' : 'interested',
        proposalAmount: dto.amount ?? undefined,
        note: dto.note ?? undefined,
        respondedAt: new Date(),
      },
      create: {
        problemId,
        sponsorId: sponsor.id,
        score: 0,
        reasons: ['Partner approached this challenge directly rather than being matched to it.'],
        status: dto.kind === 'proposal' ? 'proposal' : 'interested',
        proposalAmount: dto.amount ?? undefined,
        note: dto.note ?? undefined,
        respondedAt: new Date(),
      },
    });

    return {
      problemId,
      status: updated.status,
      proposalAmount: updated.proposalAmount ? Number(updated.proposalAmount) : null,
      note: updated.note ?? undefined,
      respondedAt: updated.respondedAt?.toISOString() ?? null,
      /**
       * The platform moves no money and every funding screen says so rather
       * than implying a rail exists behind the button.
       */
      paymentsEnabled: false,
    };
  }

  /** Every commitment this company has made. */
  async commitments(orgId: string) {
    const sponsor = await this.prisma.sponsor.findFirst({ where: { orgId } });
    if (!sponsor) return [];

    const rows = await this.prisma.sponsorshipMatch.findMany({
      where: { sponsorId: sponsor.id },
      include: { problem: { select: { title: true, category: true, status: true } } },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((m) => ({
      problemId: m.problemId,
      title: m.problem.title,
      category: m.problem.category,
      problemStatus: m.problem.status,
      status: m.status,
      score: m.score,
      reasons: m.reasons,
      proposalAmount: m.proposalAmount ? Number(m.proposalAmount) : null,
      note: m.note ?? undefined,
      respondedAt: m.respondedAt?.toISOString() ?? null,
    }));
  }

  /* ---------------------------------------------------------- mentorship */

  /** Teams asking for a mentor, with the student detail already narrowed. */
  async mentorshipRequests() {
    const rows = await this.prisma.mentorshipRequest.findMany({
      include: {
        team: {
          select: {
            id: true,
            name: true,
            skills: true,
            memberCount: true,
            org: { select: { id: true, name: true } },
          },
        },
        problem: { select: { id: true, title: true, category: true } },
        project: { select: { id: true, title: true, phase: true } },
        assignments: { select: { id: true } },
      },
      orderBy: { askedAt: 'desc' },
    });

    return rows.map((r) => ({
      id: r.id,
      team: {
        id: r.team.id,
        name: r.team.name,
        skills: r.team.skills,
        memberCount: r.team.memberCount,
        institution: r.team.org.name,
      },
      problem: r.problem ?? undefined,
      project: r.project ?? undefined,
      roles: r.roles,
      hoursPerMonth: r.hoursPerMonth,
      stage: r.stage,
      need: r.need,
      askedAt: r.askedAt.toISOString(),
      assigned: r.assignments.length > 0,
    }));
  }

  /** Mentor assignments this company's employees hold. */
  async mentorAssignments(orgId: string) {
    const memberIds = await this.memberUserIds(orgId);

    const rows = await this.prisma.mentorAssignment.findMany({
      where: { mentorUserId: { in: memberIds } },
      include: {
        team: { select: { id: true, name: true, org: { select: { name: true } } } },
        project: { select: { id: true, title: true, phase: true, progress: true } },
        sessions: { select: { id: true, at: true } },
      },
      orderBy: { since: 'desc' },
    });

    return rows.map((a) => ({
      id: a.id,
      requestId: a.requestId,
      mentorUserId: a.mentorUserId,
      team: { id: a.team.id, name: a.team.name, institution: a.team.org.name },
      project: a.project,
      roles: a.roles,
      since: a.since.toISOString(),
      sessionCount: a.sessions.length,
      lastSessionAt: a.sessions.at(-1)?.at.toISOString() ?? null,
    }));
  }

  /** Offer one of this company's people as a mentor. */
  async assignMentor(principal: AuthPrincipal, orgId: string, requestId: string, roles: string[]) {
    const request = await this.prisma.mentorshipRequest.findUnique({
      where: { id: requestId },
      select: { id: true, teamId: true, projectId: true },
    });
    if (!request) throw ProblemException.notFound('No such mentorship request.');
    if (!request.projectId) {
      throw ProblemException.invalidState(
        'This team has no project yet, so there is nothing to mentor against.',
      );
    }

    const memberIds = await this.memberUserIds(orgId);
    if (!memberIds.includes(principal.userId)) {
      throw ProblemException.forbidden('You are not a member of this company.');
    }

    return this.prisma.mentorAssignment.create({
      data: {
        requestId,
        mentorUserId: principal.userId,
        teamId: request.teamId,
        projectId: request.projectId,
        roles,
      },
      select: { id: true, requestId: true, teamId: true, projectId: true, roles: true },
    });
  }

  /* ------------------------------------------------------------ messages */

  /**
   * Threads this company participates in.
   *
   * Scoped by participation, not by project. A partner funding one project has
   * no standing in the conversation about another, and `projectId` in a URL is
   * not evidence of anything.
   */
  async threads(orgId: string, principal: AuthPrincipal) {
    const memberIds = await this.memberUserIds(orgId);

    const rows = await this.prisma.messageThread.findMany({
      where: { participants: { some: { userId: { in: memberIds } } } },
      include: {
        project: { select: { id: true, title: true } },
        participants: {
          select: { userId: true, role: true },
        },
        messages: { orderBy: { at: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const names = await this.displayNames(
      rows.flatMap((t) => [
        ...t.participants.map((p) => p.userId),
        ...t.messages.map((m) => m.authorId),
      ]),
    );

    return rows.map((t) => ({
      id: t.id,
      subject: t.subject,
      project: t.project,
      updatedAt: t.updatedAt.toISOString(),
      participants: t.participants.map((p) => ({
        userId: p.userId,
        role: p.role,
        name: names.get(p.userId) ?? 'Participant',
      })),
      messages: t.messages.map((m) => ({
        id: m.id,
        authorId: m.authorId,
        authorName: names.get(m.authorId) ?? 'Participant',
        mine: m.authorId === principal.userId,
        body: m.body,
        at: m.at.toISOString(),
      })),
    }));
  }

  async postMessage(orgId: string, principal: AuthPrincipal, threadId: string, body: string) {
    const memberIds = await this.memberUserIds(orgId);
    const participates = await this.prisma.threadParticipant.findFirst({
      where: { threadId, userId: { in: memberIds } },
    });
    if (!participates) throw ProblemException.notFound('No such thread.');

    const message = await this.prisma.message.create({
      data: { threadId, authorId: principal.userId, body },
      select: { id: true, threadId: true, body: true, at: true },
    });
    await this.prisma.messageThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });
    return { ...message, at: message.at.toISOString(), authorName: principal.displayName };
  }

  /* -------------------------------------------------------------- talent */

  /**
   * The talent view: teams and the people in them.
   *
   * First name, year and discipline. Never a surname, an email address, an
   * enrolment number or a phone number — those are in the same table and are
   * simply not selected. A partner who wants to reach a student does it through
   * the mentorship request and the project thread, which are on the record.
   */
  async talent(filters: { skill?: string; institution?: string } = {}) {
    const teams = await this.prisma.studentTeam.findMany({
      where: {
        deletedAt: null,
        status: { in: ['active', 'submitted', 'completed'] },
        ...(filters.institution ? { orgId: filters.institution } : {}),
        ...(filters.skill ? { skills: { has: filters.skill } } : {}),
      },
      select: {
        id: true,
        name: true,
        skills: true,
        stage: true,
        status: true,
        memberCount: true,
        org: { select: { id: true, name: true } },
        problem: { select: { id: true, title: true, category: true } },
        faculty: {
          select: {
            designation: true,
            expertise: true,
            user: { select: { displayName: true } },
          },
        },
        members: { select: { firstName: true, year: true, discipline: true } },
      },
      orderBy: { name: 'asc' },
    });

    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      institution: { id: t.org.id, name: t.org.name },
      skills: t.skills,
      stage: t.stage,
      status: t.status,
      memberCount: t.memberCount,
      problem: t.problem ?? undefined,
      guide: t.faculty
        ? {
            name: t.faculty.user.displayName,
            designation: t.faculty.designation,
            expertise: t.faculty.expertise,
          }
        : undefined,
      // First name, year, discipline. Nothing else exists on this shape.
      members: t.members.map((m) => ({
        firstName: m.firstName,
        year: m.year,
        discipline: m.discipline,
      })),
    }));
  }

  /** Institutions on the register, for the universities screen. */
  async universities() {
    const rows = await this.prisma.organization.findMany({
      where: { type: 'institution', deletedAt: null },
      select: {
        id: true,
        name: true,
        jurisdiction: { select: { name: true } },
        institution: {
          select: {
            institutionType: true,
            accreditation: true,
            city: true,
            state: true,
            focusAreas: true,
            labs: true,
          },
        },
        _count: { select: { studentTeams: true, students: true, faculty: true } },
      },
      orderBy: { name: 'asc' },
    });

    return rows.map((o) => ({
      id: o.id,
      name: o.name,
      type: o.institution?.institutionType ?? 'university',
      accreditation: o.institution?.accreditation ?? undefined,
      city: o.institution?.city ?? o.jurisdiction?.name ?? undefined,
      state: o.institution?.state ?? 'Jharkhand',
      focusAreas: o.institution?.focusAreas ?? [],
      labs: o.institution?.labs ?? [],
      teamCount: o._count.studentTeams,
      studentCount: o._count.students,
      facultyCount: o._count.faculty,
    }));
  }

  /* ------------------------------------------------- alerts & automation */

  async notifications(principal: AuthPrincipal) {
    const rows = await this.prisma.notification.findMany({
      where: { userId: principal.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((n) => ({
      id: n.id,
      kind: n.kind,
      title: n.title,
      detail: n.detail,
      actionLabel: n.actionLabel ?? undefined,
      actionHref: n.actionHref ?? undefined,
      at: n.createdAt.toISOString(),
      read: n.read,
    }));
  }

  /* --------------------------------------------------------------- utils */

  /** Users holding a role in this organisation. */
  private async memberUserIds(orgId: string): Promise<string[]> {
    const rows = await this.prisma.orgMembership.findMany({
      where: { orgId },
      select: { userId: true },
    });
    return rows.map((r) => r.userId);
  }

  private async displayNames(userIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(userIds)];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, displayName: true },
    });
    return new Map(users.map((u) => [u.id, u.displayName]));
  }
}

function currentFinancialYear(date = new Date()): string {
  const year = date.getFullYear();
  const start = date.getMonth() >= 3 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export type { Prisma };
