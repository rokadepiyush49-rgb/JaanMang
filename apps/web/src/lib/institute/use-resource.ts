"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/client";

/**
 * One loaded thing, with the three states every screen in this portal has to
 * render: loading, failed, and loaded-but-empty.
 *
 * The government and industry surfaces hold their whole world in a reducer
 * because they were built on fixtures and every screen reads the same store.
 * The institute portal reads a real API per screen, so a page-level resource is
 * the honest shape: it makes the loading and error states impossible to skip,
 * and `reload` is what every mutation calls when it finishes.
 *
 * Two details are deliberate. The loader is held in a ref and the effect keys
 * on a *serialised* dependency list, because the caller rebuilds its closure on
 * every render and keying on the function identity would refetch forever. And
 * `loading` is derived during render from whether the settled result matches
 * the request in flight, rather than set from inside the effect — so the last
 * good payload stays on screen through a reload instead of collapsing into a
 * skeleton every time a decision is taken.
 */
export type Resource<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
};

type Settled<T> = { stamp: string; data: T | null; error: string | null };

function message(e: unknown): string {
  return e instanceof ApiError ? e.message : "Could not load this. Try again.";
}

export function useResource<T>(load: () => Promise<T>, deps: unknown[] = []): Resource<T> {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  // The loader is a fresh closure on every render, so it is kept in a ref and
  // the fetch keys on the serialised dependency list instead. The ref is synced
  // in its own effect — writing it during render is what the rules forbid — and
  // that effect is declared first, so it has already run by the time the fetch
  // below reads it.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const key = JSON.stringify(deps);
  const stamp = `${key}#${nonce}`;

  useEffect(() => {
    let live = true;
    loadRef.current().then(
      (value) => {
        if (live) setSettled({ stamp, data: value, error: null });
      },
      (e: unknown) => {
        if (live) setSettled({ stamp, data: null, error: message(e) });
      },
    );
    return () => {
      live = false;
    };
  }, [stamp]);

  const fresh = settled?.stamp === stamp;

  return {
    // The previous payload is kept while a reload is in flight; `loading` is
    // what tells a caller it is not the answer to the current request yet.
    data: settled?.data ?? null,
    loading: !fresh,
    error: fresh ? settled.error : null,
    reload: useCallback(() => setNonce((n) => n + 1), []),
  };
}

/**
 * A mutation, with the busy flag and the error message a form needs.
 *
 * Deliberately not optimistic: an institute action changes another person's
 * record — a student's verification, a team's guide — and showing it as done
 * before the server agreed is how a registrar ends up believing they assigned
 * someone they did not.
 */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (fn: () => Promise<unknown>, onDone?: () => void): Promise<boolean> => {
      setBusy(true);
      setError(null);
      try {
        await fn();
        onDone?.();
        return true;
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "That did not work. Try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return { run, busy, error, clearError: useCallback(() => setError(null), []) };
}
