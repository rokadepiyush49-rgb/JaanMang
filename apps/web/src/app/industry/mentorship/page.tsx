"use client";

/**
 * Mentorship.
 *
 * The contribution universities ask for most and the one companies offer least,
 * so the screen is built to make saying yes cheap: each request names what the
 * team is actually stuck on, and the roster shows which of your engineers has
 * hours free against it. Nobody is matched automatically — the rule only ever
 * proposes.
 */

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icon";
import {
  Avatar,
  Badge,
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Enter,
  Progress,
  cx,
} from "@/components/ui";
import { Modal, Tabs } from "@/components/ui-interactive";
import { relative, until } from "@/lib/industry/format";
import {
  facultyOf,
  mentorLoad,
  openRequests,
  team as findTeam,
  universityName,
} from "@/lib/industry/selectors";
import { useIndustry } from "@/lib/industry/store";
import type { MentorshipRequest } from "@/lib/industry/types";

const TABS = [
  { id: "requests", label: "Open requests" },
  { id: "assignments", label: "Your mentorships" },
  { id: "roster", label: "Mentor roster" },
];

export default function MentorshipPage() {
  const { state, can } = useIndustry();
  const [tab, setTab] = useState("requests");
  const [offering, setOffering] = useState<MentorshipRequest | null>(null);

  const open = openRequests(state.requests, state.assignments);
  const load = mentorLoad(state.assignments);
  const matcher = state.automations.find((a) => a.id === "au-mentor");

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="headline-xl text-ink">
              <span className="font-medium">Mentorship</span>{" "}
              <span className="font-bold">opportunities</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              {load.assignments} of your engineers are in {load.teams} student teams, and have given{" "}
              {load.hoursGiven} hours so far. {open.length} team
              {open.length === 1 ? " is" : "s are"} asking for someone new.
            </p>
          </div>
          <ButtonLink href="/industry/company" icon="user-plus" tone="outline">
            Manage mentor roster
          </ButtonLink>
        </div>
      </Enter>

      <Enter index={1}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Active mentorships" value={String(load.assignments)} hint={`${load.teams} teams`} />
          <Stat label="Hours given" value={String(load.hoursGiven)} hint="in completed sessions" />
          <Stat
            label="Sessions upcoming"
            value={String(load.upcoming)}
            hint="scheduled with teams"
          />
          <Stat
            label="Questions waiting"
            tone={load.openQuestions ? "warning" : undefined}
            value={String(load.openQuestions)}
            hint="asked by students, unanswered"
          />
        </div>
      </Enter>

      {matcher?.status === "attention" ? (
        <Enter index={2}>
          <Card className="flex flex-wrap items-start gap-3 bg-warning-tint p-5" tone="flat">
            <Icon className="mt-0.5 shrink-0 text-on-warning-tint" name="bot" size={18} />
            <p className="min-w-0 flex-1 text-sm text-on-warning-tint">
              <span className="font-bold">Mentor matching needs a person.</span> {matcher.nextAction}.
              The rule will not assign anyone on your behalf — it can only tell you the gap exists.
            </p>
          </Card>
        </Enter>
      ) : null}

      <Enter index={3}>
        <Tabs
          onChange={setTab}
          tabs={TABS.map((t) => ({
            ...t,
            count:
              t.id === "requests"
                ? open.length
                : t.id === "assignments"
                  ? state.assignments.length
                  : state.company.mentors.length,
          }))}
          value={tab}
        />
      </Enter>

      {/* -------------------------------------------------------- requests */}
      {tab === "requests" ? (
        open.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {open.map((request, i) => {
              const team = findTeam(request.teamId);
              const faculty = facultyOf(team?.facultyId);
              const challenge = state.challenges.find((c) => c.id === request.challengeId);
              const available = state.company.mentors.filter((m) =>
                m.roles.some((r) => request.roles.includes(r)),
              );

              return (
                <Enter index={i} key={request.id}>
                  <Card className="flex h-full flex-col p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="label-caps text-ink-faint">
                          {universityName(request.universityId)} · {request.stage} stage
                        </p>
                        <h2 className="headline-md mt-0.5 text-balance text-ink">
                          {team?.name ?? "Student team"}
                        </h2>
                        {challenge ? (
                          <Link
                            className="mt-1 inline-flex items-center gap-1 text-sm text-navy hover:underline"
                            href={`/industry/challenges/${challenge.id}`}
                          >
                            {challenge.title}
                            <Icon name="arrow-up-right" size={13} />
                          </Link>
                        ) : null}
                      </div>
                      <Badge dense icon="clock" tone="neutral">
                        asked {relative(request.askedAt)}
                      </Badge>
                    </div>

                    {/* What they are stuck on, in their words. This is the part
                        that lets an engineer know whether they are the right
                        engineer. */}
                    <p className="mt-4 rounded-md bg-card-muted p-4 text-sm text-ink italic">
                      &ldquo;{request.need}&rdquo;
                    </p>

                    <dl className="mt-4 grid grid-cols-3 gap-3">
                      <Cell label="Roles wanted" value={String(request.roles.length)} />
                      <Cell label="Hours a month" value={String(request.hoursPerMonth)} />
                      <Cell label="Team size" value={String(team?.memberCount ?? 0)} />
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {request.roles.map((r) => (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-tint-amber px-2.5 py-1 text-xs font-semibold text-on-tint-amber"
                          key={r}
                        >
                          <Icon name="user-plus" size={11} />
                          {r}
                        </span>
                      ))}
                    </div>

                    {faculty ? (
                      <p className="mt-3 text-xs text-ink-muted">
                        Faculty mentor: <span className="font-semibold text-ink">{faculty.name}</span>,{" "}
                        {faculty.designation}
                      </p>
                    ) : null}

                    <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-line pt-4">
                      <span className="text-xs text-ink-muted">
                        {available.length
                          ? `${available.length} of your mentors cover these roles`
                          : "No registered mentor covers these roles"}
                      </span>
                      <Button
                        className="ml-auto"
                        disabled={!can("mentorship.assign") || !available.length}
                        icon="user-plus"
                        onClick={() => setOffering(request)}
                        size="sm"
                      >
                        Become a mentor
                      </Button>
                    </div>
                  </Card>
                </Enter>
              );
            })}
          </div>
        ) : (
          <Card>
            <EmptyState
              icon="users"
              message="Every team you work with has the mentors they asked for. New requests appear here as universities post them."
              title="No open requests"
              tone="success"
            />
          </Card>
        )
      ) : null}

      {/* ----------------------------------------------------- assignments */}
      {tab === "assignments" ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {state.assignments.map((a, i) => {
            const mentor = state.company.mentors.find((m) => m.id === a.mentorId);
            const team = findTeam(a.teamId);
            const project = state.projects.find((p) => p.id === a.projectId);
            const next = a.sessions.find((s) => !s.done);

            return (
              <Enter index={i} key={a.id}>
                <Card className="flex h-full flex-col p-6">
                  <div className="flex items-start gap-3">
                    <Avatar name={mentor?.name ?? "Mentor"} size={44} />
                    <div className="min-w-0 flex-1">
                      <h2 className="font-bold text-ink">{mentor?.name}</h2>
                      <p className="text-xs text-ink-muted">{mentor?.title}</p>
                    </div>
                    <Badge dense tone="info">
                      {a.roles.join(", ")}
                    </Badge>
                  </div>

                  <div className="mt-4 rounded-md bg-card-muted p-4">
                    <p className="text-sm font-bold text-ink">{team?.name}</p>
                    <p className="text-xs text-ink-muted">
                      {universityName(team?.universityId)} · mentoring since {relative(a.since)}
                    </p>
                    {project ? (
                      <Link
                        className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-navy hover:underline"
                        href={`/industry/projects/${project.id}`}
                      >
                        {project.id} — {project.title}
                        <Icon name="arrow-up-right" size={12} />
                      </Link>
                    ) : null}
                  </div>

                  <dl className="mt-4 grid grid-cols-4 gap-3">
                    <Cell label="Sessions" value={`${a.sessions.filter((s) => s.done).length}`} />
                    <Cell label="Documents" value={String(a.documentsShared)} />
                    <Cell label="Questions" value={String(a.openQuestions.filter((q) => !q.answered).length)} />
                    <Cell label="Feedback" value={String(a.feedbackRequests)} />
                  </dl>

                  {next ? (
                    <p className="mt-4 flex items-center gap-2 rounded-md bg-primary-fixed p-3 text-sm text-on-primary-fixed-variant">
                      <Icon className="shrink-0" name="calendar" size={15} />
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">Next: {next.topic}</span>
                        <span className="block text-xs opacity-80">
                          {until(next.at)} · {next.minutes} minutes
                        </span>
                      </span>
                    </p>
                  ) : null}

                  {a.openQuestions.filter((q) => !q.answered).length ? (
                    <div className="mt-4 border-t border-line pt-4">
                      <p className="label-caps text-ink-faint">Waiting on an answer</p>
                      <ul className="mt-2 flex flex-col gap-2">
                        {a.openQuestions
                          .filter((q) => !q.answered)
                          .map((q) => (
                            <li className="rounded-md bg-warning-tint p-3" key={q.id}>
                              <p className="text-sm text-on-warning-tint">{q.question}</p>
                              <p className="mt-1 text-xs text-on-warning-tint/80">
                                {q.from} · {relative(q.at)}
                              </p>
                            </li>
                          ))}
                      </ul>
                    </div>
                  ) : null}
                </Card>
              </Enter>
            );
          })}
        </div>
      ) : null}

      {/* -------------------------------------------------------- roster */}
      {tab === "roster" ? (
        <Enter index={4}>
          <Card className="p-6">
            <h2 className="headline-md text-ink">Registered employee mentors</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Declared hours and current load. The matching rule reads this and nothing else — an
              engineer who has not registered here will never be proposed to a team.
            </p>
            <ul className="mt-5 flex flex-col gap-3">
              {state.company.mentors.map((m) => {
                const mine = state.assignments.filter((a) => a.mentorId === m.id);
                const used = mine.length;
                return (
                  <li key={m.id}>
                    <div className="flex flex-wrap items-center gap-4 rounded-md bg-card-muted p-4">
                      <Avatar name={m.name} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-ink">{m.name}</p>
                        <p className="text-xs text-ink-muted">
                          {m.title} · {m.unit}
                        </p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {m.roles.map((r) => (
                            <span
                              className="rounded-full bg-container px-2 py-0.5 text-[11px] font-semibold text-ink-muted"
                              key={r}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="w-40 shrink-0">
                        <div className="flex items-baseline justify-between text-xs">
                          <span className="text-ink-muted">Teams</span>
                          <span className="font-bold text-ink tabular-nums">{used} / 2</span>
                        </div>
                        <Progress
                          className="mt-1"
                          label={`${m.name} load`}
                          size="sm"
                          tone={used >= 2 ? "community" : "impact"}
                          value={(used / 2) * 100}
                        />
                        <p className="mt-1 text-[11px] text-ink-muted">
                          {m.hoursPerMonth} h/month declared · {m.languages.join(", ")}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        </Enter>
      ) : null}

      <OfferModal onClose={() => setOffering(null)} request={offering} />
    </div>
  );
}

/**
 * The offer dialog.
 *
 * Shows the mentors who actually cover the requested roles and how loaded each
 * one already is, because the failure mode here is volunteering the same
 * enthusiastic principal engineer onto a fourth team.
 */
function OfferModal({
  request,
  onClose,
}: {
  request: MentorshipRequest | null;
  onClose: () => void;
}) {
  const { state, dispatch } = useIndustry();
  const [picked, setPicked] = useState<string[]>([]);

  if (!request) return null;
  const team = findTeam(request.teamId);
  const candidates = state.company.mentors.filter((m) =>
    m.roles.some((r) => request.roles.includes(r)),
  );

  return (
    <Modal
      footer={
        <>
          <Button onClick={onClose} tone="outline">
            Cancel
          </Button>
          <Button
            disabled={!picked.length}
            icon="check"
            onClick={() => {
              dispatch({ type: "mentorship/offer", requestId: request.id, mentorIds: picked });
              setPicked([]);
              onClose();
            }}
          >
            Assign {picked.length || ""} mentor{picked.length === 1 ? "" : "s"}
          </Button>
        </>
      }
      onClose={onClose}
      open={Boolean(request)}
      subtitle={`${team?.name} · ${universityName(request.universityId)}`}
      title="Offer a mentor"
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-md bg-card-muted p-4 text-sm text-ink italic">
          &ldquo;{request.need}&rdquo;
        </p>

        <div>
          <p className="label-caps mb-2 text-ink-faint">
            Mentors covering {request.roles.join(" and ")}
          </p>
          <ul className="flex flex-col gap-2">
            {candidates.map((m) => {
              const load = state.assignments.filter((a) => a.mentorId === m.id).length;
              const selected = picked.includes(m.id);
              return (
                <li key={m.id}>
                  <button
                    aria-pressed={selected}
                    className={cx(
                      "flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors",
                      selected ? "bg-primary text-white" : "bg-card-muted hover:bg-container",
                    )}
                    onClick={() =>
                      setPicked((prev) =>
                        prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id],
                      )
                    }
                    type="button"
                  >
                    <Avatar name={m.name} size={38} tone={selected ? "ink" : "navy"} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">{m.name}</span>
                      <span className={cx("block truncate text-xs", selected ? "text-white/72" : "text-ink-muted")}>
                        {m.title} · {m.roles.join(", ")}
                      </span>
                    </span>
                    <span className={cx("shrink-0 text-xs font-semibold", selected ? "text-white/80" : load >= 2 ? "text-danger" : "text-ink-muted")}>
                      {load >= 2 ? "at capacity" : `${load} team${load === 1 ? "" : "s"}`}
                    </span>
                    {selected ? <Icon className="shrink-0" name="check" size={17} /> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <p className="rounded-md bg-container p-3 text-xs text-ink-muted">
          The mentor and the faculty supervisor are both notified. Sessions are scheduled in the
          project thread, and the university sees the commitment as {request.hoursPerMonth} hours a
          month.
        </p>
      </div>
    </Modal>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "warning" }) {
  return (
    <Card className={cx("p-5", tone === "warning" && "ring-2 ring-warning/30")}>
      <p className="label-caps text-ink-faint">{label}</p>
      <p className="stat-number mt-1 text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>
    </Card>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label-caps text-ink-faint">{label}</dt>
      <dd className="text-lg font-bold text-ink tabular-nums">{value}</dd>
    </div>
  );
}
