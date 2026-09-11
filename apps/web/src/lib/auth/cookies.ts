import "server-only";
import type { NextResponse } from "next/server";

/**
 * The session cookies.
 *
 * Tokens never reach the browser. The login handler puts them here, the proxy
 * reads them server-side and attaches the bearer, and the refresh rotation
 * rewrites them — so a compromised script on the page cannot read a token it
 * was never given.
 */
export const ACCESS_COOKIE = "js_at";
export const REFRESH_COOKIE = "js_rt";

const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

export function setAuthCookies(res: NextResponse, access: string, refresh: string): void {
  const common = {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  };
  res.cookies.set(ACCESS_COOKIE, access, { ...common, maxAge: ACCESS_MAX_AGE });
  res.cookies.set(REFRESH_COOKIE, refresh, { ...common, maxAge: REFRESH_MAX_AGE });
}

export function clearAuthCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
}
