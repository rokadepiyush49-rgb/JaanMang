"use client";

/**
 * Automation centre.
 *
 * The claim this product makes to a government is "you will not have to manage
 * every step by hand". This screen is where that claim is auditable: what each
 * rule does, when it last ran, what it will do next, and how many records it
 * touched — with a switch, because an automation an officer cannot stop is not
 * one they will trust.
 */

import Link from "next/link";
import { Badge, Card, Enter } from "@/components/ui";
import { Toggle } from "@/components/ui-interactive";
import { Icon } from "@/components/icon";
import { count, relative } from "@/lib/gov/format";
import { useGov } from "@/lib/gov/store";
import type { AutomationStatus } from "@/lib/gov/types";

const STATUS: Record<AutomationStatus, { tone: "success" | "warning" | "neutral"; label: string; icon: "check-circle" | "warning" | "pause" }> = {
  healthy: { tone: "success", label: "Healthy", icon: "check-circle" },
  attention: { tone: "warning", label: "Needs attention", icon: "warning" },
  paused: { tone: "neutral", label: "Paused", icon: "pause" },
};

export default function AutomationPage() {
  const { state, ranked, actions } = useGov();

  const runsToday = state.automations.reduce((s, a) => s + a.runsToday, 0);
  const enabled = state.automations.filter((a) => a.enabled).length;
  const attention = state.automations.filter((a) => a.status === "attention");
  const manualDecisions = ranked.filter(
    (p) => p.status === "pending_validation" || p.status === "funding_required",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="min-w-0">
          <h1 className="headline-xl text-ink">
            <span className="font-medium">Automation</span> <span className="font-bold">centre</span>
          </h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            {runsToday.toLocaleString("en-IN")} automated actions ran today across {enabled} active
            rules. {manualDecisions} decisions were left for a person — validation and money, which
            are the two things the system will not decide on its own.
          </p>
        </div>
      </Enter>

      <Enter index={1}>
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: "Runs today", value: runsToday.toLocaleString("en-IN"), hint: "Across every rule" },
            { label: "Active rules", value: `${enabled}/${state.automations.length}`, hint: "Enabled in this jurisdiction" },
            { label: "Need attention", value: attention.length, hint: "Waiting on an external party" },
            { label: "Left to officers", value: manualDecisions, hint: "Validation & funding decisions" },
          ].map((m) => (
            <Card className="p-5" key={m.label}>
              <p className="label-caps text-ink-faint">{m.label}</p>
              <p className="mt-1 stat-number text-ink">{m.value}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{m.hint}</p>
            </Card>
          ))}
        </div>
      </Enter>

      {attention.length ? (
        <Enter index={2}>
          <Card className="bg-warning-tint p-5" tone="flat">
            <div className="flex flex-wrap items-start gap-3">
              <Icon className="mt-0.5 shrink-0 text-on-warning-tint" name="warning" size={20} />
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-on-warning-tint">Rules waiting on something</h2>
                <ul className="mt-2 flex flex-col gap-1">
                  {attention.map((a) => (
                    <li className="text-sm text-on-warning-tint" key={a.id}>
                      <span className="font-semibold">{a.name}</span> — {a.nextAction}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </Enter>
      ) : null}

      <Enter index={3}>
        <div className="grid gap-4 lg:grid-cols-2">
          {state.automations.map((a) => {
            const s = STATUS[a.status];
            return (
              <Card className="flex flex-col p-5" key={a.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-ink">{a.name}</h2>
                    <p className="mt-1 text-sm text-ink-muted">{a.description}</p>
                  </div>
                  <Badge icon={s.icon} tone={s.tone}>
                    {s.label}
                  </Badge>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-md bg-card-muted p-3">
                    <dt className="label-caps text-ink-faint">Last run</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-ink">{relative(a.lastRunAt)}</dd>
                  </div>
                  <div className="rounded-md bg-card-muted p-3">
                    <dt className="label-caps text-ink-faint">Records</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-ink tabular-nums">
                      {count(a.affectedRecords)}
                    </dd>
                  </div>
                  <div className="rounded-md bg-card-muted p-3">
                    <dt className="label-caps text-ink-faint">Runs today</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-ink tabular-nums">
                      {count(a.runsToday)}
                    </dd>
                  </div>
                </dl>

                <p className="mt-3 flex items-start gap-2 text-sm text-ink-muted">
                  <Icon className="mt-0.5 shrink-0" name="arrow-right" size={14} />
                  <span>
                    <span className="font-semibold text-ink">Next: </span>
                    {a.nextAction}
                  </span>
                </p>

                <div className="mt-auto border-t border-line pt-2">
                  <Toggle
                    checked={a.enabled}
                    description={
                      a.enabled
                        ? "Running. Turning it off hands these steps back to officers."
                        : "Paused. The work still has to happen — by hand."
                    }
                    label="Automation enabled"
                    onChange={() => void actions.toggleAutomation(a.id)}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      </Enter>

      <Enter index={4}>
        <Card className="p-5">
          <h2 className="headline-md text-ink">What is deliberately not automated</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              {
                title: "Validating a problem",
                why: "Someone accountable has to say this is real and inside our remit before public money moves.",
              },
              {
                title: "Approving money",
                why: "Financial approval is a personal responsibility under the state's delegation rules — the system can recommend, never sign.",
              },
              {
                title: "Declaring a problem resolved",
                why: "Only the citizens who reported it can close it, which is why verification is a separate loop.",
              },
            ].map((item) => (
              <li className="rounded-md bg-card-muted p-4" key={item.title}>
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Icon name="lock" size={14} />
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-ink-muted">{item.why}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-faint">
            Every automated action is written to the problem&rsquo;s audit trail with the actor
            recorded as System or AI — see any problem&rsquo;s{" "}
            <Link className="underline" href="/gov/problems">
              audit tab
            </Link>
            .
          </p>
        </Card>
      </Enter>
    </div>
  );
}
