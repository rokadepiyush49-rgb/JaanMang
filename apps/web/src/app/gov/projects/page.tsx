"use client";

/**
 * Delivery.
 *
 * A funded problem becomes a project, and a project is only finished when the
 * people who reported the problem say it is — so completion here hands straight
 * to verification rather than to a "closed" badge.
 */

import Link from "next/link";
import { ProjectCard } from "@/components/gov/pieces";
import { Badge, ButtonLink, Card, Enter, Progress } from "@/components/ui";
import { rupees, shortDate, sla } from "@/lib/gov/format";
import { officerName } from "@/lib/gov/selectors";
import { useGov } from "@/lib/gov/store";

const PHASES = ["planning", "implementation", "testing", "completed"] as const;

export default function ProjectsPage() {
  const { ranked, state } = useGov();
  const projects = ranked.filter((p) => p.project);

  const totalBudget = projects.reduce((s, p) => s + (p.project?.budget ?? 0), 0);
  const totalSpent = projects.reduce((s, p) => s + (p.project?.spent ?? 0), 0);
  const late = projects.filter((p) => sla(p.project!.dueAt).breached).length;

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="headline-xl text-ink">
              <span className="font-medium">Project</span> <span className="font-bold">delivery</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              {projects.length} projects · {rupees(totalSpent)} spent of {rupees(totalBudget)}{" "}
              committed · {late} past their committed date.
            </p>
          </div>
          <ButtonLink href="/gov/verification" icon="thumbs-up" tone="outline">
            Citizen verification
          </ButtonLink>
        </div>
      </Enter>

      <Enter index={1}>
        <Card className="p-5">
          <h2 className="headline-md text-ink">Lifecycle position</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-4">
            {PHASES.map((phase) => {
              const items = projects.filter((p) => p.project!.phase === phase);
              return (
                <li className="rounded-lg bg-card-muted p-4" key={phase}>
                  <p className="label-caps text-ink-faint capitalize">{phase}</p>
                  <p className="mt-1 stat-number text-ink">{items.length}</p>
                  <ul className="mt-2 flex flex-col gap-1">
                    {items.map((p) => (
                      <li key={p.id}>
                        <Link
                          className="block truncate text-xs font-semibold text-ink-muted hover:text-ink hover:underline"
                          href={`/gov/problems/${p.id}#project`}
                        >
                          {p.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </Card>
      </Enter>

      <div className="grid gap-4 lg:grid-cols-2">
        {projects.map((p, i) => (
          <Enter index={i} key={p.id}>
            <ProjectCard problem={p} />
          </Enter>
        ))}
        {projects.length === 0 ? (
          <Card className="p-6 lg:col-span-2">
            <p className="text-sm text-ink-muted">
              No projects yet in this jurisdiction. A project is created the moment funding is
              approved or an industry sponsorship is accepted.
            </p>
          </Card>
        ) : null}
      </div>

      <Enter index={5}>
        <Card className="p-5">
          <h2 className="headline-md text-ink">Contractor & schedule</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {projects.map((p) => {
              const s = sla(p.project!.dueAt);
              return (
                <li className="flex flex-wrap items-center gap-3 rounded-md bg-card-muted p-3" key={p.id}>
                  <span className="min-w-0 flex-1">
                    <Link
                      className="block truncate text-sm font-bold text-ink hover:underline"
                      href={`/gov/problems/${p.id}#project`}
                    >
                      {p.project!.contractor}
                    </Link>
                    <span className="block truncate text-xs text-ink-muted">
                      {p.title} · {officerName(p.project!.officerId, state.officers)}
                    </span>
                  </span>
                  <span className="w-32 shrink-0">
                    <Progress label={`${p.title} progress`} size="sm" value={p.project!.progress} />
                  </span>
                  <span className="shrink-0 text-xs text-ink-muted tabular-nums">
                    due {shortDate(p.project!.dueAt)}
                  </span>
                  <Badge dense icon={s.breached ? "alert-circle" : "clock"} tone={s.breached ? "critical" : "neutral"}>
                    {s.label}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      </Enter>
    </div>
  );
}
