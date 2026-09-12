import type { $Enums } from '@prisma/client';
import type { PriorityFactors } from '../problems/problem.types';

/**
 * The arithmetic behind clustering and the need factors, with no database and
 * no Nest in sight, so it can be tested as arithmetic.
 *
 * Every function here is deterministic. The AI pass earlier in the pipeline
 * decides what a report is *about*; nothing below asks it anything, because a
 * cluster boundary and a priority factor both have to be defensible to an
 * officer who disagrees with them.
 */

/** Metres between two coordinates. */
export function haversineM(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Words worth comparing. Devanagari and Latin, three characters or more,
 * minus the words that appear in every report and so distinguish nothing.
 */
/**
 * What separates one word from the next.
 *
 * `\p{M}` is there because Devanagari falls apart without it: the vowel signs
 * and the nukta are combining marks, not letters, so a class of
 * `[^\p{L}\p{N}]` treats them as separators and splits "पानी" into "प" and
 * "न" and "सड़क" into "सड" and "क". Every Devanagari term in the vocabulary
 * silently failed to match, and reports in the script half the district writes
 * in were classified as though they were blank.
 */
const WORD_SEPARATOR = /[^\p{L}\p{N}\p{M}]+/u;

// prettier-ignore
const STOPWORDS = new Set([
  // English
  'the', 'and', 'for', 'not', 'are', 'was', 'has', 'have', 'been', 'this', 'that', 'with',
  'from', 'our', 'out', 'all', 'any', 'but', 'can', 'her', 'his', 'its', 'now', 'get', 'got',
  'since', 'they', 'them', 'their', 'there', 'here', 'very', 'also', 'into', 'over', 'under',
  'please', 'sir', 'madam', 'kindly', 'problem', 'issue', 'village',
  // Devanagari
  'है', 'हैं', 'और', 'का', 'की', 'के', 'को', 'में', 'से', 'पर', 'नहीं', 'यह', 'वह', 'हो', 'रहा', 'रही',
  'कृपया', 'गांव', 'समस्या',
  // Hindi in Latin script, which is how most reports actually arrive. Without
  // these, 'hai', 'nahi' and 'wala' are among the most-shared tokens between
  // any two Hinglish reports and drown out the words that distinguish them.
  'hai', 'hain', 'nahi', 'nahin', 'raha', 'rahi', 'rahe', 'gaya', 'gayi', 'gaye', 'hua', 'hui',
  'wala', 'wali', 'paas', 'aur', 'kya', 'koi', 'bhi', 'sab', 'mein', 'yaha', 'yahan', 'abhi',
  'bahut', 'kripya', 'kripaya', 'humara', 'hamara', 'hamare', 'unka', 'iska', 'pada', 'padi',
  'kar', 'kare', 'karo', 'kiya', 'liye', 'sakta', 'gaon', 'samasya',
]);

export function tokenise(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .split(WORD_SEPARATOR)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  return new Set(words);
}

/** Jaccard overlap of two token sets, 0–1. Empty on either side is 0. */
export function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return shared / (a.size + b.size - shared);
}

export interface ClusterThresholds {
  /** Below this the report's classification is not trusted enough to merge. */
  confidenceMin: number;
  /** How far apart two reports of the same thing can be. */
  radiusM: number;
  /** Minimum token overlap to call two reports the same problem. */
  similarityMin: number;
}

export const DEFAULT_THRESHOLDS: ClusterThresholds = {
  confidenceMin: 0.55,
  radiusM: 2_000,
  similarityMin: 0.18,
};

export interface MatchCandidate {
  problemId: string;
  category: $Enums.ProblemCategory;
  lat: number;
  lng: number;
  tokens: Set<string>;
}

export interface IncomingReport {
  category: $Enums.ProblemCategory;
  confidence: number;
  lat: number;
  lng: number;
  tokens: Set<string>;
}

export interface MatchResult {
  problemId: string;
  distanceM: number;
  similarity: number;
  reason: string;
}

/**
 * The one place a report is decided to be somebody else's problem too.
 *
 * Three gates, all of which must pass: same category, inside the radius, and
 * enough shared vocabulary. A report that fails any of them — including one the
 * classifier was simply unsure about — becomes its own problem rather than
 * being guessed into a cluster.
 *
 * That default matters more than the accuracy of the matching. A wrongly split
 * problem is two rows an officer can merge in a second; a wrongly merged one
 * buries a citizen's report inside somebody else's, where nobody will ever look
 * for it again.
 */
export function findMatch(
  report: IncomingReport,
  candidates: MatchCandidate[],
  thresholds: ClusterThresholds = DEFAULT_THRESHOLDS,
): MatchResult | null {
  if (report.confidence < thresholds.confidenceMin) return null;

  let best: MatchResult | null = null;

  for (const candidate of candidates) {
    if (candidate.category !== report.category) continue;

    const distanceM = haversineM(report, candidate);
    if (distanceM > thresholds.radiusM) continue;

    const sim = similarity(report.tokens, candidate.tokens);
    if (sim < thresholds.similarityMin) continue;

    if (!best || sim > best.similarity) {
      best = {
        problemId: candidate.problemId,
        distanceM,
        similarity: sim,
        reason:
          `same category (${report.category}), ${Math.round(distanceM)} m away, ` +
          `${Math.round(sim * 100)}% shared wording`,
      };
    }
  }

  return best;
}

/* ------------------------------------------------------------- factors --- */

const SEVERITY_FACTOR: Record<$Enums.Severity, number> = {
  critical: 95,
  high: 78,
  medium: 55,
  low: 30,
};

export interface FactorInputs {
  severity: $Enums.Severity;
  /** Villages the problem touches, from the register. */
  villages: { population: number; deprivation: number }[];
  /** Population of the jurisdiction the problem sits in. */
  jurisdictionPopulation: number;
  /** How many villages that jurisdiction has in total. */
  jurisdictionVillageCount: number;
  /** Earliest credible report. */
  firstReportedAt: Date;
  now: Date;
  /** Resolved problems of the same category in the same villages, last 24 months. */
  priorOccurrences: number;
  reportCount: number;
  voteCount: number;
}

/**
 * The eight need signals, each 0–100.
 *
 * Six of them come from the village register and the clock, not from what
 * anybody said. That is the design: a ranking assembled from complaint volume
 * ranks the villages best at complaining, which are the ones already best
 * served. Reports and votes are the last two, and they carry five points of a
 * hundred between them.
 */
export function computeFactors(input: FactorInputs): PriorityFactors {
  const affectedPopulation = input.villages.reduce((n, v) => n + v.population, 0);

  const populationImpact = pct(
    input.jurisdictionPopulation > 0 ? affectedPopulation / input.jurisdictionPopulation : 0,
  );

  // Population-weighted, so one large well-served village cannot dilute the
  // deprivation of the small ones beside it.
  const deprivation =
    affectedPopulation > 0
      ? pct(
          input.villages.reduce((n, v) => n + v.deprivation * v.population, 0) / affectedPopulation,
        )
      : 0;

  const coverage = pct(
    input.jurisdictionVillageCount > 0 ? input.villages.length / input.jurisdictionVillageCount : 0,
  );

  // 90 days open is the top of the scale: past a quarter, longer is not more
  // urgent so much as more damning, and the duration factor should not be able
  // to carry a stale problem over a severe one on age alone.
  const openDays = Math.max(
    0,
    (input.now.getTime() - input.firstReportedAt.getTime()) / 86_400_000,
  );
  const duration = pct(openDays / 90);

  // Three returns in two years is a failed fix, and that is the top of the
  // scale — the signal saturates quickly because the fourth return tells an
  // officer nothing the third did not.
  const recurrence = pct(input.priorOccurrences / 3);

  // Log-scaled: the difference between 1 and 10 reports is real, between 100
  // and 110 is noise. 100 reports reaches the top of the scale.
  const repeatedDemand = pct(Math.log10(1 + input.reportCount) / Math.log10(101));

  const citizenVotes = citizenVotesFactor(input.voteCount, affectedPopulation);

  return {
    populationImpact,
    severity: SEVERITY_FACTOR[input.severity],
    deprivation,
    coverage,
    duration,
    recurrence,
    repeatedDemand,
    citizenVotes,
  };
}

/**
 * The vote factor: turnout, log-scaled and normalised against the affected
 * population, so a hundred votes from a town does not outrank thirty from a
 * hamlet.
 *
 * Two calibrations matter here, and both were wrong the first time.
 *
 * The target is 2% turnout with a floor of ten votes. A linear scale against
 * 10% turnout — the obvious first guess — needed 340 votes on a problem
 * affecting 3,400 people to reach the top, so a single vote rounded to zero and
 * the factor was dead weight on every problem of any size.
 *
 * And it is logarithmic, like `repeatedDemand`, for the same reason: the
 * difference between one vote and ten is real, between sixty and seventy is
 * noise. One vote on a village-sized problem lands around 16, which is the
 * intended shape — one resident agreeing is a signal, not a rounding error.
 *
 * Exported because `ClusteringService.recomputeVotes` updates this factor alone
 * when somebody votes, and two copies of this curve would drift apart.
 */
export function citizenVotesFactor(voteCount: number, affectedPopulation: number): number {
  const target = Math.max(10, affectedPopulation * 0.02);
  return pct(Math.log10(1 + voteCount) / Math.log10(1 + target));
}

/** A 0–1 ratio as a rounded 0–100 factor. */
function pct(ratio: number): number {
  return Math.round(Math.max(0, Math.min(1, ratio)) * 100);
}
