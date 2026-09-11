"use client";

/**
 * The institute workspace shell.
 *
 * Same figure and ground as the citizen app, the government workspace and the
 * industry portal — white cards floating on the periwinkle page, pill
 * navigation, 44px circular controls, the ink fill marking the active
 * destination. What changes is what the chrome carries. An officer's header
 * holds their jurisdiction because that is what their authority rests on; a
 * partner's holds the CSR budget left. A registrar's holds the two numbers that
 * decide whether they have work to do this morning: submissions waiting on a
 * decision, and students waiting to be confirmed.
 *
 * The nav is grouped by workflow rather than by table — Academics, Delivery,
 * Outward — because a registrar does not think in tables, and because the
 * groups leave obvious room for what comes next.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import { Avatar, Skeleton, cx } from "@/components/ui";
import { SignOutButton } from "@/components/auth/sign-out";
import { useSession } from "@/lib/auth/session-context";
import { useInstitute } from "@/lib/institute/store";
import { useHydrated } from "@/lib/gov/use-now";

type BadgeKey = "submissions" | "roster" | "teams" | "applications";

type NavEntry = { href: string; label: string; icon: IconName; badge?: BadgeKey };

const GROUPS: { title?: string; items: NavEntry[] }[] = [
  {
    items: [{ href: "/institute", label: "Home", icon: "dashboard" }],
  },
  {
    title: "Academics",
    items: [
      { href: "/institute/students", label: "Students", icon: "users", badge: "roster" },
      { href: "/institute/faculty", label: "Faculty", icon: "user" },
      { href: "/institute/departments", label: "Departments & Programmes", icon: "book" },
    ],
  },
  {
    title: "Delivery",
    items: [
      { href: "/institute/teams", label: "Teams", icon: "rocket", badge: "teams" },
      { href: "/institute/projects", label: "Projects", icon: "clipboard" },
      { href: "/institute/submissions", label: "Submissions", icon: "file-pen", badge: "submissions" },
    ],
  },
  {
    title: "Outward",
    items: [
      { href: "/institute/opportunities", label: "Opportunities", icon: "target" },
      { href: "/institute/applications", label: "Applications", icon: "send", badge: "applications" },
      { href: "/institute/partners", label: "Industry partners", icon: "factory" },
    ],
  },
];

const FOOTER: NavEntry[] = [
  { href: "/institute/reports", label: "Reports", icon: "bar-chart" },
  { href: "/institute/notifications", label: "Notifications", icon: "bell" },
  { href: "/institute/profile", label: "Institution profile", icon: "landmark" },
  { href: "/institute/settings", label: "Settings", icon: "settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/institute") return pathname === "/institute";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  entry,
  active,
  badge,
  onNavigate,
}: {
  entry: NavEntry;
  active: boolean;
  badge?: number;
  onNavigate?: () => void;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={cx(
        "flex items-center gap-3 rounded-full px-4 py-2.5 text-sm transition-colors duration-150 ease-jm",
        active
          ? "bg-primary font-bold text-white shadow-level1"
          : "font-semibold text-ink-muted hover:bg-card-muted hover:text-ink",
      )}
      href={entry.href}
      onClick={onNavigate}
    >
      <Icon name={entry.icon} size={20} />
      <span className="min-w-0 flex-1 truncate">{entry.label}</span>
      {badge ? (
        <span
          className={cx(
            "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
            active ? "bg-white/20 text-white" : "bg-critical-tint text-on-critical-tint",
          )}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

/** The lockup — the product's mark, named for the surface it opens. */
function InstituteBrand({ onClick }: { onClick?: () => void }) {
  return (
    <Link className="flex items-center gap-3 rounded-md" href="/institute" onClick={onClick}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Icon name="book" size={22} />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-bold tracking-[-0.01em] text-ink">
          Jan Setu
        </span>
        <span className="label-caps block text-ink-faint">Institute</span>
      </span>
      <span className="sr-only">Jan Setu — Institute workspace</span>
    </Link>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const session = useSession();
  const { data } = useInstitute();

  const orgName = session?.organisation?.name ?? "Your institution";
  const orgSub =
    session?.organisation?.institution?.city ??
    session?.organisation?.designation ??
    "Institute workspace";

  const counts: Record<BadgeKey, number> = {
    submissions: data?.counts.awaitingReview ?? 0,
    roster: data?.counts.unverifiedStudents ?? 0,
    teams: (data?.needs.unguidedTeams.length ?? 0) + (data?.needs.emptyTeams.length ?? 0),
    applications: data?.counts.applications ?? 0,
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-4 py-5">
      <InstituteBrand onClick={onNavigate} />

      {/* The morning action, not a decoration: whatever is waiting on a human
          decision is one tap from every screen. */}
      <Link
        className="flex h-12 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-white shadow-level1 transition-colors duration-150 ease-jm hover:bg-primary-hover"
        href="/institute/submissions"
        onClick={onNavigate}
      >
        <Icon name="file-pen" size={18} />
        {counts.submissions > 0
          ? `${counts.submissions} awaiting review`
          : "Nothing awaiting review"}
      </Link>

      {GROUPS.map((group, gi) => (
        <div key={group.title ?? gi}>
          {group.title ? (
            <p className="label-caps px-4 pb-2 text-ink-faint">{group.title}</p>
          ) : null}
          <nav className="flex flex-col gap-1">
            {group.items.map((item) => (
              <NavItem
                active={isActive(pathname, item.href)}
                badge={item.badge ? counts[item.badge] : undefined}
                entry={item}
                key={item.href}
                onNavigate={onNavigate}
              />
            ))}
          </nav>
        </div>
      ))}

      <div className="mt-auto flex flex-col gap-1 pt-4">
        {FOOTER.map((item) => (
          <NavItem
            active={isActive(pathname, item.href)}
            entry={item}
            key={item.href}
            onNavigate={onNavigate}
          />
        ))}

        <SignOutButton variant="menu" />

        <Link
          className="mt-3 flex items-center gap-3 rounded-full bg-card-muted p-2 transition-colors duration-150 ease-jm hover:bg-container"
          href="/institute/profile"
          onClick={onNavigate}
        >
          <Avatar name={orgName} size={38} tone="ink" />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-bold text-ink">{orgName}</span>
            <span className="block truncate text-xs text-ink-muted">{orgSub}</span>
          </span>
          <Icon className="shrink-0 text-ink-muted" name="chevron-right" size={18} />
        </Link>
      </div>
    </div>
  );
}

/**
 * The two numbers a registrar checks before opening anything else.
 *
 * Not vanity metrics: each one is a queue with names in it, and each is a link
 * to the screen that empties it.
 */
function Queues() {
  const { data } = useInstitute();
  if (!data) return null;

  const items = [
    { href: "/institute/submissions", label: "Awaiting review", value: data.counts.awaitingReview },
    { href: "/institute/students?status=unverified", label: "To verify", value: data.counts.unverifiedStudents },
  ];

  return (
    <div className="hidden h-11 items-center gap-3 rounded-full bg-card px-4 shadow-level1 xl:flex">
      {items.map((item, i) => (
        <span className="flex items-center gap-3" key={item.href}>
          {i > 0 ? <span className="h-7 w-px bg-line" /> : null}
          <Link className="leading-tight" href={item.href}>
            <span className="label-caps block text-ink-faint">{item.label}</span>
            <span
              className={cx(
                "block text-sm font-bold tabular-nums",
                item.value > 0 ? "text-critical" : "text-ink",
              )}
            >
              {item.value}
            </span>
          </Link>
        </span>
      ))}
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const session = useSession();
  const { data } = useInstitute();
  const waiting = data?.counts.awaitingReview ?? 0;

  return (
    <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b border-line/70 bg-surface/85 px-4 backdrop-blur-md lg:px-8">
      <button
        aria-label="Open navigation"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card text-ink shadow-level1 lg:hidden"
        onClick={onMenu}
        type="button"
      >
        <Icon name="list" size={20} />
      </button>

      <span className="lg:hidden">
        <Icon className="text-ink" name="book" size={22} />
      </span>

      <div className="ml-auto flex items-center gap-2">
        <Queues />

        <span className="hidden h-11 items-center gap-2 rounded-full bg-card px-3 text-sm font-semibold text-ink shadow-level1 sm:flex">
          <Avatar name={session?.displayName ?? "You"} size={28} />
          <span className="hidden max-w-40 truncate lg:inline">{session?.displayName}</span>
        </span>

        <Link
          aria-label={`Notifications${waiting ? `, ${waiting} items need a decision` : ""}`}
          className="relative flex size-11 items-center justify-center rounded-full bg-card text-ink shadow-level1 transition-colors hover:bg-card-muted"
          href="/institute/notifications"
        >
          <Icon name="bell" size={20} />
          {waiting ? (
            <span className="absolute top-2 right-2.5 size-2.5 rounded-full bg-critical ring-2 ring-card" />
          ) : null}
        </Link>
      </div>
    </header>
  );
}

/** The shape of a screen, held for the one frame before hydration. */
function ShellSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-6">
      <Skeleton className="h-10 w-80" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton className="h-28" key={i} />
        ))}
      </div>
      <Skeleton className="h-40" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-80 xl:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export function InstituteShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const hydrated = useHydrated();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-72 shrink-0 p-3 pr-0 lg:block">
        <div className="sticky top-3 h-[calc(100vh-1.5rem)] overflow-hidden rounded-xl bg-card shadow-level1">
          <SidebarBody />
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-primary/32 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="jm-enter relative h-full w-[19rem] max-w-[86vw] rounded-r-xl bg-card shadow-level3">
            <SidebarBody onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="min-w-0 flex-1 px-4 pt-6 pb-16 sm:px-6 lg:px-8 lg:pt-8">
          {hydrated ? children : <ShellSkeleton />}
        </main>
      </div>
    </div>
  );
}
