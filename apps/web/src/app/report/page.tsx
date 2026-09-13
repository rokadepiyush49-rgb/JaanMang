import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { Brand } from "@/components/brand";
import { ReportForm } from "./report-form";

export const metadata: Metadata = {
  title: "Report a problem — Jan Setu",
  description:
    "Report a broken handpump, an unlit road, a school without a roof. No account needed. " +
    "Your report is grouped with everyone else's about the same thing, ranked on need, and " +
    "you are asked afterwards whether it was actually fixed.",
};

/**
 * The public intake page.
 *
 * Deliberately outside every route group with a shell. A person arriving here
 * has been sent a link, probably by somebody at the panchayat, and has no idea
 * what this product is — so the page is a headline, a form, and nothing else
 * to click. No navigation, no sign-in wall, no dashboard chrome.
 *
 * It is not in `proxy.ts`'s matcher, which is what keeps it reachable signed
 * out; that file's allow-list is the one place a route becomes protected.
 */
export default async function ReportPage() {
  const session = await getSession();

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-10">
        <Brand href="/" subtitle="Citizen" />

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Report a problem
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          A handpump that has stopped. A road washed out. A school with no roof. Write it in your
          own words, in any language — you do not need an account, and you do not need to know
          which department it belongs to.
        </p>
      </header>

      <ReportForm signedIn={Boolean(session)} />

      <footer className="mt-14 border-t border-line pt-6">
        <p className="text-xs leading-relaxed text-ink-muted">
          Reports are grouped with others about the same problem and ranked on how many people are
          affected and how under-served the village is — not on how many times something was
          reported. The full weighting is published at{" "}
          <Link className="font-semibold text-primary hover:underline" href="/">
            jansetu
          </Link>
          , because a ranking nobody can check is a ranking nobody should trust.
        </p>
      </footer>
    </main>
  );
}

export const dynamic = "force-dynamic";
