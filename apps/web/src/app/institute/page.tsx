"use client";

/**
 * The institute dashboard.
 *
 * Built around one question: *where is work stuck, and who is accountable.*
 *
 * So the tiles are counts a registrar is actually asked for, the three queue
 * cards are the only things on this screen that need a human today, and the
 * funnel underneath them is the one chart in the portal — a distribution whose
 * shape is itself the finding. Everything else on the page is a link into the
 * screen that resolves it.
 */

import Link from "next/link";
import { Icon } from "@/components/icon";
import {
  Badge,
  ButtonLink,
  Card,
  CardHeader,
  Enter,
  PageHeading,
  Progress,
  StatTile,
  cx,
} from "@/components/ui";
import {
  Fact,
  Loaded,
  PipelineFunnel,
  QueueCard,
  QueueRow,
  TilesSkeleton,
} from "@/components/institute/pieces";
import { useSession } from "@/lib/auth/session-context";
import { useInstitute } from "@/lib/institute/store";
import { ago, plural } from "@/lib/institute/format";

export default function InstituteHome() {
  const session = useSession();
  const overview = useInstitute();
  const firstName = session?.displayName?.split(" ").slice(-1)[0] ?? "there";

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <PageHeading
          actions={
            <ButtonLink href="/institute/teams/new" icon="plus" size="md">
              Form a team
            </ButtonLink>
          }
          subtitle={`${session?.organisation?.name ?? "Your institution"} — the roster, the faculty who guide it, and every project between a validated citizen problem and a signed-off submission.`}
          title="Good to see you,"
          emphasis={firstName}
        />
      </Enter>

      <Loaded resource={overview} skeleton={<TilesSkeleton />}>
        {(data) => (
          <>
            <Enter index={1}>
              {/* Labels are one word wherever a word will do: `StatTile` lays
                  its icon and text out side by side, which leaves about 80px
                  for the label in a two-up grid on a phone. The nuance lives in
                  the hint line, which wraps. */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6 [&>*]:min-w-0">
                <StatTile
                  hint={`${data.counts.verifiedStudents} verified`}
                  icon="users"
                  label="Students"
                  tone="navy"
                  value={String(data.counts.students)}
                />
                <StatTile
                  hint={plural(data.counts.departments, "department")}
                  icon="user"
                  label="Faculty"
                  tone="orchid"
                  value={String(data.counts.faculty)}
                />
                <StatTile
                  hint="offered"
                  icon="book"
                  label="Programmes"
                  tone="blue"
                  value={String(data.counts.programs)}
                />
                <StatTile
                  hint="active"
                  icon="rocket"
                  label="Teams"
                  tone="mint"
                  value={String(data.counts.teams)}
                />
                <StatTile
                  hint={`${data.counts.completedProjects} completed`}
                  icon="clipboard"
                  label="Projects"
                  tone="amber"
                  value={String(data.counts.projects)}
                />
                <StatTile
                  hint="submissions"
                  icon="file-pen"
                  label="To review"
                  tone="clay"
                  value={String(data.counts.awaitingReview)}
                />
              </div>
            </Enter>

            {/* ------------------------------------------- needs you now --- */}
            <Enter index={2}>
              <section className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[12px] bg-primary-fixed text-on-primary-fixed-variant">
                    <Icon name="zap" size={17} />
                  </span>
                  <h2 className="headline-md min-w-0 flex-1 text-ink">Needs you now</h2>
                </div>

                <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
                  <QueueCard
                    actionLabel="Open submissions"
                    count={data.needs.submissions.length}
                    emptyNote="Every submission has been decided."
                    href="/institute/submissions"
                    icon="file-pen"
                    title="Submissions awaiting a decision"
                    tone="critical"
                  >
                    {data.needs.submissions.map((s) => (
                      <QueueRow
                        detail={`${s.team.name} · ${s.project.title}`}
                        href="/institute/submissions"
                        key={s.id}
                        meta={ago(s.submittedAt)}
                        title={s.label}
                      />
                    ))}
                  </QueueCard>

                  <QueueCard
                    actionLabel="Open teams"
                    count={data.needs.unguidedTeams.length + data.needs.emptyTeams.length}
                    emptyNote="Every active team has a guide and members."
                    href="/institute/teams"
                    icon="rocket"
                    title="Teams missing a guide or members"
                  >
                    {data.needs.unguidedTeams.map((t) => (
                      <QueueRow
                        detail={`${t.department ?? "No department"} · ${plural(t.members, "member")}`}
                        href={`/institute/teams/${t.id}`}
                        key={t.id}
                        meta="no guide"
                        title={t.name}
                      />
                    ))}
                    {data.needs.emptyTeams.map((t) => (
                      <QueueRow
                        detail={t.department ?? "No department"}
                        href={`/institute/teams/${t.id}`}
                        key={t.id}
                        meta="no members"
                        title={t.name}
                      />
                    ))}
                  </QueueCard>

                  <QueueCard
                    actionLabel="Open the roster"
                    count={data.counts.unverifiedStudents}
                    emptyNote="Every student on the roster is verified."
                    href="/institute/students"
                    icon="users"
                    title="Students awaiting verification"
                  >
                    {data.needs.unverifiedStudents.map((s) => (
                      <QueueRow
                        detail={`${s.branch} · Year ${s.currentYear}`}
                        href="/institute/students"
                        key={s.id}
                        title={s.name}
                      />
                    ))}
                  </QueueCard>
                </div>
              </section>
            </Enter>

            {/* -------------------------------------- pipeline + activity --- */}
            <Enter index={3}>
              <div className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
                <Card className="p-6 xl:col-span-2">
                  <CardHeader
                    icon="trending-up"
                    subtitle="Where every active team sits on the nine stages between a validated problem and measured impact. A bulge is where work stops moving."
                    title="Delivery pipeline"
                  />
                  <div className="mt-5">
                    <PipelineFunnel data={data.pipeline} />
                  </div>
                </Card>

                <Card className="p-6">
                  <CardHeader icon="clock" title="Recent activity" />
                  {data.recent.length === 0 ? (
                    <p className="mt-4 rounded-md bg-card-muted px-4 py-6 text-center text-sm text-ink-muted">
                      Nothing has moved yet.
                    </p>
                  ) : (
                    <ul className="mt-4 flex flex-col gap-2">
                      {data.recent.map((r) => (
                        <li key={`${r.kind}-${r.id}-${r.at}`}>
                          <Link
                            className="flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors hover:bg-card-muted"
                            href={
                              r.kind === "team"
                                ? `/institute/teams/${r.id}`
                                : `/institute/projects/${r.id}`
                            }
                          >
                            <span
                              className={cx(
                                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
                                r.kind === "team"
                                  ? "bg-tint-mint text-on-tint-mint"
                                  : "bg-tint-amber text-on-tint-amber",
                              )}
                            >
                              <Icon name={r.kind === "team" ? "rocket" : "clipboard"} size={14} />
                            </span>
                            <span className="min-w-0 flex-1 leading-tight">
                              <span className="block truncate text-sm font-semibold text-ink">
                                {r.title}
                              </span>
                              <span className="block truncate text-xs text-ink-muted">
                                {r.detail} · {ago(r.at)}
                              </span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </Enter>

            {/* ----------------------------------------- by department ----- */}
            <Enter index={4}>
              <Card className="p-6">
                <CardHeader
                  action={
                    <Link
                      className="text-sm font-semibold text-navy hover:underline"
                      href="/institute/departments"
                    >
                      Manage
                    </Link>
                  }
                  icon="book"
                  subtitle="The only grouping a registrar reasons in. Average progress is across that department's projects."
                  title="By department"
                />
                {data.byDepartment.length === 0 ? (
                  <div className="mt-4 rounded-md bg-card-muted px-4 py-8 text-center">
                    <p className="text-sm text-ink-muted">
                      No departments yet. Every screen in this portal groups by department, so this
                      is the first thing worth adding.
                    </p>
                    <ButtonLink className="mt-4" href="/institute/departments" size="sm" tone="outline">
                      Add a department
                    </ButtonLink>
                  </div>
                ) : (
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
                    {data.byDepartment.map((d) => (
                      <li className="rounded-lg bg-card-muted p-4" key={d.id}>
                        <div className="flex items-start gap-2">
                          <p className="min-w-0 flex-1 font-bold text-ink">{d.name}</p>
                          <Badge dense tone="neutral">
                            {d.code}
                          </Badge>
                        </div>
                        <dl className="mt-3 grid grid-cols-3 gap-2 [&>*]:min-w-0">
                          <Fact label="Students" value={d.students} />
                          <Fact label="Faculty" value={d.faculty} />
                          <Fact label="Teams" value={d.teams} />
                        </dl>
                        <div className="mt-3">
                          <div className="flex items-baseline justify-between">
                            <span className="text-xs font-semibold text-ink-muted">
                              Average progress
                            </span>
                            <span className="mono-data text-ink">{d.avgProgress}%</span>
                          </div>
                          <Progress
                            className="mt-1.5"
                            label={`${d.name} average project progress`}
                            size="sm"
                            value={d.avgProgress}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </Enter>
          </>
        )}
      </Loaded>
    </div>
  );
}
