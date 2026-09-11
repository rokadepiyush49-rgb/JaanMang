import { Icon } from "@/components/icon";
import { cx } from "@/components/ui";

/**
 * The wizard step indicator.
 *
 * `components/stepper.tsx` does exactly this but with the three collaboration
 * steps hard-coded in the module. This is the same visual, given its labels —
 * the signup flows have between two and four steps depending on the role.
 */
export function Steps({
  steps,
  current,
}: {
  steps: readonly string[];
  current: number;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-3">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li className="flex items-center gap-3" key={label}>
            {i > 0 ? (
              <span
                className={cx("hidden h-px w-8 sm:block", done || active ? "bg-primary" : "bg-line")}
              />
            ) : null}
            <span
              className={cx(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                done || active ? "bg-primary text-white" : "bg-card-muted text-ink-faint",
              )}
            >
              {done ? <Icon name="check" size={16} /> : n}
            </span>
            <span
              className={cx(
                "text-sm font-semibold",
                active ? "text-ink" : "text-ink-muted",
                !active && "hidden sm:inline",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
