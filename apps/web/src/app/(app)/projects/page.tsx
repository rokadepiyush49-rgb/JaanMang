"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import {
  Avatar,
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  Enter,
  PageHeading,
  Progress,
  SectionHeader,
  TINT,
  TintTile,
  cx,
} from "@/components/ui";
import { Menu, Tabs } from "@/components/ui-interactive";
import { STUDENT_PROJECTS, type StudentProject } from "@/lib/data";

const STAGES = ["Plan", "Research", "Build", "Test", "Pilot", "Handover"];

function ProjectCard({ project }: { project: StudentProject }) {
  const t = TINT[project.tint];
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "flex size-12 shrink-0 items-center justify-center rounded-[14px]",
            t.wash,
          )}
        >
          <Icon name={project.icon} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-ink">{project.title}</h2>
          <p className="truncate text-sm text-ink-muted">{project.partner}</p>
        </div>
        <Menu
          items={[
            { label: "Open project", icon: "arrow-up-right" },
            { label: "Invite a teammate", icon: "user-plus" },
            { label: "Ask the Council", icon: "bot" },
            { label: "Archive", icon: "folder", danger: true },
          ]}
          label={`Options for ${project.title}`}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge dense tone={project.statusTone}>
          {project.status}
        </Badge>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
          <Icon name="clock" size={13} />
          {project.note}
        </span>
      </div>

      {/* Six stages, each named. The bar carries the proportion, the row of
          labels carries which step it is — never colour alone. */}
      <div className="mt-5 mb-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-semibold text-ink">
            {STAGES[Math.min(project.stage, STAGES.length) - 1]}
          </span>
          <span className="mono-data text-ink-muted">{project.percent}%</span>
        </div>
        <Progress
          className="mt-2"
          label={`${project.title} progress`}
          tone={project.tint}
          value={project.percent}
        />
        <div className="mt-2 flex justify-between gap-1">
          {STAGES.map((label, i) => (
            <span
              className={cx(
                "min-w-0 flex-1 truncate text-center text-[11px] font-semibold",
                i < project.stage ? "text-ink" : "text-ink-faint",
              )}
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <div className="flex items-center">
          {project.team.slice(0, 4).map((member, i) => (
            <Avatar
              className="-ml-2 ring-2 ring-card first:ml-0"
              key={member}
              name={member}
              size={30}
              tone={i === 0 ? "navy" : "muted"}
            />
          ))}
          <span className="ml-3 text-xs font-semibold text-ink-muted">
            {project.team.length} member{project.team.length === 1 ? "" : "s"}
          </span>
        </div>
        <ButtonLink href="/collaborate/review" size="sm" tone="outline">
          Open
        </ButtonLink>
      </div>
    </Card>
  );
}

export default function ProjectsPage() {
  const [tab, setTab] = useState("active");

  const active = STUDENT_PROJECTS.filter((p) => p.percent < 100);
  const completed = STUDENT_PROJECTS.filter((p) => p.percent === 100);
  const shown = tab === "active" ? active : tab === "completed" ? completed : STUDENT_PROJECTS;

  const avgProgress = Math.round(
    active.reduce((sum, p) => sum + p.percent, 0) / Math.max(active.length, 1),
  );
  const teammates = new Set(STUDENT_PROJECTS.flatMap((p) => p.team)).size - 1;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <Enter>
        <PageHeading
          actions={
            <ButtonLink href="/collaborate/new" icon="plus">
              New project
            </ButtonLink>
          }
          emphasis="projects"
          subtitle="Everything you are building, with the stage each one has reached and who is building it with you."
          title="My"
        />
      </Enter>

      <Enter index={1}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
          <TintTile
            icon="clipboard"
            label="Active"
            tint="navy"
            value={String(active.length)}
          />
          <TintTile
            icon="check-circle"
            label="Completed"
            tint="mint"
            value={String(completed.length)}
          />
          <TintTile
            icon="gauge"
            label="Avg. progress"
            tint="amber"
            value={`${avgProgress}%`}
          />
          <TintTile
            icon="users"
            label="Collaborators"
            tint="orchid"
            value={String(teammates)}
          />
        </div>
      </Enter>

      <Enter index={2}>
        <Tabs
          onChange={setTab}
          tabs={[
            { id: "active", label: "Active", count: active.length },
            { id: "completed", label: "Completed", count: completed.length },
            { id: "all", label: "All", count: STUDENT_PROJECTS.length },
          ]}
          value={tab}
        />
      </Enter>

      {shown.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            actionHref="/problem-explorer"
            actionLabel="Find a challenge"
            icon="rocket"
            message="Pick a challenge from the explorer and it will appear here the moment you form a team around it."
            title="Nothing here yet"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-3">
          {shown.map((project, i) => (
            <Enter className="h-full" index={i + 3} key={project.id}>
              <ProjectCard project={project} />
            </Enter>
          ))}
        </div>
      )}

      <Enter index={8}>
        <Card className="p-6">
          <SectionHeader
            actionHref="/collaborate/team"
            actionLabel="Build a team"
            icon="users"
            title="Looking for collaborators?"
          />
          <p className="mt-3 max-w-2xl text-sm text-ink-muted">
            Every project on this page can pull from the state-wide student
            directory. Filter by campus and skill, send an invite, and the
            teammate lands on your board with the same view you have.
          </p>
        </Card>
      </Enter>
    </div>
  );
}
