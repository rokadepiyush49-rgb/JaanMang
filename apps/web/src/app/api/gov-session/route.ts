/**
 * Government workspace sign-in / sign-out.
 *
 *   POST   { email, password }  → sets httpOnly js_at / js_rt cookies, returns { user }
 *   DELETE                       → revokes the session and clears the cookies
 *
 * The tokens never reach the browser: the login form posts here, this handler
 * talks to the backend, and every subsequent request goes through
 * `/api/gov/[...path]` which reads the cookies server-side.
 */
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, setAuthCookies } from "../gov/[...path]/route";

const BACKEND = process.env.BACKEND_API_URL ?? "http://localhost:4000";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { email, password } = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const login = await fetch(`${BACKEND}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!login.ok) {
    const problem = (await login.json().catch(() => ({}))) as { detail?: string };
    return NextResponse.json(
      { error: problem.detail ?? "Sign-in failed." },
      { status: login.status === 401 ? 401 : 502 },
    );
  }

  const tokens = (await login.json()) as { accessToken: string; refreshToken: string };

  const me = await fetch(`${BACKEND}/api/v1/auth/me`, {
    headers: { authorization: `Bearer ${tokens.accessToken}` },
    cache: "no-store",
  });
  const user = me.ok ? await me.json() : null;

  if (user && user.kind !== "staff" && user.kind !== "admin") {
    return NextResponse.json(
      { error: "This sign-in is for government staff." },
      { status: 403 },
    );
  }

  const res = NextResponse.json({ user });
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  return res;
}

export async function DELETE(): Promise<NextResponse> {
  const jar = await cookies();
  const refreshToken = jar.get("js_rt")?.value;
  if (refreshToken) {
    await fetch(`${BACKEND}/api/v1/auth/logout`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${jar.get("js_at")?.value ?? ""}`,
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    }).catch(() => undefined);
  }
  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}

export const dynamic = "force-dynamic";
