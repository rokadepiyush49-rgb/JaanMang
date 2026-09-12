import "server-only";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from "./cookies";

/**
 * The backend-for-frontend proxy.
 *
 * The browser calls `/api/backend/<path>` same-origin; this forwards it to
 * `${BACKEND_API_URL}/api/v1/<path>` with the access token from the httpOnly
 * cookie attached as a bearer. On a 401 it spends the refresh cookie once,
 * re-issues both cookies and retries — so the client never sees a token and a
 * 15-minute access token expiring mid-session is invisible.
 *
 * Previously this lived inside the `/api/gov` route and served only the
 * government workspace. It is unchanged in behaviour; it is here so the
 * student and industry surfaces use the same one rather than each growing
 * their own token handling.
 */
export const BACKEND = process.env.BACKEND_API_URL ?? "http://localhost:4000";

type Ctx = { params: Promise<{ path: string[] }> };

export async function handleProxy(req: NextRequest, ctx: Ctx): Promise<NextResponse> {
  const { path } = await ctx.params;
  const target = `${BACKEND}/api/v1/${path.join("/")}${req.nextUrl.search}`;
  const jar = await cookies();

  /**
   * Read the body as bytes, not as text.
   *
   * `req.text()` decodes as UTF-8, which silently mangles every byte sequence
   * that is not valid UTF-8 — so an evidence photograph reached the API as
   * replacement characters and was rejected by the magic-number check with
   * "the content does not match the declared type". An ArrayBuffer forwards
   * JSON and PNGs alike.
   */
  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();

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

  /**
   * Pass the response through as bytes, for the same reason the request body
   * is read as bytes: `.text()` decodes as UTF-8, and an evidence photograph
   * came back 90 bytes instead of 70 because every byte that is not valid
   * UTF-8 had been replaced and re-encoded. Images survive this path now, and
   * JSON is unaffected.
   */
  const payload = await upstream.arrayBuffer();
  const res = new NextResponse(payload, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
      // Uploaded files are served from this origin, so the nosniff header the
      // API sets has to survive the hop.
      ...(upstream.headers.get("x-content-type-options")
        ? { "x-content-type-options": upstream.headers.get("x-content-type-options")! }
        : {}),
      ...(upstream.headers.get("cache-control")
        ? { "cache-control": upstream.headers.get("cache-control")! }
        : {}),
    },
  });

  if (refreshed) setAuthCookies(res, refreshed.access, refreshed.refresh);
  // A 401 that survived a refresh attempt means the session is gone.
  if (upstream.status === 401 && !refreshed) clearAuthCookies(res);
  return res;
}

function forward(
  target: string,
  req: NextRequest,
  body: ArrayBuffer | undefined,
  access: string | undefined,
): Promise<Response> {
  const headers: Record<string, string> = {};
  const contentType = req.headers.get("content-type");
  // Only forward a content-type when there is a body — Fastify 400s on an
  // empty body sent with `application/json`.
  if (body && body.byteLength > 0 && contentType) headers["content-type"] = contentType;
  if (access) headers.authorization = `Bearer ${access}`;
  const idem = req.headers.get("idempotency-key");
  if (idem) headers["idempotency-key"] = idem;

  return fetch(target, {
    method: req.method,
    headers,
    body: body && body.byteLength > 0 ? body : undefined,
    cache: "no-store",
    redirect: "manual",
  });
}

export async function tryRefresh(
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
