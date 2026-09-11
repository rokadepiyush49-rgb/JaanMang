"use client";

/**
 * Impact Opportunities — the signature screen.
 *
 * It draws one line, left to right: the money this company has available, the
 * engine that read every published challenge against their declared profile,
 * and the handful of challenges that came out of it. A partner should be able
 * to look at this once and know what to do next.
 *
 * The screen is deliberately not a list of everything. The marketplace is one
 * click away and is where breadth belongs; this is the shortlist, with the
 * reasoning attached and the three actions that matter on every row.
 */

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Enter,
  Progress,
  cx,
  TINT,
} from "@/components/ui";
import { Segmented } from "@/components/ui-interactive";
import {
  ChallengeStatusBadge,
  DomainChip,
  MatchExplain,
  MatchRing,
  SeverityBadge,
  SupportChips,
} from "@/components/industry/pieces";

import { exactRupees, people, relative, rupees, until } from "@/lib/industry/format";
import { csrBook, isOpen, ledger, matchContext, recommended } from "@/lib/industry/selectors";
import { useIndustry } from "@/lib/industry/store";
import type { MatchResult } from "@/lib/industry/match";
import type { Challenge, MentorshipRequest } from "@/lib/industry/types";

const THRESHOLDS = ["All matches", "70% and up", "85% and up"];
const THRESHOLD_VALUES = [0, 70, 85];

export default function OpportunitiesPage() {
  const { state, dispatch, can } = useIndustry();
  const [tier, setTier] = useState(1);

  const context = matchContext(state.projects, state.assignments);
  const engaged = state.projects.map((p) => p.challengeId);
  const book = csrBook(state.company, state.projects, state.challenges);
  const matcher = state.automations.find((a) => a.id === "au-match");

  const openCount = state.challenges.filter(isOpen).length;
  const rows = recommended(state.challenges, state.company, context, {
    threshold: THRESHOLD_VALUES[tier],
    engagedIds: engaged,
  });

  const reachable = rows.reduce((s, r) => s + r.challenge.affected, 0);
  const affordable = rows.filter((r) => ledger(r.challenge).outstanding <= book.available);

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------- the single line */}
      <Enter>
        <Card className="overflow-hidden">
          <div className="grid gap-px bg-line lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <Stage
              caption={book.financialYear}
              icon="banknote"
              label="Your CSR pool"
              tint="amber"
              value={rupees(book.available)}
              detail={`${rupees(book.committed)} of ${rupees(book.allocated)} already committed`}
            />
            <Arrow />
            <Stage
              caption={matcher ? `last run ${relative(matcher.lastRunAt)}` : "continuous"}
              icon="bot"
              label="Jan Setu match engine"
              tint="orchid"
              value={`${openCount} read`}
              detail="Every published challenge, scored against five declared factors"
            />
            <Arrow />
            <Stage
              caption={`${affordable.length} within your available pool`}
              icon="target"
              label="Relevant to you"
              tint="mint"
              value={String(rows.length)}
              detail={`${reachable.toLocaleString("en-IN")} people across them`}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-4">
            <p className="text-sm text-ink-muted">
              Nothing here was committed for you. The engine ranks; a person decides.
            </p>
            <Segmented
              label="Match threshold"
              onChange={setTier}
              segments={THRESHOLDS}
              value={tier}
            />
          </div>
        </Card>
      </Enter>

      {/* ------------------------------------------------------ the list */}
      {rows.length ? (
        <div className="flex flex-col gap-4">
          {rows.map(({ challenge, match }, i) => (
            <Enter index={i} key={challenge.id}>
              <OpportunityRow
                canFund={can("funding.commit")}
                challenge={challenge}
                interested={state.interests.includes(challenge.id)}
                match={match}
                onInterest={() => dispatch({ type: "interest/express", challengeId: challenge.id })}
                rank={i + 1}
                request={state.requests.find((r) => r.challengeId === challenge.id)}
              />
            </Enter>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            actionHref="/industry/company"
            actionLabel="Review your profile"
            icon="target"
            message="Nothing clears this threshold right now. Lowering it, or widening your CSR themes and geographies, will change what the engine can offer you."
            title="No matches at this threshold"
            tone="info"
          />
        </Card>
      )}
    </div>
  );
}

/* ============================================================== parts === */

function Stage({
  label,
  value,
  detail,
  caption,
  icon,
  tint,
}: {
  label: string;
  value: string;
  detail: string;
  caption: string;
  icon: Parameters<typeof Icon>[0]["name"];
  tint: keyof typeof TINT;
}) {
  return (
    <div className="bg-card p-6">
      <div className="flex items-center gap-3">
        <span
          className={cx("flex size-10 shrink-0 items-center justify-center rounded-[12px]", TINT[tint].wash)}
        >
          <Icon name={icon} size={20} />
        </span>
        <span className="label-caps min-w-0 flex-1 text-ink-faint">{label}</span>
      </div>
      <p className="headline-xl mt-3 text-ink">{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{detail}</p>
      <p className="mt-2 text-xs text-ink-faint">{caption}</p>
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center bg-card px-2 py-2 lg:px-4">
      <span className="hidden text-ink-faint lg:block">
        <Icon name="arrow-right" size={20} />
      </span>
      <span className="text-ink-faint lg:hidden">
        <Icon name="chevron-down" size={20} />
      </span>
    </div>
  );
}

/**
 * One opportunity, at full width.
 *
 * The row carries the decomposition inline rather than behind a disclosure,
 * because the whole claim of this screen is that the ranking can be checked.
 */
function OpportunityRow({
  challenge,
  match,
  rank,
  canFund,
  interested,
  onInterest,
  request,
}: {
  challenge: Challenge;
  match: MatchResult;
  rank: number;
  canFund: boolean;
  interested: boolean;
  onInterest: () => void;
  request?: MentorshipRequest;
}) {
  const [why, setWhy] = useState(false);
  const book = ledger(challenge);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:p-6">
        <div className="flex shrink-0 items-center gap-4 lg:flex-col lg:gap-3">
          <span className="flex size-9 items-center justify-center rounded-full bg-container text-sm font-bold text-ink tabular-nums">
            {rank}
          </span>
          <MatchRing band={match.band} score={match.score} size={80} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-caps text-ink-faint">{challenge.id}</span>
            <DomainChip domain={challenge.domain} short />
            <ChallengeStatusBadge dense status={challenge.status} />
            <SeverityBadge dense severity={challenge.severity} />
            {challenge.responseDueAt ? (
              <Badge dense icon="clock" tone="warning">
                closes {until(challenge.responseDueAt)}
              </Badge>
            ) : null}
          </div>

          <Link className="mt-1.5 block" href={`/industry/challenges/${challenge.id}`}>
            <h2 className="headline-md text-balance text-ink hover:underline">{challenge.title}</h2>
          </Link>

          <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{challenge.summary}</p>

          <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Cell label="People affected" value={people(challenge.affected)} hint={`${challenge.villages.length} villages`} />
            <Cell label="Priority" value={`${challenge.priority} / 100`} hint={challenge.district.replace(" District", "")} />
            <Cell label="Still needed" value={rupees(book.outstanding)} hint={book.committed ? `${rupees(book.committed)} already in` : "no co-funder yet"} />
            <Cell label="Cost per person" value={exactRupees(Math.round(book.outstanding / Math.max(1, challenge.affected)))} hint={`${challenge.timelineDays} day timeline`} />
          </dl>

          {book.committed > 0 && book.outstanding > 0 ? (
            <div className="mt-4">
              <Progress label={`${challenge.title} funding`} size="sm" tone="mint" value={book.percent} />
              <p className="mt-1 text-xs text-ink-muted">
                {book.percent}% funded by {book.rows.filter((r) => r.status !== "proposed").length} partner
                {book.rows.length === 1 ? "" : "s"} — you would be joining, not starting.
              </p>
            </div>
          ) : null}

          {/* Why this, for this company. Two lines, then the full arithmetic
              on demand. */}
          <div className="mt-4 rounded-md bg-card-muted p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="label-caps text-ink-faint">Why this matches you</p>
              <button
                aria-expanded={why}
                className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline"
                onClick={() => setWhy((v) => !v)}
                type="button"
              >
                {why ? "Hide" : "Show"} the arithmetic
                <Icon className={cx("transition-transform", why && "rotate-180")} name="chevron-down" size={13} />
              </button>
            </div>

            {why ? (
              <div className="mt-3">
                <MatchExplain match={match} />
              </div>
            ) : (
              <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {match.factors
                  .filter((f) => f.level === "yes")
                  .slice(0, 4)
                  .map((f) => (
                    <li className="flex gap-1.5 text-xs text-ink-muted" key={f.key}>
                      <Icon className="mt-px shrink-0 text-impact-deep" name="check" size={13} />
                      <span className="min-w-0">
                        <span className="font-semibold text-ink">{f.label}</span> — {f.evidence}
                      </span>
                    </li>
                  ))}
                {match.gap ? (
                  <li className="flex gap-1.5 text-xs text-ink-muted sm:col-span-2">
                    <Icon className="mt-px shrink-0 text-warning" name="minus" size={13} />
                    <span className="min-w-0">{match.gap}</span>
                  </li>
                ) : null}
              </ul>
            )}
          </div>
        </div>

        {/* The three actions, always in the same order, always here. */}
        <div className="flex shrink-0 flex-col gap-2 lg:w-48">
          {canFund ? (
            <ButtonLink href={`/industry/challenges/${challenge.id}?intent=fund`} icon="banknote">
              Fund
            </ButtonLink>
          ) : (
            <ButtonLink href={`/industry/challenges/${challenge.id}`} icon="eye" tone="outline">
              Review
            </ButtonLink>
          )}
          <ButtonLink
            href={request ? "/industry/mentorship" : `/industry/challenges/${challenge.id}`}
            icon="users"
            tone="outline"
          >
            Mentor
          </ButtonLink>
          <Button
            disabled={interested}
            icon={interested ? "check" : "share"}
            onClick={onInterest}
            tone="tonal"
          >
            {interested ? "Interested" : "Partner"}
          </Button>
          <div className="mt-1">
            <SupportChips kinds={challenge.supportNeeded} max={4} />
          </div>
        </div>
      </div>
    </Card>
  );
}

function Cell({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="label-caps text-ink-faint">{label}</dt>
      <dd className="text-base font-bold text-ink tabular-nums">{value}</dd>
      {hint ? <dd className="truncate text-xs text-ink-muted">{hint}</dd> : null}
    </div>
  );
}
