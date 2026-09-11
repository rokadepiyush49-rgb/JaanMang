import type { Metadata } from "next";
import { InstituteSignupForm } from "@/components/auth/institute-signup";
import { fetchInstitutions, fetchTaxonomy } from "@/lib/auth/registry";

export const metadata: Metadata = {
  title: "Register an institution",
  description:
    "Universities, colleges, polytechnics, ITIs and training institutes — register to manage your roster, your faculty and every student project from a validated citizen problem through to submission.",
};

/**
 * The vocabularies and the institution register are read on the server and
 * passed in as props, so the form opens with its options already present
 * instead of flashing empty selects — and so the list a registrar claims from
 * is the same list students picked their college from.
 */
export default async function InstituteSignupPage() {
  const [taxonomy, institutions] = await Promise.all([fetchTaxonomy(), fetchInstitutions()]);
  return <InstituteSignupForm institutions={institutions} taxonomy={taxonomy} />;
}
