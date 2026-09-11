"use client";

import { useSyncExternalStore } from "react";

/**
 * A clock React can render from.
 *
 * `Date.now()` in a render body is impure — two renders of the same state can
 * disagree. This subscribes to the passing of time instead, quantised to the
 * tick interval so the snapshot is stable between ticks, and returns 0 on the
 * server so nothing mismatches during hydration.
 */
export function useNow(intervalMs = 30_000) {
  return useSyncExternalStore(
    (onChange) => {
      const timer = setInterval(onChange, intervalMs);
      return () => clearInterval(timer);
    },
    () => Math.floor(Date.now() / intervalMs) * intervalMs,
    () => 0,
  );
}

/**
 * False during server rendering and the hydration pass, true afterwards.
 *
 * The government screens are full of text derived from the wall clock — "12h
 * remaining", "2h ago" — and the server and the browser never read that clock
 * at the same instant, so rendering it in both places is a guaranteed
 * hydration mismatch. This is the standard `useSyncExternalStore` hydration
 * flag: the server snapshot is false, the client snapshot is true, and React
 * re-renders once after hydrating.
 */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
