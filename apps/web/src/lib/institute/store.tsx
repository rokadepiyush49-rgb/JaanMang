"use client";

import { createContext, useContext } from "react";
import { InstituteApi } from "./service";
import { useResource, type Resource } from "./use-resource";
import type { Overview } from "./types";

/**
 * The one thing the whole workspace shares: the overview.
 *
 * The government and industry surfaces hold their entire domain in a reducer,
 * because both were built on fixtures that load at once. This portal reads a
 * real API, so each screen loads its own data and only the counts the *chrome*
 * needs — the submission badge, the roster badge — are hoisted here. Hoisting
 * more would mean every page waiting on a payload it does not read.
 *
 * `reload` is exported because a decision taken on the submissions screen has
 * to change the badge in the sidebar, and the alternative to a shared reload is
 * a stale number sitting next to the thing that disproves it.
 */
type InstituteContext = Resource<Overview>;

const Ctx = createContext<InstituteContext | null>(null);

export function InstituteProvider({ children }: { children: React.ReactNode }) {
  // Not memoised: `useResource` returns a fresh object whenever any of its
  // three fields change, and memoising on those fields would reproduce exactly
  // that object. The provider re-renders when the overview changes, which is
  // the point of it.
  const overview = useResource(() => InstituteApi.overview(), []);
  return <Ctx.Provider value={overview}>{children}</Ctx.Provider>;
}

export function useInstitute(): InstituteContext {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useInstitute must be used inside <InstituteProvider>");
  return ctx;
}
