import { getSession } from "@/lib/auth/session";
import { destinationFor } from "@/lib/auth/destination";
import { Landing } from "@/components/landing/landing";
import { fetchPlatformStats } from "@/lib/public/stats";
import { redirect } from "next/navigation";

/**
 * The front door.
 *
 * Signed out, this is the public landing page. Signed in, it is a redirect to
 * wherever the account belongs — which is why the root is the one place the
 * whole app can bounce someone to when it does not itself know where they go.
 */
export default async function Home() {
  const session = await getSession();
  if (session) redirect(destinationFor(session));

  const stats = await fetchPlatformStats();
  return <Landing stats={stats} />;
}

/* The statistics are read per request so the page is never serving a figure
   older than the deployment it describes. */
export const dynamic = "force-dynamic";
