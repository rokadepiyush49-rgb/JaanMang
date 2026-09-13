"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { cx } from "@/components/ui";
import { ReportError, setVote } from "@/lib/report/service";

/**
 * "I agree this matters."
 *
 * Deliberately not a like button, and the copy works hard to say so: a vote is
 * a different signal from a report, weighted differently, and a citizen who
 * thinks the two are the same will file a duplicate report instead of voting.
 *
 * Optimistic, because on the connections this is used over a spinner on a
 * single tap reads as a broken button. The server is idempotent in both
 * directions, so a double-tap costs nothing and a failure rolls the count back
 * to exactly what it was.
 */
export function VoteButton({
  problemId,
  initialCount,
  initialVoted,
  disabled,
  disabledReason,
}: {
  problemId: string;
  initialCount: number;
  initialVoted: boolean;
  /** Voting closes once a problem is resolved or refused. */
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [voted, setVoted] = useState(initialVoted);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    if (busy || disabled) return;

    const next = !voted;
    const previous = { voted, count };
    setVoted(next);
    setCount((c) => c + (next ? 1 : -1));
    setBusy(true);
    setError(null);

    try {
      const state = await setVote(problemId, next);
      // Reconcile with the server's count rather than keeping our guess: other
      // people have been voting while this page was open.
      setVoted(state.votedByMe);
      setCount(state.voteCount);
    } catch (cause) {
      setVoted(previous.voted);
      setCount(previous.count);
      setError(cause instanceof ReportError ? cause.message : "Could not record your vote.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0">
      <button
        aria-pressed={voted}
        className={cx(
          "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold",
          "transition-colors duration-150 ease-jm",
          disabled
            ? "cursor-not-allowed bg-card-muted text-ink-faint ring-1 ring-line"
            : voted
              ? "bg-primary text-white shadow-level1"
              : "bg-card-muted text-ink-muted ring-1 ring-line hover:text-ink",
        )}
        disabled={disabled || busy}
        onClick={() => void toggle()}
        title={disabled ? disabledReason : undefined}
        type="button"
      >
        <Icon name="thumbs-up" size={14} />
        {voted ? "You agree this matters" : "This matters to me too"}
        <span className="tabular-nums opacity-80">{count}</span>
      </button>

      {error ? (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-critical">
          <Icon className="mt-px shrink-0" name="warning" size={13} />
          {error}
        </p>
      ) : disabled && disabledReason ? (
        <p className="mt-1.5 text-xs text-ink-muted">{disabledReason}</p>
      ) : null}
    </div>
  );
}
