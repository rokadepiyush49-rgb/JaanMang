"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import {
  ButtonLink,
  Card,
  EmptyNote,
  PageHeading,
  Tag,
} from "@/components/ui";
import { filtersFrom, matchMap, toViewChallenge, type ViewChallenge } from "@/lib/student/adapters";
import { useStudent } from "@/lib/student/store";

const URGENCY_TONE = {
  Critical: "danger",
  High: "community",
  Moderate: "neutral",
} as const;

function Select({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select
        className="h-11 appearance-none rounded-md border border-line bg-card pr-10 pl-4 text-sm font-semibold text-ink focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <Icon
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted"
        name="chevron-down"
        size={16}
      />
    </label>
  );
}

function ChallengeCard({ challenge }: { challenge: ViewChallenge }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-lg bg-card shadow-level1 transition-shadow hover:shadow-level2">
      <span className="h-1.5 w-full bg-primary" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          {challenge.hackathon ? (
            <Tag icon="trophy" tone="neutral">
              HACKATHON
            </Tag>
          ) : null}
          {challenge.match ? (
            <Tag icon="star" tone="neutral">
              {challenge.match}% MATCH
            </Tag>
          ) : null}
          <Tag tone="neutral">{challenge.category.toUpperCase()}</Tag>
          <Tag tone={URGENCY_TONE[challenge.urgency]}>{challenge.urgency}</Tag>
          <span className="ml-auto flex flex-col items-end gap-1">
                        <span className="mono-data text-ink-faint">ID: {challenge.id}</span>
          </span>
        </div>

        <h3 className="mt-4 headline-lg text-ink">{challenge.title}</h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-muted">
          {challenge.summary}
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm">
          <span className="flex items-center gap-1.5 text-ink-muted">
            <Icon name="map-pin" size={16} />
            {challenge.location}
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-impact-deep">
            <Icon name="users" size={16} />
            {challenge.teams}
          </span>
        </div>

        <div className="mt-4 flex gap-3">
          <ButtonLink
            className="flex-1"
            href="/collaborate/new"
            size="sm"
            tone="primary"
          >
            Start a team
          </ButtonLink>
          <ButtonLink
            className="flex-1"
            href="/council/new"
            size="sm"
            tone="outline"
          >
            Send to council
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}

function MapView({ items, regions }: { items: ViewChallenge[]; regions: string[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {regions.map((region) => {
        const inRegion = items.filter((c) => c.region === region);
        return (
          <Card className="p-5" key={region}>
            <div className="flex items-center justify-between">
              <h3 className="headline-md flex items-center gap-2 text-ink">
                <Icon className="text-navy" name="map-pin" size={18} />
                {region}
              </h3>
              <Tag tone="navy">{inRegion.length} open</Tag>
            </div>
            <ul className="mt-4 flex flex-col divide-y divide-line">
              {inRegion.length === 0 ? (
                <li className="py-3 text-sm text-ink-faint">
                  No challenges match the current filters.
                </li>
              ) : (
                inRegion.map((c) => (
                  <li className="flex items-center gap-3 py-3" key={c.id}>
                    <span className="size-2 shrink-0 rounded-full bg-community" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {c.title}
                      </span>
                      <span className="text-xs text-ink-faint">
                        {c.location} · {c.teams}
                      </span>
                    </span>
                    <Tag tone={URGENCY_TONE[c.urgency]}>{c.urgency}</Tag>
                  </li>
                ))
              )}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

export default function ProblemExplorerPage() {
  const { state } = useStudent();
  const matches = matchMap(state.recommendations);
  const challenges = state.opportunities.map((o) => toViewChallenge(o, matches.get(o.id)));
  const filters = filtersFrom(state.opportunities);
  const [view, setView] = useState<"grid" | "map">("grid");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(filters.categories[0]);
  const [urgency, setUrgency] = useState(filters.urgency[0]);
  const [region, setRegion] = useState(filters.regions[0]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return challenges.filter((c) => {
      if (category !== filters.categories[0] && c.category !== category) return false;
      if (urgency !== filters.urgency[0] && c.urgency !== urgency) return false;
      if (region !== filters.regions[0] && c.region !== region) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.summary.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    });
  }, [category, query, region, urgency]);

  const recommended = filtered.filter((c) => c.match);
  const others = filtered.filter((c) => !c.match);
  const dirty =
    query !== "" ||
    category !== filters.categories[0] ||
    urgency !== filters.urgency[0] ||
    region !== filters.regions[0];

  function clearAll() {
    setQuery("");
    setCategory(filters.categories[0]);
    setUrgency(filters.urgency[0]);
    setRegion(filters.regions[0]);
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeading
        actions={
          <div className="flex rounded-md border border-line bg-card p-1">
            {(["map", "grid"] as const).map((mode) => (
              <button
                className={`flex h-9 items-center gap-2 rounded-sm px-4 text-sm font-semibold transition-colors ${
                  view === mode
                    ? "bg-card-muted text-ink"
                    : "text-ink-muted hover:text-ink"
                }`}
                key={mode}
                onClick={() => setView(mode)}
                type="button"
              >
                <Icon name={mode === "map" ? "map" : "dashboard"} size={16} />
                {mode === "map" ? "Map View" : "Grid View"}
              </button>
            ))}
          </div>
        }
        subtitle="Discover and collaborate on critical challenges across Jharkhand."
        title="Problem Explorer"
      />

      <Card className="flex flex-wrap items-center gap-3 p-4">
        <label className="relative w-full">
          <span className="sr-only">Search challenges</span>
          <Icon
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-faint"
            name="search"
            size={18}
          />
          <input
            className="h-11 w-full rounded-md border border-line bg-card-muted pr-4 pl-11 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary focus:outline-none"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search challenges by keyword, location, or ID…"
            type="search"
            value={query}
          />
        </label>

        <span className="label-caps flex items-center gap-2 text-ink-muted">
          <Icon name="filter" size={18} />
          Filters:
        </span>
        <Select
          label="Category"
          onChange={setCategory}
          options={filters.categories}
          value={category}
        />
        <Select
          label="Urgency"
          onChange={setUrgency}
          options={filters.urgency}
          value={urgency}
        />
        <Select
          label="Region"
          onChange={setRegion}
          options={filters.regions}
          value={region}
        />

        <div className="ml-auto flex items-center gap-4">
          <span className="text-sm font-semibold text-ink-muted tabular-nums">
            {filtered.length} Result{filtered.length === 1 ? "" : "s"}
          </span>
          <button
            className="text-sm font-bold text-ink disabled:text-ink-faint"
            disabled={!dirty}
            onClick={clearAll}
            type="button"
          >
            Clear All
          </button>
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyNote icon="search">
          No challenges match those filters yet. Try widening the region or
          clearing the urgency filter.
        </EmptyNote>
      ) : view === "map" ? (
        <MapView items={filtered} regions={filters.regions.slice(1)} />
      ) : (
        <>
          {recommended.length > 0 ? (
            <section className="rounded-xl bg-card-muted p-6">
              <h2 className="headline-lg text-ink">Recommended for You</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Based on your skills: IoT, React, and Data Analytics
              </p>
              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                {recommended.map((c) => (
                  <ChallengeCard challenge={c} key={c.id} />
                ))}
              </div>
            </section>
          ) : null}

          {others.length > 0 ? (
            <section>
              <h2 className="headline-lg text-ink">All Challenges</h2>
              <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
                {others.map((c) => (
                  <ChallengeCard challenge={c} key={c.id} />
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
