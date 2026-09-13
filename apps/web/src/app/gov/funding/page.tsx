"use client";

/**
 * Government funding and budget.
 *
 * Two things live here: the approval queue that industry did not take, and the
 * money the approvals are drawn against. They belong on one screen because an
 * approval nobody can pay for is not a decision.
 */

import Link from "next/link";
import { BudgetBar, Donut } from "@/components/gov/charts";
import { SeverityBadge } from "@/components/gov/pieces";
import { Badge, Button, ButtonLink, Card, CardHeader, Enter, Progress } from "@/components/ui";
import { count, relative, rupees } from "@/lib/gov/format";
import { CATEGORY_LABEL } from "@/lib/gov/filters";
import { departmentName, moneyBook, villageName } from "@/lib/gov/selectors";
import { govSeed, useGov } from "@/lib/gov/store";

export default function FundingPage() {
  const { ranked, actions, can } = useGov();
  const money = moneyBook(ranked);

  const queue = ranked
    .filter((p) => p.funding.status === "recommended" || p.funding.status === "pending")
    .sort((a, b) => b.score - a.score);
  const approved = ranked.filter((p) => p.funding.status === "approved");

  const bySource = [
    { label: "Industry CSR", value: money.sponsored, color: "var(--color-mint)" },
    { label: "Government funded", value: money.governmentFunded, color: "var(--color-navy)" },
    {
      label: "Uncommitted budget",
      value: Math.max(0, money.available),
      color: "var(--color-track)",
    },
  ];

  const byVillage = Object.entries(
    ranked.reduce<Record<string, number>>((acc, p) => {
      if (p.funding.status !== "approved" && p.sponsorship.status !== "approved") return acc;
      const spend = p.project?.spent ?? 0;
      for (const v of p.villageIds) acc[villageName(v)] = (acc[villageName(v)] ?? 0) + spend / p.villageIds.length;
      return acc;
    }, {}),
  )
    .map(([label, value]) => ({ label, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="headline-xl text-ink">
              <span className="font-medium">Government</span> <span className="font-bold">funding</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              {queue.length === 1
                ? "One problem is waiting on a funding decision, worth "
                : `${queue.length} problems are waiting on a funding decision, worth `}
              {rupees(money.pendingAmount)} against {rupees(money.available)} uncommitted across five
              departments.
            </p>
          </div>
          <ButtonLink href="/gov/sponsorship" icon="factory" tone="outline">
            Industry sponsorship
          </ButtonLink>
        </div>
      </Enter>

      <Enter index={1}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total budget", value: money.allocated, hint: "FY allocation, all heads" },
            { label: "Committed", value: money.committed, hint: "Work orders issued" },
            { label: "Available", value: money.available, hint: "Uncommitted" },
            { label: "Pending requests", value: money.pendingAmount, hint: `${money.pendingRequests} awaiting approval` },
          ].map((m) => (
            <Card className="p-5" key={m.label}>
              <p className="label-caps text-ink-faint">{m.label}</p>
              <p className="mt-1 stat-number text-ink">{rupees(m.value)}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{m.hint}</p>
            </Card>
          ))}
        </div>
      </Enter>

      <div className="grid gap-6 xl:grid-cols-3">
        <Enter className="xl:col-span-2" index={2}>
          <Card>
            <CardHeader
              icon="banknote"
              subtitle="Every row here reached the government route because industry sponsorship closed — the transition is automatic and shown on each card."
              title="Approval queue"
            />
            <ul className="flex flex-col gap-3 p-5 pt-4">
              {queue.map((p) => (
                <li className="rounded-lg bg-card-muted p-4" key={p.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link className="block" href={`/gov/problems/${p.id}#funding`}>
                        <span className="text-sm font-bold text-ink hover:underline">{p.title}</span>
                      </Link>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                        <span className="font-semibold">{p.id}</span>
                        <span>{CATEGORY_LABEL[p.category]}</span>
                        <span>{departmentName(p.departmentId)}</span>
                        <span>{count(p.affected)} affected</span>
                        <span>rank #{p.rank}</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <SeverityBadge dense severity={p.severity} />
                      <Badge
                        dense
                        icon={p.funding.fundable ? "check-circle" : "alert-circle"}
                        tone={p.funding.fundable ? "success" : "critical"}
                      >
                        {p.funding.fundable ? "Fundable" : "Over budget"}
                      </Badge>
                    </div>
                  </div>

                  {p.sponsorship.status === "declined" ? (
                    <p className="mt-3 flex items-start gap-2 rounded-md bg-card p-3 text-xs text-ink-muted">
                      <span className="font-bold text-danger">Industry declined.</span>
                      {p.sponsorship.failureReason} The fallback attached{" "}
                      <span className="font-semibold text-ink">{p.funding.source}</span> automatically.
                    </p>
                  ) : null}

                  <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <dt className="label-caps text-ink-faint">Required</dt>
                      <dd className="text-sm font-bold text-ink tabular-nums">
                        {rupees(p.funding.required || p.estimatedCost)}
                      </dd>
                    </div>
                    <div>
                      <dt className="label-caps text-ink-faint">Dept. available</dt>
                      <dd className="text-sm font-bold text-ink tabular-nums">
                        {rupees(p.funding.departmentBudgetAvailable)}
                      </dd>
                    </div>
                    <div>
                      <dt className="label-caps text-ink-faint">Source</dt>
                      <dd className="truncate text-sm font-bold text-ink">{p.funding.source ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="label-caps text-ink-faint">Waiting</dt>
                      <dd className="text-sm font-bold text-ink">{relative(p.updatedAt)}</dd>
                    </div>
                  </dl>

                  {can("funding.approve") ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        disabled={!p.funding.fundable}
                        icon="check"
                        onClick={() => void actions.approveFunding(p.id)}
                        size="sm"
                      >
                        Approve {rupees(p.funding.required || p.estimatedCost)}
                      </Button>
                      <Button
                        icon="x"
                        onClick={() =>
                          void actions.rejectFunding(
                            p.id,
                            "Deferred to the next financial year",
                          )
                        }
                        size="sm"
                        tone="outline"
                      >
                        Reject
                      </Button>
                      <ButtonLink href={`/gov/problems/${p.id}`} size="sm" tone="ghost">
                        Open dossier
                      </ButtonLink>
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-ink-muted">
                      Approval sits with the Block Development Officer or above.
                    </p>
                  )}
                </li>
              ))}
              {queue.length === 0 ? (
                <li className="rounded-lg bg-card-muted p-5 text-sm text-ink-muted">
                  Nothing is waiting on a funding decision in this jurisdiction.
                </li>
              ) : null}
            </ul>
          </Card>
        </Enter>

        <div className="flex flex-col gap-6">
          <Enter index={3}>
            <Card className="p-5">
              <h2 className="headline-md text-ink">Funding source split</h2>
              <div className="mt-4">
                <Donut
                  centreLabel="of budget"
                  centreValue={`${Math.round((money.committed / money.allocated) * 100)}%`}
                  segments={bySource}
                />
              </div>
              <p className="mt-3 text-xs text-ink-muted">
                Every rupee of CSR is a rupee the panchayat did not have to commit.
              </p>
            </Card>
          </Enter>

          <Enter index={4}>
            <Card className="p-5">
              <h2 className="headline-md text-ink">Department budgets</h2>
              <ul className="mt-4 flex flex-col gap-4">
                {govSeed.departments.map((d) => (
                  <li key={d.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <Link
                        className="min-w-0 truncate text-sm font-semibold text-ink hover:underline"
                        href="/gov/departments"
                      >
                        {d.shortName}
                      </Link>
                      <span className="shrink-0 text-xs text-ink-muted tabular-nums">
                        {rupees(d.budgetSpent)} / {rupees(d.budgetAllocated)}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <BudgetBar
                        allocated={d.budgetAllocated}
                        committed={d.budgetCommitted}
                        label={d.shortName}
                        spent={d.budgetSpent}
                      />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-4 flex items-center gap-3 text-xs text-ink-muted">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-navy" /> spent
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-navy-tint" /> committed
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full bg-track" /> uncommitted
                </span>
              </p>
            </Card>
          </Enter>

          <Enter index={5}>
            <Card className="p-5">
              <h2 className="headline-md text-ink">Village-wise expenditure</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {byVillage.map((v) => (
                  <li className="flex items-center justify-between gap-3 text-sm" key={v.label}>
                    <span className="min-w-0 truncate text-ink-muted">{v.label}</span>
                    <span className="font-bold text-ink tabular-nums">{rupees(v.value)}</span>
                  </li>
                ))}
                {byVillage.length === 0 ? (
                  <li className="text-sm text-ink-muted">No expenditure recorded yet.</li>
                ) : null}
              </ul>
            </Card>
          </Enter>
        </div>
      </div>

      <Enter index={6}>
        <Card className="p-5">
          <h2 className="headline-md text-ink">Approved this year</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {approved.map((p) => (
              <li className="rounded-lg bg-card-muted p-4" key={p.id}>
                <Link className="block truncate text-sm font-bold text-ink hover:underline" href={`/gov/problems/${p.id}`}>
                  {p.title}
                </Link>
                <p className="mt-1 text-xs text-ink-muted">
                  {p.funding.source} · approved by {p.funding.approvedBy}
                </p>
                <p className="mt-2 text-lg font-bold text-ink tabular-nums">{rupees(p.funding.required)}</p>
                {p.project ? (
                  <div className="mt-2">
                    <Progress label={`${p.title} progress`} size="sm" value={p.project.progress} />
                    <p className="mt-1 text-xs text-ink-muted tabular-nums">
                      {rupees(p.project.spent)} spent · {p.project.progress}% complete
                    </p>
                  </div>
                ) : null}
              </li>
            ))}
            {approved.length === 0 ? (
              <li className="text-sm text-ink-muted">Nothing approved in this jurisdiction yet.</li>
            ) : null}
          </ul>
        </Card>
      </Enter>
    </div>
  );
}
