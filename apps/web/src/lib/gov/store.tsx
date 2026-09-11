"use client";

/**
 * The government workspace's operational state.
 *
 * Every workflow transition an officer can perform — validate, route, invite
 * industry, fall back to government funding, assign, progress, verify — lives
 * here rather than inside a screen, so the same action taken from a table row,
 * a detail page or an alert produces exactly the same state change and the same
 * audit entry.
 *
 * It is a client store because the backend does not exist yet. The reducer is
 * deliberately the shape of a set of API mutations: when `/backend/api` lands,
 * each case becomes a request and the reducer keeps only the optimistic update.
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
import { DEFAULT_WEIGHTS, rankProblems } from "./priority";
import { GovApi, asPermissions } from "./api";
import { can, scopeProblems } from "./rbac";
import { seed } from "./service";
import type {
  Automation,
  AuditEntry,
  Actor,
  GovAlert,
  GovUser,
  Officer,
  Permission,
  PriorityWeights,
  Problem,
  ProblemStatus,
  RankedProblem,
  Stage,
} from "./types";

/* =============================================================== state === */

type State = {
  user: GovUser;
  problems: Problem[];
  officers: Officer[];
  automations: Automation[];
  alerts: GovAlert[];
  /** Live weighting driving the ranking — the simulator edits this. */
  weights: PriorityWeights;
  /** The state's published weighting; the baseline rank movement is measured from. */
  publishedWeights: PriorityWeights;
  /**
   * The problem lifecycle is now server-backed: `problems` is loaded from
   * `/api/gov/problems` on mount and validate/reject/route persist. Officers,
   * automations and alerts still hydrate from the fixtures until their stages
   * land, so a screen that reads them keeps working unchanged.
   */
  hydrated: boolean;
};

const initialState: State = {
  user: seed.users[0],
  problems: [],
  officers: seed.officers,
  automations: seed.automations,
  alerts: seed.alerts,
  weights: DEFAULT_WEIGHTS,
  publishedWeights: DEFAULT_WEIGHTS,
  hydrated: false,
};

/* ============================================================= actions === */

type Action =
  | {
      type: "hydrate";
      problems: Problem[];
      user: GovUser;
      publishedWeights: PriorityWeights;
    }
  /** Replace one problem with the authoritative copy the server returned. */
  | { type: "problem/replace"; problem: Problem }
  | { type: "user/switch"; userId: string }
  | { type: "weights/set"; weights: PriorityWeights }
  | { type: "weights/reset" }
  | { type: "weights/publish" }
  | { type: "problem/validate"; id: string }
  | { type: "problem/reject"; id: string; reason: string }
  | { type: "problem/route"; id: string; departmentId: string; reason: string }
  | { type: "sponsorship/invite"; id: string }
  | { type: "sponsorship/approve"; id: string; sponsorId: string }
  | { type: "sponsorship/decline"; id: string; sponsorId: string; reason: string }
  | { type: "sponsorship/fallback"; id: string }
  | { type: "funding/approve"; id: string }
  | { type: "funding/reject"; id: string; reason: string }
  | { type: "officer/assign"; id: string; officerId: string }
  | { type: "project/progress"; id: string; progress: number }
  | { type: "project/complete"; id: string }
  | { type: "verification/request"; id: string }
  | { type: "verification/record"; id: string; confirmed: number; denied: number }
  | { type: "automation/toggle"; id: string }
  | { type: "alert/read"; id: string };

/* ============================================================ reducer === */

let auditSeq = 0;
function entry(
  actor: Actor,
  action: string,
  opts: { detail?: string; actorName?: string; automated?: boolean } = {},
): AuditEntry {
  auditSeq += 1;
  return {
    id: `live-${auditSeq}`,
    at: new Date().toISOString(),
    actor,
    actorName: opts.actorName,
    action,
    detail: opts.detail,
    automated: opts.automated ?? (actor === "AI" || actor === "System"),
  };
}

/** Apply `patch` to one problem and append its audit entries. */
function patchProblem(
  state: State,
  id: string,
  patch: (p: Problem, user: GovUser) => Partial<Problem>,
  entries: (p: Problem, user: GovUser) => AuditEntry[],
): State {
  return {
    ...state,
    problems: state.problems.map((p) => {
      if (p.id !== id) return p;
      const changes = patch(p, state.user);
      return {
        ...p,
        ...changes,
        updatedAt: new Date().toISOString(),
        audit: [...p.audit, ...entries(p, state.user)],
      };
    }),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "user/switch": {
      const user = seed.users.find((u) => u.id === action.userId) ?? state.user;
      return { ...state, user };
    }

    case "weights/set":
      return { ...state, weights: action.weights };

    case "weights/reset":
      return { ...state, weights: state.publishedWeights };

    case "weights/publish":
      return { ...state, publishedWeights: state.weights };

    /* -- validation ---------------------------------------------------- */
    case "problem/validate":
      return patchProblem(
        state,
        action.id,
        (p) => ({
          stage: "prioritised" as Stage,
          status: (p.sponsorship.eligible
            ? "awaiting_sponsorship"
            : "funding_required") as ProblemStatus,
        }),
        (p, user) => [
          entry("Officer", "Validated problem", { actorName: user.name }),
          entry(
            "System",
            p.sponsorship.eligible
              ? "Sponsorship eligibility confirmed"
              : "Marked for government funding — not CSR eligible",
            { detail: "Automatic on validation" },
          ),
        ],
      );

    case "problem/reject":
      return patchProblem(
        state,
        action.id,
        () => ({ status: "rejected" as ProblemStatus }),
        (_p, user) => [
          entry("Officer", "Rejected problem", { actorName: user.name, detail: action.reason }),
        ],
      );

    /* -- routing ------------------------------------------------------- */
    case "problem/route":
      return patchProblem(
        state,
        action.id,
        (p, user) => ({
          departmentId: action.departmentId,
          assignedOfficerId: undefined,
          ai: {
            ...p.ai,
            routingOverridden: {
              byOfficerId: user.id,
              departmentId: action.departmentId,
              reason: action.reason,
              at: new Date().toISOString(),
            },
          },
        }),
        (_p, user) => [
          entry("Officer", "Routing overridden", {
            actorName: user.name,
            detail: action.reason,
          }),
        ],
      );

    /* -- industry sponsorship ------------------------------------------ */
    case "sponsorship/invite":
      return patchProblem(
        state,
        action.id,
        (p) => ({
          stage: "sponsorship" as Stage,
          status: "awaiting_sponsorship" as ProblemStatus,
          sponsorship: {
            ...p.sponsorship,
            status: "invited",
            invitedAt: new Date().toISOString(),
            responseDueAt: new Date(Date.now() + 96 * 36e5).toISOString(),
            matches: p.sponsorship.matches.map((m) =>
              m.status === "matched" ? { ...m, status: "invited" as const } : m,
            ),
          },
        }),
        (p, user) => [
          entry("Officer", `Sponsorship invitations sent to ${p.sponsorship.matches.length} industries`, {
            actorName: user.name,
          }),
          entry("System", "Industry response SLA set to 96 hours", {
            detail: "Funding fallback armed on expiry",
          }),
        ],
      );

    case "sponsorship/approve":
      return patchProblem(
        state,
        action.id,
        (p) => {
          const match = p.sponsorship.matches.find((m) => m.sponsorId === action.sponsorId);
          const amount = match?.proposalAmount ?? p.estimatedCost;
          return {
            stage: "funded" as Stage,
            status: "in_progress" as ProblemStatus,
            sponsorship: {
              ...p.sponsorship,
              status: "approved",
              approvedSponsorId: action.sponsorId,
              approvedAmount: amount,
              matches: p.sponsorship.matches.map((m) =>
                m.sponsorId === action.sponsorId ? { ...m, status: "approved" as const } : m,
              ),
            },
            funding: { ...p.funding, status: "not_required" as const, note: "Fully sponsored by industry." },
          };
        },
        (_p, user) => [
          entry("Officer", "Accepted industry sponsorship", { actorName: user.name }),
          entry("System", "Problem moved to implementation queue", {}),
        ],
      );

    case "sponsorship/decline": {
      const next = patchProblem(
        state,
        action.id,
        (p) => ({
          sponsorship: {
            ...p.sponsorship,
            matches: p.sponsorship.matches.map((m) =>
              m.sponsorId === action.sponsorId
                ? { ...m, status: "declined" as const, respondedAt: new Date().toISOString(), note: action.reason }
                : m,
            ),
          },
        }),
        () => [entry("Industry", "Sponsorship declined", { detail: action.reason })],
      );
      /* If nobody is left in play, the fallback fires by itself — the officer
         never has to notice that industry ran out. */
      const p = next.problems.find((x) => x.id === action.id)!;
      const alive = p.sponsorship.matches.some((m) => m.status !== "declined");
      return alive ? next : reducer(next, { type: "sponsorship/fallback", id: action.id });
    }

    case "sponsorship/fallback":
      return patchProblem(
        state,
        action.id,
        (p) => ({
          stage: "funded" as Stage,
          status: "funding_required" as ProblemStatus,
          sponsorship: {
            ...p.sponsorship,
            status: "declined",
            failureReason:
              p.sponsorship.failureReason ??
              "No eligible sponsor accepted within the industry response window.",
          },
          funding: {
            ...p.funding,
            status: "recommended" as const,
            required: p.estimatedCost,
            fundable: p.funding.departmentBudgetAvailable >= p.estimatedCost,
            note: "Fallback triggered automatically when industry sponsorship failed.",
          },
        }),
        () => [
          entry("System", "Industry sponsorship marked failed", {}),
          entry("System", "Government funding workflow triggered", {
            detail: "Recommended source attached from the department's budget heads",
          }),
        ],
      );

    /* -- government funding -------------------------------------------- */
    case "funding/approve":
      return patchProblem(
        state,
        action.id,
        (p, user) => ({
          stage: "assigned" as Stage,
          status: "in_progress" as ProblemStatus,
          funding: {
            ...p.funding,
            status: "approved" as const,
            approvedAt: new Date().toISOString(),
            approvedBy: user.name,
          },
          project:
            p.project ??
            {
              id: `PRJ-${p.id.slice(2)}`,
              contractor: "To be tendered",
              officerId: p.assignedOfficerId ?? "",
              phase: "planning" as const,
              progress: 0,
              budget: p.funding.required || p.estimatedCost,
              spent: 0,
              startedAt: new Date().toISOString(),
              dueAt: new Date(Date.now() + 60 * 24 * 36e5).toISOString(),
              dayOfPlan: 0,
              planDays: 60,
              milestones: [
                { label: "Tender & work order", done: false },
                { label: "Mobilisation", done: false },
                { label: "Execution", done: false },
                { label: "Completion & handover", done: false },
              ],
            },
        }),
        (p, user) => [
          entry("Officer", `Approved ₹${(p.funding.required / 1e5).toFixed(1)} L from ${p.funding.source ?? "department budget"}`, {
            actorName: user.name,
          }),
          entry("System", "Project created — awaiting officer assignment", {}),
        ],
      );

    case "funding/reject":
      return patchProblem(
        state,
        action.id,
        (p) => ({ funding: { ...p.funding, status: "rejected" as const, note: action.reason } }),
        (_p, user) => [
          entry("Officer", "Funding rejected", { actorName: user.name, detail: action.reason }),
        ],
      );

    /* -- assignment ----------------------------------------------------- */
    case "officer/assign": {
      const next = patchProblem(
        state,
        action.id,
        (p) => ({
          assignedOfficerId: action.officerId,
          stage: p.stage === "impact" ? p.stage : ("assigned" as Stage),
          project: p.project ? { ...p.project, officerId: action.officerId } : p.project,
        }),
        (_p, user) => [
          entry("Officer", "Assigned to officer", {
            actorName: user.name,
            detail: state.officers.find((o) => o.id === action.officerId)?.name,
          }),
        ],
      );
      const previous = state.problems.find((p) => p.id === action.id)?.assignedOfficerId;
      const critical = state.problems.find((p) => p.id === action.id)?.severity === "critical";
      return {
        ...next,
        officers: next.officers.map((o) => {
          if (o.id === action.officerId) {
            return {
              ...o,
              activeTasks: o.activeTasks + 1,
              criticalTasks: o.criticalTasks + (critical ? 1 : 0),
            };
          }
          if (o.id === previous) {
            return {
              ...o,
              activeTasks: Math.max(0, o.activeTasks - 1),
              criticalTasks: Math.max(0, o.criticalTasks - (critical ? 1 : 0)),
            };
          }
          return o;
        }),
      };
    }

    /* -- implementation ------------------------------------------------- */
    case "project/progress":
      return patchProblem(
        state,
        action.id,
        (p) =>
          p.project
            ? {
                stage: "implementation" as Stage,
                project: {
                  ...p.project,
                  progress: action.progress,
                  phase: action.progress >= 100 ? ("completed" as const) : ("implementation" as const),
                },
              }
            : {},
        (_p, user) => [
          entry("Officer", `Progress updated to ${action.progress}%`, { actorName: user.name }),
        ],
      );

    case "project/complete": {
      const completed = patchProblem(
        state,
        action.id,
        (p) => ({
          project: p.project ? { ...p.project, progress: 100, phase: "completed" as const } : p.project,
          evidence: {
            ...p.evidence,
            after: p.evidence.after ?? {
              photos: 0,
              activeReports: Math.max(0, Math.round(p.reportCount * 0.05)),
              note: "Completion evidence pending upload.",
            },
          },
        }),
        (_p, user) => [entry("Officer", "Project marked complete", { actorName: user.name })],
      );
      return reducer(completed, { type: "verification/request", id: action.id });
    }

    /* -- citizen verification ------------------------------------------- */
    case "verification/request":
      return patchProblem(
        state,
        action.id,
        (p) => ({
          stage: "verification" as Stage,
          status: "verification_pending" as ProblemStatus,
          verification: {
            requestedAt: new Date().toISOString(),
            asked: p.reportCount,
            confirmed: 0,
            denied: 0,
            pending: p.reportCount,
          },
        }),
        (p) => [
          entry("System", `Verification request sent to ${p.reportCount} reporters`, {
            detail: "In the language each citizen reported in",
          }),
        ],
      );

    case "verification/record":
      return patchProblem(
        state,
        action.id,
        (p) => {
          const confirmed = p.verification.confirmed + action.confirmed;
          const denied = p.verification.denied + action.denied;
          const pending = Math.max(0, p.verification.asked - confirmed - denied);
          const settled = pending === 0;
          const upheld = confirmed >= denied * 3;
          return {
            verification: { ...p.verification, confirmed, denied, pending },
            /* Citizens close the loop, not the officer: the problem only
               reaches "resolved" when the people who reported it say so. */
            status: settled
              ? upheld
                ? ("resolved" as ProblemStatus)
                : ("in_progress" as ProblemStatus)
              : p.status,
            stage: settled && upheld ? ("impact" as Stage) : p.stage,
          };
        },
        () => [
          entry("Citizen", `${action.confirmed} confirmations, ${action.denied} denials recorded`, {
            automated: false,
          }),
        ],
      );

    /* -- automation & alerts -------------------------------------------- */
    case "automation/toggle":
      return {
        ...state,
        automations: state.automations.map((a) =>
          a.id === action.id
            ? { ...a, enabled: !a.enabled, status: !a.enabled ? "healthy" : "paused" }
            : a,
        ),
      };

    case "alert/read":
      return {
        ...state,
        alerts: state.alerts.map((a) => (a.id === action.id ? { ...a, read: true } : a)),
      };

    /* -- server hydration --------------------------------------------- */
    case "hydrate":
      return {
        ...state,
        problems: action.problems,
        user: action.user,
        publishedWeights: action.publishedWeights,
        weights: action.publishedWeights,
        hydrated: true,
      };

    case "problem/replace":
      return {
        ...state,
        problems: state.problems.map((p) =>
          p.id === action.problem.id ? action.problem : p,
        ),
      };

    default:
      return state;
  }
}

/* ============================================================ context === */

/**
 * The server-backed problem mutations. On failure they roll the one affected
 * problem back to the server's copy and surface the message on
 * `state.actionError`; they never reject, so a fire-and-forget `onClick` is safe.
 */
type GovActions = {
  validate: (id: string) => Promise<void>;
  reject: (id: string, reason: string) => Promise<void>;
  route: (id: string, departmentId: string, reason: string) => Promise<void>;
  clearError: () => void;
};

type GovContext = {
  state: State;
  /** Problems the signed-in officer is allowed to see, ranked live. */
  ranked: RankedProblem[];
  /** The same list under the published weighting — the "official" ranking. */
  published: RankedProblem[];
  can: (permission: Permission) => boolean;
  dispatch: React.Dispatch<Action>;
  actions: GovActions;
  /** Set when a server-backed mutation failed; the affected problem was rolled back. */
  actionError: string | null;
};

const Ctx = createContext<GovContext | null>(null);

function govUserFromMe(me: Awaited<ReturnType<typeof GovApi.me>>): GovUser {
  const seeded = seed.users.find((u) => u.id === me.id);
  if (seeded) return { ...seeded, permissions: asPermissions(me.permissions) };
  return {
    id: me.id,
    name: me.displayName,
    designation: me.roles[0] ?? "Officer",
    level: "panchayat",
    jurisdictionId: me.jurisdictionIds[0] ?? "",
    permissions: asPermissions(me.permissions),
  };
}

export function GovProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [me, problems, publishedWeights] = await Promise.all([
          GovApi.me(),
          GovApi.listProblems(),
          GovApi.publishedWeights(),
        ]);
        if (cancelled) return;
        dispatch({ type: "hydrate", user: govUserFromMe(me), problems, publishedWeights });
      } catch (error) {
        // A 401 has already sent the browser to /gov-login.
        if (!cancelled && !(error instanceof ApiError && error.status === 401)) {
          setLoadError(
            error instanceof ApiError ? error.message : "Could not load the workspace.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Optimistically apply the reducer action, call the API, reconcile. Never throws. */
  const runMutation = useCallback(
    async (optimistic: Action, call: () => Promise<Problem>, id: string) => {
      dispatch(optimistic);
      setActionError(null);
      try {
        const problem = await call();
        dispatch({ type: "problem/replace", problem });
      } catch (error) {
        setActionError(
          error instanceof ApiError ? error.message : "That action could not be completed.",
        );
        // Roll the one affected problem back to the server's truth.
        try {
          const fresh = await GovApi.getProblem(id);
          dispatch({ type: "problem/replace", problem: fresh });
        } catch {
          /* keep the optimistic state; the banner explains why it may be wrong */
        }
      }
    },
    [],
  );

  const actions = useMemo<GovActions>(
    () => ({
      validate: (id) =>
        runMutation({ type: "problem/validate", id }, () => GovApi.validate(id), id),
      reject: (id, reason) =>
        runMutation({ type: "problem/reject", id, reason }, () => GovApi.reject(id, reason), id),
      route: (id, departmentId, reason) =>
        runMutation(
          { type: "problem/route", id, departmentId, reason },
          () => GovApi.route(id, departmentId, reason),
          id,
        ),
      clearError: () => setActionError(null),
    }),
    [runMutation],
  );

  const visible = useMemo(
    () => scopeProblems(state.problems, state.user, seed.jurisdictions),
    [state.problems, state.user],
  );

  const ranked = useMemo(
    () => rankProblems(visible, state.weights, state.publishedWeights),
    [visible, state.weights, state.publishedWeights],
  );

  const published = useMemo(
    () => rankProblems(visible, state.publishedWeights),
    [visible, state.publishedWeights],
  );

  const check = useCallback((p: Permission) => can(state.user, p), [state.user]);

  const value = useMemo(
    () => ({ state, ranked, published, can: check, dispatch, actions, actionError }),
    [state, ranked, published, check, actions, actionError],
  );

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="headline-md text-ink">The workspace could not load</p>
        <p className="text-sm text-ink-muted">{loadError}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-pill bg-ink px-4 py-2 text-sm text-card"
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
          Loading the workspace…
        </div>
      </div>
    );
  }

  return (
    <Ctx.Provider value={value}>
      {actionError ? (
        <div className="fixed inset-x-0 top-3 z-50 mx-auto flex w-fit max-w-[90vw] items-center gap-3 rounded-pill bg-critical px-4 py-2 text-sm text-card shadow-level3">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="font-semibold underline">
            Dismiss
          </button>
        </div>
      ) : null}
      {children}
    </Ctx.Provider>
  );
}

export function useGov() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGov must be used inside <GovProvider>");
  return ctx;
}

/** One ranked problem by id, or undefined when it is outside the user's scope. */
export function useProblem(id: string) {
  const { ranked } = useGov();
  return ranked.find((p) => p.id === id);
}

export { seed as govSeed };
