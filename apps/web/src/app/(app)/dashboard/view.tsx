"use client";

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
import { DASHBOARD_ACTIONS } from "@/lib/student/vocabulary";
import {
  matchMap,
  toViewAchievements,
  toViewApplication,
  toViewOpportunity,
  toViewProject,
  type ViewOpportunity,
  type ViewProject,
} from "@/lib/student/adapters";
import { profileCompleteness } from "@/lib/student/service";
import { useStudent } from "@/lib/student/store";
import { relative } from "@/lib/gov/format";
import { useState } from "react";


/** "3rd Year", not "3 Year". */
function ordinal(n: number): string {
  const suffix = n % 10 === 1 && n % 100 !== 11 ? "st"
    : n % 10 === 2 && n % 100 !== 12 ? "nd"
    : n % 10 === 3 && n % 100 !== 13 ? "rd"
    : "th";
  return `${n}${suffix}`;
}

const STAGES = ["Plan", "Research", "Build", "Test", "Pilot", "Handover"];

/* -------------------------------------------------------------- pieces --- */

/**
 * The app's greeting header, given a desktop's width: the avatar, who this is
 * and where they are, and the chrome that belongs to a person rather than to a
 * dataset. There is no page title above it — the greeting *is* the header.
 */
function Greeting() {
  /* Identity and metrics both from the workspace now. The old comment here
     called the mix "deliberate and bounded" — a real name above placeholder
     impact points — which was true and is no longer necessary. */
  const { state, unread } = useStudent();
  const profile = state.profile!;
  const name = profile.name;
  const location = `${profile.district}, ${profile.state}`;
  const year = `${ordinal(profile.currentYear)} Year · ${profile.branch}`;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <Avatar name={name} size={56} />
        <div className="min-w-0">
          <h1 className="headline-xl text-ink">
            <span className="font-medium">Namaste,</span>{" "}
            <span className="font-bold">{name.split(" ")[0]}</span>
          </h1>
          {/* Each fact wraps as a unit — a place name broken across two lines
              reads as two places. */}
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Icon name="map-pin" size={15} />
              {location}
            </span>
            <span className="hidden whitespace-nowrap sm:inline">
              <span aria-hidden="true" className="mr-2 text-line-strong">·</span>
              {year}
            </span>
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <span className="flex items-center gap-2 rounded-full bg-card px-4 py-2.5 shadow-level1">
          <Icon className="text-clay" name="flame" size={18} />
          <span className="text-sm font-bold text-ink tabular-nums">
            {state.achievements?.verifiedContributions ?? 0}
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
  /**
   * The semester goal.
   *
   * `OVERALL_PROGRESS` was a fixed 68% with a sentence about "three verified
   * milestones this month" that nothing counted. Profile completeness is the
   * one progress figure this product can actually compute for a student who
   * has not delivered anything yet, and the rank is shown only when the
   * recognition layer has produced one.
   */
  const { state } = useStudent();
  const profile = state.profile!;
  const completeness = profileCompleteness(profile);
  const points = state.achievements?.totalPoints ?? 0;
  const rank = state.achievements?.rank?.rank;
  const active = state.projects.filter((p) => p.phase !== "completed").length;

  return (
    <Card className="overflow-hidden p-6 lg:p-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="min-w-0 flex-1">
          <Badge icon="target" tone="info">
            Semester goal
          </Badge>
          <h2 className="headline-lg mt-3 text-ink">
            Your profile is {completeness}% complete.
          </h2>
          <p className="mt-2 max-w-lg text-sm text-ink-muted">
            {active > 0
              ? `${active} live project${active === 1 ? "" : "s"}. `
              : "Nothing live yet. "}
            The more of your skills and preferences the workspace knows, the
            better the problems it puts in front of you.
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
            detail={`${completeness}% complete`}
            footnote="Skills and preferences drive what you are shown."
            icon="trending-up"
            label="Profile"
            percent={completeness}
            tint="navy"
          />
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-card-muted p-4">
              <p className="stat-number text-ink">{points}</p>
              <p className="text-xs font-semibold text-ink-muted">
                Impact score
              </p>
            </div>
            <div className="rounded-lg bg-card-muted p-4">
              <p className="stat-number text-ink">{rank ? `#${rank}` : "—"}</p>
              <p className="text-xs font-semibold text-ink-muted">
                {rank ? "among students" : "unranked so far"}
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
  project: ViewProject;
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
  item: ViewOpportunity;
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

export function DashboardPage() {
  const { state } = useStudent();
  const profile = state.profile!;
  const matches = matchMap(state.recommendations);

  const projects = state.projects.map(toViewProject);
  const opportunities = state.opportunities.map((o) => toViewOpportunity(o, matches.get(o.id)));
  const applications = state.applications.map(toViewApplication);
  const badges = state.achievements ? toViewAchievements(state.achievements) : [];

  const active = projects.filter((p) => p.percent < 100);

  /* The four headline tiles, computed rather than written down. `PULSE` was
     four hard-coded numbers with hard-coded deltas beside them. */
  const pulse: {
    label: string;
    value: string;
    icon: "rocket" | "file-pen" | "star" | "award";
    tint: "navy" | "mint" | "amber" | "orchid";
    /* No delta. The fixture printed "+12% this month" beside every tile and
       nothing measured a month-over-month change; there is no prior period in
       the database to compare against yet. */
    delta?: string;
  }[] = [
    { label: "Live projects", value: String(active.length), icon: "rocket", tint: "navy" },
    { label: "Applications", value: String(applications.length), icon: "file-pen", tint: "mint" },
    { label: "Impact points", value: String(state.achievements?.totalPoints ?? 0), icon: "star", tint: "amber" },
    { label: "Badges", value: String(badges.length), icon: "award", tint: "orchid" },
  ];

  /* Recent activity, from the notification feed — the only record of what has
     actually happened to this student. */
  const activity = state.notifications.slice(0, 6).map((n) => ({
    id: n.id,
    title: n.title,
    detail: n.detail,
    when: n.at,
    tint: "navy" as const,
    icon: "bell" as const,
  }));

  /* Deadlines: milestones on live projects that are not yet complete. */
  /* `Date.now()` during render is impure — a re-render would recompute the
     countdown and React's lint rule rightly objects. Captured once. */
  const [now] = useState(() => Date.now());

  const deadlines = state.projects
    .flatMap((p) => p.milestones)
    .filter((m) => m.dueAt && m.status !== "complete")
    .sort((a, b) => (a.dueAt ?? "").localeCompare(b.dueAt ?? ""))
    .slice(0, 4)
    .map((m) => {
      const days = Math.ceil((new Date(m.dueAt!).getTime() - now) / 86400000);
      return {
        id: m.id,
        title: m.label,
        date: new Date(m.dueAt!).toLocaleDateString("en-IN", { dateStyle: "medium" }),
        daysLeft: days,
        tone: days <= 3 ? ("critical" as const) : ("warning" as const),
      };
    });
  /* The recommender's own ranking, not a re-sort of the opportunity list. */
  const recommended = state.recommendations
    .slice(0, 3)
    .map((r) => opportunities.find((o) => o.id === r.problemId))
    .filter((o): o is (typeof opportunities)[number] => Boolean(o));
  const available = opportunities.slice(0, 4);
  const openApplications = applications.filter(
    (a) => a.stage !== "Not selected",
  ).length;
  const earned = badges;
    /* No in-progress badges: they are earned from a rule, and until the
     recognition cron runs there is no partial state to show. */
  const inProgress: typeof badges = [];
  const unread = state.notifications.filter((n) => !n.read);

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
          {pulse.map((tile) => (
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
                {activity.map((item, i) => {
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
                        {i < activity.length - 1 ? (
                          <span className="w-px flex-1 bg-line" />
                        ) : null}
                      </div>
                      <div
                        className={cx(
                          "min-w-0 flex-1",
                          i < activity.length - 1 && "pb-5",
                        )}
                      >
                        <p className="font-semibold text-ink">{item.title}</p>
                        <p className="text-sm text-ink-muted">{item.detail}</p>
                        <p className="mt-0.5 text-xs text-ink-faint">
                          {relative(item.when)}
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
                        {note.detail}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-faint">
                        {relative(note.at)}
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
                {deadlines.map((deadline) => (
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
                        {deadline.date}
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
                Matched against your skills — {profile.skills.slice(0, 3).join(", ")}.
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
