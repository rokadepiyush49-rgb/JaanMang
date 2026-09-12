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
        facultyId: true,
        mentorRolesWanted: true,
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
      // `universityId` and `facultyId` are the ids the portal's own types use;
      // they name an organisation and a faculty member, neither of which is a
      // student, so they cross.
      universityId: t.org.id,
      facultyId: t.facultyId ?? '',
      institution: { id: t.org.id, name: t.org.name },
      mentorRolesWanted: t.mentorRolesWanted,
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
        createdAt: true,
        jurisdiction: { select: { name: true } },
        institution: {
          select: {
            institutionType: true,
            shortName: true,
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
      shortName: o.institution?.shortName ?? o.name,
      type: o.institution?.institutionType ?? 'university',
      accreditation: o.institution?.accreditation ?? '',
      city: o.institution?.city ?? o.jurisdiction?.name ?? '',
      state: o.institution?.state ?? 'Jharkhand',
      focusAreas: o.institution?.focusAreas ?? [],
      labs: o.institution?.labs ?? [],
      activeProjects: o._count.studentTeams,
      studentsEngaged: o._count.students,
      facultyCount: o._count.faculty,
      /**
       * Delivery record on this platform's own projects, not a brand ranking.
       * Zero until a project has been verified — an institution that has not
       * delivered here yet scores nothing rather than inheriting a reputation.
       */
      deliveryScore: 0,
      since: o.createdAt.toISOString(),
    }));
  }

  /* ------------------------------------------------------------ projects */

  /**
   * Projects this company is funding or mentoring.
   *
   * Scoped by involvement — a sponsorship this company approved, or a mentor
   * assignment one of its people holds. A partner who funded one project has no
   * standing in the delivery detail of another, and the government's own
   * project list is not theirs to read.
   */
  async projects(orgId: string) {
    const sponsor = await this.prisma.sponsor.findFirst({ where: { orgId } });
    const memberIds = await this.memberUserIds(orgId);

    const rows = await this.prisma.project.findMany({
      where: {
        deletedAt: null,
        OR: [
          ...(sponsor ? [{ problem: { sponsorship: { approvedSponsorId: sponsor.id } } }] : []),
          { mentorAssignments: { some: { mentorUserId: { in: memberIds } } } },
        ],
      },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            category: true,
            affected: true,
            sdgGoals: true,
            _count: { select: { clusters: true } },
            villages: { select: { villageId: true } },
            department: { select: { name: true } },
            jurisdiction: { select: { name: true } },
            challengeProfile: { select: { expectedOutcomes: true } },
            sponsorship: { select: { approvedSponsorId: true, approvedAmount: true } },
            funding: { select: { status: true, required: true, source: true } },
            // The public timeline, same redaction as everywhere else: officers
            // by office, citizens as a count.
            audit: { orderBy: { at: 'asc' }, take: 40 },
          },
        },
        team: {
          select: {
            id: true,
            name: true,
            facultyId: true,
            org: { select: { id: true, name: true } },
          },
        },
        milestones: { orderBy: { createdAt: 'asc' } },
        pilot: true,
        documents: { select: { id: true, kind: true, name: true, at: true, sharedWith: true } },
        mentorAssignments: { select: { mentorUserId: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((p) => ({
      id: p.id,
      challengeId: p.problemId ?? undefined,
      title: p.title,
      stage: p.stage ?? 'discovery',
      phase: p.phase,
      progress: p.progress,
      startedAt: p.startedAt?.toISOString() ?? null,
      expectedCompletion: p.dueAt?.toISOString() ?? null,
      investment: { committed: Number(p.budget), disbursed: Number(p.spent) },
      peopleImpacted: p.problem?.affected ?? 0,
      villages: p.problem?.villages.length ?? 0,
      clustersClosed: p.problem?._count.clusters ?? 0,
      sdgs: p.problem?.sdgGoals ?? p.sdgGoals,
      governmentBody:
        p.governmentBody ??
        [p.problem?.department?.name, p.problem?.jurisdiction?.name].filter(Boolean).join(', '),
      governmentRole: 'Validates the problem, countersigns the commitment and accepts the handover',
      universityId: p.team?.org.id ?? '',
      teamId: p.team?.id ?? '',
      facultyId: p.team?.facultyId ?? '',
      team: p.team ? { id: p.team.id, name: p.team.name, institution: p.team.org.name } : undefined,

      /** Everyone on the ledger for this problem, this company included. */
      coFunders: contributionsOf(p.problem, sponsor?.id),
      /**
       * What this company is actually providing. `fund` when the sponsorship is
       * theirs, `mentor` when one of their people is assigned. Derived rather
       * than declared, so it cannot claim a contribution nobody made.
       */
      providing: [
        ...(sponsor && p.problem?.sponsorship?.approvedSponsorId === sponsor.id ? ['fund'] : []),
        ...(p.mentorAssignments.some((a) => memberIds.includes(a.mentorUserId)) ? ['mentor'] : []),
      ],
      /** Targets from the challenge brief, with actuals still to be measured. */
      impact: Array.isArray(p.problem?.challengeProfile?.expectedOutcomes)
        ? (p.problem.challengeProfile.expectedOutcomes as Record<string, unknown>[]).map((o) => ({
            label: String(o.label ?? ''),
            value: 0,
            unit: 'target',
            method: String(o.method ?? ''),
          }))
        : [],
      audit: (p.problem?.audit ?? [])
        .filter((e) => e.actor !== 'Citizen')
        .map((e) => ({
          id: e.id,
          at: e.at.toISOString(),
          actor: e.actor,
          actorName: e.actor === 'Officer' ? 'District administration' : (e.actorName ?? undefined),
          action: e.action,
          detail: e.detail ?? undefined,
          automated: e.automated,
        })),
      milestones: p.milestones.map((m) => ({
        id: m.id,
        label: m.label,
        detail: m.detail ?? undefined,
        status: m.status,
        percent: m.percent,
        dueAt: m.dueAt?.toISOString() ?? null,
        completedAt: m.completedAt?.toISOString() ?? null,
        deliverables: m.deliverables,
        awaitingReview: m.awaitingReview,
        trancheAmount: m.trancheAmount ? Number(m.trancheAmount) : null,
      })),
      pilot: p.pilot
        ? {
            location: p.pilot.location,
            villages: p.pilot.villages,
          }
        : undefined,
      // Titles and kinds only. A partner sees that a handover certificate
      // exists; the file itself is served through the storage module in stage
      // 06, which checks involvement again on the way out.
      documents: p.documents.map((d) => ({
        id: d.id,
        kind: d.kind,
        name: d.name,
        at: d.at.toISOString(),
      })),
    }));
  }

  /* -------------------------------------------------------------- impact */

  /**
   * The company's own impact, computed from delivered work.
   *
   * Every figure here is a sum over rows a government officer also sees. None
   * of it is self-reported: a partner cannot tell this platform how many people
   * they helped, which is the only reason the number is worth printing.
   */
  async impact(orgId: string) {
    const sponsor = await this.prisma.sponsor.findFirst({ where: { orgId } });
    const projects = await this.projects(orgId);
    const delivered = projects.filter((p) => p.phase === 'completed');

    const sdgTotals = new Map<number, number>();
    for (const p of projects) {
      for (const sdg of p.sdgs) {
        sdgTotals.set(sdg, (sdgTotals.get(sdg) ?? 0) + p.peopleImpacted);
      }
    }

    /** Investment and reach by month of project start, oldest first. */
    const byMonth = new Map<string, { investment: number; peopleImpacted: number }>();
    for (const p of projects) {
      if (!p.startedAt) continue;
      const month = p.startedAt.slice(0, 7);
      const row = byMonth.get(month) ?? { investment: 0, peopleImpacted: 0 };
      row.investment += p.investment.committed;
      row.peopleImpacted += p.peopleImpacted;
      byMonth.set(month, row);
    }

    const leaderboard = await this.prisma.leaderboardEntry.findMany({
      where: { scope: 'partners' },
      orderBy: { rank: 'asc' },
      take: 20,
    });

    return {
      totals: {
        projects: projects.length,
        delivered: delivered.length,
        committed: projects.reduce((s, p) => s + p.investment.committed, 0),
        disbursed: projects.reduce((s, p) => s + p.investment.disbursed, 0),
        peopleImpacted: projects.reduce((s, p) => s + p.peopleImpacted, 0),
        villages: projects.reduce((s, p) => s + p.villages, 0),
        clustersClosed: projects.reduce((s, p) => s + p.clustersClosed, 0),
      },
      monthly: [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, row]) => ({ month, ...row })),
      sdgs: [...sdgTotals.entries()]
        .sort(([a], [b]) => a - b)
        .map(([number, peopleImpacted]) => ({ number, peopleImpacted })),
      leaderboard: leaderboard.map((e) => ({
        rank: e.rank,
        // The screen renders movement, so an entry with no previous ranking
        // reports its current one rather than a null the arrow maths breaks on.
        previousRank: e.previousRank ?? e.rank,
        companyId: e.subjectId,
        company: e.displayName,
        sector: sectorOf(e.breakdown),
        score: e.score,
        factors: factorsOf(e.breakdown),
        /** Whether this row is the signed-in partner, resolved server-side. */
        isSelf: e.subjectId === sponsor?.id || e.subjectId === orgId,
      })),
      /**
       * The weighting, published beside the ranking. A leaderboard whose
       * formula is not printed is a leaderboard nobody can argue with, which
       * is the same as one nobody trusts.
       */
      leaderboardFormula: [
        { label: 'People reached per rupee and per project', weight: 25 },
        { label: 'Problem clusters actually closed', weight: 20 },
        { label: 'Deployments handed over to a public body', weight: 20 },
        { label: 'Employee mentor hours given', weight: 20 },
        { label: 'Citizen satisfaction after handover', weight: 15 },
      ],
    };
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

/**
 * The stored breakdown, turned into the rows the screen prints beside a rank.
 *
 * A leaderboard that shows a score and not its components is a leaderboard
 * nobody can argue with, which is the same as one nobody trusts — so whatever
 * the recognition cron recorded is rendered, rather than a fixed list of
 * factors that might not be the ones it actually used.
 */
function factorsOf(breakdown: unknown): { label: string; value: string; points: number }[] {
  if (!breakdown || typeof breakdown !== 'object') return [];
  return Object.entries(breakdown as Record<string, unknown>)
    .filter(([key]) => key !== 'sector')
    .map(([key, value]) => ({
      label: humanise(key),
      value: value === null ? '—' : String(value),
      points: typeof value === 'number' ? value : 0,
    }));
}

function sectorOf(breakdown: unknown): string {
  if (breakdown && typeof breakdown === 'object') {
    const sector = (breakdown as Record<string, unknown>).sector;
    if (typeof sector === 'string') return sector;
  }
  return '';
}

/** `avgDeliveryRating` → `Avg delivery rating`. */
function humanise(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** The funding ledger for a problem, in the partner-facing shape. */
function contributionsOf(
  problem:
    | {
        id: string;
        sponsorship: { approvedSponsorId: string | null; approvedAmount: unknown } | null;
        funding: { status: string; required: unknown; source: string | null } | null;
      }
    | null
    | undefined,
  ownSponsorId: string | undefined,
) {
  if (!problem) return [];
  const rows: Record<string, unknown>[] = [];

  if (problem.sponsorship?.approvedSponsorId && problem.sponsorship.approvedAmount) {
    rows.push({
      id: `${problem.id}-sponsor`,
      party: problem.sponsorship.approvedSponsorId,
      kind: 'industry',
      amount: Number(problem.sponsorship.approvedAmount),
      status: 'committed',
      isSelf: problem.sponsorship.approvedSponsorId === ownSponsorId,
    });
  }
  if (problem.funding?.status === 'approved') {
    rows.push({
      id: `${problem.id}-gov`,
      party: problem.funding.source ?? 'Government of Jharkhand',
      kind: 'government',
      amount: Number(problem.funding.required),
      status: 'committed',
    });
  }
  return rows;
}

function currentFinancialYear(date = new Date()): string {
  const year = date.getFullYear();
  const start = date.getMonth() >= 3 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export type { Prisma };
