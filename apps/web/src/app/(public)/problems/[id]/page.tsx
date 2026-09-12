import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { EvidenceGallery } from "@/components/evidence-gallery";
import { CATEGORY_LABEL, Portal, SDG_LABEL, rupees } from "@/lib/public/portal";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const problem = await Portal.problem(id);
  if (!problem) return { title: "Problem not found — Jan Setu" };

  const description =
    `${problem.affected.toLocaleString("en-IN")} people affected in ${problem.district}. ` +
    `${problem.reportCount} citizen reports. ` +
    (problem.verification
      ? `${problem.verification.confirmed} of ${problem.verification.asked} reporters confirmed the work.`
      : "Awaiting delivery.");

  return {
    title: `${problem.title} — Jan Setu`,
    description,
    openGraph: { title: problem.title, description, type: "article" },
  };
}

/**
 * One problem, in public.
 *
 * The page the whole platform is arguing for: what was reported, what it cost,
 * who paid, what it looks like now, and whether the people who raised it say it
 * worked. Carries JSON-LD so the claim is machine-readable too — a public
 * record nobody can index is a public record in name only.
 */
export default async function PublicProblemPage({ params }: Params) {
  const { id } = await params;
  const problem = await Portal.problem(id);
  if (!problem) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Report",
    identifier: problem.id,
    headline: problem.title,
    description: problem.summary,
    datePublished: problem.reportedAt,
    dateModified: problem.updatedAt,
    about: CATEGORY_LABEL[problem.category] ?? problem.category,
    spatialCoverage: {
      "@type": "Place",
      name: `${problem.villages.join(", ")}, ${problem.district}`,
    },
    publisher: { "@type": "GovernmentOrganization", name: problem.department ?? "Government of Jharkhand" },
  };

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        type="application/ld+json"
      />

      <span className="label-caps text-ink-faint">
        {CATEGORY_LABEL[problem.category] ?? problem.category} · {problem.district}
      </span>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
        {problem.title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">{problem.summary}</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="People affected" value={problem.affected.toLocaleString("en-IN")} />
        <Stat label="Citizen reports" value={String(problem.reportCount)} />
        <Stat label="Votes" value={String(problem.voteCount)} />
        <Stat label="Estimated cost" value={rupees(problem.estimatedCost)} />
      </div>

      {/* -------------------------------------------------------- evidence */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-ink">Before and after</h2>
        <p className="mt-1 text-sm text-ink-muted">
          The photographs the citizens who reported this were shown when they were asked whether
          it was fixed.
        </p>
        <EvidenceGallery
          after={problem.evidence.after}
          before={problem.evidence.before}
          className="mt-5"
        />
      </section>

      {/* ---------------------------------------------------- verification */}
      {problem.verification ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-ink">What the reporters said</h2>
          <Card className="mt-4 p-5">
            <p className="text-sm text-ink">
              <strong className="tabular-nums">{problem.verification.confirmed}</strong> of{" "}
              <strong className="tabular-nums">{problem.verification.asked}</strong> people who
              reported this confirmed the work was done
              {problem.verification.denied > 0 ? (
                <>
                  , and{" "}
                  <strong className="tabular-nums">{problem.verification.denied}</strong> said it
                  was not
                </>
              ) : null}
              .
            </p>
            {problem.verification.pending > 0 ? (
              <p className="mt-2 text-xs text-ink-muted">
                {problem.verification.pending} have not answered yet. The problem does not close
                until they do.
              </p>
            ) : null}
            {problem.project?.rating !== null && problem.project ? (
              <p className="mt-3 text-sm text-ink">
                They rated the delivery{" "}
                <strong className="tabular-nums">{problem.project.rating}</strong> out of 5, across{" "}
                {problem.project.ratingCount} rating
                {problem.project.ratingCount === 1 ? "" : "s"}.
              </p>
            ) : null}
          </Card>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- money */}
      {problem.ledger.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-ink">The money</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Public ledger entries written when a department committed funds to this problem.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink text-left">
                  <th className="py-2 pr-3 text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
                    Head
                  </th>
                  <th className="py-2 pr-3 text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
                    Year
                  </th>
                  <th className="py-2 pr-3 text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
                    Stage
                  </th>
                  <th className="py-2 text-right text-[11px] font-semibold tracking-wide text-ink-faint uppercase">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {problem.ledger.map((e, i) => (
                  <tr className="border-b border-line" key={`${e.at}-${i}`}>
                    <td className="py-2.5 pr-3 text-ink">{e.department}</td>
                    <td className="py-2.5 pr-3 text-ink-muted">{e.fiscalYear}</td>
                    <td className="py-2.5 pr-3 text-ink-muted capitalize">{e.stage}</td>
                    <td className="py-2.5 text-right font-semibold tabular-nums text-ink">
                      {rupees(e.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {problem.sdgs.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-ink">Goals this serves</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {problem.sdgs.map((n) => (
              <li
                className="rounded-full bg-card-muted px-3 py-1.5 text-xs font-semibold text-ink-muted"
                key={n}
              >
                SDG {n} · {SDG_LABEL[n]}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <span className="label-caps text-ink-faint">{label}</span>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
    </Card>
  );
}

export const dynamic = "force-dynamic";
