"use client";

/**
 * One team — and the two assignments this portal exists to make.
 *
 * **The guide.** Faculty are offered ranked by how well their expertise
 * overlaps the team's declared skills, and anyone already at their declared
 * capacity is shown as full and cannot be chosen. Ranking by overlap rather
 * than alphabetically is the difference between an assignment and a lottery;
 * refusing to exceed capacity is what stops a registrar producing twelve
 * unsupervised teams from one busy afternoon.
 *
 * **The students.** Only this institution's own verified roster is offered, a
 * student can be on one active team at a time, and the server re-checks both
 * — the picker narrows the choice, it does not enforce it.
 *
 * Everything below the assignments is the same team read forwards: its brief,
 * its project, and every milestone between starting and being signed off.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
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
  cx,
} from "@/components/ui";
import { Modal, SearchField } from "@/components/ui-interactive";
import { SelectField } from "@/components/form";
import {
  ActionError,
  Chips,
  Fact,
  Loaded,
  MilestoneBadge,
  PersonLine,
  StageTrack,
  TeamStatusBadge,
  initials,
} from "@/components/institute/pieces";
import { useSession } from "@/lib/auth/session-context";
import { InstituteApi } from "@/lib/institute/service";
import { useAction, useResource } from "@/lib/institute/use-resource";
import { useInstitute } from "@/lib/institute/store";
import { SEVERITY_TONE, ago, plural, shortDate } from "@/lib/institute/format";
import type { FacultyMember, RosterStudent, TeamDetail } from "@/lib/institute/types";

const TEAM_STATUSES = [
  { value: "forming", label: "Forming — still gathering members or a guide" },
  { value: "active", label: "Active — approved and working" },
  { value: "submitted", label: "Submitted — awaiting the institution's decision" },
  { value: "completed", label: "Completed — signed off" },
  { value: "archived", label: "Archived — wound up without completing" },
];

export default function TeamPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const session = useSession();
  const overview = useInstitute();
  const canManage = session?.permissions.includes("institute.team.manage") ?? false;

  const team = useResource(() => InstituteApi.team(id), [id]);
  const [assigningGuide, setAssigningGuide] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);
  const { run, busy, error } = useAction();

  if (team.error?.toLowerCase().includes("does not exist")) notFound();

  const refresh = () => {
    team.reload();
    overview.reload();
  };

  return (
    <div className="flex flex-col gap-6">
      <Loaded
        resource={team}
        skeleton={
          <div className="flex flex-col gap-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-64" />
            <Skeleton className="h-80" />
          </div>
        }
      >
        {(t) => (
          <>
            <Enter>
              <PageHeading
                actions={
                  canManage ? (
                    <>
                      <Button
                        icon="user-plus"
                        onClick={() => setAddingMembers(true)}
                        tone="outline"
                      >
                        Assign students
                      </Button>
                      <Button icon="user" onClick={() => setAssigningGuide(true)}>
                        {t.guide ? "Change guide" : "Assign a guide"}
                      </Button>
                    </>
                  ) : undefined
                }
                breadcrumb={["Teams", t.name]}
                subtitle={t.title ?? "No brief set yet — a team without one cannot be matched to a problem."}
                title={t.name}
              />
            </Enter>

            <Enter index={1}>
              <div className="grid gap-4 lg:grid-cols-3 [&>*]:min-w-0">
                {/* ------------------------------------------- the guide --- */}
                <Card className="flex flex-col p-5">
                  <CardHeader icon="user" title="Faculty guide" />
                  {t.guide ? (
                    <div className="mt-4">
                      <PersonLine detail={t.guide.designation} name={t.guide.name} />
                      <p className="mt-3 text-xs text-ink-muted">
                        Signs off this team&rsquo;s submissions and is accountable for its
                        supervision.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 flex flex-1 flex-col justify-between gap-3">
                      <p className="flex items-start gap-2 rounded-md bg-warning-tint px-3 py-2.5 text-sm text-on-warning-tint">
                        <Icon className="mt-0.5 shrink-0" name="warning" size={15} />
                        <span>
                          No guide. Nobody can approve this team&rsquo;s work until one is
                          assigned.
                        </span>
                      </p>
                      {canManage ? (
                        <Button onClick={() => setAssigningGuide(true)} size="sm">
                          Assign a guide
                        </Button>
                      ) : null}
                    </div>
                  )}
                </Card>

                {/* ------------------------------------------ the status --- */}
                <Card className="flex flex-col p-5">
                  <CardHeader icon="gauge" title="Status" />
                  <div className="mt-4 flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <TeamStatusBadge status={t.status} />
                      {t.department ? (
                        <Badge dense tone="neutral">
                          {t.department.code}
                        </Badge>
                      ) : null}
                    </div>
                    <StageTrack compact stage={t.stage} />
                    {canManage ? (
                      <SelectField
                        hint="Marking a team active records your approval; completed records the sign-off."
                        label="Change status"
                        onChange={(e) =>
                          run(
                            () => InstituteApi.updateTeam(t.id, { status: e.target.value }),
                            refresh,
                          )
                        }
                        options={TEAM_STATUSES}
                        value={t.status}
                      />
                    ) : null}
                  </div>
                </Card>

                {/* ------------------------------------------- the dates --- */}
                <Card className="p-5">
                  <CardHeader icon="calendar" title="Record" />
                  <dl className="mt-4 grid grid-cols-2 gap-4 [&>*]:min-w-0">
                    <Fact label="Formed" value={shortDate(t.createdAt)} />
                    <Fact label="Approved" value={shortDate(t.approvedAt)} />
                    <Fact label="Submitted" value={shortDate(t.submittedAt)} />
                    <Fact label="Completed" value={shortDate(t.completedAt)} />
                  </dl>
                  <div className="mt-4">
                    <p className="label-caps text-ink-faint">Skills</p>
                    <div className="mt-2">
                      <Chips items={t.skills} max={6} />
                    </div>
                  </div>
                </Card>
              </div>
            </Enter>

            <ActionError>{error}</ActionError>

            {/* ------------------------------------------------ members --- */}
            <Enter index={2}>
              <Card className="p-6">
                <CardHeader
                  action={
                    canManage ? (
                      <Button
                        onClick={() => setAddingMembers(true)}
                        size="sm"
                        tone="outline"
                      >
                        Assign students
                      </Button>
                    ) : undefined
                  }
                  icon="users"
                  subtitle={`${plural(t.memberCount, "student")} on this team. A student can be on one active team at a time.`}
                  title="Members"
                />

                {t.members.length === 0 ? (
                  <p className="mt-5 flex items-start gap-2 rounded-md bg-warning-tint px-4 py-3 text-sm text-on-warning-tint">
                    <Icon className="mt-0.5 shrink-0" name="warning" size={15} />
                    <span>
                      Nobody is on this team yet. Assign students from your verified roster.
                    </span>
                  </p>
                ) : (
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
                    {t.members.map((m) => (
                      <li
                        className="flex items-center gap-3 rounded-lg bg-card-muted p-3"
                        key={m.id}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint-navy text-xs font-bold text-on-tint-navy">
                          {initials(m.firstName)}
                        </span>
                        <span className="min-w-0 flex-1 leading-tight">
                          <span className="block truncate text-sm font-bold text-ink">
                            {m.firstName}
                          </span>
                          <span className="block truncate text-xs text-ink-muted">
                            {m.year} · {m.discipline}
                          </span>
                        </span>
                        {canManage && m.userId ? (
                          <button
                            aria-label={`Remove ${m.firstName} from ${t.name}`}
                            className="flex size-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-critical-tint hover:text-on-critical-tint"
                            disabled={busy}
                            onClick={() =>
                              run(
                                () => InstituteApi.removeMember(t.id, m.userId as string),
                                refresh,
                              )
                            }
                            type="button"
                          >
                            <Icon name="x" size={16} />
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </Enter>

            {/* ------------------------------------------- the problem --- */}
            {t.problem ? (
              <Enter index={3}>
                <Card className="p-6">
                  <CardHeader icon="map-pin" title="The brief" />
                  <div className="mt-4 flex flex-wrap items-start gap-3">
                    <p className="min-w-0 flex-1 text-base text-ink">{t.problem.title}</p>
                    <Badge dense tone={SEVERITY_TONE[t.problem.severity] ?? "neutral"}>
                      {t.problem.severity}
                    </Badge>
                    <Badge dense tone="neutral">
                      {t.problem.category}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-ink-muted">
                    A citizen problem the administration has validated. What this team builds is
                    measured against it.
                  </p>
                </Card>
              </Enter>
            ) : null}

            {/* --------------------------------- project and milestones --- */}
            <Enter index={4}>
              {t.projects.length === 0 ? (
                <Card className="p-6">
                  <CardHeader icon="clipboard" title="Project" />
                  <p className="mt-4 rounded-md bg-card-muted px-4 py-6 text-center text-sm text-ink-muted">
                    No project has been started for this team yet. A project is created when the
                    team&rsquo;s work is funded or formally begun.
                  </p>
                </Card>
              ) : (
                t.projects.map((p) => (
                  <Card className="p-6" key={p.id}>
                    <CardHeader
                      action={
                        <Link
                          className="text-sm font-semibold text-navy hover:underline"
                          href={`/institute/projects/${p.id}`}
                        >
                          Open project
                        </Link>
                      }
                      icon="clipboard"
                      subtitle={`${p.milestones.filter((m) => m.status === "complete").length} of ${p.milestones.length} milestones complete · ${p.progress}% of the way to handover`}
                      title={p.title}
                    />

                    <Progress
                      className="mt-4"
                      label={`${p.title} progress`}
                      tone="mint"
                      value={p.progress}
                    />

                    <ol className="mt-5 flex flex-col gap-2">
                      {p.milestones.map((m) => (
                        <li
                          className={cx(
                            "rounded-lg px-4 py-3",
                            m.awaitingReview ? "bg-gold-tint" : "bg-card-muted",
                          )}
                          key={m.id}
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="min-w-0 flex-1 text-sm font-bold text-ink">{m.label}</p>
                            {m.awaitingReview ? (
                              <Badge dense icon="clock" tone="gold">
                                Awaiting review
                              </Badge>
                            ) : (
                              <MilestoneBadge dense status={m.status} />
                            )}
                            <span className="mono-data text-xs text-ink-muted">{m.percent}%</span>
                          </div>
                          {m.detail ? (
                            <p className="mt-1 text-xs text-ink-muted">{m.detail}</p>
                          ) : null}
                          {m.deliverables.length ? (
                            <div className="mt-2">
                              <Chips items={m.deliverables} max={4} />
                            </div>
                          ) : null}
                          {m.reviewNote ? (
                            <p className="mt-2 flex items-start gap-2 rounded-md bg-card px-3 py-2 text-xs text-ink-muted">
                              <Icon className="mt-0.5 shrink-0" name="message" size={13} />
                              <span>{m.reviewNote}</span>
                            </p>
                          ) : null}
                          <p className="mt-2 text-[11px] text-ink-faint">
                            {m.completedAt
                              ? `Completed ${shortDate(m.completedAt)}`
                              : m.dueAt
                                ? `Due ${shortDate(m.dueAt)}`
                                : "No due date"}
                          </p>
                        </li>
                      ))}
                    </ol>

                    {p.awaitingReview > 0 ? (
                      <Link
                        className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-navy hover:underline"
                        href="/institute/submissions"
                      >
                        Review {plural(p.awaitingReview, "submission")}
                        <Icon name="chevron-right" size={16} />
                      </Link>
                    ) : null}
                  </Card>
                ))
              )}
            </Enter>

            {/* ------------------------------------------ applications --- */}
            {t.applications.length ? (
              <Enter index={5}>
                <Card className="p-6">
                  <CardHeader
                    icon="send"
                    subtitle="What this team has applied to, and where each application stands."
                    title="Applications"
                  />
                  <ul className="mt-4 flex flex-col gap-2">
                    {t.applications.map((a) => (
                      <li
                        className="flex flex-wrap items-center gap-3 rounded-md bg-card-muted px-4 py-3"
                        key={a.id}
                      >
                        <span className="min-w-0 flex-1 text-sm font-semibold text-ink">
                          {a.opportunityRef ?? "Untitled opportunity"}
                        </span>
                        <span className="text-xs text-ink-muted">{ago(a.submittedAt)}</span>
                        <Badge dense tone="neutral">
                          {a.status.replace("_", " ")}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Enter>
            ) : null}

            {assigningGuide ? (
              <GuidePicker
                onClose={() => setAssigningGuide(false)}
                onDone={() => {
                  setAssigningGuide(false);
                  refresh();
                }}
                team={t}
              />
            ) : null}

            {addingMembers ? (
              <MemberPicker
                onClose={() => setAddingMembers(false)}
                onDone={() => {
                  setAddingMembers(false);
                  refresh();
                }}
                team={t}
              />
            ) : null}
          </>
        )}
      </Loaded>
    </div>
  );
}

/* ============================================================ the guide === */

/**
 * How well a faculty member's expertise covers what the team says it needs.
 *
 * A blunt overlap count, not a score pretending to be a model — and the matched
 * areas are named on the card, so a registrar can see *why* somebody is at the
 * top and disagree with it.
 */
function overlap(faculty: FacultyMember, skills: string[]): string[] {
  const wanted = skills.map((s) => s.toLowerCase());
  return faculty.expertise.filter((e) =>
    wanted.some((w) => w.includes(e.toLowerCase()) || e.toLowerCase().includes(w)),
  );
}

function GuidePicker({
  team,
  onClose,
  onDone,
}: {
  team: TeamDetail;
  onClose: () => void;
  onDone: () => void;
}) {
  const faculty = useResource(() => InstituteApi.faculty(), []);
  const [query, setQuery] = useState("");
  const { run, busy, error } = useAction();

  const ranked = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = (faculty.data ?? []).filter(
      (f) =>
        !q ||
        f.name.toLowerCase().includes(q) ||
        (f.departmentName ?? "").toLowerCase().includes(q) ||
        f.expertise.some((e) => e.toLowerCase().includes(q)),
    );
    return rows
      .map((f) => ({ f, match: overlap(f, team.skills), sameDept: f.departmentId === team.departmentId }))
      .sort((a, b) => {
        // Available first — an unavailable guide is not a choice.
        if (a.f.available !== b.f.available) return Number(b.f.available) - Number(a.f.available);
        if (a.match.length !== b.match.length) return b.match.length - a.match.length;
        return Number(b.sameDept) - Number(a.sameDept);
      });
  }, [faculty.data, query, team.skills, team.departmentId]);

  return (
    <Modal
      footer={
        team.guide ? (
          <Button
            disabled={busy}
            onClick={() => run(() => InstituteApi.assignGuide(team.id, null), onDone)}
            tone="ghost"
          >
            Remove the current guide
          </Button>
        ) : (
          <Button onClick={onClose} tone="outline">
            Cancel
          </Button>
        )
      }
      onClose={onClose}
      open
      subtitle={`Ranked by how well their expertise covers ${team.name}'s declared skills.`}
      title="Assign a faculty guide"
    >
      <div className="flex flex-col gap-4">
        <SearchField
          label="Search faculty"
          onChange={setQuery}
          placeholder="Name, department or expertise…"
          size="sm"
          value={query}
        />

        {team.skills.length === 0 ? (
          <p className="rounded-md bg-card-muted px-3 py-2.5 text-xs text-ink-muted">
            This team has no declared skills, so nobody can be ranked against it. The list below is
            simply everyone who has room.
          </p>
        ) : null}

        <ActionError>{error}</ActionError>

        {faculty.loading ? (
          <Skeleton className="h-40" />
        ) : ranked.length === 0 ? (
          <p className="rounded-md bg-card-muted px-4 py-8 text-center text-sm text-ink-muted">
            No faculty match that search. Add faculty from the Faculty screen.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {ranked.map(({ f, match, sameDept }) => {
              const current = f.id === team.guide?.id;
              return (
                <li key={f.id}>
                  <button
                    className={cx(
                      "flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                      current
                        ? "bg-primary-fixed"
                        : f.available
                          ? "bg-card-muted hover:bg-container"
                          : "cursor-not-allowed bg-card-muted opacity-60",
                    )}
                    disabled={!f.available || busy || current}
                    onClick={() => run(() => InstituteApi.assignGuide(team.id, f.id), onDone)}
                    type="button"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint-navy text-xs font-bold text-on-tint-navy">
                      {initials(f.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{f.name}</span>
                      <span className="block truncate text-xs text-ink-muted">
                        {f.designation}
                        {f.departmentName ? ` · ${f.departmentName}` : ""}
                      </span>
                      <span className="mt-1.5 flex flex-wrap gap-1.5">
                        {match.length ? (
                          match.map((m) => (
                            <span
                              className="rounded-full bg-success-tint px-2 py-0.5 text-[11px] font-semibold text-on-success-tint"
                              key={m}
                            >
                              {m}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] font-semibold text-ink-faint">
                            No overlap with this team&rsquo;s skills
                          </span>
                        )}
                        {sameDept ? (
                          <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
                            same department
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      {current ? (
                        <Badge dense tone="info">
                          Current
                        </Badge>
                      ) : f.available ? (
                        <span className="mono-data text-xs text-ink-muted">
                          {f.activeTeams}/{f.guideCapacity}
                        </span>
                      ) : (
                        <Badge dense tone="warning">
                          Full
                        </Badge>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}

/* ========================================================= the students === */

function MemberPicker({
  team,
  onClose,
  onDone,
}: {
  team: TeamDetail;
  onClose: () => void;
  onDone: () => void;
}) {
  // Only verified students are offered: putting someone on a team is vouching
  // for them, and the institution has not yet vouched for the rest.
  const roster = useResource(() => InstituteApi.students({ status: "verified" }), []);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const { run, busy, error } = useAction();

  const onTeam = useMemo(
    () => new Set(team.members.map((m) => m.userId).filter(Boolean) as string[]),
    [team.members],
  );

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (roster.data ?? []).filter((s) => {
      if (onTeam.has(s.id)) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q) ||
        s.skills.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [roster.data, query, onTeam]);

  const free = (s: RosterStudent) => !s.team || s.team.id === team.id;

  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} tone="outline">
            Cancel
          </Button>
          <Button
            disabled={picked.length === 0 || busy}
            onClick={() => run(() => InstituteApi.addMembers(team.id, picked), onDone)}
          >
            {busy ? "Assigning…" : `Assign ${plural(picked.length, "student")}`}
          </Button>
        </>
      }
      onClose={onClose}
      open
      subtitle="Your verified roster. A student already on another active team cannot be added twice."
      title={`Assign students to ${team.name}`}
    >
      <div className="flex flex-col gap-4">
        <SearchField
          label="Search the roster"
          onChange={setQuery}
          placeholder="Name, branch or skill…"
          size="sm"
          value={query}
        />

        <ActionError>{error}</ActionError>

        {roster.loading ? (
          <Skeleton className="h-40" />
        ) : shown.length === 0 ? (
          <p className="rounded-md bg-card-muted px-4 py-8 text-center text-sm text-ink-muted">
            {(roster.data ?? []).length === 0
              ? "No verified students yet. Verify students on the roster screen first."
              : "Everybody matching that search is already on this team."}
          </p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {shown.map((s) => {
              const selected = picked.includes(s.id);
              const available = free(s);
              return (
                <li key={s.id}>
                  <button
                    aria-pressed={selected}
                    className={cx(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                      selected
                        ? "bg-primary-fixed"
                        : available
                          ? "bg-card-muted hover:bg-container"
                          : "cursor-not-allowed bg-card-muted opacity-60",
                    )}
                    disabled={!available}
                    onClick={() =>
                      setPicked((p) =>
                        p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id],
                      )
                    }
                    type="button"
                  >
                    <span
                      className={cx(
                        "flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2",
                        selected ? "border-primary bg-primary text-white" : "border-line-strong",
                      )}
                    >
                      {selected ? <Icon name="check" size={13} /> : null}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-sm font-bold text-ink">{s.name}</span>
                      <span className="block truncate text-xs text-ink-muted">
                        {s.branch} · Year {s.currentYear}
                        {s.departmentName ? ` · ${s.departmentName}` : ""}
                      </span>
                    </span>
                    {available ? (
                      <span className="hidden shrink-0 sm:block">
                        <Chips items={s.skills} max={2} />
                      </span>
                    ) : (
                      <Badge dense tone="warning">
                        On {s.team?.name}
                      </Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
