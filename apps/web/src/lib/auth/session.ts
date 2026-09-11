import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "./cookies";
import type { Surface } from "./surface";

/**
 * The signed-in user, read on the server.
 *
 * The edge proxy can only see whether a cookie exists — it cannot tell a
 * student's cookie from a Deputy Commissioner's. That check is the optimistic
 * one; *this* is the authoritative one, and it is what every protected layout
 * calls. `/auth/me` resolves roles and permissions from the database on every
 * request, so a revoked role takes effect on the next page load rather than
 * whenever a token happens to expire.
 *
 * Wrapped in React's `cache` so a layout and the page inside it share one call
 * per request.
 */

export type SessionUser = {
  id: string;
  kind: "citizen" | "staff" | "admin";
  status: "active" | "suspended" | "pending";
  displayName: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  locale: "en" | "hi";
  surface: Surface;
  onboarded: boolean;
  roles: string[];
  permissions: string[];
  orgIds: string[];
  jurisdictionIds: string[];
  student: {
    institutionName: string;
    degree: string;
    branch: string;
    currentYear: number;
    graduationYear: number;
    state: string;
    district: string;
    skills: string[];
    interests: string[];
    onboardedAt: string | null;
  } | null;
  organisation: {
    id: string;
    type: "institution" | "government_body" | "industry" | "department";
    name: string;
    legalName: string | null;
    sector: string | null;
    designation: string;
    govBody: {
      bodyType: string;
      state: string;
      district: string;
      lgdCode: string | null;
    } | null;
    industryInfo: {
      onboardedAt: string | null;
      csrThemes: string[];
      geographies: string[];
    } | null;
    institution: {
      shortName: string;
      institutionType: string;
      city: string;
      state: string;
      accreditation: string | null;
      onboardedAt: string | null;
    } | null;
  } | null;
};

const BACKEND = process.env.BACKEND_API_URL ?? "http://localhost:4000";

export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${BACKEND}/api/v1/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as SessionUser;
  } catch {
    // The backend being down must not render a page as if nobody is signed in
    // *and* must not crash it — the caller redirects to sign-in, which is the
    // safe direction to fail in.
    return null;
  }
});

/** Convenience for a server component that only needs a yes/no. */
export async function hasPermission(key: string): Promise<boolean> {
  const session = await getSession();
  return session?.permissions.includes(key) ?? false;
}
