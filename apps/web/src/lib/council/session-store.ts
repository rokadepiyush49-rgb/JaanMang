"use client";

/**
 * Carries a session between the three council pages.
 *
 * Setup (`/council/new`) writes the brief and the seated panel; the session
 * page reads them and writes back the transcript; the verdict page reads
 * both. There is no server-side session and no database, so this is the seam
 * that holds a sitting together.
 *
 * `sessionStorage`, not `localStorage`: a council session is one sitting. Tying
 * it to the tab means closing the tab ends it, and two tabs can run two
 * different projects without colliding — both of which are the behaviour a
 * student would expect and neither of which `localStorage` gives.
 *
 * Every read is defensive. The stored value can be absent (opened the session
 * page directly), stale (an older shape from a previous deploy), or corrupt
 * (someone edited it in devtools), and all three must degrade to "no session"
 * rather than throwing inside a render.
 */

import { COUNCIL_AGENTS } from "@/lib/council/roster";
import type { CouncilMessage, ProjectBrief } from "@/lib/council/types";

const KEY = "jansetu.council.session";

/** Bumped whenever the stored shape changes, so old entries are discarded. */
const VERSION = 1;

export interface StoredSession {
  version: number;
  brief: ProjectBrief;
  seatedAgentIds: string[];
  transcript: CouncilMessage[];
  /** Set once the session has run to completion, so the verdict page can trust it. */
  complete: boolean;
}

const KNOWN_IDS = new Set(COUNCIL_AGENTS.map((agent) => agent.id));

function isBrief(value: unknown): value is ProjectBrief {
  if (!value || typeof value !== "object") return false;
  const brief = value as Record<string, unknown>;
  return typeof brief.title === "string" && brief.title.trim().length > 0;
}

function rawSession(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    // Storage can throw outright in a private window or with site data blocked.
    return null;
  }
}

export function readSession(): StoredSession | null {
  const raw = rawSession();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (parsed.version !== VERSION) return null;
    if (!isBrief(parsed.brief)) return null;

    const seatedAgentIds = Array.isArray(parsed.seatedAgentIds)
      ? parsed.seatedAgentIds.filter((id): id is string => typeof id === "string" && KNOWN_IDS.has(id))
      : [];
    if (seatedAgentIds.length === 0) return null;

    return {
      version: VERSION,
      brief: parsed.brief,
      seatedAgentIds,
      transcript: Array.isArray(parsed.transcript) ? (parsed.transcript as CouncilMessage[]) : [],
      complete: parsed.complete === true,
    };
  } catch {
    return null;
  }
}

/**
 * Cached parse of whatever is in the store right now.
 *
 * `readSession` builds a fresh object on every call, which makes it unusable
 * as a `useSyncExternalStore` snapshot: React compares snapshots by identity
 * and would re-render forever. Caching against the raw string means the same
 * object comes back until the stored text actually changes, and a write in
 * between is picked up on the next read without any subscription.
 */
let cachedRaw: string | null = null;
let cachedSession: StoredSession | null = null;

export function getSessionSnapshot(): StoredSession | null {
  const raw = rawSession();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = readSession();
  }
  return cachedSession;
}

export function writeSession(session: Omit<StoredSession, "version">): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ version: VERSION, ...session }));
  } catch {
    // A full or blocked store must not take the session down — the transcript
    // is already in React state, so the only thing lost is the handoff to the
    // verdict page.
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do; see writeSession.
  }
}
