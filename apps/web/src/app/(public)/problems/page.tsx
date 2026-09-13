import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { CATEGORY_LABEL, Portal, rupees } from "@/lib/public/portal";

export const metadata: Metadata = {
  title: "Published problems — Jan Setu",
  description:
    "Every citizen problem the government has validated and published, with how many people it " +
    "affects, what it will cost and whether it has been fixed.",
};

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: Promise<{ district?: string; category?: string; sdg?: string }>;
}) {
  const query = await searchParams;
  const problems = await Portal.problems(query);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Published problems
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
        Problems the government has validated. Aggregate figures only — the individual reports,
        and everybody who filed them, stay on the government surface.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {problems.map((p) => (
          <li key={p.id}>
            <Link className="block h-full" href={`/problems/${p.id}`}>
              <Card className="h-full p-5 transition-colors hover:bg-card-muted">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="label-caps text-ink-faint">
                    {CATEGORY_LABEL[p.category] ?? p.category}
                  </span>
                  <span className="text-xs text-ink-faint">· {p.district}</span>
                </div>
                <h2 className="mt-1.5 text-base font-semibold text-ink">{p.title}</h2>

                <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
                  <Pair label="People affected" value={p.affected.toLocaleString("en-IN")} />
                  <Pair label="Reports" value={String(p.reportCount)} />
                  <Pair label="Votes" value={String(p.voteCount)} />
                  {p.estimatedCost > 0 ? (
                    <Pair label="Estimated" value={rupees(p.estimatedCost)} />
                  ) : null}
                </dl>

                {p.verification ? (
                  <p className="mt-3 text-xs font-semibold text-ink">
                    {p.verification.confirmed} of {p.verification.asked} reporters confirmed it was
                    fixed
                    {p.verification.denied > 0 ? `, ${p.verification.denied} said it was not` : ""}.
                  </p>
                ) : null}
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      {problems.length === 0 ? (
        <Card className="mt-8 p-6">
          <p className="text-sm text-ink-muted">
            No published problems match that filter.
          </p>
        </Card>
      ) : null}
    </>
  );
}

function Pair({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex gap-1.5">
      <dt>{label}</dt>
      <dd className="font-semibold tabular-nums text-ink">{value}</dd>
    </span>
  );
}

export const dynamic = "force-dynamic";
