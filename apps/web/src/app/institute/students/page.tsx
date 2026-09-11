"use client";

/**
 * The student roster.
 *
 * A student appears here the moment they pick this institution during their own
 * onboarding — nobody adds them. What the institution does is *confirm* them,
 * and place them in a department and a programme. That is the whole editable
 * surface: a registrar cannot rewrite a student's name, skills or contact
 * details from this screen, because that record belongs to the student.
 *
 * The default sort puts unverified students first, because they are the only
 * rows on this page that represent work.
 */

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/icon";
import {
  Badge,
  Button,
  Card,
  Cell,
  Enter,
  PageHeading,
  Row,
  Table,
  cx,
} from "@/components/ui";
import { Modal, SearchField, Segmented } from "@/components/ui-interactive";
import { SelectField } from "@/components/form";
import {
  ActionError,
  Chips,
  EmptyState,
  Loaded,
  NoResults,
  PersonLine,
} from "@/components/institute/pieces";
import { useSession } from "@/lib/auth/session-context";
import { InstituteApi } from "@/lib/institute/service";
import { useAction, useResource } from "@/lib/institute/use-resource";
import { useInstitute } from "@/lib/institute/store";
import type { RosterStudent } from "@/lib/institute/types";

/** Index-based, because that is the shape `Segmented` takes. */
const STATUS = ["All", "To verify", "Verified"] as const;
const STATUS_KEY = ["all", "unverified", "verified"] as const;

export default function StudentsPage() {
  const params = useSearchParams();
  const session = useSession();
  const overview = useInstitute();
  const canManage = session?.permissions.includes("institute.student.manage") ?? false;

  const initialStatus = Math.max(
    0,
    STATUS_KEY.indexOf((params.get("status") ?? "all") as (typeof STATUS_KEY)[number]),
  );
  const [statusIndex, setStatusIndex] = useState(initialStatus);
  const status = STATUS_KEY[statusIndex];
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("all");
  const [year, setYear] = useState("all");
  const [placing, setPlacing] = useState<RosterStudent | null>(null);

  const departments = useResource(() => InstituteApi.departments(), []);
  const roster = useResource(
    () =>
      InstituteApi.students({
        status,
        departmentId: department === "all" ? undefined : department,
      }),
    [status, department],
  );
  const { run, busy, error, clearError } = useAction();

  /* Search and year filter locally: the list is capped at 500 rows, and a
     round trip per keystroke would make a fast filter feel slow. */
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (roster.data ?? []).filter((s) => {
      if (year !== "all" && String(s.currentYear) !== year) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q) ||
        (s.enrollmentNo ?? "").toLowerCase().includes(q) ||
        s.skills.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [roster.data, query, year]);

  const filtered = query !== "" || year !== "all" || department !== "all" || status !== "all";

  const clearFilters = () => {
    setQuery("");
    setYear("all");
    setDepartment("all");
    setStatusIndex(0);
  };

  async function verify(student: RosterStudent, verified: boolean) {
    await run(
      () => InstituteApi.placeStudent(student.id, { verified }),
      () => {
        roster.reload();
        overview.reload();
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <PageHeading
          emphasis="roster"
          subtitle="Students who named this institution when they signed up. Confirm the ones who are really enrolled, and place them in a department so every screen in the portal can group them."
          title="Student"
        />
      </Enter>

      <Enter index={1}>
        <Card className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <SearchField
              className="min-w-0 flex-1 basis-64"
              label="Search students"
              onChange={setQuery}
              placeholder="Name, branch, enrolment number or skill…"
              size="sm"
              value={query}
            />
            <Segmented
              label="Verification status"
              onChange={setStatusIndex}
              segments={[...STATUS]}
              value={statusIndex}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <SelectField
              className="basis-56"
              label="Department"
              onChange={(e) => setDepartment(e.target.value)}
              options={[
                { value: "all", label: "Every department" },
                ...(departments.data ?? []).map((d) => ({ value: d.id, label: d.name })),
              ]}
              value={department}
            />
            <SelectField
              className="basis-40"
              label="Year"
              onChange={(e) => setYear(e.target.value)}
              options={[
                { value: "all", label: "Every year" },
                ...[1, 2, 3, 4, 5, 6].map((y) => ({ value: String(y), label: `Year ${y}` })),
              ]}
              value={year}
            />
            {filtered ? (
              <Button className="self-end" onClick={clearFilters} size="sm" tone="ghost">
                Clear
              </Button>
            ) : null}
          </div>

          <ActionError>{error}</ActionError>
        </Card>
      </Enter>

      <Enter index={2}>
        <Loaded
          empty={
            <Card className="p-6">
              <EmptyState
                icon="users"
                message="A student joins this roster by choosing your institution during their own signup. Nobody is added from here — share your signup link with your students."
                title="No students yet"
                tone="info"
              />
            </Card>
          }
          isEmpty={(d) => d.length === 0}
          resource={roster}
        >
          {() =>
            shown.length === 0 ? (
              <Card className="p-6">
                <NoResults onClear={clearFilters} what="students" />
              </Card>
            ) : (
              <Card className="py-2">
                <p className="px-5 py-3 text-sm text-ink-muted">
                  {shown.length} of {roster.data?.length ?? 0} students
                </p>
                <Table
                  head={[
                    "Student",
                    "Department",
                    "Year",
                    "Team",
                    "Skills",
                    "Status",
                    canManage ? "" : null,
                  ].filter((h) => h !== null)}
                >
                  {shown.map((s) => (
                    <Row key={s.id}>
                      <Cell>
                        <PersonLine
                          detail={`${s.degree} · ${s.branch}`}
                          name={s.name}
                          tone={s.verifiedAt ? "navy" : "amber"}
                        />
                      </Cell>
                      <Cell className="text-ink-muted">
                        {s.departmentName ?? (
                          <span className="text-ink-faint">Not placed</span>
                        )}
                        {s.programName ? (
                          <span className="block text-xs text-ink-faint">{s.programName}</span>
                        ) : null}
                      </Cell>
                      <Cell className="mono-data">{s.currentYear}</Cell>
                      <Cell>
                        {s.team ? (
                          <Link
                            className="text-sm font-semibold text-navy hover:underline"
                            href={`/institute/teams/${s.team.id}`}
                          >
                            {s.team.name}
                          </Link>
                        ) : (
                          <span className="text-xs text-ink-faint">No team</span>
                        )}
                      </Cell>
                      <Cell>
                        <Chips items={s.skills} max={3} />
                      </Cell>
                      <Cell>
                        {s.verifiedAt ? (
                          <Badge dense icon="check-circle" tone="success">
                            Verified
                          </Badge>
                        ) : (
                          <span className="flex flex-col gap-1">
                            <Badge dense tone="warning">
                              To verify
                            </Badge>
                            {/* The automatic half of the check, shown so the
                                registrar reads evidence rather than guesses. */}
                            <span
                              className={cx(
                                "text-[11px] font-semibold",
                                s.emailOnInstitutionDomain ? "text-success" : "text-ink-faint",
                              )}
                            >
                              {s.emailOnInstitutionDomain
                                ? "on your email domain"
                                : "personal email"}
                            </span>
                          </span>
                        )}
                      </Cell>
                      {canManage ? (
                        <Cell className="text-right">
                          <span className="flex justify-end gap-2">
                            <Button
                              onClick={() => {
                                clearError();
                                setPlacing(s);
                              }}
                              size="sm"
                              tone="ghost"
                            >
                              Place
                            </Button>
                            <Button
                              disabled={busy}
                              onClick={() => verify(s, !s.verifiedAt)}
                              size="sm"
                              tone={s.verifiedAt ? "ghost" : "primary"}
                            >
                              {s.verifiedAt ? "Unverify" : "Verify"}
                            </Button>
                          </span>
                        </Cell>
                      ) : null}
                    </Row>
                  ))}
                </Table>
              </Card>
            )
          }
        </Loaded>
      </Enter>

      {placing ? (
        <PlaceModal
          departments={departments.data ?? []}
          onClose={() => setPlacing(null)}
          onDone={() => {
            setPlacing(null);
            roster.reload();
            overview.reload();
          }}
          student={placing}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function PlaceModal({
  student,
  departments,
  onClose,
  onDone,
}: {
  student: RosterStudent;
  departments: { id: string; name: string; programs: { id: string; name: string }[] }[];
  onClose: () => void;
  onDone: () => void;
}) {
  // "none" rather than "" — an empty value would select the placeholder option
  // that `SelectField` renders disabled, making "not placed" unreachable.
  const [departmentId, setDepartmentId] = useState(student.departmentId ?? "none");
  const [programId, setProgramId] = useState(student.programId ?? "none");
  const { run, busy, error } = useAction();

  const programs = departments.find((d) => d.id === departmentId)?.programs ?? [];

  return (
    <Modal
      onClose={onClose}
      open
      title={`Place ${student.name}`}
      footer={
        <>
          <Button onClick={onClose} tone="outline">
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  InstituteApi.placeStudent(student.id, {
                    departmentId: departmentId === "none" ? null : departmentId,
                    programId: programId === "none" ? null : programId,
                  }),
                onDone,
              )
            }
          >
            {busy ? "Saving…" : "Save"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          {student.degree} · {student.branch} · Year {student.currentYear}
          {student.enrollmentNo ? ` · ${student.enrollmentNo}` : ""}
        </p>

        <SelectField
          label="Department"
          onChange={(e) => {
            setDepartmentId(e.target.value);
            setProgramId("none");
          }}
          options={[
            { value: "none", label: "Not placed" },
            ...departments.map((d) => ({ value: d.id, label: d.name })),
          ]}
          value={departmentId}
        />

        <SelectField
          disabled={departmentId === "none"}
          label="Programme"
          onChange={(e) => setProgramId(e.target.value)}
          options={[
            {
              value: "none",
              label: departmentId === "none" ? "Choose a department first" : "No programme",
            },
            ...programs.map((p) => ({ value: p.id, label: p.name })),
          ]}
          value={programId}
        />

        <p className="flex items-start gap-2 rounded-md bg-card-muted px-3 py-2.5 text-xs leading-relaxed text-ink-muted">
          <Icon className="mt-0.5 shrink-0" name="shield" size={14} />
          <span>
            Placement is all an institution may change here. A student&rsquo;s name, skills,
            contact details and links are theirs, and are not editable from this screen.
          </span>
        </p>

        <ActionError>{error}</ActionError>
      </div>
    </Modal>
  );
}
