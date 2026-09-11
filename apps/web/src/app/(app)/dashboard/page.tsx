import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import {
  Avatar,
  Badge,
  ButtonLink,
  Card,
  Enter,
  PillRow,
  Progress,
  ProgressCard,
  SectionHeader,
  TINT,
  TintTile,
  cx,
} from "@/components/ui";
import {
  ACHIEVEMENTS,
  APPLICATIONS,
  DASHBOARD_ACTIONS,
  DEADLINES,
  NOTIFICATIONS,
  OPPORTUNITIES,
  OVERALL_PROGRESS,
  PULSE,
  RECENT_ACTIVITY,
  STUDENT,
  STUDENT_PROJECTS,
} from "@/lib/data";

export const metadata: Metadata = { title: "Dashboard" };

const STAGES = ["Plan", "Research", "Build", "Test", "Pilot", "Handover"];

/* -------------------------------------------------------------- pieces --- */

/**
 * The app's greeting header, given a desktop's width: the avatar, who this is
 * and where they are, and the chrome that belongs to a person rather than to a
 * dataset. There is no page title above it — the greeting *is* the header.
 */
function Greeting() {
  const unread = NOTIFICATIONS.filter((n) => n.unread).length;
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Avatar name={STUDENT.name} size={56} />
        <div className="min-w-0">
          <h1 className="headline-xl text-ink">
            <span className="font-medium">{STUDENT.greeting},</span>{" "}
            <span className="font-bold">{STUDENT.name.split(" ")[0]}</span>
          </h1>
          {/* Each fact wraps as a unit — a place name broken across two lines
              reads as two places. */}
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Icon name="map-pin" size={15} />
              {STUDENT.location}
            </span>
            <span className="hidden whitespace-nowrap sm:inline">
              <span aria-hidden="true" className="mr-2 text-line-strong">·</span>
              {STUDENT.year}
            </span>
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 shadow-level1">
          <Icon className="text-clay" name="flame" size={18} />
          <span className="text-sm font-bold text-ink tabular-nums">
            {STUDENT.streak}
          </span>
          <span className="text-sm text-ink-muted">day streak</span>
        </span>
        {unread > 0 ? (
          <Badge icon="bell" tone="critical">
            {unread} unread
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The hero: the one proportion this screen is about, the profile summary
 * beside it, and the primary action. Ink fill, because it is the row the
 * dashboard most wants you to press.
 */
function HeroCard() {
  return (
    <Card className="overflow-hidden p-6 lg:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <Badge icon="target" tone="info">
            Semester goal
          </Badge>
          <h2 className="headline-lg mt-3 text-ink">
            You&rsquo;re {OVERALL_PROGRESS.percent}% of the way to your impact
            target.
          </h2>
          <p className="mt-2 max-w-lg text-sm text-ink-muted">
            {OVERALL_PROGRESS.detail}. Three verified milestones this month put
            you {STUDENT.rank <= 20 ? "inside" : "outside"} the top 20 across
            Jharkhand.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <ButtonLink href="/opportunities" icon="search">
              Find opportunities
            </ButtonLink>
            <ButtonLink href="/collaborate/new" icon="plus" tone="outline">
              Start a project
            </ButtonLink>
          </div>
        </div>

        <div className="w-full shrink-0 lg:w-80">
          <ProgressCard
            detail={OVERALL_PROGRESS.detailShort}
            footnote={OVERALL_PROGRESS.footnote}
            icon="trending-up"
            label={OVERALL_PROGRESS.label}
            percent={OVERALL_PROGRESS.percent}
            tint="navy"
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-card-muted p-4">
              <p className="stat-number text-ink">{STUDENT.impactScore}</p>
              <p className="text-xs font-semibold text-ink-muted">
                Impact score
              </p>
            </div>
            <div className="rounded-lg bg-card-muted p-4">
              <p className="stat-number text-ink">#{STUDENT.rank}</p>
              <p className="text-xs font-semibold text-ink-muted">
                of {STUDENT.rankOf.toLocaleString("en-IN")} students
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function StageTrack({ stage, percent }: { stage: number; percent: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm font-semibold text-ink">
        <span>
          Stage {stage} of {STAGES.length} · {STAGES[Math.min(stage, STAGES.length) - 1]}
        </span>
        <span className="tabular-nums">{percent}%</span>
      </div>
      <div className="mt-2 flex gap-1" aria-hidden="true">
        {STAGES.map((label, i) => (
          <span
            className={cx(
              "h-2 flex-1 rounded-full",
              i < stage ? "bg-primary" : "bg-track",
            )}
            key={label}
          />
        ))}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
}: {
  project: (typeof STUDENT_PROJECTS)[number];
}) {
  const t = TINT[project.tint];
  return (
    <article className="rounded-lg bg-card-muted p-4 transition-colors duration-150 hover:bg-container/70">
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "flex size-11 shrink-0 items-center justify-center rounded-[12px]",
            t.wash,
          )}
        >
          <Icon name={project.icon} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-ink">{project.title}</h3>
          <p className="truncate text-sm text-ink-muted">{project.partner}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge dense tone={project.statusTone}>
          {project.status}
        </Badge>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
          <Icon name="clock" size={13} />
          {project.note}
        </span>
      </div>

      <div className="mt-4">
        <StageTrack percent={project.percent} stage={project.stage} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center">
          {project.team.slice(0, 3).map((member, i) => (
            <Avatar
              className="-ml-2 ring-2 ring-card-muted first:ml-0"
              key={member}
              name={member}
              size={28}
              tone={i === 0 ? "navy" : "muted"}
            />
          ))}
          {project.team.length > 3 ? (
            <span className="-ml-2 flex size-7 items-center justify-center rounded-full bg-container text-[11px] font-bold text-ink-muted ring-2 ring-card-muted">
              +{project.team.length - 3}
            </span>
          ) : null}
        </div>
        <span className="ml-3 text-xs font-semibold text-ink-muted">
          {project.team.length} member{project.team.length === 1 ? "" : "s"}
        </span>
      </div>
    </article>
  );
}

function OpportunityRow({
  item,
}: {
  item: (typeof OPPORTUNITIES)[number];
}) {
  const t = TINT[item.tint];
  return (
    <a
      className="flex items-center gap-3 rounded-lg bg-card-muted p-3 transition-colors duration-150 hover:bg-container/70"
      href="/opportunities"
    >
      <span
        className={cx(
          "flex size-11 shrink-0 items-center justify-center rounded-[12px]",
          t.wash,
        )}
      >
        <Icon name={item.icon} size={20} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-sm font-bold text-ink">
          {item.title}
        </span>
        <span className="block truncate text-xs text-ink-muted">
          {item.org} · {item.reward}
        </span>
      </span>
      {item.match ? (
        <Badge dense tone={item.match >= 90 ? "success" : "info"}>
          {item.match}% match
        </Badge>
      ) : null}
    </a>
  );
}

/* ---------------------------------------------------------------- page --- */

export default function DashboardPage() {
  const active = STUDENT_PROJECTS.filter((p) => p.percent < 100);
  const recommended = OPPORTUNITIES.filter((o) => o.match).slice(0, 3);
  const available = OPPORTUNITIES.slice(0, 4);
  const openApplications = APPLICATIONS.filter(
    (a) => a.stage !== "Not selected",
  ).length;
  const earned = ACHIEVEMENTS.filter((a) => a.earned);
  const inProgress = ACHIEVEMENTS.filter((a) => !a.earned).slice(0, 2);
  const unread = NOTIFICATIONS.filter((n) => n.unread);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <Enter>
        <Greeting />
      </Enter>

      <Enter index={1}>
        <HeroCard />
      </Enter>

      {/* Community-pulse tiles: colour sorts the row at a glance, and every
          tile also carries its own glyph and its own words. */}
      <Enter index={2}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
          {PULSE.map((tile) => (
            <TintTile
              delta={tile.delta}
              icon={tile.icon}
              key={tile.label}
              label={tile.label}
              tint={tile.tint}
              value={tile.value}
            />
          ))}
        </div>
      </Enter>

      {/* Quick actions. Pill rows on a phone, a tile grid once there is width
          for one — the same components, laid out for the surface. */}
      <Enter index={3}>
        <section>
          <SectionHeader
            actionHref="/problem-explorer"
            actionLabel="Browse all"
            icon="zap"
            title="Quick actions"
          />
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {DASHBOARD_ACTIONS.map((action) => {
              const t = TINT[action.tint];
              return (
                <a
                  className="flex flex-col items-center gap-2.5 rounded-lg bg-card p-4 text-center shadow-level1 transition-[box-shadow,transform] duration-150 ease-jm hover:-translate-y-0.5 hover:shadow-level2"
                  href={action.href}
                  key={action.label}
                >
                  <span
                    className={cx(
                      "flex size-12 items-center justify-center rounded-full",
                      t.wash,
                    )}
                  >
                    <Icon name={action.icon} size={22} />
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {action.label}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      </Enter>

      {/* The main bento. Two columns on a desktop, one everywhere narrower. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Enter index={4}>
            <Card className="p-6">
              <SectionHeader
                actionHref="/projects"
                actionLabel="View all"
                icon="rocket"
                title="Active projects"
              />
              <div className="mt-4 flex flex-col gap-3">
                {active.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
              <ButtonLink
                className="mt-4 w-full"
                href="/collaborate/new"
                icon="plus"
                tone="outline"
              >
                Start a new collaboration
              </ButtonLink>
            </Card>
          </Enter>

          <Enter index={5}>
            <Card className="p-6">
              <SectionHeader
                actionHref="/opportunities"
                actionLabel="See all"
                icon="briefcase"
                title="Available opportunities"
              />
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {available.map((item) => {
                  const t = TINT[item.tint];
                  return (
                    <a
                      className="flex flex-col gap-3 rounded-lg bg-card-muted p-4 transition-colors duration-150 hover:bg-container/70"
                      href="/opportunities"
                      key={item.id}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={cx(
                            "flex size-10 shrink-0 items-center justify-center rounded-[12px]",
                            t.wash,
                          )}
                        >
                          <Icon name={item.icon} size={19} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 font-bold text-ink">
                            {item.title}
                          </p>
                          <p className="truncate text-sm text-ink-muted">
                            {item.org}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge dense tone="neutral">
                          {item.kind}
                        </Badge>
                        <Badge dense tone="info">
                          {item.mode}
                        </Badge>
                        <span className="ml-auto text-xs font-bold text-ink">
                          {item.reward}
                        </span>
                      </div>
                      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <Icon name="clock" size={13} />
                        {item.closes}
                        <span aria-hidden="true" className="text-line-strong">·</span>
                        <Icon name="map-pin" size={13} />
                        {item.location}
                      </p>
                    </a>
                  );
                })}
              </div>
            </Card>
          </Enter>

          <Enter index={6}>
            <Card className="p-6">
              <SectionHeader icon="clock" title="Recent activity" />
              <ol className="mt-4 flex flex-col">
                {RECENT_ACTIVITY.map((item, i) => {
                  const t = TINT[item.tint];
                  return (
                    <li className="flex gap-4" key={item.id}>
                      {/* The timeline rail: a tinted well per event, joined by
                          a hairline that stops at the last one. */}
                      <div className="flex flex-col items-center">
                        <span
                          className={cx(
                            "flex size-10 shrink-0 items-center justify-center rounded-full",
                            t.wash,
                          )}
                        >
                          <Icon name={item.icon} size={18} />
                        </span>
                        {i < RECENT_ACTIVITY.length - 1 ? (
                          <span className="w-px flex-1 bg-line" />
                        ) : null}
                      </div>
                      <div
                        className={cx(
                          "min-w-0 flex-1",
                          i < RECENT_ACTIVITY.length - 1 && "pb-5",
                        )}
                      >
                        <p className="font-semibold text-ink">{item.title}</p>
                        <p className="text-sm text-ink-muted">{item.detail}</p>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {item.when}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </Card>
          </Enter>
        </div>

        {/* Right rail. */}
        <div className="flex min-w-0 flex-col gap-6">
          <Enter index={5}>
            <Card className="p-6">
              <SectionHeader
                actionHref="/notifications"
                actionLabel="All"
                icon="bell"
                title="Notifications"
              />
              <div className="mt-4 flex flex-col gap-2">
                {unread.map((note) => (
                  <a
                    className="flex gap-3 rounded-lg bg-card-muted p-3 transition-colors duration-150 hover:bg-container/70"
                    href="/notifications"
                    key={note.id}
                  >
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-periwinkle" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink">
                        {note.title}
                      </span>
                      <span className="line-clamp-2 block text-xs text-ink-muted">
                        {note.body}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {note.when}
                      </span>
                    </span>
                  </a>
                ))}
              </div>
            </Card>
          </Enter>

          <Enter index={6}>
            <Card className="p-6">
              <SectionHeader icon="calendar" title="Upcoming deadlines" />
              <ul className="mt-4 flex flex-col gap-2">
                {DEADLINES.map((deadline) => (
                  <li
                    className="flex items-center gap-3 rounded-lg bg-card-muted p-3"
                    key={deadline.id}
                  >
                    <span
                      className={cx(
                        "flex size-11 shrink-0 flex-col items-center justify-center rounded-[12px] leading-none",
                        deadline.daysLeft <= 3
                          ? "bg-critical-tint text-on-critical-tint"
                          : "bg-primary-fixed text-on-primary-fixed-variant",
                      )}
                    >
                      <span className="text-[10px] font-bold tracking-wide uppercase">
                        {deadline.date.split(" ")[0]}
                      </span>
                      <span className="text-base font-bold tabular-nums">
                        {deadline.date.split(" ")[1]}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-sm font-bold text-ink">
                        {deadline.title}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">
                        {deadline.context}
                      </span>
                    </span>
                    <Badge dense tone={deadline.daysLeft <= 3 ? "critical" : "neutral"}>
                      {deadline.daysLeft}d
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          </Enter>

          <Enter index={7}>
            <Card className="p-6">
              <SectionHeader
                actionHref="/opportunities"
                actionLabel="More"
                icon="sparkles"
                title="Recommended for you"
              />
              <p className="mt-2 text-sm text-ink-muted">
                Matched against your skills — {STUDENT.skills.slice(0, 3).join(", ")}.
              </p>
              <div className="mt-3 flex flex-col gap-2">
                {recommended.map((item) => (
                  <OpportunityRow item={item} key={item.id} />
                ))}
              </div>
            </Card>
          </Enter>

          <Enter index={8}>
            <Card className="p-6">
              <SectionHeader
                actionHref="/achievements"
                actionLabel="All"
                icon="trophy"
                title="Achievements"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {earned.slice(0, 5).map((badge) => {
                  const t = TINT[badge.tint];
                  return (
                    <span
                      className={cx(
                        "flex items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-xs font-semibold",
                        t.wash,
                      )}
                      key={badge.id}
                      title={badge.description}
                    >
                      <span className="flex size-7 items-center justify-center rounded-full bg-white/55">
                        <Icon name={badge.icon} size={15} />
                      </span>
                      {badge.label}
                    </span>
                  );
                })}
              </div>
              <div className="mt-5 flex flex-col gap-4 border-t border-line pt-4">
                {inProgress.map((badge) => (
                  <div key={badge.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-semibold text-ink">
                        {badge.label}
                      </span>
                      <span className="mono-data text-ink-muted">
                        {badge.progress}%
                      </span>
                    </div>
                    <Progress
                      className="mt-1.5"
                      label={badge.label}
                      size="sm"
                      tone={badge.tint}
                      value={badge.progress ?? 0}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </Enter>

          {/* The one dark pill row: the row this screen most wants pressed. */}
          <Enter index={9}>
            <PillRow
              dark
              href="/applications"
              icon="file-pen"
              subtitle={`${openApplications} open · 1 needs your answer`}
              title="Track your applications"
            />
          </Enter>
        </div>
      </div>
    </div>
  );
}
