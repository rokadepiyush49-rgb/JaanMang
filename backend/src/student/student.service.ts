import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ProblemException } from '../common/errors/problem';
import { PrismaService } from '../prisma/prisma.service';
import { PUBLISHABLE_WHERE } from '../industry/visibility';
import { difficultyOf } from './recommendation/heuristic.recommender';
import {
  RECOMMENDATION_SERVICE,
  type RecommendationService,
} from './recommendation/recommendation.types';
import type { AuthPrincipal } from '../auth/auth.types';

/**
 * The student workspace.
 *
 * Thirteen screens rendered from a 982-line fixture file, down to a literal
 * `badge: 3` on the notifications nav item. Everything here is the same data
 * the institute and the government are looking at, seen from the student's
 * side — deliberately, because the whole argument for a student surface is
 * that the work is real.
 *
 * Two rules carried over from the surfaces before it. Opportunities come from
 * `PUBLISHABLE_WHERE`: a student is not government staff, and an unvalidated
 * report is no more theirs to read than a partner's. And achievements are
 * earned from verified milestones, never asserted by the client — a workspace
 * where a student can award themselves a badge is a workspace whose badges
 * mean nothing.
 */
@Injectable()
export class StudentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(RECOMMENDATION_SERVICE) private readonly recommender: RecommendationService,
  ) {}

  /* ------------------------------------------------------------- profile */

  async profile(principal: AuthPrincipal) {
    const p = await this.prisma.studentProfile.findUnique({
      where: { userId: principal.userId },
      include: {
        user: { select: { displayName: true, email: true, photoUrl: true, locale: true } },
        org: { select: { id: true, name: true } },
        department: { select: { id: true, name: true, code: true } },
        program: { select: { id: true, name: true, level: true } },
      },
    });
    if (!p) {
      throw ProblemException.invalidState(
        'This account has no student profile yet. Finish onboarding first.',
      );
    }

    return {
      id: p.userId,
      name: p.user.displayName,
      email: p.user.email,
      photoUrl: p.user.photoUrl ?? undefined,
      locale: p.user.locale,
      institution: p.org
        ? { id: p.org.id, name: p.org.name }
        : { id: null, name: p.institutionName },
      degree: p.degree,
      branch: p.branch,
      currentYear: p.currentYear,
      graduationYear: p.graduationYear,
      department: p.department ?? undefined,
      program: p.program ?? undefined,
      state: p.state,
      district: p.district,
      skills: p.skills,
      interests: p.interests,
      preferredCategories: p.preferredCategories,
      preferredDistricts: p.preferredDistricts,
      sdgInterests: p.sdgInterests,
      weeklyHours: p.weeklyHours ?? undefined,
      verifiedContributions: p.verifiedContributions,
      /**
       * Whether the institution has confirmed this person is really enrolled.
       * Until it is set they are on the roster as *claimed*, and the institute
       * screen shows them in a queue rather than in the roll.
       */
      verified: p.verifiedAt !== null,
      links: {
        resume: p.resumeUrl ?? undefined,
        github: p.githubUrl ?? undefined,
        linkedin: p.linkedinUrl ?? undefined,
        portfolio: p.portfolioUrl ?? undefined,
      },
      onboardedAt: p.onboardedAt?.toISOString() ?? null,
    };
  }

  async updateProfile(principal: AuthPrincipal, patch: Record<string, unknown>) {
    const data: Prisma.StudentProfileUpdateInput = {};
    if (Array.isArray(patch.skills)) data.skills = patch.skills as string[];
    if (Array.isArray(patch.interests)) data.interests = patch.interests as string[];
    if (Array.isArray(patch.preferredCategories))
      data.preferredCategories =
        patch.preferredCategories as Prisma.StudentProfileUpdatepreferredCategoriesInput['set'];
    if (Array.isArray(patch.preferredDistricts))
      data.preferredDistricts = patch.preferredDistricts as string[];
    if (Array.isArray(patch.sdgInterests)) data.sdgInterests = patch.sdgInterests as number[];
    if (typeof patch.weeklyHours === 'number') data.weeklyHours = patch.weeklyHours;
    if (typeof patch.githubUrl === 'string') data.githubUrl = patch.githubUrl;
    if (typeof patch.linkedinUrl === 'string') data.linkedinUrl = patch.linkedinUrl;
    if (typeof patch.portfolioUrl === 'string') data.portfolioUrl = patch.portfolioUrl;
    if (typeof patch.resumeUrl === 'string') data.resumeUrl = patch.resumeUrl;

    // Note what is absent: branch, year, institution, department, verifiedAt.
    // A student may not edit the facts their institution asserted about them.
    await this.prisma.studentProfile.update({ where: { userId: principal.userId }, data });
    return this.profile(principal);
  }

  /* ------------------------------------------------------- opportunities */

  /**
   * Published problems a student can work on.
   *
   * Filtered to the student's own state by default, and carrying the
   * difficulty signal so a second-year has somewhere to start rather than a
   * list headed by the hardest problem in the district.
   */
  async opportunities(
    principal: AuthPrincipal,
    filters: { category?: string; difficulty?: string } = {},
  ) {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: principal.userId },
      select: { orgId: true, state: true },
    });

    const rows = await this.prisma.problem.findMany({
      where: {
        ...PUBLISHABLE_WHERE,
        status: { notIn: ['rejected', 'pending_validation', 'resolved'] },
        ...(filters.category ? { category: filters.category as never } : {}),
      },
      select: {
        id: true,
        title: true,
        category: true,
        severity: true,
        status: true,
        stage: true,
        affected: true,
        reportCount: true,
        voteCount: true,
        sdgGoals: true,
        estimatedCost: true,
        updatedAt: true,
        jurisdiction: { select: { name: true } },
        department: { select: { name: true } },
        villages: { select: { village: { select: { name: true } } } },
        challengeProfile: true,
        factors: { select: { populationImpact: true } },
        studentTeams: {
          select: { id: true, name: true, orgId: true, memberCount: true, status: true },
        },
        _count: { select: { studentTeams: true, solutionProposals: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const mapped = rows.map((p) => ({
      id: p.id,
      title: p.title,
      summary: p.challengeProfile?.summary ?? p.title,
      category: p.category,
      severity: p.severity,
      status: p.status,
      stage: p.stage,
      district: p.jurisdiction.name,
      villages: p.villages.map((v) => v.village.name),
      affected: p.affected,
      reportCount: p.reportCount,
      voteCount: p.voteCount,
      sdgs: p.sdgGoals,
      department: p.department?.name ?? undefined,
      estimatedCost: Number(p.estimatedCost),
      skills: p.challengeProfile?.technologies ?? [],
      capabilitiesNeeded: p.challengeProfile?.capabilitiesNeeded ?? [],
      timelineDays: p.challengeProfile?.timelineDays ?? 120,
      /** starter | intermediate | advanced — see `difficultyOf`. */
      difficulty: difficultyOf(p.severity, p.challengeProfile?.technologies.length ?? 0),
      priority: p.factors ? Math.round(p.factors.populationImpact) : 0,
      teamCount: p._count.studentTeams,
      proposalCount: p._count.solutionProposals,
      /** Whether a team from this student's own institution is already on it. */
      myInstitutionIsOn: p.studentTeams.some((t) => t.orgId === profile?.orgId),
      publishedAt: p.updatedAt.toISOString(),
    }));

    return filters.difficulty ? mapped.filter((m) => m.difficulty === filters.difficulty) : mapped;
  }

  /** Ranked suggestions, each with the reasons that produced it. */
  async recommendations(principal: AuthPrincipal, limit = 12) {
    const ranked = await this.recommender.recommend(principal.userId, limit);
    if (ranked.length === 0) return [];

    const problems = await this.prisma.problem.findMany({
      where: { id: { in: ranked.map((r) => r.problemId) } },
      select: {
        id: true,
        title: true,
        category: true,
        severity: true,
        affected: true,
        sdgGoals: true,
        jurisdiction: { select: { name: true } },
        challengeProfile: { select: { summary: true, technologies: true } },
      },
    });
    const byId = new Map(problems.map((p) => [p.id, p]));

    return ranked
      .map((r) => {
        const p = byId.get(r.problemId);
        if (!p) return null;
        return {
          problemId: r.problemId,
          score: r.score,
          reasons: r.reasons,
          title: p.title,
          summary: p.challengeProfile?.summary ?? p.title,
          category: p.category,
          severity: p.severity,
          district: p.jurisdiction.name,
          affected: p.affected,
          sdgs: p.sdgGoals,
          skills: p.challengeProfile?.technologies ?? [],
        };
      })
      .filter((r) => r !== null);
  }

  /* --------------------------------------------------------- applications */

  async applications(principal: AuthPrincipal) {
    const rows = await this.prisma.application.findMany({
      where: { studentId: principal.userId },
      include: {
        team: { select: { id: true, name: true, status: true, problemId: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const problemIds = rows.map((r) => r.challengeId).filter((id): id is string => Boolean(id));
    const problems = await this.prisma.problem.findMany({
      where: { id: { in: problemIds } },
      select: { id: true, title: true, category: true, status: true },
    });
    const byId = new Map(problems.map((p) => [p.id, p]));

    return rows.map((a) => ({
      id: a.id,
      challengeId: a.challengeId ?? undefined,
      challenge: a.challengeId ? byId.get(a.challengeId) : undefined,
      opportunityRef: a.opportunityRef ?? undefined,
      team: a.team ?? undefined,
      status: a.status,
      note: a.note ?? undefined,
      submittedAt: a.submittedAt?.toISOString() ?? null,
      decidedAt: a.decidedAt?.toISOString() ?? null,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  /**
   * Apply to an opportunity.
   *
   * Writes the same `Application` row the institute's submissions queue reads.
   * There is deliberately no second model: a student applying and an institute
   * reviewing are two views of one record, and a parallel table is how the two
   * screens end up disagreeing about who applied to what.
   */
  async apply(
    principal: AuthPrincipal,
    problemId: string,
    dto: { teamId?: string; note?: string },
  ) {
    const problem = await this.prisma.problem.findFirst({
      where: { ...PUBLISHABLE_WHERE, id: problemId },
      select: { id: true },
    });
    if (!problem) throw ProblemException.notFound('No such opportunity.');

    const existing = await this.prisma.application.findFirst({
      where: {
        studentId: principal.userId,
        challengeId: problemId,
        status: { notIn: ['withdrawn', 'rejected'] },
      },
    });
    if (existing) {
      throw ProblemException.invalidState('You have already applied to this opportunity.');
    }

    if (dto.teamId) {
      const member = await this.prisma.teamMember.findFirst({
        where: { teamId: dto.teamId, userId: principal.userId },
      });
      if (!member) {
        throw ProblemException.forbidden('You can only apply on behalf of a team you are in.');
      }
    }

    return this.prisma.application.create({
      data: {
        studentId: principal.userId,
        challengeId: problemId,
        teamId: dto.teamId ?? null,
        note: dto.note ?? null,
        status: 'submitted',
        submittedAt: new Date(),
      },
      select: { id: true, status: true, submittedAt: true },
    });
  }

  async withdraw(principal: AuthPrincipal, applicationId: string) {
    const application = await this.prisma.application.findFirst({
      where: { id: applicationId, studentId: principal.userId },
    });
    if (!application) throw ProblemException.notFound('No such application.');
    if (application.status === 'accepted') {
      throw ProblemException.invalidState(
        'This application was accepted. Talk to your institution rather than withdrawing it here.',
      );
    }

    return this.prisma.application.update({
      where: { id: applicationId },
      data: { status: 'withdrawn', decidedAt: new Date() },
      select: { id: true, status: true },
    });
  }

  /* ------------------------------------------------------------ projects */

  /** The student's view of the same rows the institute and government read. */
  async projects(principal: AuthPrincipal) {
    const teams = await this.prisma.teamMember.findMany({
      where: { userId: principal.userId },
      select: { teamId: true },
    });
    const teamIds = teams.map((t) => t.teamId);
    if (teamIds.length === 0) return [];

    const rows = await this.prisma.project.findMany({
      where: { teamId: { in: teamIds }, deletedAt: null },
      include: {
        problem: {
          select: { id: true, title: true, category: true, affected: true, sdgGoals: true },
        },
        team: { select: { id: true, name: true, memberCount: true } },
        milestones: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rows.map((p) => ({
      id: p.id,
      title: p.title,
      problem: p.problem ?? undefined,
      team: p.team ?? undefined,
      phase: p.phase,
      stage: p.stage,
      progress: p.progress,
      startedAt: p.startedAt?.toISOString() ?? null,
      dueAt: p.dueAt?.toISOString() ?? null,
      sdgs: p.problem?.sdgGoals ?? p.sdgGoals,
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
        reviewNote: m.reviewNote ?? undefined,
      })),
    }));
  }

  /* -------------------------------------------------------- achievements */

  /**
   * Points, badges and awards.
   *
   * All derived. `ImpactPointsEntry` is written when work is verified, badges
   * by the recognition rules, awards by a person. Nothing on this response can
   * be moved by anything the client sends, which is the only reason any of it
   * is worth showing.
   */
  async achievements(principal: AuthPrincipal) {
    const [points, achievements, badges, awards, profile] = await Promise.all([
      this.prisma.impactPointsEntry.findMany({
        where: { userId: principal.userId },
        orderBy: { at: 'desc' },
        take: 50,
      }),
      this.prisma.achievement.findMany({ where: { userId: principal.userId } }),
      this.prisma.badgeEarned.findMany({
        where: { userId: principal.userId },
        include: { badge: true },
        orderBy: { earnedAt: 'desc' },
      }),
      this.prisma.award.findMany({
        where: { subjectType: 'user', subjectId: principal.userId, revokedAt: null },
        orderBy: { grantedAt: 'desc' },
      }),
      this.prisma.studentProfile.findUnique({
        where: { userId: principal.userId },
        select: { verifiedContributions: true },
      }),
    ]);

    const rank = await this.prisma.leaderboardEntry.findFirst({
      where: { scope: 'students', subjectId: principal.userId },
      select: { rank: true, score: true, previousRank: true, breakdown: true },
    });

    return {
      totalPoints: points.reduce((s, p) => s + p.points, 0),
      verifiedContributions: profile?.verifiedContributions ?? 0,
      rank: rank ?? undefined,
      ledger: points.map((p) => ({
        id: p.id,
        source: p.source,
        points: p.points,
        at: p.at.toISOString(),
      })),
      achievements: achievements.map((a) => ({
        key: a.key,
        points: a.points,
        awardedAt: a.awardedAt.toISOString(),
      })),
      badges: badges.map((b) => ({
        key: b.badge.key,
        name: b.badge.name,
        description: b.badge.description,
        tier: b.badge.tier,
        icon: b.badge.icon ?? undefined,
        points: b.badge.points,
        evidence: b.evidence,
        earnedAt: b.earnedAt.toISOString(),
      })),
      awards: awards.map((a) => ({
        id: a.id,
        name: a.name,
        description: a.description ?? undefined,
        citation: a.citation ?? undefined,
        period: a.period ?? undefined,
        grantedAt: a.grantedAt.toISOString(),
      })),
    };
  }

  /* ------------------------------------------------------- notifications */

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

  async markNotificationRead(principal: AuthPrincipal, id: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId: principal.userId },
      data: { read: true },
    });
    if (result.count === 0) throw ProblemException.notFound('No such notification.');
    return { id, read: true };
  }
}
