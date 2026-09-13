/**
 * The AI Project Council's scripted walkthrough.
 *
 * Still fixtures, and deliberately. The council is a live feature — it runs
 * real Groq calls through `lib/council/` — but `/council/new` also ships a
 * scripted example session so somebody can see what a council *is* before
 * spending a rate limit on one. A transcript written to demonstrate a feature
 * is not the same thing as a fake database, which is why it survived the
 * deletion of everything else in `lib/data.ts`.
 */

import type { IconName } from "@/components/icon";
import { COUNCIL_AGENTS } from "@/lib/council/roster";
import type { Locale } from "@/lib/i18n/locale";

export const AGENTS = COUNCIL_AGENTS;

/**
 * Project phases, stored as stable English keys.
 *
 * The value submitted with the brief must not change with the reader's
 * language — it travels into the prompt, and a council asked to weigh a
 * project at stage "प्रोटोटाइप" in one session and "Prototype" in the next
 * would be answering two different questions. Only the label is translated.
 */

export const PHASE_KEYS = [
  "Select Phase",
  "Ideation",
  "Prototype",
  "Pilot",
  "Scale-up",
  "Handover",
] as const;

export type PhaseKey = (typeof PHASE_KEYS)[number];

const PHASE_LABEL_HI: Record<PhaseKey, string> = {
  "Select Phase": "चरण चुनिए",
  Ideation: "विचार",
  Prototype: "प्रोटोटाइप",
  Pilot: "पायलट",
  "Scale-up": "विस्तार",
  Handover: "हस्तांतरण",
};

export const PHASES = PHASE_KEYS;

export function phaseLabel(phase: PhaseKey, locale: Locale): string {
  return locale === "hi" ? PHASE_LABEL_HI[phase] : phase;
}

/** @deprecated Use `PHASE_KEYS` with `phaseLabel`. Kept for untouched callers. */

export const TRANSCRIPT = [
  {
    id: "m1",
    author: "Dr. Sarah Chen",
    role: "Technical",
    time: "10:42 AM",
    tone: "navy" as const,
    body: "I've reviewed the structural proposal. The distributed sensor network approach is technically sound and highly scalable. However, the proposed edge-computing nodes require a continuous power draw that exceeds the current solar array specifications by roughly 15%. We need to optimize the polling frequency or upgrade the panels.",
    tags: [
      { label: "Architecture Approved", tone: "neutral" as const, icon: "globe" as IconName },
      { label: "Power Deficit Identified", tone: "danger" as const, icon: "zap" as IconName },
    ],
  },
  {
    id: "m2",
    author: "Marcus Vance",
    role: "Financial",
    time: "10:44 AM",
    tone: "impact" as const,
    quote: 'Replying to Technical: "…upgrade the panels."',
    body: "I must disagree with the hardware upgrade path. Upgrading the solar arrays will push the Phase 1 budget over our ₹450k cap by at least ₹60k. The fiscal policy strictly prohibits exceeding Phase 1 limits without secondary council approval. We should explore the software optimization route (polling frequency) instead.",
    tags: [],
  },
];

export type InsightPoint = { lead?: string; text: string; danger?: boolean };

export const INSIGHTS: {
  title: string;
  icon: IconName;
  accent: string;
  chips: { label: string; tone: "neutral" | "danger" }[];
  points: InsightPoint[];
}[] = [
  {
    title: "Technical Stance",
    icon: "users",
    accent: "border-l-navy",
    chips: [
      { label: "3 Recommendations", tone: "neutral" },
      { label: "1 Flag", tone: "danger" },
    ],
    points: [
      { text: "Approve distributed nodes architecture." },
      { lead: "Critical:", text: "Resolve 15% power deficit.", danger: true },
      { text: "Suggests upgrading panel wattage." },
    ],
  },
  {
    title: "Financial Stance",
    icon: "landmark",
    accent: "border-l-impact-deep",
    chips: [
      { label: "1 Directive", tone: "neutral" },
      { label: "1 Block", tone: "neutral" },
    ],
    points: [
      { lead: "Enforce:", text: "Strict ₹450k Phase 1 cap." },
      { text: "Blocks hardware upgrade due to ₹60k overrun." },
      { text: "Demands software optimization alternative." },
    ],
  },
];

export const VERDICT_SCORES = [
  { label: "Social Impact Potential", value: 92, tone: "impact" as const },
  { label: "Technical Feasibility", value: 65, tone: "community" as const },
  { label: "Financial Sustainability", value: 80, tone: "navy" as const },
];

export const STRENGTHS = [
  "Clear alignment with local municipal sustainability goals.",
  "Strong grassroots mobilization strategy outlined.",
  "Initial budget estimates are well-researched and realistic.",
];
