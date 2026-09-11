import type { Metadata } from "next";
import { GovernmentSignupForm } from "@/components/auth/government-signup";
import { fetchDepartments, fetchJurisdictions, fetchTaxonomy } from "@/lib/auth/registry";

export const metadata: Metadata = { title: "Government sign-up" };

/**
 * Government signup collects the representative and the authority together,
 * because a reviewer cannot verify half an application.
 *
 * The reference data is fetched on the server and handed to the form, so the
 * cascading jurisdiction picker has its tree before the first paint.
 */
export default async function GovernmentSignupPage() {
  const [taxonomy, jurisdictions, departments] = await Promise.all([
    fetchTaxonomy(),
    fetchJurisdictions(),
    fetchDepartments(),
  ]);

  return (
    <GovernmentSignupForm
      departments={departments}
      jurisdictions={jurisdictions}
      taxonomy={taxonomy}
    />
  );
}

export const dynamic = "force-dynamic";
