"use client";

import { useState } from "react";

/**
 * Posts a signup form and reports back where to go.
 *
 * The destination is decided by the server — the route reads `/auth/me` after
 * creating the account and returns the resolved path, so a student lands on
 * their wizard and an unverified partner lands in the waiting room without the
 * form knowing anything about either.
 *
 * `fieldErrors` mirrors the API's per-field `errors` map so a validation
 * failure lands on the input that caused it rather than in a banner.
 */
export function useRegister(role: "student" | "government" | "industry" | "institute") {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function submit(body: unknown): Promise<string | null> {
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const res = await fetch(`/api/register/${role}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        errors?: Record<string, string[]>;
        redirectTo?: string;
      };

      if (!res.ok) {
        setError(payload.error ?? "Could not create the account.");
        if (payload.errors) {
          setFieldErrors(
            Object.fromEntries(
              Object.entries(payload.errors).map(([k, v]) => [k, v[0] ?? "Invalid value"]),
            ),
          );
        }
        return null;
      }
      return payload.redirectTo ?? "/";
    } catch {
      setError("Could not reach the server.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  return { submit, busy, error, fieldErrors };
}
