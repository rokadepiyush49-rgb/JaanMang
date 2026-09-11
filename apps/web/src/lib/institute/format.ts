import type { Tone } from "@/components/ui";
import type { ApplicationStatus, MilestoneStatus, ProjectStage, TeamStatus } from "./types";
import { STAGES } from "./types";

/**
 * Words and tones, in one place.
 *
 * Every status in this portal resolves to one of the six tones `ui.tsx`
 * defines, and never to a colour chosen at a call site — that is what keeps a
 * "shortlisted" badge the same colour on the applications table, the team page
 * and the dashboard.
 */

export const TEAM_STATUS_LABEL: Record<TeamStatus, string> = {
  forming: "Forming",
  active: "Active",
  submitted: "Submitted",
  completed: "Completed",
  archived: "Archived",
};

export const TEAM_STATUS_TONE: Record<TeamStatus, Tone> = {
  forming: "warning",
  active: "info",
  submitted: "gold",
  completed: "success",
  archived: "neutral",
};

export const MILESTONE_LABEL: Record<MilestoneStatus, string> = {
  complete: "Complete",
  active: "In progress",
  pending: "Not started",
  changes_requested: "Changes requested",
};

export const MILESTONE_TONE: Record<MilestoneStatus, Tone> = {
  complete: "success",
  active: "info",
  pending: "neutral",
  changes_requested: "critical",
};

export const APPLICATION_LABEL: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  accepted: "Selected",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

export const APPLICATION_TONE: Record<ApplicationStatus, Tone> = {
  draft: "neutral",
  submitted: "info",
  under_review: "info",
  shortlisted: "gold",
  accepted: "success",
  rejected: "critical",
  withdrawn: "neutral",
};

export const SEVERITY_TONE: Record<string, Tone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  critical: "critical",
};

export const PROGRAM_LEVEL_LABEL: Record<string, string> = {
  certificate: "Certificate",
  diploma: "Diploma",
  undergraduate: "Undergraduate",
  postgraduate: "Postgraduate",
  doctoral: "Doctoral",
};

export const INSTITUTION_TYPE_LABEL: Record<string, string> = {
  university: "University",
  college: "College",
  polytechnic: "Polytechnic",
  iti: "Industrial Training Institute",
  training_institute: "Training institute",
  other: "Educational institution",
};

/** How far along the nine-stage pipeline a team is, 0–100. */
export function stagePercent(stage: ProjectStage): number {
  const i = STAGES.indexOf(stage);
  return Math.round(((i + 1) / STAGES.length) * 100);
}

/** "3 Sep", or "3 Sep 2025" when it is not this year. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** "4 days ago" — relative only while it is still useful, absolute after. */
export function ago(iso: string | null | undefined): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return shortDate(iso);
}

/** Days until a due date; negative means overdue. */
export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export function rupees(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)} L`;
  if (n >= 1000) return `₹${Math.round(n / 1000)}k`;
  return `₹${n}`;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
