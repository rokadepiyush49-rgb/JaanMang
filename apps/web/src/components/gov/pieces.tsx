"use client";

/**
 * The vocabulary of the government workspace: the small components that repeat
 * across every screen, so a severity, an SLA or a lifecycle position looks the
 * same wherever an officer meets it.
 *
 * Status is never carried by colour alone — each badge pairs its tint with a
 * glyph and a word, which is what keeps the screens legible in greyscale, on a
 * projector, and to a colour-blind officer.
 */

import Link from "next/link";
import { useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import { Badge, Card, Progress, cx, type Tone } from "@/components/ui";
import { count, percent, relative, rupees, sla } from "@/lib/gov/format";
import { CATEGORY_ICON, CATEGORY_LABEL } from "@/lib/gov/filters";
import { contributions, explainRank, FACTOR_HELP } from "@/lib/gov/priority";
import type {
  Actor,
  AuditEntry,
  PriorityWeights,
  Problem,
  ProblemStatus,
  RankedProblem,
  Severity,
  Stage,
} from "@/lib/gov/types";

/* ============================================================ badges === */

const SEVERITY: Record<Severity, { tone: Tone; icon: IconName; label: string }> = {
  critical: { tone: "critical", icon: "alert-circle", label: "Critical" },
  high: { tone: "warning", icon: "warning", label: "High" },
  medium: { tone: "info", icon: "clock", label: "Medium" },
  low: { tone: "neutral", icon: "check-circle", label: "Low" },
};

export function SeverityBadge({ severity, dense }: { severity: Severity; dense?: boolean }) {
  const s = SEVERITY[severity];
  return (
    <Badge dense={dense} icon={s.icon} tone={s.tone}>
      {s.label}
    </Badge>
  );
}

const STATUS: Record<ProblemStatus, { tone: Tone; icon: IconName; label: string }> = {
  pending_validation: { tone: "warning", icon: "eye", label: "Pending validation" },
  awaiting_sponsorship: { tone: "info", icon: "factory", label: "Awaiting sponsorship" },
  funding_required: { tone: "gold", icon: "banknote", label: "Funding required" },
  in_progress: { tone: "info", icon: "clipboard", label: "In progress" },
  verification_pending: { tone: "warning", icon: "thumbs-up", label: "Verification pending" },
  resolved: { tone: "success", icon: "check-circle", label: "Resolved" },
  rejected: { tone: "neutral", icon: "x", label: "Rejected" },
};

export function StatusBadge({ status, dense }: { status: ProblemStatus; dense?: boolean }) {
  const s = STATUS[status];
  return (
    <Badge dense={dense} icon={s.icon} tone={s.tone}>
      {s.label}
    </Badge>
  );
}

export function CategoryChip({ category }: { category: Problem["category"] }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
      <Icon name={CATEGORY_ICON[category]} size={14} />
      {CATEGORY_LABEL[category]}
    </span>
  );
}

/** SLA is always shown as a distance, and always says which way it points. */
export function SlaChip({ dueAt, dense = false }: { dueAt: string; dense?: boolean }) {
  const s = sla(dueAt);
  return (
    <Badge dense={dense} icon={s.breached ? "alert-circle" : "clock"} tone={s.breached ? "critical" : s.hours < 24 ? "warning" : "neutral"}>
      {s.label}
    </Badge>
  );
}

/* =============================================================== kpi === */

/**
 * A headline figure that opens the rows behind it. The link is the point: an
 * officer who cannot get from "24 critical" to those 24 problems has been shown
 * a poster, not a dashboard.
 */
export function KpiCard({
  label,
  value,
  href,
  icon,
  tone = "navy",
  delta,
  hint,
  emphasis = false,
}: {
  label: string;
  value: number | string;
  href: string;
  icon: IconName;
  tone?: "navy" | "critical" | "warning" | "success" | "gold";
  delta?: string;
  hint?: string;
  emphasis?: boolean;
}) {
  const wash = {
    navy: "bg-tint-navy text-on-tint-navy",
    critical: "bg-critical-tint text-on-critical-tint",
    warning: "bg-warning-tint text-on-warning-tint",
    success: "bg-success-tint text-on-success-tint",
    gold: "bg-gold-tint text-on-gold-tint",
  }[tone];

  return (
    <Link
      className={cx(
        "group flex flex-col justify-between gap-3 rounded-lg bg-card p-4 shadow-level1 transition-shadow duration-150 ease-jm hover:shadow-level2",
        emphasis && "ring-2 ring-critical/30",
      )}
      href={href}
    >
      <div className="flex items-start gap-3">
        <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-sm", wash)}>
          <Icon name={icon} size={18} />
        </span>
        <span className="min-w-0 flex-1 text-sm leading-tight font-semibold text-balance text-ink-muted">
          {label}
        </span>
        <Icon
          className="mt-0.5 ml-1 shrink-0 text-ink-faint transition-transform duration-150 ease-jm group-hover:translate-x-0.5"
          name="chevron-right"
          size={16}
        />
      </div>
      <div>
        <p className="stat-number text-ink">{value}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-muted">
          {delta ? (
            <span className="inline-flex items-center gap-0.5 font-semibold text-ink">
              <Icon name="trending-up" size={12} />
              {delta}
            </span>
          ) : null}
          {hint}
        </p>
      </div>
    </Link>
  );
}

/* ========================================================= lifecycle === */

const STAGE_ORDER: Stage[] = [
  "reported",
  "ai_processed",
  "validated",
  "prioritised",
  "sponsorship",
  "funded",
  "assigned",
  "implementation",
  "verification",
  "impact",
];

const STAGE_LABEL: Record<Stage, string> = {
  reported: "Reported",
  ai_processed: "AI processed",
  validated: "Validated",
  prioritised: "Prioritised",
  sponsorship: "Industry sponsorship",
  funded: "Funding decided",
  assigned: "Officer assigned",
  implementation: "Implementation",
  verification: "Citizen verification",
  impact: "Impact measured",
};

/** Which stages the system did on its own — the answer to "what happened
    automatically?", which is the question this product exists to answer. */
const AUTOMATED_STAGES = new Set<Stage>(["ai_processed", "prioritised", "sponsorship"]);

export function LifecycleTimeline({
  stage,
  orientation = "vertical",
}: {
  stage: Stage;
  orientation?: "vertical" | "horizontal";
}) {
  const current = STAGE_ORDER.indexOf(stage);
  return (
    <ol
      className={cx(
        orientation === "vertical" ? "flex flex-col gap-0" : "flex flex-wrap gap-x-1 gap-y-3",
      )}
    >
      {STAGE_ORDER.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const auto = AUTOMATED_STAGES.has(s);
        if (orientation === "horizontal") {
          return (
            <li className="flex items-center gap-1" key={s}>
              {i > 0 ? (
                <span className={cx("h-px w-4", done || active ? "bg-primary" : "bg-line")} />
              ) : null}
              <span
                className={cx(
                  "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
                  done && "bg-primary-fixed text-on-primary-fixed-variant",
                  active && "bg-primary text-white",
                  !done && !active && "bg-card-muted text-ink-faint",
                )}
              >
                {done ? <Icon name="check" size={12} /> : null}
                {STAGE_LABEL[s]}
              </span>
            </li>
          );
        }
        return (
          <li className="flex gap-3" key={s}>
            <span className="flex flex-col items-center">
              <span
                className={cx(
                  "flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                  done && "bg-primary text-white",
                  active && "bg-primary text-white ring-4 ring-primary-fixed",
                  !done && !active && "border border-line bg-card text-ink-faint",
                )}
              >
                {done ? <Icon name="check" size={14} /> : i + 1}
              </span>
              {i < STAGE_ORDER.length - 1 ? (
                <span className={cx("w-px flex-1", done ? "bg-primary" : "bg-line")} />
              ) : null}
            </span>
            <span className="pb-5">
              <span
                className={cx(
                  "block text-sm",
                  active ? "font-bold text-ink" : done ? "font-semibold text-ink" : "text-ink-faint",
                )}
              >
                {STAGE_LABEL[s]}
              </span>
              {auto ? (
                <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-semibold text-ink-muted">
                  <Icon name="bot" size={11} /> automated
                </span>
              ) : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ===================================================== why is this #1 === */

/**
 * The explainability control. An unexplained ranking is an instruction; an
 * explained one is a decision the officer can disagree with, which is the only
 * version a government can defend.
 */
export function WhyThisRank({
  problem,
  weights,
  defaultOpen = false,
}: {
  problem: RankedProblem;
  weights: PriorityWeights;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { headline, adjustments } = explainRank(problem, weights);

  return (
    <div className="rounded-md bg-card-muted">
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <Icon className="shrink-0 text-ink-muted" name="help" size={16} />
        <span className="min-w-0 flex-1 text-sm font-semibold text-ink">
          Why is this #{problem.rank}?
        </span>
        <Icon
          className={cx("shrink-0 text-ink-muted transition-transform duration-150", open && "rotate-180")}
          name="chevron-down"
          size={16}
        />
      </button>

      {open ? (
        <div className="px-4 pb-4">
          <p className="text-sm text-ink-muted">
            Score <span className="font-bold text-ink tabular-nums">{problem.score}</span> — {headline}.
          </p>
          <ScoreBreakdown problem={problem} weights={weights} />
          {adjustments.length ? (
            <ul className="mt-3 flex flex-col gap-2">
              {adjustments.map((a) => (
                <li className="flex gap-2 rounded-sm bg-card p-3" key={a.label}>
                  <Icon className="mt-0.5 shrink-0 text-ink-muted" name="scale" size={14} />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">
                      {a.label} <span className="tabular-nums">+{a.points}</span>
                    </span>
                    <span className="block text-xs text-ink-muted">{a.reason}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="mt-3 text-xs text-ink-faint">
            Report volume enters through Repeated Demand only, and is normalised against each
            village&rsquo;s historic reporting rate — need, not votes.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function ScoreBreakdown({
  problem,
  weights,
  compact = false,
}: {
  problem: Problem;
  weights: PriorityWeights;
  compact?: boolean;
}) {
  const rows = contributions(problem.factors, weights);
  const max = Math.max(...rows.map((r) => r.points), 1);
  return (
    <ul className={cx("mt-3 flex flex-col", compact ? "gap-2" : "gap-2.5")}>
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-sm text-ink">{r.label}</span>
              {!compact ? (
                <span
                  className="cursor-help text-ink-faint"
                  title={FACTOR_HELP[r.key]}
                >
                  <Icon name="help" size={12} />
                </span>
              ) : null}
            </span>
            <span className="shrink-0 text-xs text-ink-muted tabular-nums">
              {Math.round(r.weight)}% weight ·{" "}
              <span className="font-bold text-ink">{Math.round(r.points)} pts</span>
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-track">
            <div
              className="h-full rounded-full bg-navy transition-[width] duration-500 ease-jm"
              style={{ width: `${(r.points / max) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ============================================================= audit === */

const ACTOR_STYLE: Record<Actor, { icon: IconName; className: string }> = {
  AI: { icon: "sparkles", className: "bg-tint-orchid text-on-tint-orchid" },
  System: { icon: "bot", className: "bg-tint-navy text-on-tint-navy" },
  Officer: { icon: "user", className: "bg-primary-fixed text-on-primary-fixed-variant" },
  Citizen: { icon: "users", className: "bg-tint-mint text-on-tint-mint" },
  Industry: { icon: "factory", className: "bg-tint-amber text-on-tint-amber" },
};

export function AuditTrail({ entries }: { entries: AuditEntry[] }) {
  const ordered = [...entries].reverse();
  return (
    <ol className="flex flex-col">
      {ordered.map((e, i) => {
        const style = ACTOR_STYLE[e.actor];
        return (
          <li className="flex gap-3" key={e.id}>
            <span className="flex flex-col items-center">
              <span className={cx("flex size-8 shrink-0 items-center justify-center rounded-full", style.className)}>
                <Icon name={style.icon} size={15} />
              </span>
              {i < ordered.length - 1 ? <span className="w-px flex-1 bg-line" /> : null}
            </span>
            <span className="min-w-0 pb-5">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-semibold text-ink">{e.action}</span>
                {e.automated ? (
                  <Badge dense icon="bot" tone="info">
                    automated
                  </Badge>
                ) : null}
              </span>
              {e.detail ? <span className="block text-sm text-ink-muted">{e.detail}</span> : null}
              <span className="mt-0.5 block text-xs text-ink-faint">
                {e.actorName ?? e.actor} · {relative(e.at)}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ====================================================== problem cards === */

/** The row used everywhere a ranked problem is listed. */
export function ProblemRow({
  problem,
  showRank = true,
  trailing,
}: {
  problem: RankedProblem;
  showRank?: boolean;
  trailing?: React.ReactNode;
}) {
  const moved = problem.previousRank !== undefined && problem.previousRank !== problem.rank;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg bg-card-muted p-3 sm:flex-nowrap">
      {showRank ? (
        <span className="flex w-12 shrink-0 flex-col items-center">
          <span className="text-lg font-bold text-ink tabular-nums">#{problem.rank}</span>
          {moved ? (
            <span
              className={cx(
                "flex items-center gap-0.5 text-[11px] font-bold tabular-nums",
                problem.rank < problem.previousRank! ? "text-impact-deep" : "text-danger",
              )}
            >
              <Icon
                className={problem.rank < problem.previousRank! ? "" : "rotate-90"}
                name="arrow-up-right"
                size={11}
              />
              {Math.abs(problem.previousRank! - problem.rank)}
            </span>
          ) : null}
        </span>
      ) : null}

      <div className="min-w-0 flex-1">
        <Link className="block" href={`/gov/problems/${problem.id}`}>
          <p className="truncate text-sm font-bold text-ink hover:underline">{problem.title}</p>
        </Link>
        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
          <span className="font-semibold text-ink-faint">{problem.id}</span>
          <CategoryChip category={problem.category} />
          <span>{count(problem.reportCount)} reports</span>
          <span>{count(problem.affected)} affected</span>
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="text-right">
          <span className="block text-xs text-ink-muted">Score</span>
          <span className="block text-sm font-bold text-ink tabular-nums">{problem.score}</span>
        </span>
        <SeverityBadge dense severity={problem.severity} />
        <SlaChip dense dueAt={problem.slaDueAt} />
        {trailing}
      </div>
    </div>
  );
}

/* ====================================================== small blocks === */

export function StatLine({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "danger" | "impact";
}) {
  return (
    <div className="min-w-0">
      <p className="label-caps text-ink-faint">{label}</p>
      <p
        className={cx(
          "mt-1 text-lg font-bold tabular-nums",
          tone === "danger" ? "text-danger" : tone === "impact" ? "text-impact-deep" : "text-ink",
        )}
      >
        {value}
      </p>
      {hint ? <p className="text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

/** Money, with the derivation attached — no figure without its source. */
export function MoneyLine({
  label,
  amount,
  detail,
}: {
  label: string;
  amount: number;
  detail?: string;
}) {
  return (
    <div className="rounded-md bg-card-muted p-4">
      <p className="label-caps text-ink-faint">{label}</p>
      <p className="mt-1 stat-number text-ink">{rupees(amount)}</p>
      {detail ? <p className="mt-0.5 text-xs text-ink-muted">{detail}</p> : null}
    </div>
  );
}

export function ProjectCard({ problem }: { problem: RankedProblem }) {
  const project = problem.project;
  if (!project) return null;
  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps text-ink-faint">{project.id}</p>
          <Link className="block" href={`/gov/problems/${problem.id}`}>
            <h3 className="headline-md truncate text-ink hover:underline">{problem.title}</h3>
          </Link>
          <p className="mt-1 text-sm text-ink-muted">{project.contractor}</p>
        </div>
        <Badge icon={project.phase === "completed" ? "check-circle" : "clipboard"} tone={project.phase === "completed" ? "success" : "info"}>
          {project.phase}
        </Badge>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-muted">Progress</span>
          <span className="text-sm font-bold text-ink tabular-nums">{percent(project.progress)}</span>
        </div>
        <Progress className="mt-2" label={`${problem.title} progress`} value={project.progress} />
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="label-caps text-ink-faint">Budget</dt>
          <dd className="text-sm font-bold text-ink tabular-nums">
            {rupees(project.spent)} / {rupees(project.budget)}
          </dd>
        </div>
        <div>
          <dt className="label-caps text-ink-faint">Timeline</dt>
          <dd className="text-sm font-bold text-ink tabular-nums">
            Day {project.dayOfPlan} / {project.planDays}
          </dd>
        </div>
        <div>
          <dt className="label-caps text-ink-faint">Milestones</dt>
          <dd className="text-sm font-bold text-ink tabular-nums">
            {project.milestones.filter((m) => m.done).length} / {project.milestones.length}
          </dd>
        </div>
        <div>
          <dt className="label-caps text-ink-faint">Due</dt>
          <dd className="text-sm font-bold text-ink">{sla(project.dueAt).label}</dd>
        </div>
      </dl>
    </Card>
  );
}
