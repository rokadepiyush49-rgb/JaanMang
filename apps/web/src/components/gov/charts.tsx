"use client";

/**
 * Charts for the government screens.
 *
 * Hand-drawn SVG rather than a charting dependency: the shapes needed here are
 * simple, and a library would arrive with its own type ramp, its own palette
 * and its own idea of a tooltip — three things this product has already
 * decided. Colours come from the design tokens, never from a chart theme.
 *
 * Every chart is announced as a figure with a text alternative, and the numbers
 * are also available as text beside or beneath it, so nothing here is
 * information that exists only as colour or only as a shape.
 */

import { cx } from "@/components/ui";

/* ============================================================ trend === */

export type TrendPoint = { label: string; a: number; b: number };

/**
 * Two-series area/line chart — reported against resolved. The gap between the
 * lines is the backlog, which is the thing an officer is actually reading.
 */
export function TrendChart({
  points,
  aLabel,
  bLabel,
  caption,
  height = 200,
  /* What one point along the x-axis represents. The government screens plot
     weeks; the industry impact screen plots months, and the text alternative
     has to say which or it describes the wrong chart. */
  unit = "weeks",
}: {
  points: TrendPoint[];
  aLabel: string;
  bLabel: string;
  caption?: string;
  height?: number;
  unit?: string;
}) {
  const w = 720;
  const h = height;
  const pad = { top: 14, right: 8, bottom: 24, left: 34 };
  const max = Math.max(...points.flatMap((p) => [p.a, p.b])) * 1.12;
  const x = (i: number) =>
    pad.left + (i * (w - pad.left - pad.right)) / Math.max(1, points.length - 1);
  const y = (v: number) => h - pad.bottom - (v / max) * (h - pad.top - pad.bottom);
  const line = (key: "a" | "b") =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");
  const area = `${line("a")} L${x(points.length - 1)},${h - pad.bottom} L${x(0)},${h - pad.bottom} Z`;
  const ticks = [0, max / 2, max];

  return (
    <figure className="m-0">
      <svg
        className="w-full"
        role="img"
        aria-label={`${aLabel} against ${bLabel} over ${points.length} ${unit}`}
        viewBox={`0 0 ${w} ${h}`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              stroke="var(--color-line)"
              strokeDasharray="3 4"
              x1={pad.left}
              x2={w - pad.right}
              y1={y(t)}
              y2={y(t)}
            />
            <text
              fill="var(--color-ink-faint)"
              fontSize="11"
              textAnchor="end"
              x={pad.left - 8}
              y={y(t) + 4}
            >
              {Math.round(t)}
            </text>
          </g>
        ))}
        <path d={area} fill="var(--color-navy-tint)" opacity="0.5" />
        <path d={line("a")} fill="none" stroke="var(--color-navy)" strokeWidth="2.5" strokeLinecap="round" />
        <path d={line("b")} fill="none" stroke="var(--color-impact)" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" />
        {points.map((p, i) =>
          i % 2 === 0 ? (
            <text
              fill="var(--color-ink-faint)"
              fontSize="11"
              key={p.label}
              textAnchor="middle"
              x={x(i)}
              y={h - 6}
            >
              {p.label}
            </text>
          ) : null,
        )}
      </svg>
      <figcaption className="mt-3 flex flex-wrap items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full bg-navy" /> {aLabel}
          <span className="font-bold text-ink tabular-nums">{points.at(-1)?.a}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-5 rounded-full border-t-2 border-dashed border-impact" /> {bLabel}
          <span className="font-bold text-ink tabular-nums">{points.at(-1)?.b}</span>
        </span>
        {caption ? <span>{caption}</span> : null}
      </figcaption>
    </figure>
  );
}

/* ============================================================== bars === */

export type BarDatum = { label: string; value: number; hint?: string; tone?: BarTone };
type BarTone = "navy" | "impact" | "community" | "danger" | "amber";

const BAR_FILL: Record<BarTone, string> = {
  navy: "bg-navy",
  impact: "bg-impact",
  community: "bg-community",
  danger: "bg-danger",
  amber: "bg-amber",
};

/**
 * Horizontal bars. Preferred over a pie for category distribution: the labels
 * stay horizontal and the comparison is a single-axis one.
 */
export function BarList({
  data,
  format = (v) => v.toLocaleString("en-IN"),
  className,
}: {
  data: BarDatum[];
  format?: (value: number) => string;
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className={cx("flex flex-col gap-3", className)}>
      {data.map((d) => (
        <li key={d.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-semibold text-ink">{d.label}</span>
            <span className="shrink-0 text-sm font-bold text-ink tabular-nums">
              {format(d.value)}
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-track">
            <div
              className={cx("h-full rounded-full transition-[width] duration-500 ease-jm", BAR_FILL[d.tone ?? "navy"])}
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
          {d.hint ? <p className="mt-1 text-xs text-ink-muted">{d.hint}</p> : null}
        </li>
      ))}
    </ul>
  );
}

/* ============================================================= donut === */

/** Funding-source split — three or four slices, never more. */
export function Donut({
  segments,
  centreValue,
  centreLabel,
  size = 168,
}: {
  segments: { label: string; value: number; color: string }[];
  centreValue: string;
  centreLabel: string;
  size?: number;
}) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  /* Arc lengths and their running offsets, resolved before the render rather
     than accumulated inside it. */
  const arcs = segments.reduce<{ segment: (typeof segments)[number]; length: number; offset: number }[]>(
    (acc, segment) => {
      const length = (segment.value / total) * c;
      const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
      return [...acc, { segment, length, offset }];
    },
    [],
  );

  return (
    <figure className="m-0 flex flex-wrap items-center gap-6">
      <svg
        aria-label={segments.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(", ")}
        height={size}
        role="img"
        viewBox={`0 0 ${size} ${size}`}
        width={size}
      >
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          {arcs.map(({ segment, length, offset }) => (
            <circle
              cx={size / 2}
              cy={size / 2}
              fill="none"
              key={segment.label}
              r={r}
              stroke={segment.color}
              strokeDasharray={`${length} ${c - length}`}
              strokeDashoffset={-offset}
              strokeWidth="22"
            />
          ))}
        </g>
        <text
          fill="var(--color-ink)"
          fontSize="22"
          fontWeight="700"
          textAnchor="middle"
          x={size / 2}
          y={size / 2 + 2}
        >
          {centreValue}
        </text>
        <text
          fill="var(--color-ink-muted)"
          fontSize="11"
          textAnchor="middle"
          x={size / 2}
          y={size / 2 + 20}
        >
          {centreLabel}
        </text>
      </svg>
      <figcaption className="min-w-40 flex-1">
        <ul className="flex flex-col gap-2">
          {segments.map((s) => (
            <li className="flex items-center gap-2 text-sm" key={s.label}>
              <span className="size-3 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate text-ink-muted">{s.label}</span>
              <span className="font-bold text-ink tabular-nums">
                {Math.round((s.value / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}

/* ========================================================= sparkline === */

export function Sparkline({
  values,
  tone = "navy",
  width = 88,
  height = 28,
  label,
}: {
  values: number[];
  tone?: "navy" | "impact" | "danger";
  width?: number;
  height?: number;
  label: string;
}) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const d = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / span) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const stroke = {
    navy: "var(--color-navy)",
    impact: "var(--color-impact)",
    danger: "var(--color-danger)",
  }[tone];
  return (
    <svg aria-label={label} height={height} role="img" viewBox={`0 0 ${width} ${height}`} width={width}>
      <path d={d} fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="2" />
    </svg>
  );
}

/* ======================================================== stacked bar === */

/** A single budget line: allocated, with committed and spent nested inside. */
export function BudgetBar({
  allocated,
  committed,
  spent,
  label,
}: {
  allocated: number;
  committed: number;
  spent: number;
  label: string;
}) {
  const pc = (v: number) => `${Math.min(100, (v / Math.max(1, allocated)) * 100)}%`;
  return (
    <div
      aria-label={`${label}: ${Math.round((spent / allocated) * 100)}% spent, ${Math.round((committed / allocated) * 100)}% committed`}
      className="relative h-3 overflow-hidden rounded-full bg-track"
      role="img"
    >
      <div className="absolute inset-y-0 left-0 rounded-full bg-navy-tint" style={{ width: pc(committed) }} />
      <div className="absolute inset-y-0 left-0 rounded-full bg-navy" style={{ width: pc(spent) }} />
    </div>
  );
}
