"use client";

/**
 * Impact analytics.
 *
 * The measure of a civic system is not how many tickets it closed but whether
 * demand fell — so the headline here is demand reduction, verified by the
 * citizens who raised it, and every figure states what it was computed from.
 */

import { BarList, Donut, TrendChart } from "@/components/gov/charts";
import { Badge, Card, Enter, Progress, cx } from "@/components/ui";
import { count, percent, rupees } from "@/lib/gov/format";
import { CATEGORY_LABEL } from "@/lib/gov/filters";
import { moneyBook, villageName } from "@/lib/gov/selectors";
import { govSeed, useGov } from "@/lib/gov/store";

export default function ImpactPage() {
  const { ranked, state } = useGov();
  const money = moneyBook(ranked);

  const withAfter = ranked.filter((p) => p.evidence.after);
  const demandBefore = withAfter.reduce((s, p) => s + p.evidence.before.activeReports, 0);
  const demandAfter = withAfter.reduce((s, p) => s + (p.evidence.after?.activeReports ?? 0), 0);
  const demandReduction = demandBefore
    ? Math.round((1 - demandAfter / demandBefore) * 100)
    : 0;

  const resolved = ranked.filter((p) => p.status === "resolved");
  const beneficiaries = resolved.reduce((s, p) => s + p.affected, 0);
  const verification = ranked.reduce(
    (acc, p) => ({
      confirmed: acc.confirmed + p.verification.confirmed,
      denied: acc.denied + p.verification.denied,
    }),
    { confirmed: 0, denied: 0 },
  );
  const satisfaction = Math.round(
    (verification.confirmed / Math.max(1, verification.confirmed + verification.denied)) * 100,
  );

  const avgResolution =
    state.officers.reduce((s, o) => s + o.avgResolutionDays, 0) / Math.max(1, state.officers.length);

  const byDepartment = govSeed.departments
    .map((d) => {
      const officers = state.officers.filter((o) => o.departmentId === d.id);
      return {
        label: d.shortName,
        value: Math.round(
          officers.reduce((s, o) => s + o.completionRate, 0) / Math.max(1, officers.length),
        ),
        hint: `${ranked.filter((p) => p.departmentId === d.id).length} problems · ${rupees(d.budgetSpent)} spent`,
        tone: "impact" as const,
      };
    })
    .sort((a, b) => b.value - a.value);

  const byVillage = Object.entries(
    ranked.reduce<Record<string, number>>((acc, p) => {
      for (const v of p.villageIds) {
        acc[villageName(v)] = (acc[villageName(v)] ?? 0) + Math.round(p.affected / p.villageIds.length);
      }
      return acc;
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  const byCategory = Object.entries(
    ranked.reduce<Record<string, number>>((acc, p) => {
      acc[CATEGORY_LABEL[p.category]] = (acc[CATEGORY_LABEL[p.category]] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="min-w-0">
          <h1 className="headline-xl text-ink">
            <span className="font-medium">Impact</span> <span className="font-bold">analytics</span>
          </h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            What the spending bought. Each figure names its source — a number an officer cannot
            trace is a number they cannot defend in a gram sabha.
          </p>
        </div>
      </Enter>

      <Enter index={1}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Demand reduction",
              value: `${demandReduction}%`,
              hint: `${demandBefore} active reports before → ${demandAfter} after, across ${withAfter.length} completed problems`,
              tone: "text-impact-deep",
            },
            {
              label: "Citizen satisfaction",
              value: `${satisfaction}%`,
              hint: `${verification.confirmed} confirmations against ${verification.denied} denials`,
              tone: "text-ink",
            },
            {
              label: "People benefited",
              value: count(beneficiaries),
              hint: `Village register population inside the service area of ${resolved.length} verified fixes`,
              tone: "text-ink",
            },
            {
              label: "Average resolution",
              value: `${avgResolution.toFixed(1)} days`,
              hint: "Mean across the officers in this jurisdiction, from validation to completion",
              tone: "text-ink",
            },
          ].map((m) => (
            <Card className="p-5" key={m.label}>
              <p className="label-caps text-ink-faint">{m.label}</p>
              <p className={cx("mt-1 stat-number tabular-nums", m.tone)}>{m.value}</p>
              <p className="mt-1 text-xs text-ink-muted">{m.hint}</p>
            </Card>
          ))}
        </div>
      </Enter>

      <div className="grid gap-6 lg:grid-cols-3">
        <Enter className="lg:col-span-2" index={2}>
          <Card className="p-5">
            <h2 className="headline-md text-ink">Problems over time</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Reports received against problems resolved, twelve weeks. The gap between the lines is
              the backlog.
            </p>
            <div className="mt-4">
              <TrendChart
                aLabel="Reports received"
                bLabel="Problems resolved"
                points={govSeed.trend.map((t) => ({ label: t.week, a: t.reported, b: t.resolved }))}
              />
            </div>
          </Card>
        </Enter>

        <Enter index={3}>
          <Card className="p-5">
            <h2 className="headline-md text-ink">Who paid</h2>
            <div className="mt-4">
              <Donut
                centreLabel="from industry"
                centreValue={`${Math.round(
                  (money.sponsored / Math.max(1, money.sponsored + money.governmentFunded)) * 100,
                )}%`}
                segments={[
                  { label: "Industry CSR", value: money.sponsored, color: "var(--color-mint)" },
                  { label: "Government", value: money.governmentFunded, color: "var(--color-navy)" },
                ]}
              />
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              {rupees(money.sponsored)} of delivered work carried no government outlay.
            </p>
          </Card>
        </Enter>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Enter index={4}>
          <Card className="p-5">
            <h2 className="headline-md text-ink">Priority trend</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Average priority score of the open register, week by week.
            </p>
            <div className="mt-4">
              <TrendChart
                aLabel="Average priority"
                bLabel="Problems resolved"
                height={160}
                points={govSeed.trend.map((t) => ({ label: t.week, a: t.priorityAvg, b: t.resolved / 3 }))}
              />
            </div>
          </Card>
        </Enter>

        <Enter index={5}>
          <Card className="p-5">
            <h2 className="headline-md text-ink">Department performance</h2>
            <p className="mt-1 text-sm text-ink-muted">Completion rate, weighted by officer.</p>
            <BarList className="mt-4" data={byDepartment} format={(v) => `${v}%`} />
          </Card>
        </Enter>

        <Enter index={6}>
          <Card className="p-5">
            <h2 className="headline-md text-ink">Village impact</h2>
            <p className="mt-1 text-sm text-ink-muted">Citizens covered by problems on the register.</p>
            <BarList className="mt-4" data={byVillage} />
          </Card>
        </Enter>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Enter index={7}>
          <Card className="p-5">
            <h2 className="headline-md text-ink">Category distribution</h2>
            <BarList className="mt-4" data={byCategory} format={(v) => `${v} problems`} />
          </Card>
        </Enter>

        <Enter index={8}>
          <Card className="p-5">
            <h2 className="headline-md text-ink">Before and after</h2>
            <ul className="mt-4 flex flex-col gap-3">
              {withAfter.map((p) => {
                const before = p.evidence.before.activeReports;
                const after = p.evidence.after!.activeReports;
                const drop = Math.round((1 - after / Math.max(1, before)) * 100);
                return (
                  <li className="rounded-lg bg-card-muted p-4" key={p.id}>
                    <p className="text-sm font-bold text-ink">{p.title}</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-xs text-ink-muted">
                        Before <span className="font-bold text-ink tabular-nums">{before}</span>
                      </span>
                      <Progress className="flex-1" label={`${p.title} demand drop`} tone="impact" value={drop} />
                      <span className="text-xs text-ink-muted">
                        After <span className="font-bold text-ink tabular-nums">{after}</span>
                      </span>
                      <Badge dense icon="trending-up" tone="success">
                        −{drop}%
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-ink-muted">{p.evidence.after!.note}</p>
                  </li>
                );
              })}
              {withAfter.length === 0 ? (
                <li className="text-sm text-ink-muted">
                  No completed problem has after-evidence uploaded yet.
                </li>
              ) : null}
            </ul>
          </Card>
        </Enter>
      </div>

      <Enter index={9}>
        <Card className="p-5">
          <h2 className="headline-md text-ink">Budget against impact</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-md bg-card-muted p-4">
              <p className="label-caps text-ink-faint">Spent per person benefited</p>
              <p className="mt-1 text-xl font-bold text-ink tabular-nums">
                {rupees(Math.round(money.spent / Math.max(1, beneficiaries)), { compact: false })}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {rupees(money.spent)} spent ÷ {count(beneficiaries)} verified beneficiaries
              </p>
            </div>
            <div className="rounded-md bg-card-muted p-4">
              <p className="label-caps text-ink-faint">Budget utilisation</p>
              <p className="mt-1 text-xl font-bold text-ink tabular-nums">
                {percent((money.spent / money.allocated) * 100)}
              </p>
              <Progress className="mt-2" label="Budget utilisation" value={(money.spent / money.allocated) * 100} />
            </div>
            <div className="rounded-md bg-card-muted p-4">
              <p className="label-caps text-ink-faint">Repeat problems</p>
              <p className="mt-1 text-xl font-bold text-ink tabular-nums">
                {ranked.filter((p) => p.factors.recurrence > 60).length}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Problems whose recurrence signal is above 60 — a fix that did not hold.
              </p>
            </div>
          </div>
        </Card>
      </Enter>
    </div>
  );
}
