"use client";

/**
 * Challenge dossier.
 *
 * One validated problem, every face of it a partner is entitled to see: what
 * citizens reported in aggregate, what the system understood, why the state
 * ranks it where it does, who is already on it, what it would cost, what
 * success is defined as before anyone commits — and then the seven ways to
 * carry it.
 *
 * Two decisions shape the page. Actions sit next to the evidence for them, so
 * nobody commits money on one screen having read the case on another. And every
 * headline figure carries its source, because a partner is being asked to spend
 * against these numbers and a number with no method behind it is a claim.
 */

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { AuditTrail } from "@/components/gov/pieces";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Enter,
  cx,
  TINT,
} from "@/components/ui";
import { Modal, Tabs } from "@/components/ui-interactive";
import { CollaborationGraph } from "@/components/industry/graph";
import {
  ChallengeStatusBadge,
  DomainChip,
  EvidenceList,
  FundingLedger,
  MatchExplain,
  MatchRing,
  PartnerRow,
  SdgChips,
  SeverityBadge,
  SupportOption,
} from "@/components/industry/pieces";
import { DOMAIN_ICON, DOMAIN_LABEL, DOMAIN_TINT } from "@/lib/industry/vocabulary";
import { exactRupees, people, rupees, shortDate, until } from "@/lib/industry/format";
import { SUPPORT } from "@/lib/industry/vocabulary";
import { csrBook, ledger, team as findTeam, university } from "@/lib/industry/selectors";
import { ChallengeService } from "@/lib/industry/service";
import { useChallenge, useIndustry } from "@/lib/industry/store";

import { SUPPORT_KINDS, type SupportKind } from "@/lib/industry/types";
import type { AuditEntry } from "@/lib/gov/types";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "evidence", label: "Evidence" },
  { id: "impact", label: "Why it matters" },
  { id: "partners", label: "University & team" },
  { id: "funding", label: "Funding" },
  { id: "support", label: "How you can help" },
  { id: "collaboration", label: "Collaboration" },
  { id: "timeline", label: "Audit trail" },
];

export default function ChallengeDossier() {
  const params = useParams<{ id: string }>();
  const { state, dispatch, can } = useIndustry();
  const scored = useChallenge(params.id);
  const [tab, setTab] = useState("overview");
  const [fundOpen, setFundOpen] = useState(false);

  /**
   * The public timeline, fetched rather than derived.
   *
   * It used to be computed in the browser by `visibility.ts` from the full
   * government audit trail — which meant the unredacted trail had to be in the
   * browser for it to be collapsed. The server sends the collapsed one now and
   * the raw entries never leave it.
   */
  const [timeline, setTimeline] = useState<AuditEntry[]>([]);
  useEffect(() => {
    let cancelled = false;
    void ChallengeService.timeline(params.id)
      .then((entries) => {
        if (!cancelled) setTimeline(entries as AuditEntry[]);
      })
      .catch(() => {
        if (!cancelled) setTimeline([]);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (!scored) notFound();
  const { challenge, match } = scored;

  const book = ledger(challenge);
  const uni = university(state.universities, challenge.universityId);
  const team = findTeam(state.teams, challenge.teamId);
  // The faculty guide travels on the team now, narrowed server-side to a name,
  // a designation and an expertise list.
  const faculty = team?.guide;
  const project = state.projects.find((p) => p.challengeId === challenge.id);
  const request = state.requests.find((r) => r.challengeId === challenge.id);
  const interested = state.interests.includes(challenge.id);
  const tint = DOMAIN_TINT[challenge.domain];

  return (
    <div className="flex flex-col gap-6">
      {/* ----------------------------------------------------------- header */}
      <Enter>
        <Card className="p-6 lg:p-8">
          <nav className="label-caps mb-3 flex flex-wrap items-center gap-2 text-ink-faint">
            <Link className="hover:text-ink" href="/industry/discover">
              Challenges
            </Link>
            <Icon name="chevron-right" size={12} />
            <span>{DOMAIN_LABEL[challenge.domain]}</span>
            <Icon name="chevron-right" size={12} />
            <span>{challenge.id}</span>
          </nav>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <div className="flex items-start gap-4">
                <span
                  className={cx(
                    "flex size-12 shrink-0 items-center justify-center rounded-[16px]",
                    TINT[tint].wash,
                  )}
                >
                  <Icon name={DOMAIN_ICON[challenge.domain]} size={24} />
                </span>
                <h1 className="headline-xl min-w-0 text-balance text-ink">{challenge.title}</h1>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ChallengeStatusBadge status={challenge.status} />
                <SeverityBadge severity={challenge.severity} />
                {challenge.governmentValidated ? (
                  <Badge icon="shield" tone="success">
                    Government validated
                  </Badge>
                ) : null}
                {challenge.responseDueAt ? (
                  <Badge icon="clock" tone="warning">
                    Partner window closes {until(challenge.responseDueAt)}
                  </Badge>
                ) : null}
                <DomainChip domain={challenge.domain} />
              </div>

              <p className="mt-4 text-base text-ink-muted">{challenge.summary}</p>
            </div>

            {/* The match, and the action it justifies, in one column. */}
            <Card className="w-full shrink-0 bg-card-muted p-5 lg:w-80" tone="flat">
              <div className="flex items-center gap-4">
                <MatchRing band={match.band} score={match.score} size={76} />
                <div className="min-w-0">
                  <p className="font-bold text-ink">
                    {match.score}% match with {state.company.name}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-muted">{match.headline}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {book.outstanding > 0 && can("funding.commit") ? (
                  <Button icon="banknote" onClick={() => setFundOpen(true)}>
                    Fund this challenge
                  </Button>
                ) : null}
                {!can("funding.commit") ? (
                  <p className="rounded-md bg-container p-3 text-xs text-ink-muted">
                    <Icon className="mr-1 inline align-[-2px]" name="lock" size={12} />
                    {state.user.name} can review and mentor but cannot commit funding. Switch to the
                    CSR lead in the header to commit.
                  </p>
                ) : null}
                <Button
                  disabled={interested}
                  icon={interested ? "check" : "thumbs-up"}
                  onClick={() => dispatch({ type: "interest/express", challengeId: challenge.id })}
                  tone="outline"
                >
                  {interested ? "Interest registered" : "Express interest"}
                </Button>
                {request ? (
                  <ButtonLink href="/industry/mentorship" icon="users" tone="outline">
                    Mentor the team
                  </ButtonLink>
                ) : null}
                {project ? (
                  <ButtonLink href={`/industry/projects/${project.id}`} icon="clipboard" tone="tonal">
                    Open project {project.id}
                  </ButtonLink>
                ) : null}
              </div>
            </Card>
          </div>

          {/* The five figures a partner reads before anything else. */}
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-6 sm:grid-cols-3 lg:grid-cols-6">
            <Figure label="Priority" value={`${challenge.priority}`} hint="of 100, state weighting" />
            <Figure label="People affected" value={people(challenge.affected)} hint={`${challenge.villages.length} villages`} />
            <Figure label="Citizen reports" value={String(challenge.reportCount)} hint={`over ${challenge.durationDays} days`} />
            <Figure label="Estimated cost" value={rupees(challenge.estimatedCost)} hint={book.outstanding ? `${rupees(book.outstanding)} outstanding` : "fully funded"} />
            <Figure label="Location" value={challenge.district.replace(" District", "")} hint={challenge.state} />
            <Figure label="Timeline" value={`${challenge.timelineDays} days`} hint="to handover" />
          </dl>
        </Card>
      </Enter>

      <Enter index={1}>
        <Tabs onChange={setTab} tabs={TABS} value={tab} />
      </Enter>

      {/* --------------------------------------------------------- overview */}
      {tab === "overview" ? (
        <Enter index={2}>
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-6 xl:col-span-2">
              <h2 className="headline-md text-ink">Why you are seeing this</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Scored against what your company declared, not against a black box. Every row points
                at a field you can change in your profile.
              </p>
              <div className="mt-5">
                <MatchExplain match={match} />
              </div>
            </Card>

            <div className="flex flex-col gap-4">
              <Card className="p-6">
                <h2 className="headline-md text-ink">What it needs</h2>
                <ul className="mt-4 flex flex-col gap-2">
                  {challenge.supportNeeded.map((k) => (
                    <li className="flex items-start gap-3" key={k}>
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-primary-fixed text-on-primary-fixed-variant">
                        <Icon name={SUPPORT[k].icon} size={16} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-ink">{SUPPORT[k].label}</span>
                        <span className="block text-xs text-ink-muted">{SUPPORT[k].blurb}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {challenge.technologies.length ? (
                  <div className="mt-5 border-t border-line pt-4">
                    <p className="label-caps text-ink-faint">Technologies involved</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {challenge.technologies.map((t) => {
                        const held = state.company.technologyDomains.includes(t);
                        return (
                          <li
                            className={cx(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                              held ? "bg-tint-mint text-on-tint-mint" : "bg-container text-ink-muted",
                            )}
                            key={t}
                          >
                            <Icon name={held ? "check" : "minus"} size={11} />
                            {t}
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-2 text-xs text-ink-muted">
                      Green is a domain you practise. The rest is where a university lab or a
                      co-development partner comes in.
                    </p>
                  </div>
                ) : null}
              </Card>

              <Card className="p-6">
                <h2 className="headline-md text-ink">Sustainable Development Goals</h2>
                <div className="mt-3">
                  <SdgChips max={8} sdgs={challenge.sdgs} />
                </div>
              </Card>
            </div>
          </div>
        </Enter>
      ) : null}

      {/* --------------------------------------------------------- evidence */}
      {tab === "evidence" ? (
        <Enter index={2}>
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-6 xl:col-span-2">
              <h2 className="headline-md text-ink">Citizen evidence</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Aggregate only. {challenge.reportCount} residents reported this over{" "}
                {challenge.durationDays} days; the platform clustered them as{" "}
                <span className="font-semibold text-ink">&ldquo;{challenge.clusterLabel}&rdquo;</span> at{" "}
                {challenge.aiConfidence}% classification confidence.
              </p>

              <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Well label="Reports" value={String(challenge.reportCount)} />
                <Well label="Duration" value={`${challenge.durationDays} days`} />
                <Well label="Severity" value={challenge.severity} />
                <Well label="Deprivation" value={`${challenge.deprivationIndex} / 100`} />
              </dl>

              <div className="mt-6 border-t border-line pt-5">
                <p className="label-caps text-ink-faint">Villages affected</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {challenge.villages.map((v) => (
                    <li
                      className="inline-flex items-center gap-1 rounded-full bg-card-muted px-2.5 py-1 text-xs font-semibold text-ink"
                      key={v}
                    >
                      <Icon name="map-pin" size={11} />
                      {v}
                    </li>
                  ))}
                </ul>
              </div>
            </Card>

            {/* The redaction policy, on the screen it applies to. */}
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-tint-navy text-on-tint-navy">
                  <Icon name="lock" size={17} />
                </span>
                <h2 className="headline-md text-ink">What you cannot see</h2>
              </div>
              <p className="mt-2 text-sm text-ink-muted">
                Individual reports, reporter names and the verbatim text of what residents said are
                never shared with a partner. Neither are report coordinates, officer notes, or other
                partners&rsquo; proposals.
              </p>
              <ul className="mt-4 flex flex-col gap-3">
                {state.redactions.slice(0, 4).map((r) => (
                  <li className="text-xs" key={r.visible}>
                    <span className="flex gap-1.5 text-ink">
                      <Icon className="mt-px shrink-0 text-impact-deep" name="eye" size={12} />
                      <span>{r.visible}</span>
                    </span>
                    <span className="mt-1 flex gap-1.5 text-ink-muted">
                      <Icon className="mt-px shrink-0 text-ink-faint" name="lock" size={12} />
                      <span>{r.hidden}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </Enter>
      ) : null}

      {/* ----------------------------------------------------- why it matters */}
      {tab === "impact" ? (
        <Enter index={2}>
          <div className="flex flex-col gap-4">
            <Card className="p-6 lg:p-8">
              <h2 className="headline-lg text-ink">Why this challenge matters</h2>
              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <Headline value={people(challenge.affected)} label="People affected" tint="navy" />
                <Headline value={String(challenge.villages.length)} label="Villages" tint="mint" />
                <Headline value={String(challenge.reportCount)} label="Citizen reports" tint="orchid" />
                <Headline value={`${challenge.deprivationIndex}`} label="Deprivation index" tint="clay" />
                <Headline value={rupees(challenge.estimatedCost)} label="Estimated cost" tint="amber" />
              </div>
              <p className="mt-6 rounded-md bg-card-muted p-4 text-sm text-ink-muted">
                <Icon className="mr-1.5 inline align-[-2px] text-ink-faint" name="scale" size={14} />
                At the full estimate this works out to{" "}
                <span className="font-bold text-ink">
                  {exactRupees(Math.round(challenge.estimatedCost / Math.max(1, challenge.affected)))}
                </span>{" "}
                per person affected — before any co-funder joins.
              </p>
            </Card>

            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="p-6">
                <h2 className="headline-md text-ink">Where these numbers come from</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  No figure on this page is asserted without its method.
                </p>
                <div className="mt-5">
                  <EvidenceList lines={challenge.evidence} />
                </div>
              </Card>

              <Card className="p-6">
                <h2 className="headline-md text-ink">What success would be</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Agreed before commitment, so the impact claim at the end has something to be
                  measured against.
                </p>
                {challenge.expectedOutcomes.length ? (
                  <ul className="mt-5 flex flex-col gap-4">
                    {challenge.expectedOutcomes.map((o) => (
                      <li key={o.label}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-sm font-bold text-ink">{o.label}</span>
                          <span className="text-sm font-semibold text-impact-deep">{o.target}</span>
                        </div>
                        <p className="mt-1 text-xs text-ink-muted">Measured by: {o.method}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-ink-muted">
                    Outcome targets are agreed with the department at the proposal stage.
                  </p>
                )}
              </Card>
            </div>
          </div>
        </Enter>
      ) : null}

      {/* -------------------------------------------------------- partners */}
      {tab === "partners" ? (
        <Enter index={2}>
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-6 xl:col-span-2">
              <h2 className="headline-md text-ink">Who is already on this</h2>
              {uni && team ? (
                <div className="mt-5 flex flex-col gap-3">
                  <PartnerRow
                    icon="landmark"
                    name={challenge.department}
                    organisation={`${challenge.block}, ${challenge.district}`}
                    role="Government — owns the problem and the handover"
                    tint="navy"
                  />
                  <PartnerRow
                    icon="graduation"
                    name={uni.name}
                    organisation={`${uni.city}, ${uni.state} · ${uni.accreditation}`}
                    role="University partner"
                    tint="orchid"
                    trailing={
                      <Badge dense tone={uni.deliveryScore >= 85 ? "success" : "info"}>
                        {uni.deliveryScore ? `${uni.deliveryScore}% delivery` : "New partner"}
                      </Badge>
                    }
                  />
                  {faculty ? (
                    <PartnerRow
                      icon="user"
                      name={faculty.name}
                      organisation={faculty.expertise.join(" · ")}
                      role={faculty.designation}
                      tint="blue"
                    />
                  ) : null}
                  <PartnerRow
                    icon="users"
                    name={team.name}
                    organisation={`${team.memberCount} students · ${team.skills.join(", ")}`}
                    role="Student team"
                    tint="mint"
                  />

                  <div className="mt-2 rounded-md bg-card-muted p-4">
                    <p className="label-caps text-ink-faint">Team members</p>
                    <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                      {team.members.map((m) => (
                        <li className="text-sm text-ink-muted" key={`${m.firstName}-${m.discipline}`}>
                          <span className="font-semibold text-ink">{m.firstName}</span> — {m.year},{" "}
                          {m.discipline}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 text-xs text-ink-faint">
                      <Icon className="mr-1 inline align-[-2px]" name="lock" size={11} />
                      First name, year and discipline only. Surnames, contact details and academic
                      records are never shared with a partner.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-md bg-card-muted p-5">
                  <p className="font-bold text-ink">No university team assigned yet</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    The district allocates a university once a partner is confirmed, or where a
                    department chooses to run the work in-house. Expressing interest is what starts
                    that allocation.
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="headline-md text-ink">What the team is asking for</h2>
              {request ? (
                <>
                  <p className="mt-3 rounded-md bg-card-muted p-4 text-sm text-ink-muted italic">
                    &ldquo;{request.need}&rdquo;
                  </p>
                  <ul className="mt-4 flex flex-wrap gap-1.5">
                    {request.roles.map((r) => (
                      <li
                        className="inline-flex items-center gap-1 rounded-full bg-tint-amber px-2.5 py-1 text-xs font-semibold text-on-tint-amber"
                        key={r}
                      >
                        <Icon name="user-plus" size={11} />
                        {r} mentor
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-ink-muted">
                    {request.hoursPerMonth} hours a month, at {request.stage} stage.
                  </p>
                  <ButtonLink className="mt-4 w-full" href="/industry/mentorship" tone="outline">
                    Offer a mentor
                  </ButtonLink>
                </>
              ) : (
                <p className="mt-3 text-sm text-ink-muted">
                  No open mentorship request on this challenge.
                </p>
              )}
            </Card>
          </div>
        </Enter>
      ) : null}

      {/* --------------------------------------------------------- funding */}
      {tab === "funding" ? (
        <Enter index={2}>
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-6 xl:col-span-2">
              <h2 className="headline-md text-ink">Funding position</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Large challenges are meant to be carried by more than one partner. Committed money
                fills the bar; proposed money is counted separately until it is signed.
              </p>
              <div className="mt-5">
                <FundingLedger challenge={challenge} />
              </div>

              {book.outstanding > 0 ? (
                <div className="mt-6 flex flex-wrap gap-3 border-t border-line pt-5">
                  {can("funding.commit") ? (
                    <Button icon="banknote" onClick={() => setFundOpen(true)}>
                      Commit funding
                    </Button>
                  ) : (
                    <p className="text-sm text-ink-muted">
                      <Icon className="mr-1 inline align-[-2px]" name="lock" size={13} />
                      Only the CSR lead can commit funding.
                    </p>
                  )}
                  <Button
                    disabled={interested}
                    onClick={() => dispatch({ type: "interest/express", challengeId: challenge.id })}
                    tone="outline"
                  >
                    {interested ? "Interest registered" : "Register interest first"}
                  </Button>
                </div>
              ) : null}
            </Card>

            <Card className="p-6">
              <h2 className="headline-md text-ink">How commitment works</h2>
              <ol className="mt-4 flex flex-col gap-3">
                {[
                  ["Review", "You read the evidence and the outcome targets."],
                  ["Funding intent", "You state an amount and what else you will provide."],
                  ["Proposal", "The platform assembles it for the department."],
                  ["Government approval", "The district countersigns, or asks for changes."],
                  ["Commitment", "The project opens with a milestone tranche schedule."],
                  ["Delivery", "Money releases as milestones are approved by you."],
                  ["Impact", "Citizen verification closes and the figures are recomputed."],
                ].map(([label, detail], i) => (
                  <li className="flex gap-3" key={label}>
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-xs font-bold text-on-primary-fixed-variant">
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-bold text-ink">{label}</span>
                      <span className="block text-xs text-ink-muted">{detail}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 rounded-md bg-warning-tint p-3 text-xs text-on-warning-tint">
                <Icon className="mr-1 inline align-[-2px]" name="warning" size={12} />
                No money moves through this platform. A commitment here is an undertaking the
                district countersigns; disbursement happens through your existing CSR process.
              </p>
            </Card>
          </div>
        </Enter>
      ) : null}

      {/* --------------------------------------------------------- support */}
      {tab === "support" ? (
        <Enter index={2}>
          <Card className="p-6 lg:p-8">
            <h2 className="headline-lg text-ink">How you can carry this</h2>
            <p className="mt-2 max-w-2xl text-sm text-ink-muted">
              Funding is one of seven. A partner who lends an instrumentation lab and two engineers
              to a student team is doing more for the outcome than one who wires a cheque and leaves
              — so the platform asks for all seven, and records which ones you gave.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {SUPPORT_KINDS.map((kind) => (
                <SupportOption
                  key={kind}
                  kind={kind}
                  selected={challenge.supportNeeded.includes(kind)}
                />
              ))}
            </div>
            <p className="mt-4 text-xs text-ink-muted">
              Highlighted contributions are the ones this challenge specifically asks for. You can
              offer any of the seven at commitment.
            </p>
          </Card>
        </Enter>
      ) : null}

      {/* --------------------------------------------------- collaboration */}
      {tab === "collaboration" ? (
        <Enter index={2}>
          <Card className="p-6 lg:p-8">
            <h2 className="headline-lg text-ink">Who does what, and when</h2>
            <p className="mt-2 max-w-3xl text-sm text-ink-muted">
              Four parties, five stages. The government&rsquo;s work is front- and back-loaded;
              citizens appear twice — once to report the problem and once to confirm it was fixed;
              industry is present at every stage rather than only at the cheque.
            </p>
            <div className="mt-6">
              <CollaborationGraph challenge={challenge} project={project} />
            </div>
          </Card>
        </Enter>
      ) : null}

      {/* -------------------------------------------------------- timeline */}
      {tab === "timeline" ? (
        <Enter index={2}>
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-6 xl:col-span-2">
              <h2 className="headline-md text-ink">Audit trail</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Every state change on this record, with the actor that caused it. Citizen entries are
                collapsed to a count and officers appear by office rather than by name.
              </p>
              <div className="mt-5">
                <AuditTrail entries={timeline} />
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="headline-md text-ink">Government record</h2>
              <dl className="mt-4 flex flex-col gap-3">
                <Line label="Validated by" value={challenge.validatedBy ?? "—"} />
                <Line label="Owning department" value={challenge.department} />
                <Line label="Jurisdiction" value={`${challenge.block}, ${challenge.district}`} />
                {challenge.sanctionReference ? (
                  <Line label="Sanction reference" value={challenge.sanctionReference} />
                ) : null}
                <Line label="Published to partners" value={shortDate(challenge.publishedAt)} />
                {challenge.responseDueAt ? (
                  <Line label="Partner window closes" value={until(challenge.responseDueAt)} />
                ) : null}
              </dl>
            </Card>
          </div>
        </Enter>
      ) : null}

      <FundModal
        challengeId={challenge.id}
        onClose={() => setFundOpen(false)}
        open={fundOpen}
      />
    </div>
  );
}

/* ============================================================== modal === */

/**
 * The commitment dialog.
 *
 * It shows the full ledger rather than only the amount being entered, because
 * the decision a partner is making is "what share of this do we carry?", not
 * "what number goes in the box". The tranche preview is there so nobody
 * discovers after signing that the money is tied to milestones they will have
 * to review.
 */
function FundModal({
  challengeId,
  open,
  onClose,
}: {
  challengeId: string;
  open: boolean;
  onClose: () => void;
}) {
  const { state, dispatch } = useIndustry();
  const scored = useChallenge(challengeId);
  const [amount, setAmount] = useState<number | null>(null);
  const [offering, setOffering] = useState<SupportKind[]>(["fund"]);
  /* Holds the amount that was committed. The ledger below is live, so by the
     time the confirmation renders the outstanding balance has already moved —
     reading it back would report zero. */
  const [committed, setCommitted] = useState<number | null>(null);

  if (!scored) return null;
  const { challenge } = scored;
  const book = ledger(challenge);
  const value = amount ?? book.outstanding;
  const share = book.required ? Math.round((value / book.required) * 100) : 0;
  const project = state.projects.find((p) => p.challengeId === challenge.id);
  const { available } = csrBook(state.company, state.projects, state.challenges);

  const commit = () => {
    dispatch({
      type: "funding/commit",
      challengeId: challenge.id,
      amount: value,
      alsoOffering: offering,
    });
    setCommitted(value);
  };

  if (committed !== null) {
    return (
      <Modal
        footer={
          <>
            <Button onClick={onClose} tone="outline">
              Close
            </Button>
            <ButtonLink href="/industry/mentorship" icon="users">
              Offer a mentor too
            </ButtonLink>
          </>
        }
        onClose={() => {
          setCommitted(null);
          onClose();
        }}
        open={open}
        subtitle={`${rupees(committed)} committed to ${challenge.title}`}
        title="Commitment recorded"
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-tint-mint p-5 text-on-tint-mint">
            <p className="label-caps opacity-80">Status</p>
            <p className="headline-md mt-1">Awaiting government countersignature</p>
            <p className="stat-number mt-2">{rupees(committed)}</p>
            <p className="mt-2 text-sm opacity-90">
              The district has the proposal. Approvals on comparable commitments have taken a median
              of six days. Nothing has been debited — disbursement runs through your own CSR process
              against the milestone schedule below.
            </p>
          </div>

          {project ? (
            <div className="rounded-md bg-card-muted p-4">
              <p className="font-bold text-ink">Project {project.id} opened</p>
              <p className="mt-1 text-sm text-ink-muted">
                {challenge.teamId ? `The university team has been notified and the milestone plan is live.` : "The district will assign a university team."}
              </p>
              <ButtonLink className="mt-3" href={`/industry/projects/${project.id}`} size="sm" tone="outline">
                Open the project
              </ButtonLink>
            </div>
          ) : null}

          <div className="rounded-md bg-card-muted p-4">
            <p className="font-bold text-ink">Would you also like to mentor the team?</p>
            <p className="mt-1 text-sm text-ink-muted">
              Funding gets a build started. A named engineer in the team&rsquo;s design reviews is
              what tends to get it finished — and it is the contribution universities ask for most.
            </p>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} tone="outline">
            Cancel
          </Button>
          <Button disabled={value <= 0} icon="check" onClick={commit}>
            Commit {rupees(value)}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      subtitle={challenge.title}
      title="Fund this challenge"
    >
      <div className="flex flex-col gap-5">
        {/* The whole ledger, not just the box. */}
        <div>
          <p className="label-caps text-ink-faint">Current position</p>
          <div className="mt-2">
            <FundingLedger challenge={challenge} />
          </div>
        </div>

        <div>
          <label className="label-caps mb-1.5 block text-ink-faint" htmlFor="fund-amount">
            Your contribution
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-ink">₹</span>
            <input
              className="h-12 w-full rounded-md border border-line bg-card-muted px-4 text-base font-semibold text-ink tabular-nums focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary focus:outline-none"
              id="fund-amount"
              inputMode="numeric"
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0))}
              value={value}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {[book.outstanding, Math.round(book.outstanding / 2), Math.round(book.outstanding / 4)]
              .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
              .map((v, i) => (
                <button
                  className="rounded-full bg-container px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:bg-navy-tint"
                  key={v}
                  onClick={() => setAmount(v)}
                  type="button"
                >
                  {i === 0 ? "Carry all of it" : `${i === 1 ? "Half" : "A quarter"} — ${rupees(v)}`}
                </button>
              ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">
            {share}% of the total estimate.{" "}
            {value > available
              ? "This exceeds your remaining CSR allocation for the year."
              : `Leaves ${rupees(available - value)} of your FY allocation uncommitted.`}
          </p>
        </div>

        <div>
          <p className="label-caps mb-2 text-ink-faint">What else will you provide?</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {challenge.supportNeeded
              .filter((k) => k !== "fund")
              .map((kind) => (
                <SupportOption
                  key={kind}
                  kind={kind}
                  onToggle={() =>
                    setOffering((prev) =>
                      prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind],
                    )
                  }
                  selected={offering.includes(kind)}
                />
              ))}
          </div>
        </div>

        <div className="rounded-md bg-card-muted p-4">
          <p className="label-caps text-ink-faint">What this buys, if the targets are met</p>
          <dl className="mt-2 grid grid-cols-3 gap-3">
            <div>
              <dt className="text-xs text-ink-muted">People reached</dt>
              <dd className="text-lg font-bold text-ink tabular-nums">{people(challenge.affected)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Cost per person</dt>
              <dd className="text-lg font-bold text-ink tabular-nums">
                {exactRupees(Math.round(value / Math.max(1, challenge.affected)))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Timeline</dt>
              <dd className="text-lg font-bold text-ink tabular-nums">{challenge.timelineDays} days</dd>
            </div>
          </dl>
        </div>

        <p className="rounded-md bg-warning-tint p-3 text-xs text-on-warning-tint">
          <Icon className="mr-1 inline align-[-2px]" name="warning" size={12} />
          This platform does not move money. Committing records an undertaking for the district to
          countersign and opens the milestone schedule; disbursement runs through your existing CSR
          process.
        </p>
      </div>
    </Modal>
  );
}

/* ============================================================== bits === */

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="label-caps text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-lg font-bold text-ink tabular-nums">{value}</dd>
      {hint ? <dd className="text-xs text-ink-muted">{hint}</dd> : null}
    </div>
  );
}

function Well({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-card-muted p-3">
      <dt className="label-caps text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-ink capitalize tabular-nums">{value}</dd>
    </div>
  );
}

function Headline({ value, label, tint }: { value: string; label: string; tint: keyof typeof TINT }) {
  return (
    <div className={cx("rounded-lg p-4", TINT[tint].wash)}>
      <p className="stat-number">{value}</p>
      <p className="mt-1 text-sm font-semibold opacity-90">{label}</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-caps text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}
