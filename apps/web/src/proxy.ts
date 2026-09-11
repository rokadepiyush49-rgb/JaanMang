/**
 * The edge guard.
 *
 * This is the *optimistic* half of authentication, and deliberately only that.
 * It can see whether a session cookie exists; it cannot see whose it is, and it
 * must not try — the Next.js docs are explicit that proxy is not the place for
 * session management, and a database read at the edge on every navigation is
 * how a fast app becomes a slow one.
 *
 * So the split is:
 *
 *   here          — no cookie on a protected route → send to /signin
 *                   a cookie on /signin or /signup → send to the app
 *   the layouts   — is this *particular* user allowed on *this* surface,
 *                   verified, and past their onboarding wizard
 *
 * Before this existed, `/gov/*` was guarded only after render: the layout
 * mounted, the store fetched, a 401 came back and the browser was redirected —
 * so an unauthenticated visitor saw the government chrome first. The student
 * and industry surfaces were not guarded at all.
 */
import { NextRequest, NextResponse } from "next/server";
import { surfaceOf } from "@/lib/auth/surface";

/** Routes that exist only for someone who is signed out. */
const SIGNED_OUT_ONLY = ["/signin", "/signup", "/gov-login"];

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const signedIn = request.cookies.has("js_at");

  // `/gov-login` predates the shared sign-in page and is kept as a permanent
  // entry point, because it is in READMEs, demo scripts and muscle memory.
  if (pathname === "/gov-login") {
    const url = new URL("/signin", request.url);
    const next = request.nextUrl.searchParams.get("next");
    url.searchParams.set("next", next?.startsWith("/gov") ? next : "/gov");
    return NextResponse.redirect(url);
  }

  if (SIGNED_OUT_ONLY.some((r) => pathname === r || pathname.startsWith(`${r}/`))) {
    // Where a signed-in visitor actually belongs is a question only the server
    // can answer, so bounce them to `/` and let the root resolve it.
    return signedIn ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (surfaceOf(pathname) !== null && !signedIn) {
    const url = new URL("/signin", request.url);
    if (pathname !== "/dashboard") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Every authenticated destination, plus the signed-out-only pages.
   *
   * Listed explicitly rather than as a negative match on `/api` and static
   * assets: an allow-list that has to be extended when a route group is added
   * is safer than a deny-list that silently stops covering one.
   */
  matcher: [
    "/signin",
    "/signup",
    "/signup/:path*",
    "/gov-login",
    "/gov",
    "/gov/:path*",
    "/industry",
    "/industry/:path*",
    "/institute",
    "/institute/:path*",
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
    "/council/:path*",
    "/collaborate/:path*",
    "/onboarding/:path*",
    "/pending",
  ],
};
