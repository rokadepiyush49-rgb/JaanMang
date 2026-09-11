import type { Metadata } from "next";
import { GovShell } from "@/components/gov/shell";
import { GovProvider } from "@/lib/gov/store";

export const metadata: Metadata = {
  title: { default: "Government workspace", template: "%s · Jan Setu Government" },
  description:
    "The Jan Setu control centre for gram panchayat, block and district administration — citizen demand, priority, sponsorship, funding, delivery and verified impact.",
};

/**
 * The government surface sits beside the student app rather than inside it:
 * different navigation, different scope, different permissions — one design
 * system. `GovProvider` holds the operational state every screen acts on.
 */
export default function GovLayout({ children }: { children: React.ReactNode }) {
  return (
    <GovProvider>
      <GovShell>{children}</GovShell>
    </GovProvider>
  );
}
