"use client";

/**
 * The industry workspace shell.
 *
 * Same figure and ground as the citizen app and the government workspace —
 * white cards floating on the periwinkle page, pill navigation, 44px circular
 * controls, the ink fill marking the active destination. What changes is what
 * the chrome carries: an officer's header holds their jurisdiction, because
 * that is what their authority depends on; a partner's holds the CSR budget
 * still available and who they are signed in as, because that is what decides
 * whether the button they are about to press exists.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import { DemoBanner } from "@/components/demo-banner";
import { Avatar, Skeleton, cx } from "@/components/ui";
import { SearchField } from "@/components/ui-interactive";
import { rupees } from "@/lib/industry/format";
import { awaitingReview, csrBook, isOpen, openRequests, recommended } from "@/lib/industry/selectors";
import { matchContext } from "@/lib/industry/selectors";
import { useIndustry, USERS } from "@/lib/industry/store";
import { SignOutButton } from "@/components/auth/sign-out";
import { useSession } from "@/lib/auth/session-context";
import { useHydrated } from "@/lib/gov/use-now";

type BadgeKey = "opportunities" | "review" | "mentorship" | "messages" | "alerts";

type NavEntry = { href: string; label: string; icon: IconName; badge?: BadgeKey };

const GROUPS: { title?: string; items: NavEntry[] }[] = [
  {
    items: [
      { href: "/industry", label: "Home", icon: "dashboard" },
      { href: "/industry/discover", label: "Discover Challenges", icon: "search" },
      { href: "/industry/opportunities", label: "Impact Opportunities", icon: "target", badge: "opportunities" },
    ],
  },
  {
    title: "Commitments",
    items: [
      { href: "/industry/projects", label: "My Projects", icon: "clipboard", badge: "review" },
      { href: "/industry/funding", label: "Funding", icon: "banknote" },
      { href: "/industry/mentorship", label: "Mentorship", icon: "users", badge: "mentorship" },
    ],
  },
  {
    title: "Network",
    items: [
      { href: "/industry/universities", label: "Universities", icon: "graduation" },
      { href: "/industry/messages", label: "Messages", icon: "message", badge: "messages" },
    ],
  },
  {
    title: "Accountability",
    items: [
      { href: "/industry/impact", label: "Impact", icon: "bar-chart" },
      { href: "/industry/csr", label: "CSR Ledger", icon: "scale" },
    ],
  },
];

const FOOTER: NavEntry[] = [
  { href: "/industry/automation", label: "Automation", icon: "bot" },
  { href: "/industry/notifications", label: "Notifications", icon: "bell", badge: "alerts" },
  { href: "/industry/company", label: "Company Profile", icon: "factory" },
  { href: "/industry/settings", label: "Settings", icon: "settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/industry") return pathname === "/industry";
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
function IndustryBrand({ onClick }: { onClick?: () => void }) {
  return (
    <Link className="flex items-center gap-3 rounded-md" href="/industry" onClick={onClick}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Icon name="factory" size={22} />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-bold tracking-[-0.01em] text-ink">
          Jan Setu
        </span>
        <span className="label-caps block text-ink-faint">Industry</span>
      </span>
      <span className="sr-only">Jan Setu — Industry partner workspace</span>
    </Link>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { state, scored } = useIndustry();
  const session = useSession();
  const orgName = session?.organisation?.name ?? state.company.name;
  const orgSector = session?.organisation?.sector ?? state.company.sector;

  const context = matchContext(state.projects, state.assignments);
  const counts: Record<BadgeKey, number> = {
    opportunities: recommended(state.challenges, state.company, context, {
      engagedIds: state.projects.map((p) => p.challengeId),
    }).length,
    review: awaitingReview(state.projects).length,
    mentorship: openRequests(state.requests, state.assignments).length,
    messages: state.threads.reduce((s, t) => s + t.unread, 0),
    alerts: state.alerts.filter((a) => !a.read).length,
  };
  void scored;

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-4 py-5">
      <IndustryBrand onClick={onNavigate} />

      <Link
        className="flex h-12 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-white shadow-level1 transition-colors duration-150 ease-jm hover:bg-primary-hover"
        href="/industry/opportunities"
        onClick={onNavigate}
      >
        <Icon name="sparkles" size={18} />
        Today&rsquo;s opportunities
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
            badge={item.badge ? counts[item.badge] : undefined}
            entry={item}
            key={item.href}
            onNavigate={onNavigate}
          />
        ))}

        <SignOutButton variant="menu" />

        {/* The organisation this session belongs to — from the signed-in
            account's membership, falling back to the fixture until the portal
            reads its own data from the API. */}
        <Link
          className="mt-3 flex items-center gap-3 rounded-full bg-card-muted p-2 transition-colors duration-150 ease-jm hover:bg-container"
          href="/industry/company"
          onClick={onNavigate}
        >
          <Avatar name={orgName} size={38} tone="ink" />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-bold text-ink">{orgName}</span>
            <span className="block truncate text-xs text-ink-muted">{orgSector}</span>
          </span>
          <Icon className="shrink-0 text-ink-muted" name="chevron-right" size={18} />
        </Link>
      </div>
    </div>
  );
}

/**
 * The signed-in person, and what they may do.
 *
 * Not decoration: switching from the CSR lead to the engineering mentor removes
 * the funding buttons from every screen, because an engineer reviewing a
 * prototype has no authority to commit ₹6 L. The switcher makes that model
 * touchable rather than something a reader has to take on trust.
 */
function UserSwitch() {
  const { state, dispatch } = useIndustry();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-11 items-center gap-2 rounded-full bg-card px-3 text-sm font-semibold text-ink shadow-level1 transition-colors hover:bg-card-muted"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <Avatar name={state.user.name} size={28} />
        <span className="hidden max-w-36 truncate lg:inline">{state.user.name}</span>
        <Icon className="text-ink-muted" name="chevron-down" size={16} />
      </button>

      {open ? (
        <>
          <button
            aria-label="Close user switcher"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            type="button"
          />
          <ul
            className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg bg-card p-2 shadow-level3"
            role="listbox"
          >
            <li className="px-3 py-2 text-xs text-ink-muted">
              Switching user changes what this session can commit, approve and edit.
            </li>
            {USERS.map((u) => {
              const active = u.id === state.user.id;
              return (
                <li key={u.id}>
                  <button
                    aria-selected={active}
                    className={cx(
                      "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                      active ? "bg-primary-fixed" : "hover:bg-card-muted",
                    )}
                    onClick={() => {
                      dispatch({ type: "user/switch", userId: u.id });
                      setOpen(false);
                    }}
                    role="option"
                    type="button"
                  >
                    <Avatar name={u.name} size={34} tone={active ? "ink" : "navy"} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">{u.name}</span>
                      <span className="block truncate text-xs text-ink-muted">{u.title}</span>
                      <span className="label-caps mt-1 block text-ink-faint">
                        {u.permissions.length} permissions
                      </span>
                    </span>
                    {active ? (
                      <Icon className="mt-1 shrink-0 text-ink" name="check" size={16} />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}

/** The one number a CSR lead checks before opening anything else. */
function CsrPool() {
  const { state } = useIndustry();
  const book = csrBook(state.company, state.projects, state.challenges);
  const openCount = state.challenges.filter(isOpen).length;

  return (
    <Link
      className="hidden h-11 items-center gap-3 rounded-full bg-card px-4 shadow-level1 transition-colors hover:bg-card-muted xl:flex"
      href="/industry/csr"
      title={`${openCount} challenges are open to a partner`}
    >
      <span className="leading-tight">
        <span className="label-caps block text-ink-faint">CSR available</span>
        <span className="block text-sm font-bold text-ink tabular-nums">
          {rupees(book.available)}
        </span>
      </span>
      <span className="h-7 w-px bg-line" />
      <span className="leading-tight">
        <span className="label-caps block text-ink-faint">FY</span>
        <span className="block text-sm font-bold text-ink">{book.financialYear.replace("FY ", "")}</span>
      </span>
    </Link>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { state } = useIndustry();
  const unread = state.alerts.filter((a) => !a.read).length;

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
        <Icon className="text-ink" name="factory" size={22} />
      </span>

      <SearchField
        className="hidden max-w-md flex-1 md:flex"
        label="Search challenges, projects and universities"
        placeholder="Search a challenge, district, technology or university…"
        size="sm"
      />

      <div className="ml-auto flex items-center gap-2">
        <CsrPool />
        <UserSwitch />
        <Link
          aria-label={`Notifications, ${unread} unread`}
          className="relative flex size-11 items-center justify-center rounded-full bg-card text-ink shadow-level1 transition-colors hover:bg-card-muted"
          href="/industry/notifications"
        >
          <Icon name="bell" size={20} />
          {unread ? (
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton className="h-28" key={i} />
        ))}
      </div>
      <Skeleton className="h-44" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-80 xl:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export function IndustryShell({ children }: { children: React.ReactNode }) {
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
          <DemoBanner surface="industry" />
          {hydrated ? children : <ShellSkeleton />}
        </main>
      </div>
    </div>
  );
}
