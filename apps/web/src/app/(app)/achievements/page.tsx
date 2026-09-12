import type { Metadata } from "next";
import { AchievementsPage } from "./view";

/**
 * A server wrapper, so the page can still export metadata.
 *
 * The screen reads the student workspace from a React context, which makes it
 * a client component, and a client component cannot export metadata. The split
 * is mechanical — the whole of the page is in `view.tsx`.
 */
export const metadata: Metadata = { title: "Achievements" };

export default function Page() {
  return <AchievementsPage />;
}
