"use client";

/**
 * Form primitives.
 *
 * The filled 16px-radius input already existed twice — as `inputClass` in
 * `/collaborate/new` and as a private `Field` in `/settings` — written out by
 * hand in both. These are the same control, promoted so the signup flows use
 * the design system rather than a fourth copy of it. Nothing here introduces a
 * new token, a new radius or a new colour.
 *
 * The one thing added is error state, because a signup form without one is a
 * form that fails silently.
 */

import { useId, type ComponentProps, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icon";
import { cx } from "@/components/ui";

export const fieldClass = cx(
  "h-12 w-full rounded-md border border-line bg-card-muted px-4 text-sm text-ink",
  "placeholder:text-ink-faint",
  "transition-[border-color,background-color,box-shadow] duration-150 ease-jm",
  "focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary focus:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-60",
);

const errorRing = "border-critical bg-critical/5 focus:border-critical focus:ring-critical";

function Shell({
  id,
  label,
  hint,
  error,
  required,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("min-w-0", className)}>
      <label className="label-caps mb-1.5 flex items-center gap-2 text-ink-faint" htmlFor={id}>
        {label}
        {required ? <span className="text-critical">*</span> : null}
        {optional ? (
          <span className="font-semibold tracking-normal normal-case text-ink-faint/80">
            optional
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-critical">
          <Icon className="mt-px shrink-0" name="warning" size={13} />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  optional,
  icon,
  className,
  inputClassName,
  ...rest
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  icon?: IconName;
  /** Wraps the whole field — grid spans go here. */
  className?: string;
  /** The control itself — padding for a trailing button goes here. */
  inputClassName?: string;
} & Omit<ComponentProps<"input">, "className">) {
  const id = useId();
  return (
    <Shell
      className={className}
      error={error}
      hint={hint}
      id={id}
      label={label}
      optional={optional}
      required={rest.required}
    >
      <div className="relative">
        {icon ? (
          <Icon
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-faint"
            name={icon}
            size={17}
          />
        ) : null}
        <input
          aria-invalid={error ? true : undefined}
          className={cx(fieldClass, icon && "pl-11", error && errorRing, inputClassName)}
          id={id}
          {...rest}
        />
      </div>
    </Shell>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  optional,
  className,
  ...rest
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
} & Omit<ComponentProps<"textarea">, "className">) {
  const id = useId();
  return (
    <Shell
      className={className}
      error={error}
      hint={hint}
      id={id}
      label={label}
      optional={optional}
      required={rest.required}
    >
      <textarea
        aria-invalid={error ? true : undefined}
        className={cx(fieldClass, "h-auto min-h-24 py-3 leading-relaxed", error && errorRing)}
        id={id}
        {...rest}
      />
    </Shell>
  );
}

export type Option = { value: string; label: string; detail?: string };

export function SelectField({
  label,
  hint,
  error,
  optional,
  options,
  placeholder = "Select…",
  className,
  ...rest
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  options: Option[];
  placeholder?: string;
  className?: string;
} & Omit<ComponentProps<"select">, "className" | "children">) {
  const id = useId();
  return (
    <Shell
      className={className}
      error={error}
      hint={hint}
      id={id}
      label={label}
      optional={optional}
      required={rest.required}
    >
      <div className="relative">
        <select
          aria-invalid={error ? true : undefined}
          className={cx(fieldClass, "appearance-none pr-10 font-semibold", error && errorRing)}
          id={id}
          {...rest}
        >
          <option disabled value="">
            {placeholder}
          </option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink-muted"
          name="chevron-down"
          size={16}
        />
      </div>
    </Shell>
  );
}

/**
 * A multi-select rendered as chips.
 *
 * Used for skills, CSR themes, capabilities and SDGs — every field where the
 * set is closed, the count matters and a person needs to see everything they
 * have chosen at once. A `<select multiple>` does none of those.
 */
export function ChipField({
  label,
  hint,
  error,
  optional,
  options,
  selected,
  onToggle,
  columns = false,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  options: Option[];
  selected: string[];
  onToggle: (value: string) => void;
  columns?: boolean;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="label-caps mb-2 flex items-center gap-2 text-ink-faint">
        {label}
        {optional ? (
          <span className="font-semibold tracking-normal normal-case text-ink-faint/80">
            optional
          </span>
        ) : null}
      </legend>
      <div className={cx("flex flex-wrap gap-2", columns && "grid grid-cols-1 sm:grid-cols-2")}>
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              aria-pressed={on}
              className={cx(
                "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-left text-xs font-semibold",
                "transition-colors duration-150 ease-jm",
                on
                  ? "bg-primary text-white shadow-level1"
                  : "bg-card-muted text-ink-muted ring-1 ring-line hover:text-ink",
                columns && "rounded-md px-4 py-3",
              )}
              key={o.value}
              onClick={() => onToggle(o.value)}
              type="button"
            >
              {on ? <Icon name="check" size={13} /> : null}
              <span className="min-w-0">
                {o.label}
                {o.detail ? (
                  <span
                    className={cx(
                      "mt-0.5 block text-[11px] leading-snug font-normal",
                      on ? "text-white/70" : "text-ink-faint",
                    )}
                  >
                    {o.detail}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {error ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-critical">
          <Icon name="warning" size={13} />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-2 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </fieldset>
  );
}

/**
 * A free-text tag input backed by suggestions.
 *
 * Skills need both: the suggestion list keeps the vocabulary consistent enough
 * for the match engine to work with, and the free-text path keeps a student
 * from being told their actual skill does not exist.
 */
export function TagField({
  label,
  hint,
  error,
  optional,
  suggestions,
  value,
  onChange,
  placeholder = "Type and press Enter",
  max = 20,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  suggestions: string[];
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const id = useId();
  const unused = suggestions.filter((s) => !value.includes(s)).slice(0, 14);

  function add(tag: string) {
    const clean = tag.trim();
    if (!clean || value.includes(clean) || value.length >= max) return;
    onChange([...value, clean]);
  }

  return (
    <div className="min-w-0">
      <label className="label-caps mb-1.5 flex items-center gap-2 text-ink-faint" htmlFor={id}>
        {label}
        {optional ? (
          <span className="font-semibold tracking-normal normal-case text-ink-faint/80">
            optional
          </span>
        ) : null}
        <span className="ml-auto font-semibold tracking-normal normal-case tabular-nums text-ink-faint/80">
          {value.length}/{max}
        </span>
      </label>

      {value.length ? (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              className="flex items-center gap-1.5 rounded-full bg-tint-mint px-3 py-1.5 text-xs font-semibold text-on-tint-mint"
              key={tag}
            >
              {tag}
              <button
                aria-label={`Remove ${tag}`}
                className="opacity-70 transition-opacity hover:opacity-100"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                type="button"
              >
                <Icon name="x" size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : null}

      <input
        aria-invalid={error ? true : undefined}
        className={cx(fieldClass, error && errorRing)}
        id={id}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(e.currentTarget.value);
            e.currentTarget.value = "";
          }
        }}
        placeholder={placeholder}
        type="text"
      />

      {unused.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {unused.map((s) => (
            <button
              className="rounded-full border border-dashed border-line-strong px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-primary hover:text-ink"
              key={s}
              onClick={() => add(s)}
              type="button"
            >
              + {s}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-critical">
          <Icon name="warning" size={13} />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-2 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}

/** The one place a form-level failure is shown. */
export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <p
      className="flex items-start gap-2 rounded-md bg-critical/10 px-3.5 py-3 text-sm font-medium text-critical"
      role="alert"
    >
      <Icon className="mt-0.5 shrink-0" name="warning" size={16} />
      {children}
    </p>
  );
}
