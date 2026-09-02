/**
 * The scored dimensions, and the order they are rendered in.
 *
 * Split out of `verdict.ts` because that file is server-only — it holds the
 * prompt and the Groq call — while the schema builder and the page both need
 * the list. Display names are *not* here: they live in the i18n dictionary, so
 * a Hindi reader sees Hindi labels for the same English dimension keys.
 *
 * Keep this file free of server-only imports.
 */

import type { ScoreDimension } from "@/lib/council/types";

/** Order is the order the verdict page renders them in. */
export const DIMENSIONS: ScoreDimension[] = [
  "practicality",
  "socialImpact",
  "technicalFeasibility",
  "financialViability",
  "novelty",
];
