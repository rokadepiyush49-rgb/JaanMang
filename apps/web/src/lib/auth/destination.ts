import { PENDING_PATH, SURFACE_HOME, SURFACE_ONBOARDING, type Surface } from "./surface";

/**
 * Where a signed-in user belongs, right now.
 *
 * Three questions in order — is the account verified, has the wizard been
 * finished, which workspace is theirs — and the order is the point: an
 * unverified account must not be sent to a wizard it may never be allowed to
 * use, and an un-onboarded one must not be dropped on a dashboard with nothing
 * in it.
 *
 * Pure and dependency-free, so the root page, the session route and the
 * registration route all reach the same answer.
 */
export function destinationFor(
  user: { surface?: Surface; status?: string; onboarded?: boolean } | null,
): string {
  if (!user?.surface) return "/";
  if (user.status === "pending") return PENDING_PATH;
  if (!user.onboarded) return SURFACE_ONBOARDING[user.surface] ?? SURFACE_HOME[user.surface];
  return SURFACE_HOME[user.surface];
}
