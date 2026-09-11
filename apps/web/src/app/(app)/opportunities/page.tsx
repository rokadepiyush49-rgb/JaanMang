"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Enter,
  PageHeading,
  TINT,
  cx,
} from "@/components/ui";
import { SearchField, Select, Tabs } from "@/components/ui-interactive";
import { OPPORTUNITIES, STUDENT, type Opportunity } from "@/lib/data";

const KINDS = ["All", "Internship", "Hackathon", "Fellowship", "Research", "Volunteer"];
const MODES = ["Any mode", "On-site", "Hybrid", "Remote"];
const SORTS = ["Best match", "Closing soonest", "Newest"];

function OpportunityCard({ item }: { item: Opportunity }) {
  const t = TINT[item.tint];
  const closingSoon = /in \d days?$/.test(item.closes) &&
    Number(item.closes.match(/\d+/)?.[0] ?? 99) <= 7;

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "flex size-12 shrink-0 items-center justify-center rounded-[14px]",
            t.wash,
          )}
        >
          <Icon name={item.icon} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-ink">{item.title}</h2>
          <p className="truncate text-sm text-ink-muted">{item.org}</p>
        </div>
        {item.match ? (
          <Badge dense icon="target" tone={item.match >= 90 ? "success" : "info"}>
            {item.match}%
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge dense tone="neutral">
          {item.kind}
        </Badge>
        <Badge dense icon="map-pin" tone="neutral">
          {item.location}
        </Badge>
        <Badge dense tone="info">
          {item.mode}
        </Badge>
      </div>

      <div className="mt-4 mb-5 flex flex-wrap gap-1.5">
        {item.skills.map((skill) => (
          <span
            className={cx(
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              STUDENT.skills.includes(skill)
                ? "bg-tint-mint text-on-tint-mint"
                : "bg-card-muted text-ink-muted",
            )}
            key={skill}
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="min-w-0">
          <p className="font-bold text-ink">{item.reward}</p>
          <p
            className={cx(
              "flex items-center gap-1.5 text-xs font-semibold",
              closingSoon ? "text-critical" : "text-ink-muted",
            )}
          >
            <Icon name="clock" size={13} />
            {item.closes}
          </p>
        </div>
        <div className="flex gap-2">
          <Button aria-label={`Save ${item.title}`} size="sm" tone="outline">
            <Icon name="bookmark" size={16} />
            <span className="sr-only sm:not-sr-only">Save</span>
          </Button>
          <ButtonLink href="/applications" size="sm">
            Apply
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}

export default function OpportunitiesPage() {
  const [tab, setTab] = useState("All");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState(MODES[0]);
  const [sort, setSort] = useState(SORTS[0]);

  const results = useMemo(() => {
    const filtered = OPPORTUNITIES.filter((o) => {
      if (tab !== "All" && o.kind !== tab) return false;
      if (mode !== MODES[0] && o.mode !== mode) return false;
      if (!query) return true;
      const haystack = `${o.title} ${o.org} ${o.location} ${o.skills.join(" ")}`;
      return haystack.toLowerCase().includes(query.toLowerCase());
    });
    if (sort === "Closing soonest") {
      return [...filtered].sort(
        (a, b) =>
          Number(a.closes.match(/\d+/)?.[0] ?? 999) -
          Number(b.closes.match(/\d+/)?.[0] ?? 999),
      );
    }
    if (sort === "Best match") {
      return [...filtered].sort((a, b) => (b.match ?? 0) - (a.match ?? 0));
    }
    return filtered;
  }, [tab, query, mode, sort]);

  const tabs = KINDS.map((kind) => ({
    id: kind,
    label: kind,
    count:
      kind === "All"
        ? OPPORTUNITIES.length
        : OPPORTUNITIES.filter((o) => o.kind === kind).length,
  }));

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <Enter>
        <PageHeading
          emphasis="opportunities"
          subtitle="Internships, hackathons, fellowships and volunteer builds from partners across Jharkhand — ranked against your skills."
          title="Available"
        />
      </Enter>

      <Enter index={1}>
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <SearchField
              className="flex-1"
              label="Search opportunities"
              onChange={setQuery}
              placeholder="Search by title, partner, place or skill…"
              value={query}
            />
            <div className="grid grid-cols-2 gap-3 lg:w-96">
              <Select
                hideLabel
                label="Mode"
                onChange={setMode}
                options={MODES}
                value={mode}
              />
              <Select
                hideLabel
                label="Sort by"
                onChange={setSort}
                options={SORTS}
                value={sort}
              />
            </div>
          </div>
          <Tabs onChange={setTab} tabs={tabs} value={tab} />
        </Card>
      </Enter>

      <Enter index={2}>
        <p className="text-sm text-ink-muted">
          <span className="font-bold text-ink tabular-nums">{results.length}</span>{" "}
          {results.length === 1 ? "opportunity" : "opportunities"}
          {tab !== "All" ? ` in ${tab}` : ""}
        </p>
      </Enter>

      {results.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            actionHref="/problem-explorer"
            actionLabel="Browse challenges"
            icon="search"
            message="Nothing matches those filters yet. Widen the mode, or clear the search and start from the full list."
            title="No opportunities here"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {results.map((item, i) => (
            <Enter className="h-full" index={i + 3} key={item.id}>
              <OpportunityCard item={item} />
            </Enter>
          ))}
        </div>
      )}
    </div>
  );
}
