"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { Stepper } from "@/components/stepper";
import { Button, ButtonLink, Card, PageHeading } from "@/components/ui";
import { CHALLENGES, GOALS } from "@/lib/data";

const inputClass =
  "w-full rounded-md border border-line bg-card-muted px-4 py-3.5 text-base text-ink placeholder:text-ink-faint focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary focus:outline-none";

export default function CollaborationDetailsPage() {
  const router = useRouter();
  const [goal, setGoal] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    router.push("/collaborate/team");
  }

  return (
    <form className="mx-auto flex max-w-6xl flex-col gap-8" onSubmit={submit}>
      <PageHeading
        subtitle="Bridge skills, solve societal challenges, and build your impact."
        title="Start New Collaboration"
      />

      <Stepper current={1} />

      <Card className="p-6 sm:p-8">
        <h2 className="headline-lg text-ink">Step 1: Project Details</h2>

        <div className="mt-6 flex flex-col gap-6">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">
              Project Title
            </span>
            <input
              className={inputClass}
              name="title"
              placeholder="e.g., Clean Water Initiative UI"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-ink">
              Problem Statement Selection
            </span>
            <span className="relative block">
              <select
                className={`${inputClass} appearance-none pr-12`}
                defaultValue=""
                name="challenge"
                required
              >
                <option disabled value="">
                  Select a societal challenge to address…
                </option>
                {CHALLENGES.map((challenge) => (
                  <option key={challenge.id} value={challenge.id}>
                    {challenge.id} — {challenge.title}
                  </option>
                ))}
              </select>
              <Icon
                className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-muted"
                name="chevron-down"
                size={18}
              />
            </span>
          </label>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-ink">
              Primary Innovation Goal
            </legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {GOALS.map((option) => {
                const active = goal === option.id;
                return (
                  <button
                    aria-pressed={active}
                    className={`rounded-md border p-5 text-left transition-colors ${
                      active
                        ? "border-navy bg-navy-soft/50"
                        : "border-transparent bg-card-muted hover:border-line-strong"
                    }`}
                    key={option.id}
                    onClick={() => setGoal(option.id)}
                    type="button"
                  >
                    <Icon
                      className={active ? "text-navy" : "text-impact-deep"}
                      name={option.icon}
                      size={24}
                    />
                    <span className="mt-3 block font-bold text-ink">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      </Card>

      <div className="flex items-center justify-between border-t border-line pt-6">
        <ButtonLink href="/dashboard" tone="ghost">
          Cancel
        </ButtonLink>
        <Button disabled={!goal} iconAfter="arrow-right" type="submit">
          Continue to Step 2
        </Button>
      </div>
    </form>
  );
}
