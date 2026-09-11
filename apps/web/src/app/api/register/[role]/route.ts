/**
 * Account creation.
 *
 * Posts the form to the backend's `register/<role>` endpoint, and on success
 * puts the returned tokens straight into the httpOnly cookies — so signing up
 * signs you in, with no second round trip and no token ever touching the page.
 *
 * `role` is validated against a closed list here as well as at the server, so
 * a mistyped path 404s instead of reaching the API.
 */
import { NextRequest, NextResponse } from "next/server";
import { setAuthCookies } from "@/lib/auth/cookies";
import { BACKEND } from "@/lib/auth/proxy-handler";
import { destinationFor } from "@/lib/auth/destination";

const ROLES = ["student", "government", "industry", "institute"] as const;
type Role = (typeof ROLES)[number];

function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ role: string }> },
): Promise<NextResponse> {
  const { role } = await ctx.params;
  if (!isRole(role)) {
    return NextResponse.json({ error: "Unknown account type." }, { status: 404 });
  }

  const body = await req.text();
  const upstream = await fetch(`${BACKEND}/api/v1/auth/register/${role}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  }).catch(() => null);

  if (!upstream) {
    return NextResponse.json({ error: "Could not reach the server." }, { status: 502 });
  }

  const payload = (await upstream.json().catch(() => ({}))) as {
    accessToken?: string;
    refreshToken?: string;
    detail?: string;
    errors?: Record<string, string[]>;
  };

  if (!upstream.ok) {
    return NextResponse.json(
      { error: payload.detail ?? "Could not create the account.", errors: payload.errors },
      { status: upstream.status },
    );
  }

  const me = await fetch(`${BACKEND}/api/v1/auth/me`, {
    headers: { authorization: `Bearer ${payload.accessToken}` },
    cache: "no-store",
  });
  const user = me.ok ? await me.json() : null;

  const res = NextResponse.json({ user, redirectTo: destinationFor(user) });
  if (payload.accessToken && payload.refreshToken) {
    setAuthCookies(res, payload.accessToken, payload.refreshToken);
  }
  return res;
}

export const dynamic = "force-dynamic";
