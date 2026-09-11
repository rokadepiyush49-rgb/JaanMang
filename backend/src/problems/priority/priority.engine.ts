/**
 * The priority engine — "need ≠ votes".
 *
 * Ported verbatim from apps/web/src/lib/gov/priority.ts. The whole engine is
 * deterministic and explainable: every score decomposes into `factor × weight`
 * contributions plus a short list of named adjustments. AI is used earlier in
 * the pipeline (understanding a report, classifying it, judging duplicates); it
 * never sets a rank.
 *
 * A parity test (test/unit/problems/priority.spec.ts) checks this produces the
 * same numbers the web fixtures were reviewed against.
 */

export const FACTOR_KEYS = [
  'populationImpact',
  'severity',
  'deprivation',
  'coverage',
  'duration',
  'recurrence',
  'repeatedDemand',
] as const;

export type PriorityFactorKey = (typeof FACTOR_KEYS)[number];
export type PriorityFactors = Record<PriorityFactorKey, number>;
export type PriorityWeights = Record<PriorityFactorKey, number>;

export const FACTOR_LABEL: Record<PriorityFactorKey, string> = {
  populationImpact: 'Population Impact',
  severity: 'Severity',
  deprivation: 'Deprivation',
  coverage: 'Coverage',
  duration: 'Duration',
  recurrence: 'Recurrence',
  repeatedDemand: 'Repeated Demand',
};

/** The state's published default weighting. Sums to 100. */
export const DEFAULT_WEIGHTS: PriorityWeights = {
  populationImpact: 30,
  severity: 20,
  deprivation: 20,
  coverage: 10,
  duration: 10,
  recurrence: 5,
  repeatedDemand: 5,
};

export interface PriorityAdjustment {
  label: string;
  points: number;
  reason: string;
}

export interface Contribution {
  key: PriorityFactorKey;
  label: string;
  factor: number;
  weight: number;
  points: number;
}

export function totalWeight(weights: PriorityWeights): number {
  return FACTOR_KEYS.reduce((sum, key) => sum + weights[key], 0);
}

/** Weighted contribution of each factor, largest first. */
export function contributions(factors: PriorityFactors, weights: PriorityWeights): Contribution[] {
  const total = totalWeight(weights);
  return FACTOR_KEYS.map((key) => ({
    key,
    label: FACTOR_LABEL[key],
    factor: factors[key],
    weight: total === 0 ? 0 : (weights[key] / total) * 100,
    points: total === 0 ? 0 : (factors[key] * weights[key]) / total,
  })).sort((a, b) => b.points - a.points);
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * The weighted sum plus each named, bounded adjustment. Clamped to 0–100 and
 * rounded, exactly as the web engine does.
 */
export function scoreOf(
  factors: PriorityFactors,
  adjustments: PriorityAdjustment[],
  weights: PriorityWeights,
): number {
  const base = contributions(factors, weights).reduce((sum, c) => sum + c.points, 0);
  const adjusted = adjustments.reduce((sum, a) => sum + a.points, base);
  return clamp(Math.round(adjusted));
}

export interface RankableProblem {
  id: string;
  affected: number;
  factors: PriorityFactors;
  adjustments: PriorityAdjustment[];
}

export interface Ranked<T> {
  problem: T;
  score: number;
  rank: number;
  previousRank?: number;
}

/**
 * Rank problems under `weights`. When `baseline` (the published weighting) is
 * given, each problem's rank under it is carried as `previousRank` so the
 * simulator can show movement rather than a re-sorted list.
 *
 * Tie-break: higher `affected` first — identical to the web engine.
 */
export function rankProblems<T extends RankableProblem>(
  problems: T[],
  weights: PriorityWeights,
  baseline?: PriorityWeights,
): Ranked<T>[] {
  const baselineRank = baseline
    ? new Map(
        [...problems]
          .sort(
            (a, b) =>
              scoreOf(b.factors, b.adjustments, baseline) -
              scoreOf(a.factors, a.adjustments, baseline),
          )
          .map((p, i) => [p.id, i + 1] as const),
      )
    : undefined;

  return [...problems]
    .map((problem) => ({
      problem,
      score: scoreOf(problem.factors, problem.adjustments, weights),
    }))
    .sort((a, b) => b.score - a.score || b.problem.affected - a.problem.affected)
    .map((row, i) => ({
      ...row,
      rank: i + 1,
      previousRank: baselineRank?.get(row.problem.id),
    }));
}

/** Normalise a set of weights back to 100 without losing their proportions. */
export function normaliseWeights(weights: PriorityWeights): PriorityWeights {
  const total = totalWeight(weights);
  if (total === 0) return { ...DEFAULT_WEIGHTS };
  return Object.fromEntries(
    FACTOR_KEYS.map((key) => [key, (weights[key] / total) * 100]),
  ) as PriorityWeights;
}

export function isPriorityWeights(v: unknown): v is PriorityWeights {
  return (
    typeof v === 'object' &&
    v !== null &&
    FACTOR_KEYS.every((k) => typeof (v as Record<string, unknown>)[k] === 'number')
  );
}
