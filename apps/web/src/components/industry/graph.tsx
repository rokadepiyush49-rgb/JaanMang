"use client";

/**
 * The collaboration graph — the portal's signature figure.
 *
 * Most partnership diagrams draw a ring of logos and call it an ecosystem,
 * which tells a reader nothing they did not already assume. This one is a
 * swimlane: four parties down the side, five stages across the top, and a
 * marker wherever a party actually does something. What it makes visible is
 * *when* each contribution lands — that the government's work is front-loaded
 * and back-loaded, that industry is present at every stage rather than only at
 * the cheque, and that citizens appear twice: once to report the problem and
 * once to confirm it was fixed.
 *
 * It is drawn from the challenge and, where one exists, the project — so it is
 * a reading of a real record rather than an illustration. The same content is
 * available as a list to screen readers, and the figure scrolls horizontally
 * inside its own container rather than stretching the page.
 */

import { Icon, type IconName } from "@/components/icon";
import { cx } from "@/components/ui";
import { rupees } from "@/lib/industry/format";
import { facultyOf, team as findTeam, universityName } from "@/lib/industry/selectors";
import type { Challenge, IndustryProject } from "@/lib/industry/types";

type LaneKey = "citizen" | "government" | "university" | "industry";

type Cell = { title: string; detail?: string; dim?: boolean };

type Lane = {
  key: LaneKey;
  label: string;
  icon: IconName;
  /** Wash and ink, taken from the tile tints so the lanes read as a set. */
  fill: string;
  stroke: string;
  ink: string;
  cells: (Cell | null)[];
};

const STAGES = ["Problem", "Prototype", "Pilot", "Deployment", "Impact"];

/* Geometry. One viewBox, scrolled rather than scaled on a narrow screen, so the
   type never shrinks below its legible size. */
const W = 980;
const H = 372;
const COL_X = [128, 318, 508, 698, 888];
const LANE_Y = [92, 164, 236, 308];
const PILL_W = 168;
const PILL_H = 50;

export function CollaborationGraph({
  challenge,
  project,
  className,
}: {
  challenge: Challenge;
  project?: IndustryProject;
  className?: string;
}) {
  const team = findTeam(project?.teamId ?? challenge.teamId);
  const faculty = facultyOf(project?.facultyId ?? team?.facultyId);
  const uni = universityName(project?.universityId ?? challenge.universityId);
  const committed = project?.investment.committed ?? challenge.contributions.filter((c) => c.isSelf).reduce((s, c) => s + c.amount, 0);

  /* How far along the chain this record actually is. Everything past it is
     drawn dimmed — a plan, not a claim. */
  const reached = project
    ? { discovery: 0, team_formed: 0, funded: 0, research: 1, prototype: 1, testing: 1, pilot: 2, deployment: 3, impact: 4 }[project.stage]
    : 0;

  const lanes: Lane[] = [
    {
      key: "citizen",
      label: "Citizens",
      icon: "users",
      fill: "var(--color-tint-mint)",
      stroke: "var(--color-mint)",
      ink: "var(--color-on-tint-mint)",
      cells: [
        { title: `${challenge.reportCount} reports`, detail: `over ${challenge.durationDays} days` },
        null,
        project?.pilot ? { title: `${project.pilot.users.toLocaleString("en-IN")} users`, detail: `${project.pilot.adoption}% adoption` } : { title: "Pilot users", detail: "once the pilot runs" },
        null,
        { title: "Verification", detail: "confirm the fix" },
      ],
    },
    {
      key: "government",
      label: "Government",
      icon: "landmark",
      fill: "var(--color-tint-navy)",
      stroke: "var(--color-periwinkle)",
      ink: "var(--color-on-tint-navy)",
      cells: [
        { title: "Validated", detail: `priority ${challenge.priority} / 100` },
        { title: "Approvals", detail: challenge.department },
        { title: "Site access", detail: `${challenge.villages.length} villages` },
        { title: "Handover", detail: "takes ownership" },
        { title: "Publishes result", detail: "to the problem record" },
      ],
    },
    {
      key: "university",
      label: "University",
      icon: "graduation",
      fill: "var(--color-tint-orchid)",
      stroke: "var(--color-orchid)",
      ink: "var(--color-on-tint-orchid)",
      cells: [
        team ? { title: team.name, detail: `${team.memberCount} students · ${uni}` } : { title: "Team to be assigned", detail: "district allocates" },
        { title: "Builds it", detail: faculty ? faculty.name : "faculty supervised" },
        { title: "Field testing", detail: "runs the trial" },
        { title: "Trains operators", detail: "panchayat staff" },
        { title: "Measures", detail: "against the baseline" },
      ],
    },
    {
      key: "industry",
      label: "Industry — you",
      icon: "factory",
      fill: "var(--color-tint-amber)",
      stroke: "var(--color-amber)",
      ink: "var(--color-on-tint-amber)",
      cells: [
        { title: committed ? rupees(committed) : "Funding", detail: committed ? "committed" : "not yet committed", dim: !committed },
        { title: "Mentors", detail: "engineering reviews" },
        { title: "Field crew", detail: "installation & logistics" },
        { title: "Commissioning", detail: "and 12-month support" },
        { title: "CSR report", detail: "Schedule VII" },
      ],
    },
  ];

  return (
    <figure className={cx("m-0", className)}>
      <div className="-mx-1 overflow-x-auto px-1">
        <svg
          aria-hidden="true"
          className="w-full min-w-[860px]"
          viewBox={`0 0 ${W} ${H}`}
        >
          {/* Stage columns: a dashed spine each, so a reader can follow one
              stage down through all four parties. */}
          {COL_X.map((x, i) => (
            <g key={STAGES[i]}>
              <line
                stroke={i <= reached ? "var(--color-periwinkle)" : "var(--color-line)"}
                strokeDasharray="3 5"
                strokeWidth={i <= reached ? 1.5 : 1}
                x1={x}
                x2={x}
                y1={44}
                y2={H - 12}
              />
              <rect
                fill={i <= reached ? "var(--color-primary)" : "var(--color-container)"}
                height={26}
                rx={13}
                width={124}
                x={x - 62}
                y={12}
              />
              <text
                fill={i <= reached ? "#ffffff" : "var(--color-ink-muted)"}
                fontSize={12}
                fontWeight={700}
                textAnchor="middle"
                x={x}
                y={29}
              >
                {STAGES[i]}
              </text>
            </g>
          ))}

          {/* Lane rails and labels. */}
          {lanes.map((lane, li) => (
            <g key={lane.key}>
              <line
                stroke="var(--color-line)"
                strokeWidth={1}
                x1={16}
                x2={W - 16}
                y1={LANE_Y[li] + PILL_H / 2 + 11}
                y2={LANE_Y[li] + PILL_H / 2 + 11}
              />
              <text
                fill="var(--color-ink-faint)"
                fontSize={11}
                fontWeight={700}
                letterSpacing="0.06em"
                x={16}
                y={LANE_Y[li] - 6}
              >
                {lane.label.toUpperCase()}
              </text>
            </g>
          ))}

          {/* The markers themselves. */}
          {lanes.map((lane, li) =>
            lane.cells.map((cell, ci) => {
              if (!cell) return null;
              const x = COL_X[ci];
              const y = LANE_Y[li];
              const dim = cell.dim || ci > reached;
              return (
                <g key={`${lane.key}-${ci}`} opacity={dim ? 0.42 : 1}>
                  <rect
                    fill={lane.fill}
                    height={PILL_H}
                    rx={14}
                    stroke={lane.stroke}
                    strokeWidth={1}
                    width={PILL_W}
                    x={x - PILL_W / 2}
                    y={y - PILL_H / 2}
                  />
                  <text
                    fill={lane.ink}
                    fontSize={12.5}
                    fontWeight={700}
                    textAnchor="middle"
                    x={x}
                    y={y - 2}
                  >
                    {truncate(cell.title, 22)}
                  </text>
                  {cell.detail ? (
                    <text
                      fill={lane.ink}
                      fontSize={10.5}
                      opacity={0.78}
                      textAnchor="middle"
                      x={x}
                      y={y + 14}
                    >
                      {truncate(cell.detail, 26)}
                    </text>
                  ) : null}
                </g>
              );
            }),
          )}
        </svg>
      </div>

      {/* The same content as text. The diagram is a convenience, not the only
          way to read the record. */}
      <div className="sr-only">
        <p>
          Collaboration on {challenge.title}, by stage: {STAGES.join(", ")}.
        </p>
        {lanes.map((lane) => (
          <p key={lane.key}>
            {lane.label}:{" "}
            {lane.cells
              .map((cell, i) => (cell ? `${STAGES[i]} — ${cell.title}${cell.detail ? `, ${cell.detail}` : ""}` : null))
              .filter(Boolean)
              .join("; ")}
            .
          </p>
        ))}
      </div>

      <figcaption className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {lanes.map((lane) => (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted" key={lane.key}>
            <span
              className="size-3 rounded-full"
              style={{ backgroundColor: lane.fill, boxShadow: `inset 0 0 0 1px ${lane.stroke}` }}
            />
            <Icon name={lane.icon} size={13} />
            {lane.label}
          </span>
        ))}
        <span className="ml-auto text-xs text-ink-faint">
          Dimmed markers are planned, not yet delivered.
        </span>
      </figcaption>
    </figure>
  );
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
