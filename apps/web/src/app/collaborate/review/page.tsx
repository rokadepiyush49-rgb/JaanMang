import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import { Stepper } from "@/components/stepper";
import {
  Avatar,
  ButtonLink,
  Card,
  PageHeading,
} from "@/components/ui";
import { STAGES } from "@/lib/student/vocabulary";

export const metadata: Metadata = { title: "Review & Launch" };

const SUMMARY = [
  { label: "Project Title", value: "Clean Water Initiative UI" },
  { label: "Challenge", value: "JH-24-115 — Smart Irrigation System for Deoghar" },
  { label: "Innovation Goal", value: "Sustainability" },
  { label: "Region", value: "Santhal Pargana · Deoghar" },
];

const TEAM = [
  { name: "Aisha Patel", role: "Team lead · Full-stack" },
  { name: "Rohan Kumar", role: "Data Science" },
];

export default function ReviewPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <PageHeading
        subtitle="Confirm the details before your collaboration goes live on the Innovation Map."
        title="Review & Launch"
      />

      <Stepper current={3} />

      <Card className="p-6 sm:p-8">
        <h2 className="headline-lg text-ink">Project Summary</h2>
        <dl className="mt-5 divide-y divide-line">
          {SUMMARY.map((row) => (
            <div
              className="flex flex-wrap items-baseline justify-between gap-3 py-4"
              key={row.label}
            >
              <dt className="label-caps text-ink-faint">{row.label}</dt>
              <dd className="font-semibold text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="headline-md text-ink">Team</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {TEAM.map((member) => (
              <li className="flex items-center gap-3" key={member.name}>
                <Avatar name={member.name} size={40} tone="muted" />
                <span>
                  <span className="block font-bold text-ink">{member.name}</span>
                  <span className="text-xs text-ink-muted">{member.role}</span>
                </span>
              </li>
            ))}
            <li className="rounded-lg bg-card-muted px-4 py-3 text-center text-sm text-ink-muted">
              2 slots stay open for later invites
            </li>
          </ul>
        </Card>

        <Card className="p-6">
          <h2 className="headline-md text-ink">Delivery Stages</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Every collaboration ships through the same six checkpoints.
          </p>
          <ol className="mt-4 flex flex-col gap-2">
            {STAGES.map((stage, i) => (
              <li className="flex items-center gap-3 text-sm" key={stage}>
                <span
                  className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-primary text-white" : "bg-card-muted text-ink-faint"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={i === 0 ? "font-semibold text-ink" : "text-ink-muted"}>
                  {stage}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <Card className="flex flex-wrap items-center gap-4 border-navy/20 bg-navy-soft/40 p-6">
        <Icon className="text-navy" name="sparkles" size={24} />
        <p className="min-w-0 flex-1 text-sm text-ink">
          Run this proposal past the AI Project Council before launch to surface
          feasibility and compliance risks early.
        </p>
        <ButtonLink href="/council/new" tone="outline">
          Convene the council
        </ButtonLink>
      </Card>

      <div className="flex items-center justify-between border-t border-line pt-6">
        <ButtonLink href="/collaborate/team" tone="outline">
          Back
        </ButtonLink>
        <ButtonLink href="/dashboard" icon="rocket">
          Launch Collaboration
        </ButtonLink>
      </div>
    </div>
  );
}
