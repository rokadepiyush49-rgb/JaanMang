/**
 * The priority engine — "need ≠ votes".
 *
 * A ranking built on complaint counts rewards the villages that are loudest,
 * which are usually the ones already best served. So what citizens say is only
 * one input among eight, and it enters through two deliberately small weights:
 * `repeatedDemand` (reports — "I have this problem") and `citizenVotes` ("I
 * agree this matters"). Together they are five points of a hundred.
 *
 * The two are kept apart because they disagree, and the disagreement is
 * information. The most-reported problem in the Ranchi register is a washed-out
 * approach road 122 households filed; the most-voted is a cracked bridge deck
 * only 18 thought to report and everyone who crosses the stream wants fixed.
 * Merged into one demand number, those two cases are indistinguishable.
 *
 * Mirrored by backend/src/problems/priority/priority.engine.ts. Change both.
 *
 * The whole engine is deterministic and explainable: every score decomposes
 * into `factor × weight` contributions plus a short list of named adjustments,
 * and the UI shows that decomposition rather than a number from nowhere. AI is
 * used earlier in the pipeline (understanding a report, classifying it, judging
 * duplicates); it never sets a rank.
 */

import type {
  PriorityAdjustment,
  PriorityFactorKey,
  PriorityFactors,
  PriorityWeights,
  Problem,
  RankedProblem,
} from "./types";

export const FACTOR_KEYS: PriorityFactorKey[] = [
  "populationImpact",
  "severity",
  "deprivation",
  "coverage",
  "duration",
  "recurrence",
  "repeatedDemand",
  "citizenVotes",
];

export const FACTOR_LABEL: Record<PriorityFactorKey, string> = {
  populationImpact: "Population Impact",
  severity: "Severity",
  deprivation: "Deprivation",
  coverage: "Coverage",
  duration: "Duration",
  recurrence: "Recurrence",
  repeatedDemand: "Repeated Demand",
  citizenVotes: "Citizen Votes",
};

export const FACTOR_HELP: Record<PriorityFactorKey, string> = {
  populationImpact:
    "Share of the jurisdiction's population inside the affected geography, from the village register — not the number of people who filed a report.",
  severity:
    "Consequence if nothing is done: risk to life and health first, then loss of access, then inconvenience.",
  deprivation:
    "SECC deprivation of the affected villages. Weighted up so that under-served habitations are not out-shouted by well-served ones.",
  coverage:
    "How much of the jurisdiction the problem spans — a fault across three villages outranks the same fault in one.",
  duration: "How long the problem has been open since the first credible report.",
  recurrence:
    "How often the same problem has returned at this location in 24 months. Recurrence signals a failed fix, not a new fault.",
  repeatedDemand:
    "Volume of citizen reports, normalised against the village's historic reporting rate.",
  citizenVotes:
    "Residents who voted the problem up without filing it themselves. Normalised against the affected population, so a hundred votes from a town does not outrank thirty from a hamlet.",
};

/**
 * The state's published default weighting. Sums to 100.
 *
 * Adding votes did not add weight: the demand budget was five points and stays
 * five points, now split three to reports and two to votes. Every other factor
 * is untouched, so population impact and SECC deprivation still carry fifty
 * between them.
 */
export const DEFAULT_WEIGHTS: PriorityWeights = {
  populationImpact: 30,
  severity: 20,
  deprivation: 20,
  coverage: 10,
  duration: 10,
  recurrence: 5,
  repeatedDemand: 3,
  citizenVotes: 2,
};

export type Contribution = {
  key: PriorityFactorKey;
  label: string;
  factor: number;
  weight: number;
  points: number;
};

/** Weighted contribution of each factor, largest first. */
export function contributions(
  factors: PriorityFactors,
  weights: PriorityWeights,
): Contribution[] {
  const total = totalWeight(weights);
  return FACTOR_KEYS.map((key) => ({
    key,
    label: FACTOR_LABEL[key],
    factor: factors[key],
    weight: total === 0 ? 0 : (weights[key] / total) * 100,
    points: total === 0 ? 0 : (factors[key] * weights[key]) / total,
  })).sort((a, b) => b.points - a.points);
}

export function totalWeight(weights: PriorityWeights) {
  return FACTOR_KEYS.reduce((sum, key) => sum + weights[key], 0);
}

/**
 * Named, bounded corrections applied after the weighted sum — each one is
 * shown to the officer with its reason, so the score stays auditable.
 */
export function scoreOf(problem: Problem, weights: PriorityWeights): number {
  const base = contributions(problem.factors, weights).reduce(
    (sum, c) => sum + c.points,
    0,
  );
  const adjusted = problem.adjustments.reduce((sum, a) => sum + a.points, base);
  return clamp(Math.round(adjusted));
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Rank a set of problems under a weighting. `baseline` — the ranking under the
 * published weights — is carried through as `previousRank` so the simulator can
 * show movement (#4 → #1) rather than just a re-sorted list.
 */
export function rankProblems(
  problems: Problem[],
  weights: PriorityWeights,
  baseline?: PriorityWeights,
): RankedProblem[] {
  const baselineRank = baseline
    ? new Map(
        [...problems]
          .sort((a, b) => scoreOf(b, baseline) - scoreOf(a, baseline))
          .map((p, i) => [p.id, i + 1] as const),
      )
    : undefined;

  return [...problems]
    .map((p) => ({ ...p, score: scoreOf(p, weights), rank: 0 }))
    .sort((a, b) => b.score - a.score || b.affected - a.affected)
    .map((p, i) => ({
      ...p,
      rank: i + 1,
      previousRank: baselineRank?.get(p.id),
    }));
}

/**
 * The sentence behind the "Why is this #1?" control: the two factors that put
 * the problem where it is, plus whatever adjustment moved it.
 */
export function explainRank(
  problem: Problem,
  weights: PriorityWeights,
): { headline: string; drivers: Contribution[]; adjustments: PriorityAdjustment[] } {
  const drivers = contributions(problem.factors, weights);
  const [first, second] = drivers;
  const headline = `${first.label.toLowerCase()} (${Math.round(first.points)} pts) and ${second.label.toLowerCase()} (${Math.round(second.points)} pts) account for ${Math.round(
    ((first.points + second.points) / Math.max(1, drivers.reduce((s, d) => s + d.points, 0))) * 100,
  )}% of this score`;
  return { headline, drivers, adjustments: problem.adjustments };
}

/** Normalise a set of weights back to 100 without losing their proportions. */
export function normaliseWeights(weights: PriorityWeights): PriorityWeights {
  const total = totalWeight(weights);
  if (total === 0) return { ...DEFAULT_WEIGHTS };
  const scaled = FACTOR_KEYS.map((key) => [key, (weights[key] / total) * 100] as const);
  return Object.fromEntries(scaled) as PriorityWeights;
}
