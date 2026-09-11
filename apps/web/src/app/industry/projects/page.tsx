"use client";

/**
 * My Impact Portfolio.
 *
 * Everything the company is carrying, with the two things a partner checks
 * first at the top: what is waiting on them, and whether the money is keeping
 * pace with the delivery. Progress bars alone would let a project look healthy
 * while its tranche sat unreleased for a month.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Badge, ButtonLink, Card, EmptyState, Enter, cx } from "@/components/ui";
import { Select, Tabs } from "@/components/ui-interactive";
import { ProjectCard } from "@/components/industry/pieces";
import { exactRupees, people, rupees, until } from "@/lib/industry/format";
import {
  awaitingReview,
  deliveryRecord,
  heldTranches,
  impactPerRupee,
} from "@/lib/industry/selectors";
import { useIndustry } from "@/lib/industry/store";

const VIEWS = [
  { id: "all", label: "All" },
  { id: "live", label: "In flight" },
  { id: "pilot", label: "In pilot" },
  { id: "done", label: "Completed" },
  { id: "review", label: "Needs your review" },
];

export default function PortfolioPage() {
  const { state, totals } = useIndustry();
  const [view, setView] = useState("all");
  const [sort, setSort] = useState("Furthest along");

  const reviews = awaitingReview(state.projects);
  const held = heldTranches(state.projects);
  const record = deliveryRecord(state.projects);
  const impact = impactPerRupee(state.projects);

  const rows = useMemo(() => {
    /* Built here rather than during render: a Set constructed in the component
       body is a new object every pass, and using it as a dependency defeats the
       memoization it appears in. */
    const needsReview = new Set(
      awaitingReview(state.projects).map((r) => r.project.id),
    );
    const filtered = state.projects.filter((p) => {
      if (view === "live") return p.stage !== "impact";
      if (view === "pilot") return p.stage === "pilot";
      if (view === "done") return p.stage === "impact";
      if (view === "review") return needsReview.has(p.id);
      return true;
    });
    const by: Record<string, (a: typeof filtered[number], b: typeof filtered[number]) => number> = {
      "Furthest along": (a, b) => b.progress - a.progress,
      "Largest commitment": (a, b) => b.investment.committed - a.investment.committed,
      "Most people reached": (a, b) => b.peopleImpacted - a.peopleImpacted,
      "Best value per person": (a, b) =>
        a.investment.committed / Math.max(1, a.peopleImpacted) -
        b.investment.committed / Math.max(1, b.peopleImpacted),
      "Soonest completion": (a, b) => a.expectedCompletion.localeCompare(b.expectedCompletion),
    };
    return [...filtered].sort(by[sort] ?? by["Furthest along"]);
  }, [state.projects, view, sort]);

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="headline-xl text-ink">
              <span className="font-medium">My impact</span> <span className="font-bold">portfolio</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              {totals.projects} co-development projects with {totals.universities} universities,{" "}
              {rupees(totals.committed)} committed and {people(totals.peopleImpacted)} people reached
              across {totals.communities} villages and wards.
            </p>
          </div>
          <ButtonLink href="/industry/opportunities" icon="target" tone="outline">
            Find another
          </ButtonLink>
        </div>
      </Enter>

      <Enter index={1}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            hint={`${rupees(totals.disbursed)} released against milestones`}
            label="Committed"
            value={rupees(totals.committed)}
          />
          <Metric
            hint={`${impact.verifiedShare}% confirmed by citizen verification`}
            label="People reached"
            value={people(totals.peopleImpacted)}
          />
          <Metric
            hint={`${record.onTime} of ${record.completed} milestones delivered on time`}
            label="Delivery record"
            value={`${record.percent}%`}
          />
          <Metric
            hint={held ? `${rupees(held)} held pending your review` : "nothing held"}
            label="Cost per person"
            tone={held ? "warning" : undefined}
            value={exactRupees(impact.costPerBeneficiary)}
          />
        </div>
      </Enter>

      {reviews.length ? (
        <Enter index={2}>
          <Card className="bg-warning-tint p-5" tone="flat">
            <div className="flex flex-wrap items-start gap-3">
              <Icon className="mt-0.5 shrink-0 text-on-warning-tint" name="eye" size={20} />
              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-on-warning-tint">
                  {reviews.length} milestone{reviews.length === 1 ? "" : "s"} are waiting on you
                </h2>
                <p className="mt-1 text-sm text-on-warning-tint/90">
                  The teams have submitted evidence and cannot start the next stage until you approve
                  or ask for changes. {held ? `${rupees(held)} of committed funding is held.` : ""}
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {reviews.map(({ project, milestone }) => (
                    <li key={milestone.id}>
                      <Link
                        className="flex items-center gap-2 rounded-md bg-card/70 px-3 py-2.5 transition-colors hover:bg-card"
                        href={`/industry/projects/${project.id}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-ink">
                            {milestone.label}
                          </span>
                          <span className="block truncate text-xs text-ink-muted">
                            {project.id} · {project.title} · due {until(milestone.dueAt)}
                          </span>
                        </span>
                        {milestone.trancheAmount ? (
                          <Badge dense tone="gold">
                            {rupees(milestone.trancheAmount)}
                          </Badge>
                        ) : null}
                        <Icon className="shrink-0 text-ink-muted" name="chevron-right" size={16} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </Enter>
      ) : null}

      <Enter index={3}>
        <div className="flex flex-wrap items-center gap-3">
          <Tabs
            className="flex-1"
            onChange={setView}
            tabs={VIEWS.map((v) => ({
              ...v,
              count:
                v.id === "all"
                  ? state.projects.length
                  : v.id === "review"
                    ? reviews.length
                    : state.projects.filter((p) =>
                        v.id === "live" ? p.stage !== "impact" : v.id === "pilot" ? p.stage === "pilot" : p.stage === "impact",
                      ).length,
            }))}
            value={view}
          />
          <Select
            className="w-full sm:w-56"
            hideLabel
            label="Sort projects"
            onChange={setSort}
            options={[
              "Furthest along",
              "Largest commitment",
              "Most people reached",
              "Best value per person",
              "Soonest completion",
            ]}
            value={sort}
          />
        </div>
      </Enter>

      {rows.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map((project, i) => (
            <Enter index={i} key={project.id}>
              <ProjectCard project={project} />
            </Enter>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            actionHref="/industry/opportunities"
            actionLabel="See opportunities"
            icon="clipboard"
            message="Nothing in the portfolio matches this view."
            title="No projects here"
            tone="info"
          />
        </Card>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "warning";
}) {
  return (
    <Card className={cx("p-5", tone === "warning" && "ring-2 ring-warning/30")}>
      <p className="label-caps text-ink-faint">{label}</p>
      <p className="stat-number mt-1 text-ink">{value}</p>
      <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>
    </Card>
  );
}
