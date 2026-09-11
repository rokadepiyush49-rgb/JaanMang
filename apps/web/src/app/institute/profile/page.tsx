"use client";

/**
 * The institution profile.
 *
 * Two things share this screen because they answer the same question — *is this
 * institution's record good enough to be trusted* — from two directions: the
 * verification a reviewer performed, and the completion checklist the registrar
 * can still act on.
 *
 * The checklist is named, not just counted. "82%" tells a registrar they are
 * incomplete without telling them what to do; the missing items are listed
 * beside the figure, each one something a screen in this portal actually reads.
 */

import { useState } from "react";
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
  type Tone,
} from "@/components/ui";
import { Field, SelectField, TagField, TextareaField } from "@/components/form";
import { ActionError, Chips, Fact, Loaded, PersonLine } from "@/components/institute/pieces";
import { useSession } from "@/lib/auth/session-context";
import { InstituteApi } from "@/lib/institute/service";
import { useAction, useResource } from "@/lib/institute/use-resource";
import { INSTITUTION_TYPE_LABEL, shortDate } from "@/lib/institute/format";
import type { InstituteProfile } from "@/lib/institute/types";

const TYPES = (
  ["university", "college", "polytechnic", "iti", "training_institute", "other"] as const
).map((value) => ({ value, label: INSTITUTION_TYPE_LABEL[value] }));

const VERIFICATION: Record<string, { tone: Tone; label: string; detail: string }> = {
  verified: {
    tone: "success",
    label: "Verified",
    detail: "A reviewer confirmed this institution. Your account has full access.",
  },
  pending: {
    tone: "warning",
    label: "Awaiting review",
    detail: "A reviewer is checking this institution. You will be told when they decide.",
  },
  info_requested: {
    tone: "warning",
    label: "More information needed",
    detail: "A reviewer has asked for something before they can decide.",
  },
  rejected: {
    tone: "critical",
    label: "Not verified",
    detail: "This registration was refused. The reason is below.",
  },
};

export default function ProfilePage() {
  const session = useSession();
  const canEdit = session?.permissions.includes("institute.profile.manage") ?? false;
  const profile = useResource(() => InstituteApi.profile(), []);
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <Loaded
        resource={profile}
        skeleton={
          <div className="flex flex-col gap-6">
            <Skeleton className="h-28" />
            <Skeleton className="h-64" />
            <Skeleton className="h-72" />
          </div>
        }
      >
        {(p) => {
          const v = VERIFICATION[p.verification.status] ?? VERIFICATION.pending;
          return (
            <>
              <Enter>
                <PageHeading
                  actions={
                    canEdit && !editing ? (
                      <Button icon="file-pen" onClick={() => setEditing(true)}>
                        Edit profile
                      </Button>
                    ) : undefined
                  }
                  subtitle={`${INSTITUTION_TYPE_LABEL[p.institutionType] ?? "Institution"} · ${p.city}, ${p.state}`}
                  title={p.name}
                />
              </Enter>

              {editing ? (
                <Enter>
                  <ProfileForm
                    onCancel={() => setEditing(false)}
                    onDone={() => {
                      setEditing(false);
                      profile.reload();
                    }}
                    profile={p}
                  />
                </Enter>
              ) : (
                <>
                  {/* ------------------------------ trust and completion --- */}
                  <Enter index={1}>
                    <div className="grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
                      <Card className="p-6">
                        <CardHeader icon="shield" title="Verification" />
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <Badge
                            icon={p.verification.status === "verified" ? "check-circle" : "clock"}
                            tone={v.tone}
                          >
                            {v.label}
                          </Badge>
                          {p.verification.reviewedAt ? (
                            <span className="text-xs text-ink-faint">
                              reviewed {shortDate(p.verification.reviewedAt)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{v.detail}</p>
                        {p.verification.reason ? (
                          <p className="mt-3 flex items-start gap-2 rounded-md bg-card-muted px-3 py-2.5 text-sm text-ink-muted">
                            <Icon className="mt-0.5 shrink-0" name="message" size={14} />
                            <span>{p.verification.reason}</span>
                          </p>
                        ) : null}
                      </Card>

                      <Card className="p-6">
                        <CardHeader icon="gauge" title="Profile completion" />
                        <div className="mt-4 flex items-baseline justify-between">
                          <span className="text-sm font-semibold text-ink">
                            {p.completion.done} of {p.completion.total} filled in
                          </span>
                          <span className="stat-number text-ink">{p.completion.percent}%</span>
                        </div>
                        <Progress
                          className="mt-2"
                          label="Profile completion"
                          tone={p.completion.percent >= 80 ? "mint" : "navy"}
                          value={p.completion.percent}
                        />

                        {p.completion.missing.length === 0 ? (
                          <p className="mt-4 flex items-center gap-2 rounded-md bg-success-tint px-3 py-2.5 text-sm text-on-success-tint">
                            <Icon name="check-circle" size={16} />
                            Everything the portal reads is filled in.
                          </p>
                        ) : (
                          <>
                            <p className="mt-4 label-caps text-ink-faint">Still missing</p>
                            <ul className="mt-2 flex flex-wrap gap-1.5">
                              {p.completion.missing.map((m) => (
                                <li
                                  className="rounded-full bg-warning-tint px-2.5 py-1 text-xs font-semibold text-on-warning-tint"
                                  key={m.key}
                                >
                                  {m.label}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}
                      </Card>
                    </div>
                  </Enter>

                  {/* ------------------------------------------- the facts --- */}
                  <Enter index={2}>
                    <Card className="p-6">
                      <CardHeader icon="landmark" title="Institution" />
                      {p.about ? (
                        <p className="mt-4 max-w-3xl text-base leading-relaxed text-ink-muted">
                          {p.about}
                        </p>
                      ) : (
                        <p className="mt-4 rounded-md bg-card-muted px-4 py-3 text-sm text-ink-muted">
                          No description yet.
                        </p>
                      )}

                      <dl className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 [&>*]:min-w-0">
                        <Fact label="Type" value={INSTITUTION_TYPE_LABEL[p.institutionType]} />
                        <Fact label="Short name" value={p.shortName} />
                        <Fact label="Established" value={p.establishedYear ?? "—"} />
                        <Fact label="AISHE / reg. no." value={p.aisheCode ?? "—"} />
                        <Fact label="Accreditation" value={p.accreditation ?? "—"} />
                        <Fact label="City" value={p.city} />
                        <Fact label="District" value={p.district ?? "—"} />
                        <Fact label="State" value={p.state} />
                      </dl>

                      <div className="mt-6 grid gap-5 sm:grid-cols-3 [&>*]:min-w-0">
                        <div className="min-w-0">
                          <p className="label-caps text-ink-faint">Website</p>
                          <p className="mt-1 truncate text-sm font-semibold text-ink">
                            {p.website ? (
                              <a
                                className="text-navy hover:underline"
                                href={p.website}
                                rel="noreferrer noopener"
                                target="_blank"
                              >
                                {p.website.replace(/^https?:\/\//, "")}
                              </a>
                            ) : (
                              "—"
                            )}
                          </p>
                        </div>
                        <Fact label="Official email" value={p.officialEmail ?? "—"} />
                        <Fact label="Official phone" value={p.officialPhone ?? "—"} />
                      </div>

                      <div className="mt-6 grid gap-5 lg:grid-cols-3 [&>*]:min-w-0">
                        <div>
                          <p className="label-caps text-ink-faint">Focus areas</p>
                          <div className="mt-2">
                            <Chips items={p.focusAreas} />
                          </div>
                        </div>
                        <div>
                          <p className="label-caps text-ink-faint">Labs and facilities</p>
                          <div className="mt-2">
                            <Chips items={p.labs} />
                          </div>
                        </div>
                        <div>
                          <p className="label-caps text-ink-faint">
                            Email domains
                            <span className="ml-2 font-semibold tracking-normal normal-case text-ink-faint/80">
                              proves a student is yours
                            </span>
                          </p>
                          <div className="mt-2">
                            <Chips items={p.emailDomains} />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Enter>

                  {/* ------------------------------------------ the people --- */}
                  <Enter index={3}>
                    <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
                      <Card className="p-6 lg:col-span-2">
                        <CardHeader
                          icon="user"
                          subtitle="Who can administer this institution on the platform."
                          title="Administrators"
                        />
                        <ul className="mt-4 flex flex-col gap-2">
                          {p.administrators.map((a) => (
                            <li
                              className="flex flex-wrap items-center gap-3 rounded-lg bg-card-muted px-4 py-3"
                              key={a.id}
                            >
                              <PersonLine detail={a.designation} name={a.name} />
                              <span className="ml-auto flex flex-wrap items-center gap-3">
                                {a.email ? (
                                  <span className="text-xs text-ink-muted">{a.email}</span>
                                ) : null}
                                {a.isPrimaryContact ? (
                                  <Badge dense tone="info">
                                    Primary contact
                                  </Badge>
                                ) : null}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </Card>

                      <Card className="p-6">
                        <CardHeader icon="bar-chart" title="On the platform" />
                        <dl className="mt-4 grid grid-cols-2 gap-4 [&>*]:min-w-0">
                          <Fact label="Departments" value={p.counts.departments} />
                          <Fact label="Programmes" value={p.counts.programs} />
                          <Fact label="Faculty" value={p.counts.faculty} />
                          <Fact label="Teams" value={p.counts.teams} />
                          <Fact label="Students" value={p.counts.students} />
                          <Fact label="Verified" value={p.counts.verifiedStudents} />
                        </dl>
                      </Card>
                    </div>
                  </Enter>
                </>
              )}
            </>
          );
        }}
      </Loaded>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function ProfileForm({
  profile: p,
  onCancel,
  onDone,
}: {
  profile: InstituteProfile;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    name: p.name,
    shortName: p.shortName,
    institutionType: p.institutionType,
    about: p.about ?? "",
    accreditation: p.accreditation ?? "",
    aisheCode: p.aisheCode ?? "",
    website: p.website ?? "",
    officialEmail: p.officialEmail ?? "",
    officialPhone: p.officialPhone ?? "",
    establishedYear: p.establishedYear ? String(p.establishedYear) : "",
    city: p.city,
    state: p.state,
    district: p.district ?? "",
  });
  const [focusAreas, setFocusAreas] = useState(p.focusAreas);
  const [labs, setLabs] = useState(p.labs);
  const [emailDomains, setEmailDomains] = useState(p.emailDomains);
  const { run, busy, error } = useAction();

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  function save() {
    return run(
      () =>
        InstituteApi.updateProfile({
          ...form,
          establishedYear: form.establishedYear ? Number(form.establishedYear) : undefined,
          focusAreas,
          labs,
          emailDomains,
        } as never),
      onDone,
    );
  }

  return (
    <Card className="flex flex-col gap-6 p-6">
      <CardHeader
        icon="file-pen"
        subtitle="Everything here is read by a screen somewhere in the portal, or by a reviewer verifying you."
        title="Edit the institution profile"
      />

      <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
        <Field label="Institution name" onChange={set("name")} required value={form.name} />
        <Field
          hint="The acronym people actually use."
          label="Short name"
          onChange={set("shortName")}
          value={form.shortName}
        />
        <SelectField
          label="Type"
          onChange={set("institutionType")}
          options={TYPES}
          value={form.institutionType}
        />
        <Field
          label="Year established"
          max={new Date().getFullYear()}
          min={1800}
          onChange={set("establishedYear")}
          optional
          type="number"
          value={form.establishedYear}
        />
      </div>

      <TextareaField
        hint="What this institution does and what it is known for."
        label="Description"
        onChange={set("about")}
        optional
        rows={4}
        value={form.about}
      />

      <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
        <Field
          label="Accreditation"
          onChange={set("accreditation")}
          optional
          placeholder="NAAC A+ · Deemed University"
          value={form.accreditation}
        />
        <Field
          hint="Optional: ITIs and private training institutes routinely have none."
          label="AISHE / registration number"
          onChange={set("aisheCode")}
          optional
          value={form.aisheCode}
        />
        <Field
          label="Website"
          onChange={set("website")}
          optional
          placeholder="https://yourinstitute.ac.in"
          type="url"
          value={form.website}
        />
        <Field
          label="Official email"
          onChange={set("officialEmail")}
          optional
          type="email"
          value={form.officialEmail}
        />
        <Field
          label="Official phone"
          onChange={set("officialPhone")}
          optional
          value={form.officialPhone}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3 [&>*]:min-w-0">
        <Field label="City" onChange={set("city")} value={form.city} />
        <Field label="District" onChange={set("district")} optional value={form.district} />
        <Field label="State" onChange={set("state")} value={form.state} />
      </div>

      <TagField
        hint="What your departments are strong in. Industry partners search on these."
        label="Focus areas"
        max={20}
        onChange={setFocusAreas}
        optional
        suggestions={[]}
        value={focusAreas}
      />

      <TagField
        hint="Facilities a partner could actually use — a lab, a workshop, a test rig."
        label="Labs and facilities"
        max={30}
        onChange={setLabs}
        optional
        suggestions={[]}
        value={labs}
      />

      <TagField
        hint="A student signing up with an address on one of these is automatically flagged as yours on the roster. Domain only, no @."
        label="Email domains"
        max={10}
        onChange={setEmailDomains}
        optional
        placeholder="bitmesra.ac.in"
        suggestions={[]}
        value={emailDomains}
      />

      <ActionError>{error}</ActionError>

      <div className="flex flex-wrap gap-3">
        <Button disabled={busy} onClick={save} size="lg">
          {busy ? "Saving…" : "Save changes"}
        </Button>
        <Button onClick={onCancel} size="lg" tone="outline">
          Cancel
        </Button>
      </div>
    </Card>
  );
}
