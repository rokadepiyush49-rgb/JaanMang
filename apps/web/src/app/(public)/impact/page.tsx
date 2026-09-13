import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Card } from "@/components/ui";
import {
  CATEGORY_LABEL,
  Portal,
  SDG_LABEL,
  rupees,
} from "@/lib/public/portal";

export const metadata: Metadata = {
  title: "Verified impact — Jan Setu",
  description:
    "Problems reported by citizens in Jharkhand, the work done about them, and whether the " +
    "people who reported them say it was fixed. Every figure traceable to a problem you can open.",
  openGraph: {
    title: "Verified impact — Jan Setu",
    description:
      "What was reported, what was done, and whether the citizens who reported it say it worked.",
    type: "website",
  },
};

/**
 * The impact dashboard.
 *
 * Built around one distinction the rest of the sector blurs: a problem an
 * officer marked resolved and a problem the citizens who reported it confirmed
 * are different numbers, and this page shows the second. When they differ the
 * gap is the interesting part, so it is stated rather than smoothed.
 */
export default async function ImpactPage() {
  const impact = await Portal.impact();
  const { totals } = impact;

  const verificationRate =
    totals.problemsPublished > 0
      ? Math.round((totals.problemsVerified / totals.problemsPublished) * 100)
      : 0;

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        What was reported, and what was actually done about it
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
        {impact.provenance}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Problems published" value={totals.problemsPublished.toLocaleString("en-IN")} />
        <Stat
          hint="Confirmed by the people who reported them"
          label="Verified fixed"
          value={totals.problemsVerified.toLocaleString("en-IN")}
        />
        <Stat label="Citizens reached" value={totals.citizensAffected.toLocaleString("en-IN")} />
        <Stat
          hint="Written to the public ledger when a department committed them"
          label="Funds committed"
          value={rupees(totals.fundsCommitted)}
        />
      </div>

      {totals.problemsVerified === 0 && totals.problemsPublished > 0 ? (
        <Card className="mt-6 flex items-start gap-3 p-5">
          <Icon className="mt-0.5 shrink-0 text-ink-faint" name="alert-circle" size={18} />
          <p className="text-sm text-ink-muted">
            No problem on this platform has yet been confirmed fixed by the citizens who reported
            it. Work has been completed on several — this figure counts only the ones the
            reporters themselves verified, which is a higher bar than &ldquo;closed&rdquo; and the
            reason this page exists.
          </p>
        </Card>
      ) : null}

      {/* ------------------------------------------------------- districts */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-ink">By district</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[36rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-ink text-left">
                <Th>District</Th>
                <Th align="right">Problems</Th>
                <Th align="right">Verified</Th>
                <Th align="right">Reports</Th>
                <Th align="right">Citizens reached</Th>
                <Th align="right">Committed</Th>
              </tr>
            </thead>
            <tbody>
              {impact.districts.map((d) => (
                <tr className="border-b border-line" key={d.name}>
                  <td className="py-2.5 pr-3 font-semibold text-ink">{d.name}</td>
                  <Td>{d.problems}</Td>
                  <Td>{d.verified}</Td>
                  <Td>{d.reports.toLocaleString("en-IN")}</Td>
                  <Td>{d.affected.toLocaleString("en-IN")}</Td>
                  <Td>{rupees(d.committed)}</Td>
                </tr>
              ))}
              {impact.districts.length === 0 ? (
                <tr>
                  <td className="py-4 text-ink-muted" colSpan={6}>
                    No districts on the register yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {/* ------------------------------------------------------------ SDG */}
      {impact.sdgs.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-xl font-semibold text-ink">Sustainable Development Goals</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Citizens reached by verified work, per goal. A problem serving two goals counts in both.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {impact.sdgs.map((s) => (
              <Card className="p-4" key={s.number}>
                <span className="label-caps text-ink-faint">SDG {s.number}</span>
                <p className="mt-0.5 text-sm font-semibold text-ink">{SDG_LABEL[s.number]}</p>
                <p className="mt-2 text-lg font-semibold tabular-nums text-ink">
                  {s.citizensAffected.toLocaleString("en-IN")}
                </p>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* ----------------------------------------------------- categories */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-ink">By kind of problem</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {impact.categories.map((c) => (
            <Card className="flex items-baseline justify-between gap-3 p-4" key={c.category}>
              <span className="text-sm font-semibold text-ink">
                {CATEGORY_LABEL[c.category] ?? c.category}
              </span>
              <span className="text-xs text-ink-muted tabular-nums">
                {c.verified} of {c.problems} verified
              </span>
            </Card>
          ))}
        </div>
      </section>

      <p className="mt-12 text-xs text-ink-muted">
        {verificationRate}% of published problems have been confirmed fixed by their reporters.{" "}
        <Link className="font-semibold text-primary hover:underline" href="/problems">
          Open any of them
        </Link>{" "}
        to see the before-and-after and the money.
      </p>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-5">
      <span className="label-caps text-ink-faint">{label}</span>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </Card>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      className={`py-2 pr-3 text-[11px] font-semibold tracking-wide text-ink-faint uppercase ${
        align === "right" ? "text-right" : ""
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="py-2.5 pr-3 text-right tabular-nums text-ink-muted">{children}</td>;
}

export const dynamic = "force-dynamic";
