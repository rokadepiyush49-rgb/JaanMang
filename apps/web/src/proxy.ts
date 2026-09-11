/**
 * Route guard for the government workspace.
 *
 * `/gov/*` requires a session cookie; without one the request is redirected to
 * `/gov-login` (with `?next=` so the user lands back where they were headed).
 * The student `(app)` and industry surfaces are not touched — they still run on
 * fixtures.
 *
 * Next 16 renamed `middleware.ts` → `proxy.ts`; the semantics are unchanged.
 */
import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const signedIn = request.cookies.has("js_at");

  if (pathname === "/gov-login") {
    return signedIn
      ? NextResponse.redirect(new URL("/gov", request.url))
      : NextResponse.next();
  }

  // Only guard the workspace. A defensive check in case the matcher is bypassed.
  if (pathname === "/gov" || pathname.startsWith("/gov/")) {
    if (!signedIn) {
      const url = new URL("/gov-login", request.url);
      if (pathname !== "/gov") url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/gov", "/gov/:path*", "/gov-login"],
};
