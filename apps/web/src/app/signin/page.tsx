import type { Metadata } from "next";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/signin-form";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Jan Setu — students, institutions, government officers and industry partners.",
};

/**
 * One sign-in page for every role.
 *
 * There is no role picker here on purpose. The account already knows what it
 * is, and a role the client sends is a role the client can change — the server
 * resolves the surface from the user's highest-ranked role and tells the page
 * where to go. This is also the only screen in the product that cannot know
 * who is looking at it, so it carries the neutral lockup.
 */
export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
