/**
 * The public report-intake contract.
 *
 * Mirrors `backend/src/reports/reports.dto.ts` and the shape that endpoint
 * returns. Kept small on purpose: the form a citizen fills in on a phone is the
 * narrowest surface in the product, and every field here is one more reason to
 * abandon it halfway.
 */

export const CATEGORIES = [
  "water",
  "roads",
  "drainage",
  "streetlight",
  "waste",
  "bridge",
  "sanitation",
  "school",
  "health",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const URGENCIES = ["critical", "high", "medium", "low"] as const;
export type Urgency = (typeof URGENCIES)[number];

export type Village = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  jurisdiction: string;
};

export type ReportDraft = {
  text: string;
  category?: Category;
  urgency?: Urgency;
  lat: number;
  lng: number;
  villageId?: string;
  citizenName?: string;
  language: string;
};

/**
 * What the pipeline made of the report, returned so the citizen sees it.
 *
 * Shown rather than hidden because "we received it" tells somebody nothing
 * about whether they were understood. If the classifier read a drainage
 * complaint as a water one, the person who wrote it is the only one who can
 * tell, and they can only tell if we show them.
 */
export type Understood = {
  title: string;
  summary: string;
  category: Category;
  severity: Urgency;
  confidence: number;
  readBy: "groq" | "keywords";
};

export type ReportReceipt = {
  id: string;
  receivedAt: string;
  village: { id: string; name: string };
  understood: Understood;
  clusteringPending: boolean;
};

export const CATEGORY_LABEL: Record<Category, string> = {
  water: "Water supply",
  roads: "Roads",
  drainage: "Drainage",
  streetlight: "Street lighting",
  waste: "Waste collection",
  bridge: "Bridge",
  sanitation: "Sanitation",
  school: "School",
  health: "Health",
};

export const URGENCY_LABEL: Record<Urgency, string> = {
  critical: "Critical — someone could be hurt",
  high: "High — people are going without",
  medium: "Medium — it needs fixing",
  low: "Low — report it for the record",
};

/** A problem a citizen's report became part of, as `/reports/mine` returns it. */
export type MyProblem = {
  id: string;
  title: string;
  status: string;
  stage: string | null;
  reportCount: number;
  voteCount: number;
  votedByMe: boolean;
};

export type MyReport = {
  id: string;
  text: string;
  filedAt: string;
  photos: number;
  village: { id: string; name: string };
  understood: {
    title: string | null;
    category: Category | null;
    severity: Urgency | null;
    confidence: number;
  };
  /** Null until clustering has run. Not an error — it means "not yet looked at". */
  problem: MyProblem | null;
};

export const STATUS_LABEL: Record<string, string> = {
  pending_validation: "Waiting to be validated",
  awaiting_sponsorship: "Looking for a sponsor",
  funding_required: "Waiting on funding",
  in_progress: "Work under way",
  verification_pending: "Waiting for you to verify it",
  resolved: "Fixed and verified",
  rejected: "Refused",
};

/* ======================================================== verification === */

export type EvidenceSide = {
  photos: number;
  activeReports: number | null;
  note: string | null;
  images: { key: string; url: string }[];
};

export type EvidencePair = {
  problemId: string;
  before: EvidenceSide | null;
  after: EvidenceSide | null;
};

export type VerificationRequest = {
  problemId: string;
  title: string;
  category: Category;
  status: string;
  villages: string[];
  requestedAt: string | null;
  asked: number;
  confirmed: number;
  denied: number;
  pending: number;
  evidence: { before: unknown; after: unknown } | null;
  project: { id: string; title: string; phase: string; progress: number } | null;
  /** What this citizen has already said, if anything. */
  myVerification: { fixed: boolean; at: string } | null;
  myRating: boolean;
};

export type VerificationStatus = {
  problemId: string;
  asked: number;
  confirmed: number;
  denied: number;
  pending: number;
  settled: boolean;
  problemStatus: string;
  problemStage: string;
};

export type RatingSummary = {
  projectId: string;
  count: number;
  average: number | null;
  timeliness: number | null;
  quality: number | null;
  conduct: number | null;
  /** Comments without the commenters — see the endpoint for why. */
  comments: { stars: number; comment: string | null; at: string }[];
};
