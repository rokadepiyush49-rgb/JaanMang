"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Enter,
  PageHeading,
  Progress,
  SectionHeader,
  cx,
} from "@/components/ui";
import { Select, Toggle } from "@/components/ui-interactive";
import { STUDENT } from "@/lib/data";

const SECTIONS = [
  { id: "account", label: "Account", icon: "user" as const },
  { id: "notifications", label: "Notifications", icon: "bell" as const },
  { id: "privacy", label: "Privacy", icon: "lock" as const },
  { id: "preferences", label: "Preferences", icon: "settings" as const },
];

/** A labelled field, on the app's filled 16px-radius input. */
function Field({
  label,
  defaultValue,
  type = "text",
  hint,
}: {
  label: string;
  defaultValue: string;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="label-caps mb-1.5 block text-ink-faint">{label}</span>
      <input
        className={cx(
          "h-12 w-full rounded-md border border-line bg-card-muted px-4 text-sm text-ink",
          "transition-[border-color,background-color] duration-150 ease-jm",
          "focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary focus:outline-none",
        )}
        defaultValue={defaultValue}
        type={type}
      />
      {hint ? <span className="mt-1.5 block text-xs text-ink-muted">{hint}</span> : null}
    </label>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState("account");
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [pushUpdates, setPushUpdates] = useState(true);
  const [teamInvites, setTeamInvites] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [showInstitution, setShowInstitution] = useState(true);
  const [discoverable, setDiscoverable] = useState(false);
  const [language, setLanguage] = useState("English");
  const [density, setDensity] = useState("Comfortable");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Enter>
        <PageHeading
          emphasis="settings"
          subtitle="Your account, what the platform sends you, and who can see your work."
          title="Account"
        />
      </Enter>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* A rail on desktop, a scrolling pill row on a phone — the same
            destinations either way. */}
        <Enter index={1}>
          <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:sticky lg:top-24 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
            {SECTIONS.map((item) => (
              <button
                aria-current={section === item.id ? "true" : undefined}
                className={cx(
                  "flex shrink-0 items-center gap-3 rounded-full px-4 py-2.5 text-sm whitespace-nowrap transition-colors duration-150 ease-jm",
                  section === item.id
                    ? "bg-primary font-bold text-white shadow-level1"
                    : "font-semibold text-ink-muted hover:bg-card hover:text-ink",
                )}
                key={item.id}
                onClick={() => setSection(item.id)}
                type="button"
              >
                <Icon name={item.icon} size={19} />
                {item.label}
              </button>
            ))}
          </nav>
        </Enter>

        <div className="flex min-w-0 flex-col gap-6">
          {section === "account" ? (
            <>
              <Enter index={2}>
                <Card className="p-6">
                  <SectionHeader icon="user" title="Profile" />
                  <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-4">
                      <Avatar name={STUDENT.name} size={72} />
                      <div className="min-w-0">
                        <p className="font-bold text-ink">{STUDENT.name}</p>
                        <p className="text-sm text-ink-muted">{STUDENT.role}</p>
                        {/* The bar keeps its own line: squeezed beside a
                            label it collapses to nothing on a phone. */}
                        <div className="mt-2 flex max-w-64 items-center gap-3">
                          <Progress
                            label="Profile completeness"
                            size="sm"
                            value={STUDENT.profileComplete}
                          />
                          <span className="mono-data shrink-0 text-ink-muted">
                            {STUDENT.profileComplete}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button className="self-start" size="sm" tone="outline">
                      Change photo
                    </Button>
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field defaultValue={STUDENT.name} label="Full name" />
                    <Field
                      defaultValue="aisha.patel@bitmesra.ac.in"
                      label="Institution email"
                      type="email"
                    />
                    <Field defaultValue={STUDENT.institution} label="Institution" />
                    <Field defaultValue={STUDENT.year} label="Year and branch" />
                    <Field
                      defaultValue={STUDENT.location}
                      hint="Used to rank nearby challenges first."
                      label="District"
                    />
                    <Field defaultValue="+91 98765 43210" label="Phone" type="tel" />
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button>Save changes</Button>
                    <Button tone="ghost">Discard</Button>
                  </div>
                </Card>
              </Enter>

              <Enter index={3}>
                <Card className="p-6">
                  <SectionHeader icon="sparkles" title="Skills and interests" />
                  <p className="mt-2 text-sm text-ink-muted">
                    These drive the match percentage on every opportunity.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {STUDENT.skills.map((skill) => (
                      <span
                        className="flex items-center gap-1.5 rounded-full bg-tint-mint px-3 py-1.5 text-xs font-semibold text-on-tint-mint"
                        key={skill}
                      >
                        {skill}
                        <button
                          aria-label={`Remove ${skill}`}
                          className="opacity-70 hover:opacity-100"
                          type="button"
                        >
                          <Icon name="x" size={12} />
                        </button>
                      </span>
                    ))}
                    <button
                      className="flex items-center gap-1.5 rounded-full border border-dashed border-line-strong px-3 py-1.5 text-xs font-semibold text-ink-muted hover:border-primary hover:text-ink"
                      type="button"
                    >
                      <Icon name="plus" size={13} />
                      Add skill
                    </button>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {STUDENT.interests.map((interest) => (
                      <Badge key={interest} tone="info">
                        {interest}
                      </Badge>
                    ))}
                  </div>
                </Card>
              </Enter>
            </>
          ) : null}

          {section === "notifications" ? (
            <Enter index={2}>
              <Card className="p-6">
                <SectionHeader icon="bell" title="What reaches you" />
                <div className="mt-3 divide-y divide-line">
                  <Toggle
                    checked={emailUpdates}
                    description="Application stage changes, offers and deadlines."
                    label="Email updates"
                    onChange={setEmailUpdates}
                  />
                  <Toggle
                    checked={pushUpdates}
                    description="Time-sensitive things only — nothing routine."
                    label="Push notifications"
                    onChange={setPushUpdates}
                  />
                  <Toggle
                    checked={teamInvites}
                    description="When another student invites you onto a project."
                    label="Team invites"
                    onChange={setTeamInvites}
                  />
                </div>
              </Card>
            </Enter>
          ) : null}

          {section === "privacy" ? (
            <Enter index={2}>
              <Card className="p-6">
                <SectionHeader icon="lock" title="Who can see your work" />
                <div className="mt-3 divide-y divide-line">
                  <Toggle
                    checked={publicProfile}
                    description="Your badges and completed projects are visible to partners."
                    label="Public profile"
                    onChange={setPublicProfile}
                  />
                  <Toggle
                    checked={showInstitution}
                    description="Show your campus on the leaderboard and in team searches."
                    label="Show institution"
                    onChange={setShowInstitution}
                  />
                  <Toggle
                    checked={discoverable}
                    description="Let industry partners contact you about roles directly."
                    label="Open to being approached"
                    onChange={setDiscoverable}
                  />
                </div>
                <div className="mt-6 rounded-lg bg-card-muted p-4">
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    <Icon className="text-ink-muted" name="download" size={18} />
                    Export your data
                  </p>
                  <p className="mt-1 text-sm text-ink-muted">
                    A single archive of your profile, projects, applications and
                    verified contributions.
                  </p>
                  <Button className="mt-3" size="sm" tone="outline">
                    Request export
                  </Button>
                </div>
              </Card>
            </Enter>
          ) : null}

          {section === "preferences" ? (
            <Enter index={2}>
              <Card className="p-6">
                <SectionHeader icon="settings" title="Preferences" />
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select
                    label="Language"
                    onChange={setLanguage}
                    options={["English", "हिन्दी"]}
                    value={language}
                  />
                  <Select
                    label="Layout density"
                    onChange={setDensity}
                    options={["Comfortable", "Compact"]}
                    value={density}
                  />
                </div>
                <p className="mt-4 text-sm text-ink-muted">
                  The interface follows your system&rsquo;s reduce-motion
                  setting automatically — nothing animates when you have asked
                  the device to keep still.
                </p>
              </Card>
            </Enter>
          ) : null}

          <Enter index={4}>
            <Card className="border border-critical/20 p-6">
              <h2 className="headline-md text-ink">Sign out</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Ends this session on this device only.
              </p>
              <Button className="mt-4" icon="log-out" tone="danger">
                Sign out
              </Button>
            </Card>
          </Enter>
        </div>
      </div>
    </div>
  );
}
