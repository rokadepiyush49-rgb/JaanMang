"use client";

/**
 * Settings.
 *
 * Deliberately short. Everything about the *institution* lives on the profile
 * screen and everything about the *academic structure* on Departments — this
 * page is only what belongs to the signed-in person and to the session.
 *
 * The permission list is shown rather than hidden because this portal enforces
 * authority on the server, and a person who cannot see why a button is missing
 * assumes the product is broken.
 */

import { Icon } from "@/components/icon";
import { Badge, ButtonLink, Card, CardHeader, Enter, PageHeading } from "@/components/ui";
import { SignOutButton } from "@/components/auth/sign-out";
import { Fact } from "@/components/institute/pieces";
import { useSession } from "@/lib/auth/session-context";

const PERMISSION_LABEL: Record<string, string> = {
  "institute.profile.manage": "Edit the institution and its academic structure",
  "institute.faculty.manage": "Add faculty and place them in a department",
  "institute.student.manage": "Verify the roster and place students",
  "institute.team.manage": "Form teams, assign students and assign guides",
  "institute.project.oversee": "See every project the institution carries",
  "institute.submission.review": "Approve a submission or ask for changes",
  "institute.report.view": "Read institutional analytics",
};

export default function SettingsPage() {
  const session = useSession();
  const permissions = (session?.permissions ?? []).filter((p) => p.startsWith("institute."));

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <PageHeading
          emphasis="settings"
          subtitle="Your account and what it may do here. The institution itself is edited from the profile screen."
          title="Account"
        />
      </Enter>

      <Enter index={1}>
        <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
          <Card className="p-6">
            <CardHeader icon="user" title="You" />
            <dl className="mt-4 grid grid-cols-2 gap-4 [&>*]:min-w-0">
              <Fact label="Name" value={session?.displayName ?? "—"} />
              <Fact label="Designation" value={session?.organisation?.designation ?? "—"} />
              <Fact label="Email" value={session?.email ?? "—"} />
              <Fact label="Phone" value={session?.phone ?? "—"} />
            </dl>
            <p className="mt-4 flex items-start gap-2 rounded-md bg-card-muted px-3 py-2.5 text-xs leading-relaxed text-ink-muted">
              <Icon className="mt-0.5 shrink-0" name="lock" size={14} />
              <span>
                Changing your name, email or password is an account-level action and is not done
                from a workspace. Sign out and use the password reset flow to change your password.
              </span>
            </p>
          </Card>

          <Card className="p-6">
            <CardHeader icon="landmark" title="Institution" />
            <dl className="mt-4 grid grid-cols-2 gap-4 [&>*]:min-w-0">
              <Fact label="Name" value={session?.organisation?.name ?? "—"} />
              <Fact
                label="Campus"
                value={
                  session?.organisation?.institution
                    ? `${session.organisation.institution.city}, ${session.organisation.institution.state}`
                    : "—"
                }
              />
            </dl>
            <div className="mt-4 flex flex-wrap gap-3">
              <ButtonLink href="/institute/profile" size="sm" tone="outline">
                Edit the profile
              </ButtonLink>
              <ButtonLink href="/institute/departments" size="sm" tone="outline">
                Academic structure
              </ButtonLink>
            </div>
          </Card>
        </div>
      </Enter>

      <Enter index={2}>
        <Card className="p-6">
          <CardHeader
            icon="shield"
            subtitle="Your role decides these, and the server enforces every one of them. A control you cannot see is a control you could not have used."
            title="What this account may do"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {(session?.roles ?? []).map((r) => (
              <Badge key={r} tone="info">
                {r.replace(/_/g, " ")}
              </Badge>
            ))}
          </div>
          <ul className="mt-5 flex flex-col gap-2">
            {Object.entries(PERMISSION_LABEL).map(([key, label]) => {
              const held = permissions.includes(key);
              return (
                <li
                  className="flex items-center gap-3 rounded-md bg-card-muted px-4 py-2.5"
                  key={key}
                >
                  <Icon
                    className={held ? "text-success" : "text-ink-faint"}
                    name={held ? "check-circle" : "lock"}
                    size={16}
                  />
                  <span className="min-w-0 flex-1 text-sm font-semibold text-ink">{label}</span>
                  <span className="mono-data hidden text-xs text-ink-faint sm:block">{key}</span>
                </li>
              );
            })}
          </ul>
        </Card>
      </Enter>

      <Enter index={3}>
        <Card className="flex flex-wrap items-center gap-4 p-6">
          <div className="min-w-0 flex-1">
            <h2 className="headline-sm text-ink">Sign out</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Ends this session on this device. Your institution&rsquo;s records are unaffected.
            </p>
          </div>
          <SignOutButton />
        </Card>
      </Enter>
    </div>
  );
}
