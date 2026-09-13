/**
 * Typed government-workspace API calls.
 *
 * These are the real implementations behind `service.ts` for the problem
 * lifecycle. Everything they return already matches the shapes in `./types`,
 * because the backend schema was built from those types.
 */
import { api } from "@/lib/api/client";
import type { Permission, PriorityWeights, Problem, RankedProblem } from "./types";
import type { EvidenceSide } from "@/lib/report/types";

export type Me = {
  id: string;
  kind: "citizen" | "staff" | "admin";
  displayName: string;
  email: string | null;
  roles: string[];
  permissions: string[];
  jurisdictionIds: string[];
};

export const GovApi = {
  me: () => api.get<Me>("auth/me"),

  listProblems: () => api.get<RankedProblem[]>("problems"),

  getProblem: (id: string) => api.get<RankedProblem>(`problems/${id}`),

  publishedWeights: () =>
    api.get<{ weights: PriorityWeights }>("problems/priority").then((r) => r.weights),

  validate: (id: string) => api.post<RankedProblem>(`problems/${id}/validate`),

  reject: (id: string, reason: string) =>
    api.post<RankedProblem>(`problems/${id}/reject`, { reason }),

  route: (id: string, departmentId: string, reason: string) =>
    api.post<RankedProblem>(`problems/${id}/route`, { departmentId, reason }),

  publishWeights: (weights: PriorityWeights) =>
    api.post<{ weights: PriorityWeights }>("problems/priority/weights", { weights }),

  /* ------------------------------------------------------- sponsorship -- */

  inviteSponsors: (id: string) =>
    api.post<RankedProblem>(`problems/${id}/sponsorship/invite`),

  approveSponsorship: (id: string, sponsorId: string, amount?: number) =>
    api.post<RankedProblem>(`problems/${id}/sponsorship/approve`, { sponsorId, amount }),

  declineSponsorship: (id: string, sponsorId: string, reason: string) =>
    api.post<RankedProblem>(`problems/${id}/sponsorship/decline`, { sponsorId, reason }),

  sponsorshipFallback: (id: string) =>
    api.post<RankedProblem>(`problems/${id}/sponsorship/fallback`),

  /* ----------------------------------------------------------- funding -- */

  approveFunding: (id: string, body: { amount?: number; source?: string; note?: string } = {}) =>
    api.post<RankedProblem>(`problems/${id}/funding/approve`, body),

  rejectFunding: (id: string, reason: string) =>
    api.post<RankedProblem>(`problems/${id}/funding/reject`, { reason }),

  /* ---------------------------------------------------------- delivery -- */

  assignOfficer: (id: string, officerId: string) =>
    api.post<RankedProblem>(`problems/${id}/assign`, { officerId }),

  projectProgress: (id: string, progress: number, note?: string) =>
    api.post<RankedProblem>(`problems/${id}/project/progress`, { progress, note }),

  completeProject: (id: string) =>
    api.post<RankedProblem>(`problems/${id}/project/complete`),

  /* --------------------------------------------------------- workspace -- */

  toggleAutomation: (id: string, enabled?: boolean) =>
    api.patch<{ id: string; enabled: boolean; status: string }>(`automations/${id}`, { enabled }),

  markAlertRead: (id: string) => api.post<{ id: string; read: boolean }>(`alerts/${id}/read`),

  /* ---------------------------------------------------------- evidence -- */

  /** Attach uploaded photographs to the before or after side of a problem. */
  addEvidence: (id: string, side: "before" | "after", keys: string[], note?: string) =>
    api.post<{ problemId: string }>(`gov/problems/${id}/evidence`, { side, keys, note }),

  evidence: (id: string) =>
    api.get<{
      problemId: string;
      before: EvidenceSide | null;
      after: EvidenceSide | null;
    }>(`verification/problems/${id}/evidence`),

  verificationStatus: (id: string) =>
    api.get<{
      problemId: string;
      asked: number;
      confirmed: number;
      denied: number;
      pending: number;
      settled: boolean;
    }>(`gov/verification/${id}`),

  objections: (id: string) =>
    api.get<{ id: string; reason: string; status: string; at: string }[]>(
      `gov/problems/${id}/objections`,
    ),

  adjustPriority: (
    id: string,
    body: { label: string; points: number; reason: string; objectionId?: string },
  ) => api.post<{ problemId: string; adjusted: number }>(`gov/problems/${id}/adjust-priority`, body),
};

/** `me.permissions` is the same closed union as `Permission`. */
export function asPermissions(keys: string[]): Permission[] {
  return keys as Permission[];
}

export type { Problem };
