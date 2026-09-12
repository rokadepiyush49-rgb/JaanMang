import Link from "next/link";
import { Brand } from "@/components/brand";

/**
 * The public portal's chrome.
 *
 * No session, no shell, no surface guard — these pages are the one part of the
 * product a stranger opens, and `proxy.ts`'s matcher deliberately does not
 * cover them. Kept plain: somebody arriving from a news article should find the
 * numbers and the photographs, not a product tour.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-5 sm:px-8">
          <Brand href="/" subtitle="Public record" />
          <nav className="ml-auto flex items-center gap-1 text-sm font-semibold">
            <NavLink href="/impact">Impact</NavLink>
            <NavLink href="/problems">Problems</NavLink>
            <NavLink href="/ledger">Ledger</NavLink>
            <NavLink href="/leaderboard">Rankings</NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10 sm:px-8 sm:py-14">
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
          <p className="max-w-3xl text-xs leading-relaxed text-ink-muted">
            Every figure on this portal is computed from the platform&rsquo;s own records and
            traceable to a problem you can open. &ldquo;Verified&rdquo; means the citizens who
            reported a problem confirmed the work was done — not that an officer closed it.
            Nothing here is self-reported by a government body or a partner.
          </p>
          <p className="mt-3 text-xs text-ink-faint">
            <Link className="font-semibold text-primary hover:underline" href="/report">
              Report a problem
            </Link>{" "}
            · No account needed.
          </p>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      className="rounded-full px-3 py-1.5 text-ink-muted transition-colors hover:bg-card-muted hover:text-ink"
      href={href}
    >
      {children}
    </Link>
  );
}
