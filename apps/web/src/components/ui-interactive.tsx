"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "./icon";
import { cx } from "./ui";

/* ============================================================ segmented === */

/**
 * The app's "Day · Week · Month · Year" toggle: a sliding ink pill under plain
 * text labels. Used for every period or view switch, so a filter never has to
 * invent its own shape.
 */
export function Segmented({
  segments,
  value,
  onChange,
  label,
  className,
}: {
  segments: string[];
  value: number;
  onChange: (index: number) => void;
  label?: string;
  className?: string;
}) {
  const index = Math.min(Math.max(value, 0), segments.length - 1);
  return (
    <div
      aria-label={label}
      className={cx(
        "relative inline-flex h-11 items-center rounded-full bg-container p-1",
        className,
      )}
      role="tablist"
    >
      <span
        aria-hidden="true"
        className="absolute top-1 bottom-1 rounded-full bg-primary transition-[left,width] duration-300 ease-jm"
        style={{
          left: `calc(${(index / segments.length) * 100}% + 4px)`,
          width: `calc(${100 / segments.length}% - 8px)`,
        }}
      />
      {segments.map((segment, i) => (
        <button
          aria-selected={i === index}
          className={cx(
            "relative z-1 flex-1 rounded-full px-4 text-sm whitespace-nowrap transition-colors duration-150 ease-jm",
            i === index ? "font-bold text-white" : "font-semibold text-ink-muted hover:text-ink",
          )}
          key={segment}
          onClick={() => onChange(i)}
          role="tab"
          type="button"
        >
          {segment}
        </button>
      ))}
    </div>
  );
}

/* ================================================================= tabs === */

export type TabItem = { id: string; label: string; count?: number };

/**
 * Tabs carry a pill indicator rather than an underline — the app themes
 * `TabBar` with a `primaryFixed` pill, and this is its web counterpart.
 */
export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: TabItem[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      role="tablist"
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            aria-selected={active}
            className={cx(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm whitespace-nowrap transition-colors duration-150 ease-jm",
              active
                ? "bg-primary-fixed font-bold text-on-primary-fixed"
                : "font-semibold text-ink-muted hover:bg-card-muted hover:text-ink",
            )}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span
                className={cx(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
                  active ? "bg-white/70 text-on-primary-fixed" : "bg-container text-ink-muted",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* =============================================================== search === */

/** A 16px-radius filled field with the glyph inside it, as the app draws it. */
export function SearchField({
  placeholder = "Search…",
  label,
  value,
  onChange,
  className,
  size = "md",
}: {
  placeholder?: string;
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  return (
    <div className={cx("relative flex items-center", className)}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Icon
        className="pointer-events-none absolute left-4 text-ink-muted"
        name="search"
        size={18}
      />
      <input
        className={cx(
          "w-full rounded-md border border-line bg-card-muted pr-4 pl-11 text-sm text-ink",
          "placeholder:text-line-strong",
          "transition-[border-color,background-color] duration-150 ease-jm",
          "focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary focus:outline-none",
          size === "sm" ? "h-11" : "h-12",
        )}
        id={id}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </div>
  );
}

/* ============================================================= dropdown === */

/** A filter select styled as a control, not as a browser default. */
export function Select({
  label,
  value,
  options,
  onChange,
  className,
  hideLabel = false,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
  hideLabel?: boolean;
}) {
  const id = useId();
  return (
    <div className={cx("min-w-0", className)}>
      <label
        className={cx("label-caps mb-1.5 block text-ink-faint", hideLabel && "sr-only")}
        htmlFor={id}
      >
        {label}
      </label>
      <div className="relative">
        <select
          className={cx(
            "h-12 w-full appearance-none rounded-md border border-line bg-card-muted pr-10 pl-4 text-sm font-semibold text-ink",
            "transition-[border-color,background-color] duration-150 ease-jm",
            "focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary focus:outline-none",
          )}
          id={id}
          onChange={(e) => onChange(e.target.value)}
          value={value}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <Icon
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-muted"
          name="chevron-down"
          size={16}
        />
      </div>
    </div>
  );
}

/**
 * An overflow menu anchored to its trigger. Closes on outside click and on
 * Escape, and returns focus to the trigger — a menu that traps the keyboard is
 * worse than no menu.
 */
export function Menu({
  label,
  icon = "more-vertical",
  items,
  align = "right",
}: {
  label: string;
  icon?: IconName;
  items: { label: string; icon?: IconName; onSelect?: () => void; danger?: boolean }[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={root}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label}
        className="flex size-9 items-center justify-center rounded-full text-ink-muted transition-colors duration-150 hover:bg-card-muted hover:text-ink"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <Icon name={icon} size={18} />
      </button>
      {open ? (
        <div
          className={cx(
            "absolute top-11 z-30 min-w-48 rounded-lg border border-line bg-card p-1.5 shadow-level3",
            align === "right" ? "right-0" : "left-0",
          )}
          role="menu"
        >
          {items.map((item) => (
            <button
              className={cx(
                "flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition-colors duration-150",
                item.danger
                  ? "text-critical hover:bg-critical-tint"
                  : "text-ink hover:bg-card-muted",
              )}
              key={item.label}
              onClick={() => {
                item.onSelect?.();
                setOpen(false);
              }}
              role="menuitem"
              type="button"
            >
              {item.icon ? <Icon name={item.icon} size={17} /> : null}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ================================================================ modal === */

/**
 * A dialog on a 34px-radius sheet behind an ink scrim — the app's
 * `dialogTheme` and `modalBarrierColor`, on a desktop centre position.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close dialog"
        className="absolute inset-0 bg-primary/32 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <div
        aria-modal="true"
        className="jm-enter relative m-0 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-xl bg-card shadow-level3 sm:m-4 sm:rounded-xl"
        role="dialog"
      >
        <div className="flex items-start gap-4 px-6 pt-6">
          <div className="min-w-0 flex-1">
            <h2 className="headline-lg text-ink">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
            ) : null}
          </div>
          <button
            aria-label="Close"
            className="-mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-card-muted hover:text-ink"
            onClick={onClose}
            type="button"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="flex flex-wrap justify-end gap-3 border-t border-line px-6 py-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ============================================================= collapse === */

/** A disclosure row, shaped like the app's expansion tile. */
export function Disclosure({
  title,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon?: IconName;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg bg-card-muted">
      <button
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        {icon ? (
          <span className="flex size-9 shrink-0 items-center justify-center rounded-sm bg-primary-fixed text-on-primary-fixed-variant">
            <Icon name={icon} size={18} />
          </span>
        ) : null}
        <span className="min-w-0 flex-1 font-semibold text-ink">{title}</span>
        <Icon
          className={cx(
            "shrink-0 text-ink-muted transition-transform duration-150 ease-jm",
            open && "rotate-180",
          )}
          name="chevron-down"
          size={18}
        />
      </button>
      {open ? <div className="px-5 pb-5 text-sm text-ink-muted">{children}</div> : null}
    </div>
  );
}

/* =============================================================== toggle === */

export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{label}</span>
        {description ? (
          <span className="block text-sm text-ink-muted">{description}</span>
        ) : null}
      </span>
      <input
        checked={checked}
        className="peer sr-only"
        onChange={(e) => onChange(e.target.checked)}
        type="checkbox"
      />
      <span
        className={cx(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-150 ease-jm",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-periwinkle peer-focus-visible:ring-offset-2",
          checked ? "bg-primary" : "border border-line bg-track",
        )}
      >
        <span
          className={cx(
            "absolute top-1 size-5 rounded-full bg-white shadow-level1 transition-[left] duration-150 ease-jm",
            checked ? "left-6" : "left-1",
          )}
        />
      </span>
    </label>
  );
}
