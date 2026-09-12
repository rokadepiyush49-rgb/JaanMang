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
 * The reducer is now the optimistic half only: the state arrives from
 * `/api/backend/industry/*` on mount, and each action dispatches its change
 * immediately, calls the API and reconciles.
 *
 * Everything it holds about a citizen problem arrived already redacted. The
 * projection that decides what a partner may see runs on the server now, so
 * there is no `visibility.ts` on this side to bypass and nothing here that
 * could widen it.
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
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "@/lib/api/client";
import { matchContext, portfolioTotals, scoreAll } from "./selectors";
import { loadIndustryWorkspace, type ImpactDto } from "./service";
import type {
  Actor,
  AuditEntry,
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
  StudentTeam,
  SupportKind,
  University,
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
  /** The institution register and the teams on it, as the partner may see them. */
  universities: University[];
  teams: StudentTeam[];
  /** Impact computed server-side from delivered work. Null until hydrated. */
  impact: ImpactDto | null;
  /** The redaction policy the server enforces, published so a partner sees it. */
  redactions: { visible: string; hidden: string }[];
  /** Challenges the company has said it is interested in but not yet funded. */
  interests: string[];
  /**
   * False until the workspace has loaded. Every slice below starts empty, so
   * the shell holds a skeleton rather than rendering a company profile that is
   * not yet the signed-in company's.
   */
  hydrated: boolean;
};

/**
 * Everything empty, and `hydrated: false`.
 *
 * Deliberately not a partially-filled placeholder. This object is what the
 * portal renders in the window between mount and the workspace arriving, and a
 * placeholder company profile in that window is one a partner could read as
 * their own — including its CSR budget.
 */
const EMPTY_COMPANY = {
  id: "",
  name: "",
  legalName: "",
  sector: "",
  csrThemes: [],
  geographies: [],
  technologyDomains: [],
  capabilities: [],
  sdgPreferences: [],
  provenDomains: [],
  fundingRange: { min: 0, max: 0 },
  csrBudget: { financialYear: "", allocated: 0, preferredCeiling: 0 },
} as unknown as CompanyProfile;

const initialState: State = {
  user: USERS[0],
  company: EMPTY_COMPANY,
  challenges: [],
  projects: [],
  commitments: [],
  requests: [],
  assignments: [],
  automations: [],
  alerts: [],
  threads: [],
  reports: [],
  universities: [],
  teams: [],
  impact: null,
  redactions: [],
  interests: [],
  hydrated: false,
};

/* ============================================================ actions === */

export type Action =
  /** The workspace as the server holds it, on mount. */
  | {
      type: "hydrate";
      company: CompanyProfile;
      challenges: Challenge[];
      projects: IndustryProject[];
      requests: MentorshipRequest[];
      assignments: MentorAssignment[];
      alerts: IndustryAlert[];
      threads: MessageThread[];
      universities: University[];
      teams: StudentTeam[];
      impact: ImpactDto;
      redactions: { visible: string; hidden: string }[];
    }
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


/* ============================================================ reducer === */

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return {
        ...state,
        company: action.company,
        challenges: action.challenges,
        projects: action.projects,
        requests: action.requests,
        assignments: action.assignments,
        alerts: action.alerts,
        threads: action.threads,
        universities: action.universities,
        teams: action.teams,
        impact: action.impact,
        redactions: action.redactions,
        hydrated: true,
      };

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

      /*
       * The project is NOT opened here any more.
       *
       * This case used to synthesise an `IndustryProject` — milestones,
       * tranches, an audit trail, a team pulled out of the fixtures — the
       * moment a partner committed. That was right when there was no
       * government: somebody had to open the project and the only actor in the
       * room was the partner.
       *
       * There is a government now, and a partner's money does not open a
       * government project. `FundingService.commit` writes a proposal into the
       * officer's sponsorship queue; the project is created when somebody with
       * `funding.approve` accepts it, in one transaction with the budget
       * commitment and the public ledger entry. Opening one here would put a
       * project on the partner's screen that does not exist in the register
       * the officer is reading — which is precisely the class of divergence
       * this stage exists to remove.
       */
      const request = state.requests.find((r) => r.challengeId === challenge.id);
      const alerts: IndustryAlert[] = [
        {
          id: `live-mentor-${challenge.id}`,
          kind: "mentor_request",
          title: request ? "The team would also like a mentor" : "Would you also like to mentor the team?",
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
        challenges,
        commitments: [...state.commitments, commitment],
        interests: state.interests.filter((id) => id !== challenge.id),
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
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const workspace = await loadIndustryWorkspace();
        if (cancelled) return;
        dispatch({
          type: "hydrate",
          company: workspace.company,
          challenges: workspace.challenges,
          projects: workspace.projects,
          requests: workspace.requests,
          assignments: workspace.assignments,
          alerts: workspace.alerts,
          threads: workspace.threads,
          universities: workspace.universities,
          teams: workspace.teams,
          impact: workspace.impact,
          redactions: workspace.redactions,
        });
      } catch (error) {
        // A 401 has already sent the browser to /signin.
        if (!cancelled && !(error instanceof ApiError && error.status === 401)) {
          setLoadError(
            error instanceof ApiError ? error.message : "Could not load the portal.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const context = useMemo(
    () => matchContext(state.projects, state.assignments),
    [state.projects, state.assignments],
  );

  const scored = useMemo(
    () => scoreAll(state.challenges, state.company, context),
    [state.challenges, state.company, context],
  );

  const totals = useMemo(
    () => portfolioTotals(state.projects, state.teams),
    [state.projects, state.teams],
  );

  const can = useCallback(
    (permission: IndustryPermission) => state.user.permissions.includes(permission),
    [state.user],
  );

  const value = useMemo(
    () => ({ state, dispatch, can, scored, totals }),
    [state, can, scored, totals],
  );

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="headline-md text-ink">The portal could not load</p>
        <p className="text-sm text-ink-muted">{loadError}</p>
        <button
          className="rounded-pill bg-ink px-4 py-2 text-sm text-card"
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!state.hydrated) {
    return (
      <div className="mx-auto flex min-h-dvh items-center justify-center px-6">
        <div className="flex items-center gap-3 text-ink-muted">
          <span className="size-4 animate-spin rounded-full border-2 border-line border-t-ink" />
          Loading the portal…
        </div>
      </div>
    );
  }

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

