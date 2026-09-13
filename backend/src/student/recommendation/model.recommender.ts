import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { HeuristicRecommender } from './heuristic.recommender';
import type { Recommendation, RecommendationService } from './recommendation.types';

/**
 * The seat reserved for the skill-map model.
 *
 * It POSTs the student's feature vector and the candidate list to
 * `RECOMMENDER_URL` and reads back scored problem ids. That is the whole
 * contract — documented in this folder's README, because it is the only thing
 * the model has to match.
 *
 * Three rules, and they are the reason this class exists rather than the call
 * being made inline:
 *
 *   - No URL configured: the heuristic runs. Not degraded mode; the default.
 *   - The call fails, times out, or answers with something unusable: the
 *     heuristic runs and the failure is logged. **A page load never fails
 *     because a model is down.** A student opening their workspace during an
 *     outage of somebody else's inference service should see a slightly worse
 *     ranking, not an error.
 *   - Anything the model returns without reasons is dropped, not shown. A
 *     recommendation a student cannot interrogate is one they will not act on,
 *     and the model does not get an exemption from that.
 */
@Injectable()
export class ModelRecommender implements RecommendationService {
  private readonly logger = new Logger('Recommender');

  constructor(
    private readonly config: AppConfigService,
    private readonly heuristic: HeuristicRecommender,
  ) {}

  async recommend(studentId: string, limit = 12): Promise<Recommendation[]> {
    const { url, configured, timeoutMs } = this.config.recommender;
    if (!configured || !url) return this.heuristic.recommend(studentId, limit);

    try {
      const [features, opportunities] = await Promise.all([
        this.heuristic.features(studentId),
        this.heuristic.opportunities(),
      ]);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(url, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ student: features, opportunities, limit }),
        });
        if (!res.ok) throw new Error(`model answered ${res.status}`);

        const parsed = this.parse(await res.json(), limit);
        if (parsed.length === 0) throw new Error('model returned nothing usable');
        return parsed;
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      this.logger.warn(`recommender unavailable, falling back to the heuristic: ${String(error)}`);
      return this.heuristic.recommend(studentId, limit);
    }
  }

  /**
   * Narrow the model's answer.
   *
   * Every row must carry a problem id, a score in range, and at least one
   * reason. A model that returns a bare ranking is not usable by this product,
   * and quietly rendering scores with no explanation would be worse than
   * falling back.
   */
  private parse(payload: unknown, limit: number): Recommendation[] {
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray((payload as { recommendations?: unknown })?.recommendations)
        ? (payload as { recommendations: unknown[] }).recommendations
        : [];

    return rows
      .map((row) => {
        if (!row || typeof row !== 'object') return null;
        const r = row as Record<string, unknown>;
        const problemId = typeof r.problemId === 'string' ? r.problemId : null;
        const score = typeof r.score === 'number' ? r.score : null;
        const reasons = Array.isArray(r.reasons)
          ? r.reasons.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          : [];
        if (!problemId || score === null || reasons.length === 0) return null;
        return { problemId, score: Math.round(Math.max(0, Math.min(100, score))), reasons };
      })
      .filter((r): r is Recommendation => r !== null)
      .slice(0, limit);
  }
}
