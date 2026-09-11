import type { Metadata } from "next";
import { StudentSignupForm } from "@/components/auth/student-signup";

export const metadata: Metadata = { title: "Student sign-up" };

/**
 * Student signup: four fields.
 *
 * Institution, branch, year, district and skills are all genuinely needed —
 * but they are needed by the *dashboard*, not by the account, so they belong
 * in the wizard that runs next, where the person can see what each one turns
 * on. Asking for them here would make this a five-minute form for something
 * that should take twenty seconds.
 */
export default function StudentSignupPage() {
  return <StudentSignupForm />;
}
