"use client";

/**
 * The government workspace shell.
 *
 * Same figure and ground as the citizen app — white cards floating on the
 * periwinkle page, pill navigation, 44px circular controls — but desktop-first
 * and denser: the sidebar carries live counts, and the topbar carries the two
 * things an officer's authority depends on, who they are and which jurisdiction
 * they are acting in.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import { Avatar, Skeleton, cx } from "@/components/ui";
import { SearchField } from "@/components/ui-interactive";
import { sla } from "@/lib/gov/format";
import { jurisdictionPath, LEVEL_LABEL } from "@/lib/gov/rbac";
import { govSeed, useGov } from "@/lib/gov/store";
import { useHydrated, useNow } from "@/lib/gov/use-now";

type NavEntry = { href: string; label: string; icon: IconName; badge?: "pending" | "alerts" | "sla" };

const GROUPS: { title?: string; items: NavEntry[] }[] = [
  {
    items: [
      { href: "/gov", label: "Overview", icon: "dashboard" },
      { href: "/gov/problems", label: "Problems", icon: "warning", badge: "pending" },
      { href: "/gov/priority", label: "Priority Queue", icon: "trending-up" },
      { href: "/gov/map", label: "Map", icon: "map" },
    ],
  },
  {
    title: "Delivery",
    items: [
      { href: "/gov/departments", label: "Departments", icon: "landmark" },
      { href: "/gov/officers", label: "Officers", icon: "users", badge: "sla" },
      { href: "/gov/projects", label: "Projects", icon: "clipboard" },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/gov/sponsorship", label: "Industry Sponsorship", icon: "factory" },
      { href: "/gov/funding", label: "Government Funding", icon: "banknote" },
    ],
  },
  {
    title: "Outcomes",
    items: [
      { href: "/gov/verification", label: "Citizen Feedback", icon: "thumbs-up" },
      { href: "/gov/impact", label: "Impact Analytics", icon: "bar-chart" },
    ],
  },
];

const FOOTER: NavEntry[] = [
  { href: "/gov/automation", label: "Automation Center", icon: "bot" },
  { href: "/gov/alerts", label: "Notifications", icon: "bell", badge: "alerts" },
  { href: "/gov/settings", label: "Settings", icon: "settings" },
];

function isActive(pathname: string, href: string) {
  if (href === "/gov") return pathname === "/gov";
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

/** The gov lockup — the citizen app's mark, named for the surface it opens. */
function GovBrand({ onClick }: { onClick?: () => void }) {
  return (
    <Link className="flex items-center gap-3 rounded-md" href="/gov" onClick={onClick}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-white">
        <Icon name="landmark" size={22} />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-bold tracking-[-0.01em] text-ink">
          Jan Setu
        </span>
        <span className="label-caps block text-ink-faint">Government</span>
      </span>
      <span className="sr-only">Jan Setu — Government workspace</span>
    </Link>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { state, ranked } = useGov();
  const hydrated = useHydrated();

  const counts = {
    pending: ranked.filter((p) => p.status === "pending_validation").length,
    alerts: state.alerts.filter((a) => !a.read).length,
    /* Clock-derived, so it waits for the client rather than being rendered
       twice from two different instants. */
    sla: hydrated ? ranked.filter((p) => sla(p.slaDueAt).breached).length : 0,
  };

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-4 py-5">
      <GovBrand onClick={onNavigate} />

      <Link
        className="flex h-12 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-white shadow-level1 transition-colors duration-150 ease-jm hover:bg-primary-hover"
        href="/gov/priority"
        onClick={onNavigate}
      >
        <Icon name="target" size={18} />
        Today&rsquo;s action queue
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
        <Link
          className="mt-3 flex items-center gap-3 rounded-full bg-card-muted p-2 transition-colors duration-150 ease-jm hover:bg-container"
          href="/gov/settings"
          onClick={onNavigate}
        >
          <Avatar name={state.user.name} size={38} />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-bold text-ink">{state.user.name}</span>
            <span className="block truncate text-xs text-ink-muted">
              {state.user.designation}
            </span>
          </span>
          <Icon className="shrink-0 text-ink-muted" name="chevron-right" size={18} />
        </Link>
      </div>
    </div>
  );
}

/**
 * The jurisdiction switch. It is not a cosmetic filter — it changes the signed
 * in officer, and with them the visible problem set and the permitted actions.
 * That is the RBAC model made touchable.
 */
function JurisdictionSwitch() {
  const { state, dispatch } = useGov();
  const [open, setOpen] = useState(false);
  const path = jurisdictionPath(state.user.jurisdictionId, govSeed.jurisdictions);

  return (
    <div className="relative">
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex h-11 items-center gap-2 rounded-full bg-card px-4 text-sm font-semibold text-ink shadow-level1 transition-colors hover:bg-card-muted"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <Icon className="text-ink-muted" name="map-pin" size={16} />
        <span className="max-w-28 truncate sm:max-w-52">{path[0]}</span>
        <span className="hidden rounded-full bg-primary-fixed px-2 py-0.5 text-[11px] font-bold text-on-primary-fixed-variant xl:inline">
          {LEVEL_LABEL[state.user.level]}
        </span>
        <Icon className="text-ink-muted" name="chevron-down" size={16} />
      </button>

      {open ? (
        <>
          <button
            aria-label="Close jurisdiction switcher"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
            type="button"
          />
          <ul
            className="absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-lg bg-card p-2 shadow-level3"
            role="listbox"
          >
            <li className="px-3 py-2 text-xs text-ink-muted">
              Switching jurisdiction changes what this session can see and approve.
            </li>
            {govSeed.users.map((u) => {
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
                      <span className="block truncate text-xs text-ink-muted">
                        {u.designation}
                      </span>
                      <span className="label-caps mt-1 block text-ink-faint">
                        {LEVEL_LABEL[u.level]} · {u.permissions.length} permissions
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

function Clock() {
  /* 0 until the client subscribes, so the server and the first client render
     agree and the time appears once it is real. */
  const tick = useNow(30_000);
  if (!tick) return <span className="hidden w-28 xl:block" />;
  const now = new Date(tick);
  return (
    <span className="hidden text-right leading-tight xl:block">
      <span className="block text-sm font-bold text-ink tabular-nums">
        {now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
      </span>
      <span className="block text-xs text-ink-muted">
        {now.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
      </span>
    </span>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { state } = useGov();
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
        <Icon className="text-ink" name="landmark" size={22} />
      </span>

      <SearchField
        className="hidden max-w-md flex-1 md:flex"
        label="Search the workspace"
        placeholder="Search problem ID, village, department…"
        size="sm"
      />

      <div className="ml-auto flex items-center gap-2">
        <Clock />
        <JurisdictionSwitch />
        <Link
          aria-label={`Notifications, ${unread} unread`}
          className="relative flex size-11 items-center justify-center rounded-full bg-card text-ink shadow-level1 transition-colors hover:bg-card-muted"
          href="/gov/alerts"
        >
          <Icon name="bell" size={20} />
          {unread ? (
            <span className="absolute top-2 right-2.5 size-2.5 rounded-full bg-critical ring-2 ring-card" />
          ) : null}
        </Link>
        {/* The drawer already carries the identity row on a phone; repeating
            it here is what pushes the header past the viewport. */}
        <Link aria-label="Your profile" className="hidden rounded-full sm:block" href="/gov/settings">
          <Avatar name={state.user.name} size={44} />
        </Link>
      </div>
    </header>
  );
}

/** The shape of a screen, held for the one frame before hydration. */
function ShellSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <Skeleton className="h-10 w-80" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 10 }, (_, i) => (
          <Skeleton className="h-28" key={i} />
        ))}
      </div>
      <Skeleton className="h-40" />
      <div className="grid gap-6 xl:grid-cols-3">
        <Skeleton className="h-72 xl:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export function GovShell({ children }: { children: React.ReactNode }) {
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
