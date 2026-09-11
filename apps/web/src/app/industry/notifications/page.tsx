"use client";

/**
 * Opportunity alerts.
 *
 * Every alert carries the action it is about, because a notification that only
 * tells you something happened has made you do the work of finding it. Read
 * state is local to the session, and marking one read never hides the thing it
 * pointed at.
 */

import { useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import { Badge, Button, ButtonLink, Card, EmptyState, Enter, cx } from "@/components/ui";
import { Tabs } from "@/components/ui-interactive";
import { relative } from "@/lib/industry/format";
import { useIndustry } from "@/lib/industry/store";
import type { AlertKind } from "@/lib/industry/types";

const KIND: Record<AlertKind, { label: string; icon: IconName; wash: string }> = {
  new_match: { label: "New match", icon: "sparkles", wash: "bg-tint-orchid text-on-tint-orchid" },
  funding_opportunity: { label: "Funding", icon: "banknote", wash: "bg-tint-amber text-on-tint-amber" },
  mentor_request: { label: "Mentorship", icon: "users", wash: "bg-tint-mint text-on-tint-mint" },
  milestone_review: { label: "Review", icon: "eye", wash: "bg-warning-tint text-on-warning-tint" },
  government_approval: { label: "Government", icon: "landmark", wash: "bg-tint-navy text-on-tint-navy" },
  impact_update: { label: "Impact", icon: "bar-chart", wash: "bg-tint-mint text-on-tint-mint" },
  deadline: { label: "Deadline", icon: "clock", wash: "bg-critical-tint text-on-critical-tint" },
};

const VIEWS = [
  { id: "unread", label: "Unread" },
  { id: "all", label: "All" },
  { id: "action", label: "Needs action" },
];

export default function NotificationsPage() {
  const { state, dispatch } = useIndustry();
  const [view, setView] = useState("unread");

  const unread = state.alerts.filter((a) => !a.read);
  const rows = state.alerts.filter((a) => {
    if (view === "unread") return !a.read;
    if (view === "action") return Boolean(a.action);
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="headline-xl text-ink">
              <span className="font-medium">Opportunity</span>{" "}
              <span className="font-bold">alerts</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              {unread.length} unread. Each one opens the thing it is about — a challenge, a project,
              a mentorship request — rather than leaving you to go and find it.
            </p>
          </div>
          {unread.length ? (
            <Button icon="check" onClick={() => dispatch({ type: "alert/readAll" })} tone="outline">
              Mark all read
            </Button>
          ) : null}
        </div>
      </Enter>

      <Enter index={1}>
        <Tabs
          onChange={setView}
          tabs={VIEWS.map((v) => ({
            ...v,
            count:
              v.id === "unread"
                ? unread.length
                : v.id === "action"
                  ? state.alerts.filter((a) => a.action).length
                  : state.alerts.length,
          }))}
          value={view}
        />
      </Enter>

      {rows.length ? (
        <div className="flex flex-col gap-3">
          {rows.map((alert, i) => {
            const kind = KIND[alert.kind];
            return (
              <Enter index={i} key={alert.id}>
                <Card className={cx("p-5", !alert.read && "ring-2 ring-primary/12")}>
                  <div className="flex flex-wrap items-start gap-4">
                    <span
                      className={cx(
                        "flex size-11 shrink-0 items-center justify-center rounded-[14px]",
                        kind.wash,
                      )}
                    >
                      <Icon name={kind.icon} size={21} />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge dense tone="neutral">
                          {kind.label}
                        </Badge>
                        <span className="text-xs text-ink-faint">{relative(alert.at)}</span>
                        {!alert.read ? (
                          <span className="size-2 rounded-full bg-critical" title="Unread" />
                        ) : null}
                      </div>
                      <h2 className="mt-1.5 font-bold text-balance text-ink">{alert.title}</h2>
                      <p className="mt-1 text-sm text-ink-muted">{alert.detail}</p>
                    </div>

                    <div className="flex shrink-0 flex-col gap-2">
                      {alert.action ? (
                        <ButtonLink
                          href={alert.action.href}
                          onClick={() => dispatch({ type: "alert/read", id: alert.id })}
                          size="sm"
                        >
                          {alert.action.label}
                        </ButtonLink>
                      ) : null}
                      {!alert.read ? (
                        <Button
                          onClick={() => dispatch({ type: "alert/read", id: alert.id })}
                          size="sm"
                          tone="ghost"
                        >
                          Mark read
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </Card>
              </Enter>
            );
          })}
        </div>
      ) : (
        <Card>
          <EmptyState
            actionHref="/industry/opportunities"
            actionLabel="See opportunities"
            icon="bell"
            message="Nothing in this view. New matches, milestone reviews and government approvals arrive here as they happen."
            title="All caught up"
            tone="success"
          />
        </Card>
      )}
    </div>
  );
}
