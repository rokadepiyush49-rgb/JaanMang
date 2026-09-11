import type { Metadata } from "next";
import { IndustryShell } from "@/components/industry/shell";
import { IndustryProvider } from "@/lib/industry/store";
import { requireSurface } from "@/lib/auth/guard";
import { SessionProvider } from "@/lib/auth/session-context";

export const metadata: Metadata = {
  title: { default: "Industry portal", template: "%s · Jan Setu Industry" },
  description:
    "Where companies, MSMEs, CSR trusts and research organisations find validated societal challenges and contribute funding, expertise, technology, prototyping, testing, mentorship and deployment alongside universities and government.",
};

/**
 * The industry surface sits beside the student app and the government
 * workspace: different navigation, different scope, different permissions — one
 * design system. `IndustryProvider` holds the state every screen acts on,
 * `visibility.ts` decides what any of it is allowed to show, and
 * `requireSurface` decides who is allowed to be here at all.
 */
export default async function IndustryLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSurface("industry");
  return (
    <SessionProvider value={session}>
      <IndustryProvider>
        <IndustryShell>{children}</IndustryShell>
      </IndustryProvider>
    </SessionProvider>
  );
}
