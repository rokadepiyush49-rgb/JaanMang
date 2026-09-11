"use client";

/**
 * The industry portal's operational state.
 *
 * Every action a partner can take — express interest, commit funding, offer a
 * mentor, approve a milestone, ask for changes, post to a project thread, edit
 * the profile that drives matching — lives here rather than inside a screen, so
 * the same action taken from a card, a dossier or an alert produces exactly the
 * same state change and exactly the same audit entry.
 *
 * It is a client store because the backend does not exist yet. The reducer is
 * deliberately shaped like a set of API mutations: when `/backend/api` lands,
 * each case becomes a request and the reducer keeps only the optimistic update.
 *
 * The one piece of real behaviour worth pointing at: committing funding to a
 * challenge that has a university team but no project *opens the project* —
 * milestones, tranches, audit trail and a mentorship offer. That is the moment
 * the whole product is about, and it is a state transition rather than a
 * navigation.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { matchContext, portfolioTotals, scoreAll } from "./selectors";
import { seed } from "./service";
import type {
  AuditEntry,
  Actor,
  Challenge,
  CompanyProfile,
  Contribution,
  FundingCommitment,
  IndustryAlert,
  IndustryAutomation,
  IndustryProject,
  MentorAssignment,
  MentorshipRequest,
  MessageThread,
  Milestone,
  SupportKind,
} from "./types";

/* =============================================================== rbac === */

export type IndustryPermission =
  | "funding.commit"
  | "funding.approve"
  | "mentorship.assign"
  | "milestone.approve"
  | "profile.manage"
  | "report.generate"
  | "messages.post";

export type IndustryUser = {
  id: string;
  name: string;
  title: string;
  permissions: IndustryPermission[];
};

/**
 * Who is signed in, and what they may do.
 *
 * A partner organisation is not one person with one set of rights: the engineer
 * mentoring a student team should be able to approve a technical milestone and
 * should not be able to commit ₹6 L of CSR budget. Switching user here changes
 * which buttons exist, the same way switching jurisdiction does in the
 * government workspace.
 */
export const USERS: IndustryUser[] = [
  {
    id: "u-csr",
    name: "Rakesh Sinha",
    title: "Head of CSR & Sustainability",
    permissions: [
      "funding.commit",
      "mentorship.assign",
      "milestone.approve",
      "profile.manage",
      "report.generate",
      "messages.post",
    ],
  },
  {
    id: "u-eng",
    name: "Ananya Sengupta",
    title: "Principal Engineer, Telemetry",
    permissions: ["mentorship.assign", "milestone.approve", "messages.post"],
  },
  {
    id: "u-fin",
    name: "Meenal D'Souza",
    title: "Finance Controller",
    permissions: ["funding.approve", "report.generate"],
  },
];

/* ============================================================== state === */

export type GeneratedReport = {
  id: string;
  financialYear: string;
  generatedAt: string;
  projects: number;
  note: string;
};

type State = {
  user: IndustryUser;
  company: CompanyProfile;
  challenges: Challenge[];
  projects: IndustryProject[];
  commitments: FundingCommitment[];
  requests: MentorshipRequest[];
  assignments: MentorAssignment[];
  automations: IndustryAutomation[];
  alerts: IndustryAlert[];
  threads: MessageThread[];
  reports: GeneratedReport[];
  /** Challenges the company has said it is interested in but not yet funded. */
  interests: string[];
};

const initialState: State = {
  user: USERS[0],
  company: seed.company,
  challenges: seed.challenges,
  projects: seed.projects,
  commitments: [],
  requests: seed.requests,
  assignments: seed.assignments,
  automations: seed.automations,
  alerts: seed.alerts,
  threads: seed.threads,
  reports: [],
  interests: [],
};

/* ============================================================ actions === */

export type Action =
  | { type: "user/switch"; userId: string }
  | { type: "interest/express"; challengeId: string; note?: string }
  | { type: "interest/withdraw"; challengeId: string }
  | {
      type: "funding/commit";
      challengeId: string;
      amount: number;
      alsoOffering: SupportKind[];
      note?: string;
    }
  | { type: "funding/withdraw"; commitmentId: string }
  | { type: "mentorship/offer"; requestId: string; mentorIds: string[] }
  | { type: "mentorship/decline"; requestId: string; reason: string }
  | { type: "milestone/approve"; projectId: string; milestoneId: string; note?: string }
  | { type: "milestone/changes"; projectId: string; milestoneId: string; note: string }
  | { type: "message/send"; threadId: string; body: string }
  | { type: "thread/read"; threadId: string }
  | { type: "automation/toggle"; id: string }
  | { type: "alert/read"; id: string }
  | { type: "alert/readAll" }
  | { type: "profile/update"; patch: Partial<CompanyProfile> }
  | { type: "report/generate"; financialYear: string };

/* ============================================================ helpers === */

let seq = 0;
function entry(
  actor: Actor,
  action: string,
  opts: { detail?: string; actorName?: string; automated?: boolean } = {},
): AuditEntry {
  seq += 1;
  return {
    id: `live-${seq}`,
    at: new Date().toISOString(),
    actor,
    actorName: opts.actorName,
    action,
    detail: opts.detail,
    automated: opts.automated ?? (actor === "AI" || actor === "System"),
  };
}

/**
 * The milestone plan a new project opens with.
 *
 * Five stages, with the tranche schedule attached, because money that is not
 * tied to a deliverable is money nobody has to earn. The split front-loads
 * little: 20% on a baseline anyone can produce, and 30% held until a pilot has
 * actually run.
 */
function openingPlan(challenge: Challenge, amount: number): Milestone[] {
  const day = 86400000;
  const now = Date.now();
  const span = challenge.timelineDays || 120;
  const at = (fraction: number) => new Date(now + span * fraction * day).toISOString();
  const share = (pct: number) => Math.round((amount * pct) / 100);

  return [
    {
      id: "m-1",
      label: "Research & baseline",
      detail: "Establish what the situation actually is before anything is built, so the impact claim at the end has something to be measured against.",
      status: "active",
      percent: 0,
      dueAt: at(0.15),
      deliverables: [],
      awaitingReview: false,
      trancheAmount: share(20),
    },
    {
      id: "m-2",
      label: "Prototype",
      detail: "The university team builds and demonstrates a working version on the bench.",
      status: "pending",
      percent: 0,
      dueAt: at(0.4),
      deliverables: [],
      awaitingReview: false,
      trancheAmount: share(25),
    },
    {
      id: "m-3",
      label: "Field testing",
      detail: "Run it where it has to work, and report what breaks.",
      status: "pending",
      percent: 0,
      dueAt: at(0.65),
      deliverables: [],
      awaitingReview: false,
      trancheAmount: share(25),
    },
    {
      id: "m-4",
      label: "Pilot",
      detail: "A real deployment at limited scale, with the government department operating it.",
      status: "pending",
      percent: 0,
      dueAt: at(0.85),
      deliverables: [],
      awaitingReview: false,
      trancheAmount: share(20),
    },
    {
      id: "m-5",
      label: "Handover & verification",
      detail: "Ownership passes to the public body, and citizens confirm the problem is fixed.",
      status: "pending",
      percent: 0,
      dueAt: at(1),
      deliverables: [],
      awaitingReview: false,
      trancheAmount: amount - share(20) - share(25) - share(25) - share(20),
    },
  ];
}

function patchChallenge(
  state: State,
  id: string,
  patch: (c: Challenge) => Partial<Challenge>,
): Challenge[] {
  return state.challenges.map((c) => (c.id === id ? { ...c, ...patch(c) } : c));
}

function nextProjectId(projects: IndustryProject[]) {
  const highest = projects
    .map((p) => Number.parseInt(p.id.replace(/\D/g, ""), 10))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 100);
  return `CDP-${highest + 1}`;
}

/* ============================================================ reducer === */

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "user/switch": {
      const user = USERS.find((u) => u.id === action.userId);
      return user ? { ...state, user } : state;
    }

    /* -- discovery -------------------------------------------------------- */

    case "interest/express": {
      if (state.interests.includes(action.challengeId)) return state;
      return {
        ...state,
        interests: [...state.interests, action.challengeId],
        alerts: [
          {
            id: `live-int-${action.challengeId}`,
            kind: "government_approval",
            title: "Interest registered with the district",
            detail: `The department owning ${action.challengeId} has been notified. They typically respond within two working days with the evidence pack and a site visit window.`,
            at: new Date().toISOString(),
            read: false,
            challengeId: action.challengeId,
            action: { label: "Open challenge", href: `/industry/challenges/${action.challengeId}` },
          },
          ...state.alerts,
        ],
      };
    }

    case "interest/withdraw":
      return { ...state, interests: state.interests.filter((id) => id !== action.challengeId) };

    /* -- funding ---------------------------------------------------------- */

    /**
     * Commit funding.
     *
     * Three things happen at once and they are one transaction on purpose: the
     * money joins the challenge's ledger, a commitment record is created for
     * the CSR book, and — if a university team is already attached and no
     * project exists — the project opens with its milestone plan. A partner who
     * has to go and separately "start a project" after committing has been
     * given a form, not a workflow.
     */
    case "funding/commit": {
      const challenge = state.challenges.find((c) => c.id === action.challengeId);
      if (!challenge) return state;

      const at = new Date().toISOString();
      const contribution: Contribution = {
        id: `live-${challenge.id}-self`,
        party: state.company.name,
        kind: "industry",
        amount: action.amount,
        status: "committed",
        at,
        isSelf: true,
      };

      const commitment: FundingCommitment = {
        id: `FC-${challenge.id}`,
        challengeId: challenge.id,
        amount: action.amount,
        /* Awaiting the government's countersignature — not "paid". There is no
           payment rail here and the record must not pretend otherwise. */
        status: "awaiting_government",
        alsoOffering: action.alsoOffering,
        createdAt: at,
        tranches: openingPlan(challenge, action.amount).map((m) => ({
          label: m.label,
          amount: m.trancheAmount ?? 0,
          releasedOn: m.dueAt,
          released: false,
        })),
        note: action.note,
      };

      const committedAfter =
        challenge.contributions
          .filter((c) => c.status !== "proposed")
          .reduce((s, c) => s + c.amount, 0) + action.amount;

      const challenges = patchChallenge(state, challenge.id, (c) => ({
        contributions: [...c.contributions, contribution],
        fundingRequired: Math.max(0, c.estimatedCost - committedAfter),
        status: committedAfter >= c.estimatedCost ? "fully_funded" : "partially_funded",
      }));

      /* Open the project only when there is a team to do the work. A challenge
         with no university attached stays a funded challenge until the district
         assigns one. */
      const canOpen = Boolean(challenge.universityId && challenge.teamId && !challenge.projectId);
      if (!canOpen) {
        return { ...state, challenges, commitments: [...state.commitments, commitment] };
      }

      const projectId = nextProjectId(state.projects);
      const project: IndustryProject = {
        id: projectId,
        challengeId: challenge.id,
        title: challenge.title,
        stage: "funded",
        progress: 5,
        universityId: challenge.universityId!,
        teamId: challenge.teamId!,
        facultyId: seed.teams.find((t) => t.id === challenge.teamId)?.facultyId ?? "",
        governmentBody: `${challenge.department}, ${challenge.block}`,
        governmentRole: "Validates the problem, countersigns the commitment and accepts the handover",
        startedAt: at,
        expectedCompletion: new Date(Date.now() + challenge.timelineDays * 86400000).toISOString(),
        investment: { committed: action.amount, disbursed: 0 },
        coFunders: [...challenge.contributions, contribution],
        peopleImpacted: challenge.affected,
        villages: challenge.villages.length,
        clustersClosed: 0,
        providing: ["fund", ...action.alsoOffering.filter((k) => k !== "fund")],
        sdgs: challenge.sdgs,
        milestones: openingPlan(challenge, action.amount),
        documents: [],
        impact: challenge.expectedOutcomes.map((o) => ({
          label: o.label,
          value: 0,
          unit: "target",
          method: o.method,
        })),
        audit: [
          entry("Industry", "Funding committed", {
            actorName: state.company.name,
            detail: `₹${(action.amount / 100000).toFixed(2)} L across ${openingPlan(challenge, action.amount).length} milestone tranches`,
          }),
          entry("System", "Project opened", {
            detail: `${challenge.title} — awaiting government countersignature`,
          }),
          entry("System", "University team notified", {
            detail: `${seed.teams.find((t) => t.id === challenge.teamId)?.name ?? "Team"} and their faculty mentor have been told a partner is in`,
          }),
        ],
      };

      /* The mentorship offer, made at the moment it is most likely to be taken:
         straight after the money, while the partner is still in the flow. */
      const request = state.requests.find((r) => r.challengeId === challenge.id);
      const alerts: IndustryAlert[] = [
        {
          id: `live-mentor-${challenge.id}`,
          kind: "mentor_request",
          title: request
            ? `${seed.teams.find((t) => t.id === request.teamId)?.name} would also like a mentor`
            : "Would you also like to mentor the team?",
          detail: request
            ? request.need
            : "Funding gets the build started. A named engineer in the team's design reviews is what tends to get it finished.",
          at,
          read: false,
          challengeId: challenge.id,
          action: { label: "Offer a mentor", href: "/industry/mentorship" },
        },
        ...state.alerts,
      ];

      return {
        ...state,
        challenges: patchChallenge({ ...state, challenges }, challenge.id, () => ({
          projectId,
          status: committedAfter >= challenge.estimatedCost ? "in_delivery" : "partially_funded",
        })),
        projects: [project, ...state.projects],
        commitments: [...state.commitments, commitment],
        alerts,
      };
    }

    case "funding/withdraw": {
      const commitment = state.commitments.find((c) => c.id === action.commitmentId);
      if (!commitment || commitment.status === "committed" || commitment.status === "disbursing") {
        /* A countersigned commitment is not something a screen can undo. */
        return state;
      }
      return {
        ...state,
        commitments: state.commitments.filter((c) => c.id !== action.commitmentId),
        challenges: patchChallenge(state, commitment.challengeId, (c) => ({
          contributions: c.contributions.filter((x) => x.id !== `live-${c.id}-self`),
          fundingRequired: c.fundingRequired + commitment.amount,
        })),
      };
    }

    /* -- mentorship ------------------------------------------------------- */

    case "mentorship/offer": {
      const request = state.requests.find((r) => r.id === action.requestId);
      if (!request) return state;
      const at = new Date().toISOString();

      const created: MentorAssignment[] = action.mentorIds.map((mentorId, i) => ({
        id: `live-ma-${request.id}-${mentorId}`,
        requestId: request.id,
        mentorId,
        teamId: request.teamId,
        projectId: request.projectId ?? "",
        roles: request.roles.slice(i, i + 1).length ? [request.roles[i] ?? request.roles[0]] : request.roles,
        since: at,
        sessions: [],
        openQuestions: [],
        documentsShared: 0,
        feedbackRequests: 0,
      }));

      const project = state.projects.find(
        (p) => p.id === request.projectId || p.challengeId === request.challengeId,
      );

      return {
        ...state,
        assignments: [...state.assignments, ...created],
        requests: state.requests.filter((r) => r.id !== request.id),
        projects: project
          ? state.projects.map((p) =>
              p.id === project.id
                ? {
                    ...p,
                    providing: p.providing.includes("mentor") ? p.providing : [...p.providing, "mentor"],
                    audit: [
                      ...p.audit,
                      entry("Industry", "Mentors assigned", {
                        actorName: state.company.name,
                        detail: action.mentorIds
                          .map((id) => state.company.mentors.find((m) => m.id === id)?.name ?? id)
                          .join(", "),
                      }),
                    ],
                  }
                : p,
            )
          : state.projects,
      };
    }

    case "mentorship/decline":
      return {
        ...state,
        requests: state.requests.map((r) =>
          r.id === action.requestId ? { ...r, need: `${r.need}\n\nDeclined: ${action.reason}` } : r,
        ),
      };

    /* -- delivery --------------------------------------------------------- */

    case "milestone/approve":
    case "milestone/changes": {
      const approving = action.type === "milestone/approve";
      return {
        ...state,
        projects: state.projects.map((p) => {
          if (p.id !== action.projectId) return p;
          const milestones = p.milestones.map((m) =>
            m.id === action.milestoneId
              ? {
                  ...m,
                  status: (approving ? "complete" : "changes_requested") as Milestone["status"],
                  percent: approving ? 100 : m.percent,
                  completedAt: approving ? new Date().toISOString() : m.completedAt,
                  awaitingReview: false,
                  reviewedBy: `${state.user.name}, ${state.company.name}`,
                  reviewNote: action.note,
                }
              : m,
          );
          const done = milestones.filter((m) => m.status === "complete").length;
          const milestone = p.milestones.find((m) => m.id === action.milestoneId);
          return {
            ...p,
            milestones,
            progress: Math.round((done / milestones.length) * 100),
            /* Approving a milestone releases its tranche. That is the whole
               reason the review is not a formality. */
            investment: approving
              ? {
                  ...p.investment,
                  disbursed: Math.min(
                    p.investment.committed,
                    p.investment.disbursed + (milestone?.trancheAmount ?? 0),
                  ),
                }
              : p.investment,
            audit: [
              ...p.audit,
              entry("Industry", approving ? `Milestone approved — ${milestone?.label}` : `Changes requested — ${milestone?.label}`, {
                actorName: `${state.user.name}, ${state.company.name}`,
                detail: approving
                  ? `₹${(((milestone?.trancheAmount ?? 0)) / 100000).toFixed(2)} L tranche released`
                  : action.note,
              }),
            ],
          };
        }),
      };
    }

    /* -- collaboration ---------------------------------------------------- */

    case "message/send": {
      const at = new Date().toISOString();
      return {
        ...state,
        threads: state.threads.map((t) =>
          t.id === action.threadId
            ? {
                ...t,
                updatedAt: at,
                unread: 0,
                messages: [
                  ...t.messages,
                  {
                    id: `live-msg-${t.messages.length + 1}`,
                    threadId: t.id,
                    authorId: "self",
                    at,
                    body: action.body,
                  },
                ],
              }
            : t,
        ),
      };
    }

    case "thread/read":
      return {
        ...state,
        threads: state.threads.map((t) => (t.id === action.threadId ? { ...t, unread: 0 } : t)),
      };

    /* -- automation & alerts ---------------------------------------------- */

    case "automation/toggle":
      return {
        ...state,
        automations: state.automations.map((a) =>
          a.id === action.id
            ? { ...a, enabled: !a.enabled, status: a.enabled ? "paused" : "healthy" }
            : a,
        ),
      };

    case "alert/read":
      return {
        ...state,
        alerts: state.alerts.map((a) => (a.id === action.id ? { ...a, read: true } : a)),
      };

    case "alert/readAll":
      return { ...state, alerts: state.alerts.map((a) => ({ ...a, read: true })) };

    /* -- profile & reporting ---------------------------------------------- */

    /**
     * Editing the profile re-scores every challenge on the next render, because
     * the match engine reads this object rather than a cached score. That is
     * the point of the settings screen: it is a control on discovery, not a
     * form that stores preferences nobody acts on.
     */
    case "profile/update":
      return { ...state, company: { ...state.company, ...action.patch } };

    case "report/generate":
      return {
        ...state,
        reports: [
          {
            id: `RPT-${state.reports.length + 1}`,
            financialYear: action.financialYear,
            generatedAt: new Date().toISOString(),
            projects: state.projects.length,
            note: "Assembled from verified project data. Export renderer not yet implemented.",
          },
          ...state.reports,
        ],
      };

    default:
      return state;
  }
}

/* ============================================================ context === */

type IndustryContext = {
  state: State;
  dispatch: React.Dispatch<Action>;
  can: (permission: IndustryPermission) => boolean;
  /** Every challenge with its match reading, computed once per state change. */
  scored: ReturnType<typeof scoreAll>;
  totals: ReturnType<typeof portfolioTotals>;
};

const Ctx = createContext<IndustryContext | null>(null);

export function IndustryProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const context = useMemo(
    () => matchContext(state.projects, state.assignments),
    [state.projects, state.assignments],
  );

  const scored = useMemo(
    () => scoreAll(state.challenges, state.company, context),
    [state.challenges, state.company, context],
  );

  const totals = useMemo(() => portfolioTotals(state.projects), [state.projects]);

  const can = useCallback(
    (permission: IndustryPermission) => state.user.permissions.includes(permission),
    [state.user],
  );

  const value = useMemo(
    () => ({ state, dispatch, can, scored, totals }),
    [state, can, scored, totals],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIndustry() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useIndustry must be used inside <IndustryProvider>");
  return ctx;
}

/** One challenge with its match reading, or undefined if it is not visible. */
export function useChallenge(id: string) {
  const { scored } = useIndustry();
  return scored.find((s) => s.challenge.id === id);
}

export function useProject(id: string) {
  const { state } = useIndustry();
  return state.projects.find((p) => p.id === id);
}

export { seed as industrySeed };
