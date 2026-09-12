"use client";

/**
 * The vocabulary of the industry portal.
 *
 * Small components that repeat across every screen, so a match score, a funding
 * position or a milestone looks the same wherever a partner meets it. They are
 * built from the shared kit in `components/ui` rather than beside it — a
 * `ChallengeCard` is a `Card` with a particular arrangement inside it, not a
 * second idea of what a card is.
 *
 * As in the government workspace, status never rests on colour alone: every
 * badge pairs its tint with a glyph and a word.
 */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import { Badge, Card, Progress, cx, TINT, type Tint, type Tone } from "@/components/ui";
import { DOMAIN_ICON, DOMAIN_LABEL, DOMAIN_SHORT, DOMAIN_TINT } from "@/lib/industry/vocabulary";
import { count, exactRupees, people, rupees, until } from "@/lib/industry/format";
import { BAND_LABEL, type MatchResult } from "@/lib/industry/match";
import { ledger, sdgTitle, universityName } from "@/lib/industry/selectors";
import { useIndustry } from "@/lib/industry/store";
import { SUPPORT } from "@/lib/industry/vocabulary";
import type {
  Challenge,
  ChallengeStatus,
  Domain,
  EvidenceLine,
  IndustryProject,
  Milestone,
  ProjectStage,
  Severity,
  SupportKind,
} from "@/lib/industry/types";

/* ============================================================= badges === */

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

const CHALLENGE_STATUS: Record<ChallengeStatus, { tone: Tone; icon: IconName; label: string }> = {
  awaiting_partner: { tone: "gold", icon: "user-plus", label: "Awaiting partner" },
  partially_funded: { tone: "warning", icon: "banknote", label: "Part funded" },
  fully_funded: { tone: "info", icon: "check-circle", label: "Fully funded" },
  in_delivery: { tone: "info", icon: "clipboard", label: "In delivery" },
  delivered: { tone: "success", icon: "check-circle", label: "Delivered" },
};

export function ChallengeStatusBadge({
  status,
  dense,
}: {
  status: ChallengeStatus;
  dense?: boolean;
}) {
  const s = CHALLENGE_STATUS[status];
  return (
    <Badge dense={dense} icon={s.icon} tone={s.tone}>
      {s.label}
    </Badge>
  );
}

export function DomainChip({ domain, short = false }: { domain: Domain; short?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
      <Icon name={DOMAIN_ICON[domain]} size={14} />
      {short ? DOMAIN_SHORT[domain] : DOMAIN_LABEL[domain]}
    </span>
  );
}

export function SdgChips({ sdgs, max = 4 }: { sdgs: number[]; max?: number }) {
  const shown = sdgs.slice(0, max);
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {shown.map((n) => (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-container px-2 py-0.5 text-[11px] font-semibold text-ink-muted"
          key={n}
          title={sdgTitle(n)}
        >
          <span className="font-bold text-ink tabular-nums">SDG {n}</span>
          <span className="hidden sm:inline">{sdgTitle(n)}</span>
        </span>
      ))}
      {sdgs.length > max ? (
        <span className="text-[11px] font-semibold text-ink-faint">+{sdgs.length - max}</span>
      ) : null}
    </span>
  );
}

/* ======================================================== match score === */

const BAND_TINT: Record<MatchResult["band"], { ring: string; text: string; badge: Tone }> = {
  strong: { ring: "text-mint", text: "text-on-tint-mint", badge: "success" },
  good: { ring: "text-periwinkle", text: "text-on-tint-navy", badge: "info" },
  possible: { ring: "text-amber", text: "text-on-tint-amber", badge: "warning" },
  weak: { ring: "text-line-strong", text: "text-ink-muted", badge: "neutral" },
};

/**
 * The match score as a ring.
 *
 * Deliberately not a gauge with a needle: the number is the content, and the
 * ring is there to make it comparable across a grid at a glance. The band is
 * spelled out beneath, so the reading never depends on the arc's colour.
 */
export function MatchRing({
  score,
  band,
  size = 72,
  label = "match",
}: {
  score: number;
  band: MatchResult["band"];
  size?: number;
  label?: string;
}) {
  const stroke = size >= 64 ? 6 : 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tint = BAND_TINT[band];

  return (
    <span
      aria-label={`${score}% ${BAND_LABEL[band].toLowerCase()}`}
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
      role="img"
    >
      <svg className="absolute inset-0 -rotate-90" height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={r}
          stroke="var(--color-track)"
          strokeWidth={stroke}
        />
        <circle
          className={cx("transition-[stroke-dashoffset] duration-700 ease-jm", tint.ring)}
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={r}
          stroke="currentColor"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, score)) / 100}
          strokeLinecap="round"
          strokeWidth={stroke}
        />
      </svg>
      <span className="flex flex-col items-center leading-none">
        <span
          className="font-bold text-ink tabular-nums"
          style={{ fontSize: size * 0.3 }}
        >
          {score}
        </span>
        <span className="text-[9px] font-semibold tracking-[0.06em] text-ink-faint uppercase">
          {label}
        </span>
      </span>
    </span>
  );
}

const LEVEL_MARK: Record<"yes" | "partial" | "no", { icon: IconName; tone: string; label: string }> = {
  yes: { icon: "check-circle", tone: "text-impact-deep", label: "Met" },
  partial: { icon: "minus", tone: "text-warning", label: "Partial" },
  no: { icon: "x", tone: "text-danger", label: "Not met" },
};

/**
 * The decomposition.
 *
 * Five rows, each naming the field in the company profile it was scored
 * against, each showing its weighted contribution. A partner who disagrees with
 * the score can see precisely which row to argue with — and the lever text
 * tells them what to change to move it.
 */
export function MatchExplain({
  match,
  compact = false,
}: {
  match: MatchResult;
  compact?: boolean;
}) {
  const base = match.factors.reduce((s, f) => s + (f.score * f.weight) / 100, 0);
  const bonus = match.score - Math.round(base);

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3">
        {match.factors.map((f) => {
          const mark = LEVEL_MARK[f.level];
          return (
            <li key={f.key}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Icon className={cx("shrink-0", mark.tone)} name={mark.icon} size={14} />
                  <span className="truncate text-sm font-semibold text-ink">{f.label}</span>
                </span>
                <span className="shrink-0 text-sm text-ink-muted tabular-nums">
                  <span className="font-bold text-ink">
                    {((f.score * f.weight) / 100).toFixed(1)}
                  </span>
                  <span className="text-xs"> / {f.weight}</span>
                </span>
              </div>
              <Progress
                className="mt-1.5"
                label={f.label}
                size="sm"
                tone={f.level === "yes" ? "impact" : f.level === "partial" ? "community" : "navy"}
                value={f.score}
              />
              {compact ? null : (
                <p className="mt-1.5 text-xs text-ink-muted">{f.evidence}</p>
              )}
              {!compact && f.lever ? (
                <p className="mt-1 text-xs font-semibold text-navy">{f.lever}</p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {match.modifiers.length ? (
        <div className="rounded-md bg-card-muted p-3">
          <p className="label-caps text-ink-faint">Adjustments</p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {match.modifiers.map((m) => (
              <li className="flex gap-2 text-xs text-ink-muted" key={m.label}>
                <span className="shrink-0 font-bold text-impact-deep tabular-nums">+{m.points}</span>
                <span>
                  <span className="font-semibold text-ink">{m.label}</span> — {m.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="flex items-baseline justify-between gap-3 border-t border-line pt-3 text-sm">
        <span className="font-semibold text-ink">Total</span>
        <span className="text-ink-muted tabular-nums">
          {Math.round(base)} weighted{bonus > 0 ? ` + ${bonus} adjustments` : ""} ={" "}
          <span className="font-bold text-ink">{match.score}%</span>
        </span>
      </p>
    </div>
  );
}

/* =========================================================== support === */

export function SupportChips({ kinds, max }: { kinds: SupportKind[]; max?: number }) {
  const shown = max ? kinds.slice(0, max) : kinds;
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {shown.map((k) => (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-primary-fixed px-2 py-0.5 text-[11px] font-semibold text-on-primary-fixed-variant"
          key={k}
          title={SUPPORT[k].blurb}
        >
          <Icon name={SUPPORT[k].icon} size={11} />
          {SUPPORT[k].label}
        </span>
      ))}
      {max && kinds.length > max ? (
        <span className="text-[11px] font-semibold text-ink-faint">+{kinds.length - max}</span>
      ) : null}
    </span>
  );
}

/**
 * One of the seven ways to contribute, as a selectable card.
 *
 * Money is one option among seven and is drawn no larger than the others,
 * because the portal's whole argument is that a partner who only writes a
 * cheque is the least useful kind of partner.
 */
export function SupportOption({
  kind,
  selected,
  onToggle,
  disabled,
}: {
  kind: SupportKind;
  selected: boolean;
  onToggle?: () => void;
  disabled?: boolean;
}) {
  const meta = SUPPORT[kind];
  return (
    <button
      aria-pressed={selected}
      className={cx(
        "flex w-full items-start gap-3 rounded-lg p-4 text-left transition-[background-color,box-shadow] duration-150 ease-jm",
        selected ? "bg-primary text-white shadow-level2" : "bg-card-muted text-ink hover:bg-container",
        disabled && "pointer-events-none opacity-45",
      )}
      disabled={disabled}
      onClick={onToggle}
      type="button"
    >
      <span
        className={cx(
          "flex size-10 shrink-0 items-center justify-center rounded-[12px]",
          selected ? "bg-white/16 text-white" : "bg-card text-ink",
        )}
      >
        <Icon name={meta.icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">{meta.label}</span>
        <span className={cx("block text-xs font-semibold", selected ? "text-white/72" : "text-ink-faint")}>
          {meta.gives}
        </span>
        <span className={cx("mt-1 block text-xs", selected ? "text-white/80" : "text-ink-muted")}>
          {meta.blurb}
        </span>
      </span>
      {selected ? <Icon className="mt-0.5 shrink-0" name="check" size={18} /> : null}
    </button>
  );
}

/* =========================================================== funding === */

const CONTRIBUTOR_TINT: Record<string, string> = {
  industry: "bg-periwinkle",
  government: "bg-mint",
  philanthropy: "bg-orchid",
};

/**
 * A challenge's funding position.
 *
 * Committed money fills the bar; proposed money is hatched behind it and
 * counted separately in the caption. Reading someone's unsigned intent as
 * funding is how a co-funding ledger stops being believed.
 */
export function FundingLedger({
  challenge,
  showRows = true,
}: {
  challenge: Challenge;
  showRows?: boolean;
}) {
  const book = ledger(challenge);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm text-ink-muted">
          <span className="font-bold text-ink">{rupees(book.committed)}</span> committed of{" "}
          {rupees(book.required)}
        </span>
        <span className="text-sm font-bold text-ink tabular-nums">{book.percent}%</span>
      </div>

      <div className="mt-2 flex h-2.5 w-full overflow-hidden rounded-full bg-track">
        {book.rows
          .filter((r) => r.status !== "proposed")
          .map((r) => (
            <span
              className={cx("h-full transition-[width] duration-700 ease-jm", CONTRIBUTOR_TINT[r.kind])}
              key={r.id}
              style={{ width: `${Math.min(100, (r.amount / Math.max(1, book.required)) * 100)}%` }}
              title={`${r.party} — ${rupees(r.amount)}`}
            />
          ))}
      </div>

      <p className="mt-2 text-xs text-ink-muted">
        {book.outstanding > 0 ? (
          <>
            <span className="font-semibold text-ink">{rupees(book.outstanding)}</span> still needed
            {book.proposed > 0 ? `, with ${rupees(book.proposed)} proposed but not signed` : ""}.
          </>
        ) : (
          "Fully funded. No further contribution required."
        )}
      </p>

      {showRows && book.rows.length ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {book.rows.map((r) => (
            <li className="flex items-center gap-2 text-sm" key={r.id}>
              <span className={cx("size-2 shrink-0 rounded-full", CONTRIBUTOR_TINT[r.kind])} />
              <span className={cx("min-w-0 flex-1 truncate", r.isSelf ? "font-bold text-ink" : "text-ink-muted")}>
                {r.party}
                {r.isSelf ? " (you)" : ""}
              </span>
              {r.status === "proposed" ? (
                <Badge dense tone="neutral">
                  proposed
                </Badge>
              ) : null}
              <span className="shrink-0 font-semibold text-ink tabular-nums">{rupees(r.amount)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/* ========================================================= challenge === */

/**
 * The discovery card.
 *
 * Ordered the way a partner reads: what the problem is, who it affects, what it
 * would cost, why it is being shown to *them*, and then the actions. The match
 * reasons are on the card rather than behind a click, because a recommendation
 * whose justification is one navigation away is an unjustified recommendation.
 */
export function ChallengeCard({
  challenge,
  match,
  actions,
}: {
  challenge: Challenge;
  match: MatchResult;
  actions?: React.ReactNode;
}) {
  const tint = DOMAIN_TINT[challenge.domain];
  const book = ledger(challenge);
  const met = match.factors.filter((f) => f.level === "yes");

  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start gap-4">
        <span
          className={cx(
            "flex size-11 shrink-0 items-center justify-center rounded-[14px]",
            TINT[tint].wash,
          )}
        >
          <Icon name={DOMAIN_ICON[challenge.domain]} size={22} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="label-caps text-ink-faint">{challenge.id}</span>
            <DomainChip domain={challenge.domain} short />
          </p>
          <Link className="mt-0.5 block" href={`/industry/challenges/${challenge.id}`}>
            <h3 className="headline-md text-balance text-ink hover:underline">{challenge.title}</h3>
          </Link>
        </div>

        <MatchRing band={match.band} score={match.score} size={62} />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Figure label="Priority" value={`${challenge.priority} / 100`} />
        <Figure label="People affected" value={people(challenge.affected)} />
        <Figure label="Location" value={challenge.district.replace(" District", "")} hint={challenge.state} />
        <Figure
          label={book.outstanding ? "Still needed" : "Fully funded"}
          value={book.outstanding ? rupees(book.outstanding) : rupees(book.required)}
        />
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ChallengeStatusBadge dense status={challenge.status} />
        <SeverityBadge dense severity={challenge.severity} />
        {challenge.governmentValidated ? (
          <Badge dense icon="shield" tone="success">
            Government validated
          </Badge>
        ) : null}
        {challenge.responseDueAt ? (
          <Badge dense icon="clock" tone="warning">
            Window closes {until(challenge.responseDueAt)}
          </Badge>
        ) : null}
      </div>

      {book.committed > 0 && book.outstanding > 0 ? (
        <div className="mt-4">
          <FundingLedger challenge={challenge} showRows={false} />
        </div>
      ) : null}

      {/* Why this, for this company — the part that makes it a recommendation
          rather than a listing. */}
      <div className="mt-4 rounded-md bg-card-muted p-3">
        <p className="label-caps text-ink-faint">Why this matches you</p>
        <ul className="mt-1.5 flex flex-col gap-1">
          {met.slice(0, 3).map((f) => (
            <li className="flex gap-1.5 text-xs text-ink-muted" key={f.key}>
              <Icon className="mt-px shrink-0 text-impact-deep" name="check" size={13} />
              <span className="min-w-0">{f.evidence}</span>
            </li>
          ))}
          {match.gap ? (
            <li className="flex gap-1.5 text-xs text-ink-muted">
              <Icon className="mt-px shrink-0 text-warning" name="minus" size={13} />
              <span className="min-w-0">{match.gap}</span>
            </li>
          ) : null}
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <SupportChips kinds={challenge.supportNeeded} max={4} />
        <span className="ml-auto" />
        {actions}
      </div>
    </Card>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="label-caps text-ink-faint">{label}</dt>
      <dd className="truncate text-sm font-bold text-ink tabular-nums">{value}</dd>
      {hint ? <dd className="truncate text-xs text-ink-muted">{hint}</dd> : null}
    </div>
  );
}

/* ============================================================== kpis === */

/**
 * A headline figure that opens the rows behind it.
 *
 * The link is the whole point: a partner who cannot get from "3 pilots running"
 * to those three pilots has been shown a poster, not a dashboard.
 */
export function KpiTile({
  label,
  value,
  hint,
  icon,
  href,
  tint = "navy",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  href: string;
  tint?: Tint;
}) {
  return (
    <Link
      className="group flex flex-col justify-between gap-3 rounded-lg bg-card p-4 shadow-level1 transition-shadow duration-150 ease-jm hover:shadow-level2"
      href={href}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cx(
            "flex size-9 shrink-0 items-center justify-center rounded-sm",
            TINT[tint].wash,
          )}
        >
          <Icon name={icon} size={18} />
        </span>
        <span className="min-w-0 flex-1 text-sm leading-tight font-semibold text-balance text-ink-muted">
          {label}
        </span>
        <Icon
          className="mt-0.5 shrink-0 text-ink-faint transition-transform duration-150 ease-jm group-hover:translate-x-0.5"
          name="chevron-right"
          size={16}
        />
      </div>
      <div>
        <p className="stat-number text-ink">{value}</p>
        {hint ? <p className="mt-0.5 text-xs text-ink-muted">{hint}</p> : null}
      </div>
    </Link>
  );
}

/**
 * A number that animates when it changes.
 *
 * Deliberately not a count-up on first paint. The design system's rule is that
 * nothing may depend on an animation completing in order to be legible, and a
 * figure that starts at zero fails that the moment a tab is backgrounded or an
 * extension suppresses animation. So the correct value is in the DOM from the
 * first frame, and the motion is reserved for the case where it means
 * something: a figure moving because the reader just did something — approving
 * a milestone releases a tranche, and the released total travels to its new
 * value rather than jumping.
 *
 * The animation writes only from inside a frame callback, never synchronously
 * during the effect, so it cannot cascade a render.
 */
export function CountUp({
  value,
  format = (v) => v.toLocaleString("en-IN"),
  duration = 700,
  className,
}: {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}) {
  /* How far short of `value` we are currently drawing. Zero at rest, which is
     why the first paint is always correct. */
  const [offset, setOffset] = useState(0);
  const previous = useRef(value);

  useEffect(() => {
    const from = previous.current;
    previous.current = value;
    const delta = value - from;
    if (!delta) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const t = Math.min(1, (now - start) / duration);
      /* easeOutCubic — the curve every other transition in the product uses,
         so the counter belongs to the same motion system. */
      setOffset(Math.round(delta * Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={cx("tabular-nums", className)}>{format(value - offset)}</span>;
}

/* ========================================================== evidence === */

/**
 * Figures with their provenance attached.
 *
 * Every headline number on a challenge page comes through here, because a
 * beneficiary count with no method behind it is a claim, and a partner is being
 * asked to spend real money against it.
 */
export function EvidenceList({ lines }: { lines: EvidenceLine[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {lines.map((line) => (
        <li className="flex flex-wrap items-baseline gap-x-3 gap-y-1" key={`${line.label}-${line.value}`}>
          <span className="min-w-32 text-sm font-semibold text-ink">{line.label}</span>
          <span className="text-sm font-bold text-ink tabular-nums">{line.value}</span>
          <span className="w-full text-xs text-ink-muted">{line.source}</span>
        </li>
      ))}
    </ul>
  );
}

/* ========================================================= lifecycle === */

const STAGE_ORDER: ProjectStage[] = [
  "discovery",
  "team_formed",
  "funded",
  "research",
  "prototype",
  "testing",
  "pilot",
  "deployment",
  "impact",
];

export const STAGE_LABEL: Record<ProjectStage, string> = {
  discovery: "Discovered",
  team_formed: "Team formed",
  funded: "Funded",
  research: "Research",
  prototype: "Prototype",
  testing: "Testing",
  pilot: "Pilot",
  deployment: "Deployment",
  impact: "Impact measured",
};

export function StageBadge({ stage, dense }: { stage: ProjectStage; dense?: boolean }) {
  const tone: Tone =
    stage === "impact" ? "success" : stage === "pilot" || stage === "deployment" ? "info" : "neutral";
  return (
    <Badge dense={dense} icon={stage === "impact" ? "check-circle" : "clipboard"} tone={tone}>
      {STAGE_LABEL[stage]}
    </Badge>
  );
}

/**
 * The project lifecycle as a horizontal rail.
 *
 * Nine stages is a lot to draw, so past stages collapse to a filled dot and
 * only the current one carries its label at small sizes — the reader needs to
 * know where the work is, not to re-read the whole vocabulary each time.
 */
export function StageTrail({ stage }: { stage: ProjectStage }) {
  const current = STAGE_ORDER.indexOf(stage);
  return (
    <ol className="flex min-w-0 items-center gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {STAGE_ORDER.map((s, i) => {
        const done = i < current;
        const now = i === current;
        return (
          <li className="flex shrink-0 items-center gap-1" key={s}>
            <span
              className={cx(
                "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap",
                now
                  ? "bg-primary text-white"
                  : done
                    ? "bg-tint-mint text-on-tint-mint"
                    : "bg-container text-ink-faint",
              )}
            >
              <Icon name={done ? "check" : now ? "flame" : "minus"} size={11} />
              {STAGE_LABEL[s]}
            </span>
            {i < STAGE_ORDER.length - 1 ? (
              <span className={cx("h-px w-3 shrink-0", done ? "bg-mint" : "bg-line")} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/* ========================================================= milestones === */

const MILESTONE_STYLE: Record<
  Milestone["status"],
  { icon: IconName; ring: string; tone: Tone; label: string }
> = {
  complete: { icon: "check", ring: "bg-mint text-white", tone: "success", label: "Complete" },
  active: { icon: "flame", ring: "bg-primary text-white", tone: "info", label: "In progress" },
  changes_requested: { icon: "refresh", ring: "bg-warning text-white", tone: "warning", label: "Changes requested" },
  pending: { icon: "minus", ring: "bg-container text-ink-faint", tone: "neutral", label: "Not started" },
};

export function MilestoneTrail({
  milestones,
  onApprove,
  onRequestChanges,
  canReview = false,
}: {
  milestones: Milestone[];
  onApprove?: (id: string) => void;
  onRequestChanges?: (id: string) => void;
  canReview?: boolean;
}) {
  return (
    <ol className="flex flex-col">
      {milestones.map((m, i) => {
        const style = MILESTONE_STYLE[m.status];
        return (
          <li className="flex gap-3" key={m.id}>
            <span className="flex flex-col items-center">
              <span
                className={cx(
                  "flex size-8 shrink-0 items-center justify-center rounded-full",
                  style.ring,
                )}
              >
                <Icon name={style.icon} size={15} />
              </span>
              {i < milestones.length - 1 ? (
                <span className={cx("w-px flex-1", m.status === "complete" ? "bg-mint" : "bg-line")} />
              ) : null}
            </span>

            <div className="min-w-0 flex-1 pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-ink">{m.label}</span>
                <Badge dense tone={style.tone}>
                  {style.label}
                </Badge>
                {m.awaitingReview ? (
                  <Badge dense icon="eye" tone="warning">
                    Awaiting your review
                  </Badge>
                ) : null}
                {m.trancheAmount ? (
                  <span className="text-xs font-semibold text-ink-muted tabular-nums">
                    {rupees(m.trancheAmount)} tranche
                  </span>
                ) : null}
              </div>

              <p className="mt-1 text-sm text-ink-muted">{m.detail}</p>

              {m.status === "active" && m.percent > 0 ? (
                <Progress className="mt-2 max-w-sm" label={m.label} size="sm" value={m.percent} />
              ) : null}

              <p className="mt-1.5 text-xs text-ink-faint">
                {m.completedAt ? `Completed ${until(m.completedAt)}` : `Due ${until(m.dueAt)}`}
                {m.reviewedBy ? ` · reviewed by ${m.reviewedBy}` : ""}
              </p>

              {m.deliverables.length ? (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {m.deliverables.map((dv) => (
                    <li
                      className="inline-flex items-center gap-1 rounded-full bg-card-muted px-2 py-0.5 text-[11px] font-semibold text-ink-muted"
                      key={dv}
                    >
                      <Icon name="paperclip" size={11} />
                      {dv}
                    </li>
                  ))}
                </ul>
              ) : null}

              {m.reviewNote ? (
                <p className="mt-2 rounded-md bg-warning-tint p-3 text-xs text-on-warning-tint">
                  <span className="font-bold">Your note: </span>
                  {m.reviewNote}
                </p>
              ) : null}

              {m.awaitingReview && canReview ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="inline-flex h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-white shadow-level1 transition-colors hover:bg-primary-hover"
                    onClick={() => onApprove?.(m.id)}
                    type="button"
                  >
                    <Icon name="check" size={16} />
                    Approve &amp; release {m.trancheAmount ? rupees(m.trancheAmount) : "tranche"}
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-1.5 rounded-md border border-line-strong bg-card px-4 text-sm font-semibold text-primary transition-colors hover:bg-card-muted"
                    onClick={() => onRequestChanges?.(m.id)}
                    type="button"
                  >
                    <Icon name="refresh" size={16} />
                    Request changes
                  </button>
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* =========================================================== project === */

export function ProjectCard({ project }: { project: IndustryProject }) {
  const { state } = useIndustry();
  const reviews = project.milestones.filter((m) => m.awaitingReview).length;
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps text-ink-faint">{project.id}</p>
          <Link className="block" href={`/industry/projects/${project.id}`}>
            <h3 className="headline-md text-balance text-ink hover:underline">{project.title}</h3>
          </Link>
          <p className="mt-1 text-sm text-ink-muted">
            {universityName(state.universities, project.universityId)} · {project.governmentBody}
          </p>
        </div>
        <StageBadge dense stage={project.stage} />
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-muted">Progress</span>
          <span className="text-sm font-bold text-ink tabular-nums">{project.progress}%</span>
        </div>
        <Progress
          className="mt-2"
          label={`${project.title} progress`}
          tone={project.stage === "impact" ? "impact" : "navy"}
          value={project.progress}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Figure label="Committed" value={rupees(project.investment.committed)} />
        <Figure label="Released" value={rupees(project.investment.disbursed)} />
        <Figure label="People" value={people(project.peopleImpacted)} />
        <Figure label="Per person" value={exactRupees(Math.round(project.investment.committed / Math.max(1, project.peopleImpacted)))} />
      </dl>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <SupportChips kinds={project.providing} max={4} />
        {reviews ? (
          <Badge className="ml-auto" dense icon="eye" tone="warning">
            {reviews} awaiting review
          </Badge>
        ) : null}
      </div>
    </Card>
  );
}

/* ============================================================ people === */

/** A collaborator row: who they are, which party they belong to, nothing more. */
export function PartnerRow({
  name,
  role,
  organisation,
  tint = "navy",
  icon = "user",
  trailing,
}: {
  name: string;
  role: string;
  organisation?: string;
  tint?: Tint;
  icon?: IconName;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md bg-card-muted p-3">
      <span
        className={cx("flex size-10 shrink-0 items-center justify-center rounded-full", TINT[tint].wash)}
      >
        <Icon name={icon} size={19} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-bold text-ink">{name}</span>
        <span className="block truncate text-xs text-ink-muted">
          {role}
          {organisation ? ` · ${organisation}` : ""}
        </span>
      </span>
      {trailing}
    </div>
  );
}

/* ======================================================= impact/rupee === */

/**
 * The CSR question in one block: money in, people out, cost per person.
 *
 * Reported and verified reach are separated rather than summed, because a
 * prototype-stage beneficiary count is a plan and a verified one is a finding.
 */
export function ImpactPerRupeeBlock({
  investment,
  peopleImpacted,
  costPerBeneficiary,
  verifiedShare,
  clustersClosed,
}: {
  investment: number;
  peopleImpacted: number;
  costPerBeneficiary: number;
  verifiedShare: number;
  clustersClosed: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-md bg-card-muted p-4">
        <p className="label-caps text-ink-faint">Committed</p>
        <p className="stat-number mt-1 text-ink">{rupees(investment)}</p>
        <p className="text-xs text-ink-muted">Across every live and closed project</p>
      </div>
      <div className="flex items-center justify-center">
        <span className="hidden text-ink-faint sm:block">
          <Icon name="arrow-right" size={22} />
        </span>
        <span className="text-ink-faint sm:hidden">
          <Icon name="chevron-down" size={22} />
        </span>
      </div>
      <div className="rounded-md bg-tint-mint p-4 text-on-tint-mint">
        <p className="label-caps opacity-80">People reached</p>
        <p className="stat-number mt-1">
          <CountUp value={peopleImpacted} />
        </p>
        <p className="text-xs opacity-90">{verifiedShare}% confirmed by citizen verification</p>
      </div>
      <div className="rounded-lg bg-primary p-4 text-white sm:col-span-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="label-caps text-white/64">Cost per person reached</p>
            <p className="stat-number mt-1">{exactRupees(costPerBeneficiary)}</p>
          </div>
          <div className="text-right">
            <p className="label-caps text-white/64">Problem clusters closed</p>
            <p className="stat-number mt-1">{count(clustersClosed)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
