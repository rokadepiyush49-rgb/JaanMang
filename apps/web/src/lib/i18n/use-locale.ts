"use client";

/**
 * The reader's chosen language, remembered across visits.
 *
 * `localStorage` rather than `sessionStorage`: unlike a council session, a
 * language preference is about the person, not the sitting. Someone who reads
 * Hindi reads Hindi tomorrow too.
 *
 * ## Why this is a store and not a React context
 *
 * A context provider would have to live above every page that reads it and
 * would re-render the whole tree on every change — and the value still has to
 * come from `localStorage`, which does not exist during the server render. A
 * tiny external store with `useSyncExternalStore` handles both: the server
 * snapshot is the default locale, the client snapshot is the stored one, and
 * React reconciles them in a single pass instead of a cascading effect. It
 * also means a component deep in the tree can read the locale without anyone
 * threading a prop, and every subscriber updates together when it changes.
 */

import { useCallback, useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, toLocale, type Locale } from "@/lib/i18n/locale";

const KEY = "jansetu.locale";

/** Cached so `getSnapshot` returns a stable value — React compares by identity. */
let current: Locale | null = null;

const listeners = new Set<() => void>();

function read(): Locale {
  if (current !== null) return current;
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  try {
    current = toLocale(window.localStorage.getItem(KEY));
  } catch {
    // Private windows and blocked site data throw on access, not on read.
    current = DEFAULT_LOCALE;
  }
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  // Another tab changing the language should not leave this one stale — the
  // switcher is app-wide, and two tabs disagreeing about it looks like a bug.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== KEY) return;
    current = null;
    listener();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function setLocale(next: Locale) {
  if (read() === next) return;
  current = next;
  try {
    window.localStorage.setItem(KEY, next);
  } catch {
    // The choice still applies for this page; it just will not be remembered.
  }
  // `document.documentElement.lang` drives screen-reader pronunciation and
  // the browser's own font selection for Devanagari.
  if (typeof document !== "undefined") document.documentElement.lang = next;
  for (const listener of listeners) listener();
}

/**
 * Current locale, plus a setter.
 *
 * During the server render and hydration this is always `DEFAULT_LOCALE`;
 * the stored value arrives immediately after. Text therefore flips to Hindi
 * on the first client paint rather than being wrong in the HTML — which is
 * the right trade for a page with no SEO requirement and no server session
 * to read the preference from.
 */
export function useLocale(): [Locale, (next: Locale) => void] {
  const locale = useSyncExternalStore(subscribe, read, () => DEFAULT_LOCALE);
  const set = useCallback((next: Locale) => setLocale(next), []);
  return [locale, set];
}
