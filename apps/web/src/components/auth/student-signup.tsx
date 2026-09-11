"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card } from "@/components/ui";
import { Field, FormError } from "@/components/form";
import { AuthPage } from "./chrome";
import { useRegister } from "./use-register";

export function StudentSignupForm() {
  const router = useRouter();
  const { submit, busy, error, fieldErrors } = useRegister("student");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const to = await submit({ fullName, email, password });
    if (to) {
      router.replace(to);
      router.refresh();
    }
  }

  return (
    <AuthPage
      brand="student"
      footer={
        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link className="font-semibold text-navy hover:underline" href="/signin">
            Sign in
          </Link>
        </p>
      }
      subtitle="Four fields now. We ask about your college, branch and skills next — that is what makes your dashboard useful rather than empty."
      title="Create a student account"
    >
      <Card className="p-6">
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <Field
            autoComplete="name"
            error={fieldErrors.fullName}
            icon="user"
            label="Full name"
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Aisha Patel"
            required
            value={fullName}
          />
          <Field
            autoComplete="email"
            error={fieldErrors.email}
            hint="Use your college email if you have one — it verifies your institution automatically."
            icon="mail"
            label="Email"
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@college.ac.in"
            required
            type="email"
            value={email}
          />
          <div className="relative">
            <Field
              autoComplete="new-password"
              inputClassName="pr-12"
              error={fieldErrors.password}
              hint="At least 8 characters, with a letter and a number."
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
            {busy ? "Creating your account…" : "Create account"}
          </Button>

          <p className="text-center text-xs text-ink-muted">
            No review needed — you are in as soon as this is done.
          </p>
        </form>
      </Card>
    </AuthPage>
  );
}
