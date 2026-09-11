"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BOTTOM_NAV, NAV_EXPLORE, NAV_MAIN, STUDENT } from "@/lib/data";
import { Brand } from "./brand";
import { Icon, type IconName } from "./icon";
import { LanguageSwitcher } from "./language-switcher";
import { Avatar, CircleButton, cx } from "./ui";
import { SearchField } from "./ui-interactive";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ============================================================== sidebar === */

/**
 * A navigation item, shaped like the app's bottom-bar destination: a pill that
 * fills with ink when selected, with the glyph and label reversed out of it.
 * Selection is marked three ways — the fill, the weight and the label colour —
 * so it survives greyscale and a bright screen.
 */
function NavItem({
  href,
  label,
  icon,
  badge,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  active: boolean;
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
      href={href}
      onClick={onNavigate}
    >
      <Icon name={icon} size={20} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
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

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto px-4 py-5">
      <Brand onClick={onNavigate} />

      <Link
        className="flex h-12 items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-white shadow-level1 transition-colors duration-150 ease-jm hover:bg-primary-hover"
        href="/collaborate/new"
        onClick={onNavigate}
      >
        <Icon name="plus" size={18} />
        New Collaboration
      </Link>

      <nav className="flex flex-col gap-1">
        {NAV_MAIN.map((item) => (
          <NavItem
            active={isActive(pathname, item.href)}
            badge={item.badge}
            href={item.href}
            icon={item.icon}
            key={item.href}
            label={item.label}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div>
        <p className="label-caps px-4 pb-2 text-ink-faint">Explore</p>
        <nav className="flex flex-col gap-1">
          {NAV_EXPLORE.map((item) => (
            <NavItem
              active={isActive(pathname, item.href)}
              href={item.href}
              icon={item.icon}
              key={item.href}
              label={item.label}
              onNavigate={onNavigate}
            />
          ))}
        </nav>
      </div>

      <div className="mt-auto flex flex-col gap-1 pt-4">
        <NavItem
          active={isActive(pathname, "/settings")}
          href="/settings"
          icon="settings"
          label="Settings"
          onNavigate={onNavigate}
        />
        <NavItem
          active={false}
          href="/profile"
          icon="help"
          label="Support"
          onNavigate={onNavigate}
        />

        {/* The person the session belongs to, as a pill row — the app's most
            distinctive shape, doing its most literal job. */}
        <Link
          className="mt-3 flex items-center gap-3 rounded-full bg-card-muted p-2 transition-colors duration-150 ease-jm hover:bg-container"
          href="/profile"
          onClick={onNavigate}
        >
          <Avatar name={STUDENT.name} size={38} />
          <span className="min-w-0 flex-1 leading-tight">
            <span className="block truncate text-sm font-bold text-ink">
              {STUDENT.name}
            </span>
            <span className="block truncate text-xs text-ink-muted">
              {STUDENT.institution}
            </span>
          </span>
          <Icon className="shrink-0 text-ink-muted" name="chevron-right" size={18} />
        </Link>
      </div>
    </div>
  );
}

/* =============================================================== topbar === */

function Topbar({ onMenu }: { onMenu: () => void }) {
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

      <div className="lg:hidden">
        <Brand compact />
      </div>

      <SearchField
        className="hidden max-w-xl flex-1 md:flex"
        label="Search Jan Setu"
        placeholder="Search opportunities, projects, challenges…"
        size="sm"
      />

      <div className="ml-auto flex items-center gap-2">
        <CircleButton badge href="/notifications" icon="bell" label="Notifications" />
        <span className="hidden lg:block">
          <CircleButton href="/achievements" icon="trophy" label="Achievements" />
        </span>
        <LanguageSwitcher />
        <Link
          className="hidden h-11 items-center rounded-full bg-card px-4 text-sm font-semibold text-ink shadow-level1 transition-colors duration-150 hover:bg-card-muted xl:flex"
          href="/profile"
        >
          Switch Role
        </Link>
        <Link aria-label="Your profile" className="rounded-full" href="/profile">
          <Avatar name={STUDENT.name} size={44} />
        </Link>
      </div>
    </header>
  );
}

/* ========================================================== bottom nav === */

/**
 * The web counterpart of the app's floating bottom bar: a rounded white bar
 * that sits above the content rather than being welded to the bottom edge,
 * with the primary action raised as a circle that breaks its top edge.
 *
 * Phone-only. On a tablet and up the sidebar carries navigation instead, so
 * the same destinations are never offered twice at once.
 */
function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-3 lg:hidden"
    >
      <div className="mx-auto flex h-16 max-w-130 items-stretch justify-around rounded-xl bg-card px-2 shadow-level3">
        {BOTTOM_NAV.map((item) => {
          const active = isActive(pathname, item.href);
          if (item.raised) {
            return (
              <Link
                aria-label={item.label}
                className="relative -mt-6 flex w-16 shrink-0 flex-col items-center justify-start"
                href={item.href}
                key={item.href}
              >
                <span className="flex size-14 items-center justify-center rounded-full border-4 border-card bg-primary text-white shadow-level2 transition-transform duration-150 ease-jm active:scale-95">
                  <Icon name={item.icon} size={24} />
                </span>
                <span className="mt-0.5 text-[11px] font-semibold tracking-[0.2px] text-ink-muted">
                  {item.label}
                </span>
              </Link>
            );
          }
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cx(
                "my-1.5 flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-full px-1 transition-colors duration-150 ease-jm",
                active ? "bg-primary text-white" : "text-ink-muted",
              )}
              href={item.href}
              key={item.href}
            >
              <Icon name={item.icon} size={22} />
              <span className="w-full truncate text-center text-[11px] font-semibold tracking-[0.2px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/* ================================================================ shell === */

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

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
      {/* The sidebar is a white card floating on the periwinkle page, the same
          figure-and-ground the app uses for every surface. */}
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
        {/* pb-28 is the app's `navClearance`: the floating bar must never sit
            on top of the last element of a page. */}
        <main className="flex-1 px-4 pt-6 pb-28 sm:px-6 lg:px-8 lg:pt-8 lg:pb-10">
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
