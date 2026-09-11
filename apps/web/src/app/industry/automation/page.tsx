"use client";

/**
 * The Automation Centre.
 *
 * The portal's central claim is that a partner does not have to go looking —
 * that relevant work finds them. This screen is where the claim becomes
 * auditable rather than atmospheric: what each rule does, when it last ran, what
 * that run actually produced, and a switch to stop it.
 *
 * The second claim it makes is the more important one. Rules that would move
 * money, bind the company or put a named engineer into a student team all stop
 * at a person, and the card says so on its face. An automation a partner cannot
 * stop, or cannot tell apart from a decision somebody made, is not one they will
 * leave switched on.
 */

import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
import { Badge, Card, Enter, cx } from "@/components/ui";
import { Toggle } from "@/components/ui-interactive";
import { relative } from "@/lib/industry/format";
import { awaitingReview, openRequests } from "@/lib/industry/selectors";
import { useIndustry } from "@/lib/industry/store";
import type { AutomationCategory, AutomationStatus } from "@/lib/industry/types";

const STATUS: Record<AutomationStatus, { tone: "success" | "warning" | "neutral"; label: string; icon: IconName }> = {
  healthy: { tone: "success", label: "Healthy", icon: "check-circle" },
  attention: { tone: "warning", label: "Needs a person", icon: "warning" },
  paused: { tone: "neutral", label: "Paused", icon: "pause" },
};

const CATEGORY: Record<AutomationCategory, { label: string; blurb: string; icon: IconName }> = {
  discovery: {
    label: "Discovery",
    blurb: "Finding challenges worth your attention",
    icon: "search",
  },
  eligibility: {
    label: "Eligibility & funding",
    blurb: "Testing what you are allowed and able to fund",
    icon: "scale",
  },
  mentorship: {
    label: "Mentorship",
    blurb: "Matching university requests to your engineers",
    icon: "users",
  },
  delivery: {
    label: "Delivery",
    blurb: "Watching the projects you are already carrying",
    icon: "clipboard",
  },
  reporting: {
    label: "Reporting",
    blurb: "Keeping the impact and CSR record current",
    icon: "bar-chart",
  },
};

const ORDER: AutomationCategory[] = ["discovery", "eligibility", "mentorship", "delivery", "reporting"];

export default function AutomationPage() {
  const { state, dispatch } = useIndustry();

  const enabled = state.automations.filter((a) => a.enabled);
  const attention = state.automations.filter((a) => a.status === "attention" && a.enabled);
  const runs = state.automations.reduce((s, a) => s + a.runsThisWeek, 0);

  /* The decisions the platform deliberately did not take. Counting them is the
     honest counterweight to the "runs this week" figure above. */
  const humanDecisions =
    awaitingReview(state.projects).length +
    openRequests(state.requests, state.assignments).length +
    state.challenges.filter((c) => c.status === "awaiting_partner").length;

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="min-w-0">
          <h1 className="headline-xl text-ink">
            <span className="font-medium">Automation</span>{" "}
            <span className="font-bold">centre</span>
          </h1>
          <p className="mt-2 max-w-3xl text-base text-ink-muted">
            {runs.toLocaleString("en-IN")} automated actions ran for you this week across{" "}
            {enabled.length} active rules. {humanDecisions} decisions were left for a person —
            funding, mentor assignment and milestone approval, which are the three things the
            platform will not decide on your behalf.
          </p>
        </div>
      </Enter>

      <Enter index={1}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric hint="across every rule" label="Runs this week" value={runs.toLocaleString("en-IN")} />
          <Metric hint="enabled for your company" label="Active rules" value={`${enabled.length}/${state.automations.length}`} />
          <Metric hint="waiting on an external party or on you" label="Need a person" tone={attention.length ? "warning" : undefined} value={String(attention.length)} />
          <Metric hint="the platform will not take these" label="Left to you" value={String(humanDecisions)} />
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

      {ORDER.map((category, ci) => {
        const rules = state.automations.filter((a) => a.category === category);
        if (!rules.length) return null;
        const meta = CATEGORY[category];

        return (
          <Enter index={3 + ci} key={category}>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[12px] bg-primary-fixed text-on-primary-fixed-variant">
                  <Icon name={meta.icon} size={17} />
                </span>
                <div className="min-w-0">
                  <h2 className="headline-md text-ink">{meta.label}</h2>
                  <p className="text-sm text-ink-muted">{meta.blurb}</p>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {rules.map((a) => {
                  const s = STATUS[a.enabled ? a.status : "paused"];
                  return (
                    <Card className={cx("flex flex-col p-5", !a.enabled && "opacity-70")} key={a.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-ink">{a.name}</h3>
                          <p className="mt-1 text-sm text-ink-muted">{a.description}</p>
                        </div>
                        <Badge icon={s.icon} tone={s.tone}>
                          {s.label}
                        </Badge>
                      </div>

                      {/* What the last run produced. Without this a rule card is
                          an assertion that something is happening. */}
                      <dl className="mt-4 grid grid-cols-3 gap-3">
                        {a.results.map((r) =>
                          r.href ? (
                            <Link
                              className="rounded-md bg-card-muted p-3 transition-colors hover:bg-container"
                              href={r.href}
                              key={r.label}
                            >
                              <dt className="label-caps text-ink-faint">{r.label}</dt>
                              <dd className="mt-0.5 flex items-center gap-1 text-sm font-bold text-ink tabular-nums">
                                {r.value}
                                <Icon className="text-ink-muted" name="chevron-right" size={13} />
                              </dd>
                            </Link>
                          ) : (
                            <div className="rounded-md bg-card-muted p-3" key={r.label}>
                              <dt className="label-caps text-ink-faint">{r.label}</dt>
                              <dd className="mt-0.5 text-sm font-bold text-ink tabular-nums">
                                {r.value}
                              </dd>
                            </div>
                          ),
                        )}
                      </dl>

                      <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                        <span>
                          Last run <span className="font-semibold text-ink">{relative(a.lastRunAt)}</span>
                        </span>
                        <span>·</span>
                        <span>{a.runsThisWeek.toLocaleString("en-IN")} runs this week</span>
                      </p>
                      <p className="mt-1 text-xs text-ink-muted">{a.nextAction}</p>

                      {a.requiresHuman ? (
                        <p className="mt-3 flex items-start gap-2 rounded-md bg-primary-fixed p-3 text-xs text-on-primary-fixed-variant">
                          <Icon className="mt-px shrink-0" name="user" size={13} />
                          <span>
                            This rule proposes and never commits. Nothing it produces takes effect
                            until a person with the right permission acts on it.
                          </span>
                        </p>
                      ) : null}

                      <div className="mt-auto border-t border-line pt-2">
                        <Toggle
                          checked={a.enabled}
                          description={
                            a.enabled
                              ? "Running. Turning it off stops the notifications it produces."
                              : "Paused. It will not run or notify until you switch it back on."
                          }
                          label="Enabled"
                          onChange={() => dispatch({ type: "automation/toggle", id: a.id })}
                        />
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </Enter>
        );
      })}

      <Enter index={9}>
        <Card className="flex flex-wrap items-start gap-3 p-5" tone="flat">
          <Icon className="mt-0.5 shrink-0 text-ink-faint" name="shield" size={18} />
          <p className="min-w-0 flex-1 text-sm text-ink-muted">
            No rule on this page can commit funding, assign one of your engineers to a team, approve
            a milestone or release a tranche. Those four actions require a signed-in person holding
            the matching permission, and each one is written to the project&rsquo;s audit trail with
            that person&rsquo;s name against it.
          </p>
        </Card>
      </Enter>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "warning";
}) {
  return (
    <Card className={cx("p-5", tone === "warning" && "ring-2 ring-warning/30")}>
      <p className="label-caps text-ink-faint">{label}</p>
      <p className="stat-number mt-1 text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>
    </Card>
  );
}
