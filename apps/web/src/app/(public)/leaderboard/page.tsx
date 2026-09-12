import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { Portal } from "@/lib/public/portal";

export const metadata: Metadata = {
  title: "Rankings — Jan Setu",
  description:
    "Citizens, students, institutions, partners and officers, ranked on verified outcomes — " +
    "never on activity. Every ranking publishes the formula that produced it.",
};

const SCOPES = [
  { id: "citizens", label: "Citizens" },
  { id: "students", label: "Students" },
  { id: "institutes", label: "Institutions" },
  { id: "partners", label: "Partners" },
  { id: "officers", label: "Officers" },
] as const;

/**
 * The published rankings.
 *
 * The formula is printed beside every board, because a ranking whose workings
 * are hidden is one nobody outside the building believes — and on a platform
 * that publishes a government's own officers, that is not a detail.
 */
export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const { scope = "citizens" } = await searchParams;
  const active = SCOPES.find((s) => s.id === scope) ?? SCOPES[0];
  const board = await Portal.leaderboard(active.id);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">Rankings</h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
        Ranked on verified outcomes only — work citizens confirmed, money that moved, milestones
        somebody signed off. Never on logins, submissions or reports filed: a ranking built on
        activity ranks the loudest account first.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {SCOPES.map((s) => (
          <Link
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              s.id === active.id ? "bg-primary text-white" : "bg-card-muted text-ink-muted"
            }`}
            href={`/leaderboard?scope=${s.id}`}
            key={s.id}
          >
            {s.label}
          </Link>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0">
          {board.entries.length === 0 ? (
            <Card className="p-6">
              <p className="text-sm text-ink-muted">
                Nobody has a verified outcome in this category yet. Subjects with no verified work
                are left out rather than ranked last — a list of people who have done nothing is
                not information.
              </p>
            </Card>
          ) : (
            <ol className="space-y-3">
              {board.entries.map((e) => (
                <li key={e.subjectId}>
                  <Card className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-card-muted text-sm font-semibold tabular-nums text-ink">
                      {e.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{e.name}</p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {Object.entries(e.breakdown as Record<string, unknown>)
                          .filter(([, v]) => v !== null && v !== 0 && typeof v !== "object")
                          .map(([k, v]) => `${humanise(k)}: ${String(v)}`)
                          .join(" · ")}
                      </p>
                    </div>
                    {e.previousRank !== null && e.previousRank !== e.rank ? (
                      <span
                        className={`text-xs font-semibold ${
                          e.previousRank > e.rank ? "text-primary" : "text-ink-muted"
                        }`}
                      >
                        {e.previousRank > e.rank ? "▲" : "▼"} {Math.abs(e.previousRank - e.rank)}
                      </span>
                    ) : null}
                    <span className="text-lg font-semibold tabular-nums text-ink">{e.score}</span>
                  </Card>
                </li>
              ))}
            </ol>
          )}
        </div>

        <aside>
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-ink">How this is scored</h2>
            <ul className="mt-3 space-y-2.5">
              {board.formula.map((f) => (
                <li className="text-xs" key={f.label}>
                  <span className="block text-ink">{f.label}</span>
                  <span className="block text-ink-faint">{f.weight}</span>
                </li>
              ))}
            </ul>
            {board.computedAt ? (
              <p className="mt-4 border-t border-line pt-3 text-xs text-ink-faint">
                Last computed {new Date(board.computedAt).toLocaleString("en-IN")}.
              </p>
            ) : null}
          </Card>
        </aside>
      </div>
    </>
  );
}

function humanise(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const dynamic = "force-dynamic";
