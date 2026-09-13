import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PUBLISHABLE_WHERE } from '../../industry/visibility';
import type {
  OpportunityFeatures,
  Recommendation,
  RecommendationService,
  StudentFeatures,
} from './recommendation.types';

/**
 * Weighted factors, summing to 100.
 *
 * Skill overlap dominates, because the thing a student can actually contribute
 * is the thing they know how to do. Everything else is about whether they can
 * realistically get to it and whether it is the right size for where they are.
 */
export const WEIGHTS = {
  skills: 35,
  category: 20,
  geography: 15,
  difficulty: 15,
  sdg: 8,
  need: 7,
} as const;

/**
 * The deterministic recommender.
 *
 * Not a stub standing in for the model. It is what the product runs today, what
 * every test runs, and what runs the moment the model is unreachable — so it
 * has to be genuinely useful on its own, and every score it produces decomposes
 * into sentences a student can disagree with.
 *
 * The one judgement worth pointing at is `difficulty`. A recommender that
 * ranked purely on fit would send every first-year at the hardest problem in
 * the district, because that is where the need is highest. Matching difficulty
 * to year is what stops the list being demoralising.
 */
@Injectable()
export class HeuristicRecommender implements RecommendationService {
  constructor(private readonly prisma: PrismaService) {}

  async recommend(studentId: string, limit = 12): Promise<Recommendation[]> {
    const student = await this.features(studentId);
    const opportunities = await this.opportunities();

    return opportunities
      .map((o) => score(student, o))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /** The feature vector, exactly as a model would receive it. */
  async features(studentId: string): Promise<StudentFeatures> {
    const profile = await this.prisma.studentProfile.findUniqueOrThrow({
      where: { userId: studentId },
    });

    return {
      studentId,
      skills: profile.skills.map((s) => s.toLowerCase()),
      branch: profile.branch,
      currentYear: profile.currentYear,
      graduationYear: profile.graduationYear,
      departmentId: profile.departmentId,
      institutionId: profile.orgId,
      district: profile.district,
      state: profile.state,
      preferredCategories: profile.preferredCategories,
      preferredDistricts: profile.preferredDistricts,
      sdgInterests: profile.sdgInterests,
      weeklyHours: profile.weeklyHours,
      verifiedContributions: profile.verifiedContributions,
    };
  }

  /**
   * Candidates.
   *
   * Reuses `PUBLISHABLE_WHERE` from the industry surface rather than writing a
   * second definition of "a problem outsiders may see". A student is not
   * government staff either, and an unvalidated report is no more theirs to
   * read than it is a partner's.
   */
  async opportunities(): Promise<OpportunityFeatures[]> {
    const rows = await this.prisma.problem.findMany({
      where: {
        ...PUBLISHABLE_WHERE,
        status: { notIn: ['rejected', 'pending_validation', 'resolved'] },
      },
      select: {
        id: true,
        title: true,
        category: true,
        severity: true,
        sdgGoals: true,
        jurisdiction: { select: { name: true } },
        challengeProfile: { select: { technologies: true } },
        factors: true,
        _count: { select: { studentTeams: true } },
      },
    });

    return rows.map((p) => ({
      problemId: p.id,
      title: p.title,
      category: p.category,
      severity: p.severity,
      district: p.jurisdiction.name,
      state: 'Jharkhand',
      sdgGoals: p.sdgGoals,
      technologies: p.challengeProfile?.technologies ?? [],
      priority: p.factors ? Math.round(p.factors.populationImpact) : 0,
      difficulty: difficultyOf(p.severity, p.challengeProfile?.technologies.length ?? 0),
      teamCount: p._count.studentTeams,
    }));
  }
}

/**
 * How hard this is to pick up.
 *
 * Crude on purpose: the number of distinct technologies a brief names, plus
 * severity as a proxy for consequence. A critical problem needing five
 * technologies is not where a second-year should start, whatever their skills
 * say — not because they could not contribute, but because a first project
 * that fails teaches the wrong lesson.
 */
export function difficultyOf(
  severity: string,
  technologyCount: number,
): 'starter' | 'intermediate' | 'advanced' {
  if (severity === 'critical' || technologyCount >= 5) return 'advanced';
  if (technologyCount >= 3 || severity === 'high') return 'intermediate';
  return 'starter';
}

/** What a student of this year should mostly be seeing. */
function difficultyFit(year: number, difficulty: string): number {
  const ladder = { starter: 1, intermediate: 2, advanced: 3 }[difficulty] ?? 2;
  const expected = year <= 2 ? 1 : year === 3 ? 2 : 3;
  const gap = Math.abs(ladder - expected);
  return gap === 0 ? 100 : gap === 1 ? 55 : 15;
}

export function score(student: StudentFeatures, o: OpportunityFeatures): Recommendation {
  const reasons: string[] = [];
  let total = 0;

  /* -- skills ------------------------------------------------------------ */
  const wanted = o.technologies.map((t) => t.toLowerCase());
  const shared = wanted.filter((t) => student.skills.some((s) => t.includes(s) || s.includes(t)));
  const skillScore = wanted.length === 0 ? 40 : Math.round((shared.length / wanted.length) * 100);
  total += (skillScore * WEIGHTS.skills) / 100;
  if (shared.length > 0) {
    reasons.push(
      `You already work with ${shared.slice(0, 3).join(', ')} — ${shared.length} of the ${wanted.length} skills this needs.`,
    );
  } else if (wanted.length === 0) {
    reasons.push('No specific technology named yet, so it is open to whatever you bring.');
  }

  /* -- category ---------------------------------------------------------- */
  const categoryScore =
    student.preferredCategories.length === 0
      ? 60
      : student.preferredCategories.includes(o.category)
        ? 100
        : 10;
  total += (categoryScore * WEIGHTS.category) / 100;
  if (categoryScore === 100) {
    reasons.push(`${o.category} is one of the areas you said you want to work in.`);
  }

  /* -- geography --------------------------------------------------------- */
  const nearby =
    student.preferredDistricts.length === 0 ||
    student.preferredDistricts.some((d) => o.district.includes(d)) ||
    o.district.includes(student.district);
  total += ((nearby ? 100 : 20) * WEIGHTS.geography) / 100;
  if (nearby && student.district) {
    reasons.push(`${o.district} is within reach of ${student.district}.`);
  }

  /* -- difficulty -------------------------------------------------------- */
  const fit = difficultyFit(student.currentYear, o.difficulty);
  total += (fit * WEIGHTS.difficulty) / 100;
  if (fit === 100) {
    reasons.push(
      o.difficulty === 'starter'
        ? 'A good first project — scoped so a year like yours can finish it.'
        : `Pitched at a ${student.currentYear === 3 ? 'third' : 'final'}-year level.`,
    );
  } else if (fit <= 55) {
    reasons.push(
      o.difficulty === 'advanced'
        ? 'Harder than most things at your year — worth joining a team on rather than leading.'
        : 'Below where you are, but a fast one to close.',
    );
  }

  /* -- SDG --------------------------------------------------------------- */
  const sdgShared = o.sdgGoals.filter((g) => student.sdgInterests.includes(g));
  total += ((sdgShared.length > 0 ? 100 : 30) * WEIGHTS.sdg) / 100;
  if (sdgShared.length > 0) reasons.push(`Contributes to SDG ${sdgShared.join(', ')}.`);

  /* -- need -------------------------------------------------------------- */
  total += (o.priority * WEIGHTS.need) / 100;
  if (o.priority >= 70) {
    reasons.push(
      `One of the district's highest-priority problems (${o.priority}/100 population impact).`,
    );
  }

  /* -- crowding ---------------------------------------------------------- */
  if (o.teamCount > 0) {
    reasons.push(
      `${o.teamCount} team${o.teamCount === 1 ? ' is' : 's are'} already on this — you would be joining, not starting.`,
    );
  }

  // Never returns an empty list: a recommendation without a reason is noise.
  if (reasons.length === 0) {
    reasons.push('A published problem in your district that nothing rules out.');
  }

  return {
    problemId: o.problemId,
    score: Math.round(Math.max(0, Math.min(100, total))),
    reasons,
  };
}
