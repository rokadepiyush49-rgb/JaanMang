import type { Metadata } from "next";
import { IndustryShell } from "@/components/industry/shell";
import { IndustryProvider } from "@/lib/industry/store";

export const metadata: Metadata = {
  title: { default: "Industry portal", template: "%s · Jan Setu Industry" },
  description:
    "Where companies, MSMEs, CSR trusts and research organisations find validated societal challenges and contribute funding, expertise, technology, prototyping, testing, mentorship and deployment alongside universities and government.",
};

/**
 * The industry surface sits beside the student app and the government
 * workspace: different navigation, different scope, different permissions — one
 * design system. `IndustryProvider` holds the state every screen acts on, and
 * `visibility.ts` decides what any of it is allowed to show.
 */
export default function IndustryLayout({ children }: { children: React.ReactNode }) {
  return (
    <IndustryProvider>
      <IndustryShell>{children}</IndustryShell>
    </IndustryProvider>
  );
}
