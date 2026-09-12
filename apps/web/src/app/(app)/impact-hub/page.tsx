import type { Metadata } from "next";
import { ImpactHubPage } from "./view";

/**
 * A server wrapper, so the page can still export metadata.
 *
 * The screen reads the student workspace from a React context, which makes it
 * a client component, and a client component cannot export metadata. The split
 * is mechanical — the whole of the page is in `view.tsx`.
 */
export const metadata: Metadata = { title: "Impact Hub" };

export default function Page() {
  return <ImpactHubPage />;
}
