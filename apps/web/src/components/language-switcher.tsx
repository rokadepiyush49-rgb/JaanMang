"use client";

/**
 * Language switcher for the app header.
 *
 * A listbox rather than a two-way toggle. A toggle is tempting with exactly
 * two languages, but it has to label itself with either the current language
 * or the one it switches to, and both readings are wrong half the time — a
 * button saying "हिंदी" is ambiguous about which state you are in. A list that
 * shows both with the active one checked cannot be misread, and it still
 * works when a third language lands.
 *
 * Each language is named in itself, never translated: someone looking for
 * Hindi is looking for "हिंदी", not for "Hindi" spelled out in a script they
 * were not reading.
 */

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { LOCALES, LOCALE_LABEL, LOCALE_SHORT } from "@/lib/i18n/locale";
import { useLocale } from "@/lib/i18n/use-locale";
import { stringsFor } from "@/lib/i18n/strings";

export function LanguageSwitcher() {
  const [locale, setLocale] = useLocale();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const t = stringsFor(locale);

  // Close on an outside click or Escape. Both are expected of a menu, and
  // without them the panel survives navigation clicks behind it.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t.language}
        className="flex h-10 items-center gap-1.5 rounded-full border border-line px-3 text-sm font-semibold text-ink hover:border-navy"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        type="button"
      >
        <Icon name="languages" size={17} />
        {LOCALE_SHORT[locale]}
      </button>

      {open ? (
        <ul
          aria-label={t.language}
          className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-md border border-line bg-card py-1 shadow-level2"
          role="listbox"
        >
          {LOCALES.map((option) => {
            const active = option === locale;
            return (
              <li key={option} role="none">
                <button
                  aria-selected={active}
                  className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors ${
                    active ? "font-semibold text-ink" : "text-ink-muted hover:bg-card-muted"
                  }`}
                  onClick={() => {
                    setLocale(option);
                    setOpen(false);
                  }}
                  role="option"
                  type="button"
                >
                  <span className="w-4 shrink-0">
                    {active ? <Icon className="text-navy" name="check" size={15} /> : null}
                  </span>
                  {LOCALE_LABEL[option]}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
