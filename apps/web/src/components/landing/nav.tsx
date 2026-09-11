"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { cx } from "@/components/ui";

const LINKS = [
  { href: "#why", label: "Why" },
  { href: "#flow", label: "How it works" },
  { href: "#impact", label: "Impact" },
  { href: "#audiences", label: "Who it's for" },
];

/**
 * The public header.
 *
 * Transparent over the hero and opaque once the page scrolls, so the hero
 * reads as one composition and the nav stays legible over everything after it.
 * Sign in and Create account are present from the first pixel — the two things
 * a visitor is most likely to want should never be a scroll away.
 */
export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cx(
        "sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-200 ease-jm",
        scrolled ? "bg-surface/85 shadow-level1 backdrop-blur" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-18 max-w-6xl items-center gap-4 px-5 sm:px-8">
        <Link className="flex items-center gap-3" href="/">
          <span className="grid size-10 place-items-center rounded-md bg-ink text-card">
            <Icon name="landmark" size={20} />
          </span>
          <span className="font-display text-lg font-bold tracking-[-0.01em] text-ink">
            Jan Setu
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-ink-muted transition-colors hover:bg-card hover:text-ink"
              href={l.href}
              key={l.href}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            className="hidden h-11 items-center rounded-full px-4 text-sm font-semibold text-ink-muted transition-colors hover:text-ink sm:flex"
            href="/signin"
          >
            Sign in
          </Link>
          <Link
            className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white shadow-level1 transition-colors duration-150 ease-jm hover:bg-primary-hover"
            href="/signup"
          >
            Get started
            <Icon className="hidden sm:block" name="arrow-right" size={16} />
          </Link>
          <button
            aria-expanded={open}
            aria-label="Menu"
            className="flex size-11 items-center justify-center rounded-full text-ink lg:hidden"
            onClick={() => setOpen((v) => !v)}
            type="button"
          >
            <Icon name={open ? "x" : "apps"} size={21} />
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-line bg-card px-5 py-3 lg:hidden">
          {[...LINKS, { href: "/signin", label: "Sign in" }].map((l) => (
            <Link
              className="block rounded-md px-3 py-2.5 text-sm font-semibold text-ink-muted hover:bg-card-muted hover:text-ink"
              href={l.href}
              key={l.href}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
