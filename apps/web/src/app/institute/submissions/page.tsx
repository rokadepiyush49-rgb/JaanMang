"use client";

/**
 * Submissions — the review queue.
 *
 * A team submits a milestone with its deliverables; somebody at the institution
 * owes them a decision. This screen is that decision and nothing else, oldest
 * first, because the cost of a review queue is paid by whoever has been waiting
 * longest.
 *
 * Asking for changes requires a written reason. "Changes requested" with no
 * note is the most useless state a review system can produce — it stops the
 * work and tells the team nothing about how to restart it — so the form will
 * not submit without one.
 */

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, Button, Card, Enter, PageHeading, Progress, cx } from "@/components/ui";
import { Modal } from "@/components/ui-interactive";
import { TextareaField } from "@/components/form";
import { ActionError, Chips, EmptyState, Loaded } from "@/components/institute/pieces";
import { useSession } from "@/lib/auth/session-context";
import { InstituteApi } from "@/lib/institute/service";
import { useAction, useResource } from "@/lib/institute/use-resource";
import { useInstitute } from "@/lib/institute/store";
import { ago, daysUntil, plural, shortDate } from "@/lib/institute/format";
import type { Submission } from "@/lib/institute/types";

export default function SubmissionsPage() {
  const session = useSession();
  const overview = useInstitute();
  const canReview = session?.permissions.includes("institute.submission.review") ?? false;

  const submissions = useResource(() => InstituteApi.submissions(), []);
  const [changing, setChanging] = useState<Submission | null>(null);
  const { run, busy, error } = useAction();

  const refresh = () => {
    submissions.reload();
    overview.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <PageHeading
          emphasis="review"
          subtitle="Milestones teams have submitted and nobody has decided on. Oldest first — the wait is the cost."
          title="Awaiting"
        />
      </Enter>

      <ActionError>{error}</ActionError>

      <Enter index={1}>
        <Loaded
          empty={
            <Card className="p-6">
              <EmptyState
                actionHref="/institute/projects"
                actionLabel="See every project"
                icon="check-circle"
                message="Every milestone a team has submitted has been decided. Nothing is waiting on you."
                title="Nothing to review"
                tone="success"
              />
            </Card>
          }
          isEmpty={(d) => d.length === 0}
          resource={submissions}
        >
          {(rows) => (
            <div className="flex flex-col gap-4">
              {rows.map((s) => {
                const due = daysUntil(s.dueAt);
                const overdue = due !== null && due < 0;
                return (
                  <Card className="p-5 sm:p-6" key={s.id}>
                    <div className="flex flex-wrap items-start gap-3">
                      <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-gold-tint text-on-gold-tint">
                        <Icon name="file-pen" size={22} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <h2 className="headline-sm text-balance text-ink">{s.label}</h2>
                        <p className="mt-1 text-sm text-ink-muted">
                          <Link
                            className="font-semibold text-navy hover:underline"
                            href={`/institute/projects/${s.project.id}`}
                          >
                            {s.project.title}
                          </Link>
                          {" · "}
                          {s.team.id ? (
                            <Link
                              className="font-semibold text-navy hover:underline"
                              href={`/institute/teams/${s.team.id}`}
                            >
                              {s.team.name}
                            </Link>
                          ) : (
                            s.team.name
                          )}
                          {s.team.department ? ` · ${s.team.department}` : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <Badge dense icon="clock" tone="gold">
                          waiting {ago(s.submittedAt)}
                        </Badge>
                        {s.dueAt ? (
                          <span
                            className={cx(
                              "text-[11px] font-semibold",
                              overdue ? "text-critical" : "text-ink-faint",
                            )}
                          >
                            {overdue
                              ? `${plural(Math.abs(due), "day")} overdue`
                              : `due ${shortDate(s.dueAt)}`}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {s.detail ? (
                      <p className="mt-4 text-sm leading-relaxed text-ink-muted">{s.detail}</p>
                    ) : null}

                    <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end [&>*]:min-w-0">
                      <div className="min-w-0">
                        <p className="label-caps text-ink-faint">
                          Deliverables attached — what you are deciding on
                        </p>
                        <div className="mt-2">
                          {s.deliverables.length ? (
                            <Chips items={s.deliverables} />
                          ) : (
                            <p className="flex items-center gap-2 rounded-md bg-warning-tint px-3 py-2 text-xs text-on-warning-tint">
                              <Icon name="warning" size={14} />
                              Nothing was attached. Ask for changes before approving.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="min-w-40">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-xs font-semibold text-ink-muted">
                            Takes the project to
                          </span>
                          <span className="mono-data text-ink">{s.percent}%</span>
                        </div>
                        <Progress
                          className="mt-1.5"
                          label={`${s.project.title} would reach ${s.percent}%`}
                          size="sm"
                          tone="mint"
                          value={s.percent}
                        />
                        <p className="mt-1 text-[11px] text-ink-faint">
                          currently {s.project.progress}%
                        </p>
                      </div>
                    </div>

                    {canReview ? (
                      <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-4">
                        <Button
                          disabled={busy}
                          icon="check"
                          onClick={() => run(() => InstituteApi.approve(s.id), refresh)}
                        >
                          Approve
                        </Button>
                        <Button
                          disabled={busy}
                          icon="file-pen"
                          onClick={() => setChanging(s)}
                          tone="outline"
                        >
                          Ask for changes
                        </Button>
                        {s.team.guide ? (
                          <span className="ml-auto self-center text-xs text-ink-faint">
                            Guide: {s.team.guide}
                          </span>
                        ) : (
                          <span className="ml-auto self-center text-xs font-semibold text-warning">
                            This team has no guide
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="mt-5 border-t border-line pt-4 text-xs text-ink-faint">
                        You can see this submission but not decide on it.
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </Loaded>
      </Enter>

      {changing ? (
        <ChangesModal
          onClose={() => setChanging(null)}
          onDone={() => {
            setChanging(null);
            refresh();
          }}
          submission={changing}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function ChangesModal({
  submission,
  onClose,
  onDone,
}: {
  submission: Submission;
  onClose: () => void;
  onDone: () => void;
}) {
  const [note, setNote] = useState("");
  const { run, busy, error } = useAction();
  const valid = note.trim().length >= 4;

  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} tone="outline">
            Cancel
          </Button>
          <Button
            disabled={!valid || busy}
            onClick={() =>
              run(() => InstituteApi.requestChanges(submission.id, note.trim()), onDone)
            }
          >
            {busy ? "Sending…" : "Send it back"}
          </Button>
        </>
      }
      onClose={onClose}
      open
      subtitle={`${submission.label} · ${submission.team.name}`}
      title="Ask for changes"
    >
      <div className="flex flex-col gap-4">
        <TextareaField
          hint="Required. The team sees this verbatim, and it is the only thing telling them how to restart."
          label="What needs to change"
          onChange={(e) => setNote(e.target.value)}
          placeholder="The model assumes an intact soffit. Re-run it with the observed section loss before this can be signed off."
          required
          rows={5}
          value={note}
        />
        <ActionError>{error}</ActionError>
      </div>
    </Modal>
  );
}
