"use client";

/**
 * Geographic view.
 *
 * The map is a filter surface, not an illustration: the pins, the facet
 * controls and the list beside them are three views of one query, and selecting
 * a pin opens the cluster of problems at that village rather than a popup that
 * dead-ends.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { GovMap, groupByVillage } from "@/components/gov/map";
import { CategoryChip, SeverityBadge, SlaChip, StatusBadge } from "@/components/gov/pieces";
import { Badge, ButtonLink, Card, Enter, cx } from "@/components/ui";
import { Select } from "@/components/ui-interactive";
import { count } from "@/lib/gov/format";
import {
  applyFilters,
  CATEGORY_LABEL,
  EMPTY_FILTERS,
  VIEWS,
  type ProblemFilters,
  type ViewKey,
} from "@/lib/gov/filters";
import { departmentName, villageName } from "@/lib/gov/selectors";
import { govSeed, useGov } from "@/lib/gov/store";

export default function MapPage() {
  const { ranked } = useGov();
  const [filters, setFilters] = useState<ProblemFilters>({ ...EMPTY_FILTERS, view: "active" });
  const [selected, setSelected] = useState<string | undefined>();

  const rows = useMemo(
    () => applyFilters(ranked, filters, { villageName, departmentName }),
    [ranked, filters],
  );
  const groups = useMemo(() => groupByVillage(rows, govSeed.villages), [rows]);
  const selectedGroup = groups.find((g) => g.village.id === selected) ?? groups[0];

  const set = (patch: Partial<ProblemFilters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="headline-xl text-ink">
              <span className="font-medium">Problems on</span>{" "}
              <span className="font-bold">the ground</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              {rows.length} problems across {groups.length} villages ·{" "}
              {count(rows.reduce((s, p) => s + p.reportCount, 0))} citizen reports. Pin size follows
              report volume; the number inside is distinct problems.
            </p>
          </div>
          <ButtonLink href="/gov/problems" icon="list" tone="outline">
            Table view
          </ButtonLink>
        </div>
      </Enter>

      <Enter index={1}>
        <Card className="p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Select
              label="View"
              onChange={(v) =>
                set({
                  view: (Object.keys(VIEWS) as ViewKey[]).find((k) => VIEWS[k].label === v) ?? "active",
                })
              }
              options={Object.values(VIEWS).map((v) => v.label)}
              value={VIEWS[filters.view].label}
            />
            <Select
              label="Category"
              onChange={(v) => set({ category: v })}
              options={["All", ...Object.values(CATEGORY_LABEL)]}
              value={filters.category}
            />
            <Select
              label="Village"
              onChange={(v) => set({ village: v })}
              options={["All", ...govSeed.villages.map((v) => v.name)]}
              value={filters.village}
            />
            <Select
              label="Department"
              onChange={(v) => set({ department: v })}
              options={["All", ...govSeed.departments.map((d) => d.shortName)]}
              value={filters.department}
            />
            <Select
              label="Sponsorship"
              onChange={(v) => set({ sponsorship: v })}
              options={["All", "awaiting", "invited", "interested", "approved", "declined", "not_eligible"]}
              value={filters.sponsorship}
            />
          </div>
        </Card>
      </Enter>

      <div className="grid gap-6 xl:grid-cols-3">
        <Enter className="xl:col-span-2" index={2}>
          <Card className="overflow-hidden p-2">
            <GovMap
              height={560}
              onSelectVillage={setSelected}
              problems={rows}
              selectedVillageId={selectedGroup?.village.id}
              villages={govSeed.villages}
            />
          </Card>
        </Enter>

        <Enter index={3}>
          <Card className="p-5">
            {selectedGroup ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="label-caps text-ink-faint">Selected village</p>
                    <h2 className="headline-md text-ink">{selectedGroup.village.name}</h2>
                    <p className="mt-1 text-sm text-ink-muted">
                      Population {count(selectedGroup.village.population)} · deprivation{" "}
                      {(selectedGroup.village.deprivation * 100).toFixed(0)}/100
                    </p>
                  </div>
                  <Badge icon="map-pin" tone="info">
                    {selectedGroup.problems.length} problems
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-card-muted p-3">
                    <p className="label-caps text-ink-faint">Citizen reports</p>
                    <p className="text-xl font-bold text-ink tabular-nums">{selectedGroup.reports}</p>
                  </div>
                  <div className="rounded-md bg-card-muted p-3">
                    <p className="label-caps text-ink-faint">Worst severity</p>
                    <p className="mt-1">
                      <SeverityBadge severity={selectedGroup.worst} />
                    </p>
                  </div>
                </div>

                <ul className="mt-4 flex flex-col gap-2">
                  {selectedGroup.problems.map((p) => (
                    <li className="rounded-md bg-card-muted p-3" key={p.id}>
                      <Link className="block" href={`/gov/problems/${p.id}`}>
                        <span className="flex items-start gap-2">
                          <span className="mt-0.5 shrink-0 text-sm font-bold text-ink tabular-nums">
                            #{p.rank}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-ink hover:underline">
                              {p.title}
                            </span>
                            <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                              <CategoryChip category={p.category} />
                              <span>{count(p.reportCount)} reports</span>
                              <span>{count(p.affected)} affected</span>
                            </span>
                            <span className="mt-2 flex flex-wrap gap-1.5">
                              <StatusBadge dense status={p.status} />
                              <SlaChip dense dueAt={p.slaDueAt} />
                            </span>
                          </span>
                          <Icon className="mt-1 shrink-0 text-ink-faint" name="chevron-right" size={16} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-ink-muted">
                No problems match these filters, so there is nothing to pin.
              </p>
            )}
          </Card>
        </Enter>
      </div>

      <Enter index={4}>
        <Card className="p-5">
          <h2 className="headline-md text-ink">Villages by demand</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {groups.map((g) => (
              <li key={g.village.id}>
                <button
                  className={cx(
                    "w-full rounded-md p-3 text-left transition-colors",
                    g.village.id === selectedGroup?.village.id
                      ? "bg-primary-fixed"
                      : "bg-card-muted hover:bg-container",
                  )}
                  onClick={() => setSelected(g.village.id)}
                  type="button"
                >
                  <span className="block text-sm font-bold text-ink">{g.village.name}</span>
                  <span className="block text-xs text-ink-muted">
                    {g.problems.length} problems · {count(g.reports)} reports
                  </span>
                  <span className="mt-2 block">
                    <SeverityBadge dense severity={g.worst} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      </Enter>
    </div>
  );
}
