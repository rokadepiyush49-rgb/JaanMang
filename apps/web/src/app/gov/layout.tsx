import type { Metadata } from "next";
import { GovShell } from "@/components/gov/shell";
import { GovProvider } from "@/lib/gov/store";
import { requireSurface } from "@/lib/auth/guard";
import { SessionProvider } from "@/lib/auth/session-context";

export const metadata: Metadata = {
  title: { default: "Government workspace", template: "%s · Jan Setu Government" },
  description:
    "The Jan Setu control centre for gram panchayat, block and district administration — citizen demand, priority, sponsorship, funding, delivery and verified impact.",
};

/**
 * The government surface sits beside the student app rather than inside it:
 * different navigation, different scope, different permissions — one design
 * system. `GovProvider` holds the operational state every screen acts on, and
 * `requireSurface` is what guarantees the person reading it is entitled to.
 */
export default async function GovLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSurface("gov");
  return (
    <SessionProvider value={session}>
      <GovProvider>
        <GovShell>{children}</GovShell>
      </GovProvider>
    </SessionProvider>
  );
}
