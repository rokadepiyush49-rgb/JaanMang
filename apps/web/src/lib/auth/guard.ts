import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "./session";
import {
  PENDING_PATH,
  SIGN_IN_PATH,
  SURFACE_HOME,
  SURFACE_ONBOARDING,
  canAccess,
  type Surface,
} from "./surface";

/**
 * The authoritative gate. Every protected layout calls this first.
 *
 * The edge guard already turned away anyone with no cookie; this is what
 * decides whether the person holding that cookie belongs on *this* surface.
 * It has to live here rather than at the edge because the answer comes from
 * roles resolved in the database, and it has to run in the layout rather than
 * in the page so a screen cannot be reached by a route that forgot to check.
 *
 * Four refusals, in the order they matter:
 *
 *   no session          → sign in
 *   pending review      → the waiting room, never the workspace
 *   wrong surface       → their own home, not a 403; telling a student that
 *                         `/gov/funding` exists and is forbidden is itself a
 *                         disclosure
 *   wizard unfinished   → the wizard
 */
export async function requireSurface(
  target: Surface,
  options: { allowUnonboarded?: boolean } = {},
): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PATH);

  if (session.status === "pending") redirect(PENDING_PATH);

  if (!canAccess(session.surface, target)) redirect(SURFACE_HOME[session.surface]);

  if (!options.allowUnonboarded && !session.onboarded) {
    const wizard = SURFACE_ONBOARDING[session.surface];
    if (wizard) redirect(wizard);
  }

  return session;
}

/**
 * For pages that need a session but no particular surface — the waiting room
 * and the onboarding wizards, which a user must be able to reach precisely
 * *because* they are not yet allowed anywhere else.
 */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect(SIGN_IN_PATH);
  return session;
}
