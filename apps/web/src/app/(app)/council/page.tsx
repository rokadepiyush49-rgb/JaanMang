import type { Metadata } from "next";
import { CouncilLanding } from "./landing";

// Stays a server component purely to keep this export — the page body needs
// the reader's locale, which only exists in the browser, so it lives in
// `landing.tsx` behind a "use client" boundary.
export const metadata: Metadata = { title: "AI Project Council" };

export default function CouncilPage() {
  return <CouncilLanding />;
}
