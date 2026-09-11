import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { IndustryOnboarding } from "@/components/auth/industry-onboarding";
import { requireSession } from "@/lib/auth/guard";
import { fetchTaxonomy } from "@/lib/auth/registry";

export const metadata: Metadata = { title: "Your match profile" };

/**
 * The industry match profile.
 *
 * Reachable while the account is still pending — a partner waiting on review
 * can use that time to fill this in, and the portal is more useful the moment
 * they are approved.
 */
export default async function IndustryOnboardingPage() {
  const session = await requireSession();
  if (session.surface !== "industry") redirect("/");

  const taxonomy = await fetchTaxonomy();
  return (
    <IndustryOnboarding
      companyName={session.organisation?.name ?? "your organisation"}
      homeState={session.organisation?.industryInfo?.geographies?.[0] ?? "Jharkhand"}
      pending={session.status === "pending"}
      taxonomy={taxonomy}
    />
  );
}

export const dynamic = "force-dynamic";
