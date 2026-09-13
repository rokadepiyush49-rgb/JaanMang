import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Brand } from "@/components/brand";
import { ButtonLink } from "@/components/ui";
import { VerifyList } from "./verify-list";

export const metadata: Metadata = {
  title: "Was it fixed? — Jan Setu",
  description: "Confirm whether the work you reported was actually done.",
};

/**
 * The citizen's half of the loop.
 *
 * Reachable from the intake surface, and addressed only to people who filed a
 * report: the server decides who sees what here, and somebody who did not
 * report a problem gets an empty list rather than a refusal, because whether a
 * particular problem is awaiting verification is not their business either.
 */
export default async function VerifyPage() {
  const session = await getSession();
  if (!session) redirect("/signin?next=/report/verify");

  return (
    <main className="mx-auto min-h-dvh w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-10">
        <Brand href="/" subtitle="Citizen" />

        <h1 className="mt-8 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
          Was it fixed?
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          Work has finished on something you reported. You are being asked because you reported
          it — nobody else can answer for you, and the problem does not close until the people who
          raised it say it should.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/report/mine" icon="list" size="sm" tone="outline">
            Your reports
          </ButtonLink>
        </div>
      </header>

      <VerifyList />

      <footer className="mt-14 border-t border-line pt-6">
        <p className="text-xs leading-relaxed text-ink-muted">
          Your photographs and your answer are attached to the public record for this problem, and
          shown on the{" "}
          <Link className="font-semibold text-primary hover:underline" href="/">
            impact portal
          </Link>{" "}
          beside the government&rsquo;s own. Your name is not.
        </p>
      </footer>
    </main>
  );
}

export const dynamic = "force-dynamic";
