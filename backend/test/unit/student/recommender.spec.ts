import { describe, expect, it } from 'vitest';
import {
  WEIGHTS,
  difficultyOf,
  score,
} from '../../../src/student/recommendation/heuristic.recommender';
import type {
  OpportunityFeatures,
  StudentFeatures,
} from '../../../src/student/recommendation/recommendation.types';

const secondYear: StudentFeatures = {
  studentId: 'stu-sameer',
  skills: ['survey', 'gis'],
  branch: 'Civil Engineering',
  currentYear: 2,
  graduationYear: 2029,
  departmentId: 'dept-civ',
  institutionId: 'inst-bit-mesra',
  district: 'Ranchi',
  state: 'Jharkhand',
  preferredCategories: ['roads', 'drainage'],
  preferredDistricts: ['Ranchi'],
  sdgInterests: [9, 6],
  weeklyHours: 6,
  verifiedContributions: 0,
};

const finalYear: StudentFeatures = {
  ...secondYear,
  studentId: 'stu-rohit',
  currentYear: 4,
  skills: ['iot & telemetry', 'lorawan', 'ai/ml'],
  preferredCategories: ['water'],
};

const hardWaterProblem: OpportunityFeatures = {
  problemId: 'P-1042',
  title: 'Water supply interruption across three villages',
  category: 'water',
  severity: 'critical',
  district: 'Ranchi District',
  state: 'Jharkhand',
  sdgGoals: [6],
  technologies: ['IoT & Telemetry', 'LoRaWAN', 'Water Systems', 'Sensors', 'AI/ML'],
  priority: 96,
  difficulty: 'advanced',
  teamCount: 1,
};

const easyRoadProblem: OpportunityFeatures = {
  problemId: 'P-1035',
  title: 'Culvert collapse on Ormanjhi link road',
  category: 'roads',
  severity: 'medium',
  district: 'Ranchi District',
  state: 'Jharkhand',
  sdgGoals: [9],
  technologies: ['Survey'],
  priority: 60,
  difficulty: 'starter',
  teamCount: 0,
};

describe('difficulty', () => {
  it('reads severity and how many technologies the brief names', () => {
    expect(difficultyOf('critical', 1)).toBe('advanced');
    expect(difficultyOf('medium', 5)).toBe('advanced');
    expect(difficultyOf('high', 1)).toBe('intermediate');
    expect(difficultyOf('medium', 3)).toBe('intermediate');
    expect(difficultyOf('low', 1)).toBe('starter');
  });
});

describe('the heuristic is a real scorer, not a placeholder', () => {
  it('sends a second-year to the starter problem and a final-year to the hard one', () => {
    // The judgement the whole recommender exists for. Ranking purely on need
    // would send every first-year at the hardest problem in the district,
    // because that is where the need is highest.
    const secondYearEasy = score(secondYear, easyRoadProblem).score;
    const secondYearHard = score(secondYear, hardWaterProblem).score;
    expect(secondYearEasy).toBeGreaterThan(secondYearHard);

    const finalYearHard = score(finalYear, hardWaterProblem).score;
    expect(finalYearHard).toBeGreaterThan(score(finalYear, easyRoadProblem).score);
  });

  it('rewards skill overlap most heavily', () => {
    expect(WEIGHTS.skills).toBeGreaterThan(WEIGHTS.category);
    expect(WEIGHTS.skills).toBeGreaterThan(WEIGHTS.geography);

    const matched = score(finalYear, hardWaterProblem);
    const unskilled = score({ ...finalYear, skills: ['baking'] }, hardWaterProblem);
    expect(matched.score).toBeGreaterThan(unskilled.score);
  });

  it('weights sum to 100, so a score is a percentage of something', () => {
    expect(Object.values(WEIGHTS).reduce((s, w) => s + w, 0)).toBe(100);
  });

  it('always gives at least one reason', () => {
    // A recommendation without a reason is noise. Even the worst possible
    // match has to say something a student can disagree with.
    const nothingInCommon = score(
      {
        ...secondYear,
        skills: [],
        preferredCategories: ['health'],
        preferredDistricts: ['Bokaro'],
        sdgInterests: [],
      },
      hardWaterProblem,
    );
    expect(nothingInCommon.reasons.length).toBeGreaterThan(0);
    expect(nothingInCommon.reasons[0].length).toBeGreaterThan(10);
  });

  it('names the skills it matched on, not just that it matched', () => {
    const reasons = score(finalYear, hardWaterProblem).reasons.join(' ');
    expect(reasons.toLowerCase()).toContain('lorawan');
  });

  it('says when a problem is already crowded', () => {
    const crowded = score(finalYear, { ...hardWaterProblem, teamCount: 3 });
    expect(crowded.reasons.join(' ')).toContain('3 teams are already on this');
  });

  it('is deterministic', () => {
    expect(score(finalYear, hardWaterProblem)).toEqual(score(finalYear, hardWaterProblem));
  });

  it('stays inside 0–100 whatever the inputs', () => {
    const extreme = score(
      { ...finalYear, sdgInterests: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
      { ...hardWaterProblem, priority: 100, teamCount: 0, sdgGoals: [6, 9] },
    );
    expect(extreme.score).toBeGreaterThanOrEqual(0);
    expect(extreme.score).toBeLessThanOrEqual(100);
  });

  it('treats an empty preference list as "no preference", never as "none"', () => {
    const noPreference = score({ ...secondYear, preferredCategories: [] }, easyRoadProblem);
    const wrongPreference = score(
      { ...secondYear, preferredCategories: ['health'] },
      easyRoadProblem,
    );
    expect(noPreference.score).toBeGreaterThan(wrongPreference.score);
  });
});
