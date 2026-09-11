"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Enter,
  PageHeading,
  cx,
} from "@/components/ui";
import { Tabs, Toggle } from "@/components/ui-interactive";
import { NOTIFICATIONS, type Notification } from "@/lib/data";

const TONE_WELL: Record<Notification["tone"], string> = {
  neutral: "bg-neutral-tint text-on-neutral-tint",
  info: "bg-info-tint text-on-info-tint",
  success: "bg-success-tint text-on-success-tint",
  warning: "bg-warning-tint text-on-warning-tint",
  critical: "bg-critical-tint text-on-critical-tint",
};

export default function NotificationsPage() {
  const [tab, setTab] = useState("all");
  const [read, setRead] = useState<Record<string, boolean>>({});
  const [digest, setDigest] = useState(true);
  const [deadlineAlerts, setDeadlineAlerts] = useState(true);

  const items = useMemo(
    () =>
      NOTIFICATIONS.map((n) => ({ ...n, unread: n.unread && !read[n.id] })),
    [read],
  );
  const unreadCount = items.filter((n) => n.unread).length;
  const shown = tab === "unread" ? items.filter((n) => n.unread) : items;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Enter>
        <PageHeading
          actions={
            unreadCount > 0 ? (
              <Button
                icon="check"
                onClick={() =>
                  setRead(Object.fromEntries(NOTIFICATIONS.map((n) => [n.id, true])))
                }
                tone="outline"
              >
                Mark all read
              </Button>
            ) : undefined
          }
          emphasis="notifications"
          subtitle="Everything the platform needs you to know, newest first."
          title="Your"
        />
      </Enter>

      <Enter index={1}>
        <Tabs
          onChange={setTab}
          tabs={[
            { id: "all", label: "All", count: items.length },
            { id: "unread", label: "Unread", count: unreadCount },
          ]}
          value={tab}
        />
      </Enter>

      {shown.length === 0 ? (
        <Enter index={2}>
          <Card className="p-6">
            <EmptyState
              icon="check-circle"
              message="You are all caught up. New updates about your projects, applications and deadlines will land here."
              title="Nothing unread"
              tone="success"
            />
          </Card>
        </Enter>
      ) : (
        <Enter index={2}>
          <Card className="divide-y divide-line overflow-hidden">
            {shown.map((note) => (
              <article
                className={cx(
                  "flex gap-4 p-5 transition-colors duration-150",
                  note.unread ? "bg-card-muted/70" : "bg-card",
                )}
                key={note.id}
              >
                <span
                  className={cx(
                    "flex size-11 shrink-0 items-center justify-center rounded-full",
                    TONE_WELL[note.tone],
                  )}
                >
                  <Icon name={note.icon} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-ink">{note.title}</h2>
                    {note.unread ? (
                      <Badge dense tone="info">
                        New
                      </Badge>
                    ) : null}
                    <span className="ml-auto shrink-0 text-xs text-ink-faint">
                      {note.when}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">{note.body}</p>
                </div>
                {note.unread ? (
                  <Button
                    className="self-center"
                    onClick={() => setRead((r) => ({ ...r, [note.id]: true }))}
                    size="sm"
                    tone="ghost"
                  >
                    <Icon name="check" size={16} />
                    <span className="sr-only">Mark {note.title} as read</span>
                  </Button>
                ) : null}
              </article>
            ))}
          </Card>
        </Enter>
      )}

      <Enter index={3}>
        <Card className="p-6">
          <h2 className="headline-md text-ink">Delivery</h2>
          <p className="mt-1 text-sm text-ink-muted">
            What reaches you outside the dashboard.
          </p>
          <div className="mt-3 divide-y divide-line">
            <Toggle
              checked={digest}
              description="One email each Monday with your open applications and deadlines."
              label="Weekly digest"
              onChange={setDigest}
            />
            <Toggle
              checked={deadlineAlerts}
              description="A push the day before anything you own is due."
              label="Deadline alerts"
              onChange={setDeadlineAlerts}
            />
          </div>
        </Card>
      </Enter>
    </div>
  );
}
