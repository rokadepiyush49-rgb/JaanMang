/**
 * Vocabulary, not data.
 *
 * What survived when `mock-data.ts`, `challenges.ts`, `projects.ts` and
 * `visibility.ts` were deleted. None of it is a fixture standing in for a
 * database: the UN goals are facts about the world, the support kinds are this
 * product's own taxonomy of what a partner can actually offer, and the domain
 * constants are labels, icons and tints — presentation, which a server has no
 * business holding.
 *
 * The test for whether something belonged here rather than in the API: does it
 * change when the data behind a screen becomes real? None of this does.
 */

import type { IconName } from "@/components/icon";
import type { Tint } from "@/components/ui";
import type { ProblemCategory } from "@/lib/gov/types";
import type { Domain, Sdg, SupportKind, SupportMeta } from "./types";

export const SDGS: Sdg[] = [
  { number: 3, title: "Good Health and Well-being", short: "Health" },
  { number: 4, title: "Quality Education", short: "Education" },
  { number: 6, title: "Clean Water and Sanitation", short: "Clean Water" },
  { number: 7, title: "Affordable and Clean Energy", short: "Clean Energy" },
  { number: 9, title: "Industry, Innovation and Infrastructure", short: "Industry & Innovation" },
  { number: 10, title: "Reduced Inequalities", short: "Reduced Inequalities" },
  { number: 11, title: "Sustainable Cities and Communities", short: "Sustainable Communities" },
  { number: 12, title: "Responsible Consumption and Production", short: "Responsible Production" },
  { number: 13, title: "Climate Action", short: "Climate Action" },
  { number: 17, title: "Partnerships for the Goals", short: "Partnerships" },
];

export const SUPPORT: Record<SupportKind, SupportMeta> = {
  fund: {
    kind: "fund",
    label: "Fund",
    gives: "CSR or innovation capital",
    icon: "banknote",
    blurb: "Sponsor the build, tied to milestones the government countersigns.",
  },
  mentor: {
    kind: "mentor",
    label: "Mentor",
    gives: "Engineering hours",
    icon: "users",
    blurb: "Put your engineers in the student team's design reviews.",
  },
  technology: {
    kind: "technology",
    label: "Technology",
    gives: "Hardware, software, cloud",
    icon: "code",
    blurb: "Contribute gateways, sensors, licences or platform credits.",
  },
  prototype: {
    kind: "prototype",
    label: "Prototype",
    gives: "Fabrication & lab access",
    icon: "bulb",
    blurb: "Open your workshop for enclosure, PCB and assembly runs.",
  },
  test: {
    kind: "test",
    label: "Test",
    gives: "Calibration & QA rigs",
    icon: "gauge",
    blurb: "Validate the prototype against instruments a campus lab lacks.",
  },
  deploy: {
    kind: "deploy",
    label: "Deploy",
    gives: "Field crews & logistics",
    icon: "map-pin",
    blurb: "Install, commission and maintain in the villages themselves.",
  },
  partner: {
    kind: "partner",
    label: "Co-develop",
    gives: "Joint IP & productisation",
    icon: "share",
    blurb: "Take the prototype to a product the state can procure at scale.",
  },
};

export const DOMAINS: Domain[] = [
  "education",
  "health",
  "agriculture",
  "water",
  "environment",
  "energy",
  "infrastructure",
  "accessibility",
  "rural",
];

export const DOMAIN_LABEL: Record<Domain, string> = {
  water: "Water & Sanitation",
  health: "Healthcare",
  education: "Education",
  agriculture: "Agriculture",
  environment: "Environment",
  energy: "Energy",
  infrastructure: "Infrastructure",
  accessibility: "Accessibility",
  rural: "Rural Development",
};

export const DOMAIN_SHORT: Record<Domain, string> = {
  water: "Water",
  health: "Healthcare",
  education: "Education",
  agriculture: "Agriculture",
  environment: "Environment",
  energy: "Energy",
  infrastructure: "Infrastructure",
  accessibility: "Accessibility",
  rural: "Rural Dev",
};

export const DOMAIN_ICON: Record<Domain, IconName> = {
  water: "droplet",
  health: "heart",
  education: "graduation",
  agriculture: "leaf",
  environment: "globe",
  energy: "zap",
  infrastructure: "landmark",
  accessibility: "users",
  rural: "map-pin",
};

export const DOMAIN_TINT: Record<Domain, Tint> = {
  water: "blue",
  health: "orchid",
  education: "navy",
  agriculture: "mint",
  environment: "mint",
  energy: "amber",
  infrastructure: "clay",
  accessibility: "orchid",
  rural: "clay",
};

export const CATEGORY_DOMAIN: Record<ProblemCategory, Domain> = {
  water: "water",
  sanitation: "water",
  roads: "infrastructure",
  bridge: "infrastructure",
  drainage: "infrastructure",
  streetlight: "energy",
  waste: "environment",
  school: "education",
  health: "health",
};
