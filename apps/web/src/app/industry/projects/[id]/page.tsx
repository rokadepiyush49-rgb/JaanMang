"use client";

/**
 * Project dossier.
 *
 * A partner who has committed money has a different job from one who is still
 * deciding: not "is this worth doing?" but "is it being done, and is anything
 * waiting on me?". So the page opens with the milestone that needs a decision
 * and the money that is held behind it, and the celebration — impact — is at
 * the far end where it has been earned.
 */

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { AuditTrail } from "@/components/gov/pieces";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Enter,
  Progress,
  cx,
} from "@/components/ui";
import { Modal, Tabs } from "@/components/ui-interactive";
import { CollaborationGraph } from "@/components/industry/graph";
import {
  CountUp,
  MilestoneTrail,
  PartnerRow,
  SdgChips,
  StageBadge,
  StageTrail,
  SupportChips,
} from "@/components/industry/pieces";
import { exactRupees, people, rupees, shortDate, until } from "@/lib/industry/format";
import { team as findTeam, university } from "@/lib/industry/selectors";
import { useIndustry, useProject } from "@/lib/industry/store";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "milestones", label: "Milestones" },
  { id: "pilot", label: "Pilot" },
  { id: "team", label: "Team & partners" },
  { id: "money", label: "Money" },
  { id: "documents", label: "Documents" },
  { id: "impact", label: "Impact" },
  { id: "audit", label: "Audit trail" },
];

export default function ProjectDossier() {
  const params = useParams<{ id: string }>();
  const { state, dispatch, can } = useIndustry();
  const project = useProject(params.id);
  const [tab, setTab] = useState("overview");
  const [changesFor, setChangesFor] = useState<string | null>(null);
  const [note, setNote] = useState("");

  if (!project) notFound();

  const challenge = state.challenges.find((c) => c.id === project.challengeId);
  const uni = university(state.universities, project.universityId);
  const team = findTeam(state.teams, project.teamId);
  const faculty = team?.guide;
  const assignments = state.assignments.filter((a) => a.projectId === project.id);
  const thread = state.threads.find((t) => t.projectId === project.id);
  const pending = project.milestones.filter((m) => m.awaitingReview);
  const shared = project.documents.filter((d) => d.sharedWith.includes("industry"));
  const withheld = project.documents.length - shared.length;

  const approve = (id: string) =>
    dispatch({ type: "milestone/approve", projectId: project.id, milestoneId: id });

  return (
    <div className="flex flex-col gap-6">
      {/* ----------------------------------------------------------- header */}
      <Enter>
        <Card className="p-6 lg:p-8">
          <nav className="label-caps mb-3 flex flex-wrap items-center gap-2 text-ink-faint">
            <Link className="hover:text-ink" href="/industry/projects">
              Portfolio
            </Link>
            <Icon name="chevron-right" size={12} />
            <span>{project.id}</span>
          </nav>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 max-w-3xl">
              <h1 className="headline-xl text-balance text-ink">{project.title}</h1>
              <p className="mt-2 text-sm text-ink-muted">
                {uni?.name} · {project.governmentBody}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <StageBadge stage={project.stage} />
                <SupportChips kinds={project.providing} />
                {challenge ? (
                  <Link
                    className="inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline"
                    href={`/industry/challenges/${challenge.id}`}
                  >
                    <Icon name="arrow-up-right" size={12} />
                    Original challenge {challenge.id}
                  </Link>
                ) : null}
              </div>
            </div>

            <Card className="w-full shrink-0 bg-card-muted p-5 lg:w-80" tone="flat">
              <div className="flex items-baseline justify-between">
                <span className="label-caps text-ink-faint">Progress</span>
                <span className="stat-number text-ink">{project.progress}%</span>
              </div>
              <Progress
                className="mt-2"
                label={`${project.title} progress`}
                tone={project.stage === "impact" ? "impact" : "navy"}
                value={project.progress}
              />
              <dl className="mt-4 grid grid-cols-2 gap-3">
                <Line label="Committed" value={rupees(project.investment.committed)} />
                <Line label="Released" value={rupees(project.investment.disbursed)} />
                <Line label="Started" value={shortDate(project.startedAt)} />
                <Line label="Due" value={until(project.expectedCompletion)} />
              </dl>
              {pending.length && can("milestone.approve") ? (
                <Button
                  className="mt-4 w-full"
                  icon="eye"
                  onClick={() => setTab("milestones")}
                >
                  Review {pending.length} milestone{pending.length === 1 ? "" : "s"}
                </Button>
              ) : null}
              {thread ? (
                <ButtonLink className="mt-2 w-full" href="/industry/messages" tone="outline">
                  Open project thread
                </ButtonLink>
              ) : null}
            </Card>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <StageTrail stage={project.stage} />
          </div>
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
              <h2 className="headline-md text-ink">Where it stands</h2>
              <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Big label="People reached" value={people(project.peopleImpacted)} hint={`${project.villages} villages & wards`} />
                <Big label="Cost per person" value={exactRupees(Math.round(project.investment.committed / Math.max(1, project.peopleImpacted)))} hint="on committed funds" />
                <Big label="Clusters closed" value={String(project.clustersClosed)} hint="citizen problem clusters" />
                <Big label="Milestones" value={`${project.milestones.filter((m) => m.status === "complete").length} / ${project.milestones.length}`} hint="complete" />
              </dl>

              <div className="mt-6 border-t border-line pt-5">
                <p className="label-caps text-ink-faint">The government&rsquo;s role</p>
                <p className="mt-1.5 text-sm text-ink-muted">
                  <span className="font-semibold text-ink">{project.governmentBody}</span> —{" "}
                  {project.governmentRole}
                </p>
              </div>

              <div className="mt-5 border-t border-line pt-5">
                <p className="label-caps text-ink-faint">Sustainable Development Goals</p>
                <div className="mt-2">
                  <SdgChips max={8} sdgs={project.sdgs} />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="headline-md text-ink">What you are providing</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {project.providing.length} of the seven contributions.
              </p>
              <div className="mt-4">
                <SupportChips kinds={project.providing} />
              </div>

              {assignments.length ? (
                <div className="mt-6 border-t border-line pt-5">
                  <p className="label-caps text-ink-faint">Your mentors on this</p>
                  <ul className="mt-2 flex flex-col gap-2">
                    {assignments.map((a) => {
                      const mentor = state.company.mentors.find((m) => m.id === a.mentorId);
                      return (
                        <li className="text-sm" key={a.id}>
                          <span className="font-semibold text-ink">{mentor?.name}</span>
                          <span className="block text-xs text-ink-muted">
                            {a.roles.join(", ")} · {a.sessions.filter((s) => s.done).length} sessions held
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </Card>
          </div>
        </Enter>
      ) : null}

      {/* ------------------------------------------------------- milestones */}
      {tab === "milestones" ? (
        <Enter index={2}>
          <Card className="p-6 lg:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="headline-md text-ink">Milestones</h2>
                <p className="mt-1 max-w-2xl text-sm text-ink-muted">
                  Money releases against these, which is why your review is not a formality — an
                  unreviewed milestone holds the tranche behind it and stalls the team.
                </p>
              </div>
              {!can("milestone.approve") ? (
                <Badge icon="lock" tone="neutral">
                  {state.user.name} cannot approve milestones
                </Badge>
              ) : null}
            </div>
            <div className="mt-6">
              <MilestoneTrail
                canReview={can("milestone.approve")}
                milestones={project.milestones}
                onApprove={approve}
                onRequestChanges={(id) => {
                  setChangesFor(id);
                  setNote("");
                }}
              />
            </div>
          </Card>
        </Enter>
      ) : null}

      {/* ------------------------------------------------------------ pilot */}
      {tab === "pilot" ? (
        <Enter index={2}>
          {project.pilot ? (
            <div className="flex flex-col gap-4">
              <Card className="p-6 lg:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="headline-lg text-ink">Pilot in the field</h2>
                    <p className="mt-1 text-sm text-ink-muted">
                      {project.pilot.location} · day {project.pilot.dayOfPlan} of{" "}
                      {project.pilot.durationDays}
                    </p>
                  </div>
                  <Badge icon="rocket" tone="info">
                    Running
                  </Badge>
                </div>

                <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Big label="Users" value={people(project.pilot.users)} hint={`${project.pilot.villages} villages`} />
                  <Big label="Adoption" value={`${project.pilot.adoption}%`} hint="of the eligible population" />
                  <Big label="Reliability" value={`${project.pilot.reliability}%`} hint="uptime in the field" />
                  <Big
                    label="Targets met"
                    value={`${project.pilot.metrics.filter((m) => m.met).length} / ${project.pilot.metrics.length}`}
                    hint="against what was agreed"
                  />
                </dl>

                <div className="mt-6">
                  <Progress
                    label="Pilot elapsed"
                    value={(project.pilot.dayOfPlan / project.pilot.durationDays) * 100}
                  />
                  <p className="mt-1.5 text-xs text-ink-muted">
                    {project.pilot.durationDays - project.pilot.dayOfPlan} days remaining in the pilot
                    window.
                  </p>
                </div>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card className="p-6">
                  <h2 className="headline-md text-ink">Success metrics</h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    The targets agreed at commitment, and what the field is actually returning.
                  </p>
                  <ul className="mt-5 flex flex-col gap-3">
                    {project.pilot.metrics.map((m) => (
                      <li
                        className={cx(
                          "flex flex-wrap items-center gap-3 rounded-md p-3",
                          m.met ? "bg-success-tint" : "bg-warning-tint",
                        )}
                        key={m.label}
                      >
                        <Icon
                          className={cx("shrink-0", m.met ? "text-on-success-tint" : "text-on-warning-tint")}
                          name={m.met ? "check-circle" : "warning"}
                          size={18}
                        />
                        <span className={cx("min-w-0 flex-1 text-sm font-semibold", m.met ? "text-on-success-tint" : "text-on-warning-tint")}>
                          {m.label}
                        </span>
                        <span className={cx("text-sm font-bold tabular-nums", m.met ? "text-on-success-tint" : "text-on-warning-tint")}>
                          {m.value}
                        </span>
                        <span className={cx("text-xs tabular-nums", m.met ? "text-on-success-tint/80" : "text-on-warning-tint/80")}>
                          target {m.target}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {project.pilot.issues.length ? (
                    <div className="mt-6 border-t border-line pt-5">
                      <p className="label-caps text-ink-faint">Open issues</p>
                      <ul className="mt-2 flex flex-col gap-2">
                        {project.pilot.issues.map((issue) => (
                          <li className="flex items-center gap-2 text-sm" key={issue.id}>
                            <Icon
                              className={cx("shrink-0", issue.open ? "text-warning" : "text-impact-deep")}
                              name={issue.open ? "alert-circle" : "check-circle"}
                              size={15}
                            />
                            <span className={cx("min-w-0 flex-1", issue.open ? "text-ink" : "text-ink-muted line-through")}>
                              {issue.label}
                            </span>
                            <Badge dense tone={issue.open ? "warning" : "success"}>
                              {issue.open ? "open" : "resolved"}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </Card>

                <Card className="p-6">
                  <h2 className="headline-md text-ink">What people in the pilot say</h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    Collected by the student team during the field visit, attributed by role and
                    village rather than by name.
                  </p>
                  <ul className="mt-5 flex flex-col gap-4">
                    {project.pilot.feedback.map((f) => (
                      <li className="rounded-md bg-card-muted p-4" key={f.quote.slice(0, 24)}>
                        <p className="text-sm text-ink italic">&ldquo;{f.quote}&rdquo;</p>
                        <p className="mt-2 text-xs font-semibold text-ink-muted">
                          {f.from} · {f.village}
                        </p>
                      </li>
                    ))}
                  </ul>
                </Card>
              </div>
            </div>
          ) : (
            <Card>
              <EmptyState
                icon="rocket"
                message={`This project is at ${project.stage.replace("_", " ")} stage. A pilot opens once field testing is signed off, and the metrics agreed at commitment become live here.`}
                title="No pilot running yet"
                tone="info"
              />
            </Card>
          )}
        </Enter>
      ) : null}

      {/* ------------------------------------------------------------- team */}
      {tab === "team" ? (
        <Enter index={2}>
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="p-6 xl:col-span-2">
              <h2 className="headline-md text-ink">Everyone on this project</h2>
              <div className="mt-5 flex flex-col gap-3">
                <PartnerRow
                  icon="landmark"
                  name={project.governmentBody}
                  organisation={project.governmentRole}
                  role="Government"
                  tint="navy"
                />
                {uni ? (
                  <PartnerRow
                    icon="graduation"
                    name={uni.name}
                    organisation={`${uni.city}, ${uni.state}`}
                    role="University"
                    tint="orchid"
                    trailing={
                      <ButtonLink href="/industry/universities" size="sm" tone="outline">
                        Profile
                      </ButtonLink>
                    }
                  />
                ) : null}
                {faculty ? (
                  <PartnerRow
                    icon="user"
                    name={faculty.name}
                    organisation={faculty.expertise.join(" · ")}
                    role={faculty.designation}
                    tint="blue"
                  />
                ) : null}
                {team ? (
                  <PartnerRow
                    icon="users"
                    name={team.name}
                    organisation={`${team.memberCount} students · ${team.skills.join(", ")}`}
                    role="Student team"
                    tint="mint"
                  />
                ) : null}
                {assignments.map((a) => {
                  const mentor = state.company.mentors.find((m) => m.id === a.mentorId);
                  if (!mentor) return null;
                  return (
                    <PartnerRow
                      icon="factory"
                      key={a.id}
                      name={mentor.name}
                      organisation={`${mentor.unit} · ${a.roles.join(", ")} mentor`}
                      role={`${state.company.name} — industry`}
                      tint="amber"
                    />
                  );
                })}
              </div>

              {team ? (
                <div className="mt-6 rounded-md bg-card-muted p-4">
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
                    First name, year and discipline only — enough to hold a design review with the
                    right person, and not enough to contact a student outside the platform.
                  </p>
                </div>
              ) : null}
            </Card>

            <Card className="p-6">
              <h2 className="headline-md text-ink">How they work together</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Four parties, five stages, and where each one actually acts.
              </p>
              {challenge ? (
                <div className="mt-4">
                  <CollaborationGraph challenge={challenge} project={project} />
                </div>
              ) : null}
            </Card>
          </div>
        </Enter>
      ) : null}

      {/* ------------------------------------------------------------ money */}
      {tab === "money" ? (
        <Enter index={2}>
          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="p-6">
              <h2 className="headline-md text-ink">Who is paying for this</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {project.coFunders.length} contributor{project.coFunders.length === 1 ? "" : "s"}. Your
                share is {Math.round((project.investment.committed / Math.max(1, project.coFunders.reduce((s, c) => s + c.amount, 0))) * 100)}% of what is on the table.
              </p>
              <ul className="mt-5 flex flex-col gap-2">
                {project.coFunders.map((c) => (
                  <li
                    className={cx(
                      "flex flex-wrap items-center gap-3 rounded-md p-3",
                      c.isSelf ? "bg-primary-fixed" : "bg-card-muted",
                    )}
                    key={c.id}
                  >
                    <span
                      className={cx(
                        "flex size-8 shrink-0 items-center justify-center rounded-sm",
                        c.kind === "government" ? "bg-tint-mint text-on-tint-mint" : "bg-tint-navy text-on-tint-navy",
                      )}
                    >
                      <Icon name={c.kind === "government" ? "landmark" : "factory"} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">
                        {c.party}
                        {c.isSelf ? " (you)" : ""}
                      </span>
                      <span className="block text-xs text-ink-muted capitalize">{c.status}</span>
                    </span>
                    <span className="shrink-0 font-bold text-ink tabular-nums">{rupees(c.amount)}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-6">
              <h2 className="headline-md text-ink">Your tranche schedule</h2>
              <p className="mt-1 text-sm text-ink-muted">
                {rupees(project.investment.disbursed)} of {rupees(project.investment.committed)}{" "}
                released. Money follows delivery, not the calendar.
              </p>
              <Progress
                className="mt-4"
                label="Funds released"
                tone="impact"
                value={(project.investment.disbursed / Math.max(1, project.investment.committed)) * 100}
              />
              <ul className="mt-5 flex flex-col gap-2">
                {project.milestones
                  .filter((m) => m.trancheAmount)
                  .map((m) => (
                    <li className="flex items-center gap-3 rounded-md bg-card-muted p-3" key={m.id}>
                      <Icon
                        className={cx(
                          "shrink-0",
                          m.status === "complete" ? "text-impact-deep" : "text-ink-faint",
                        )}
                        name={m.status === "complete" ? "check-circle" : "clock"}
                        size={17}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{m.label}</span>
                        <span className="block text-xs text-ink-muted">
                          {m.status === "complete" ? "released" : m.awaitingReview ? "held pending your review" : `due ${until(m.dueAt)}`}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-bold text-ink tabular-nums">
                        {rupees(m.trancheAmount ?? 0)}
                      </span>
                    </li>
                  ))}
              </ul>
            </Card>
          </div>
        </Enter>
      ) : null}

      {/* -------------------------------------------------------- documents */}
      {tab === "documents" ? (
        <Enter index={2}>
          <Card className="p-6">
            <h2 className="headline-md text-ink">Documents shared with you</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {shared.length} document{shared.length === 1 ? "" : "s"}.
              {withheld
                ? ` ${withheld} further document${withheld === 1 ? " is" : "s are"} on this project but marked government-internal, and are not listed.`
                : ""}
            </p>
            <ul className="mt-5 flex flex-col gap-2">
              {shared.map((doc) => (
                <li className="flex flex-wrap items-center gap-3 rounded-md bg-card-muted p-3" key={doc.id}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary-fixed text-on-primary-fixed-variant">
                    <Icon name={doc.kind === "financial" ? "banknote" : doc.kind === "approval" ? "shield" : doc.kind === "data" ? "bar-chart" : "folder"} size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-ink">{doc.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {doc.by} · {shortDate(doc.at)} · {(doc.sizeKb / 1024).toFixed(1)} MB
                    </span>
                  </span>
                  <Badge dense tone="neutral">
                    {doc.kind}
                  </Badge>
                </li>
              ))}
            </ul>
            {withheld ? (
              <p className="mt-4 rounded-md bg-container p-3 text-xs text-ink-muted">
                <Icon className="mr-1 inline align-[-2px]" name="lock" size={12} />
                Government-internal documents — cost estimates, tender papers and officer
                assessments — stay on the government surface at every stage of a project.
              </p>
            ) : null}
          </Card>
        </Enter>
      ) : null}

      {/* ----------------------------------------------------------- impact */}
      {tab === "impact" ? (
        <Enter index={2}>
          <div className="flex flex-col gap-4">
            <Card className="p-6 lg:p-8">
              <h2 className="headline-lg text-ink">Measured impact</h2>
              <p className="mt-2 max-w-2xl text-sm text-ink-muted">
                Each figure carries the method behind it. Where a project has not reached
                verification, the number is a target rather than a finding, and says so.
              </p>
              <ul className="mt-6 flex flex-col gap-5">
                {project.impact.map((m) => (
                  <li className="border-b border-line pb-5 last:border-0 last:pb-0" key={m.label}>
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="font-bold text-ink">{m.label}</span>
                      <span className="flex items-baseline gap-2">
                        {m.baseline !== undefined ? (
                          <span className="text-sm text-ink-faint line-through tabular-nums">
                            {m.baseline.toLocaleString("en-IN")}
                          </span>
                        ) : null}
                        <span className="stat-number text-ink">
                          <CountUp value={m.value} /> <span className="text-base font-semibold text-ink-muted">{m.unit}</span>
                        </span>
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-ink-muted">Measured by: {m.method}</p>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="bg-primary p-6 text-white lg:p-8" tone="flat">
              <p className="label-caps text-white/64">Impact per rupee on this project</p>
              <div className="mt-4 grid gap-6 sm:grid-cols-3">
                <div>
                  <p className="stat-number">{rupees(project.investment.committed)}</p>
                  <p className="mt-1 text-sm text-white/72">committed</p>
                </div>
                <div>
                  <p className="stat-number">
                    <CountUp value={project.peopleImpacted} />
                  </p>
                  <p className="mt-1 text-sm text-white/72">people reached</p>
                </div>
                <div>
                  <p className="stat-number">
                    {exactRupees(Math.round(project.investment.committed / Math.max(1, project.peopleImpacted)))}
                  </p>
                  <p className="mt-1 text-sm text-white/72">per person reached</p>
                </div>
              </div>
            </Card>
          </div>
        </Enter>
      ) : null}

      {/* ------------------------------------------------------------ audit */}
      {tab === "audit" ? (
        <Enter index={2}>
          <Card className="p-6">
            <h2 className="headline-md text-ink">Audit trail</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Every commitment, approval, assignment and status change on this project, with the
              party that caused it.
            </p>
            <div className="mt-5">
              <AuditTrail entries={project.audit} />
            </div>
          </Card>
        </Enter>
      ) : null}

      {/* --------------------------------------------------- changes modal */}
      <Modal
        footer={
          <>
            <Button onClick={() => setChangesFor(null)} tone="outline">
              Cancel
            </Button>
            <Button
              disabled={!note.trim()}
              icon="send"
              onClick={() => {
                if (changesFor) {
                  dispatch({
                    type: "milestone/changes",
                    projectId: project.id,
                    milestoneId: changesFor,
                    note: note.trim(),
                  });
                }
                setChangesFor(null);
              }}
            >
              Send to the team
            </Button>
          </>
        }
        onClose={() => setChangesFor(null)}
        open={Boolean(changesFor)}
        subtitle="The team sees this note on the milestone and in the project thread."
        title="Request changes"
      >
        <label className="label-caps mb-1.5 block text-ink-faint" htmlFor="change-note">
          What needs to change, and why
        </label>
        <textarea
          className="min-h-32 w-full rounded-md border border-line bg-card-muted p-4 text-sm text-ink focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary focus:outline-none"
          id="change-note"
          onChange={(e) => setNote(e.target.value)}
          placeholder="Be specific about the change and the reason — a student team cannot act on “not quite there yet”."
          value={note}
        />
        <p className="mt-2 text-xs text-ink-muted">
          Requesting changes holds the tranche until the milestone is resubmitted and approved.
        </p>
      </Modal>
    </div>
  );
}

/* =============================================================== bits === */

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-caps text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-ink tabular-nums">{value}</dd>
    </div>
  );
}

function Big({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md bg-card-muted p-4">
      <dt className="label-caps text-ink-faint">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-ink tabular-nums">{value}</dd>
      <dd className="text-xs text-ink-muted">{hint}</dd>
    </div>
  );
}
