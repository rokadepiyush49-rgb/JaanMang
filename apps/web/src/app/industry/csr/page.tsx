"use client";

/**
 * CSR ledger and reporting.
 *
 * Two audiences in one screen. A CSR lead wants to know whether the year's
 * allocation is going where the board said it would; a compliance officer wants
 * a report they can put in front of an auditor. Both need the same underlying
 * fact — that every figure traces to a project, and every project traces to a
 * government-validated problem.
 *
 * The planned share and the committed amount are shown side by side rather than
 * as one bar, because the gap between them is the entire content of a CSR
 * review meeting.
 */

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Badge, Button, Card, Enter, Progress, cx } from "@/components/ui";
import { BarList, Donut } from "@/components/gov/charts";
import { SdgChips } from "@/components/industry/pieces";
import { DOMAIN_LABEL } from "@/lib/industry/vocabulary";
import { exactRupees, people, rupees, shortDate } from "@/lib/industry/format";
import { CsrService, type CsrPositionDto } from "@/lib/industry/service";
import { openCsrStatement } from "@/lib/industry/csr-report";
import {
  csrBook,
  domainRollup,
  geographyRollup,
  impactPerRupee,
  sdgRollup,
  universityRollup,
} from "@/lib/industry/selectors";
import { useIndustry } from "@/lib/industry/store";

const DOMAIN_COLOR: Record<string, string> = {
  education: "var(--color-periwinkle)",
  health: "var(--color-orchid)",
  water: "var(--color-brand-blue)",
  rural: "var(--color-clay)",
  environment: "var(--color-mint)",
  agriculture: "var(--color-amber)",
  energy: "var(--color-amber)",
  infrastructure: "var(--color-clay)",
  accessibility: "var(--color-orchid)",
};

export default function CsrPage() {
  const { state, dispatch, totals, can } = useIndustry();
  const [generated, setGenerated] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  /**
   * The server's own CSR position, which is what the statement is printed from.
   *
   * Fetched rather than derived from the projects already in the store: the
   * statement has to reconcile against the government's ledger line for line,
   * and a figure this screen computed is a figure this screen could compute
   * differently from the one an officer sees.
   */
  const [position, setPosition] = useState<CsrPositionDto | null>(null);
  useEffect(() => {
    let cancelled = false;
    void CsrService.position()
      .then((p) => {
        if (!cancelled) setPosition(p);
      })
      .catch(() => {
        if (!cancelled) setPosition(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const book = csrBook(state.company, state.projects, state.challenges);
  const impact = impactPerRupee(state.projects);
  const byDomain = domainRollup(state.projects, state.challenges);
  const byGeography = geographyRollup(state.projects, state.challenges);
  const bySdg = sdgRollup(state.projects);
  const byUniversity = universityRollup(state.projects, state.universities, state.teams).filter(
    (u) => u.projects.length,
  );
  const verified = state.projects.filter((p) => p.stage === "impact");

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="headline-xl text-ink">
              <span className="font-medium">CSR</span> <span className="font-bold">ledger</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              {book.financialYear}. {rupees(book.allocated)} allocated by the board,{" "}
              {rupees(book.committed)} committed, {rupees(book.available)} still uncommitted — and
              every rupee of it traceable to a government-validated problem.
            </p>
          </div>
          <Button
            disabled={!can("report.generate")}
            icon="download"
            onClick={() => {
              dispatch({ type: "report/generate", financialYear: book.financialYear });
              setGenerated(true);
            }}
            tone="outline"
          >
            Generate impact report
          </Button>
        </div>
      </Enter>

      {/* --------------------------------------------------------- budget */}
      <Enter index={1}>
        <Card className="p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="min-w-0">
              <h2 className="headline-md text-ink">This year&rsquo;s allocation</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Board-approved ceiling of {rupees(state.company.csrBudget.preferredProjectCeiling)} on
                any single project.
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <Money label="Allocated" value={book.allocated} />
              <Money label="Committed" value={book.committed} />
              <Money label="Released" value={book.disbursed} />
              <Money label="Available" tone="impact" value={book.available} />
            </dl>
          </div>

          {/* Allocated, committed and released as one nested bar, the way the
              government workspace draws a department budget. */}
          <div className="mt-6">
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-track">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-navy-tint transition-[width] duration-700 ease-jm"
                style={{ width: `${(book.committed / book.allocated) * 100}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width] duration-700 ease-jm"
                style={{ width: `${(book.disbursed / book.allocated) * 100}%` }}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-muted">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="factory" size={12} /> {rupees(book.committedOnPlatform)} through Jan Setu ·{" "}
                {rupees(book.committedElsewhere)} committed elsewhere
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-primary" /> Released{" "}
                {Math.round((book.disbursed / book.allocated) * 100)}%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-navy-tint" /> Committed{" "}
                {Math.round((book.committed / book.allocated) * 100)}%
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-track" /> Uncommitted{" "}
                {Math.round((book.available / book.allocated) * 100)}%
              </span>
            </div>
          </div>
        </Card>
      </Enter>

      {/* ---------------------------------------------- plan vs actuality */}
      <Enter index={2}>
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-6 xl:col-span-2">
            <h2 className="headline-md text-ink">Planned share against what you actually committed</h2>
            <p className="mt-1 text-sm text-ink-muted">
              The gap between these two columns is the entire content of a CSR review meeting, so it
              is shown rather than averaged away.
            </p>
            <ul className="mt-5 flex flex-col gap-4">
              {book.byDomain.map((row) => {
                const plannedPct = row.plannedShare;
                /* A share of what the platform accounts for, not of the whole
                   CSR budget — the off-platform half has no domain breakdown. */
                const actualPct = book.committedOnPlatform
                  ? Math.round((row.committed / book.committedOnPlatform) * 100)
                  : 0;
                const drift = actualPct - plannedPct;
                return (
                  <li key={row.domain}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-ink">
                        {DOMAIN_LABEL[row.domain]}
                      </span>
                      <span className="flex items-baseline gap-3 text-sm tabular-nums">
                        <span className="text-ink-muted">plan {plannedPct}%</span>
                        <span className="font-bold text-ink">actual {actualPct}%</span>
                        {drift !== 0 ? (
                          <span
                            className={cx(
                              "text-xs font-bold",
                              drift > 0 ? "text-impact-deep" : "text-danger",
                            )}
                          >
                            {drift > 0 ? "+" : ""}
                            {drift}
                          </span>
                        ) : null}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-col gap-1">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-track">
                        <div
                          className="h-full rounded-full bg-navy-tint"
                          style={{ width: `${plannedPct}%` }}
                        />
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-track">
                        <div
                          className="h-full rounded-full bg-primary transition-[width] duration-700 ease-jm"
                          style={{ width: `${actualPct}%` }}
                        />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {rupees(row.committed)} across {row.projects} project
                      {row.projects === 1 ? "" : "s"} · planned {rupees(row.plannedAmount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card className="p-6">
            <h2 className="headline-md text-ink">Where it went</h2>
            <div className="mt-5 flex justify-center">
              <Donut
                centreLabel="committed"
                centreValue={rupees(totals.committed)}
                segments={byDomain.map((d) => ({
                  label: DOMAIN_LABEL[d.domain],
                  value: d.investment,
                  color: DOMAIN_COLOR[d.domain] ?? "var(--color-periwinkle)",
                }))}
              />
            </div>
          </Card>
        </div>
      </Enter>

      {/* --------------------------------------------------------- report */}
      <Enter index={3}>
        <Card className="p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              <h2 className="headline-lg text-ink">CSR impact statement</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Assembled from project records rather than written. {verified.length} of{" "}
                {state.projects.length} projects have closed citizen verification; the rest report
                targets, and the statement marks them as such.
              </p>
            </div>
            <Badge icon="scale" tone="info">
              {book.financialYear}
            </Badge>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Report label="Investment" value={rupees(totals.committed)} />
            <Report label="Projects" value={String(totals.projects)} />
            <Report label="Villages & wards" value={String(totals.communities)} />
            <Report label="People reached" value={people(totals.peopleImpacted)} />
            <Report label="Clusters closed" value={String(totals.clustersClosed)} />
            <Report label="Students supported" value={String(totals.students)} />
          </dl>

          <div className="mt-6 grid gap-6 border-t border-line pt-6 lg:grid-cols-3">
            <div>
              <p className="label-caps text-ink-faint">Universities</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {byUniversity.map((u) => (
                  <li className="text-sm text-ink-muted" key={u.university.id}>
                    <span className="font-semibold text-ink">{u.university.shortName}</span> —{" "}
                    {u.projects.length} project{u.projects.length === 1 ? "" : "s"}, {u.students}{" "}
                    students, {rupees(u.investment)}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label-caps text-ink-faint">Geography</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {byGeography.map((g) => (
                  <li className="text-sm text-ink-muted" key={g.state}>
                    <span className="font-semibold text-ink">{g.state}</span> — {g.projects} project
                    {g.projects === 1 ? "" : "s"}, {people(g.peopleImpacted)} people
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="label-caps text-ink-faint">SDG contributions</p>
              <div className="mt-2">
                <SdgChips max={10} sdgs={totals.sdgs} />
              </div>
              <p className="mt-3 text-xs text-ink-muted">
                All spending falls under Schedule VII of the Companies Act 2013 — items (i), (ii),
                (iv) and (ix) across this portfolio.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line pt-5">
            <Button
              disabled={!can("report.generate") || !position}
              icon="download"
              onClick={() => {
                if (!position) return;
                dispatch({ type: "report/generate", financialYear: position.financialYear });
                setGenerated(true);
                const opened = openCsrStatement(state.company, position);
                setExportError(
                  opened
                    ? null
                    : "Your browser blocked the statement window. Allow pop-ups for this site and try again.",
                );
              }}
            >
              Prepare the statement
            </Button>
            <p className="text-xs text-ink-muted">
              Opens a print view. Every figure on it is the sum of sponsorships this company
              approved — nothing on the statement is self-reported.
            </p>
            {exportError ? (
              <p className="text-xs font-semibold text-critical">
                <Icon className="mr-1 inline align-[-2px]" name="warning" size={12} />
                {exportError}
              </p>
            ) : null}
          </div>

          {generated && state.reports.length ? (
            <div className="mt-4 rounded-md bg-success-tint p-4">
              <p className="font-bold text-on-success-tint">
                Statement {state.reports[0].id} prepared
              </p>
              <p className="mt-1 text-sm text-on-success-tint/90">
                {state.reports[0].projects} projects included, generated{" "}
                {shortDate(state.reports[0].generatedAt)}. {state.reports[0].note}
              </p>
            </div>
          ) : null}
        </Card>
      </Enter>

      {/* ------------------------------------------------- impact per rupee */}
      <Enter index={4}>
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-6 xl:col-span-2">
            <h2 className="headline-md text-ink">What the money bought</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Reported and verified reach are kept apart. A project at prototype stage has a
              beneficiary count that is a plan; one whose verification has closed has a finding.
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Report label="Cost per person" value={exactRupees(impact.costPerBeneficiary)} />
              <Report label="Cost per cluster closed" value={rupees(impact.costPerClusterClosed)} />
              <Report label="Verified reach" value={people(impact.verifiedPeople)} />
              <Report label="Verified share" value={`${impact.verifiedShare}%`} />
            </dl>
            <Progress
              className="mt-5"
              label="Share of reported reach that is verified"
              tone="impact"
              value={impact.verifiedShare}
            />
          </Card>

          <Card className="p-6">
            <h2 className="headline-md text-ink">By SDG</h2>
            <div className="mt-5">
              <BarList
                data={bySdg.map((s) => ({
                  label: `SDG ${s.number} — ${s.short}`,
                  value: s.projects,
                  hint: `${people(s.peopleImpacted)} people · ${rupees(s.investment)}`,
                }))}
                format={(v) => `${v} project${v === 1 ? "" : "s"}`}
              />
            </div>
          </Card>
        </div>
      </Enter>
    </div>
  );
}

function Money({ label, value, tone }: { label: string; value: number; tone?: "impact" }) {
  return (
    <div>
      <dt className="label-caps text-ink-faint">{label}</dt>
      <dd className={cx("stat-number mt-1", tone === "impact" ? "text-impact-deep" : "text-ink")}>
        {rupees(value)}
      </dd>
    </div>
  );
}

function Report({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-card-muted p-4">
      <dt className="label-caps text-ink-faint">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-ink tabular-nums">{value}</dd>
    </div>
  );
}
