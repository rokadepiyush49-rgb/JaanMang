import type {
  EvidencePair,
  MyReport,
  RatingSummary,
  ReportDraft,
  ReportReceipt,
  VerificationRequest,
  VerificationStatus,
  Village,
} from "./types";

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

/* ======================================================== verification === */

/**
 * Upload a file.
 *
 * Two steps because the server issues the key: ask for a target, then PUT the
 * bytes at it. The server checks the type and the size before issuing, and the
 * magic numbers on receipt — neither of which the browser can be trusted with.
 */
export async function uploadFile(
  file: File,
  purpose = "evidence",
): Promise<{ key: string; url: string }> {
  const presignRes = await fetch("/api/backend/uploads/presign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contentType: file.type,
      sizeBytes: file.size,
      purpose,
    }),
  });
  if (!presignRes.ok) await read(presignRes);
  const presign = (await presignRes.json()) as {
    key: string;
    url: string;
    driver: string;
  };

  // The presign URL is same-origin for the local driver and absolute for R2.
  const target = presign.url.startsWith("/api/v1/")
    ? presign.url.replace("/api/v1/", "/api/backend/")
    : presign.url;

  const put = await fetch(target, {
    method: "PUT",
    headers: { "content-type": file.type },
    body: file,
  });
  if (!put.ok) await read(put);

  return { key: presign.key, url: `/api/backend/uploads/${encodeURIComponent(presign.key)}` };
}

export const VerificationApi = {
  /** Requests addressed to you, because you reported the problem. */
  mine: () =>
    fetch("/api/backend/verification/mine", { cache: "no-store" }).then(async (r) => {
      if (!r.ok) await read(r);
      return (await r.json()) as VerificationRequest[];
    }),

  verify: (problemId: string, body: { fixed: boolean; note?: string; photoKeys?: string[] }) =>
    fetch(`/api/backend/verification/problems/${encodeURIComponent(problemId)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (r) => {
      if (!r.ok) await read(r);
      return (await r.json()) as VerificationStatus;
    }),

  rate: (
    projectId: string,
    body: { stars: number; comment?: string; timeliness?: number; quality?: number; conduct?: number },
  ) =>
    fetch(`/api/backend/verification/projects/${encodeURIComponent(projectId)}/rate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (r) => {
      if (!r.ok) await read(r);
      return (await r.json()) as { id: string; stars: number };
    }),

  evidence: (problemId: string) =>
    fetch(`/api/backend/verification/problems/${encodeURIComponent(problemId)}/evidence`, {
      cache: "no-store",
    }).then(async (r) => {
      if (!r.ok) await read(r);
      return (await r.json()) as EvidencePair;
    }),

  ratings: (projectId: string) =>
    fetch(`/api/backend/verification/projects/${encodeURIComponent(projectId)}/ratings`, {
      cache: "no-store",
    }).then(async (r) => {
      if (!r.ok) await read(r);
      return (await r.json()) as RatingSummary;
    }),
};

/**
 * An API-relative asset path, as the browser must request it.
 *
 * The API returns `/api/v1/uploads/<key>` because it does not — and should
 * not — know that a Next proxy sits in front of it. The browser is on the web
 * app's origin, where that path does not exist; everything goes through
 * `/api/backend/*`. An absolute URL (R2's public bucket) is left alone.
 */
export function assetUrl(url: string): string {
  if (/^https?:\/\//.test(url)) return url;
  return url.startsWith("/api/v1/") ? url.replace("/api/v1/", "/api/backend/") : url;
}
