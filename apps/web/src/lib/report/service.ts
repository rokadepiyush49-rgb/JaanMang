import type { MyReport, ReportDraft, ReportReceipt, Village } from "./types";

/**
 * The report-intake client.
 *
 * Everything goes through `/api/backend/*`, the same-origin proxy every other
 * surface uses. It attaches a session when there is one and forwards the
 * request unauthenticated when there is not, which is exactly what intake
 * needs: a signed-in citizen's report is attributed to them so they can track
 * it, and a stranger's is filed anyway.
 */

export class ReportError extends Error {
  constructor(
    message: string,
    readonly fields?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "ReportError";
  }
}

async function read(res: Response): Promise<never> {
  let detail = `The server answered ${res.status}.`;
  let fields: Record<string, string[]> | undefined;
  try {
    const body = (await res.json()) as { detail?: string; errors?: Record<string, string[]> };
    if (body.detail) detail = body.detail;
    fields = body.errors;
  } catch {
    // A non-JSON error body is still an error; the status line is what we have.
  }
  throw new ReportError(detail, fields);
}

/**
 * File a report.
 *
 * The idempotency key is generated here, once per submission attempt, and
 * reused across retries of *that* attempt. It is the difference between a
 * double-tap on a slow connection filing one report and filing two — and on
 * the connections this form is used over, that is not a rare case.
 */
export async function submitReport(
  draft: ReportDraft,
  idempotencyKey: string,
): Promise<ReportReceipt> {
  const res = await fetch("/api/backend/reports", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": idempotencyKey },
    body: JSON.stringify(draft),
  });
  if (!res.ok) await read(res);
  return (await res.json()) as ReportReceipt;
}

/** The village register, for the location fallback. Public. */
export async function fetchVillages(): Promise<Village[]> {
  const res = await fetch("/api/backend/reports/villages", { cache: "no-store" });
  if (!res.ok) await read(res);
  return (await res.json()) as Village[];
}

/** A citizen's own reports, and what became of each. Needs a session. */
export async function fetchMyReports(): Promise<{ items: MyReport[] }> {
  const res = await fetch("/api/backend/reports/mine", { cache: "no-store" });
  if (!res.ok) await read(res);
  return (await res.json()) as { items: MyReport[] };
}

export type VoteState = {
  problemId: string;
  voteCount: number;
  reportCount: number;
  votedByMe: boolean;
  votedAt: string | null;
};

/**
 * Cast or withdraw a vote.
 *
 * Both directions are idempotent server-side, so a double-tap or a retry is
 * safe and the client does not have to guard against one.
 */
export async function setVote(problemId: string, voted: boolean): Promise<VoteState> {
  const res = await fetch(`/api/backend/problems/${encodeURIComponent(problemId)}/vote`, {
    method: voted ? "POST" : "DELETE",
  });
  if (!res.ok) await read(res);
  return (await res.json()) as VoteState;
}
