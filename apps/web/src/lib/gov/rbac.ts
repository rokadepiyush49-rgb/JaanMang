/**
 * Jurisdiction scoping and permissions.
 *
 * The rule the government screens obey: an officer sees their own jurisdiction
 * and everything beneath it, and nothing above or beside it. A panchayat
 * secretary sees Nagri; the BDO sees every panchayat in Ranchi block; the
 * Deputy Commissioner sees the district. The same components render all three —
 * only the scope changes.
 *
 * There is no auth in the repository yet, so this module is the single place
 * that decides visibility. When sessions arrive, `currentUser` comes from the
 * session instead of the store and nothing else here changes.
 */

import type { GovUser, Jurisdiction, Permission, Problem } from "./types";

/** Every jurisdiction id at or below `rootId`. */
export function scopeIds(rootId: string, all: Jurisdiction[]): string[] {
  const out = [rootId];
  let frontier = [rootId];
  while (frontier.length) {
    const next = all.filter((j) => j.parentId && frontier.includes(j.parentId)).map((j) => j.id);
    out.push(...next);
    frontier = next;
  }
  return out;
}

export function scopeProblems(
  problems: Problem[],
  user: GovUser,
  jurisdictions: Jurisdiction[],
): Problem[] {
  const ids = new Set(scopeIds(user.jurisdictionId, jurisdictions));
  return problems.filter((p) => ids.has(p.jurisdictionId));
}

export function can(user: GovUser, permission: Permission): boolean {
  return user.permissions.includes(permission);
}

/** "Nagri Gram Panchayat · Ranchi Block · Ranchi District" */
export function jurisdictionPath(id: string, all: Jurisdiction[]): string[] {
  const path: string[] = [];
  let current = all.find((j) => j.id === id);
  while (current) {
    path.push(current.name);
    current = current.parentId ? all.find((j) => j.id === current!.parentId) : undefined;
  }
  return path;
}

export const LEVEL_LABEL: Record<GovUser["level"], string> = {
  state: "State",
  district: "District",
  block: "Block",
  panchayat: "Gram Panchayat",
};
