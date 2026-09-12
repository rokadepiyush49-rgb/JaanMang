import { Injectable } from '@nestjs/common';
import { ProblemException } from '../common/errors/problem';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLISHABLE_WHERE } from '../industry/visibility';
import type { AuthPrincipal } from '../auth/auth.types';

/**
 * Open innovation and hackathons — the two ways a student starts something
 * rather than answering something.
 *
 * A `SolutionProposal` is the inverse of an `Application`: an Application
 * answers a brief somebody else wrote, a proposal writes the brief. Both end in
 * the same place, a team working on a problem, which is why a proposal carries
 * an optional teamId rather than inventing a second team model.
 */
@Injectable()
export class StudentCollabService {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------------------------------------------- teams */

  async myTeams(principal: AuthPrincipal) {
    const rows = await this.prisma.studentTeam.findMany({
      where: { members: { some: { userId: principal.userId } }, deletedAt: null },
      include: {
        org: { select: { id: true, name: true } },
        problem: { select: { id: true, title: true, category: true } },
        faculty: { select: { designation: true, user: { select: { displayName: true } } } },
        members: { select: { firstName: true, year: true, discipline: true, userId: true } },
        projects: { select: { id: true, title: true, phase: true, progress: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((t) => ({
      id: t.id,
      name: t.name,
      institution: t.org.name,
      status: t.status,
      stage: t.stage,
      skills: t.skills,
      memberCount: t.memberCount,
      problem: t.problem ?? undefined,
      guide: t.faculty
        ? { name: t.faculty.user.displayName, designation: t.faculty.designation }
        : undefined,
      members: t.members.map((m) => ({
        firstName: m.firstName,
        year: m.year,
        discipline: m.discipline,
        isMe: m.userId === principal.userId,
      })),
      projects: t.projects,
      mentorRolesWanted: t.mentorRolesWanted,
    }));
  }

  /* --------------------------------------------------------- proposals */

  async proposals(principal: AuthPrincipal) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: principal.userId },
      select: { orgId: true },
    });
    if (!profile?.orgId) return [];

    const rows = await this.prisma.solutionProposal.findMany({
      where: { orgId: profile.orgId, deletedAt: null },
      include: {
        problem: { select: { id: true, title: true, category: true } },
        team: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((p) => ({
      id: p.id,
      problem: p.problem,
      team: p.team ?? undefined,
      title: p.title,
      summary: p.summary,
      approach: p.approach,
      estimatedCost: Number(p.estimatedCost),
      durationDays: p.durationDays ?? undefined,
      needs: p.needs,
      status: p.status,
      submittedAt: p.submittedAt?.toISOString() ?? null,
      reviewedAt: p.reviewedAt?.toISOString() ?? null,
      /** Why it was accepted or refused. Shown to the proposing institution. */
      decisionNote: p.decisionNote ?? undefined,
    }));
  }

  async propose(
    principal: AuthPrincipal,
    dto: {
      problemId: string;
      title: string;
      summary: string;
      approach: string;
      estimatedCost?: number;
      durationDays?: number;
      needs?: string[];
      teamId?: string;
    },
  ) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: principal.userId },
      select: { orgId: true },
    });
    if (!profile?.orgId) {
      throw ProblemException.invalidState(
        'A proposal is made by an institution. Your account is not attached to one yet.',
      );
    }

    const problem = await this.prisma.problem.findFirst({
      where: { ...PUBLISHABLE_WHERE, id: dto.problemId },
      select: { id: true },
    });
    if (!problem) throw ProblemException.notFound('No such problem.');

    if (dto.teamId) {
      const member = await this.prisma.teamMember.findFirst({
        where: { teamId: dto.teamId, userId: principal.userId },
      });
      if (!member) {
        throw ProblemException.forbidden('You can only propose on behalf of a team you are in.');
      }
    }

    return this.prisma.solutionProposal.create({
      data: {
        problemId: dto.problemId,
        orgId: profile.orgId,
        teamId: dto.teamId ?? null,
        title: dto.title,
        summary: dto.summary,
        approach: dto.approach,
        estimatedCost: dto.estimatedCost ?? 0,
        durationDays: dto.durationDays ?? null,
        needs: dto.needs ?? [],
        // Submitted, not draft: a proposal nobody can see is not a proposal.
        // The institution's own review is the `under_review` step after this.
        status: 'submitted',
        submittedById: principal.userId,
        submittedAt: new Date(),
      },
      select: { id: true, status: true, submittedAt: true },
    });
  }

  /* -------------------------------------------------------- hackathons */

  async hackathons(principal: AuthPrincipal) {
    const myTeams = await this.prisma.teamMember.findMany({
      where: { userId: principal.userId },
      select: { teamId: true },
    });
    const myTeamIds = new Set(myTeams.map((t) => t.teamId));

    const rows = await this.prisma.hackathon.findMany({
      where: { deletedAt: null, status: { not: 'draft' } },
      include: {
        hostOrg: { select: { id: true, name: true } },
        problems: {
          select: { track: true, problem: { select: { id: true, title: true, category: true } } },
        },
        teams: {
          select: {
            teamId: true,
            finalRank: true,
            score: true,
            withdrawnAt: true,
            team: { select: { name: true } },
          },
        },
      },
      orderBy: { startsAt: 'desc' },
    });

    return rows.map((h) => ({
      id: h.id,
      code: h.code,
      title: h.title,
      about: h.about ?? undefined,
      host: h.hostOrg?.name ?? undefined,
      status: h.status,
      mode: h.mode ?? undefined,
      venue: h.venue ?? undefined,
      registrationClosesAt: h.registrationClosesAt?.toISOString() ?? null,
      startsAt: h.startsAt.toISOString(),
      endsAt: h.endsAt.toISOString(),
      prizePool: Number(h.prizePool),
      maxTeamSize: h.maxTeamSize ?? undefined,
      problems: h.problems.map((p) => ({ ...p.problem, track: p.track ?? undefined })),
      teamCount: h.teams.filter((t) => !t.withdrawnAt).length,
      /** Where this student's own teams stand in it. */
      myEntries: h.teams
        .filter((t) => myTeamIds.has(t.teamId))
        .map((t) => ({
          teamId: t.teamId,
          teamName: t.team.name,
          finalRank: t.finalRank ?? undefined,
          score: t.score ?? undefined,
          withdrawn: t.withdrawnAt !== null,
        })),
    }));
  }

  /** Enter one of your teams into an open hackathon. */
  async enterHackathon(principal: AuthPrincipal, hackathonId: string, teamId: string) {
    const member = await this.prisma.teamMember.findFirst({
      where: { teamId, userId: principal.userId },
    });
    if (!member) throw ProblemException.forbidden('You are not in that team.');

    const hackathon = await this.prisma.hackathon.findFirst({
      where: { id: hackathonId, deletedAt: null },
      select: { id: true, status: true, registrationClosesAt: true },
    });
    if (!hackathon) throw ProblemException.notFound('No such hackathon.');
    if (hackathon.status !== 'registration_open') {
      throw ProblemException.invalidState(`Registration is ${hackathon.status.replace('_', ' ')}.`);
    }
    if (hackathon.registrationClosesAt && hackathon.registrationClosesAt < new Date()) {
      throw ProblemException.invalidState('Registration has closed.');
    }

    await this.prisma.hackathonTeam.upsert({
      where: { hackathonId_teamId: { hackathonId, teamId } },
      // Re-entering after withdrawing is allowed; it clears the withdrawal
      // rather than creating a second row.
      update: { withdrawnAt: null },
      create: { hackathonId, teamId },
    });

    return { hackathonId, teamId, registered: true };
  }
}
