import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StudentOnboarding } from "@/components/auth/student-onboarding";
import { requireSession } from "@/lib/auth/guard";
import { fetchInstitutions, fetchTaxonomy } from "@/lib/auth/registry";

export const metadata: Metadata = { title: "Set up your profile" };

/**
 * The student wizard.
 *
 * Reachable only with a session but deliberately *not* behind `requireSurface`
 * — this is the screen an un-onboarded student is sent to, so gating it on
 * being onboarded would be a redirect loop.
 */
export default async function StudentOnboardingPage() {
  const session = await requireSession();
  if (session.surface !== "student" && session.surface !== "citizen") redirect("/");

  const [taxonomy, institutions] = await Promise.all([fetchTaxonomy(), fetchInstitutions()]);
  return (
    <StudentOnboarding
      firstName={session.displayName.split(" ")[0]}
      institutions={institutions}
      taxonomy={taxonomy}
    />
  );
}

export const dynamic = "force-dynamic";
