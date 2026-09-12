"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Card, cx } from "@/components/ui";
import { VoteButton } from "@/components/vote-button";
import { fetchMyReports } from "@/lib/report/service";
import { CATEGORY_LABEL, STATUS_LABEL, type MyReport } from "@/lib/report/types";

/**
 * What happened to the reports you filed.
 *
 * The honest answer is often "nothing yet", and this says so rather than
 * inventing a status. A report that has not been clustered is not in an error
 * state and not stuck — it is waiting for the next pass — and telling somebody
 * that plainly is better than a progress bar that means nothing.
 */
export function MyReports() {
  const [reports, setReports] = useState<MyReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchMyReports()
      .then((r) => setReports(r.items))
      .catch(() => setError("Could not load your reports. Please try again."));
  }, []);

  if (error) {
    return (
      <p className="flex items-start gap-1.5 text-sm font-semibold text-critical">
        <Icon className="mt-0.5 shrink-0" name="warning" size={15} />
        {error}
      </p>
    );
  }

  if (reports === null) {
    return <p className="text-sm text-ink-muted">Loading your reports…</p>;
  }

  if (reports.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-ink-muted">
          You have not filed anything yet. When you do, it will show here with whatever the
          panchayat does about it.
        </p>
      </Card>
    );
  }

  return (
    <ul className="space-y-4">
      {reports.map((report) => (
        <li key={report.id}>
          <ReportCard report={report} />
        </li>
      ))}
    </ul>
  );
}

function ReportCard({ report }: { report: MyReport }) {
  const { problem } = report;
  const closed = problem?.status === "resolved" || problem?.status === "rejected";

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="label-caps text-ink-faint">
          {report.village.name} ·{" "}
          {new Date(report.filedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
        </span>
        {report.understood.category ? (
          <span className="text-xs font-semibold text-ink-muted">
            {CATEGORY_LABEL[report.understood.category]}
          </span>
        ) : null}
      </div>

      <p className="mt-2 text-sm leading-relaxed text-ink">{report.text}</p>

      <div className="mt-4 border-t border-line pt-4">
        {problem ? (
          <>
            <p className="text-sm font-semibold text-ink">{problem.title}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
              <span
                className={cx(
                  "font-semibold",
                  problem.status === "resolved" && "text-primary",
                  problem.status === "rejected" && "text-critical",
                )}
              >
                {STATUS_LABEL[problem.status] ?? problem.status}
              </span>
              <span>
                {problem.reportCount} {problem.reportCount === 1 ? "report" : "reports"}
              </span>
              <span>
                {problem.voteCount} {problem.voteCount === 1 ? "vote" : "votes"}
              </span>
            </p>

            {/* You reported it, so you are not asked whether you agree with
                yourself — but everyone else's problems are votable from here
                once this list grows past your own. */}
            <div className="mt-3">
              <VoteButton
                disabled={closed}
                disabledReason={
                  closed
                    ? "Voting has closed on this one. Verification and rating are how you have a say now."
                    : undefined
                }
                initialCount={problem.voteCount}
                initialVoted={problem.votedByMe}
                problemId={problem.id}
              />
            </div>
          </>
        ) : (
          <p className="flex items-start gap-1.5 text-xs text-ink-muted">
            <Icon className="mt-px shrink-0" name="clock" size={13} />
            Not yet grouped with other reports. This happens within a few minutes — it does not
            mean anything is wrong.
          </p>
        )}
      </div>
    </Card>
  );
}
