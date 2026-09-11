"use client";

/**
 * Settings.
 *
 * The point of this screen is the panel on the right: every toggle re-scores the
 * whole catalogue immediately, and the effect is shown as it happens. Preference
 * screens usually store values nobody ever sees act — here, removing "Water"
 * from your CSR themes visibly drops eleven challenges out of your matches
 * while you are still looking at the switch.
 *
 * Nothing is saved to a server because there is no server yet; the store holds
 * the edit, and `CompanyProfileService.update` is where the PATCH will go.
 */

import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, Card, Enter, Progress, cx } from "@/components/ui";
import { Toggle } from "@/components/ui-interactive";
import { MatchRing } from "@/components/industry/pieces";
import { DOMAIN_LABEL, DOMAINS } from "@/lib/industry/challenges";
import { matchChallenge } from "@/lib/industry/match";
import { people, rupees } from "@/lib/industry/format";
import { isOpen, matchContext, recommended } from "@/lib/industry/selectors";
import { useIndustry } from "@/lib/industry/store";
import type { Capability, Domain } from "@/lib/industry/types";

const STATES = [
  "Jharkhand",
  "Odisha",
  "Maharashtra",
  "Bihar",
  "West Bengal",
  "Chhattisgarh",
];

const TECHNOLOGIES = [
  "IoT & Telemetry",
  "LoRaWAN",
  "Water Systems",
  "Sensors & Instrumentation",
  "Embedded Systems",
  "Cloud & Data Platforms",
  "Solar & Power Electronics",
  "GIS",
  "AI/ML",
  "Hydraulic Systems",
  "Refrigeration",
  "Materials",
  "Remote Sensing",
  "Mobile Data Collection",
];

const CAPABILITIES: { key: Capability; label: string }[] = [
  { key: "hardware", label: "Hardware" },
  { key: "software", label: "Software" },
  { key: "manufacturing", label: "Manufacturing" },
  { key: "testing", label: "Testing & calibration" },
  { key: "field-deployment", label: "Field deployment" },
  { key: "logistics", label: "Logistics" },
  { key: "training", label: "Training" },
  { key: "certification", label: "Certification & standards" },
];

const SDGS = [2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 17];

export default function SettingsPage() {
  const { state, dispatch, can } = useIndustry();
  const company = state.company;
  const editable = can("profile.manage");

  const context = matchContext(state.projects, state.assignments);
  const matches = recommended(state.challenges, company, context, {
    engagedIds: state.projects.map((p) => p.challengeId),
  });
  const openChallenges = state.challenges.filter(isOpen);

  /* The demo challenge, scored live, so the effect of a toggle has a face. */
  const flagship = state.challenges.find((c) => c.id === "P-1042");
  const flagshipMatch = flagship ? matchChallenge(flagship, company, context) : undefined;

  const toggleIn = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value];

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="headline-xl text-ink">
              <span className="font-medium">Matching</span>{" "}
              <span className="font-bold">preferences</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              These are not stored preferences — they are the inputs to the match engine. Change one
              and the panel on the right moves while you watch.
            </p>
          </div>
          {!editable ? (
            <Badge icon="lock" tone="neutral">
              {state.user.name} cannot edit the company profile
            </Badge>
          ) : null}
        </div>
      </Enter>

      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        {/* ------------------------------------------------------ controls */}
        <div className="flex flex-col gap-4">
          <Enter index={1}>
            <Card className="p-6">
              <h2 className="headline-md text-ink">CSR themes</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Worth 25 of 100 match points. A domain outside every theme cannot be funded from the
                CSR budget at all, so this is the hardest of the five filters.
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {DOMAINS.map((domain) => {
                  const on = company.csrThemes.includes(domain);
                  const count = openChallenges.filter((c) => c.domain === domain).length;
                  return (
                    <li key={domain}>
                      <button
                        aria-pressed={on}
                        className={cx(
                          "flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors",
                          on ? "bg-primary text-white" : "bg-card-muted hover:bg-container",
                          !editable && "pointer-events-none opacity-60",
                        )}
                        onClick={() =>
                          dispatch({
                            type: "profile/update",
                            patch: { csrThemes: toggleIn(company.csrThemes, domain) as Domain[] },
                          })
                        }
                        type="button"
                      >
                        <Icon name={on ? "check-circle" : "plus"} size={18} />
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {DOMAIN_LABEL[domain]}
                        </span>
                        <span className={cx("shrink-0 text-xs font-bold tabular-nums", on ? "text-white/72" : "text-ink-muted")}>
                          {count} open
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </Enter>

          <Enter index={2}>
            <Card className="p-6">
              <h2 className="headline-md text-ink">Deployment geographies</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Worth 20 points. A bordering state scores partial rather than zero, because a CSR
                programme can usually be extended — but it says so rather than pretending you are
                already there.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {STATES.map((s) => {
                  const on = company.geographies.includes(s);
                  const count = openChallenges.filter((c) => c.state === s).length;
                  return (
                    <li key={s}>
                      <button
                        aria-pressed={on}
                        className={cx(
                          "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                          on ? "bg-primary text-white" : "bg-card-muted text-ink hover:bg-container",
                          !editable && "pointer-events-none opacity-60",
                        )}
                        onClick={() =>
                          dispatch({
                            type: "profile/update",
                            patch: { geographies: toggleIn(company.geographies, s) },
                          })
                        }
                        type="button"
                      >
                        <Icon name={on ? "check" : "plus"} size={14} />
                        {s}
                        <span className={cx("text-xs tabular-nums", on ? "text-white/64" : "text-ink-muted")}>
                          {count}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </Enter>

          <Enter index={3}>
            <Card className="p-6">
              <h2 className="headline-md text-ink">Technology domains</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Worth 25 points. Claiming a domain you cannot staff produces matches you will decline
                — and the decline is visible to the district, which is the real cost.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {TECHNOLOGIES.map((t) => {
                  const on = company.technologyDomains.includes(t);
                  return (
                    <li key={t}>
                      <button
                        aria-pressed={on}
                        className={cx(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                          on ? "bg-tint-navy text-on-tint-navy" : "bg-card-muted text-ink-muted hover:bg-container",
                          !editable && "pointer-events-none opacity-60",
                        )}
                        onClick={() =>
                          dispatch({
                            type: "profile/update",
                            patch: {
                              technologyDomains: toggleIn(company.technologyDomains, t),
                            },
                          })
                        }
                        type="button"
                      >
                        <Icon name={on ? "check" : "plus"} size={11} />
                        {t}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </Enter>

          <Enter index={4}>
            <Card className="p-6">
              <h2 className="headline-md text-ink">Deployment capabilities</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Worth 15 points. What you can actually put in a village, as distinct from what you
                would be willing to pay for.
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {CAPABILITIES.map((c) => (
                  <li key={c.key}>
                    <Toggle
                      checked={company.capabilities.includes(c.key)}
                      description={
                        c.key === "certification"
                          ? "Standards conformance, lab concurrence and type approval"
                          : undefined
                      }
                      label={c.label}
                      onChange={() =>
                        editable &&
                        dispatch({
                          type: "profile/update",
                          patch: { capabilities: toggleIn(company.capabilities, c.key) },
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            </Card>
          </Enter>

          <Enter index={5}>
            <Card className="p-6">
              <h2 className="headline-md text-ink">Preferred SDGs</h2>
              <p className="mt-1 text-sm text-ink-muted">
                A small named adjustment rather than a filter — worth at most two points, because a
                goal a company reports against is a weak signal about whether it can deliver.
              </p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {SDGS.map((n) => {
                  const on = company.sdgPreferences.includes(n);
                  return (
                    <li key={n}>
                      <button
                        aria-pressed={on}
                        className={cx(
                          "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition-colors",
                          on ? "bg-tint-mint text-on-tint-mint" : "bg-card-muted text-ink-muted hover:bg-container",
                          !editable && "pointer-events-none opacity-60",
                        )}
                        onClick={() =>
                          dispatch({
                            type: "profile/update",
                            patch: { sdgPreferences: toggleIn(company.sdgPreferences, n) },
                          })
                        }
                        type="button"
                      >
                        SDG {n}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </Enter>

          <Enter index={6}>
            <Card className="p-6">
              <h2 className="headline-md text-ink">Notifications</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Which of the automation rules are allowed to interrupt you. Switching one off stops
                the alert, not the rule —{" "}
                <Link className="font-semibold text-navy hover:underline" href="/industry/automation">
                  the automation centre
                </Link>{" "}
                is where a rule is actually stopped.
              </p>
              <ul className="mt-4 flex flex-col">
                {state.automations
                  .filter((a) => a.results.some((r) => r.href))
                  .map((a) => (
                    <li className="border-b border-line last:border-0" key={a.id}>
                      <Toggle
                        checked={a.enabled}
                        description={a.nextAction}
                        label={a.name}
                        onChange={() => dispatch({ type: "automation/toggle", id: a.id })}
                      />
                    </li>
                  ))}
              </ul>
            </Card>
          </Enter>
        </div>

        {/* ------------------------------------------------- live effect */}
        <div className="xl:sticky xl:top-24 xl:h-fit">
          <Enter index={1}>
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-sm bg-tint-orchid text-on-tint-orchid">
                  <Icon name="bot" size={17} />
                </span>
                <h2 className="headline-md text-ink">Effect, live</h2>
              </div>

              <dl className="mt-5 flex flex-col gap-4">
                <div>
                  <dt className="label-caps text-ink-faint">Challenges matched above 70%</dt>
                  <dd className="stat-number text-ink">{matches.length}</dd>
                  <dd className="text-xs text-ink-muted">
                    out of {openChallenges.length} open to a partner
                  </dd>
                </div>
                <div>
                  <dt className="label-caps text-ink-faint">People within reach</dt>
                  <dd className="text-xl font-bold text-ink tabular-nums">
                    {people(matches.reduce((s, m) => s + m.challenge.affected, 0))}
                  </dd>
                </div>
                <div>
                  <dt className="label-caps text-ink-faint">Funding those would need</dt>
                  <dd className="text-xl font-bold text-ink tabular-nums">
                    {rupees(matches.reduce((s, m) => s + m.challenge.fundingRequired, 0))}
                  </dd>
                </div>
              </dl>

              {flagship && flagshipMatch ? (
                <div className="mt-6 border-t border-line pt-5">
                  <p className="label-caps text-ink-faint">One challenge, scored live</p>
                  <div className="mt-3 flex items-center gap-4">
                    <MatchRing band={flagshipMatch.band} score={flagshipMatch.score} size={64} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink">{flagship.title}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">{flagship.id}</p>
                    </div>
                  </div>
                  <ul className="mt-4 flex flex-col gap-2">
                    {flagshipMatch.factors.map((f) => (
                      <li key={f.key}>
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-xs text-ink-muted">{f.label}</span>
                          <span className="text-xs font-bold text-ink tabular-nums">
                            {((f.score * f.weight) / 100).toFixed(1)} / {f.weight}
                          </span>
                        </div>
                        <Progress
                          className="mt-1"
                          label={f.label}
                          size="sm"
                          tone={f.level === "yes" ? "impact" : f.level === "partial" ? "community" : "navy"}
                          value={f.score}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="mt-5 rounded-md bg-card-muted p-3 text-xs text-ink-muted">
                Nothing here is saved to a server yet. The store holds the change for this session,
                and <code className="text-ink">CompanyProfileService.update</code> is where the request
                will go.
              </p>
            </Card>
          </Enter>
        </div>
      </div>
    </div>
  );
}
