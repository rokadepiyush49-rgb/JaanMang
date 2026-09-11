import type { Metadata } from "next";
import { InstituteShell } from "@/components/institute/shell";
import { InstituteProvider } from "@/lib/institute/store";
import { requireSurface } from "@/lib/auth/guard";
import { SessionProvider } from "@/lib/auth/session-context";

export const metadata: Metadata = {
  title: { default: "Institute portal", template: "%s · Jan Setu Institute" },
  description:
    "Where universities, colleges, polytechnics and training institutes run their own side of the platform — the student roster, faculty, teams, and every project from a validated citizen problem through to a signed-off submission.",
};

/**
 * The institute surface sits beside the student app, the government workspace
 * and the industry portal: different navigation, different scope, different
 * permissions — one design system.
 *
 * `requireSurface` runs before anything renders. It matters more here than
 * anywhere else on the platform: every screen inside carries named students,
 * their departments and whether their institution has confirmed them, so the
 * gate cannot be something a page remembers to call.
 */
export default async function InstituteLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSurface("institute");
  return (
    <SessionProvider value={session}>
      <InstituteProvider>
        <InstituteShell>{children}</InstituteShell>
      </InstituteProvider>
    </SessionProvider>
  );
}
