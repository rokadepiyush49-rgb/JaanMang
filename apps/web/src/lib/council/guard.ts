import "server-only";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { ApiError } from "./types";

/**
 * The gate in front of the council endpoints.
 *
 * These three routes each spend Groq quota on a model call, and until now they
 * accepted any POST from anyone — a deployed instance was a metered-billing
 * abuse target that needed no account to drain. Two things stop that: a session
 * is required, and a session can only spend so much of it per window.
 *
 * The limiter is deliberately modest in what it claims. It is a per-instance
 * map, so on a serverless platform a determined caller spread across cold
 * starts gets more than `LIMIT` turns. That is fine for what it defends
 * against — an unauthenticated script, and an ordinary account holding down
 * the button — and it costs no external dependency. A shared counter belongs
 * in the backend's throttler once the council moves there; this is the cheap
 * correct-direction version, not a pretence of being more.
 */

/** Turns one account may take per window. A real sitting is ~15 turns. */
const LIMIT = 40;
const WINDOW_MS = 10 * 60 * 1000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function rateLimit(key: string): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });

    // The map is only ever as large as the accounts active in one window, but
    // nothing evicts it on a long-lived instance, so sweep the expired entries
    // whenever it grows past a size no real deployment reaches honestly.
    if (buckets.size > 500) {
      for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
    }
    return { ok: true };
  }

  if (bucket.count >= LIMIT) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { ok: true };
}

/**
 * Returns a response to send back, or `null` when the caller may proceed.
 *
 * Shaped that way so a route handler reads as one guard line at the top rather
 * than a nested block:
 *
 *   const denied = await guardCouncil();
 *   if (denied) return denied;
 */
export async function guardCouncil(): Promise<NextResponse<ApiError> | null> {
  const session = await getSession();

  if (!session) {
    return NextResponse.json<ApiError>(
      { error: "Sign in to use the council.", code: "UNAUTHENTICATED" },
      { status: 401 },
    );
  }

  // A suspended account keeps a valid cookie until it expires. The council is
  // a spending endpoint, so it checks rather than trusting the cookie alone.
  if (session.status !== "active") {
    return NextResponse.json<ApiError>(
      { error: "This account cannot use the council.", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const limit = rateLimit(session.id);
  if (!limit.ok) {
    return NextResponse.json<ApiError>(
      {
        error: "That is a lot of council turns. Try again in a few minutes.",
        code: "RATE_LIMITED",
      },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } },
    );
  }

  return null;
}
