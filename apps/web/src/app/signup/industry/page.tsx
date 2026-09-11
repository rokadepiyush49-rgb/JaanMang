import type { Metadata } from "next";
import { IndustrySignupForm } from "@/components/auth/industry-signup";
import { fetchTaxonomy } from "@/lib/auth/registry";

export const metadata: Metadata = { title: "Industry sign-up" };

/**
 * Industry signup is the organisation and its representative — the match
 * profile comes after approval, in its own wizard, because it is five screens
 * of taxonomy and nobody should fill it in before they know they are in.
 */
export default async function IndustrySignupPage() {
  const taxonomy = await fetchTaxonomy();
  return <IndustrySignupForm taxonomy={taxonomy} />;
}

export const dynamic = "force-dynamic";
