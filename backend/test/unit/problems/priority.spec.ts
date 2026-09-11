import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_WEIGHTS,
  contributions,
  rankProblems,
  scoreOf,
  totalWeight,
  type PriorityAdjustment,
  type PriorityFactors,
} from '../../../src/problems/priority/priority.engine';

const fixture = JSON.parse(
  readFileSync(resolve(__dirname, '../../../prisma/seed/fixtures/gov.json'), 'utf8'),
) as {
  problems: {
    id: string;
    affected: number;
    factors: PriorityFactors;
    adjustments: PriorityAdjustment[];
  }[];
};

describe('priority engine (parity with apps/web/src/lib/gov/priority.ts)', () => {
  it('DEFAULT_WEIGHTS sum to 100', () => {
    expect(totalWeight(DEFAULT_WEIGHTS)).toBe(100);
  });

  it('scoreOf is the weighted sum plus adjustments, clamped and rounded', () => {
    const factors: PriorityFactors = {
      populationImpact: 80,
      severity: 60,
      deprivation: 40,
      coverage: 20,
      duration: 10,
      recurrence: 0,
      repeatedDemand: 0,
    };
    // 80*.30 + 60*.20 + 40*.20 + 20*.10 + 10*.10 + 0 + 0 = 24+12+8+2+1 = 47
    expect(scoreOf(factors, [], DEFAULT_WEIGHTS)).toBe(47);
    expect(scoreOf(factors, [{ label: 'x', points: 6, reason: '' }], DEFAULT_WEIGHTS)).toBe(53);
  });

  it('clamps a runaway score to 100', () => {
    const maxed: PriorityFactors = {
      populationImpact: 100,
      severity: 100,
      deprivation: 100,
      coverage: 100,
      duration: 100,
      recurrence: 100,
      repeatedDemand: 100,
    };
    expect(scoreOf(maxed, [{ label: 'x', points: 50, reason: '' }], DEFAULT_WEIGHTS)).toBe(100);
  });

  it('contributions are ordered by points, largest first', () => {
    const c = contributions(fixture.problems[0].factors, DEFAULT_WEIGHTS);
    for (let i = 1; i < c.length; i++) {
      expect(c[i - 1].points).toBeGreaterThanOrEqual(c[i].points);
    }
  });

  it('ranks the water-supply cluster (P-1042) first under the published weighting', () => {
    // The fixture alert al-3 records "Priority changed: #4 → #1" for this problem.
    const ranked = rankProblems(fixture.problems, DEFAULT_WEIGHTS);
    expect(ranked[0].problem.id).toBe('P-1042');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[0].score).toBeGreaterThan(ranked[1].score - 1);
  });

  it('every seeded problem scores an integer in [0, 100]', () => {
    for (const p of fixture.problems) {
      const s = scoreOf(p.factors, p.adjustments, DEFAULT_WEIGHTS);
      expect(Number.isInteger(s)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it('carries previousRank when a baseline weighting is supplied', () => {
    const heavyDemand = { ...DEFAULT_WEIGHTS, repeatedDemand: 60, populationImpact: 5 };
    const ranked = rankProblems(fixture.problems, heavyDemand, DEFAULT_WEIGHTS);
    expect(ranked.every((r) => typeof r.previousRank === 'number')).toBe(true);
    // At least one problem moved when the weighting changed this much.
    expect(ranked.some((r) => r.rank !== r.previousRank)).toBe(true);
  });
});
