/**
 * Sign in and sign out, for every surface.
 *
 *   POST   { email, password }  → sets httpOnly cookies, returns { user }
 *   DELETE                      → revokes the session and clears the cookies
 *
 * There is deliberately no `role` in the request. The account already knows
 * what it is; asking a person which door they came through is a way to get the
 * answer wrong, and a role sent by a client is a role a client could change.
 * The response carries the server-resolved `surface` and the path to send them
 * to, so the form never decides where anyone lands.
 */
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { clearAuthCookies, setAuthCookies, ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/auth/cookies";
import { BACKEND, tryRefresh } from "@/lib/auth/proxy-handler";
import { destinationFor } from "@/lib/auth/destination";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const { email, password } = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
  };
  if (!email || !password) {
    return NextResponse.json({ error: "Enter your email and password." }, { status: 400 });
  }

  const login = await fetch(`${BACKEND}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  }).catch(() => null);

  if (!login) {
    return NextResponse.json({ error: "Could not reach the server." }, { status: 502 });
  }
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

  const res = NextResponse.json({ user, redirectTo: destinationFor(user) });
  setAuthCookies(res, tokens.accessToken, tokens.refreshToken);
  return res;
}

/**
 * Sign out.
 *
 * Revoking the refresh token server-side is the part that matters — clearing
 * the cookies only stops *this* browser from using a token that would
 * otherwise stay valid for thirty days.
 *
 * That call needs a live access token, and the access token is the thing most
 * likely to have expired by the time someone reaches for Sign out. So a 401
 * here is retried once against a refreshed token, exactly as the proxy does
 * for every other request. Without that retry the revocation silently no-ops
 * in precisely the case it is needed.
 *
 * The cookies are cleared either way: a user who pressed Sign out is signed
 * out of this browser even if the server could not be reached. The response
 * reports whether the server-side revocation actually happened rather than
 * claiming success unconditionally.
 */
export async function DELETE(): Promise<NextResponse> {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  let revoked = false;

  if (refreshToken) {
    const call = (access: string) =>
      fetch(`${BACKEND}/api/v1/auth/logout`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${access}`,
        },
        body: JSON.stringify({ refreshToken }),
        cache: "no-store",
      }).catch(() => null);

    let upstream = await call(jar.get(ACCESS_COOKIE)?.value ?? "");

    if (upstream?.status === 401) {
      const fresh = await tryRefresh(refreshToken);
      // Rotation already invalidated the presented token, so revoke the new one.
      if (fresh) upstream = await callWith(fresh.access, fresh.refresh);
    }

    revoked = Boolean(upstream && upstream.status < 400);
    if (!revoked) {
      console.warn(
        `[session] sign-out could not revoke the refresh token server-side (${
          upstream ? `HTTP ${upstream.status}` : "unreachable"
        }). Cookies cleared locally.`,
      );
    }
  }

  const res = NextResponse.json({ ok: true, revoked });
  clearAuthCookies(res);
  return res;
}

function callWith(access: string, refresh: string): Promise<Response | null> {
  return fetch(`${BACKEND}/api/v1/auth/logout`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${access}` },
    body: JSON.stringify({ refreshToken: refresh }),
    cache: "no-store",
  }).catch(() => null);
}
