"use client";

/**
 * Officers and workload.
 *
 * Assignment is where an automated pipeline meets a person with a finite week.
 * The screen shows load rather than headcount, and says out loud who the next
 * piece of work should go to and why.
 */

import Link from "next/link";
import { Avatar, Badge, Button, Card, CardHeader, Enter, Progress } from "@/components/ui";
import { SeverityBadge, SlaChip } from "@/components/gov/pieces";
import { count } from "@/lib/gov/format";
import { departmentName, officerLoad, recommendOfficer } from "@/lib/gov/selectors";
import { useGov } from "@/lib/gov/store";

export default function OfficersPage() {
  const { state, ranked, dispatch, can } = useGov();

  const unassigned = ranked.filter(
    (p) => !p.assignedOfficerId && p.status !== "resolved" && p.status !== "rejected",
  );

  const busiest = [...state.officers].sort((a, b) => officerLoad(b) - officerLoad(a));

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="min-w-0">
          <h1 className="headline-xl text-ink">
            <span className="font-medium">Officers</span> <span className="font-bold">& workload</span>
          </h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            Load is weighted: a critical task counts one and a half, an overdue one counts double.
            An officer at 100% is at the capacity their department agreed, not at the number of rows
            in a table.
          </p>
        </div>
      </Enter>

      <Enter index={1}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {busiest.map((o) => {
            const load = officerLoad(o);
            const theirs = ranked.filter((p) => p.assignedOfficerId === o.id);
            return (
              <Card className="flex h-full flex-col p-5" key={o.id}>
                <div className="flex items-center gap-3">
                  <Avatar name={o.name} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{o.name}</p>
                    <p className="truncate text-xs text-ink-muted">{o.designation}</p>
                  </div>
                  <Badge
                    dense
                    icon={load > 100 ? "alert-circle" : load > 80 ? "clock" : "check-circle"}
                    tone={load > 100 ? "critical" : load > 80 ? "warning" : "success"}
                  >
                    {load}%
                  </Badge>
                </div>

                <div className="mt-4">
                  <Progress
                    label={`${o.name} workload`}
                    tone={load > 100 ? "community" : "navy"}
                    value={Math.min(100, load)}
                  />
                </div>

                <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
                  {[
                    { k: "Active", v: o.activeTasks },
                    { k: "Critical", v: o.criticalTasks },
                    { k: "Overdue", v: o.overdue },
                    { k: "Done", v: `${o.completionRate}%` },
                  ].map((s) => (
                    <div className="rounded-md bg-card-muted p-2" key={s.k}>
                      <dt className="text-[11px] text-ink-muted">{s.k}</dt>
                      <dd className="text-sm font-bold text-ink tabular-nums">{s.v}</dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-3 text-xs text-ink-muted">
                  {departmentName(o.departmentId)} · average resolution {o.avgResolutionDays} days ·{" "}
                  {o.phone}
                </p>

                <ul className="mt-4 flex flex-1 flex-col gap-2">
                  {theirs.slice(0, 3).map((p) => (
                    <li className="flex items-center gap-2 rounded-md bg-card-muted p-2.5" key={p.id}>
                      <Link
                        className="min-w-0 flex-1 truncate text-xs font-semibold text-ink hover:underline"
                        href={`/gov/problems/${p.id}`}
                      >
                        {p.title}
                      </Link>
                      <SeverityBadge dense severity={p.severity} />
                    </li>
                  ))}
                  {theirs.length === 0 ? (
                    <li className="rounded-md bg-card-muted p-2.5 text-xs text-ink-muted">
                      Nothing assigned in this jurisdiction.
                    </li>
                  ) : null}
                </ul>
              </Card>
            );
          })}
        </div>
      </Enter>

      <Enter index={2}>
        <Card>
          <CardHeader
            icon="bot"
            subtitle="Right department, lightest weighted load, best completion record as the tie-break. The recommendation is advice — the officer decides."
            title="Waiting for an owner"
          />
          <ul className="flex flex-col gap-3 p-5 pt-4">
            {unassigned.map((p) => {
              const rec = recommendOfficer(p, state.officers);
              return (
                <li className="rounded-lg bg-card-muted p-4" key={p.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link className="block" href={`/gov/problems/${p.id}#assignment`}>
                        <span className="text-sm font-bold text-ink hover:underline">{p.title}</span>
                      </Link>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                        <span className="font-semibold">{p.id}</span>
                        <span>{departmentName(p.departmentId)}</span>
                        <span>{count(p.affected)} affected</span>
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <SeverityBadge dense severity={p.severity} />
                      <SlaChip dense dueAt={p.slaDueAt} />
                    </div>
                  </div>

                  {rec ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md bg-primary-fixed p-3">
                      <Avatar name={rec.name} size={34} tone="ink" />
                      <p className="min-w-0 flex-1 text-sm text-on-primary-fixed-variant">
                        Recommended: <span className="font-bold text-on-primary-fixed">{rec.name}</span> —{" "}
                        {officerLoad(rec)}% load, {rec.criticalTasks} critical open,{" "}
                        {rec.completionRate}% completion.
                      </p>
                      {can("officer.assign") ? (
                        <Button
                          onClick={() =>
                            dispatch({ type: "officer/assign", id: p.id, officerId: rec.id })
                          }
                          size="sm"
                        >
                          Assign
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
            {unassigned.length === 0 ? (
              <li className="rounded-lg bg-card-muted p-5 text-sm text-ink-muted">
                Every open problem has an owner.
              </li>
            ) : null}
          </ul>
        </Card>
      </Enter>
    </div>
  );
}
