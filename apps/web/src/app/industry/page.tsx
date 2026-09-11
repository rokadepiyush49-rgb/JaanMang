"use client";

/**
 * Industry home.
 *
 * The screen answers one question in its first fold — "what societal problems
 * can we help solve?" — and then, immediately beneath, the question a partner
 * asks second: "what is already ours, and what is waiting on me?"
 *
 * Every headline number is a link. A figure a partner cannot open is a poster.
 */

import Link from "next/link";
import { Icon } from "@/components/icon";
import {
  ButtonLink,
  Card,
  CardHeader,
  Enter,
  SectionHeader,
  cx,
  TINT,
} from "@/components/ui";
import {
  ChallengeCard,
  KpiTile,
} from "@/components/industry/pieces";
import { DOMAIN_ICON, DOMAIN_LABEL, DOMAINS, DOMAIN_TINT } from "@/lib/industry/challenges";
import { exactRupees, people, relative, rupees } from "@/lib/industry/format";
import { SUPPORT } from "@/lib/industry/mock-data";
import {
  awaitingReview,
  csrBook,
  heldTranches,
  impactPerRupee,
  matchContext,
  mentorLoad,
  recommended,
} from "@/lib/industry/selectors";
import { useIndustry } from "@/lib/industry/store";

export default function IndustryHome() {
  const { state, totals } = useIndustry();
  const context = matchContext(state.projects, state.assignments);
  const engaged = state.projects.map((p) => p.challengeId);

  const matches = recommended(state.challenges, state.company, context, { engagedIds: engaged });
  const reviews = awaitingReview(state.projects);
  const held = heldTranches(state.projects);
  const book = csrBook(state.company, state.projects, state.challenges);
  const impact = impactPerRupee(state.projects);
  const mentors = mentorLoad(state.assignments);
  const unread = state.alerts.filter((a) => !a.read);
  const matchAutomation = state.automations.find((a) => a.id === "au-match");

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------------------------------------ hero */}
      <Enter>
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-end lg:justify-between lg:p-8">
            <div className="min-w-0 max-w-2xl">
              <p className="label-caps text-ink-faint">
                {state.company.name} · {state.company.sector}
              </p>
              <h1 className="headline-xl mt-2 text-ink lg:display-xl">
                <span className="font-medium">Discover problems</span>{" "}
                <span className="font-bold">worth solving.</span>
              </h1>
              <p className="mt-3 text-base text-ink-muted">
                Validated societal challenges where your expertise, technology and funding can
                create measurable impact — each one already reported by citizens, ranked by the
                state, and waiting on a partner rather than on a proposal.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <ButtonLink href="/industry/opportunities" icon="target">
                  {matches.length} opportunities for you
                </ButtonLink>
                <ButtonLink href="/industry/discover" icon="search" tone="outline">
                  Browse all challenges
                </ButtonLink>
              </div>
            </div>

            {/* The one-line state of the partnership, for a reader who opens
                this screen and nothing else. */}
            <dl className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-4 lg:w-[26rem] lg:grid-cols-2">
              <Snapshot label="CSR available" value={rupees(book.available)} hint={book.financialYear} />
              <Snapshot label="Live projects" value={String(state.projects.length)} hint={`${totals.pilotsRunning} in pilot`} />
              <Snapshot label="People reached" value={people(totals.peopleImpacted)} hint={`${impact.verifiedShare}% verified`} />
              <Snapshot label="Waiting on you" value={String(reviews.length)} hint={held ? `${rupees(held)} held` : "nothing held"} tone={reviews.length ? "warning" : undefined} />
            </dl>
          </div>

          {/* Quick filters — the nine domains the platform files challenges
              under, straight into the marketplace pre-filtered. */}
          <div className="flex gap-2 overflow-x-auto border-t border-line px-6 py-4 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {DOMAINS.map((domain) => {
              const open = state.challenges.filter(
                (c) => c.domain === domain && (c.status === "awaiting_partner" || c.status === "partially_funded"),
              ).length;
              return (
                <Link
                  className={cx(
                    "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-transform duration-150 ease-jm hover:-translate-y-0.5",
                    TINT[DOMAIN_TINT[domain]].wash,
                  )}
                  href={`/industry/discover?domain=${domain}`}
                  key={domain}
                >
                  <Icon name={DOMAIN_ICON[domain]} size={16} />
                  {DOMAIN_LABEL[domain]}
                  <span className="rounded-full bg-white/60 px-1.5 text-xs font-bold tabular-nums">
                    {open}
                  </span>
                </Link>
              );
            })}
          </div>
        </Card>
      </Enter>

      {/* ------------------------------------------------------------- kpis */}
      <Enter index={1}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
          <KpiTile
            href="/industry/opportunities"
            icon="target"
            label="Challenges matched"
            tint="navy"
            value={String(matches.length)}
            hint="above your 70% threshold"
          />
          <KpiTile
            href="/industry/universities"
            icon="graduation"
            label="Active partnerships"
            tint="orchid"
            value={String(totals.universities)}
            hint="universities"
          />
          <KpiTile
            href="/industry/projects"
            icon="clipboard"
            label="Projects sponsored"
            tint="blue"
            value={String(totals.projects)}
            hint={`${totals.completed} completed`}
          />
          <KpiTile
            href="/industry/csr"
            icon="banknote"
            label="Capital committed"
            tint="amber"
            value={rupees(totals.committed)}
            hint={`${rupees(totals.disbursed)} released`}
          />
          <KpiTile
            href="/industry/impact"
            icon="users"
            label="People impacted"
            tint="mint"
            value={people(totals.peopleImpacted)}
            hint={`${totals.communities} villages & wards`}
          />
          <KpiTile
            href="/industry/mentorship"
            icon="user-plus"
            label="Active mentorships"
            tint="clay"
            value={String(mentors.assignments)}
            hint={`${mentors.hoursGiven} hours given`}
          />
          <KpiTile
            href="/industry/projects"
            icon="rocket"
            label="Pilots running"
            tint="navy"
            value={String(totals.pilotsRunning)}
            hint="in the field now"
          />
          <KpiTile
            href="/industry/impact"
            icon="scale"
            label="Cost per person"
            tint="mint"
            value={exactRupees(impact.costPerBeneficiary)}
            hint={`${totals.clustersClosed} clusters closed`}
          />
        </div>
      </Enter>

      {/* --------------------------------------------------- what's waiting */}
      {reviews.length || unread.length ? (
        <Enter index={2}>
          <div className="grid gap-4 lg:grid-cols-2">
            {reviews.length ? (
              <Card className="bg-warning-tint p-5" tone="flat">
                <div className="flex items-start gap-3">
                  <Icon className="mt-0.5 shrink-0 text-on-warning-tint" name="eye" size={20} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-on-warning-tint">
                      {reviews.length} milestone{reviews.length === 1 ? "" : "s"} waiting on your review
                    </h2>
                    <p className="mt-1 text-sm text-on-warning-tint/90">
                      {held ? `${rupees(held)} of committed funding cannot move until you approve or ask for changes.` : "No money is held, but the teams are waiting."}
                    </p>
                    <ul className="mt-3 flex flex-col gap-2">
                      {reviews.slice(0, 3).map(({ project, milestone }) => (
                        <li key={milestone.id}>
                          <Link
                            className="flex items-center gap-2 rounded-md bg-card/70 px-3 py-2 text-sm transition-colors hover:bg-card"
                            href={`/industry/projects/${project.id}`}
                          >
                            <span className="min-w-0 flex-1 truncate font-semibold text-ink">
                              {milestone.label} — {project.title}
                            </span>
                            <Icon className="shrink-0 text-ink-muted" name="chevron-right" size={16} />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Card>
            ) : null}

            {/* What the platform did while nobody was here. */}
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-tint-orchid text-on-tint-orchid">
                  <Icon name="bot" size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-ink">Found for you since your last visit</h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {matchAutomation ? `Challenge matching last ran ${relative(matchAutomation.lastRunAt)}.` : ""}{" "}
                    Nothing here was committed automatically — money and mentors always end at a person.
                  </p>
                  <dl className="mt-3 grid grid-cols-3 gap-2">
                    {(matchAutomation?.results ?? []).map((r) => (
                      <div className="rounded-md bg-card-muted p-3" key={r.label}>
                        <dt className="label-caps text-ink-faint">{r.label}</dt>
                        <dd className="mt-0.5 text-lg font-bold text-ink tabular-nums">{r.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <Link
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
                    href="/industry/automation"
                  >
                    Open the automation centre
                    <Icon name="chevron-right" size={15} />
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </Enter>
      ) : null}

      {/* -------------------------------------------------- recommendations */}
      <Enter index={3}>
        <div className="flex flex-col gap-4">
          <SectionHeader
            actionHref="/industry/opportunities"
            actionLabel="See all"
            icon="sparkles"
            title="Challenges for you"
          />
          <div className="grid gap-4 xl:grid-cols-2">
            {matches.slice(0, 4).map(({ challenge, match }) => (
              <ChallengeCard
                actions={
                  <ButtonLink href={`/industry/challenges/${challenge.id}`} size="sm">
                    View challenge
                  </ButtonLink>
                }
                challenge={challenge}
                key={challenge.id}
                match={match}
              />
            ))}
          </div>
        </div>
      </Enter>

      {/* ------------------------------------------------------- portfolio */}
      <Enter index={4}>
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader
              action={
                <ButtonLink href="/industry/projects" size="sm" tone="outline">
                  Open portfolio
                </ButtonLink>
              }
              icon="clipboard"
              subtitle="Everything you are currently carrying, and how far it has got."
              title="Your impact portfolio"
            />
            <ul className="mt-4 flex flex-col gap-2 px-6 pb-6">
              {state.projects.slice(0, 5).map((project) => (
                <li key={project.id}>
                  <Link
                    className="flex flex-wrap items-center gap-3 rounded-md bg-card-muted p-3 transition-colors hover:bg-container sm:flex-nowrap"
                    href={`/industry/projects/${project.id}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{project.title}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                        <span className="font-semibold text-ink-faint">{project.id}</span>
                        <span>{rupees(project.investment.committed)}</span>
                        <span>{people(project.peopleImpacted)} people</span>
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="w-28">
                        <span className="mb-1 block text-right text-xs font-bold text-ink tabular-nums">
                          {project.progress}%
                        </span>
                        <span className="block h-1.5 w-full overflow-hidden rounded-full bg-track">
                          <span
                            className={cx(
                              "block h-full rounded-full transition-[width] duration-700 ease-jm",
                              project.stage === "impact" ? "bg-mint" : "bg-primary",
                            )}
                            style={{ width: `${project.progress}%` }}
                          />
                        </span>
                      </span>
                      <Icon className="text-ink-muted" name="chevron-right" size={18} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          {/* The seven contributions, as the home screen's standing reminder
              that funding is one of them rather than the whole relationship. */}
          <Card className="flex flex-col p-6">
            <h2 className="headline-md text-ink">Seven ways to carry a challenge</h2>
            <p className="mt-1 text-sm text-ink-muted">
              You are currently providing{" "}
              <span className="font-semibold text-ink">
                {[...new Set(state.projects.flatMap((p) => p.providing))].length} of 7
              </span>{" "}
              across your portfolio.
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {Object.values(SUPPORT).map((meta) => {
                const active = state.projects.some((p) => p.providing.includes(meta.kind));
                return (
                  <li
                    className={cx(
                      "flex items-center gap-3 rounded-md p-2.5",
                      active ? "bg-card-muted" : "opacity-60",
                    )}
                    key={meta.kind}
                  >
                    <span
                      className={cx(
                        "flex size-8 shrink-0 items-center justify-center rounded-sm",
                        active ? "bg-primary-fixed text-on-primary-fixed-variant" : "bg-container text-ink-faint",
                      )}
                    >
                      <Icon name={meta.icon} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink">{meta.label}</span>
                      <span className="block truncate text-xs text-ink-muted">{meta.gives}</span>
                    </span>
                    {active ? <Icon className="shrink-0 text-impact-deep" name="check" size={16} /> : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </Enter>
    </div>
  );
}

function Snapshot({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "warning";
}) {
  return (
    <div className={cx("rounded-md p-3", tone === "warning" ? "bg-warning-tint" : "bg-card-muted")}>
      <dt className={cx("label-caps", tone === "warning" ? "text-on-warning-tint/80" : "text-ink-faint")}>
        {label}
      </dt>
      <dd className={cx("mt-0.5 text-xl font-bold tabular-nums", tone === "warning" ? "text-on-warning-tint" : "text-ink")}>
        {value}
      </dd>
      {hint ? (
        <dd className={cx("text-xs", tone === "warning" ? "text-on-warning-tint/80" : "text-ink-muted")}>
          {hint}
        </dd>
      ) : null}
    </div>
  );
}
