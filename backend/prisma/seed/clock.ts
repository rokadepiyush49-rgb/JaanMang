/**
 * The fixed fixture clock, transcribed from apps/web/src/lib/gov/mock-data.ts.
 *
 * The web fixture pins "now" to `Date.now()` at module load and expresses every
 * timestamp relative to it, so SLA distances, audit trails and charts stay
 * coherent. The seed does the same, pinned once per run.
 */
export const NOW = new Date();

/** `hours` ago. */
export const h = (hours: number): Date => new Date(NOW.getTime() - hours * 36e5);
/** `hours` from now. */
export const ahead = (hours: number): Date => new Date(NOW.getTime() + hours * 36e5);
/** `days` ago. */
export const d = (days: number): Date => h(days * 24);
