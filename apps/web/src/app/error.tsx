"use client";

import { useEffect } from "react";
import { Button, ButtonLink, Card, Medallion } from "@/components/ui";

/**
 * The segment error boundary.
 *
 * Catches anything thrown while rendering a route below the root layout, which
 * in practice means a failed server fetch or a bad shape coming back from the
 * API. Before this existed, that was a blank page in production and the raw
 * Next overlay in development.
 *
 * Two things it deliberately does not do. It does not print `error.message` —
 * a server-side message can carry a connection string or a row that the reader
 * is not entitled to, and the digest is what actually identifies the failure in
 * the logs. And it does not offer "go back": the page they came from is the one
 * that just failed.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Until an error tracker is wired up, the browser console is the only place
    // this is recoverable from. `digest` is the key that ties it to the server log.
    console.error("[render error]", error.digest ?? "(no digest)", error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <Medallion icon="warning" tone="warning" />
        <h1 className="headline-md text-ink">Something went wrong here.</h1>
        <p className="text-sm text-ink-muted">
          This page could not be loaded. Nothing you were doing has been saved, and
          nothing has been changed on the server.
        </p>
        {error.digest ? (
          <p className="text-xs text-ink-muted">
            Reference <code className="font-mono">{error.digest}</code> — quote this if
            you report it.
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset} tone="primary">
            Try again
          </Button>
          <ButtonLink href="/" tone="ghost">
            Go home
          </ButtonLink>
        </div>
      </Card>
    </main>
  );
}
