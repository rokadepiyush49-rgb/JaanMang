import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
import { cx } from "@/components/ui";

/**
 * The frame every authentication screen sits in.
 *
 * Each surface keeps its own lockup — the government mark the workspace uses,
 * the factory mark from the industry shell, the wordmark from the student
 * shell — so the transition from signing up to being inside is continuous
 * rather than a handoff between two products. Everything else (the periwinkle
 * page, the white card floating on it, the radius, the shadow) is the same
 * system as every other screen.
 */

export type AuthBrand = "platform" | "student" | "gov" | "industry" | "institute";

const BRAND: Record<AuthBrand, { icon: IconName; sub: string }> = {
  platform: { icon: "landmark", sub: "Jharkhand's societal innovation OS" },
  student: { icon: "graduation", sub: "Student workspace" },
  gov: { icon: "landmark", sub: "Government workspace" },
  industry: { icon: "factory", sub: "Industry portal" },
  institute: { icon: "book", sub: "Institute portal" },
};

export function AuthLockup({ brand = "platform" }: { brand?: AuthBrand }) {
  const b = BRAND[brand];
  return (
    <Link className="flex items-center gap-3 rounded-md" href="/">
      <span className="grid size-11 shrink-0 place-items-center rounded-md bg-ink text-card">
        <Icon name={b.icon} size={22} />
      </span>
      <span className="leading-tight">
        <span className="block font-display text-lg font-bold tracking-[-0.01em] text-ink">
          Jan Setu
        </span>
        <span className="label-caps block text-ink-faint">{b.sub}</span>
      </span>
    </Link>
  );
}

/**
 * A centred, single-column page for the short flows — sign in, the role
 * picker, the waiting room.
 */
export function AuthPage({
  brand,
  title,
  subtitle,
  children,
  footer,
  wide = false,
}: {
  brand?: AuthBrand;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <main
      className={cx(
        "mx-auto flex min-h-dvh w-full flex-col justify-center px-5 py-12 sm:px-6",
        wide ? "max-w-3xl" : "max-w-md",
      )}
    >
      <div className="mb-8">
        <AuthLockup brand={brand} />
      </div>
      <h1 className="headline-xl text-ink">{title}</h1>
      {subtitle ? <p className="mt-2 text-base text-ink-muted">{subtitle}</p> : null}
      <div className="mt-7">{children}</div>
      {footer ? <div className="mt-6">{footer}</div> : null}
    </main>
  );
}

/**
 * The wizard frame — a slim header with a back arrow, deliberately outside the
 * app shell.
 *
 * This is the shape `/collaborate` already uses, for the reason its own file
 * gives: a person mid-flow should not be looking at eleven other destinations.
 * Signup is exactly that situation.
 */
export function WizardFrame({
  brand,
  title,
  onBack,
  backHref,
  children,
}: {
  brand?: AuthBrand;
  title: string;
  onBack?: () => void;
  backHref?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex h-18 items-center gap-4 border-b border-line bg-surface/85 px-4 backdrop-blur lg:px-8">
        {backHref ? (
          <Link
            aria-label="Go back"
            className="flex size-10 items-center justify-center rounded-full text-ink hover:bg-card-muted"
            href={backHref}
          >
            <Icon name="arrow-left" size={22} />
          </Link>
        ) : onBack ? (
          <button
            aria-label="Go back"
            className="flex size-10 items-center justify-center rounded-full text-ink hover:bg-card-muted"
            onClick={onBack}
            type="button"
          >
            <Icon name="arrow-left" size={22} />
          </button>
        ) : (
          <span className="size-10" />
        )}
        <p className="text-xl font-bold text-ink">{title}</p>
        <div className="ml-auto hidden sm:block">
          <AuthLockup brand={brand} />
        </div>
      </header>
      <div className="mx-auto w-full max-w-3xl flex-1 px-5 py-8 sm:px-6 lg:py-12">{children}</div>
    </div>
  );
}
