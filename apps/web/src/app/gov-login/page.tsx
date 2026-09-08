"use client";

/**
 * Government workspace sign-in.
 *
 * Posts to `/api/gov-session`, which sets the httpOnly session cookies and
 * returns the user. `proxy.ts` sends anyone without a session here, and sends
 * anyone with one straight back out — so this page is only ever seen logged
 * out.
 *
 * The seeded dev accounts are shown below the form: this is a demo deployment
 * with synthetic data, and hiding the credentials would only mean pasting them
 * from the README.
 */

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card } from "@/components/ui";

const DEV_ACCOUNTS = [
  { email: "user-district@jansetu.local", label: "Deputy Commissioner · Ranchi District" },
  { email: "user-block@jansetu.local", label: "Block Development Officer · Ranchi Block" },
  { email: "user-gp@jansetu.local", label: "Panchayat Secretary · Nagri" },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const rawNext = params.get("next") || "/gov";
  const next = rawNext.startsWith("/gov") ? rawNext : "/gov";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/gov-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? "Sign-in failed.");
        return;
      }
      router.replace(next);
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-md bg-ink text-card">
          <Icon name="landmark" size={22} />
        </span>
        <div>
          <p className="headline-md text-ink">Jan Setu</p>
          <p className="text-sm text-ink-muted">Government workspace</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="label-caps text-ink-muted">Email</span>
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md bg-card-muted px-3 py-2.5 text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-primary"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-caps text-ink-muted">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md bg-card-muted px-3 py-2.5 text-ink outline-none ring-1 ring-line focus:ring-2 focus:ring-primary"
            />
          </label>

          {error ? (
            <p className="flex items-center gap-2 rounded-md bg-critical/10 px-3 py-2 text-sm text-critical">
              <Icon name="warning" size={16} />
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={busy} className="mt-1">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>

      <div className="mt-6">
        <p className="label-caps mb-2 text-ink-faint">Demo accounts · password jansetu-dev</p>
        <div className="flex flex-col gap-1.5">
          {DEV_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => {
                setEmail(a.email);
                setPassword("jansetu-dev");
              }}
              className="rounded-md bg-card-muted px-3 py-2 text-left text-sm text-ink-muted ring-1 ring-line transition hover:text-ink"
            >
              <span className="font-medium text-ink">{a.label}</span>
              <span className="block text-xs text-ink-faint">{a.email}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GovLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
