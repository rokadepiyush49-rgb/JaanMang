"use client";

/**
 * Reports.
 *
 * Four questions an institution is actually asked, each answered by a figure
 * derived from rows it owns: how many of our students are doing anything, how
 * far teams get before they stall, what fraction of what we submit is accepted,
 * and which departments carry the work.
 *
 * There is one chart, the stage distribution, because its *shape* is the
 * finding. Everything else is a number with its denominator beside it — a rate
 * with no denominator is a claim, and this platform's rule is that a figure
 * appears with what produced it.
 */

import { Icon } from "@/components/icon";
import {
  Badge,
  Card,
  CardHeader,
  Enter,
  PageHeading,
  Progress,
  Skeleton,
  StatTile,
  cx,
} from "@/components/ui";
import { Fact, Loaded, PipelineFunnel } from "@/components/institute/pieces";
import { InstituteApi } from "@/lib/institute/service";
import { useResource } from "@/lib/institute/use-resource";
import { plural } from "@/lib/institute/format";

export default function ReportsPage() {
  const analytics = useResource(() => InstituteApi.analytics(), []);
  const overview = useResource(() => InstituteApi.overview(), []);

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <PageHeading
          emphasis="analytics"
          subtitle="Every figure here is counted from your own records at the moment you load the page. Nothing is projected, smoothed or carried over from a previous term."
          title="Institutional"
        />
      </Enter>

      <Loaded
        resource={analytics}
        skeleton={
          <div className="flex flex-col gap-6">
            <Skeleton className="h-28" />
            <Skeleton className="h-72" />
          </div>
        }
      >
        {(a) => (
          <>
            <Enter index={1}>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 [&>*]:min-w-0">
                <StatTile
                  hint={`${a.participation.engaged} of ${a.participation.students} students`}
                  icon="users"
                  label="Participation"
                  tone="navy"
                  value={`${a.participation.rate}%`}
                />
                <StatTile
                  hint={`${a.teams.guided} of ${a.teams.total} have a guide`}
                  icon="rocket"
                  label="Teams"
                  tone="mint"
                  value={String(a.teams.total)}
                />
                <StatTile
                  hint={`${a.delivery.completed} of ${a.delivery.projects} complete`}
                  icon="clipboard"
                  label="Average progress"
                  tone="amber"
                  value={`${a.delivery.avgProgress}%`}
                />
                <StatTile
                  hint={
                    a.applications.selectionRate === null
                      ? "nothing decided yet"
                      : `of ${a.applications.accepted + a.applications.rejected} decided`
                  }
                  icon="trending-up"
                  label="Selection rate"
                  tone="orchid"
                  value={
                    a.applications.selectionRate === null
                      ? "—"
                      : `${a.applications.selectionRate}%`
                  }
                />
              </div>
            </Enter>

            <Enter index={2}>
              <div className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
                <Card className="p-6 xl:col-span-2">
                  <CardHeader
                    icon="bar-chart"
                    subtitle="How teams are distributed across the nine stages. A bulge is where work stops moving — early means teams form and do not start, late means work finishes and is not signed off."
                    title="Where the work sits"
                  />
                  <div className="mt-5">
                    <PipelineFunnel data={a.stages} />
                  </div>
                </Card>

                <Card className="p-6">
                  <CardHeader icon="file-pen" title="Milestone health" />
                  <div className="mt-5 flex flex-col gap-5">
                    <div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold text-ink">Signed off</span>
                        <span className="mono-data text-ink-muted">
                          {a.delivery.milestonesComplete}/{a.delivery.milestonesTotal}
                        </span>
                      </div>
                      <Progress
                        className="mt-2"
                        label="Milestones signed off"
                        tone="mint"
                        value={
                          a.delivery.milestonesTotal
                            ? (a.delivery.milestonesComplete / a.delivery.milestonesTotal) * 100
                            : 0
                        }
                      />
                    </div>

                    {/* Whose move it is, kept apart. One is the institution's
                        debt, the other is the team's. */}
                    <ul className="flex flex-col gap-2">
                      <li
                        className={cx(
                          "flex items-center gap-3 rounded-md px-3 py-2.5",
                          a.delivery.awaitingReview ? "bg-gold-tint" : "bg-card-muted",
                        )}
                      >
                        <Icon
                          className={
                            a.delivery.awaitingReview ? "text-on-gold-tint" : "text-ink-muted"
                          }
                          name="clock"
                          size={16}
                        />
                        <span className="min-w-0 flex-1 text-sm font-semibold text-ink">
                          Awaiting your decision
                        </span>
                        <span className="mono-data text-ink">{a.delivery.awaitingReview}</span>
                      </li>
                      <li
                        className={cx(
                          "flex items-center gap-3 rounded-md px-3 py-2.5",
                          a.delivery.changesRequested ? "bg-critical-tint" : "bg-card-muted",
                        )}
                      >
                        <Icon
                          className={
                            a.delivery.changesRequested
                              ? "text-on-critical-tint"
                              : "text-ink-muted"
                          }
                          name="refresh"
                          size={16}
                        />
                        <span className="min-w-0 flex-1 text-sm font-semibold text-ink">
                          Back with the team
                        </span>
                        <span className="mono-data text-ink">{a.delivery.changesRequested}</span>
                      </li>
                    </ul>
                  </div>
                </Card>
              </div>
            </Enter>

            <Enter index={3}>
              <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
                <Card className="p-6">
                  <CardHeader
                    icon="send"
                    subtitle="Applications by your students and teams, by outcome."
                    title="Applications"
                  />
                  <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4 [&>*]:min-w-0">
                    <Fact label="Total" value={a.applications.total} />
                    <Fact label="Open" value={a.applications.open} />
                    <Fact label="Selected" value={a.applications.accepted} />
                    <Fact label="Not selected" value={a.applications.rejected} />
                  </dl>
                  {a.applications.total === 0 ? (
                    <p className="mt-4 rounded-md bg-card-muted px-4 py-5 text-center text-sm text-ink-muted">
                      Nothing has been applied to yet, so there is no rate to report.
                    </p>
                  ) : null}
                </Card>

                <Card className="p-6">
                  <CardHeader
                    icon="users"
                    subtitle="A student counts as engaged once they are on a team."
                    title="Student participation"
                  />
                  <div className="mt-5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-semibold text-ink">
                        {a.participation.engaged} of {plural(a.participation.students, "student")}
                      </span>
                      <span className="stat-number text-ink">{a.participation.rate}%</span>
                    </div>
                    <Progress
                      className="mt-2"
                      label="Student participation"
                      value={a.participation.rate}
                    />
                  </div>
                  <dl className="mt-5 grid grid-cols-3 gap-4 [&>*]:min-w-0">
                    <Fact label="Active teams" value={a.teams.active} />
                    <Fact label="Completed" value={a.teams.completed} />
                    <Fact label="Guided" value={`${a.teams.guided}/${a.teams.total}`} />
                  </dl>
                </Card>
              </div>
            </Enter>

            <Enter index={4}>
              <Loaded resource={overview} skeleton={<Skeleton className="h-64" />}>
                {(o) => (
                  <Card className="p-6">
                    <CardHeader
                      icon="book"
                      subtitle="Department-level performance. Average progress is across that department's own projects."
                      title="By department"
                    />
                    {o.byDepartment.length === 0 ? (
                      <p className="mt-5 rounded-md bg-card-muted px-4 py-6 text-center text-sm text-ink-muted">
                        No departments yet, so nothing can be grouped.
                      </p>
                    ) : (
                      <ul className="mt-5 flex flex-col gap-3">
                        {o.byDepartment.map((d) => (
                          <li
                            className="flex flex-wrap items-center gap-4 rounded-lg bg-card-muted px-4 py-3"
                            key={d.id}
                          >
                            <span className="flex min-w-0 basis-48 items-center gap-2">
                              <Badge dense tone="neutral">
                                {d.code}
                              </Badge>
                              <span className="min-w-0 flex-1 truncate text-sm font-bold text-ink">
                                {d.name}
                              </span>
                            </span>
                            <dl className="flex flex-1 flex-wrap gap-4">
                              <Fact label="Students" value={d.students} />
                              <Fact label="Faculty" value={d.faculty} />
                              <Fact label="Teams" value={d.teams} />
                              <Fact label="Completed" value={d.completed} />
                            </dl>
                            <span className="w-full min-w-32 sm:w-40">
                              <span className="flex items-baseline justify-between">
                                <span className="label-caps text-ink-faint">Progress</span>
                                <span className="mono-data text-ink">{d.avgProgress}%</span>
                              </span>
                              <Progress
                                className="mt-1"
                                label={`${d.name} average progress`}
                                size="sm"
                                value={d.avgProgress}
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                )}
              </Loaded>
            </Enter>
          </>
        )}
      </Loaded>
    </div>
  );
}
