"use client";

/**
 * Alerts and escalations.
 *
 * Grouped by what the officer must do about them rather than by time, and every
 * alert carries the action inline — an alert that only announces is a second
 * job, not a help.
 */

import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
import { Badge, Button, ButtonLink, Card, Enter, cx } from "@/components/ui";
import { relative } from "@/lib/gov/format";
import { useGov } from "@/lib/gov/store";
import type { AlertKind } from "@/lib/gov/types";

const KIND: Record<AlertKind, { label: string; icon: IconName; tone: "critical" | "warning" | "info" | "gold" }> = {
  sla_breach: { label: "SLA breach", icon: "alert-circle", tone: "critical" },
  sponsorship_expiring: { label: "Sponsorship expiring", icon: "clock", tone: "warning" },
  verification_pending: { label: "Verification pending", icon: "thumbs-up", tone: "warning" },
  priority_changed: { label: "Priority changed", icon: "trending-up", tone: "info" },
  funding_ready: { label: "Funding recommended", icon: "banknote", tone: "gold" },
};

export default function AlertsPage() {
  const { state, actions } = useGov();
  const unread = state.alerts.filter((a) => !a.read);
  const read = state.alerts.filter((a) => a.read);

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="headline-xl text-ink">
              <span className="font-medium">Alerts</span> <span className="font-bold">& escalations</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              {unread.length} open. Each one names the record it came from and the action it wants,
              so nothing here needs a second search.
            </p>
          </div>
          <Button
            disabled={unread.length === 0}
            icon="check"
            onClick={() => unread.forEach((a) => void actions.markAlertRead(a.id))}
            tone="outline"
          >
            Mark all read
          </Button>
        </div>
      </Enter>

      {[
        { title: "Open", items: unread },
        { title: "Actioned", items: read },
      ].map((group, gi) =>
        group.items.length ? (
          <Enter index={gi + 1} key={group.title}>
            <section>
              <h2 className="label-caps mb-2 px-1 text-ink-faint">{group.title}</h2>
              <ul className="flex flex-col gap-3">
                {group.items.map((a) => {
                  const k = KIND[a.kind];
                  return (
                    <li key={a.id}>
                      <Card className={cx("flex flex-wrap items-start gap-4 p-5", a.read && "opacity-70")}>
                        <span
                          className={cx(
                            "flex size-11 shrink-0 items-center justify-center rounded-full",
                            k.tone === "critical" && "bg-critical-tint text-on-critical-tint",
                            k.tone === "warning" && "bg-warning-tint text-on-warning-tint",
                            k.tone === "info" && "bg-info-tint text-on-info-tint",
                            k.tone === "gold" && "bg-gold-tint text-on-gold-tint",
                          )}
                        >
                          <Icon name={k.icon} size={20} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-bold text-ink">{a.title}</h3>
                            <Badge dense tone={k.tone}>
                              {k.label}
                            </Badge>
                            <span className="text-xs text-ink-faint">{relative(a.at)}</span>
                          </div>
                          <p className="mt-1 text-sm text-ink-muted">{a.detail}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {a.problemId ? (
                              <ButtonLink
                                href={`/gov/problems/${a.problemId}`}
                                onClick={() => void actions.markAlertRead(a.id)}
                                size="sm"
                              >
                                {a.actionLabel ?? "Open problem"}
                              </ButtonLink>
                            ) : null}
                            {!a.read ? (
                              <Button
                                onClick={() => void actions.markAlertRead(a.id)}
                                size="sm"
                                tone="outline"
                              >
                                Mark read
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </Card>
                    </li>
                  );
                })}
              </ul>
            </section>
          </Enter>
        ) : null,
      )}

      {state.alerts.length === 0 ? (
        <Card className="p-6">
          <p className="text-sm text-ink-muted">No alerts.</p>
        </Card>
      ) : null}

      <p className="pb-4 text-center text-xs text-ink-faint">
        Escalations are raised by the SLA and sponsorship rules in the{" "}
        <Link className="underline" href="/gov/automation">
          automation centre
        </Link>
        .
      </p>
    </div>
  );
}
