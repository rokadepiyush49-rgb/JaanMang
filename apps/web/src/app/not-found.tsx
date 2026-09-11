import type { Metadata } from "next";
import { ButtonLink, Card, Medallion } from "@/components/ui";

export const metadata: Metadata = { title: "Page not found" };

/**
 * 404.
 *
 * Also what `notFound()` renders — a problem id or a team id that does not
 * exist, or that exists outside the reader's jurisdiction. The copy has to hold
 * for both, so it says the page is not available rather than that it does not
 * exist: "no such problem" and "not your district" must look identical from
 * outside, or the 404 becomes a way to enumerate records.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="flex max-w-md flex-col items-center gap-4 p-8 text-center">
        <Medallion icon="search" tone="info" />
        <h1 className="headline-md text-ink">This page isn&rsquo;t available.</h1>
        <p className="text-sm text-ink-muted">
          The link may be out of date, or the record may not be one your account can
          see.
        </p>
        <ButtonLink className="mt-2 min-w-50" href="/" size="lg">
          Go home
        </ButtonLink>
      </Card>
    </main>
  );
}
