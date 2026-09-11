"use client";

/**
 * Projects.
 *
 * The same work the Teams screen shows, read from the delivery side: how far
 * each project has got, how many milestones are signed off, and what is either
 * waiting on the institution or waiting on the team.
 *
 * The two red flags are separated on purpose. A milestone *awaiting review* is
 * the institution's debt; one in *changes requested* is the team's. Collapsing
 * them into "blocked" would hide which of the two a registrar can fix.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, Card, Enter, PageHeading, Progress, StatTile, cx } from "@/components/ui";
import { SearchField, Tabs } from "@/components/ui-interactive";
import {
  EmptyState,
  Loaded,
  NoResults,
  StageTrack,
} from "@/components/institute/pieces";
import { InstituteApi } from "@/lib/institute/service";
import { useResource } from "@/lib/institute/use-resource";
import { plural, shortDate } from "@/lib/institute/format";
import type { Project } from "@/lib/institute/types";

export default function ProjectsPage() {
  const [tab, setTab] = useState("live");
  const [query, setQuery] = useState("");
  const projects = useResource(() => InstituteApi.projects(), []);
  const all = useMemo(() => projects.data ?? [], [projects.data]);

  const changesRequested = (p: Project) =>
    p.milestones.filter((m) => m.status === "changes_requested").length;

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = all.filter(
      (p) =>
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.team?.name ?? "").toLowerCase().includes(q) ||
        (p.team?.guide ?? "").toLowerCase().includes(q),
    );
    return {
      live: rows.filter((p) => p.phase !== "completed"),
      blocked: rows.filter((p) => p.awaitingReview > 0 || changesRequested(p) > 0),
      completed: rows.filter((p) => p.phase === "completed"),
      all: rows,
    };
  }, [all, query]);

  const shown = groups[tab as keyof typeof groups] ?? groups.all;

  const totals = {
    live: all.filter((p) => p.phase !== "completed").length,
    completed: all.filter((p) => p.phase === "completed").length,
    awaiting: all.reduce((a, p) => a + p.awaitingReview, 0),
    changes: all.reduce((a, p) => a + changesRequested(p), 0),
  };

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <PageHeading
          emphasis="projects"
          subtitle="Every piece of work this institution is carrying, from a validated citizen problem through to a signed-off handover."
          title="Delivery"
        />
      </Enter>

      <Loaded
        empty={
          <Card className="p-6">
            <EmptyState
              actionHref="/institute/teams"
              actionLabel="Open teams"
              icon="clipboard"
              message="A project appears once a team's work is funded or formally begun. Forming teams is the step before this one."
              title="No projects yet"
              tone="info"
            />
          </Card>
        }
        isEmpty={() => all.length === 0}
        resource={projects}
      >
        {() => (
          <>
            <Enter index={1}>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 [&>*]:min-w-0">
                <StatTile icon="clipboard" label="Live" tone="navy" value={String(totals.live)} />
                <StatTile
                  icon="check-circle"
                  label="Completed"
                  tone="mint"
                  value={String(totals.completed)}
                />
                <StatTile
                  hint="your decision"
                  icon="file-pen"
                  label="Awaiting review"
                  tone="clay"
                  value={String(totals.awaiting)}
                />
                <StatTile
                  hint="the team's move"
                  icon="refresh"
                  label="Changes requested"
                  tone="amber"
                  value={String(totals.changes)}
                />
              </div>
            </Enter>

            <Enter index={2}>
              <Card className="flex flex-col gap-4 p-4 sm:p-5">
                <SearchField
                  label="Search projects"
                  onChange={setQuery}
                  placeholder="Project, team or guide…"
                  size="sm"
                  value={query}
                />
                <Tabs
                  onChange={setTab}
                  tabs={[
                    { id: "live", label: "Live", count: groups.live.length },
                    { id: "blocked", label: "Needs a move", count: groups.blocked.length },
                    { id: "completed", label: "Completed", count: groups.completed.length },
                    { id: "all", label: "All", count: groups.all.length },
                  ]}
                  value={tab}
                />
              </Card>
            </Enter>

            <Enter index={3}>
              {shown.length === 0 ? (
                <Card className="p-6">
                  <NoResults
                    onClear={() => {
                      setQuery("");
                      setTab("all");
                    }}
                    what="projects"
                  />
                </Card>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
                  {shown.map((p) => (
                    <ProjectCard changes={changesRequested(p)} key={p.id} project={p} />
                  ))}
                </div>
              )}
            </Enter>
          </>
        )}
      </Loaded>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function ProjectCard({ project: p, changes }: { project: Project; changes: number }) {
  const complete = p.milestones.filter((m) => m.status === "complete").length;

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "flex size-11 shrink-0 items-center justify-center rounded-[14px]",
            p.phase === "completed"
              ? "bg-tint-mint text-on-tint-mint"
              : "bg-tint-amber text-on-tint-amber",
          )}
        >
          <Icon name="clipboard" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <Link href={`/institute/projects/${p.id}`}>
            <h2 className="headline-sm truncate text-ink hover:underline">{p.title}</h2>
          </Link>
          <p className="truncate text-sm text-ink-muted">
            {p.team?.name ?? "No team"}
            {p.team?.guide ? ` · ${p.team.guide}` : " · no guide"}
          </p>
        </div>
        <Badge dense tone={p.kind === "gov" ? "info" : "warning"}>
          {p.kind === "gov" ? "Government" : "Industry"}
        </Badge>
      </div>

      {p.awaitingReview > 0 || changes > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {p.awaitingReview > 0 ? (
            <li>
              <Badge dense icon="file-pen" tone="gold">
                {plural(p.awaitingReview, "submission")} awaiting you
              </Badge>
            </li>
          ) : null}
          {changes > 0 ? (
            <li>
              <Badge dense icon="refresh" tone="critical">
                {changes} back with the team
              </Badge>
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink">
            {complete} of {p.milestones.length} milestones
          </span>
          <span className="mono-data text-ink-muted">{p.progress}%</span>
        </div>
        <Progress
          className="mt-2"
          label={`${p.title} progress`}
          tone={p.phase === "completed" ? "mint" : "navy"}
          value={p.progress}
        />
      </div>

      {p.stage ? (
        <div className="mt-4">
          <StageTrack stage={p.stage} />
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-xs text-ink-faint">
          {p.startedAt ? `Started ${shortDate(p.startedAt)}` : "Not started"}
          {p.dueAt ? ` · due ${shortDate(p.dueAt)}` : ""}
        </span>
        <Link
          className="inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
          href={`/institute/projects/${p.id}`}
        >
          Open
          <Icon name="chevron-right" size={16} />
        </Link>
      </div>
    </Card>
  );
}
