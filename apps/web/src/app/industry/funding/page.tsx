"use client";

/**
 * Funding.
 *
 * Three questions, in the order a CSR lead asks them: what have we already
 * undertaken, what is holding, and what could we join? The third is the one
 * this screen exists for — most societal challenges are too large for one
 * partner, and a ledger that shows who is already in turns "we cannot afford
 * that" into "we could carry a third of it".
 */

import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, ButtonLink, Card, Enter, cx } from "@/components/ui";
import { BarList } from "@/components/gov/charts";
import { ChallengeStatusBadge, FundingLedger, MatchRing } from "@/components/industry/pieces";
import { DOMAIN_LABEL } from "@/lib/industry/vocabulary";
import { people, rupees, until } from "@/lib/industry/format";
import { FundingService } from "@/lib/industry/service";
import {
  awaitingReview,
  csrBook,
  heldTranches,
  isOpen,
  ledger,
  matchContext,
  scoreAll,
} from "@/lib/industry/selectors";
import { useIndustry } from "@/lib/industry/store";

export default function FundingPage() {
  const { state, totals } = useIndustry();
  const context = matchContext(state.projects, state.assignments);
  const book = csrBook(state.company, state.projects, state.challenges);
  const held = heldTranches(state.projects);
  const reviews = awaitingReview(state.projects);

  /* Challenges somebody else has already put money into and that still need
     more. The whole argument for a shared ledger. */
  const coFunding = scoreAll(
    state.challenges.filter((c) => {
      if (!isOpen(c)) return false;
      const l = ledger(c);
      return l.committed > 0 && l.outstanding > 0;
    }),
    state.company,
    context,
  ).sort((a, b) => b.match.score - a.match.score);

  const unfunded = scoreAll(
    state.challenges.filter((c) => isOpen(c) && ledger(c).committed === 0),
    state.company,
    context,
  )
    .sort((a, b) => b.match.score - a.match.score)
    .slice(0, 4);

  const trancheRows = state.projects
    .flatMap((p) => p.milestones.filter((m) => m.trancheAmount).map((m) => ({ project: p, milestone: m })))
    .filter((r) => r.milestone.status !== "complete")
    .sort((a, b) => a.milestone.dueAt.localeCompare(b.milestone.dueAt));

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="headline-xl text-ink">
              <span className="font-medium">Funding</span> <span className="font-bold">position</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              {rupees(totals.committed)} committed across {totals.projects} projects,{" "}
              {rupees(totals.disbursed)} released against approved milestones, and{" "}
              {rupees(book.available)} of this year&rsquo;s allocation still uncommitted.
            </p>
          </div>
          <ButtonLink href="/industry/opportunities" icon="target" tone="outline">
            Find something to fund
          </ButtonLink>
        </div>
      </Enter>

      {/* The disclosure that has to be on this screen and not buried. */}
      {!FundingService.paymentsEnabled() ? (
        <Enter index={1}>
          <Card className="flex flex-wrap items-start gap-3 bg-warning-tint p-5" tone="flat">
            <Icon className="mt-0.5 shrink-0 text-on-warning-tint" name="warning" size={18} />
            <p className="min-w-0 flex-1 text-sm text-on-warning-tint">
              <span className="font-bold">No money moves through Jan Setu.</span> A commitment here
              is an undertaking the district countersigns and a milestone schedule it can hold you
              to. Disbursement runs through your own CSR process, and the &ldquo;released&rdquo;
              figures on this screen record tranches you have approved, not transfers this platform
              made.
            </p>
          </Card>
        </Enter>
      ) : null}

      <Enter index={2}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Committed" value={rupees(totals.committed)} hint={`${totals.projects} projects`} />
          <Stat label="Released" value={rupees(totals.disbursed)} hint="against approved milestones" />
          <Stat
            label="Held on your review"
            tone={held ? "warning" : undefined}
            value={rupees(held)}
            hint={`${reviews.length} milestone${reviews.length === 1 ? "" : "s"} waiting`}
          />
          <Stat label="Uncommitted" value={rupees(book.available)} hint={book.financialYear} />
        </div>
      </Enter>

      {/* --------------------------------------------------- co-funding */}
      <Enter index={3}>
        <Card className="p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              <h2 className="headline-lg text-ink">Join a challenge someone has already started</h2>
              <p className="mt-2 text-sm text-ink-muted">
                A ₹14 L challenge that no single partner will take is fundable in thirds. These have
                money on the table already and still need more — you would be joining, not starting.
              </p>
            </div>
            <Badge icon="users" tone="info">
              {coFunding.length} open to co-funding
            </Badge>
          </div>

          {coFunding.length ? (
            <ul className="mt-6 flex flex-col gap-3">
              {coFunding.map(({ challenge, match }) => {
                const l = ledger(challenge);
                return (
                  <li className="rounded-lg bg-card-muted p-5" key={challenge.id}>
                    <div className="flex flex-wrap items-start gap-4">
                      <MatchRing band={match.band} score={match.score} size={56} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="label-caps text-ink-faint">{challenge.id}</span>
                          <ChallengeStatusBadge dense status={challenge.status} />
                          <span className="text-xs font-semibold text-ink-muted">
                            {DOMAIN_LABEL[challenge.domain]} · {challenge.district.replace(" District", "")}
                          </span>
                        </div>
                        <Link className="mt-1 block" href={`/industry/challenges/${challenge.id}`}>
                          <p className="font-bold text-ink hover:underline">{challenge.title}</p>
                        </Link>
                        <p className="mt-1 text-xs text-ink-muted">
                          {people(challenge.affected)} people · {challenge.timelineDays} day timeline
                        </p>
                        <div className="mt-3 max-w-xl">
                          <FundingLedger challenge={challenge} />
                        </div>
                      </div>
                      <ButtonLink
                        className="shrink-0"
                        href={`/industry/challenges/${challenge.id}`}
                        size="sm"
                      >
                        Carry {rupees(l.outstanding)}
                      </ButtonLink>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-6 text-sm text-ink-muted">
              Nothing is part-funded right now. Every open challenge is looking for a first partner.
            </p>
          )}
        </Card>
      </Enter>

      {/* -------------------------------------------------- your pipeline */}
      <Enter index={4}>
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-6 xl:col-span-2">
            <h2 className="headline-md text-ink">Tranches ahead</h2>
            <p className="mt-1 text-sm text-ink-muted">
              What you have undertaken to release, and what triggers each one. Money follows
              delivery, so nothing here moves on a date alone.
            </p>
            {trancheRows.length ? (
              <ul className="mt-5 flex flex-col gap-2">
                {trancheRows.map(({ project, milestone }) => (
                  <li key={`${project.id}-${milestone.id}`}>
                    <Link
                      className={cx(
                        "flex flex-wrap items-center gap-3 rounded-md p-3 transition-colors",
                        milestone.awaitingReview ? "bg-warning-tint hover:bg-warning-tint/80" : "bg-card-muted hover:bg-container",
                      )}
                      href={`/industry/projects/${project.id}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-ink">
                          {milestone.label}
                        </span>
                        <span className="block truncate text-xs text-ink-muted">
                          {project.id} · {project.title}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-bold text-ink tabular-nums">
                          {rupees(milestone.trancheAmount ?? 0)}
                        </span>
                        <span className="block text-xs text-ink-muted">
                          {milestone.awaitingReview ? "waiting on you" : `due ${until(milestone.dueAt)}`}
                        </span>
                      </span>
                      <Icon className="shrink-0 text-ink-muted" name="chevron-right" size={16} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">Every tranche has been released.</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="headline-md text-ink">Committed by domain</h2>
            <p className="mt-1 text-sm text-ink-muted">Where your money has actually gone.</p>
            <div className="mt-5">
              <BarList
                data={book.byDomain
                  .filter((b) => b.committed > 0)
                  .map((b) => ({
                    label: DOMAIN_LABEL[b.domain],
                    value: b.committed,
                    hint: `${b.projects} project${b.projects === 1 ? "" : "s"} · planned share ${b.plannedShare}%`,
                  }))}
                format={(v) => rupees(v)}
              />
            </div>
          </Card>
        </div>
      </Enter>

      {/* --------------------------------------------- unfunded shortlist */}
      <Enter index={5}>
        <Card className="p-6">
          <h2 className="headline-md text-ink">Waiting for a first partner</h2>
          <p className="mt-1 text-sm text-ink-muted">
            No money on these at all. They fall back to the government funding queue if the partner
            window closes empty, which usually means a longer wait for the village.
          </p>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {unfunded.map(({ challenge, match }) => (
              <li key={challenge.id}>
                <Link
                  className="flex h-full items-start gap-3 rounded-md bg-card-muted p-4 transition-colors hover:bg-container"
                  href={`/industry/challenges/${challenge.id}`}
                >
                  <MatchRing band={match.band} score={match.score} size={48} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{challenge.title}</span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {rupees(challenge.fundingRequired)} · {people(challenge.affected)} people ·{" "}
                      {challenge.district.replace(" District", "")}
                    </span>
                    {challenge.responseDueAt ? (
                      <span className="mt-1 inline-block text-xs font-semibold text-warning">
                        window closes {until(challenge.responseDueAt)}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </Enter>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "warning";
}) {
  return (
    <Card className={cx("p-5", tone === "warning" && "ring-2 ring-warning/30")}>
      <p className="label-caps text-ink-faint">{label}</p>
      <p className="stat-number mt-1 text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>
    </Card>
  );
}
