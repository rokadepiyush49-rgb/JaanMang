"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { NAV } from "@/lib/data";
import { LanguageSwitcher } from "./language-switcher";
import { Icon } from "./icon";
import { Avatar } from "./ui";

function Brand() {
  return (
    <Link className="flex items-center gap-3" href="/dashboard">
      <span className="flex size-11 items-center justify-center rounded-full bg-navy text-sm font-bold text-white">
        JS
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-bold text-ink">Jan Setu</span>
        <span className="label-caps block text-ink-faint">Jharkhand OS</span>
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={[
              "flex items-center gap-3 rounded-[0.5rem] px-4 py-3 text-sm font-semibold transition-colors",
              active
                ? "bg-primary text-white"
                : "text-ink-muted hover:bg-card-muted hover:text-ink",
            ].join(" ")}
            href={item.href}
            key={item.href}
            onClick={onNavigate}
          >
            <Icon name={item.icon} size={20} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 px-5 py-6">
      <Brand />
      <Link
        className="flex h-12 items-center justify-center gap-2 rounded-[0.5rem] bg-primary text-sm font-semibold text-white transition-colors hover:bg-navy"
        href="/collaborate/new"
        onClick={onNavigate}
      >
        <Icon name="plus" size={18} />
        New Collaboration
      </Link>
      <NavLinks onNavigate={onNavigate} />
      <div className="mt-auto space-y-1 border-t border-line pt-5">
        <Link
          className="flex items-center gap-3 rounded-[0.5rem] px-4 py-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-card-muted hover:text-ink"
          href="/profile"
          onClick={onNavigate}
        >
          <Icon name="settings" size={20} />
          Settings
        </Link>
        <Link
          className="flex items-center gap-3 rounded-[0.5rem] px-4 py-3 text-sm font-semibold text-ink-muted transition-colors hover:bg-card-muted hover:text-ink"
          href="/profile"
          onClick={onNavigate}
        >
          <Icon name="help" size={20} />
          Support
        </Link>
      </div>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur lg:px-8">
      <button
        aria-label="Open navigation"
        className="flex size-10 items-center justify-center rounded-[0.5rem] text-ink-muted hover:bg-card-muted lg:hidden"
        onClick={onMenu}
        type="button"
      >
        <Icon name="dashboard" size={20} />
      </button>

      <label className="relative flex max-w-xl flex-1 items-center">
        <Icon
          className="pointer-events-none absolute left-4 text-ink-faint"
          name="search"
          size={18}
        />
        <span className="sr-only">Search Jan Setu</span>
        <input
          className="h-11 w-full rounded-full border border-line bg-card-muted pr-4 pl-11 text-sm text-ink placeholder:text-ink-faint focus:border-navy focus:bg-card focus:outline-none"
          placeholder="Search projects, challenges, peers…"
          type="search"
        />
      </label>

      <div className="ml-auto flex items-center gap-1">
        {(["bell", "apps", "help"] as const).map((name) => (
          <button
            aria-label={name}
            className="hidden size-10 items-center justify-center rounded-full text-ink-muted hover:bg-card-muted hover:text-ink sm:flex"
            key={name}
            type="button"
          >
            <Icon name={name} size={20} />
          </button>
        ))}
        <span className="mx-2 hidden h-7 w-px bg-line sm:block" />
        <LanguageSwitcher />
        <button
          className="hidden h-10 items-center rounded-full border border-line px-4 text-sm font-semibold text-ink hover:border-navy md:flex"
          type="button"
        >
          Switch Role
        </button>
        <Avatar name="Aisha Patel" size={40} tone="navy" />
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-72 shrink-0 border-r border-line bg-surface lg:block">
        <div className="sticky top-0 h-screen">
          <SidebarBody />
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="relative h-full w-72 border-r border-line bg-surface shadow-level2">
            <SidebarBody onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setOpen(true)} />
        <main className="flex-1 px-4 py-8 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
