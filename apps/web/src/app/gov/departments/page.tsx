"use client";

/**
 * Departments — the routing table made visible.
 *
 * The point of the screen is accountability: which categories a department
 * owns, what it is carrying, how fast it closes work, and where an officer
 * overruled the automatic routing.
 */

import Link from "next/link";
import { BudgetBar } from "@/components/gov/charts";
import { SeverityBadge, SlaChip, StatusBadge } from "@/components/gov/pieces";
import { Badge, Card, Enter, Progress, cx } from "@/components/ui";
import { count, relative, rupees } from "@/lib/gov/format";
import { CATEGORY_LABEL } from "@/lib/gov/filters";
import { officerLoad, officerName } from "@/lib/gov/selectors";
import { govSeed, useGov } from "@/lib/gov/store";

export default function DepartmentsPage() {
  const { ranked, state } = useGov();

  const overrides = ranked.filter((p) => p.ai.routingOverridden);

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="min-w-0">
          <h1 className="headline-xl text-ink">
            <span className="font-medium">Departments</span>{" "}
            <span className="font-bold">& routing</span>
          </h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            Problems are routed by category and jurisdiction the moment they are validated. An
            officer can overrule the routing; the override is logged against their name.
          </p>
        </div>
      </Enter>

      <div className="grid gap-4 lg:grid-cols-2">
        {govSeed.departments.map((dept, i) => {
          const problems = ranked.filter((p) => p.departmentId === dept.id);
          const open = problems.filter((p) => p.status !== "resolved" && p.status !== "rejected");
          const critical = open.filter((p) => p.severity === "critical").length;
          const officers = state.officers.filter((o) => o.departmentId === dept.id);
          const avgCompletion =
            officers.reduce((s, o) => s + o.completionRate, 0) / Math.max(1, officers.length);

          return (
            <Enter index={i} key={dept.id}>
              <Card className="flex h-full flex-col p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="headline-md text-ink">{dept.name}</h2>
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      {dept.categories.map((c) => (
                        <span
                          className="rounded-full bg-card-muted px-2.5 py-1 text-[11px] font-semibold text-ink-muted"
                          key={c}
                        >
                          {CATEGORY_LABEL[c]}
                        </span>
                      ))}
                    </p>
                  </div>
                  <Badge icon="clock" tone="neutral">
                    {dept.slaHours}h SLA
                  </Badge>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-md bg-card-muted p-3">
                    <dt className="label-caps text-ink-faint">Open</dt>
                    <dd className="text-lg font-bold text-ink tabular-nums">{open.length}</dd>
                  </div>
                  <div className="rounded-md bg-card-muted p-3">
                    <dt className="label-caps text-ink-faint">Critical</dt>
                    <dd className={cx("text-lg font-bold tabular-nums", critical ? "text-danger" : "text-ink")}>
                      {critical}
                    </dd>
                  </div>
                  <div className="rounded-md bg-card-muted p-3">
                    <dt className="label-caps text-ink-faint">Officers</dt>
                    <dd className="text-lg font-bold text-ink tabular-nums">{officers.length}</dd>
                  </div>
                  <div className="rounded-md bg-card-muted p-3">
                    <dt className="label-caps text-ink-faint">Completion</dt>
                    <dd className="text-lg font-bold text-ink tabular-nums">
                      {Math.round(avgCompletion)}%
                    </dd>
                  </div>
                </dl>

                <div className="mt-4">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-ink-muted">Budget</span>
                    <span className="font-bold text-ink tabular-nums">
                      {rupees(dept.budgetSpent)} spent · {rupees(dept.budgetAllocated - dept.budgetCommitted)} free
                    </span>
                  </div>
                  <div className="mt-2">
                    <BudgetBar
                      allocated={dept.budgetAllocated}
                      committed={dept.budgetCommitted}
                      label={dept.name}
                      spent={dept.budgetSpent}
                    />
                  </div>
                </div>

                <h3 className="mt-5 text-sm font-bold text-ink">Officers</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {officers.map((o) => {
                    const load = officerLoad(o);
                    return (
                      <li className="flex flex-wrap items-center gap-3 rounded-md bg-card-muted p-3" key={o.id}>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-ink">{o.name}</span>
                          <span className="block text-xs text-ink-muted">{o.designation}</span>
                        </span>
                        <span className="w-28 shrink-0">
                          <Progress
                            label={`${o.name} workload`}
                            size="sm"
                            tone={load > 100 ? "community" : "navy"}
                            value={Math.min(100, load)}
                          />
                          <span className="mt-1 block text-right text-[11px] text-ink-muted tabular-nums">
                            {load}% load
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <h3 className="mt-5 text-sm font-bold text-ink">Open work</h3>
                <ul className="mt-2 flex flex-col gap-2">
                  {open.slice(0, 4).map((p) => (
                    <li className="flex flex-wrap items-center gap-2 rounded-md bg-card-muted p-3" key={p.id}>
                      <Link
                        className="min-w-0 flex-1 truncate text-sm font-semibold text-ink hover:underline"
                        href={`/gov/problems/${p.id}`}
                      >
                        {p.title}
                      </Link>
                      <SeverityBadge dense severity={p.severity} />
                      <SlaChip dense dueAt={p.slaDueAt} />
                    </li>
                  ))}
                  {open.length === 0 ? (
                    <li className="rounded-md bg-card-muted p-3 text-sm text-ink-muted">
                      Nothing open — every problem in this head is closed or verified.
                    </li>
                  ) : null}
                </ul>
              </Card>
            </Enter>
          );
        })}
      </div>

      <Enter index={6}>
        <Card className="p-5">
          <h2 className="headline-md text-ink">Routing overrides</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Automatic routing is right most of the time. When it is not, the correction and its
            reason are recorded — that record is how the rules get better.
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {overrides.map((p) => (
              <li className="rounded-md bg-card-muted p-4" key={p.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <Link className="text-sm font-bold text-ink hover:underline" href={`/gov/problems/${p.id}`}>
                    {p.title}
                  </Link>
                  <StatusBadge dense status={p.status} />
                </div>
                <p className="mt-1 text-sm text-ink-muted">{p.ai.routingOverridden!.reason}</p>
                <p className="mt-1 text-xs text-ink-faint">
                  {officerName(p.ai.routingOverridden!.byOfficerId, state.officers)} ·{" "}
                  {relative(p.ai.routingOverridden!.at)} · {count(p.reportCount)} reports affected
                </p>
              </li>
            ))}
            {overrides.length === 0 ? (
              <li className="rounded-md bg-card-muted p-4 text-sm text-ink-muted">
                No routing has been overridden in this jurisdiction.
              </li>
            ) : null}
          </ul>
        </Card>
      </Enter>
    </div>
  );
}
