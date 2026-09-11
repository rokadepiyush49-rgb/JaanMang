"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { cx } from "@/components/ui";

/**
 * Sign out.
 *
 * Calls `DELETE /api/session`, which revokes the refresh token server-side and
 * clears both cookies — not just a client-side redirect. `router.refresh()`
 * then throws away the cached server render, so the next paint cannot show a
 * fragment of the signed-in page.
 */
export function SignOutButton({
  variant = "button",
  className,
}: {
  variant?: "button" | "menu";
  className?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/session", { method: "DELETE" });
    } finally {
      router.replace("/signin");
      router.refresh();
    }
  }

  if (variant === "menu") {
    return (
      <button
        className={cx(
          "flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold",
          "text-ink-muted transition-colors duration-150 ease-jm hover:bg-card-muted hover:text-critical",
          className,
        )}
        disabled={busy}
        onClick={signOut}
        type="button"
      >
        <Icon name="log-out" size={20} />
        {busy ? "Signing out…" : "Sign out"}
      </button>
    );
  }

  return (
    <button
      className={cx(
        "flex items-center gap-2 rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-ink-muted",
        "shadow-level1 transition-colors duration-150 ease-jm hover:text-critical",
        className,
      )}
      disabled={busy}
      onClick={signOut}
      type="button"
    >
      <Icon name="log-out" size={17} />
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
