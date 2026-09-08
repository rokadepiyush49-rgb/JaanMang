/**
 * Typed government-workspace API calls.
 *
 * These are the real implementations behind `service.ts` for the problem
 * lifecycle. Everything they return already matches the shapes in `./types`,
 * because the backend schema was built from those types.
 */
import { api } from "@/lib/api/client";
import type { Permission, PriorityWeights, Problem, RankedProblem } from "./types";

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
};

/** `me.permissions` is the same closed union as `Permission`. */
export function asPermissions(keys: string[]): Permission[] {
  return keys as Permission[];
}

export type { Problem };
