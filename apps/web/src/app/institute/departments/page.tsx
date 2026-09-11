"use client";

/**
 * Departments and programmes.
 *
 * One screen rather than two, because a programme only exists inside a
 * department and two sparse pages read worse than one dense one.
 *
 * This is the academic structure, not the government one. `Department` in the
 * database is a *line department* — it owns problem categories, carries a
 * budget and routes citizen demand — so an academic department is its own
 * table. Reusing the other would have given Civil Engineering an SLA and a
 * crore of public money.
 */

import { useState } from "react";
import { Icon } from "@/components/icon";
import { Badge, Button, Card, Enter, PageHeading, cx } from "@/components/ui";
import { Modal } from "@/components/ui-interactive";
import { Field, SelectField, TextareaField } from "@/components/form";
import { ActionError, EmptyState, Fact, Loaded } from "@/components/institute/pieces";
import { useSession } from "@/lib/auth/session-context";
import { InstituteApi } from "@/lib/institute/service";
import { useAction, useResource } from "@/lib/institute/use-resource";
import { PROGRAM_LEVEL_LABEL } from "@/lib/institute/format";
import type { Department, FacultyMember, Program } from "@/lib/institute/types";

const LEVELS = (
  ["certificate", "diploma", "undergraduate", "postgraduate", "doctoral"] as const
).map((value) => ({ value, label: PROGRAM_LEVEL_LABEL[value] }));

export default function DepartmentsPage() {
  const session = useSession();
  const canManage = session?.permissions.includes("institute.profile.manage") ?? false;

  const departments = useResource(() => InstituteApi.departments(), []);
  const faculty = useResource(() => InstituteApi.faculty(), []);
  const { run, busy, error } = useAction();

  const [editingDept, setEditingDept] = useState<Department | "new" | null>(null);
  const [editingProgram, setEditingProgram] = useState<
    { department: Department; program?: Program } | null
  >(null);
  const [deleting, setDeleting] = useState<Department | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <PageHeading
          actions={
            canManage ? (
              <Button icon="plus" onClick={() => setEditingDept("new")}>
                Add a department
              </Button>
            ) : undefined
          }
          emphasis="structure"
          subtitle="Departments and the programmes inside them. Every roster, team and analytic in this portal groups by department, so this is where the portal gets its shape."
          title="Academic"
        />
      </Enter>

      <ActionError>{error}</ActionError>

      <Enter index={1}>
        <Loaded
          empty={
            <Card className="p-6">
              <EmptyState
                icon="book"
                message="Add your first department. Students, faculty, teams and every figure in Reports are grouped by it, so nothing else in the portal can be organised until one exists."
                title="No departments yet"
                tone="warning"
              />
            </Card>
          }
          isEmpty={(d) => d.length === 0}
          resource={departments}
        >
          {(rows) => (
            <div className="flex flex-col gap-4">
              {rows.map((d) => (
                <Card className="p-5 sm:p-6" key={d.id}>
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-tint-blue text-on-tint-blue">
                      <Icon name="book" size={22} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="headline-sm text-balance text-ink">{d.name}</h2>
                        <Badge dense tone="neutral">
                          {d.code}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {d.hodName ? `Head: ${d.hodName}` : "No head of department set"}
                      </p>
                    </div>
                    {canManage ? (
                      <div className="flex gap-2">
                        <Button onClick={() => setEditingDept(d)} size="sm" tone="ghost">
                          Edit
                        </Button>
                        <Button onClick={() => setDeleting(d)} size="sm" tone="ghost">
                          Archive
                        </Button>
                      </div>
                    ) : null}
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 [&>*]:min-w-0">
                    <Fact label="Students" value={d.studentCount} />
                    <Fact label="Faculty on platform" value={d.facultyCount} />
                    <Fact label="Teaching strength" value={d.facultyStrength ?? "—"} />
                    <Fact label="Teams" value={d.teamCount} />
                  </dl>

                  <div className="mt-5 border-t border-line pt-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="label-caps min-w-0 flex-1 text-ink-faint">
                        Programmes ({d.programs.length})
                      </p>
                      {canManage ? (
                        <Button
                          onClick={() => setEditingProgram({ department: d })}
                          size="sm"
                          tone="outline"
                        >
                          Add a programme
                        </Button>
                      ) : null}
                    </div>

                    {d.programs.length === 0 ? (
                      <p className="mt-3 rounded-md bg-card-muted px-4 py-5 text-center text-sm text-ink-muted">
                        No programmes in this department yet.
                      </p>
                    ) : (
                      <ul className="mt-3 grid gap-2 lg:grid-cols-2 [&>*]:min-w-0">
                        {d.programs.map((p) => (
                          <li
                            className={cx(
                              "flex flex-wrap items-center gap-3 rounded-lg px-4 py-3",
                              p.status === "active" ? "bg-card-muted" : "bg-card-muted opacity-70",
                            )}
                            key={p.id}
                          >
                            <span className="min-w-0 flex-1 leading-tight">
                              <span className="block truncate text-sm font-bold text-ink">
                                {p.name}
                              </span>
                              <span className="block truncate text-xs text-ink-muted">
                                {PROGRAM_LEVEL_LABEL[p.level]} · {p.durationYears} years
                                {p.intake ? ` · ${p.intake} seats` : ""}
                              </span>
                            </span>
                            {p.status !== "active" ? (
                              <Badge dense tone="neutral">
                                {p.status}
                              </Badge>
                            ) : null}
                            {canManage ? (
                              <Button
                                onClick={() => setEditingProgram({ department: d, program: p })}
                                size="sm"
                                tone="ghost"
                              >
                                Edit
                              </Button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Loaded>
      </Enter>

      {editingDept ? (
        <DepartmentForm
          existing={editingDept === "new" ? undefined : editingDept}
          faculty={faculty.data ?? []}
          onClose={() => setEditingDept(null)}
          onDone={() => {
            setEditingDept(null);
            departments.reload();
          }}
        />
      ) : null}

      {editingProgram ? (
        <ProgramForm
          department={editingProgram.department}
          existing={editingProgram.program}
          onClose={() => setEditingProgram(null)}
          onDone={() => {
            setEditingProgram(null);
            departments.reload();
          }}
        />
      ) : null}

      {deleting ? (
        <Modal
          footer={
            <>
              <Button onClick={() => setDeleting(null)} tone="outline">
                Keep it
              </Button>
              <Button
                disabled={busy}
                onClick={() =>
                  run(() => InstituteApi.deleteDepartment(deleting.id), () => {
                    setDeleting(null);
                    departments.reload();
                  })
                }
                tone="danger"
              >
                {busy ? "Archiving…" : "Archive"}
              </Button>
            </>
          }
          onClose={() => setDeleting(null)}
          open
          subtitle={deleting.name}
          title="Archive this department?"
        >
          <div className="flex flex-col gap-3 text-sm text-ink-muted">
            <p>
              Its programmes are archived with it. Students and faculty keep their records and
              simply stop being grouped under it.
            </p>
            {deleting.teamCount > 0 ? (
              <p className="flex items-start gap-2 rounded-md bg-warning-tint px-3 py-2.5 text-on-warning-tint">
                <Icon className="mt-0.5 shrink-0" name="warning" size={15} />
                <span>
                  This department still has {deleting.teamCount} team
                  {deleting.teamCount === 1 ? "" : "s"}. If any are still active the archive will
                  be refused — close or move them first.
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

function DepartmentForm({
  existing,
  faculty,
  onClose,
  onDone,
}: {
  existing?: Department;
  faculty: FacultyMember[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [code, setCode] = useState(existing?.code ?? "");
  const [hod, setHod] = useState(existing?.hodFacultyId ?? "none");
  const [strength, setStrength] = useState(
    existing?.facultyStrength ? String(existing.facultyStrength) : "",
  );
  const { run, busy, error } = useAction();

  const valid = name.trim().length > 1 && code.trim().length > 0;
  const body = {
    name: name.trim(),
    code: code.trim().toUpperCase(),
    hodFacultyId: hod === "none" ? null : hod,
    facultyStrength: strength === "" ? null : Number(strength),
  };

  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} tone="outline">
            Cancel
          </Button>
          <Button
            disabled={!valid || busy}
            onClick={() =>
              run(
                () =>
                  existing
                    ? InstituteApi.updateDepartment(existing.id, body)
                    : InstituteApi.createDepartment(body),
                onDone,
              )
            }
          >
            {busy ? "Saving…" : existing ? "Save changes" : "Add department"}
          </Button>
        </>
      }
      onClose={onClose}
      open
      title={existing ? `Edit ${existing.name}` : "Add a department"}
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Department name"
          onChange={(e) => setName(e.target.value)}
          placeholder="Computer Science & Engineering"
          required
          value={name}
        />
        <Field
          hint="The short code you already use internally. Must be unique."
          label="Code"
          maxLength={16}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CSE"
          required
          value={code}
        />
        <SelectField
          label="Head of department"
          onChange={(e) => setHod(e.target.value)}
          optional
          options={[
            { value: "none", label: "Not set" },
            ...faculty.map((f) => ({ value: f.id, label: `${f.name} — ${f.designation}` })),
          ]}
          value={hod}
        />
        <Field
          hint="The sanctioned teaching strength. Faculty with platform accounts are counted separately."
          label="Teaching strength"
          min={0}
          onChange={(e) => setStrength(e.target.value)}
          optional
          type="number"
          value={strength}
        />
        <ActionError>{error}</ActionError>
      </div>
    </Modal>
  );
}

function ProgramForm({
  department,
  existing,
  onClose,
  onDone,
}: {
  department: Department;
  existing?: Program;
  onClose: () => void;
  onDone: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  const [level, setLevel] = useState<string>(existing?.level ?? "undergraduate");
  const [duration, setDuration] = useState(String(existing?.durationYears ?? 4));
  const [intake, setIntake] = useState(existing?.intake ? String(existing.intake) : "");
  const [eligibility, setEligibility] = useState(existing?.eligibility ?? "");
  const [status, setStatus] = useState<string>(existing?.status ?? "active");
  const { run, busy, error } = useAction();

  const valid = name.trim().length > 1 && Number(duration) >= 1;

  return (
    <Modal
      footer={
        <>
          {existing ? (
            <Button
              className="mr-auto"
              disabled={busy}
              onClick={() => run(() => InstituteApi.deleteProgram(existing.id), onDone)}
              tone="ghost"
            >
              Archive
            </Button>
          ) : null}
          <Button onClick={onClose} tone="outline">
            Cancel
          </Button>
          <Button
            disabled={!valid || busy}
            onClick={() =>
              run(() => {
                const body = {
                  departmentId: department.id,
                  name: name.trim(),
                  level,
                  durationYears: Number(duration),
                  intake: intake === "" ? null : Number(intake),
                  eligibility: eligibility.trim() || undefined,
                  status,
                };
                return existing
                  ? InstituteApi.updateProgram(existing.id, body)
                  : InstituteApi.createProgram(body);
              }, onDone)
            }
          >
            {busy ? "Saving…" : existing ? "Save changes" : "Add programme"}
          </Button>
        </>
      }
      onClose={onClose}
      open
      subtitle={department.name}
      title={existing ? "Edit programme" : "Add a programme"}
    >
      <div className="flex flex-col gap-4">
        <Field
          label="Programme name"
          onChange={(e) => setName(e.target.value)}
          placeholder="B.Tech Computer Science & Engineering"
          required
          value={name}
        />
        <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
          <SelectField
            label="Level"
            onChange={(e) => setLevel(e.target.value)}
            options={LEVELS}
            value={level}
          />
          <Field
            label="Duration (years)"
            max={8}
            min={1}
            onChange={(e) => setDuration(e.target.value)}
            required
            type="number"
            value={duration}
          />
        </div>
        <Field
          hint="Sanctioned seats per year. Actual enrolment is counted from the roster."
          label="Intake"
          min={1}
          onChange={(e) => setIntake(e.target.value)}
          optional
          type="number"
          value={intake}
        />
        <TextareaField
          label="Eligibility"
          onChange={(e) => setEligibility(e.target.value)}
          optional
          placeholder="10+2 with Physics, Chemistry and Mathematics"
          rows={3}
          value={eligibility}
        />
        {existing ? (
          <SelectField
            label="Status"
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: "active", label: "Active — accepting students" },
              { value: "paused", label: "Paused — not running this year" },
              { value: "archived", label: "Archived — no longer offered" },
            ]}
            value={status}
          />
        ) : null}
        <ActionError>{error}</ActionError>
      </div>
    </Modal>
  );
}
