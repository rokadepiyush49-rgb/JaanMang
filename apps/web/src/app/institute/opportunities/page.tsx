"use client";

/**
 * Opportunities.
 *
 * Validated citizen problems a student team can take on. There is no separate
 * "opportunity" record on this platform because there is no separate thing —
 * the opportunity *is* a problem the administration has already accepted as
 * real, and the institute sees the same redacted projection the industry portal
 * does: the brief, the place and the scale, never the citizen reports, the
 * reporters or the officer notes behind them.
 *
 * Anything one of your own teams has already picked up is marked as such, so
 * two teams do not start the same work.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, ButtonLink, Card, Enter, PageHeading, cx } from "@/components/ui";
import { SearchField, Tabs } from "@/components/ui-interactive";
import { SelectField } from "@/components/form";
import { EmptyState, Fact, Loaded, NoResults } from "@/components/institute/pieces";
import { useSession } from "@/lib/auth/session-context";
import { InstituteApi } from "@/lib/institute/service";
import { useResource } from "@/lib/institute/use-resource";
import { SEVERITY_TONE, ago, plural, rupees } from "@/lib/institute/format";

export default function OpportunitiesPage() {
  const session = useSession();
  const canManage = session?.permissions.includes("institute.team.manage") ?? false;

  const [tab, setTab] = useState("open");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const opportunities = useResource(() => InstituteApi.opportunities(), []);
  const all = useMemo(() => opportunities.data ?? [], [opportunities.data]);

  const categories = useMemo(
    () => [...new Set(all.map((o) => o.category))].sort(),
    [all],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = all.filter((o) => {
      if (category !== "all" && o.category !== category) return false;
      if (!q) return true;
      return (
        o.title.toLowerCase().includes(q) ||
        (o.summary ?? "").toLowerCase().includes(q) ||
        o.jurisdiction.name.toLowerCase().includes(q)
      );
    });
    return {
      open: rows.filter((o) => !o.ourTeam),
      nearby: rows.filter((o) => o.nearby && !o.ourTeam),
      ours: rows.filter((o) => o.ourTeam),
      all: rows,
    };
  }, [all, query, category]);

  const shown = groups[tab as keyof typeof groups] ?? groups.all;

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <PageHeading
          emphasis="challenges"
          subtitle="Citizen problems the administration has validated and nobody has closed. Pick one when you form a team — that is what the team's work will be measured against."
          title="Open civic"
        />
      </Enter>

      <Loaded
        empty={
          <Card className="p-6">
            <EmptyState
              icon="target"
              message="No validated problems are open right now. They appear as district administrations validate the demand citizens report."
              title="Nothing open"
              tone="info"
            />
          </Card>
        }
        isEmpty={() => all.length === 0}
        resource={opportunities}
      >
        {() => (
          <>
            <Enter index={1}>
              <Card className="flex flex-col gap-4 p-4 sm:p-5">
                <div className="flex flex-wrap items-end gap-3">
                  <SearchField
                    className="min-w-0 flex-1 basis-64"
                    label="Search opportunities"
                    onChange={setQuery}
                    placeholder="Problem, summary or place…"
                    size="sm"
                    value={query}
                  />
                  <SelectField
                    className="basis-52"
                    label="Category"
                    onChange={(e) => setCategory(e.target.value)}
                    options={[
                      { value: "all", label: "Every category" },
                      ...categories.map((c) => ({ value: c, label: c })),
                    ]}
                    value={category}
                  />
                </div>
                <Tabs
                  onChange={setTab}
                  tabs={[
                    { id: "open", label: "Open", count: groups.open.length },
                    { id: "nearby", label: "In your district", count: groups.nearby.length },
                    { id: "ours", label: "Taken by your teams", count: groups.ours.length },
                    { id: "all", label: "All", count: groups.all.length },
                  ]}
                  value={tab}
                />
              </Card>
            </Enter>

            <Enter index={2}>
              {shown.length === 0 ? (
                <Card className="p-6">
                  <NoResults
                    onClear={() => {
                      setQuery("");
                      setCategory("all");
                      setTab("all");
                    }}
                    what="opportunities"
                  />
                </Card>
              ) : (
                <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-3 [&>*]:min-w-0">
                  {shown.map((o) => (
                    <Card className="flex h-full flex-col p-5" key={o.id}>
                      <div className="flex items-start gap-3">
                        <span
                          className={cx(
                            "flex size-11 shrink-0 items-center justify-center rounded-[14px]",
                            o.ourTeam
                              ? "bg-tint-mint text-on-tint-mint"
                              : "bg-tint-clay text-on-tint-clay",
                          )}
                        >
                          <Icon name={o.ourTeam ? "check-circle" : "target"} size={22} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h2 className="headline-sm text-balance text-ink">{o.title}</h2>
                          <p className="mt-0.5 truncate text-sm text-ink-muted">
                            {o.jurisdiction.name} · posted {ago(o.postedAt)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge dense tone={SEVERITY_TONE[o.severity] ?? "neutral"}>
                          {o.severity}
                        </Badge>
                        <Badge dense tone="neutral">
                          {o.category}
                        </Badge>
                        {o.nearby ? (
                          <Badge dense icon="map-pin" tone="info">
                            your district
                          </Badge>
                        ) : null}
                      </div>

                      {o.summary ? (
                        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{o.summary}</p>
                      ) : null}

                      <dl className="mt-4 grid grid-cols-3 gap-3 [&>*]:min-w-0">
                        <Fact label="Affected" value={o.affected.toLocaleString("en-IN")} />
                        <Fact label="Reports" value={o.reportCount} />
                        <Fact label="Est. cost" value={rupees(o.estimatedCost)} />
                      </dl>

                      <div className="mt-auto border-t border-line pt-4">
                        {o.ourTeam ? (
                          <Link
                            className="inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
                            href={`/institute/teams/${o.ourTeam.id}`}
                          >
                            {o.ourTeam.name} is on this
                            <Icon name="chevron-right" size={16} />
                          </Link>
                        ) : canManage ? (
                          <ButtonLink href="/institute/teams/new" size="sm" tone="outline">
                            Form a team for this
                          </ButtonLink>
                        ) : (
                          <span className="text-xs text-ink-faint">
                            {plural(o.reportCount, "citizen report")} behind this
                          </span>
                        )}
                      </div>
                    </Card>
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
