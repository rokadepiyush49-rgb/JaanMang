import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Brand } from "@/components/brand";
import { ButtonLink } from "@/components/ui";
import { MyReports } from "./my-reports";

export const metadata: Metadata = {
  title: "Your reports — Jan Setu",
  description: "What happened to the problems you reported.",
};

/**
 * The other half of intake: what became of what you filed.
 *
 * A reporting tool that never tells you what happened to your report teaches
 * people that reporting is pointless, which is the failure mode this whole
 * product exists to avoid. This needs a session — it is somebody's own
 * reports — which is the one thing worth having an account for.
 */
export default async function MyReportsPage() {
  const session = await getSession();
  if (!session) redirect("/signin?next=/report/mine");

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-10">
        <Brand href="/" subtitle="Citizen" />

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Your reports
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Every problem you have reported, and what the panchayat has done about it since.
        </p>

        <div className="mt-6">
          <ButtonLink href="/report" icon="plus" size="sm" tone="outline">
            Report something else
          </ButtonLink>
        </div>
      </header>

      <MyReports />

      <footer className="mt-14 border-t border-line pt-6">
        <p className="text-xs leading-relaxed text-ink-muted">
          A vote is not a second report. Reporting says &ldquo;I have this problem&rdquo;; voting
          says &ldquo;I agree this matters&rdquo;. The ranking weighs them separately, and the{" "}
          <Link className="font-semibold text-primary hover:underline" href="/">
            published weighting
          </Link>{" "}
          says by how much.
        </p>
      </footer>
    </main>
  );
}

export const dynamic = "force-dynamic";
