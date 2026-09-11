"use client";

/**
 * The parts more than one institute screen needs.
 *
 * Everything here composes `components/ui.tsx` rather than restyling it — the
 * portal has to look like the same product as `/gov` and `/industry`, and the
 * way that stays true is by having nothing of its own to drift.
 */

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icon";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Medallion,
  Progress,
  Skeleton,
  cx,
  type Tone,
} from "@/components/ui";
import {
  MILESTONE_LABEL,
  MILESTONE_TONE,
  TEAM_STATUS_LABEL,
  TEAM_STATUS_TONE,
  stagePercent,
} from "@/lib/institute/format";
import { STAGES, STAGE_LABEL, type MilestoneStatus, type ProjectStage, type TeamStatus } from "@/lib/institute/types";
import type { Resource } from "@/lib/institute/use-resource";

/* =============================================================== states === */

/**
 * Loading, failed, empty, loaded — all four, once.
 *
 * Every list screen in this portal has the same four outcomes, and writing them
 * out per page is how three of the four end up missing on the fourth page
 * somebody adds. A failure is recoverable here: the API being briefly down must
 * leave a retry on the screen, not a blank card.
 */
export function Loaded<T>({
  resource,
  skeleton,
  empty,
  isEmpty,
  children,
}: {
  resource: Resource<T>;
  skeleton?: ReactNode;
  empty?: ReactNode;
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}) {
  if (resource.loading && resource.data === null) {
    return <>{skeleton ?? <ListSkeleton />}</>;
  }
  if (resource.error && resource.data === null) {
    return (
      <Card className="p-6">
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <Medallion icon="alert-circle" tone="critical" />
          <p className="headline-md mt-4 text-ink">That did not load</p>
          <p className="mt-1 max-w-80 text-sm text-ink-muted">{resource.error}</p>
          <Button className="mt-6" icon="refresh" onClick={resource.reload} tone="outline">
            Try again
          </Button>
        </div>
      </Card>
    );
  }
  if (resource.data === null) return null;
  if (empty && isEmpty?.(resource.data)) return <>{empty}</>;
  return <>{children(resource.data)}</>;
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton className="h-20" key={i} />
      ))}
    </div>
  );
}

export function TilesSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 [&>*]:min-w-0">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton className="h-28" key={i} />
      ))}
    </div>
  );
}

/** A filtered list that came back with nothing — different from having nothing. */
export function NoResults({
  what = "results",
  onClear,
}: {
  what?: string;
  onClear?: () => void;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <Medallion icon="search" tone="neutral" />
      <p className="headline-md mt-4 text-ink">No {what} found</p>
      <p className="mt-1 max-w-80 text-sm text-ink-muted">
        Try changing your filters or search criteria.
      </p>
      {onClear ? (
        <Button className="mt-6" onClick={onClear} tone="outline">
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

export { EmptyState };

/* ============================================================== badges === */

export function TeamStatusBadge({ status, dense }: { status: TeamStatus; dense?: boolean }) {
  return (
    <Badge dense={dense} tone={TEAM_STATUS_TONE[status]}>
      {TEAM_STATUS_LABEL[status]}
    </Badge>
  );
}

export function MilestoneBadge({ status, dense }: { status: MilestoneStatus; dense?: boolean }) {
  return (
    <Badge dense={dense} tone={MILESTONE_TONE[status]}>
      {MILESTONE_LABEL[status]}
    </Badge>
  );
}

/* ============================================================ pipeline === */

/**
 * The nine-stage pipeline as a compact bar.
 *
 * Colour is never the only signal: the filled proportion carries how far along
 * the work is, and the stage is also named in words beside it. A bar on its own
 * would tell a reader that something is 55% of the way to an unnamed place.
 */
export function StageTrack({
  stage,
  className,
  compact = false,
}: {
  stage: ProjectStage;
  className?: string;
  compact?: boolean;
}) {
  const index = STAGES.indexOf(stage);
  return (
    <div className={cx("min-w-0", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-sm font-semibold text-ink">{STAGE_LABEL[stage]}</span>
        <span className="mono-data shrink-0 text-ink-muted">
          {index + 1}/{STAGES.length}
        </span>
      </div>
      <Progress
        className="mt-2"
        label={`Pipeline stage: ${STAGE_LABEL[stage]}`}
        size={compact ? "sm" : "md"}
        value={stagePercent(stage)}
      />
      {compact ? null : (
        <div className="mt-2 hidden justify-between gap-1 sm:flex">
          {STAGES.map((s, i) => (
            <span
              className={cx(
                "min-w-0 flex-1 truncate text-center text-[10px] font-semibold",
                i <= index ? "text-ink" : "text-ink-faint",
              )}
              key={s}
              title={STAGE_LABEL[s]}
            >
              {STAGE_LABEL[s]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The pipeline as a funnel — how many teams sit at each stage.
 *
 * This is the one chart in the portal, and it earns its place: the shape of
 * the distribution *is* the finding. A bulge at Discovery means teams are
 * forming and not starting; a bulge at Testing means work is finishing and not
 * being signed off. Each row is also a number, so nothing depends on the
 * picture.
 */
export function PipelineFunnel({
  data,
  emptyNote,
}: {
  data: { stage: ProjectStage; label: string; teams: number }[];
  emptyNote?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.teams));
  const total = data.reduce((a, d) => a + d.teams, 0);

  if (total === 0) {
    return (
      <p className="rounded-md bg-card-muted px-4 py-6 text-center text-sm text-ink-muted">
        {emptyNote ?? "No teams are in the pipeline yet."}
      </p>
    );
  }

  return (
    <ol className="flex flex-col gap-2">
      {data.map((d) => (
        <li className="flex items-center gap-3" key={d.stage}>
          <span className="w-24 shrink-0 truncate text-xs font-semibold text-ink-muted sm:w-28">
            {d.label}
          </span>
          <span className="h-6 min-w-0 flex-1 overflow-hidden rounded-full bg-track">
            <span
              className={cx(
                "block h-full rounded-full transition-[width] duration-700 ease-jm",
                d.teams ? "bg-primary" : "bg-transparent",
              )}
              style={{ width: `${(d.teams / max) * 100}%` }}
            />
          </span>
          <span className="mono-data w-8 shrink-0 text-right text-ink">{d.teams}</span>
        </li>
      ))}
    </ol>
  );
}

/* ============================================================== people === */

/** A person as a row: initials, name, and the one line that identifies them. */
export function PersonLine({
  name,
  detail,
  icon,
  tone = "navy",
}: {
  name: string;
  detail?: string | null;
  icon?: IconName;
  tone?: "navy" | "mint" | "amber" | "clay" | "orchid";
}) {
  const wash = {
    navy: "bg-tint-navy text-on-tint-navy",
    mint: "bg-tint-mint text-on-tint-mint",
    amber: "bg-tint-amber text-on-tint-amber",
    clay: "bg-tint-clay text-on-tint-clay",
    orchid: "bg-tint-orchid text-on-tint-orchid",
  }[tone];

  return (
    <span className="flex min-w-0 items-center gap-3">
      <span
        className={cx(
          "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
          wash,
        )}
      >
        {icon ? <Icon name={icon} size={16} /> : initials(name)}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-sm font-bold text-ink">{name}</span>
        {detail ? <span className="block truncate text-xs text-ink-muted">{detail}</span> : null}
      </span>
    </span>
  );
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((p) => /[a-z]/i.test(p[0] ?? ""))
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

/* =============================================================== cards === */

/**
 * A queue on the dashboard: a name, what is in it, and where to go.
 *
 * A count with nowhere to click is a fact; a count that opens the screen that
 * clears it is a piece of work. Every one of these is the latter.
 */
export function QueueCard({
  icon,
  title,
  tone = "warning",
  count,
  href,
  actionLabel,
  emptyNote,
  children,
}: {
  icon: IconName;
  title: string;
  tone?: Tone;
  count: number;
  href: string;
  actionLabel: string;
  emptyNote: string;
  children?: ReactNode;
}) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <Badge icon={icon} tone={count ? tone : "success"}>
          {count}
        </Badge>
        <h3 className="headline-sm min-w-0 flex-1 text-balance text-ink">{title}</h3>
      </div>

      {count === 0 ? (
        <p className="mt-4 flex items-center gap-2 rounded-md bg-success-tint px-3 py-2.5 text-sm text-on-success-tint">
          <Icon name="check-circle" size={16} />
          {emptyNote}
        </p>
      ) : (
        <>
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2">{children}</div>
          <Link
            className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
            href={href}
          >
            {actionLabel}
            <Icon name="chevron-right" size={16} />
          </Link>
        </>
      )}
    </Card>
  );
}

/** A compact row inside a queue card. */
export function QueueRow({
  href,
  title,
  detail,
  meta,
}: {
  href: string;
  title: string;
  detail?: string | null;
  meta?: string;
}) {
  return (
    <Link
      className="flex items-center gap-3 rounded-md bg-card-muted px-3 py-2.5 transition-colors hover:bg-container"
      href={href}
    >
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-semibold text-ink">{title}</span>
        {detail ? <span className="block truncate text-xs text-ink-muted">{detail}</span> : null}
      </span>
      {meta ? <span className="mono-data shrink-0 text-xs text-ink-faint">{meta}</span> : null}
      <Icon className="shrink-0 text-ink-muted" name="chevron-right" size={16} />
    </Link>
  );
}

/** A label/value pair, the portal's smallest unit of fact. */
export function Fact({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("min-w-0", className)}>
      <dt className="label-caps text-ink-faint">{label}</dt>
      <dd className="truncate text-base font-bold text-ink tabular-nums">{value}</dd>
    </div>
  );
}

/** A row of chips — skills, expertise, focus areas. */
export function Chips({ items, max }: { items: string[]; max?: number }) {
  if (!items.length) return <span className="text-xs text-ink-faint">—</span>;
  const shown = max ? items.slice(0, max) : items;
  const rest = items.length - shown.length;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {shown.map((s) => (
        <li
          className="rounded-full bg-card-muted px-2.5 py-1 text-xs font-semibold text-ink-muted"
          key={s}
        >
          {s}
        </li>
      ))}
      {rest > 0 ? (
        <li className="rounded-full bg-card-muted px-2.5 py-1 text-xs font-semibold text-ink-faint">
          +{rest}
        </li>
      ) : null}
    </ul>
  );
}

/** An inline failure from a mutation — beside the control that caused it. */
export function ActionError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p className="flex items-start gap-2 rounded-md bg-critical-tint px-3 py-2 text-sm text-on-critical-tint">
      <Icon className="mt-0.5 shrink-0" name="alert-circle" size={15} />
      <span>{children}</span>
    </p>
  );
}
