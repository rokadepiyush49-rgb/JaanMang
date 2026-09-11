"use client";

/**
 * Notifications.
 *
 * The platform's own `Notification` table, filtered to this account — not a
 * second feed invented for this surface. Unread first, each carrying the action
 * that resolves it, because a notification with nowhere to go is an
 * interruption rather than a message.
 */

import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
import { Button, Card, Enter, PageHeading, cx } from "@/components/ui";
import { ActionError, EmptyState, Loaded } from "@/components/institute/pieces";
import { InstituteApi } from "@/lib/institute/service";
import { useAction, useResource } from "@/lib/institute/use-resource";
import { ago } from "@/lib/institute/format";

const ICON: Record<string, IconName> = {
  submission: "file-pen",
  roster: "users",
  team: "rocket",
  partner: "factory",
  verification: "shield",
};

export default function NotificationsPage() {
  const notifications = useResource(() => InstituteApi.notifications(), []);
  const { run, busy, error } = useAction();
  const unread = (notifications.data ?? []).filter((n) => !n.read).length;

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <PageHeading
          actions={
            unread > 0 ? (
              <Button
                disabled={busy}
                onClick={() =>
                  run(() => InstituteApi.markNotificationsRead(), notifications.reload)
                }
                tone="outline"
              >
                Mark all read
              </Button>
            ) : undefined
          }
          emphasis="notifications"
          subtitle={
            unread > 0
              ? `${unread} unread. Each one links to the screen that resolves it.`
              : "Everything here has been read."
          }
          title="Your"
        />
      </Enter>

      <ActionError>{error}</ActionError>

      <Enter index={1}>
        <Loaded
          empty={
            <Card className="p-6">
              <EmptyState
                icon="bell"
                message="You will be told here when a team submits work, when a student needs verifying, and when a partner engages with your institution."
                title="Nothing yet"
                tone="info"
              />
            </Card>
          }
          isEmpty={(d) => d.length === 0}
          resource={notifications}
        >
          {(rows) => (
            <Card className="flex flex-col gap-2 p-3 sm:p-4">
              {rows.map((n) => {
                const body = (
                  <>
                    <span
                      className={cx(
                        "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full",
                        n.read
                          ? "bg-card-muted text-ink-muted"
                          : "bg-tint-navy text-on-tint-navy",
                      )}
                    >
                      <Icon name={ICON[n.kind] ?? "bell"} size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-2">
                        <span
                          className={cx(
                            "min-w-0 flex-1 text-sm",
                            n.read ? "font-semibold text-ink-muted" : "font-bold text-ink",
                          )}
                        >
                          {n.title}
                        </span>
                        <span className="shrink-0 text-xs text-ink-faint">
                          {ago(n.createdAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-sm text-ink-muted">{n.detail}</span>
                      {n.actionLabel && n.actionHref ? (
                        <span className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-navy">
                          {n.actionLabel}
                          <Icon name="chevron-right" size={15} />
                        </span>
                      ) : null}
                    </span>
                    {n.read ? null : (
                      <span className="mt-2 size-2 shrink-0 rounded-full bg-critical" />
                    )}
                  </>
                );

                return n.actionHref ? (
                  <Link
                    className="flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-card-muted"
                    href={n.actionHref as never}
                    key={n.id}
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 rounded-lg px-3 py-3" key={n.id}>
                    {body}
                  </div>
                );
              })}
            </Card>
          )}
        </Loaded>
      </Enter>
    </div>
  );
}
