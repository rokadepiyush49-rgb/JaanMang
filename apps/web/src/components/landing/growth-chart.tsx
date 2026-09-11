"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Card, cx } from "@/components/ui";
import type { PlatformStats, YearPoint } from "@/lib/public/stats";
import { CountUp, Reveal, motion } from "./motion";
import { useReducedMotion } from "motion/react";

const EASE = [0.215, 0.61, 0.355, 1] as const;

type MetricKey = "reportsSubmitted" | "problemsValidated" | "problemsResolved" | "panchayatsOnboard";

const METRICS: { key: MetricKey; label: string; short: string }[] = [
  { key: "reportsSubmitted", label: "Citizen reports submitted", short: "Reports" },
  { key: "problemsValidated", label: "Demands validated", short: "Validated" },
  { key: "problemsResolved", label: "Demands resolved", short: "Resolved" },
  { key: "panchayatsOnboard", label: "Local bodies onboarded", short: "Local bodies" },
];

/**
 * Year-on-year growth.
 *
 * A column chart drawn in plain SVG-free markup — the bars are divs, because
 * four years of one metric does not need a charting library and the page's
 * budget is better spent elsewhere.
 *
 * Each year's provenance is printed under the chart and changes with the
 * selected year, because these are modelled figures and the page says so where
 * a reader is looking rather than in a footnote nobody reaches.
 */
export function GrowthChart({ stats }: { stats: PlatformStats }) {
  const reduced = useReducedMotion();
  const [metric, setMetric] = useState<MetricKey>("reportsSubmitted");
  const [hover, setHover] = useState<number | null>(null);

  if (!stats.available || stats.series.length < 2) return null;

  const active = METRICS.find((m) => m.key === metric)!;
  const peak = Math.max(...stats.series.map((s) => s[metric]));
  const shown: YearPoint = stats.series[hover ?? stats.series.length - 1];

  return (
    <section className="px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="label-caps text-ink-faint">Growth</p>
          <h2 className="headline-xl mt-3 max-w-3xl text-ink lg:text-[2.5rem] lg:leading-[1.15]">
            What four years of running this looks like
          </h2>
        </Reveal>

        <Reveal delay={0.06}>
          <Card className="mt-8 p-6 sm:p-8">
            {/* Metric switch — the same segmented control the rest of the
                product uses for this job. */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-1 rounded-full bg-card-muted p-1">
                {METRICS.map((m) => (
                  <button
                    aria-pressed={metric === m.key}
                    className={cx(
                      "rounded-full px-3.5 py-2 text-xs font-bold transition-colors duration-150 ease-jm",
                      metric === m.key
                        ? "bg-primary text-white shadow-level1"
                        : "text-ink-muted hover:text-ink",
                    )}
                    key={m.key}
                    onClick={() => setMetric(m.key)}
                    type="button"
                  >
                    {m.short}
                  </button>
                ))}
              </div>

              {stats.growth ? (
                <p className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
                  <Icon className="text-mint" name="trending-up" size={17} />
                  {stats.growth.reportsMultiple}× more reports than in {stats.growth.fromYear}
                </p>
              ) : null}
            </div>

            {/* The chart. */}
            <div className="mt-8 flex items-end gap-3 sm:gap-6">
              {stats.series.map((point, i) => {
                const height = Math.max(4, (point[metric] / peak) * 100);
                const on = (hover ?? stats.series.length - 1) === i;
                return (
                  <button
                    className="group flex min-w-0 flex-1 flex-col items-center gap-3"
                    key={point.year}
                    onBlur={() => setHover(null)}
                    onFocus={() => setHover(i)}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    type="button"
                  >
                    <span
                      className={cx(
                        "mono-data text-xs transition-colors",
                        on ? "font-bold text-ink" : "text-ink-faint",
                      )}
                    >
                      {compact(point[metric])}
                    </span>
                    <span className="relative flex h-48 w-full items-end sm:h-60">
                      <motion.span
                        className={cx(
                          "w-full rounded-t-md transition-colors duration-150",
                          on ? "bg-primary" : "bg-navy-tint group-hover:bg-periwinkle",
                        )}
                        initial={reduced ? { height: `${height}%` } : { height: 0 }}
                        transition={{ duration: 0.7, delay: i * 0.08, ease: EASE }}
                        viewport={{ once: true, margin: "-60px" }}
                        whileInView={{ height: `${height}%` }}
                      />
                    </span>
                    <span
                      className={cx(
                        "text-xs font-bold tabular-nums transition-colors",
                        on ? "text-ink" : "text-ink-muted",
                      )}
                    >
                      {point.year}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* The selected year, spelled out. */}
            <div className="mt-8 border-t border-line pt-6">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="stat-number text-ink">
                  <CountUp key={`${metric}-${shown.year}`} value={shown[metric]} />
                </p>
                <p className="text-sm font-semibold text-ink-muted">
                  {active.label.toLowerCase()} in {shown.year}
                </p>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Mini label="Villages covered" value={shown.villagesCovered} />
                <Mini label="Students engaged" value={shown.studentsEngaged} />
                <Mini label="Industry partners" value={shown.partnerOrgs} />
                <Mini
                  label="Routed that year"
                  text={`₹${(shown.fundsRouted / 10000000).toFixed(1)} Cr`}
                />
              </dl>

              <p className="mt-5 flex items-start gap-2 text-xs leading-relaxed text-ink-faint">
                <Icon className="mt-0.5 shrink-0" name="help" size={13} />
                <span>{shown.provenance}</span>
              </p>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

function Mini({ label, value, text }: { label: string; value?: number; text?: string }) {
  return (
    <div className="rounded-md bg-card-muted p-3">
      <dd className="mono-data text-base font-bold text-ink">
        {text ?? value?.toLocaleString("en-IN")}
      </dd>
      <dt className="mt-0.5 text-xs text-ink-muted">{label}</dt>
    </div>
  );
}

function compact(v: number): string {
  if (v >= 100000) return `${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
}
