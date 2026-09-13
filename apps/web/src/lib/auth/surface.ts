/**
 * Where each audience lives.
 *
 * This module is the single answer to "which workspace does this person belong
 * in", and it is deliberately dependency-free so the edge middleware, the
 * server layouts and the client can all agree without any of them importing
 * the others.
 *
 * The surface itself is decided by the *server* — it comes back on
 * `/auth/me` as the surface of the user's highest-ranked role. Nothing here
 * derives authority from a URL or from client state; it only maps a surface the
 * server already vouched for onto the routes that belong to it.
 */

export type Surface = "citizen" | "student" | "gov" | "industry" | "institute" | "admin";

export const SURFACE_HOME: Record<Surface, string> = {
  citizen: "/dashboard",
  student: "/dashboard",
  gov: "/gov",
  industry: "/industry",
  institute: "/institute",
  admin: "/gov",
};

export const SURFACE_LABEL: Record<Surface, string> = {
  citizen: "Citizen",
  student: "Student",
  gov: "Government",
  industry: "Industry",
  institute: "Institute",
  admin: "Administrator",
};

/** Route prefixes that belong to the student workspace. */
const STUDENT_ROUTES = [
  "/dashboard",
  "/profile",
  "/opportunities",
  "/projects",
  "/applications",
  "/problem-explorer",
  "/achievements",
  "/notifications",
  "/settings",
  "/impact-hub",
  "/industry-hub",
  "/council",
  "/collaborate",
];

/** Which surface owns a path, or null when the path is public. */
export function surfaceOf(pathname: string): Surface | null {
  if (pathname === "/gov" || pathname.startsWith("/gov/")) return "gov";
  if (pathname === "/industry" || pathname.startsWith("/industry/")) return "industry";
  if (pathname === "/institute" || pathname.startsWith("/institute/")) return "institute";
  if (STUDENT_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    return "student";
  }
  /*
   * A citizen's own reports and verification queue need a session but belong to
   * no workspace surface — a citizen holds `citizen`, and a student who filed a
   * report holds `student`. `citizen` is returned so the proxy sends an
   * anonymous visitor to sign in; the page itself checks nothing beyond having
   * a session, because standing is decided per problem by who reported it.
   */
  if (pathname === "/report/mine" || pathname === "/report/verify") return "citizen";
  return null;
}

/**
 * Whether a user holding `surface` may open a page owned by `target`.
 *
 * An administrator reaches everything — they review the accounts on every
 * surface and cannot do that from outside. Faculty reach the student workspace
 * because that is where their teams are, and a student never reaches the
 * institute one: the institute workspace carries the whole roster, and a
 * student being able to open it would hand them every classmate's record.
 * Everyone else is confined to their own, which is what stops a signed-in
 * student from loading the government chrome and discovering what it contains.
 */
export function canAccess(surface: Surface, target: Surface): boolean {
  if (surface === "admin") return true;
  if (surface === target) return true;
  if (surface === "institute" && target === "student") return true;
  if (surface === "citizen" && target === "student") return true;
  return false;
}

export const SIGN_IN_PATH = "/signin";
export const PENDING_PATH = "/pending";

/** Where an onboarding wizard lives, when a surface has one. */
export const SURFACE_ONBOARDING: Partial<Record<Surface, string>> = {
  student: "/onboarding/student",
  industry: "/onboarding/industry",
  institute: "/onboarding/institute",
};
