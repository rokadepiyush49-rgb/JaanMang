/**
 * Navigation and presentation for the student workspace.
 *
 * What survived `lib/data.ts`. The test for whether something belonged here
 * rather than behind an endpoint: does it change when the data becomes real?
 * A nav item, a filter list and a stage label do not.
 */

import type { IconName } from "@/components/icon";

/* Static content transcribed from the Stitch reference screens. All values are
   presentation fixtures — swap for API calls when the backend lands. */

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
};

/* The student's own work. `Challenges` points at the existing Problem
   Explorer — it is already the challenge browser, so the route keeps working
   and only the label changes to the word students use for it. */

export const NAV_MAIN = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/profile", label: "My Profile", icon: "user" },
  { href: "/opportunities", label: "Opportunities", icon: "briefcase" },
  { href: "/projects", label: "Projects", icon: "rocket" },
  { href: "/applications", label: "Applications", icon: "file-pen" },
  { href: "/problem-explorer", label: "Challenges", icon: "bulb" },
  { href: "/achievements", label: "Achievements", icon: "trophy" },
  // No badge here. The count is the number of unread notifications, which the
  // shell reads from the store — it was a literal 3 for as long as this file
  // was fixtures, and a nav item is not the place to assert a fact about data.
  { href: "/notifications", label: "Notifications", icon: "bell" },
] satisfies NavItem[];

/* The shared surfaces the student visits but does not own. */

export const NAV_EXPLORE = [
  { href: "/impact-hub", label: "Impact Hub", icon: "trending-up" },
  { href: "/industry-hub", label: "Industry Hub", icon: "factory" },
  { href: "/council", label: "AI Project Council", icon: "users" },
] satisfies NavItem[];

/** Phone navigation. Five destinations, the middle one raised — the shape the
    Citizen app's floating bar uses, with the student's primary action in the
    slot the app gives to Report. */

export const BOTTOM_NAV = [
  { href: "/dashboard", label: "Home", icon: "dashboard" },
  { href: "/problem-explorer", label: "Explore", icon: "bulb" },
  { href: "/collaborate/new", label: "New", icon: "plus", raised: true },
  { href: "/projects", label: "Projects", icon: "rocket" },
  { href: "/profile", label: "Profile", icon: "user" },
] satisfies (NavItem & { raised?: boolean })[];

/** @deprecated Use `NAV_MAIN` / `NAV_EXPLORE`. */

export const NAV = [...NAV_MAIN, ...NAV_EXPLORE];

/* ------------------------------------------------------------- student --- */

export const DASHBOARD_ACTIONS = [
  { label: "Find a challenge", icon: "bulb" as IconName, tint: "navy" as const, href: "/problem-explorer" },
  { label: "Start a project", icon: "plus" as IconName, tint: "mint" as const, href: "/collaborate/new" },
  { label: "Build a team", icon: "users" as IconName, tint: "orchid" as const, href: "/collaborate/team" },
  { label: "Ask the Council", icon: "bot" as IconName, tint: "blue" as const, href: "/council" },
  { label: "Log impact", icon: "trending-up" as IconName, tint: "clay" as const, href: "/impact-hub" },
  { label: "Browse partners", icon: "factory" as IconName, tint: "amber" as const, href: "/industry-hub" },
];

export const QUICK_ACTIONS = [
  { label: "Report Issue", icon: "warning", tone: "danger" },
  { label: "Projects", icon: "clipboard", tone: "navy" },
  { label: "Volunteer", icon: "heart", tone: "impact" },
  { label: "Forums", icon: "message", tone: "community" },
  { label: "Resources", icon: "book", tone: "navy" },
  { label: "Events", icon: "trophy", tone: "navy" },
  { label: "Teams", icon: "users", tone: "navy" },
  { label: "Awards", icon: "award", tone: "impact" },
] satisfies { label: string; icon: IconName; tone: string }[];

export const STAGES = ["Plan", "Res", "Dev", "Test", "Pilot", "Imp"];

export const FILTERS = {
  categories: [
    "All Categories",
    "IoT",
    "Data Analytics",
    "AI/ML",
    "Public Health",
    "Sustainability",
    "Livelihoods",
  ],
  urgency: ["Any Urgency", "Critical", "High", "Moderate"],
  regions: [
    "All Regions",
    "South Chotanagpur",
    "North Chotanagpur",
    "Kolhan",
    "Santhal Pargana",
  ],
};

/**
 * Re-exported from the council roster so the setup screen and the engine can
 * never disagree about who is on the panel. `roster.ts` is the source of
 * truth; this alias only exists so existing imports keep working.
 */

export const SKILL_FILTERS = [
  "BIT Mesra",
  "Ranchi University",
  "React",
  "Data Science",
  "UI/UX",
];

export const GOALS = [
  { id: "sustainability", label: "Sustainability", icon: "leaf" as IconName },
  { id: "governance", label: "Governance", icon: "landmark" as IconName },
  { id: "education", label: "Education", icon: "graduation" as IconName },
];
