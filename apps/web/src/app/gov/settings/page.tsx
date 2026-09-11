"use client";

/**
 * Settings, roles and data provenance.
 *
 * Two audiences: the officer, who needs to see what their role can and cannot
 * do, and whoever wires this to the real backend, who needs to know exactly
 * which parts are still fixtures.
 */

import { Icon } from "@/components/icon";
import { Avatar, Badge, Button, Card, Enter, cx } from "@/components/ui";
import { Toggle } from "@/components/ui-interactive";
import { useState } from "react";
import { jurisdictionPath, LEVEL_LABEL } from "@/lib/gov/rbac";
import { USING_MOCK_DATA } from "@/lib/gov/service";
import { govSeed, useGov } from "@/lib/gov/store";
import type { Permission } from "@/lib/gov/types";

const ALL_PERMISSIONS: { id: Permission; label: string; detail: string }[] = [
  { id: "problem.validate", label: "Validate problems", detail: "Confirm a clustered problem is real and in remit" },
  { id: "problem.route", label: "Override routing", detail: "Send a problem to a different department" },
  { id: "sponsorship.invite", label: "Invite industry", detail: "Send CSR sponsorship requests" },
  { id: "sponsorship.approve", label: "Accept sponsorship", detail: "Bind the panchayat to an industry proposal" },
  { id: "funding.approve", label: "Approve funding", detail: "Commit government money to a problem" },
  { id: "officer.assign", label: "Assign officers", detail: "Allocate work and set deadlines" },
  { id: "project.update", label: "Update delivery", detail: "Record progress and completion evidence" },
  { id: "settings.manage", label: "Manage settings", detail: "Weightings, SLAs and automation rules" },
];

export default function SettingsPage() {
  const { state, dispatch, can } = useGov();
  const [notifyCitizens, setNotifyCitizens] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const path = jurisdictionPath(state.user.jurisdictionId, govSeed.jurisdictions);

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="min-w-0">
          <h1 className="headline-xl text-ink">
            <span className="font-medium">Settings</span> <span className="font-bold">& access</span>
          </h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            What this session can see and do, and where the data behind it comes from.
          </p>
        </div>
      </Enter>

      <div className="grid gap-6 lg:grid-cols-3">
        <Enter className="lg:col-span-2" index={1}>
          <Card className="p-5">
            <h2 className="headline-md text-ink">Signed in as</h2>
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg bg-card-muted p-4">
              <Avatar name={state.user.name} size={56} />
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-ink">{state.user.name}</p>
                <p className="text-sm text-ink-muted">{state.user.designation}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                  <Icon name="map-pin" size={12} />
                  {[...path].reverse().join(" · ")}
                </p>
              </div>
              <Badge icon="shield" tone="info">
                {LEVEL_LABEL[state.user.level]}
              </Badge>
            </div>

            <h3 className="mt-6 font-bold text-ink">Permissions</h3>
            <p className="mt-1 text-sm text-ink-muted">
              Held by the role, not by the person. Anything unchecked is hidden or disabled across
              every screen — try switching jurisdiction from the header to see the difference.
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {ALL_PERMISSIONS.map((p) => {
                const held = can(p.id);
                return (
                  <li
                    className={cx(
                      "flex items-start gap-2 rounded-md p-3",
                      held ? "bg-success-tint" : "bg-card-muted",
                    )}
                    key={p.id}
                  >
                    <Icon
                      className={cx("mt-0.5 shrink-0", held ? "text-on-success-tint" : "text-ink-faint")}
                      name={held ? "check-circle" : "lock"}
                      size={15}
                    />
                    <span className="min-w-0">
                      <span className={cx("block text-sm font-semibold", held ? "text-on-success-tint" : "text-ink-muted")}>
                        {p.label}
                      </span>
                      <span className={cx("block text-xs", held ? "text-on-success-tint/80" : "text-ink-faint")}>
                        {p.detail}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>

            <h3 className="mt-6 font-bold text-ink">Switch role</h3>
            <ul className="mt-3 flex flex-col gap-2">
              {govSeed.users.map((u) => (
                <li
                  className={cx(
                    "flex flex-wrap items-center gap-3 rounded-md p-3",
                    u.id === state.user.id ? "bg-primary-fixed" : "bg-card-muted",
                  )}
                  key={u.id}
                >
                  <Avatar name={u.name} size={36} tone={u.id === state.user.id ? "ink" : "navy"} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-ink">{u.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {u.designation} · {u.permissions.length} permissions
                    </span>
                  </span>
                  {u.id === state.user.id ? (
                    <Badge icon="check" tone="info">
                      Current
                    </Badge>
                  ) : (
                    <Button
                      onClick={() => dispatch({ type: "user/switch", userId: u.id })}
                      size="sm"
                      tone="outline"
                    >
                      Switch
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </Enter>

        <div className="flex flex-col gap-6">
          <Enter index={2}>
            <Card className="p-5">
              <h2 className="headline-md text-ink">Notifications</h2>
              <div className="mt-2 divide-y divide-line">
                <Toggle
                  checked={notifyCitizens}
                  description="Reporters are told when their problem changes stage, in the language they used."
                  label="Citizen progress updates"
                  onChange={setNotifyCitizens}
                />
                <Toggle
                  checked={dailyDigest}
                  description="One summary at 08:00 IST with overnight escalations."
                  label="Daily digest"
                  onChange={setDailyDigest}
                />
              </div>
            </Card>
          </Enter>

          <Enter index={3}>
            <Card className="p-5">
              <h2 className="headline-md text-ink">Data sources</h2>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {[
                  { label: "Problems, priority & the audit trail", live: !USING_MOCK_DATA },
                  { label: "Citizen reports", live: !USING_MOCK_DATA },
                  { label: "Village register & SECC deprivation", live: !USING_MOCK_DATA },
                  { label: "Officers & departments (read-only)", live: !USING_MOCK_DATA },
                  { label: "Sponsorship & funding workflow", live: false },
                  { label: "Citizen verification replies", live: false },
                ].map((row) => (
                  <li className="flex items-center gap-2 rounded-md bg-card-muted p-3" key={row.label}>
                    <Icon
                      className={row.live ? "text-impact-deep" : "text-ink-faint"}
                      name={row.live ? "check-circle" : "clock"}
                      size={15}
                    />
                    <span className="min-w-0 flex-1 text-ink">{row.label}</span>
                    <span className="shrink-0 text-xs font-semibold text-ink-muted">
                      {row.live ? "live API" : "mock service"}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink-muted">
                Every screen reads through <code>src/lib/gov/service.ts</code>. Replacing each
                function body with a <code>fetch</code> against <code>/backend/api</code> connects the
                workspace without touching a component.
              </p>
            </Card>
          </Enter>
        </div>
      </div>
    </div>
  );
}
