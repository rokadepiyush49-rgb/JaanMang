/**
 * The contract between the student surface and whatever is doing the scoring.
 *
 * One interface, two implementations, and the seam is placed here rather than
 * anywhere else for a specific reason: everything upstream of it — the profile
 * columns, the opportunity list, the reasons on screen — is finished and does
 * not change when a model arrives. Plugging in the skill-map model is an
 * adapter file and an environment variable, not a re-fit of the student
 * workspace.
 */

/** Exactly what a model is given. Documented because it is the contract. */
export interface StudentFeatures {
  studentId: string;
  /** Declared skills, lower-cased and de-duplicated. */
  skills: string[];
  branch: string;
  /** 1–5. A second-year and a final-year want different things. */
  currentYear: number;
  graduationYear: number;
  /** The institution's own department id, when the institute has placed them. */
  departmentId: string | null;
  institutionId: string | null;
  district: string;
  state: string;
  /** Problem categories the student said they want to work on. Empty = all. */
  preferredCategories: string[];
  preferredDistricts: string[];
  sdgInterests: number[];
  /** Hours a week they say they can give. Null = unstated, never zero. */
  weeklyHours: number | null;
  /**
   * Contributions that reached a confirmed verification.
   *
   * The only track-record signal, and it is derived — a student cannot assert
   * it. A recommender that trusted self-reported experience would rank the
   * most confident student first, which is not the same as the most useful one.
   */
  verifiedContributions: number;
}

/** One candidate, as the recommender sees it. */
export interface OpportunityFeatures {
  problemId: string;
  title: string;
  category: string;
  severity: string;
  district: string;
  state: string;
  sdgGoals: number[];
  /** Skills the challenge brief asks for, when there is a brief. */
  technologies: string[];
  /** The government's published priority, 0–100. */
  priority: number;
  /** Roughly how hard this is to start on — see `difficultyOf`. */
  difficulty: 'starter' | 'intermediate' | 'advanced';
  /** Teams already working on it. A crowded problem is a weaker suggestion. */
  teamCount: number;
}

export interface Recommendation {
  problemId: string;
  /** 0–100. */
  score: number;
  /**
   * Why, in the student's own terms.
   *
   * Never empty. A recommendation without a reason is noise, and a student who
   * cannot see why something was suggested has no way to tell a good
   * suggestion from a random one — so the heuristic writes a sentence per
   * factor and the model adapter is required to return them too.
   */
  reasons: string[];
}

/**
 * The seam.
 *
 * `HeuristicRecommender` implements it today and is not a placeholder: it is
 * deterministic, explainable, and good enough that the surface is worth using
 * before any model exists. `ModelRecommender` implements it over HTTP when
 * RECOMMENDER_URL is set, and falls back to the heuristic when the model is
 * absent, slow or wrong. Nothing else in the codebase knows which one ran.
 */
export interface RecommendationService {
  recommend(studentId: string, limit?: number): Promise<Recommendation[]>;
}

export const RECOMMENDATION_SERVICE = Symbol('RecommendationService');
