import { describe, expect, it } from 'vitest';
import {
  DEFAULT_THRESHOLDS,
  citizenVotesFactor,
  computeFactors,
  findMatch,
  haversineM,
  similarity,
  tokenise,
  type MatchCandidate,
} from '../../../src/reports/clustering.math';

const NAGRI = { lat: 23.3812, lng: 85.2536 };

describe('clustering geometry', () => {
  it('measures a short distance to within a metre or two', () => {
    // ~0.001 degrees of latitude is about 111 m.
    const d = haversineM(NAGRI, { lat: NAGRI.lat + 0.001, lng: NAGRI.lng });
    expect(d).toBeGreaterThan(105);
    expect(d).toBeLessThan(117);
  });

  it('is zero for the same point', () => {
    expect(haversineM(NAGRI, NAGRI)).toBe(0);
  });
});

describe('tokenisation', () => {
  it('keeps Devanagari words whole', () => {
    // Vowel signs and the nukta are combining marks, not letters. A word
    // splitter built on [^\p{L}\p{N}] cut "पानी" into "प" and "न" and
    // dropped both for being too short, so every Devanagari report tokenised
    // to nothing and clustered with nothing.
    expect(tokenise('चापाकल सूखा है, पानी नहीं आ रहा')).toEqual(
      new Set(['चापाकल', 'सूखा', 'पानी']),
    );
    expect(tokenise('सड़क पर बड़ा गड्ढा')).toContain('सड़क');
  });

  it('drops stopwords and short words in every script the reports use', () => {
    expect(tokenise('The handpump has been dry for six days')).toEqual(
      new Set(['handpump', 'dry', 'six', 'days']),
    );
    // Hindi typed in Latin script: the filler words have to go, or they are
    // the most-shared tokens between any two reports.
    expect(tokenise('Chapakal sukha pada hai aur paani nahi aa raha')).toEqual(
      new Set(['chapakal', 'sukha', 'paani']),
    );
  });
});

describe('similarity', () => {
  it('is 1 for identical sets and 0 when either side is empty', () => {
    expect(similarity(new Set(['a', 'b']), new Set(['a', 'b']))).toBe(1);
    expect(similarity(new Set(), new Set(['a']))).toBe(0);
  });

  it('is the Jaccard overlap', () => {
    // {a,b,c} vs {b,c,d}: 2 shared of 4 distinct.
    expect(similarity(new Set(['a', 'b', 'c']), new Set(['b', 'c', 'd']))).toBeCloseTo(0.5);
  });
});

describe('findMatch — the bias is always to split', () => {
  const candidate: MatchCandidate = {
    problemId: 'P-1',
    category: 'water',
    ...NAGRI,
    tokens: tokenise('handpump near the school is dry no water for six days'),
  };
  const report = {
    category: 'water' as const,
    confidence: 0.8,
    ...NAGRI,
    tokens: tokenise('handpump by the school giving no water since six days'),
  };

  it('matches a confident, nearby, similarly-worded report', () => {
    const match = findMatch(report, [candidate]);
    expect(match?.problemId).toBe('P-1');
    expect(match?.reason).toContain('shared wording');
  });

  it('refuses to guess when the classifier was unsure', () => {
    expect(findMatch({ ...report, confidence: 0.3 }, [candidate])).toBeNull();
  });

  it('refuses across categories, however similar the words', () => {
    expect(findMatch({ ...report, category: 'drainage' }, [candidate])).toBeNull();
  });

  it('refuses beyond the radius', () => {
    // ~5 km north.
    const far = { ...report, lat: NAGRI.lat + 0.045 };
    expect(haversineM(far, candidate)).toBeGreaterThan(DEFAULT_THRESHOLDS.radiusM);
    expect(findMatch(far, [candidate])).toBeNull();
  });

  it('refuses when the wording has nothing in common', () => {
    const unrelated = { ...report, tokens: tokenise('tanker delivery timings changed again') };
    expect(findMatch(unrelated, [candidate])).toBeNull();
  });

  it('picks the most similar candidate when several qualify', () => {
    const weaker: MatchCandidate = {
      ...candidate,
      problemId: 'P-2',
      tokens: tokenise('water supply interrupted somewhere in the panchayat'),
    };
    expect(findMatch(report, [weaker, candidate])?.problemId).toBe('P-1');
  });
});

describe('need factors', () => {
  const base = {
    severity: 'high' as const,
    villages: [{ population: 1000, deprivation: 0.6 }],
    jurisdictionPopulation: 10_000,
    jurisdictionVillageCount: 10,
    firstReportedAt: new Date('2026-01-01T00:00:00Z'),
    now: new Date('2026-01-31T00:00:00Z'),
    priorOccurrences: 0,
    reportCount: 1,
    voteCount: 0,
  };

  it('reads population impact from the register, not from who complained', () => {
    const quiet = computeFactors({ ...base, reportCount: 1 });
    const loud = computeFactors({ ...base, reportCount: 100 });
    // A hundred reports and one report describe the same 1,000 people.
    expect(quiet.populationImpact).toBe(10);
    expect(loud.populationImpact).toBe(10);
  });

  it('weights deprivation by population, so one large village cannot dilute it', () => {
    const mixed = computeFactors({
      ...base,
      villages: [
        { population: 900, deprivation: 0.2 },
        { population: 100, deprivation: 0.9 },
      ],
    });
    // (900*0.2 + 100*0.9) / 1000 = 0.27
    expect(mixed.deprivation).toBe(27);
  });

  it('saturates report volume, so the 110th report is worth nothing', () => {
    const f = (reportCount: number) => computeFactors({ ...base, reportCount }).repeatedDemand;

    // Monotonic and bounded: more reports never score less, and the scale runs
    // out at a hundred.
    expect(f(0)).toBeLessThan(f(1));
    expect(f(1)).toBeLessThan(f(10));
    expect(f(10)).toBeLessThan(f(100));
    expect(f(100)).toBe(100);

    // The property the curve exists for: going from one report to ten moves
    // the factor a long way, and going from a hundred to a hundred and ten
    // moves it not at all.
    expect(f(10) - f(1)).toBeGreaterThan(20);
    expect(f(110) - f(100)).toBe(0);
  });

  it('caps everything at 100 however extreme the input', () => {
    const maxed = computeFactors({
      ...base,
      villages: [{ population: 99_999, deprivation: 1 }],
      jurisdictionPopulation: 100,
      jurisdictionVillageCount: 1,
      priorOccurrences: 50,
      reportCount: 10_000,
      voteCount: 10_000,
      firstReportedAt: new Date('2020-01-01T00:00:00Z'),
    });
    for (const [key, value] of Object.entries(maxed)) {
      expect(value, key).toBeLessThanOrEqual(100);
      expect(value, key).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('the vote factor', () => {
  it('registers a single vote rather than rounding it away', () => {
    // The bug this pins: a linear scale against 10% turnout gave 0 here, and a
    // factor that reads 0 until the 34th vote is not measuring anything.
    expect(citizenVotesFactor(1, 3400)).toBeGreaterThan(10);
  });

  it('normalises against the affected population', () => {
    // Thirty votes from a hamlet outrank a hundred from a town.
    expect(citizenVotesFactor(30, 300)).toBeGreaterThan(citizenVotesFactor(100, 50_000));
  });

  it('does not let a tiny population be maxed out by one vote', () => {
    // The floor of ten votes: two people in a hamlet of twelve is a signal,
    // not unanimity.
    expect(citizenVotesFactor(2, 12)).toBeLessThan(60);
  });

  it('is monotonic and capped', () => {
    expect(citizenVotesFactor(0, 1000)).toBe(0);
    expect(citizenVotesFactor(5, 1000)).toBeLessThan(citizenVotesFactor(50, 1000));
    expect(citizenVotesFactor(1_000_000, 1000)).toBe(100);
  });
});
