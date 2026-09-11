import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InstituteOnboardingForm } from "@/components/auth/institute-onboarding";
import { requireSession } from "@/lib/auth/guard";
import { fetchTaxonomy } from "@/lib/auth/registry";
import { SURFACE_HOME } from "@/lib/auth/surface";

export const metadata: Metadata = { title: "Set up your institution" };

/**
 * The wizard an institute administrator finishes before the portal opens.
 *
 * `requireSession` rather than `requireSurface`: this page must be reachable
 * precisely *because* the account is not yet allowed anywhere else. Anyone who
 * has already finished it, or who is not an institute administrator at all, is
 * sent to where they actually belong.
 */
export default async function InstituteOnboardingPage() {
  const session = await requireSession();
  if (session.surface !== "institute") redirect(SURFACE_HOME[session.surface]);
  if (session.onboarded) redirect("/institute");

  const taxonomy = await fetchTaxonomy();
  return <InstituteOnboardingForm taxonomy={taxonomy} />;
}
