"use client";

/**
 * Teams.
 *
 * The registrar's working list. Teams missing a guide or missing members sort
 * to the top, because those are the only rows that represent an unfinished
 * decision — everything else is work in progress that needs watching, not
 * acting on.
 *
 * A faculty member opening this page sees only the teams they guide. That is
 * enforced by the API, not by this screen: the same permission covers both, but
 * the scope differs, and a portal that relied on hiding a card would still be
 * one URL away from another lecturer's students.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, ButtonLink, Card, Enter, PageHeading, Progress, cx } from "@/components/ui";
import { SearchField, Tabs } from "@/components/ui-interactive";
import {
  Chips,
  EmptyState,
  Loaded,
  NoResults,
  StageTrack,
  TeamStatusBadge,
} from "@/components/institute/pieces";
import { useSession } from "@/lib/auth/session-context";
import { InstituteApi } from "@/lib/institute/service";
import { useResource } from "@/lib/institute/use-resource";
import { ago, plural } from "@/lib/institute/format";
import type { Team } from "@/lib/institute/types";

export default function TeamsPage() {
  const session = useSession();
  const canManage = session?.permissions.includes("institute.team.manage") ?? false;
  const [tab, setTab] = useState("open");
  const [query, setQuery] = useState("");

  const teams = useResource(() => InstituteApi.teams(), []);

  const needsAction = (t: Team) =>
    (t.status === "forming" || t.status === "active") && (!t.guide || t.memberCount === 0);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (t: Team) =>
      !q ||
      t.name.toLowerCase().includes(q) ||
      (t.title ?? "").toLowerCase().includes(q) ||
      (t.guide?.name ?? "").toLowerCase().includes(q) ||
      (t.department?.name ?? "").toLowerCase().includes(q);

    const rows = (teams.data ?? []).filter(match);
    return {
      open: rows.filter((t) => t.status === "forming" || t.status === "active"),
      submitted: rows.filter((t) => t.status === "submitted"),
      completed: rows.filter((t) => t.status === "completed" || t.status === "archived"),
      all: rows,
    };
  }, [teams.data, query]);

  const shown = [...(groups[tab as keyof typeof groups] ?? groups.all)].sort(
    (a, b) => Number(needsAction(b)) - Number(needsAction(a)),
  );

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <PageHeading
          actions={
            canManage ? (
              <ButtonLink href="/institute/teams/new" icon="plus">
                Form a team
              </ButtonLink>
            ) : undefined
          }
          emphasis="teams"
          subtitle="Students, a faculty guide and a brief. Everything a team missing one of the three is shown first."
          title="Student"
        />
      </Enter>

      <Enter index={1}>
        <Card className="flex flex-col gap-4 p-4 sm:p-5">
          <SearchField
            label="Search teams"
            onChange={setQuery}
            placeholder="Team, brief, guide or department…"
            size="sm"
            value={query}
          />
          <Tabs
            onChange={setTab}
            tabs={[
              { id: "open", label: "Active", count: groups.open.length },
              { id: "submitted", label: "Submitted", count: groups.submitted.length },
              { id: "completed", label: "Closed", count: groups.completed.length },
              { id: "all", label: "All", count: groups.all.length },
            ]}
            value={tab}
          />
        </Card>
      </Enter>

      <Enter index={2}>
        <Loaded
          empty={
            <Card className="p-6">
              <EmptyState
                actionHref={canManage ? "/institute/teams/new" : undefined}
                actionLabel={canManage ? "Form the first team" : undefined}
                icon="rocket"
                message="A team is students plus a faculty guide plus a validated problem to work on. That is the unit everything else in this portal tracks."
                title="No teams yet"
                tone="info"
              />
            </Card>
          }
          isEmpty={(rows) => rows.length === 0}
          resource={teams}
        >
          {() =>
            shown.length === 0 ? (
              <Card className="p-6">
                <NoResults
                  onClear={() => {
                    setQuery("");
                    setTab("all");
                  }}
                  what="teams"
                />
              </Card>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
                {shown.map((t) => (
                  <TeamCard key={t.id} needsAction={needsAction(t)} team={t} />
                ))}
              </div>
            )
          }
        </Loaded>
      </Enter>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function TeamCard({ team, needsAction }: { team: Team; needsAction: boolean }) {
  return (
    <Card
      className={cx("flex h-full flex-col p-5", needsAction && "border border-warning/50")}
      tone={needsAction ? "flat" : "plain"}
    >
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "flex size-11 shrink-0 items-center justify-center rounded-[14px]",
            needsAction ? "bg-tint-amber text-on-tint-amber" : "bg-tint-mint text-on-tint-mint",
          )}
        >
          <Icon name="rocket" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <Link className="block" href={`/institute/teams/${team.id}`}>
            <h2 className="headline-sm truncate text-ink hover:underline">{team.name}</h2>
          </Link>
          <p className="truncate text-sm text-ink-muted">
            {team.title ?? "No brief yet"}
          </p>
        </div>
        <TeamStatusBadge dense status={team.status} />
      </div>

      {/* What is missing, said plainly, rather than left for the reader to
          notice from an absence. */}
      {needsAction ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {!team.guide ? (
            <li>
              <Badge dense icon="user" tone="warning">
                No faculty guide
              </Badge>
            </li>
          ) : null}
          {team.memberCount === 0 ? (
            <li>
              <Badge dense icon="users" tone="warning">
                No members
              </Badge>
            </li>
          ) : null}
        </ul>
      ) : null}

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 [&>*]:min-w-0">
        <div className="min-w-0">
          <dt className="label-caps text-ink-faint">Guide</dt>
          <dd className="truncate text-sm font-bold text-ink">
            {team.guide?.name ?? <span className="text-ink-faint">Unassigned</span>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="label-caps text-ink-faint">Department</dt>
          <dd className="truncate text-sm font-bold text-ink">
            {team.department?.code ?? <span className="text-ink-faint">—</span>}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="label-caps text-ink-faint">Members</dt>
          <dd className="text-sm font-bold text-ink tabular-nums">{team.memberCount}</dd>
        </div>
      </dl>

      <div className="mt-4">
        <StageTrack compact stage={team.stage} />
      </div>

      {team.projectId ? (
        <div className="mt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-semibold text-ink-muted">Project progress</span>
            <span className="mono-data text-ink">{team.progress}%</span>
          </div>
          <Progress
            className="mt-1.5"
            label={`${team.name} project progress`}
            size="sm"
            tone="mint"
            value={team.progress}
          />
        </div>
      ) : null}

      {team.problem ? (
        <p className="mt-4 flex items-start gap-2 rounded-md bg-card-muted px-3 py-2.5 text-xs leading-relaxed text-ink-muted">
          <Icon className="mt-0.5 shrink-0" name="map-pin" size={14} />
          <span className="min-w-0 flex-1">{team.problem.title}</span>
        </p>
      ) : null}

      <div className="mt-4">
        <Chips items={team.skills} max={4} />
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-xs text-ink-faint">
          {plural(team.memberCount, "member")} · updated {ago(team.updatedAt)}
        </span>
        <Link
          className="inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
          href={`/institute/teams/${team.id}`}
        >
          Open
          <Icon name="chevron-right" size={16} />
        </Link>
      </div>
    </Card>
  );
}
