"use client";

/**
 * Project collaboration.
 *
 * Threads exist because projects exist. There is no way to open a conversation
 * with a student, a faculty member or an officer outside a piece of work you are
 * both on, and that constraint is the design: it keeps this a collaboration tool
 * rather than a directory of people a company may approach.
 *
 * Every participant is shown with the party they belong to, so a partner always
 * knows whether they are writing to a government officer or a third-year
 * student before they write it.
 */

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { Avatar, Button, Card, EmptyState, Enter, cx } from "@/components/ui";
import { relative } from "@/lib/industry/format";
import { useIndustry } from "@/lib/industry/store";
import type { ThreadParticipant } from "@/lib/industry/types";

const ROLE_TINT: Record<ThreadParticipant["role"], string> = {
  Government: "bg-tint-navy text-on-tint-navy",
  Faculty: "bg-tint-orchid text-on-tint-orchid",
  Student: "bg-tint-mint text-on-tint-mint",
  Industry: "bg-tint-amber text-on-tint-amber",
  University: "bg-tint-blue text-on-tint-blue",
};

export default function MessagesPage() {
  const { state, dispatch, can } = useIndustry();
  const [active, setActive] = useState(state.threads[0]?.id ?? "");
  const [draft, setDraft] = useState("");

  const thread = state.threads.find((t) => t.id === active);
  const project = state.projects.find((p) => p.id === thread?.projectId);

  const send = () => {
    if (!thread || !draft.trim()) return;
    dispatch({ type: "message/send", threadId: thread.id, body: draft.trim() });
    setDraft("");
  };

  if (!state.threads.length) {
    return (
      <Card>
        <EmptyState
          actionHref="/industry/projects"
          actionLabel="Open portfolio"
          icon="message"
          message="Threads open when a project does. There is no general inbox — every conversation is anchored to a piece of work you are part of."
          title="No project threads yet"
          tone="info"
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="min-w-0">
          <h1 className="headline-xl text-ink">
            <span className="font-medium">Project</span> <span className="font-bold">threads</span>
          </h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            {state.threads.length} conversations, each one attached to a project. Government
            officers, faculty, student teams and your own engineers in the same place, with the work
            in front of them.
          </p>
        </div>
      </Enter>

      <Enter index={1}>
        <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
          {/* ------------------------------------------------ thread list */}
          <Card className="h-fit overflow-hidden p-2">
            <ul className="flex flex-col gap-1">
              {state.threads.map((t) => {
                const isActive = t.id === active;
                return (
                  <li key={t.id}>
                    <button
                      className={cx(
                        "w-full rounded-md p-3 text-left transition-colors",
                        isActive ? "bg-primary text-white" : "hover:bg-card-muted",
                      )}
                      onClick={() => {
                        setActive(t.id);
                        dispatch({ type: "thread/read", threadId: t.id });
                      }}
                      type="button"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cx(
                            "label-caps truncate",
                            isActive ? "text-white/64" : "text-ink-faint",
                          )}
                        >
                          {t.projectId}
                        </span>
                        {t.unread ? (
                          <span
                            className={cx(
                              "ml-auto shrink-0 rounded-full px-1.5 text-[11px] font-bold tabular-nums",
                              isActive ? "bg-white/20 text-white" : "bg-critical-tint text-on-critical-tint",
                            )}
                          >
                            {t.unread}
                          </span>
                        ) : null}
                      </span>
                      <span className={cx("mt-0.5 block text-sm font-bold", isActive ? "text-white" : "text-ink")}>
                        {t.subject}
                      </span>
                      <span className={cx("mt-0.5 block truncate text-xs", isActive ? "text-white/72" : "text-ink-muted")}>
                        {t.participants.length} participants · {relative(t.updatedAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* ---------------------------------------------------- thread */}
          {thread ? (
            <Card className="flex min-h-[32rem] flex-col">
              <div className="border-b border-line px-6 pt-6 pb-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="headline-md text-ink">{thread.subject}</h2>
                    {project ? (
                      <Link
                        className="mt-0.5 inline-flex items-center gap-1 text-sm text-navy hover:underline"
                        href={`/industry/projects/${project.id}`}
                      >
                        {project.id} — {project.title}
                        <Icon name="arrow-up-right" size={13} />
                      </Link>
                    ) : null}
                  </div>
                </div>

                <ul className="mt-3 flex flex-wrap gap-2">
                  {thread.participants.map((p) => (
                    <li
                      className={cx(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        ROLE_TINT[p.role],
                      )}
                      key={p.id}
                      title={p.organisation}
                    >
                      {p.name}
                      <span className="opacity-70">· {p.role}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <ul className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5">
                {thread.messages.map((m) => {
                  const author = thread.participants.find((p) => p.id === m.authorId);
                  const isSelf = m.authorId === "self" || author?.role === "Industry";
                  return (
                    <li className={cx("flex gap-3", isSelf && "flex-row-reverse")} key={m.id}>
                      <Avatar
                        name={author?.name ?? "You"}
                        size={36}
                        tone={isSelf ? "ink" : "navy"}
                      />
                      <div className={cx("min-w-0 max-w-[42rem]", isSelf && "text-right")}>
                        <p className="text-xs text-ink-faint">
                          <span className="font-semibold text-ink-muted">
                            {author?.name ?? "You"}
                          </span>
                          {author ? ` · ${author.organisation}` : ""} · {relative(m.at)}
                        </p>
                        <div
                          className={cx(
                            "mt-1 rounded-lg p-4 text-sm",
                            isSelf ? "bg-primary text-white" : "bg-card-muted text-ink",
                          )}
                        >
                          <p className="text-left">{m.body}</p>
                          {m.attachment ? (
                            <p
                              className={cx(
                                "mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                                isSelf ? "bg-white/16" : "bg-card text-ink-muted",
                              )}
                            >
                              <Icon name="paperclip" size={12} />
                              {m.attachment}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-line p-4">
                {can("messages.post") ? (
                  <div className="flex items-end gap-2">
                    <textarea
                      aria-label={`Message the ${thread.subject} thread`}
                      className="min-h-12 flex-1 resize-y rounded-md border border-line bg-card-muted p-3 text-sm text-ink focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary focus:outline-none"
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
                      }}
                      placeholder="Write to the project team…"
                      rows={2}
                      value={draft}
                    />
                    <Button disabled={!draft.trim()} icon="send" onClick={send}>
                      Send
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted">
                    <Icon className="mr-1 inline align-[-2px]" name="lock" size={13} />
                    {state.user.name} can read project threads but not post to them.
                  </p>
                )}
                <p className="mt-2 text-xs text-ink-faint">
                  Everything here is visible to all five parties on the project, including the
                  government officer. There is no private channel.
                </p>
              </div>
            </Card>
          ) : null}
        </div>
      </Enter>
    </div>
  );
}
