"use client";

/**
 * Impact analytics.
 *
 * The screen a partner shows their board. It opens with the one relationship
 * that matters — money in, people out, cost per person — and only then breaks
 * into the cuts. The recognition table is at the bottom and its formula is
 * printed beside it, because a leaderboard whose scoring is hidden is a
 * marketing device.
 */

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Badge, Card, Enter, Progress, cx } from "@/components/ui";
import { Segmented } from "@/components/ui-interactive";
import { BarList, TrendChart } from "@/components/gov/charts";
import { ImpactPerRupeeBlock } from "@/components/industry/pieces";
import { DOMAIN_LABEL } from "@/lib/industry/challenges";
import { people, rupees } from "@/lib/industry/format";
import { LEADERBOARD, LEADERBOARD_FORMULA, MONTHLY } from "@/lib/industry/mock-data";
import {
  deliveryRecord,
  domainRollup,
  geographyRollup,
  impactPerRupee,
  pilotTargets,
  sdgRollup,
  universityRollup,
} from "@/lib/industry/selectors";
import { useIndustry } from "@/lib/industry/store";

const SERIES = ["Investment", "People reached"];

export default function ImpactPage() {
  const { state, totals } = useIndustry();
  const [series, setSeries] = useState(1);

  const impact = impactPerRupee(state.projects);
  const record = deliveryRecord(state.projects);
  const pilots = pilotTargets(state.projects);
  const byDomain = domainRollup(state.projects, state.challenges);
  const byGeography = geographyRollup(state.projects, state.challenges);
  const bySdg = sdgRollup(state.projects);
  const byUniversity = universityRollup(state.projects).filter((u) => u.projects.length);
  const self = LEADERBOARD.find((l) => l.isSelf);

  const trend = MONTHLY.map((m) => ({
    label: m.month,
    a: series === 0 ? m.investment : m.peopleImpacted,
    b: series === 0 ? m.investment * 0.72 : m.peopleImpacted * 0.6,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="min-w-0">
          <h1 className="headline-xl text-ink">
            <span className="font-medium">Impact</span> <span className="font-bold">analytics</span>
          </h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            Every figure here is a fold over the {totals.projects} projects in your portfolio. None
            of them is stored as a total, so a change to one project moves every number on this page.
          </p>
        </div>
      </Enter>

      {/* ------------------------------------------------- impact per rupee */}
      <Enter index={1}>
        <Card className="p-6 lg:p-8">
          <h2 className="headline-lg text-ink">Impact per rupee</h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            The number CSR is actually judged on, and the one most impact reports avoid printing.
          </p>
          <div className="mt-6">
            <ImpactPerRupeeBlock
              clustersClosed={impact.clustersClosed}
              costPerBeneficiary={impact.costPerBeneficiary}
              investment={impact.investment}
              peopleImpacted={impact.peopleImpacted}
              verifiedShare={impact.verifiedShare}
            />
          </div>
        </Card>
      </Enter>

      {/* ------------------------------------------------------- headline */}
      <Enter index={2}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <Tile hint="committed across the portfolio" label="Total investment" value={rupees(totals.committed)} />
          <Tile hint={`${totals.communities} villages & wards`} label="People reached" value={people(totals.peopleImpacted)} />
          <Tile hint={`${totals.completed} projects fully closed`} label="Clusters resolved" value={String(totals.clustersClosed)} />
          <Tile hint={`across ${totals.universities} universities`} label="Students supported" value={String(totals.students)} />
          <Tile hint={`${pilots.met} of ${pilots.total} pilot targets met`} label="Pilots deployed" value={String(totals.pilotsRunning)} />
        </div>
      </Enter>

      {/* ---------------------------------------------------------- trend */}
      <Enter index={3}>
        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="headline-md text-ink">Twelve months</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {series === 0
                  ? "Deployment against the trailing average."
                  : "People reached each month, against the trailing average."}
              </p>
            </div>
            <Segmented label="Series" onChange={setSeries} segments={SERIES} value={series} />
          </div>
          <div className="mt-5">
            <TrendChart
              aLabel={SERIES[series]}
              bLabel="Trailing average"
              caption={
                series === 0
                  ? `${rupees(MONTHLY.reduce((s, m) => s + m.investment, 0))} deployed over twelve months`
                  : `${people(MONTHLY.reduce((s, m) => s + m.peopleImpacted, 0))} people reached over twelve months`
              }
              points={trend}
              unit="months"
            />
          </div>
        </Card>
      </Enter>

      {/* ------------------------------------------------------- breakdowns */}
      <Enter index={4}>
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-6">
            <h2 className="headline-md text-ink">By domain</h2>
            <div className="mt-5">
              <BarList
                data={byDomain.map((d) => ({
                  label: DOMAIN_LABEL[d.domain],
                  value: d.peopleImpacted,
                  hint: `${rupees(d.investment)} · ${d.projects} project${d.projects === 1 ? "" : "s"}`,
                }))}
                format={(v) => `${people(v)} people`}
              />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="headline-md text-ink">By geography</h2>
            <div className="mt-5">
              <BarList
                data={byGeography.map((g) => ({
                  label: g.state,
                  value: g.investment,
                  hint: `${people(g.peopleImpacted)} people · ${g.projects} project${g.projects === 1 ? "" : "s"}`,
                  tone: "impact" as const,
                }))}
                format={(v) => rupees(v)}
              />
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="headline-md text-ink">Delivery quality</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Whether the work lands when it was promised, and whether the pilots hit the targets
              agreed at commitment.
            </p>
            <div className="mt-5 flex flex-col gap-5">
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-muted">Milestones on time</span>
                  <span className="text-sm font-bold text-ink tabular-nums">
                    {record.onTime} / {record.completed}
                  </span>
                </div>
                <Progress className="mt-2" label="Milestones on time" tone="impact" value={record.percent} />
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-muted">Pilot targets met</span>
                  <span className="text-sm font-bold text-ink tabular-nums">
                    {pilots.met} / {pilots.total}
                  </span>
                </div>
                <Progress className="mt-2" label="Pilot targets met" tone="navy" value={pilots.percent} />
              </div>
              <div>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-ink-muted">Reach verified by citizens</span>
                  <span className="text-sm font-bold text-ink tabular-nums">
                    {impact.verifiedShare}%
                  </span>
                </div>
                <Progress className="mt-2" label="Verified reach" tone="mint" value={impact.verifiedShare} />
              </div>
            </div>
          </Card>
        </div>
      </Enter>

      {/* ------------------------------------------------------------ sdg */}
      <Enter index={5}>
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-6 xl:col-span-2">
            <h2 className="headline-md text-ink">Your SDG contribution</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Attributed per project, so one project serving three goals counts once against each
              rather than being split into thirds.
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {bySdg.map((s) => (
                <li className="rounded-md bg-card-muted p-4" key={s.number}>
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-bold text-ink">
                      SDG {s.number} — {s.short}
                    </span>
                    <span className="text-lg font-bold text-ink tabular-nums">{s.projects}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {people(s.peopleImpacted)} people · {rupees(s.investment)} committed
                  </p>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="headline-md text-ink">University partners</h2>
            <ul className="mt-5 flex flex-col gap-3">
              {byUniversity.map((u) => (
                <li className="rounded-md bg-card-muted p-4" key={u.university.id}>
                  <p className="text-sm font-bold text-ink">{u.university.shortName}</p>
                  <p className="text-xs text-ink-muted">
                    {u.projects.length} project{u.projects.length === 1 ? "" : "s"} · {u.students}{" "}
                    students · {rupees(u.investment)}
                  </p>
                  <Progress
                    className="mt-2"
                    label={`${u.university.shortName} reach`}
                    size="sm"
                    tone="orchid"
                    value={(u.peopleImpacted / Math.max(1, totals.peopleImpacted)) * 100}
                  />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Enter>

      {/* --------------------------------------------------- recognition */}
      <Enter index={6}>
        <Card className="p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              <h2 className="headline-lg text-ink">Partner recognition</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Rupees are deliberately absent from this scoring. A company that writes the largest
                cheque and is never heard from again should not out-rank one that put four engineers
                into a student team for a year — so the factors are outcomes, delivery, employee time
                and citizen satisfaction, every one of which a small firm can win on.
              </p>
            </div>
            {self ? (
              <Badge icon="trophy" tone="gold">
                You are #{self.rank} of {LEADERBOARD.length}
              </Badge>
            ) : null}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
            <ol className="flex flex-col gap-2">
              {LEADERBOARD.map((entry) => {
                const moved = entry.previousRank - entry.rank;
                return (
                  <li
                    className={cx(
                      "flex flex-wrap items-center gap-4 rounded-lg p-4",
                      entry.isSelf ? "bg-primary-fixed ring-2 ring-primary/20" : "bg-card-muted",
                    )}
                    key={entry.companyId}
                  >
                    <span className="flex w-10 shrink-0 flex-col items-center">
                      <span className="text-lg font-bold text-ink tabular-nums">{entry.rank}</span>
                      {moved !== 0 ? (
                        <span
                          className={cx(
                            "flex items-center gap-0.5 text-[11px] font-bold tabular-nums",
                            moved > 0 ? "text-impact-deep" : "text-danger",
                          )}
                        >
                          <Icon
                            className={moved > 0 ? "" : "rotate-90"}
                            name="arrow-up-right"
                            size={11}
                          />
                          {Math.abs(moved)}
                        </span>
                      ) : null}
                    </span>

                    <Avatar name={entry.company} size={40} tone={entry.isSelf ? "ink" : "navy"} />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-ink">
                        {entry.company}
                        {entry.isSelf ? " (you)" : ""}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">{entry.sector}</span>
                      <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                        {entry.factors.map((f) => (
                          <span className="text-[11px] text-ink-muted" key={f.label}>
                            {f.label}: <span className="font-semibold text-ink">{f.value}</span>
                          </span>
                        ))}
                      </span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="block text-xl font-bold text-ink tabular-nums">
                        {entry.score}
                      </span>
                      <span className="label-caps block text-ink-faint">score</span>
                    </span>
                  </li>
                );
              })}
            </ol>

            <Card className="h-fit bg-card-muted p-5" tone="flat">
              <h3 className="font-bold text-ink">How the score is built</h3>
              <ul className="mt-3 flex flex-col gap-3">
                {LEADERBOARD_FORMULA.map((f) => (
                  <li key={f.label}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs text-ink-muted">{f.label}</span>
                      <span className="text-xs font-bold text-ink tabular-nums">{f.weight}%</span>
                    </div>
                    <Progress className="mt-1" label={f.label} size="sm" value={f.weight * 4} />
                  </li>
                ))}
              </ul>
              <p className="mt-4 rounded-md bg-card p-3 text-xs text-ink-muted">
                <Icon className="mr-1 inline align-[-2px]" name="shield" size={12} />
                Money committed is not a factor and cannot be made one. Spending more does not move
                a company up this table.
              </p>
            </Card>
          </div>
        </Card>
      </Enter>
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="p-5">
      <p className="label-caps text-ink-faint">{label}</p>
      <p className="stat-number mt-1 text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>
    </Card>
  );
}
