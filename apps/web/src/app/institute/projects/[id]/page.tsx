"use client";

/**
 * One project, start to submission.
 *
 * The milestone list is the spine of this screen and is deliberately rendered
 * as a vertical trail rather than a table: the point is that the work is a
 * sequence, and that anyone can see how far along it the team is and which step
 * is holding everything up.
 *
 * A submission awaiting a decision can be approved or returned from here as
 * well as from the review queue — the queue is for working through a backlog,
 * this is for deciding while reading the project it belongs to.
 */

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { Icon } from "@/components/icon";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Enter,
  PageHeading,
  Progress,
  Skeleton,
  cx,
} from "@/components/ui";
import { Modal } from "@/components/ui-interactive";
import { TextareaField } from "@/components/form";
import {
  ActionError,
  Chips,
  Fact,
  Loaded,
  MilestoneBadge,
  StageTrack,
  initials,
} from "@/components/institute/pieces";
import { useSession } from "@/lib/auth/session-context";
import { InstituteApi } from "@/lib/institute/service";
import { useAction, useResource } from "@/lib/institute/use-resource";
import { useInstitute } from "@/lib/institute/store";
import { daysUntil, plural, shortDate } from "@/lib/institute/format";
import type { Milestone } from "@/lib/institute/types";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const session = useSession();
  const overview = useInstitute();
  const canReview = session?.permissions.includes("institute.submission.review") ?? false;

  const project = useResource(() => InstituteApi.project(id), [id]);
  const [changing, setChanging] = useState<Milestone | null>(null);
  const { run, busy, error } = useAction();

  if (project.error?.toLowerCase().includes("does not exist")) notFound();

  const refresh = () => {
    project.reload();
    overview.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <Loaded
        resource={project}
        skeleton={
          <div className="flex flex-col gap-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-40" />
            <Skeleton className="h-96" />
          </div>
        }
      >
        {(p) => {
          const complete = p.milestones.filter((m) => m.status === "complete").length;
          return (
            <>
              <Enter>
                <PageHeading
                  breadcrumb={["Projects", p.title]}
                  subtitle={
                    p.problem
                      ? `Against the validated citizen problem: ${p.problem.title}`
                      : "No citizen problem is attached to this project."
                  }
                  title={p.title}
                />
              </Enter>

              <ActionError>{error}</ActionError>

              <Enter index={1}>
                <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
                  <Card className="p-5 lg:col-span-2">
                    <CardHeader icon="trending-up" title="Where it has got to" />
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-sm font-semibold text-ink">
                        {complete} of {p.milestones.length} milestones signed off
                      </span>
                      <span className="stat-number text-ink">{p.progress}%</span>
                    </div>
                    <Progress
                      className="mt-2"
                      label={`${p.title} progress`}
                      tone={p.phase === "completed" ? "mint" : "navy"}
                      value={p.progress}
                    />
                    {p.stage ? (
                      <div className="mt-5">
                        <StageTrack stage={p.stage} />
                      </div>
                    ) : null}
                  </Card>

                  <Card className="p-5">
                    <CardHeader icon="users" title="Who is carrying it" />
                    <dl className="mt-4 grid grid-cols-2 gap-4 [&>*]:min-w-0">
                      <Fact
                        label="Team"
                        value={
                          p.team ? (
                            <Link
                              className="text-navy hover:underline"
                              href={`/institute/teams/${p.team.id}`}
                            >
                              {p.team.name}
                            </Link>
                          ) : (
                            "—"
                          )
                        }
                      />
                      <Fact label="Guide" value={p.team?.guide ?? "Unassigned"} />
                      <Fact label="Department" value={p.team?.department ?? "—"} />
                      <Fact
                        label="Kind"
                        value={p.kind === "gov" ? "Government" : "Industry"}
                      />
                    </dl>

                    {p.members.length ? (
                      <div className="mt-4">
                        <p className="label-caps text-ink-faint">Members</p>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {p.members.map((m, i) => (
                            <li
                              className="flex items-center gap-2 rounded-full bg-card-muted py-1 pr-3 pl-1"
                              key={`${m.firstName}-${i}`}
                            >
                              <span className="flex size-7 items-center justify-center rounded-full bg-tint-navy text-[10px] font-bold text-on-tint-navy">
                                {initials(m.firstName)}
                              </span>
                              <span className="text-xs font-semibold text-ink">
                                {m.firstName}
                              </span>
                              <span className="text-[11px] text-ink-muted">{m.year}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </Card>
                </div>
              </Enter>

              {/* ------------------------------------------- milestones --- */}
              <Enter index={2}>
                <Card className="p-6">
                  <CardHeader
                    icon="clipboard"
                    subtitle="The sequence from starting the work to handing it over. Each step carries what the team attached to it."
                    title="Milestones"
                  />

                  {p.milestones.length === 0 ? (
                    <p className="mt-5 rounded-md bg-card-muted px-4 py-8 text-center text-sm text-ink-muted">
                      No milestones have been set for this project yet.
                    </p>
                  ) : (
                    <ol className="mt-6 flex flex-col">
                      {p.milestones.map((m, i) => {
                        const last = i === p.milestones.length - 1;
                        const due = daysUntil(m.dueAt);
                        const overdue =
                          due !== null && due < 0 && m.status !== "complete";
                        return (
                          <li className="flex gap-4" key={m.id}>
                            {/* The trail: a node per step, a rule between. */}
                            <div className="flex shrink-0 flex-col items-center">
                              <span
                                className={cx(
                                  "flex size-8 items-center justify-center rounded-full text-xs font-bold",
                                  m.status === "complete"
                                    ? "bg-success text-white"
                                    : m.awaitingReview
                                      ? "bg-gold-tint text-on-gold-tint ring-2 ring-gold"
                                      : m.status === "changes_requested"
                                        ? "bg-critical-tint text-on-critical-tint"
                                        : m.status === "active"
                                          ? "bg-primary text-white"
                                          : "bg-container text-ink-faint",
                                )}
                              >
                                {m.status === "complete" ? (
                                  <Icon name="check" size={16} />
                                ) : (
                                  i + 1
                                )}
                              </span>
                              {last ? null : (
                                <span
                                  className={cx(
                                    "w-0.5 flex-1",
                                    m.status === "complete" ? "bg-success/40" : "bg-line",
                                  )}
                                />
                              )}
                            </div>

                            <div className={cx("min-w-0 flex-1", last ? "pb-0" : "pb-6")}>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="min-w-0 flex-1 text-base font-bold text-ink">
                                  {m.label}
                                </h3>
                                {m.awaitingReview ? (
                                  <Badge dense icon="clock" tone="gold">
                                    Awaiting review
                                  </Badge>
                                ) : (
                                  <MilestoneBadge dense status={m.status} />
                                )}
                                <span className="mono-data text-xs text-ink-muted">
                                  {m.percent}%
                                </span>
                              </div>

                              {m.detail ? (
                                <p className="mt-1 text-sm text-ink-muted">{m.detail}</p>
                              ) : null}

                              <p
                                className={cx(
                                  "mt-1.5 text-xs",
                                  overdue ? "font-semibold text-critical" : "text-ink-faint",
                                )}
                              >
                                {m.completedAt
                                  ? `Completed ${shortDate(m.completedAt)}`
                                  : overdue
                                    ? `${plural(Math.abs(due as number), "day")} overdue`
                                    : m.dueAt
                                      ? `Due ${shortDate(m.dueAt)}`
                                      : "No due date"}
                              </p>

                              {m.deliverables.length ? (
                                <div className="mt-3">
                                  <p className="label-caps text-ink-faint">Deliverables</p>
                                  <div className="mt-1.5">
                                    <Chips items={m.deliverables} />
                                  </div>
                                </div>
                              ) : null}

                              {m.reviewNote ? (
                                <p
                                  className={cx(
                                    "mt-3 flex items-start gap-2 rounded-md px-3 py-2.5 text-sm",
                                    m.status === "changes_requested"
                                      ? "bg-critical-tint text-on-critical-tint"
                                      : "bg-card-muted text-ink-muted",
                                  )}
                                >
                                  <Icon className="mt-0.5 shrink-0" name="message" size={14} />
                                  <span>{m.reviewNote}</span>
                                </p>
                              ) : null}

                              {m.awaitingReview && canReview ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                  <Button
                                    disabled={busy}
                                    icon="check"
                                    onClick={() =>
                                      run(() => InstituteApi.approve(m.id), refresh)
                                    }
                                    size="sm"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    disabled={busy}
                                    onClick={() => setChanging(m)}
                                    size="sm"
                                    tone="outline"
                                  >
                                    Ask for changes
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </Card>
              </Enter>

              {/* ---------------------------------------------- the rest --- */}
              <Enter index={3}>
                <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
                  <Card className="p-5">
                    <CardHeader icon="folder" title="Documents" />
                    {p.documents.length === 0 ? (
                      <p className="mt-4 rounded-md bg-card-muted px-4 py-6 text-center text-sm text-ink-muted">
                        No documents have been attached to this project.
                      </p>
                    ) : (
                      <ul className="mt-4 flex flex-col gap-2">
                        {p.documents.map((d) => (
                          <li
                            className="flex items-center gap-3 rounded-md bg-card-muted px-3 py-2.5"
                            key={d.id}
                          >
                            <Icon className="shrink-0 text-ink-muted" name="paperclip" size={16} />
                            <span className="min-w-0 flex-1 leading-tight">
                              <span className="block truncate text-sm font-semibold text-ink">
                                {d.name}
                              </span>
                              <span className="block truncate text-xs text-ink-muted">
                                {d.kind} · {d.sizeKb} KB · {shortDate(d.at)}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>

                  <Card className="p-5">
                    <CardHeader icon="map-pin" title="Field pilot" />
                    {p.pilot ? (
                      <>
                        <p className="mt-3 text-sm text-ink-muted">
                          {p.pilot.location} · {plural(p.pilot.villages, "village")} · day{" "}
                          {p.pilot.dayOfPlan} of {p.pilot.durationDays}
                        </p>
                        <dl className="mt-4 grid grid-cols-3 gap-3 [&>*]:min-w-0">
                          <Fact label="Users" value={p.pilot.users.toLocaleString("en-IN")} />
                          <Fact label="Adoption" value={`${Math.round(p.pilot.adoption * 100)}%`} />
                          <Fact
                            label="Reliability"
                            value={`${Math.round(p.pilot.reliability * 100)}%`}
                          />
                        </dl>
                      </>
                    ) : (
                      <p className="mt-4 rounded-md bg-card-muted px-4 py-6 text-center text-sm text-ink-muted">
                        This project has not reached a field pilot.
                      </p>
                    )}

                    {p.skills.length ? (
                      <div className="mt-4">
                        <p className="label-caps text-ink-faint">Team skills</p>
                        <div className="mt-2">
                          <Chips items={p.skills} />
                        </div>
                      </div>
                    ) : null}
                  </Card>
                </div>
              </Enter>

              {changing ? (
                <Modal
                  footer={
                    <ChangesFooter
                      milestone={changing}
                      onClose={() => setChanging(null)}
                      onDone={() => {
                        setChanging(null);
                        refresh();
                      }}
                    />
                  }
                  onClose={() => setChanging(null)}
                  open
                  subtitle={changing.label}
                  title="Ask for changes"
                >
                  <p className="text-sm text-ink-muted">
                    The team sees your note verbatim. It is the only thing telling them how to
                    restart, so it is required.
                  </p>
                </Modal>
              ) : null}
            </>
          );
        }}
      </Loaded>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * The note lives in the footer so the textarea and its button share one piece
 * of state without lifting it into the page.
 */
function ChangesFooter({
  milestone,
  onClose,
  onDone,
}: {
  milestone: Milestone;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const { run, busy, error } = useAction();

  return (
    <div className="flex w-full flex-col gap-3">
      <TextareaField
        label="What needs to change"
        onChange={(e) => setNote(e.target.value)}
        placeholder="Re-run the model with the observed section loss before this can be signed off."
        required
        rows={4}
        value={note}
      />
      <ActionError>{error}</ActionError>
      <div className="flex justify-end gap-3">
        <Button onClick={onClose} tone="outline">
          Cancel
        </Button>
        <Button
          disabled={note.trim().length < 4 || busy}
          onClick={() =>
            run(() => InstituteApi.requestChanges(milestone.id, note.trim()), onDone)
          }
        >
          {busy ? "Sending…" : "Send it back"}
        </Button>
      </div>
    </div>
  );
}
