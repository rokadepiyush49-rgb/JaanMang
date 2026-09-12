import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import { Portal, rupees } from "@/lib/public/portal";

export const metadata: Metadata = {
  title: "Public funding ledger — Jan Setu",
  description:
    "Every rupee committed to a citizen problem, the head it came from, and the problem it went to.",
};

/**
 * The funding ledger.
 *
 * A row is written inside the same transaction that moves a department's
 * committed budget, so this cannot be a subset of what was actually spent —
 * a committed budget with no ledger entry would be a failed transaction, not a
 * missing row.
 */
export default async function LedgerPage({
  searchParams,
}: {
  searchParams: Promise<{ fy?: string }>;
}) {
  const { fy } = await searchParams;
  const ledger = await Portal.ledger(fy);

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Public funding ledger
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
        Every entry here was written in the same transaction that moved a department&rsquo;s
        committed budget. Each one names the problem it went to, and you can open it.
      </p>

      {ledger.fiscalYears.length > 1 ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
              !fy ? "bg-primary text-white" : "bg-card-muted text-ink-muted"
            }`}
            href="/ledger"
          >
            All years
          </Link>
          {ledger.fiscalYears.map((year) => (
            <Link
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${
                fy === year ? "bg-primary text-white" : "bg-card-muted text-ink-muted"
              }`}
              href={`/ledger?fy=${encodeURIComponent(year)}`}
              key={year}
            >
              {year}
            </Link>
          ))}
        </div>
      ) : null}

      <Card className="mt-6 p-5">
        <span className="label-caps text-ink-faint">Total {fy ? `in ${fy}` : "on the ledger"}</span>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-ink">{rupees(ledger.total)}</p>
      </Card>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-ink text-left">
              <Th>Problem</Th>
              <Th>Head</Th>
              <Th>Year</Th>
              <Th>Stage</Th>
              <Th align="right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {ledger.entries.map((e, i) => (
              <tr className="border-b border-line" key={`${e.at}-${i}`}>
                <td className="py-2.5 pr-3">
                  {e.problemId ? (
                    <Link className="font-semibold text-primary hover:underline" href={`/problems/${e.problemId}`}>
                      {e.title}
                    </Link>
                  ) : (
                    <span className="text-ink">{e.title}</span>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-ink-muted">{e.department}</td>
                <td className="py-2.5 pr-3 text-ink-muted">{e.fiscalYear}</td>
                <td className="py-2.5 pr-3 text-ink-muted capitalize">{e.stage}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-ink">
                  {rupees(e.amount)}
                </td>
              </tr>
            ))}
            {ledger.entries.length === 0 ? (
              <tr>
                <td className="py-4 text-ink-muted" colSpan={5}>
                  Nothing has been committed through the platform yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
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

export const dynamic = "force-dynamic";
