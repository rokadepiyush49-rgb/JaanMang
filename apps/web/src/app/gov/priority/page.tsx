"use client";

/**
 * Priority queue and simulator.
 *
 * The simulator exists to make one argument visible: a ranking built on report
 * volume is a different ranking from one built on need, and the difference is
 * measured in villages that never file complaints. Move a weight and the queue
 * physically re-orders — rows travel to their new position rather than being
 * repainted — because the movement is the finding.
 */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { SeverityBadge, SlaChip, WhyThisRank } from "@/components/gov/pieces";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Enter,
  SectionHeader,
  cx,
} from "@/components/ui";
import { count } from "@/lib/gov/format";
import { CATEGORY_LABEL } from "@/lib/gov/filters";
import {
  DEFAULT_WEIGHTS,
  FACTOR_HELP,
  FACTOR_KEYS,
  FACTOR_LABEL,
} from "@/lib/gov/priority";
import { nextAction, villageName } from "@/lib/gov/selectors";
import { useGov } from "@/lib/gov/store";
import type { PriorityWeights } from "@/lib/gov/types";

/** Weightings a state might actually publish, as one-click starting points. */
const PRESETS: { label: string; hint: string; weights: PriorityWeights }[] = [
  { label: "Published default", hint: "The state's notified weighting", weights: DEFAULT_WEIGHTS },
  {
    label: "Deprivation first",
    hint: "Under-served habitations lead",
    weights: { populationImpact: 20, severity: 18, deprivation: 38, coverage: 8, duration: 8, recurrence: 4, repeatedDemand: 4 },
  },
  {
    label: "Life safety",
    hint: "Consequence over headcount",
    weights: { populationImpact: 18, severity: 44, deprivation: 16, coverage: 6, duration: 8, recurrence: 4, repeatedDemand: 4 },
  },
  {
    label: "Volume led",
    hint: "What a complaint-count ranking would do",
    weights: { populationImpact: 10, severity: 10, deprivation: 4, coverage: 6, duration: 10, recurrence: 10, repeatedDemand: 50 },
  },
];

/* The queue positions rows absolutely so a weight change moves them, which
   means the row height has to be known. These are the heights the row content
   actually needs at each breakpoint — the row clips rather than overlaps if the
   content ever exceeds them. */
function rowHeightFor(width: number, comparing: boolean) {
  const base = width >= 1280 ? 88 : width >= 1024 ? 96 : width >= 640 ? 104 : 132;
  return comparing ? base + 18 : base;
}

export default function PriorityPage() {
  const { state, ranked, dispatch } = useGov();
  const [width, setWidth] = useState(1440);
  const [compare, setCompare] = useState(false);
  const rowH = rowHeightFor(width, compare);

  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const weights = state.weights;
  const dirty = FACTOR_KEYS.some((k) => weights[k] !== state.publishedWeights[k]);

  /* What a naive complaint-count ranking would produce — the comparison the
     "need ≠ votes" claim rests on. */
  const byVotes = useMemo(
    () =>
      [...ranked]
        .sort((a, b) => b.reportCount - a.reportCount)
        .map((p, i) => [p.id, i + 1] as const),
    [ranked],
  );
  const votesRank = new Map(byVotes);

  const setWeight = (key: keyof PriorityWeights, value: number) =>
    dispatch({ type: "weights/set", weights: { ...weights, [key]: value } });

  const total = FACTOR_KEYS.reduce((s, k) => s + weights[k], 0);

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="headline-xl text-ink">
              <span className="font-medium">Priority</span> <span className="font-bold">queue</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              Need is not votes. Report volume is one of seven signals and carries the smallest
              default weight, so a village that rarely complains is not pushed to the bottom of the
              list for being quiet.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              icon="refresh"
              onClick={() => dispatch({ type: "weights/reset" })}
              tone="outline"
              disabled={!dirty}
            >
              Reset
            </Button>
            <Button
              icon="check"
              onClick={() => dispatch({ type: "weights/publish" })}
              disabled={!dirty}
            >
              Publish weighting
            </Button>
          </div>
        </div>
      </Enter>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* --------------------------------------------------- simulator */}
        <Enter className="xl:col-span-1" index={1}>
          <Card className="sticky top-24 p-5">
            <SectionHeader icon="gauge" title="Priority simulator" />
            <p className="mt-1 text-sm text-ink-muted">
              Move a weight and the queue below re-orders live. Nothing is committed until you
              publish.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const active = FACTOR_KEYS.every((k) => weights[k] === preset.weights[k]);
                return (
                  <button
                    className={cx(
                      "rounded-full px-3 py-2 text-xs font-semibold transition-colors",
                      active
                        ? "bg-primary text-white"
                        : "bg-card-muted text-ink-muted hover:bg-container hover:text-ink",
                    )}
                    key={preset.label}
                    onClick={() => dispatch({ type: "weights/set", weights: preset.weights })}
                    title={preset.hint}
                    type="button"
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-col gap-4">
              {FACTOR_KEYS.map((key) => (
                <div key={key}>
                  <div className="flex items-baseline justify-between gap-2">
                    <label
                      className="flex items-center gap-1.5 text-sm font-semibold text-ink"
                      htmlFor={`w-${key}`}
                    >
                      {FACTOR_LABEL[key]}
                      <span className="cursor-help text-ink-faint" title={FACTOR_HELP[key]}>
                        <Icon name="help" size={12} />
                      </span>
                    </label>
                    <span className="text-sm font-bold text-ink tabular-nums">
                      {Math.round((weights[key] / total) * 100)}%
                    </span>
                  </div>
                  <input
                    className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-track accent-[var(--color-primary)]"
                    id={`w-${key}`}
                    max={50}
                    min={0}
                    onChange={(e) => setWeight(key, Number(e.target.value))}
                    step={1}
                    type="range"
                    value={weights[key]}
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-md bg-card-muted p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Icon name="scale" size={16} />
                {dirty ? "Simulating an unpublished weighting" : "Running the published weighting"}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                {dirty
                  ? "Ranks show movement against the published order. Publishing notifies every department head and is written to the audit trail."
                  : "This is the notified state weighting. Adjust a slider to test an alternative."}
              </p>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-md bg-card-muted p-3">
              <input
                checked={compare}
                className="size-4 accent-[var(--color-primary)]"
                onChange={(e) => setCompare(e.target.checked)}
                type="checkbox"
              />
              <span className="min-w-0 text-sm">
                <span className="block font-semibold text-ink">Compare with a votes-only ranking</span>
                <span className="block text-xs text-ink-muted">
                  Shows where each problem would sit if ranked purely by report count.
                </span>
              </span>
            </label>
          </Card>
        </Enter>

        {/* ------------------------------------------------------- queue */}
        <Enter className="xl:col-span-2" index={2}>
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="headline-md text-ink">Live ranking</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {ranked.length} open problems · {count(ranked.reduce((s, p) => s + p.affected, 0))}{" "}
                  citizens affected
                </p>
              </div>
              {dirty ? (
                <Badge icon="sparkles" tone="warning">
                  Simulated order
                </Badge>
              ) : (
                <Badge icon="check-circle" tone="success">
                  Published order
                </Badge>
              )}
            </div>

            {/* Rows are absolutely positioned so a weight change moves them
                rather than redrawing the list — the movement is the message. */}
            <ol
              className="relative mt-4"
              style={{ height: ranked.length * rowH }}
            >
              {ranked.map((p) => {
                const moved = p.previousRank !== undefined && p.previousRank !== p.rank;
                const up = moved && p.rank < p.previousRank!;
                const action = nextAction(p);
                return (
                  <li
                    className="absolute inset-x-0 transition-transform duration-500 ease-jm"
                    key={p.id}
                    style={{ transform: `translateY(${(p.rank - 1) * rowH}px)`, height: rowH }}
                  >
                    <div
                      className={cx(
                        "flex h-[calc(100%-8px)] items-center gap-3 overflow-hidden rounded-lg px-3",
                        p.rank <= 3 ? "bg-card-muted" : "bg-card-muted/60",
                      )}
                    >
                      {/* Rank and score travel together: they are the same
                          claim, and splitting them across the row costs the
                          title the width it needs. */}
                      <span className="flex w-14 shrink-0 flex-col items-center">
                        <span className="text-lg font-bold text-ink tabular-nums">#{p.rank}</span>
                        <span className="text-[11px] font-semibold text-ink-muted tabular-nums">
                          {p.score} pts
                        </span>
                        {moved ? (
                          <span
                            className={cx(
                              "flex items-center gap-0.5 text-[11px] font-bold tabular-nums",
                              up ? "text-impact-deep" : "text-danger",
                            )}
                          >
                            <Icon className={up ? "" : "rotate-90"} name="arrow-up-right" size={11} />
                            {Math.abs(p.previousRank! - p.rank)}
                          </span>
                        ) : null}
                      </span>

                      <span className="min-w-0 flex-1">
                        <Link className="block" href={`/gov/problems/${p.id}`}>
                          <span className="block truncate text-sm font-bold text-ink hover:underline">
                            {p.title}
                          </span>
                        </Link>
                        {/* One line, elided as a whole — a meta row that wraps
                            would push the next problem out of its slot. */}
                        <span className="mt-0.5 block truncate text-xs text-ink-muted">
                          <span className="font-semibold text-ink-faint">{p.id}</span>
                          {" · "}
                          {CATEGORY_LABEL[p.category]}
                          {" · "}
                          {count(p.reportCount)} reports
                          {" · "}
                          {count(p.affected)} affected
                          {" · "}
                          {p.villageIds.map(villageName).join(", ")}
                        </span>
                        {compare ? (
                          <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] font-semibold text-ink-muted">
                            <Icon className="shrink-0" name="scale" size={11} />
                            <span className="truncate">
                              By votes alone #{votesRank.get(p.id)} · by need #{p.rank}
                              {votesRank.get(p.id) !== p.rank ? (
                                <span
                                  className={cx(
                                    "ml-1",
                                    votesRank.get(p.id)! > p.rank ? "text-impact-deep" : "text-danger",
                                  )}
                                >
                                  ({votesRank.get(p.id)! > p.rank ? "under" : "over"}-weighted by volume)
                                </span>
                              ) : null}
                            </span>
                          </span>
                        ) : null}
                      </span>

                      <span className="flex shrink-0 items-center gap-2">
                        <span className="hidden sm:block">
                          <SeverityBadge dense severity={p.severity} />
                        </span>
                        <span className="hidden 2xl:block">
                          <SlaChip dense dueAt={p.slaDueAt} />
                        </span>
                        <ButtonLink href={action.href} size="sm" tone={action.tone}>
                          {action.label}
                        </ButtonLink>
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Card>
        </Enter>
      </div>

      {/* ------------------------------------------------- top explanation */}
      {ranked[0] ? (
        <Enter index={3}>
          <Card>
            <CardHeader
              action={
                <ButtonLink href={`/gov/problems/${ranked[0].id}`} size="sm" tone="outline">
                  Open problem
                </ButtonLink>
              }
              icon="help"
              subtitle="The engine will always show its working — an unexplained rank is an instruction, not a decision."
              title={`Why "${ranked[0].title}" is #1`}
            />
            <div className="p-5 pt-4">
              <WhyThisRank defaultOpen problem={ranked[0]} weights={weights} />
            </div>
          </Card>
        </Enter>
      ) : null}
    </div>
  );
}
