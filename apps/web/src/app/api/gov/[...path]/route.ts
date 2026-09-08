/**
 * Auth proxy for the government workspace.
 *
 * The browser calls `/api/gov/<path>` same-origin; this handler forwards it to
 * `${BACKEND_API_URL}/api/v1/<path>` with the access token from the httpOnly
 * `js_at` cookie attached as a bearer. On a 401 it spends the `js_rt` refresh
 * cookie once, re-issues both cookies and retries — so the client never sees
 * the tokens and a 15-minute access token expiring mid-session is invisible.
 *
 * Only `/gov/*` uses this; the student and industry surfaces are untouched.
 */
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_API_URL ?? "http://localhost:4000";
const ACCESS_COOKIE = "js_at";
const REFRESH_COOKIE = "js_rt";
const ACCESS_MAX_AGE = 15 * 60;
const REFRESH_MAX_AGE = 30 * 24 * 60 * 60;

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  const target = `${BACKEND}/api/v1/${path.join("/")}${req.nextUrl.search}`;
  const jar = await cookies();

  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

  let access = jar.get(ACCESS_COOKIE)?.value;
  let upstream = await forward(target, req, body, access);

  let refreshed: { access: string; refresh: string } | null = null;
  if (upstream.status === 401) {
    const refresh = jar.get(REFRESH_COOKIE)?.value;
    refreshed = refresh ? await tryRefresh(refresh) : null;
    if (refreshed) {
      access = refreshed.access;
      upstream = await forward(target, req, body, access);
    }
  }

  const payload = await upstream.text();
  const res = new NextResponse(payload, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });

  if (refreshed) {
    setAuthCookies(res, refreshed.access, refreshed.refresh);
  }
  // A 401 that survived a refresh attempt means the session is gone.
  if (upstream.status === 401 && !refreshed) {
    clearAuthCookies(res);
  }
  return res;
}

function forward(
  target: string,
  req: NextRequest,
  body: string | undefined,
  access: string | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  const contentType = req.headers.get("content-type");
  // Only forward a content-type when there is a body — Fastify 400s on an
  // empty body sent with `application/json`.
  if (body && contentType) headers["content-type"] = contentType;
  if (access) headers.authorization = `Bearer ${access}`;
  const idem = req.headers.get("idempotency-key");
  if (idem) headers["idempotency-key"] = idem;

  return fetch(target, {
    method: req.method,
    headers,
    body,
    cache: "no-store",
    redirect: "manual",
  });
}

async function tryRefresh(
  refreshToken: string,
): Promise<{ access: string; refresh: string } | null> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { accessToken: string; refreshToken: string };
    return { access: json.accessToken, refresh: json.refreshToken };
  } catch {
    return null;
  }
}

export function setAuthCookies(res: NextResponse, access: string, refresh: string): void {
  const common = { httpOnly: true as const, sameSite: "lax" as const, path: "/", secure: process.env.NODE_ENV === "production" };
  res.cookies.set(ACCESS_COOKIE, access, { ...common, maxAge: ACCESS_MAX_AGE });
  res.cookies.set(REFRESH_COOKIE, refresh, { ...common, maxAge: REFRESH_MAX_AGE });
}

export function clearAuthCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_COOKIE, "", { path: "/", maxAge: 0 });
}

export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const PUT = handle;
export const DELETE = handle;
export const dynamic = "force-dynamic";
