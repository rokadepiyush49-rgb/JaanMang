"use client";

/**
 * Faculty.
 *
 * The list exists to answer one question before any other: *who can take
 * another team.* So the card leads with the guiding load against the declared
 * capacity, and the roster sorts the available ahead of the full. A directory
 * that only listed names would make the assignment screen guesswork.
 *
 * Adding a faculty member creates a real account — `User` for the login,
 * `Faculty` for who they are inside the institution, `UserRole(faculty, org)`
 * for what they may do. There is no invite-email infrastructure on the
 * platform yet, so the first password is set here and handed over out of band.
 * That is stated on the form rather than hidden, because an account nobody can
 * reach is worse than an extra step.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import {
  Badge,
  Button,
  Card,
  Enter,
  PageHeading,
  Progress,
} from "@/components/ui";
import { Modal, SearchField } from "@/components/ui-interactive";
import { Field, SelectField, TagField } from "@/components/form";
import {
  ActionError,
  Chips,
  EmptyState,
  Loaded,
  NoResults,
  PersonLine,
  TeamStatusBadge,
} from "@/components/institute/pieces";
import { useSession } from "@/lib/auth/session-context";
import { InstituteApi } from "@/lib/institute/service";
import { useAction, useResource } from "@/lib/institute/use-resource";
import { plural } from "@/lib/institute/format";
import type { Department, FacultyMember } from "@/lib/institute/types";

/**
 * Offered, not enforced — the field accepts anything typed. These are simply
 * the areas the platform's own challenges keep asking for.
 */
const EXPERTISE_SUGGESTIONS = [
  "IoT",
  "Embedded Systems",
  "Water Resources",
  "Structural Assessment",
  "Machine Learning",
  "GIS",
  "Sensors & Instrumentation",
  "Power Electronics",
  "Public Health",
  "Environmental Engineering",
  "Data Engineering",
  "Mobile Development",
];

export default function FacultyPage() {
  const session = useSession();
  const canManage = session?.permissions.includes("institute.faculty.manage") ?? false;

  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<FacultyMember | null>(null);
  const [removing, setRemoving] = useState<FacultyMember | null>(null);

  const faculty = useResource(() => InstituteApi.faculty(), []);
  const departments = useResource(() => InstituteApi.departments(), []);
  const { run, busy, error } = useAction();

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (faculty.data ?? []).filter(
      (f) =>
        !q ||
        f.name.toLowerCase().includes(q) ||
        f.designation.toLowerCase().includes(q) ||
        (f.departmentName ?? "").toLowerCase().includes(q) ||
        f.expertise.some((e) => e.toLowerCase().includes(q)),
    );
    // Whoever can take another team first — this list is read to make a choice.
    return [...rows].sort((a, b) => Number(b.available) - Number(a.available));
  }, [faculty.data, query]);

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <PageHeading
          actions={
            canManage ? (
              <Button icon="user-plus" onClick={() => setAdding(true)}>
                Add faculty
              </Button>
            ) : undefined
          }
          emphasis="faculty"
          subtitle="Who can guide a student team, what they know, and how much they are already carrying."
          title="Your"
        />
      </Enter>

      <Enter index={1}>
        <Card className="p-4 sm:p-5">
          <SearchField
            label="Search faculty"
            onChange={setQuery}
            placeholder="Name, designation, department or expertise…"
            size="sm"
            value={query}
          />
          <div className="mt-3">
            <ActionError>{error}</ActionError>
          </div>
        </Card>
      </Enter>

      <Enter index={2}>
        <Loaded
          empty={
            <Card className="p-6">
              <EmptyState
                icon="user"
                message="A team cannot be assigned a guide until somebody is here. Adding faculty is the step that unblocks every team screen."
                title="No faculty yet"
                tone="warning"
              />
            </Card>
          }
          isEmpty={(d) => d.length === 0}
          resource={faculty}
        >
          {() =>
            shown.length === 0 ? (
              <Card className="p-6">
                <NoResults onClear={() => setQuery("")} what="faculty" />
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3 [&>*]:min-w-0">
                {shown.map((f) => (
                  <Card className="flex h-full flex-col p-5" key={f.id}>
                    <div className="flex items-start gap-3">
                      <PersonLine
                        detail={f.designation}
                        name={f.name}
                        tone={f.available ? "navy" : "amber"}
                      />
                      <span className="ml-auto shrink-0">
                        <Badge dense tone={f.available ? "success" : "warning"}>
                          {f.available ? "Available" : "At capacity"}
                        </Badge>
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-ink-muted">
                      {f.departmentName ?? "No department"}
                      {f.email ? ` · ${f.email}` : ""}
                    </p>

                    <div className="mt-4">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-ink-muted">
                          Guiding {f.activeTeams} of {f.guideCapacity}
                        </span>
                        <span className="mono-data text-ink-muted">
                          {Math.round((f.activeTeams / Math.max(1, f.guideCapacity)) * 100)}%
                        </span>
                      </div>
                      <Progress
                        className="mt-1.5"
                        label={`${f.name} guiding load`}
                        size="sm"
                        tone={f.available ? "navy" : "community"}
                        value={(f.activeTeams / Math.max(1, f.guideCapacity)) * 100}
                      />
                    </div>

                    <div className="mt-4">
                      <p className="label-caps text-ink-faint">Expertise</p>
                      <div className="mt-2">
                        <Chips items={f.expertise} max={5} />
                      </div>
                    </div>

                    {f.teams.length ? (
                      <ul className="mt-4 flex flex-col gap-1.5">
                        {f.teams.slice(0, 3).map((t) => (
                          <li key={t.id}>
                            <Link
                              className="flex items-center gap-2 rounded-md bg-card-muted px-3 py-2 transition-colors hover:bg-container"
                              href={`/institute/teams/${t.id}`}
                            >
                              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                                {t.name}
                              </span>
                              <TeamStatusBadge dense status={t.status} />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-4 rounded-md bg-card-muted px-3 py-2.5 text-xs text-ink-muted">
                        Not guiding any team yet.
                      </p>
                    )}

                    {canManage ? (
                      <div className="mt-auto flex gap-2 border-t border-line pt-4">
                        <Button onClick={() => setEditing(f)} size="sm" tone="outline">
                          Edit
                        </Button>
                        <Button
                          className="ml-auto"
                          onClick={() => setRemoving(f)}
                          size="sm"
                          tone="ghost"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : null}
                  </Card>
                ))}
              </div>
            )
          }
        </Loaded>
      </Enter>

      {adding ? (
        <FacultyForm
          departments={departments.data ?? []}
          onClose={() => setAdding(false)}
          onDone={() => {
            setAdding(false);
            faculty.reload();
          }}
        />
      ) : null}

      {editing ? (
        <FacultyForm
          departments={departments.data ?? []}
          existing={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            faculty.reload();
          }}
        />
      ) : null}

      {removing ? (
        <Modal
          footer={
            <>
              <Button onClick={() => setRemoving(null)} tone="outline">
                Keep them
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  run(() => InstituteApi.removeFaculty(removing.id), () => {
                    setRemoving(null);
                    faculty.reload();
                  })
                }
                tone="danger"
              >
                {busy ? "Removing…" : "Remove"}
              </Button>
            </>
          }
          onClose={() => setRemoving(null)}
          open
          subtitle={`${removing.name} · ${removing.designation}`}
          title="Remove from this institution?"
        >
          <div className="flex flex-col gap-3 text-sm text-ink-muted">
            <p>
              Their account is not deleted — they may hold a role elsewhere, and their past
              milestone approvals stay attached to their name. What is removed is their standing
              here.
            </p>
            {removing.activeTeams > 0 ? (
              <p className="flex items-start gap-2 rounded-md bg-warning-tint px-3 py-2.5 text-on-warning-tint">
                <Icon className="mt-0.5 shrink-0" name="warning" size={15} />
                <span>
                  {plural(removing.activeTeams, "team")} they guide will be released and will show
                  on the dashboard as needing a guide.
                </span>
              </p>
            ) : null}
            <ActionError>{error}</ActionError>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function FacultyForm({
  existing,
  departments,
  onClose,
  onDone,
}: {
  existing?: FacultyMember;
  departments: Department[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [fullName, setFullName] = useState(existing?.name ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [password, setPassword] = useState("");
  const [designation, setDesignation] = useState(existing?.designation ?? "");
  const [departmentId, setDepartmentId] = useState(existing?.departmentId ?? "none");
  const [expertise, setExpertise] = useState<string[]>(existing?.expertise ?? []);
  const [capacity, setCapacity] = useState(String(existing?.guideCapacity ?? 4));
  const { run, busy, error } = useAction();

  const valid = existing
    ? designation.trim().length > 1
    : fullName.trim().length > 1 &&
      /\S+@\S+\.\S+/.test(email) &&
      designation.trim().length > 1 &&
      password.length >= 8 &&
      /[a-zA-Z]/.test(password) &&
      /[0-9]/.test(password);

  function submit() {
    const department = departmentId === "none" ? null : departmentId;
    return run(
      () =>
        existing
          ? InstituteApi.updateFaculty(existing.id, {
              designation,
              departmentId: department,
              expertise,
              guideCapacity: Number(capacity),
            })
          : InstituteApi.createFaculty({
              fullName,
              email,
              password,
              designation,
              departmentId: department,
              expertise,
              guideCapacity: Number(capacity),
            }),
      onDone,
    );
  }

  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} tone="outline">
            Cancel
          </Button>
          <Button disabled={!valid || busy} onClick={submit}>
            {busy ? "Saving…" : existing ? "Save changes" : "Add faculty"}
          </Button>
        </>
      }
      onClose={onClose}
      open
      subtitle={
        existing
          ? "Name and email belong to the account and are changed from their own settings."
          : "This creates a real account they can sign in with."
      }
      title={existing ? `Edit ${existing.name}` : "Add a faculty member"}
    >
      <div className="flex flex-col gap-4">
        {existing ? null : (
          <>
            <Field
              label="Full name"
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Dr. Meena Kujur"
              required
              value={fullName}
            />
            <Field
              hint="Preferably on your institution's own domain."
              label="Official email"
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@yourinstitute.ac.in"
              required
              type="email"
              value={email}
            />
            <Field
              hint="At least 8 characters with a letter and a number. Hand it over directly — the platform has no invite email yet, so nothing is sent automatically."
              label="First password"
              onChange={(e) => setPassword(e.target.value)}
              required
              type="text"
              value={password}
            />
          </>
        )}

        <Field
          label="Designation"
          onChange={(e) => setDesignation(e.target.value)}
          placeholder="Associate Professor"
          required
          value={designation}
        />

        <SelectField
          label="Department"
          onChange={(e) => setDepartmentId(e.target.value)}
          options={[
            { value: "none", label: "No department" },
            ...departments.map((d) => ({ value: d.id, label: d.name })),
          ]}
          value={departmentId}
        />

        <TagField
          hint="What they can actually supervise. The team screen matches a guide's expertise against a team's skills."
          label="Expertise"
          onChange={setExpertise}
          placeholder="Add an area and press Enter"
          suggestions={EXPERTISE_SUGGESTIONS}
          value={expertise}
        />

        <Field
          hint="How many teams they can guide at once. The assignment screen refuses to exceed it."
          label="Guiding capacity"
          max={30}
          min={1}
          onChange={(e) => setCapacity(e.target.value)}
          type="number"
          value={capacity}
        />

        <ActionError>{error}</ActionError>
      </div>
    </Modal>
  );
}
