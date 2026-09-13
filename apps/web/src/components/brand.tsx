import Image from "next/image";
import Link from "next/link";
import { cx } from "./ui";

/**
 * The JanMaang lockup, drawn from the same artwork the Citizen app ships in
 * `assets/brand/`. Mark beside the wordmark, with the surface it belongs to
 * named underneath — the app says "Citizen", the student workspace says
 * "Student", the public report form says "Citizen" again.
 *
 * This component *is* a link. Do not wrap it in one: it renders an `<a>`, and
 * an `<a>` inside an `<a>` is invalid HTML that fails hydration outright
 * rather than merely looking wrong.
 */
export function Brand({
  href = "/dashboard",
  subtitle = "Student",
  compact = false,
  className,
  onClick,
}: {
  href?: string;
  /** The surface this lockup is standing on. */
  subtitle?: string;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      className={cx("flex items-center gap-3 rounded-md", className)}
      href={href}
      onClick={onClick}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
        <Image
          alt=""
          className="size-7 object-contain"
          height={28}
          priority
          src="/brand/janmaang_mark.png"
          width={28}
        />
      </span>
      {compact ? null : (
        <span className="leading-tight">
          <span className="block font-display text-lg font-bold tracking-[-0.01em] text-ink">
            Jan Setu
          </span>
          <span className="label-caps block text-ink-faint">{subtitle}</span>
        </span>
      )}
      <span className="sr-only">Jan Setu — {subtitle}</span>
    </Link>
  );
}
