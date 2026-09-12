"use client";

/**
 * The student workspace's state.
 *
 * The same shape as the government and industry stores: start empty, hydrate
 * from the API on mount, hold a skeleton until it lands. Mutations dispatch
 * optimistically, call the API and reconcile.
 *
 * Empty rather than a placeholder profile, for the reason the industry store
 * documents: that object is what renders in the window between mount and the
 * workspace arriving, and a placeholder student is one somebody could read as
 * themselves.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "@/lib/api/client";
import {
  StudentApi,
  loadStudentWorkspace,
  type Achievements,
  type Opportunity,
  type Recommendation,
  type StudentApplication,
  type StudentNotification,
  type StudentProfile,
  type StudentProject,
  type StudentTeam,
} from "./service";

type State = {
  profile: StudentProfile | null;
  opportunities: Opportunity[];
  recommendations: Recommendation[];
  applications: StudentApplication[];
  projects: StudentProject[];
  teams: StudentTeam[];
  achievements: Achievements | null;
  notifications: StudentNotification[];
  hydrated: boolean;
};

const initialState: State = {
  profile: null,
  opportunities: [],
  recommendations: [],
  applications: [],
  projects: [],
  teams: [],
  achievements: null,
  notifications: [],
  hydrated: false,
};

type Action =
  | { type: "hydrate"; workspace: Awaited<ReturnType<typeof loadStudentWorkspace>> }
  | { type: "profile/replace"; profile: StudentProfile }
  | { type: "applications/replace"; applications: StudentApplication[] }
  | { type: "application/add"; application: StudentApplication }
  | { type: "application/status"; id: string; status: string }
  | { type: "notification/read"; id: string }
  | { type: "notification/unread"; id: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return { ...state, ...action.workspace, hydrated: true };

    case "profile/replace":
      return { ...state, profile: action.profile };

    case "applications/replace":
      return { ...state, applications: action.applications };

    case "application/add":
      return { ...state, applications: [action.application, ...state.applications] };

    case "application/status":
      return {
        ...state,
        applications: state.applications.map((a) =>
          a.id === action.id ? { ...a, status: action.status } : a,
        ),
      };

    case "notification/read":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, read: true } : n,
        ),
      };

    /** Rollback only: one we marked read that the server did not record. */
    case "notification/unread":
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          n.id === action.id ? { ...n, read: false } : n,
        ),
      };

    default:
      return state;
  }
}

type StudentActions = {
  apply: (problemId: string, body?: { teamId?: string; note?: string }) => Promise<void>;
  withdraw: (applicationId: string) => Promise<void>;
  readNotification: (id: string) => Promise<void>;
  updateProfile: (patch: Record<string, unknown>) => Promise<void>;
  clearError: () => void;
};

type StudentContext = {
  state: State;
  dispatch: React.Dispatch<Action>;
  actions: StudentActions;
  /** Unread notifications — the number on the nav badge, which used to be a 3. */
  unread: number;
  actionError: string | null;
};

const Ctx = createContext<StudentContext | null>(null);

export function StudentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const workspace = await loadStudentWorkspace();
        if (!cancelled) dispatch({ type: "hydrate", workspace });
      } catch (error) {
        // A 401 has already sent the browser to /signin.
        if (!cancelled && !(error instanceof ApiError && error.status === 401)) {
          setLoadError(
            error instanceof ApiError ? error.message : "Could not load your workspace.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const actions = useMemo<StudentActions>(
    () => ({
      apply: async (problemId, body = {}) => {
        setActionError(null);
        try {
          await StudentApi.apply(problemId, body);
          // Re-read rather than synthesising a row: the server decides the
          // status, and an application that looks submitted on screen but was
          // not recorded is the exact failure this stage exists to remove.
          dispatch({ type: "applications/replace", applications: await StudentApi.applications() });
        } catch (error) {
          setActionError(
            error instanceof ApiError ? error.message : "Could not send that application.",
          );
        }
      },

      withdraw: async (applicationId) => {
        const previous = state.applications.find((a) => a.id === applicationId)?.status;
        dispatch({ type: "application/status", id: applicationId, status: "withdrawn" });
        setActionError(null);
        try {
          await StudentApi.withdraw(applicationId);
        } catch (error) {
          if (previous) {
            dispatch({ type: "application/status", id: applicationId, status: previous });
          }
          setActionError(
            error instanceof ApiError ? error.message : "Could not withdraw that application.",
          );
        }
      },

      readNotification: async (id) => {
        dispatch({ type: "notification/read", id });
        try {
          await StudentApi.readNotification(id);
        } catch {
          dispatch({ type: "notification/unread", id });
        }
      },

      updateProfile: async (patch) => {
        setActionError(null);
        try {
          dispatch({ type: "profile/replace", profile: await StudentApi.updateProfile(patch) });
        } catch (error) {
          setActionError(
            error instanceof ApiError ? error.message : "Could not save those changes.",
          );
        }
      },

      clearError: () => setActionError(null),
    }),
    [state.applications],
  );

  const unread = useMemo(
    () => state.notifications.filter((n) => !n.read).length,
    [state.notifications],
  );

  const value = useMemo(
    () => ({ state, dispatch, actions, unread, actionError }),
    [state, actions, unread, actionError],
  );

  if (loadError) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="headline-md text-ink">Your workspace could not load</p>
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
          Loading your workspace…
        </div>
      </div>
    );
  }

  return (
    <Ctx.Provider value={value}>
      {actionError ? (
        <div className="fixed inset-x-0 top-3 z-50 mx-auto flex w-fit max-w-[90vw] items-center gap-3 rounded-pill bg-critical px-4 py-2 text-sm text-card shadow-level3">
          <span>{actionError}</span>
          <button className="font-semibold underline" onClick={() => setActionError(null)}>
            Dismiss
          </button>
        </div>
      ) : null}
      {children}
    </Ctx.Provider>
  );
}

export function useStudent() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStudent must be used inside <StudentProvider>");
  return ctx;
}

/** The signed-in student. Safe after hydration, which the provider guarantees. */
export function useProfile(): StudentProfile {
  const { state } = useStudent();
  if (!state.profile) throw new Error("profile read before hydration");
  return state.profile;
}
