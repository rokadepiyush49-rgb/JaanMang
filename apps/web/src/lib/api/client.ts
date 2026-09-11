/**
 * The browser's view of the backend.
 *
 * Calls go to `/api/gov/<path>` same-origin; the Next route handler there
 * ("the proxy") attaches the bearer from the httpOnly cookie and refreshes it
 * when it expires. So this module never touches a token — it just does
 * `fetch`, unwraps `application/problem+json`, and on an unrecoverable 401
 * bounces to the login page.
 *
 * The API contract is `backend/openapi.json`; response types are mirrored in
 * `@/lib/gov/types` (which already matched the backend's model).
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ProblemBody = {
  title?: string;
  detail?: string;
  code?: string;
  errors?: Record<string, string[]>;
};

async function request<T>(
  path: string,
  init: RequestInit & { method?: string } = {},
): Promise<T> {
  const res = await fetch(`/api/gov/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      // Only declare a JSON body when there is one — a bodiless POST
      // (e.g. /problems/:id/validate) sent with this header 400s in Fastify.
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (res.status === 401 && typeof window !== "undefined") {
    const next = window.location.pathname;
    // A hard navigation on purpose: a full reload clears the now-stale store.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/gov-login?next=${encodeURIComponent(next)}`);
    throw new ApiError(401, "UNAUTHENTICATED", "Session expired.");
  }

  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const problem = (json ?? {}) as ProblemBody;
    throw new ApiError(
      res.status,
      problem.code ?? "ERROR",
      problem.detail ?? problem.title ?? `Request failed (${res.status})`,
      problem.errors,
    );
  }

  return json as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
