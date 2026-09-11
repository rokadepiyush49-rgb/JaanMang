import Link from "next/link";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { Icon, type IconName } from "./icon";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ============================================================== tokens === */

/**
 * The six tile washes from `JmTint`.
 *
 * Colour sorts a grid at a glance, but every surface that takes a tint also
 * carries its own icon and its own words, so the sorting survives greyscale
 * and colour-vision deficiency.
 */
export type Tint = "navy" | "orchid" | "amber" | "blue" | "clay" | "mint";

export const TINT: Record<Tint, { wash: string; well: string; hue: string }> = {
  navy: {
    wash: "bg-tint-navy text-on-tint-navy",
    well: "bg-periwinkle/20 text-on-tint-navy",
    hue: "bg-periwinkle",
  },
  orchid: {
    wash: "bg-tint-orchid text-on-tint-orchid",
    well: "bg-orchid/20 text-on-tint-orchid",
    hue: "bg-orchid",
  },
  amber: {
    wash: "bg-tint-amber text-on-tint-amber",
    well: "bg-amber/25 text-on-tint-amber",
    hue: "bg-amber",
  },
  blue: {
    wash: "bg-tint-blue text-on-tint-blue",
    well: "bg-brand-blue/20 text-on-tint-blue",
    hue: "bg-brand-blue",
  },
  clay: {
    wash: "bg-tint-clay text-on-tint-clay",
    well: "bg-clay/25 text-on-tint-clay",
    hue: "bg-clay",
  },
  mint: {
    wash: "bg-tint-mint text-on-tint-mint",
    well: "bg-mint/20 text-on-tint-mint",
    hue: "bg-mint",
  },
};

/**
 * Every status in the product resolves to one of these six tones — a light
 * tint behind a dark, legible foreground, never a saturated fill with white
 * text at badge sizes.
 */
export type Tone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "critical"
  | "gold";

const TONE_BADGE: Record<Tone, string> = {
  neutral: "bg-neutral-tint text-on-neutral-tint border-neutral/20",
  info: "bg-info-tint text-on-info-tint border-info/25",
  success: "bg-success-tint text-on-success-tint border-success/25",
  warning: "bg-warning-tint text-on-warning-tint border-warning/25",
  critical: "bg-critical-tint text-on-critical-tint border-critical/25",
  gold: "bg-gold-tint text-on-gold-tint border-gold/25",
};

/* Legacy tone names kept so screens written before the redesign keep working. */
const TAG_ALIAS: Record<string, Tone> = {
  neutral: "neutral",
  navy: "info",
  impact: "success",
  community: "warning",
  danger: "critical",
  soft: "info",
};

/* ================================================================ card === */

/**
 * The standard surface: pure white, 28px radius, no hairline, one wide and
 * very faint ink-tinted shadow.
 *
 * There is no border because there does not need to be one — the page beneath
 * is a periwinkle wash, and the value difference is what separates them.
 */
export function Card({
  className,
  children,
  tone = "plain",
  ...rest
}: ComponentProps<"section"> & { tone?: "plain" | "flat" | "emphasised" }) {
  return (
    <section
      className={cx(
        "rounded-lg bg-card",
        tone === "flat" && "shadow-none",
        tone === "plain" && "shadow-level1",
        tone === "emphasised" && "border border-primary/60 shadow-level2",
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  );
}

/** A card that is itself a link. Lifts to level 2 on hover, as in the app. */
export function CardLink({
  className,
  children,
  ...rest
}: ComponentProps<typeof Link>) {
  return (
    <Link
      className={cx(
        "group block rounded-lg bg-card shadow-level1 transition-shadow duration-150 ease-jm hover:shadow-level2",
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-wrap items-start justify-between gap-4 px-6 pt-6",
        className,
      )}
    >
      <div className="flex min-w-0 gap-3">
        {icon ? (
          <span className="mt-0.5 flex size-[30px] shrink-0 items-center justify-center rounded-[12px] bg-primary-fixed text-on-primary-fixed-variant">
            <Icon name={icon} size={17} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="headline-md text-ink">{title}</h2>
          {subtitle ? (
            <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

/**
 * "Community Pulse" / "Near You": a glyph in a tinted well, a title, and an
 * optional trailing action. The well is what makes a header read as a header
 * when it sits between two cards.
 */
export function SectionHeader({
  title,
  icon,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  title: string;
  icon?: IconName;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cx("flex items-center gap-3", className)}>
      {icon ? (
        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[12px] bg-primary-fixed text-on-primary-fixed-variant">
          <Icon name={icon} size={17} />
        </span>
      ) : null}
      {/* Wraps rather than truncates: a clipped section title tells the
          reader less than a two-line one. */}
      <h2 className="headline-md min-w-0 flex-1 text-balance text-ink">{title}</h2>
      {actionLabel && actionHref ? (
        <Link
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-2 py-1.5 text-sm font-semibold text-navy transition-colors hover:bg-navy/8"
          href={actionHref}
        >
          {actionLabel}
          <Icon name="chevron-right" size={16} />
        </Link>
      ) : actionLabel ? (
        <button
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md px-2 py-1.5 text-sm font-semibold text-navy transition-colors hover:bg-navy/8"
          onClick={onAction}
          type="button"
        >
          {actionLabel}
          <Icon name="chevron-right" size={16} />
        </button>
      ) : null}
    </div>
  );
}

/* ============================================================== button === */

type ButtonTone =
  | "primary"
  | "outline"
  | "ghost"
  | "impact"
  | "danger"
  | "tonal";

const TONES: Record<ButtonTone, string> = {
  /* Ink fill, white label — the one primary action on a screen. */
  primary:
    "bg-primary text-white shadow-level1 hover:bg-primary-hover hover:shadow-level2 active:bg-primary",
  /* Light surface, ink label, hairline — everything secondary. */
  outline:
    "border border-line-strong bg-card text-primary hover:border-primary hover:bg-card-muted",
  ghost: "text-ink-muted hover:bg-primary/8 hover:text-ink",
  /* The pale periwinkle pill — a quiet third weight. */
  tonal: "bg-primary-fixed text-on-primary-fixed-variant hover:bg-navy-tint",
  impact: "bg-impact-deep text-white hover:bg-on-success-tint",
  danger: "bg-danger text-white hover:bg-on-critical-tint",
};

const SIZES = {
  /* Hit.controlDense · Hit.min · Hit.control */
  sm: "h-10 px-4 text-sm gap-1.5",
  md: "h-12 px-5 text-[15px] gap-2",
  lg: "h-[54px] px-7 text-base gap-2.5",
};

type ButtonBase = {
  tone?: ButtonTone;
  size?: keyof typeof SIZES;
  icon?: IconName;
  iconAfter?: IconName;
  children: ReactNode;
  className?: string;
};

function buttonClass({ tone = "primary", size = "md", className }: ButtonBase) {
  return cx(
    "inline-flex items-center justify-center rounded-md font-semibold whitespace-nowrap",
    "transition-[background-color,border-color,box-shadow,color] duration-150 ease-jm",
    "disabled:pointer-events-none disabled:opacity-45",
    TONES[tone],
    SIZES[size],
    className,
  );
}

export function Button({
  tone,
  size,
  icon,
  iconAfter,
  children,
  className,
  ...rest
}: ButtonBase & Omit<ComponentProps<"button">, "children" | "className">) {
  return (
    <button
      className={buttonClass({ tone, size, className, children })}
      {...rest}
    >
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
      {iconAfter ? <Icon name={iconAfter} size={18} /> : null}
    </button>
  );
}

export function ButtonLink({
  tone,
  size,
  icon,
  iconAfter,
  children,
  className,
  ...rest
}: ButtonBase & Omit<ComponentProps<typeof Link>, "children" | "className">) {
  return (
    <Link className={buttonClass({ tone, size, className, children })} {...rest}>
      {icon ? <Icon name={icon} size={18} /> : null}
      {children}
      {iconAfter ? <Icon name={iconAfter} size={18} /> : null}
    </Link>
  );
}

/**
 * The 44px circle with a glyph in it — the header control of the whole
 * product. One shape, one size, everywhere.
 */
export function CircleButton({
  icon,
  label,
  badge = false,
  filled = false,
  size = 44,
  href,
  onClick,
  className,
}: {
  icon: IconName;
  label: string;
  badge?: boolean;
  filled?: boolean;
  size?: number;
  href?: string;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <>
      <Icon name={icon} size={Math.round(size * 0.45)} />
      {badge ? (
        <span
          aria-hidden="true"
          className={cx(
            "absolute top-[22%] right-[22%] size-[9px] rounded-full border-[1.5px] bg-critical",
            filled ? "border-primary" : "border-card",
          )}
        />
      ) : null}
    </>
  );
  const classes = cx(
    "relative inline-flex shrink-0 items-center justify-center rounded-full",
    "transition-[background-color,box-shadow,transform] duration-150 ease-jm active:scale-[0.92]",
    filled
      ? "bg-primary text-white shadow-level1 hover:bg-primary-hover"
      : "bg-card text-ink shadow-level1 hover:bg-card-muted",
    className,
  );
  const style: CSSProperties = { width: size, height: size };

  if (href) {
    return (
      <Link aria-label={label} className={classes} href={href} style={style} title={label}>
        {inner}
      </Link>
    );
  }
  return (
    <button
      aria-label={label}
      className={classes}
      onClick={onClick}
      style={style}
      title={label}
      type="button"
    >
      {inner}
    </button>
  );
}

/* =============================================================== badge === */

/**
 * A pill status badge: tinted background, dark legible label, and — wherever
 * the status carries consequence — an icon, so the meaning never rests on
 * colour alone.
 */
export function Badge({
  tone = "neutral",
  icon,
  children,
  dense = false,
  className,
}: {
  tone?: Tone;
  icon?: IconName;
  children: ReactNode;
  dense?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border font-semibold tracking-[0.05em] whitespace-nowrap",
        dense ? "px-2 py-[3px] text-[11px]" : "px-2.5 py-[5px] text-xs",
        TONE_BADGE[tone],
        className,
      )}
    >
      {icon ? <Icon name={icon} size={dense ? 11 : 13} /> : null}
      {children}
    </span>
  );
}

/** @deprecated Use `Badge`. Kept so pre-redesign screens keep rendering. */
export function Tag({
  tone = "neutral",
  icon,
  children,
  className,
}: {
  tone?: string;
  icon?: IconName;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Badge className={className} icon={icon} tone={TAG_ALIAS[tone] ?? "neutral"}>
      {children}
    </Badge>
  );
}

/* ============================================================ progress === */

export function Progress({
  value,
  tone = "navy",
  size = "md",
  className,
  label,
}: {
  value: number;
  tone?: "navy" | "impact" | "community" | Tint;
  size?: "sm" | "md";
  className?: string;
  label?: string;
}) {
  const fill =
    {
      navy: "bg-primary",
      impact: "bg-mint",
      community: "bg-clay",
      orchid: "bg-orchid",
      amber: "bg-amber",
      blue: "bg-brand-blue",
      clay: "bg-clay",
      mint: "bg-mint",
    }[tone as string] ?? "bg-primary";
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(pct)}
      className={cx(
        "w-full overflow-hidden rounded-full bg-track",
        size === "sm" ? "h-1.5" : "h-2",
        className,
      )}
      role="progressbar"
    >
      <div
        className={cx(
          "h-full rounded-full transition-[width] duration-700 ease-jm",
          fill,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * One factor on a scoring card: a label, a right-aligned tabular score, and a
 * thin track filled to that score.
 */
export function MetricBar({
  label,
  score,
  explanation,
  tone = "navy",
  suffix = "",
}: {
  label: string;
  score: number;
  explanation?: string;
  tone?: "navy" | "impact" | "community" | Tint;
  suffix?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink-muted">{label}</span>
        <span className="mono-data text-ink">
          {score}
          {suffix}
        </span>
      </div>
      <Progress className="mt-1.5" label={label} size="sm" tone={tone} value={score} />
      {explanation ? (
        <p className="mt-1.5 text-xs text-ink-muted">{explanation}</p>
      ) : null}
    </div>
  );
}

/* =============================================================== tiles === */

/**
 * One cell of the coloured stat grid: a glyph in a round well, the figure
 * large beside it, the label beneath.
 */
export function TintTile({
  icon,
  value,
  label,
  tint = "navy",
  href,
  delta,
}: {
  icon: IconName;
  value: string;
  label: string;
  tint?: Tint;
  href?: string;
  delta?: string;
}) {
  const t = TINT[tint];
  const body = (
    <>
      <div className="flex items-center gap-3">
        <span
          className={cx(
            "flex size-8 shrink-0 items-center justify-center rounded-sm",
            t.well,
          )}
        >
          <Icon name={icon} size={17} />
        </span>
        <span className="stat-number ml-auto truncate">{value}</span>
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold opacity-90">
        <span className="truncate">{label}</span>
        {delta ? (
          <span className="ml-auto shrink-0 text-xs font-semibold opacity-80">
            {delta}
          </span>
        ) : null}
      </p>
    </>
  );

  const classes = cx(
    "block rounded-lg p-3.5 transition-transform duration-150 ease-jm",
    t.wash,
    href && "hover:-translate-y-0.5",
  );

  return href ? (
    <Link className={classes} href={href}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

/** White stat card: a tinted icon well, a large tabular figure, a caption. */
export function StatTile({
  icon,
  label,
  value,
  tone = "navy",
  hint,
}: {
  icon: IconName;
  label: string;
  value: string;
  tone?: "navy" | "impact" | "community" | Tint;
  hint?: string;
}) {
  const map: Record<string, Tint> = {
    navy: "navy",
    impact: "mint",
    community: "clay",
  };
  const t = TINT[map[tone] ?? (tone as Tint)] ?? TINT.navy;
  return (
    <Card className="flex items-center gap-4 p-5">
      <span
        className={cx(
          "flex size-12 shrink-0 items-center justify-center rounded-full",
          t.wash,
        )}
      >
        <Icon name={icon} size={22} />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm text-ink-muted">{label}</p>
        <p className="stat-number text-ink">{value}</p>
        {hint ? <p className="text-xs text-ink-faint">{hint}</p> : null}
      </div>
    </Card>
  );
}

/**
 * A single headline proportion with a label, a supporting line and a track —
 * the app's "Progress 67%" card.
 */
export function ProgressCard({
  icon,
  label,
  detail,
  percent,
  footnote,
  tint = "navy",
}: {
  icon: IconName;
  label: string;
  detail: string;
  percent: number;
  footnote?: string;
  tint?: Tint;
}) {
  const t = TINT[tint];
  const pct = Math.min(100, Math.max(0, percent));
  return (
    <div className="rounded-lg bg-card-muted p-4">
      <div className="flex items-center gap-3">
        <span
          className={cx(
            "flex size-11 shrink-0 items-center justify-center rounded-[12px]",
            t.wash,
          )}
        >
          <Icon name={icon} size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">{label}</p>
          <p className="line-clamp-2 text-sm text-ink-muted">{detail}</p>
        </div>
        <p className="stat-number shrink-0 text-ink">
          {pct}
          <span className="text-base font-bold text-ink-muted">%</span>
        </p>
      </div>
      <Progress className="mt-4" label={label} tone={tint} value={pct} />
      {footnote ? (
        <p className="mt-2 text-xs text-ink-muted">{footnote}</p>
      ) : null}
    </div>
  );
}

/* ============================================================ pill row === */

/**
 * The fully rounded list row — a circular badge, a title over a subtitle, and
 * a chevron in its own circle at the right.
 *
 * The app's most distinctive component and the shape of every navigable item
 * in the product. The `dark` variant is reserved for the one row a screen most
 * wants you to press.
 */
export function PillRow({
  icon,
  title,
  subtitle,
  href,
  tint = "navy",
  dark = false,
  trailing,
  className,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  href?: string;
  tint?: Tint;
  dark?: boolean;
  trailing?: ReactNode;
  className?: string;
}) {
  const t = TINT[tint];
  const body = (
    <>
      <span
        className={cx(
          "flex size-11 shrink-0 items-center justify-center rounded-full",
          dark ? "bg-white text-primary" : t.wash,
        )}
      >
        <Icon name={icon} size={22} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cx(
            "block truncate font-bold",
            dark ? "text-white" : "text-ink",
          )}
        >
          {title}
        </span>
        {subtitle ? (
          <span
            className={cx(
              "block truncate text-sm",
              dark ? "text-white/72" : "text-ink-muted",
            )}
          >
            {subtitle}
          </span>
        ) : null}
      </span>
      {trailing ?? (
        <span
          className={cx(
            "flex size-[34px] shrink-0 items-center justify-center rounded-full",
            dark ? "bg-white/16 text-white" : "bg-container text-ink-muted",
          )}
        >
          <Icon name="chevron-right" size={19} />
        </span>
      )}
    </>
  );

  const classes = cx(
    "flex items-center gap-4 rounded-full p-3",
    "transition-[box-shadow,background-color] duration-150 ease-jm",
    dark
      ? "bg-primary shadow-level2 hover:bg-primary-hover"
      : "bg-card shadow-level1 hover:shadow-level2",
    className,
  );

  return href ? (
    <Link className={classes} href={href}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}

/* ============================================================== avatar === */

export function Avatar({
  name,
  tone = "navy",
  size = 40,
  src,
  className,
}: {
  name: string;
  tone?: "navy" | "impact" | "community" | "muted" | "ink";
  size?: number;
  src?: string;
  className?: string;
}) {
  const words = name.trim().split(/\s+/);
  // Short codes ("RU", "VB") are already initials — pass them through.
  const initials =
    words.length === 1 && name.length <= 3
      ? name.toUpperCase()
      : words
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase();
  const chip = {
    navy: "bg-primary-fixed text-on-primary-fixed-variant",
    ink: "bg-primary text-white",
    impact: "bg-tint-mint text-on-tint-mint",
    community: "bg-tint-clay text-on-tint-clay",
    muted: "bg-container text-ink-muted",
  }[tone];
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
        chip,
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="size-full object-cover" src={src} />
      ) : (
        initials
      )}
    </span>
  );
}

/* ======================================================== page heading === */

/**
 * The two-tone display headline the app uses to open a screen: the first
 * phrase in medium weight, the emphasis in bold. Kept to one per page — it is
 * the loudest type in the product and it stops being loud when there are two.
 */
export function PageHeading({
  title,
  emphasis,
  subtitle,
  breadcrumb,
  actions,
}: {
  title: string;
  emphasis?: string;
  subtitle?: string;
  breadcrumb?: string[];
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {breadcrumb ? (
          <nav className="label-caps mb-2 flex flex-wrap items-center gap-2 text-ink-faint">
            {breadcrumb.map((crumb, i) => (
              <span className="flex items-center gap-2" key={crumb}>
                {i > 0 ? <Icon name="chevron-right" size={12} /> : null}
                {crumb}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="headline-xl text-ink lg:display-xl">
          <span className="font-medium">{title}</span>
          {emphasis ? <span className="font-bold"> {emphasis}</span> : null}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-2xl text-base text-ink-muted">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}

/* ============================================================== states === */

/** The 68px tinted circle that heads every empty and error state. */
export function Medallion({
  icon,
  tone = "info",
  size = 68,
}: {
  icon: IconName;
  tone?: Tone;
  size?: number;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center justify-center rounded-full border",
        TONE_BADGE[tone],
      )}
      style={{ width: size, height: size }}
    >
      <Icon name={icon} size={Math.round(size * 0.44)} />
    </span>
  );
}

/**
 * Empty state — a tinted medallion, a title, a supporting line and, where
 * there is one, the action that would fill it.
 */
export function EmptyState({
  icon,
  title,
  message,
  tone = "info",
  actionLabel,
  actionHref,
  className,
}: {
  icon: IconName;
  title: string;
  message: string;
  tone?: Tone;
  actionLabel?: string;
  actionHref?: string;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col items-center px-6 py-10 text-center",
        className,
      )}
    >
      <Medallion icon={icon} tone={tone} />
      <p className="headline-md mt-4 text-ink">{title}</p>
      <p className="mt-1 max-w-80 text-sm text-ink-muted">{message}</p>
      {actionLabel && actionHref ? (
        <ButtonLink className="mt-6 min-w-50" href={actionHref} size="lg">
          {actionLabel}
        </ButtonLink>
      ) : null}
    </div>
  );
}

/** @deprecated Use `EmptyState`. Kept for pre-redesign callers. */
export function EmptyNote({
  icon,
  children,
}: {
  icon: IconName;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg bg-card-muted px-6 py-10 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-neutral-tint text-on-neutral-tint">
        <Icon name={icon} size={22} />
      </span>
      <p className="max-w-xs text-sm text-ink-muted">{children}</p>
    </div>
  );
}

/**
 * A skeleton block. Holds the shape of content that is on its way, so a list
 * does not collapse and then jump when it arrives. The sweep is slow and
 * low-contrast — this is a loading state, not an event.
 */
export function Skeleton({
  className,
  rounded = "sm",
}: {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "full";
}) {
  return (
    <div
      className={cx(
        "jm-skeleton",
        { sm: "rounded-sm", md: "rounded-md", lg: "rounded-lg", full: "rounded-full" }[
          rounded
        ],
        className,
      )}
    />
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div aria-label="Loading" className="flex flex-col gap-2" role="status">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton className="h-24 w-full" key={i} rounded="lg" />
      ))}
    </div>
  );
}

/* =============================================================== table === */

export function Table({
  head,
  children,
  className,
}: {
  head: ReactNode[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("-mx-1 overflow-x-auto px-1", className)}>
      <table className="w-full min-w-160 border-collapse text-left">
        <thead>
          <tr>
            {head.map((cell, i) => (
              <th
                className="label-caps border-b border-line px-4 py-3 text-ink-faint first:pl-5 last:pr-5"
                key={i}
                scope="col"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cx(
        "border-b border-line last:border-0 hover:bg-card-muted",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function Cell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      className={cx(
        "px-4 py-3.5 text-sm text-ink first:pl-5 last:pr-5",
        className,
      )}
    >
      {children}
    </td>
  );
}

/* =========================================================== animation === */

/**
 * The fade-and-rise entrance, staggered by position — the app's `JmEnter`.
 * Reduce-motion is honoured globally in `globals.css`.
 */
export function Enter({
  index = 0,
  children,
  className,
}: {
  index?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      /* `min-w-0` because this wrapper usually sits directly inside a grid or
         flex parent: without it the child's min-content floor sizes the track,
         and one long unbreakable label pushes the whole page sideways on a
         phone. */
      className={cx("jm-enter min-w-0", className)}
      /* 60ms per sibling, as `Motion.stagger` defines — capped so a long
         grid never leaves its last card waiting half a second. */
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
    >
      {children}
    </div>
  );
}
