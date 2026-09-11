"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, cx } from "@/components/ui";
import { Field, FormError } from "@/components/form";
import { AuthPage } from "./chrome";
import { DEMO_ACCOUNTS } from "./demo-accounts";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        redirectTo?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "Sign-in failed.");
        return;
      }
      /* `next` is honoured only when the server agrees the user belongs on
         that surface — it sends them home otherwise, and the layout guard
         catches anything the query string tries to sneak past. */
      router.replace(next && body.redirectTo !== "/pending" ? next : (body.redirectTo ?? "/"));
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthPage
      footer={
        <p className="text-center text-sm text-ink-muted">
          New to Jan Setu?{" "}
          <Link className="font-semibold text-navy hover:underline" href="/signup">
            Create an account
          </Link>
        </p>
      }
      subtitle="One sign-in for students, institutions, government officers and industry partners. Where you land is decided by your account, not by this page."
      title="Sign in"
    >
      <Card className="p-6">
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <Field
            autoComplete="username"
            icon="mail"
            label="Email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            type="email"
            value={email}
          />

          <div className="relative">
            <Field
              autoComplete="current-password"
              inputClassName="pr-12"
              icon="lock"
              label="Password"
              onChange={(e) => setPassword(e.target.value)}
              required
              type={show ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute top-[2.05rem] right-3 flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-card-muted"
              onClick={() => setShow((v) => !v)}
              type="button"
            >
              <Icon name={show ? "eye-off" : "eye"} size={17} />
            </button>
          </div>

          <FormError>{error}</FormError>

          <Button className="mt-1" disabled={busy} iconAfter={busy ? undefined : "arrow-right"} type="submit">
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </Card>

      <DemoAccounts
        onPick={(account) => {
          setEmail(account.email);
          setPassword(account.password);
          setError(null);
        }}
      />
    </AuthPage>
  );
}

/**
 * The seeded accounts, listed in the open.
 *
 * This is a demonstration deployment running on synthetic data, and the
 * credentials are in the repository's seed file and its README. Hiding them
 * here would protect nothing and would only mean pasting them from somewhere
 * else. On a real deployment this block is what you delete first.
 */
function DemoAccounts({ onPick }: { onPick: (a: (typeof DEMO_ACCOUNTS)[number]) => void }) {
  return (
    <div className="mt-6">
      <p className="label-caps mb-2 flex items-center gap-2 text-ink-faint">
        <Icon name="key" size={13} />
        Demo accounts · password jansetu-dev
      </p>
      <div className="flex flex-col gap-1.5">
        {DEMO_ACCOUNTS.map((a) => (
          <button
            className={cx(
              "flex items-center gap-3 rounded-md bg-card-muted px-3 py-2.5 text-left ring-1 ring-line",
              "transition-colors duration-150 ease-jm hover:bg-card",
            )}
            key={a.email}
            onClick={() => onPick(a)}
            type="button"
          >
            <span
              className={cx(
                "flex size-8 shrink-0 items-center justify-center rounded-sm",
                a.wash,
              )}
            >
              <Icon name={a.icon} size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{a.label}</span>
              <span className="block truncate text-xs text-ink-faint">{a.email}</span>
            </span>
            <Icon className="shrink-0 text-ink-faint" name="arrow-right" size={15} />
          </button>
        ))}
      </div>
    </div>
  );
}
