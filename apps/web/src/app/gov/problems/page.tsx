"use client";

/**
 * The problem register.
 *
 * Opened from a KPI card it arrives pre-filtered to exactly the rows behind
 * that number (`?view=critical`), so a figure on the overview and the list that
 * explains it are never two different definitions.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import {
  CategoryChip,
  SeverityBadge,
  SlaChip,
  StatusBadge,
} from "@/components/gov/pieces";
import {
  ButtonLink,
  Card,
  Cell,
  Enter,
  EmptyState,
  Row,
  Table,
} from "@/components/ui";
import { SearchField, Select, Tabs } from "@/components/ui-interactive";
import { count } from "@/lib/gov/format";
import {
  applyFilters,
  CATEGORY_LABEL,
  EMPTY_FILTERS,
  isViewKey,
  VIEWS,
  type ProblemFilters,
  type ViewKey,
} from "@/lib/gov/filters";
import { departmentName, nextAction, officerName, villageName } from "@/lib/gov/selectors";
import { govSeed, useGov } from "@/lib/gov/store";

const TAB_VIEWS: ViewKey[] = [
  "active",
  "critical",
  "pending_validation",
  "awaiting_sponsorship",
  "funding_required",
  "in_progress",
  "overdue",
  "verification_pending",
  "resolved",
];

function ProblemsInner() {
  const { ranked, state } = useGov();
  const router = useRouter();
  const params = useSearchParams();
  const viewParam = params.get("view");

  const [filters, setFilters] = useState<ProblemFilters>({
    ...EMPTY_FILTERS,
    view: isViewKey(viewParam) ? viewParam : "active",
  });

  const view = isViewKey(viewParam) ? viewParam : filters.view;
  const set = (patch: Partial<ProblemFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const rows = useMemo(
    () => applyFilters(ranked, { ...filters, view }, { villageName, departmentName }),
    [ranked, filters, view],
  );

  const tabs = TAB_VIEWS.map((key) => ({
    id: key,
    label: VIEWS[key].label,
    count: ranked.filter(VIEWS[key].test).length,
  }));

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="headline-xl text-ink">
              <span className="font-medium">Problem</span> <span className="font-bold">register</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              {VIEWS[view].description}. {count(rows.reduce((s, p) => s + p.reportCount, 0))} citizen
              reports are folded into these {rows.length} problems.
            </p>
          </div>
          <div className="flex gap-3">
            <ButtonLink href="/gov/map" icon="map" tone="outline">
              Map view
            </ButtonLink>
            <ButtonLink href="/gov/priority" icon="trending-up">
              Priority queue
            </ButtonLink>
          </div>
        </div>
      </Enter>

      <Enter index={1}>
        <Card className="p-5">
          <Tabs
            onChange={(id) => {
              set({ view: id as ViewKey });
              router.replace(`/gov/problems?view=${id}`, { scroll: false });
            }}
            tabs={tabs}
            value={view}
          />

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SearchField
              label="Search problems"
              onChange={(v) => set({ query: v })}
              placeholder="Problem ID, village, keyword…"
              size="sm"
              value={filters.query}
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
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Select
              label="Sponsorship"
              onChange={(v) => set({ sponsorship: v })}
              options={["All", "awaiting", "invited", "interested", "proposal", "approved", "declined", "not_eligible"]}
              value={filters.sponsorship}
            />
            <Select
              label="Funding"
              onChange={(v) => set({ funding: v })}
              options={["All", "not_required", "pending", "recommended", "approved", "rejected"]}
              value={filters.funding}
            />
          </div>
        </Card>
      </Enter>

      <Enter index={2}>
        <Card className="overflow-hidden pb-2">
          {rows.length === 0 ? (
            <div className="p-6">
              <EmptyState
                actionHref="/gov/problems?view=active"
                actionLabel="Clear filters"
                icon="search"
                message="No problem in your jurisdiction matches this combination of filters."
                title="Nothing here"
              />
            </div>
          ) : (
            <Table
              head={["Rank", "Problem", "Severity", "Reports", "Affected", "Department", "Status", "SLA", ""]}
            >
              {rows.map((p) => {
                const action = nextAction(p);
                return (
                  <Row key={p.id}>
                    <Cell className="font-bold tabular-nums">#{p.rank}</Cell>
                    <Cell>
                      <Link className="block max-w-80" href={`/gov/problems/${p.id}`}>
                        <span className="block truncate font-bold text-ink hover:underline">
                          {p.title}
                        </span>
                      </Link>
                      <span className="mt-0.5 flex items-center gap-2 text-xs text-ink-muted">
                        <span className="font-semibold">{p.id}</span>
                        <CategoryChip category={p.category} />
                        <span className="truncate">{p.villageIds.map(villageName).join(", ")}</span>
                      </span>
                    </Cell>
                    <Cell>
                      <SeverityBadge dense severity={p.severity} />
                    </Cell>
                    <Cell className="tabular-nums">
                      {count(p.reportCount)}
                      {p.duplicateCount ? (
                        <span className="block text-xs text-ink-faint">
                          {p.duplicateCount} duplicates folded
                        </span>
                      ) : null}
                    </Cell>
                    <Cell className="tabular-nums">{count(p.affected)}</Cell>
                    <Cell>
                      <span className="block text-sm">{departmentName(p.departmentId)}</span>
                      <span className="block text-xs text-ink-muted">
                        {officerName(p.assignedOfficerId, state.officers)}
                      </span>
                    </Cell>
                    <Cell>
                      <StatusBadge dense status={p.status} />
                    </Cell>
                    <Cell>
                      <SlaChip dense dueAt={p.slaDueAt} />
                    </Cell>
                    <Cell>
                      <ButtonLink href={action.href} size="sm" tone={action.tone}>
                        {action.label}
                      </ButtonLink>
                    </Cell>
                  </Row>
                );
              })}
            </Table>
          )}
        </Card>
      </Enter>

      <p className="flex items-center justify-center gap-2 pb-4 text-xs text-ink-faint">
        <Icon name="lock" size={12} />
        Showing only problems inside {state.user.designation.split(",")[1]?.trim() ?? "your jurisdiction"} — {ranked.length} of {govSeed.problems.length} records in the system.
      </p>
    </div>
  );
}

export default function ProblemsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-ink-muted">Loading register…</div>}>
      <ProblemsInner />
    </Suspense>
  );
}
