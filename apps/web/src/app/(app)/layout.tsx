import { AppShell } from "@/components/shell";
import { requireSurface } from "@/lib/auth/guard";
import { SessionProvider } from "@/lib/auth/session-context";
import { StudentProvider } from "@/lib/student/store";

/**
 * The student workspace.
 *
 * `requireSurface` runs before anything renders, so an unauthenticated or
 * misrouted visitor never sees the shell — previously this layout rendered
 * unconditionally and every student screen was public.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSurface("student");
  return (
    <SessionProvider value={session}>
      <StudentProvider>
        <AppShell>{children}</AppShell>
      </StudentProvider>
    </SessionProvider>
  );
}
