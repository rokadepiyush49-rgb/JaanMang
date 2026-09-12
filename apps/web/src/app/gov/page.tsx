"use client";

/**
 * Government overview — the screen that answers, in one scroll: what happened
 * automatically, what needs a person, where the money is coming from, and
 * whether citizens agree the work is done.
 *
 * The KPI strip is not decoration: every figure is a link into the rows that
 * produced it.
 */

import Link from "next/link";
import { Icon } from "@/components/icon";
import { BarList, Sparkline, TrendChart } from "@/components/gov/charts";
import { KpiCard, ProblemRow, SlaChip } from "@/components/gov/pieces";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Enter,
  Progress,
  SectionHeader,
  cx,
} from "@/components/ui";
import { count, firstName, relative, rupees } from "@/lib/gov/format";
import { CATEGORY_LABEL } from "@/lib/gov/filters";
import { jurisdictionPath } from "@/lib/gov/rbac";
import {
  kpiCounts,
  moneyBook,
  nextAction,
  officerName,
  villageName,
} from "@/lib/gov/selectors";
import { govSeed, useGov } from "@/lib/gov/store";

const PIPELINE = [
  { label: "Citizen report", icon: "message", auto: false },
  { label: "AI understanding", icon: "sparkles", auto: true },
  { label: "Classification", icon: "apps", auto: true },
  { label: "Duplicate detection", icon: "folder", auto: true },
  { label: "Cluster", icon: "users", auto: true },
  { label: "Priority engine", icon: "trending-up", auto: true },
  { label: "Jurisdiction", icon: "map-pin", auto: true },
  { label: "Department", icon: "landmark", auto: true },
  { label: "Sponsorship / funding", icon: "banknote", auto: false },
  { label: "Implementation", icon: "clipboard", auto: false },
  { label: "Verification", icon: "thumbs-up", auto: false },
] as const;

export default function GovOverview() {
  const { state, ranked, actions } = useGov();
  const k = kpiCounts(ranked);
  const money = moneyBook(ranked);
  const path = jurisdictionPath(state.user.jurisdictionId, govSeed.jurisdictions);

  const actionQueue = [...ranked]
    .filter((p) => p.status !== "resolved" && p.status !== "rejected")
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const alerts = state.alerts.filter((a) => !a.read).slice(0, 4);
  const automationsToday = state.automations.reduce((s, a) => s + a.runsToday, 0);
  const attention = state.automations.filter((a) => a.status === "attention");

  const byCategory = Object.entries(
    ranked.reduce<Record<string, number>>((acc, p) => {
      acc[CATEGORY_LABEL[p.category]] = (acc[CATEGORY_LABEL[p.category]] ?? 0) + p.reportCount;
      return acc;
    }, {}),
  )
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const verification = ranked.reduce(
    (acc, p) => ({
      confirmed: acc.confirmed + p.verification.confirmed,
      denied: acc.denied + p.verification.denied,
      pending: acc.pending + p.verification.pending,
    }),
    { confirmed: 0, denied: 0, pending: 0 },
  );

  return (
    <div className="flex flex-col gap-6">
      {/* ---------------------------------------------------------- header */}
      <Enter>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <nav className="label-caps mb-2 flex flex-wrap items-center gap-2 text-ink-faint">
              {[...path].reverse().map((crumb, i) => (
                <span className="flex items-center gap-2" key={crumb}>
                  {i > 0 ? <Icon name="chevron-right" size={12} /> : null}
                  {crumb}
                </span>
              ))}
            </nav>
            <h1 className="headline-xl text-ink lg:display-xl">
              <span className="font-medium">Good morning,</span>{" "}
              <span className="font-bold">{firstName(state.user.name)}</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              {automationsToday.toLocaleString("en-IN")} automated actions ran in your jurisdiction
              today. {k.pendingValidation + k.fundingRequired} items need a decision from you.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/gov/priority" icon="target">
              Action queue
            </ButtonLink>
            <ButtonLink href="/gov/automation" icon="bot" tone="outline">
              Automation centre
            </ButtonLink>
          </div>
        </div>
      </Enter>

      {/* ------------------------------------------------------------ kpis */}
      <Enter index={1}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <KpiCard
            href="/gov/problems?view=active"
            icon="warning"
            label="Active problems"
            value={k.active}
            hint={`${count(k.citizensAffected)} citizens affected`}
          />
          <KpiCard
            emphasis={k.critical > 0}
            href="/gov/problems?view=critical"
            icon="alert-circle"
            label="Critical"
            tone="critical"
            value={k.critical}
            delta="+1 this week"
          />
          <KpiCard
            href="/gov/problems?view=pending_validation"
            icon="eye"
            label="Pending validation"
            tone="warning"
            value={k.pendingValidation}
            hint="SLA clock running"
          />
          <KpiCard
            href="/gov/problems?view=awaiting_sponsorship"
            icon="factory"
            label="Awaiting sponsorship"
            value={k.awaitingSponsorship}
            hint="With industry"
          />
          <KpiCard
            href="/gov/problems?view=funding_required"
            icon="banknote"
            label="Government funding"
            tone="gold"
            value={k.fundingRequired}
            hint={k.fundingRequired ? `${rupees(money.pendingAmount)} to approve` : "Nothing awaiting approval"}
          />
          <KpiCard
            href="/gov/problems?view=in_progress"
            icon="clipboard"
            label="In progress"
            value={k.inProgress}
          />
          <KpiCard
            href="/gov/problems?view=overdue"
            icon="clock"
            label="SLA breached"
            tone="critical"
            value={k.overdue}
          />
          <KpiCard
            href="/gov/verification"
            icon="thumbs-up"
            label="Verification pending"
            tone="warning"
            value={k.verificationPending}
            hint={`${verification.pending} citizens yet to reply`}
          />
          <KpiCard
            href="/gov/problems?view=resolved"
            icon="check-circle"
            label="Resolved & verified"
            tone="success"
            value={k.resolved}
          />
          <KpiCard
            href="/gov/impact"
            icon="trending-up"
            label="Verified impact"
            tone="success"
            value={`${Math.round(
              (verification.confirmed / Math.max(1, verification.confirmed + verification.denied)) * 100,
            )}%`}
            hint="Citizen-confirmed fixes"
          />
        </div>
      </Enter>

      {/* -------------------------------------------------------- pipeline */}
      <Enter index={2}>
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="headline-md text-ink">What the system did on its own</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Every citizen report walks this pipeline. The steps marked{" "}
                <span className="font-semibold text-ink">automated</span> need no officer.
              </p>
            </div>
            <Badge icon="bot" tone="info">
              {automationsToday.toLocaleString("en-IN")} runs today
            </Badge>
          </div>

          <ol className="mt-4 flex gap-1 overflow-x-auto pb-2 [scrollbar-width:thin]">
            {PIPELINE.map((step, i) => (
              <li className="flex shrink-0 items-center gap-1" key={step.label}>
                {i > 0 ? <Icon className="text-ink-faint" name="chevron-right" size={14} /> : null}
                <span
                  className={cx(
                    "flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap",
                    step.auto
                      ? "bg-primary-fixed text-on-primary-fixed-variant"
                      : "bg-card-muted text-ink-muted",
                  )}
                >
                  <Icon name={step.icon} size={14} />
                  {step.label}
                  {step.auto ? <Icon name="bot" size={12} /> : null}
                </span>
              </li>
            ))}
          </ol>

          {attention.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-warning-tint px-4 py-3">
              <Icon className="text-on-warning-tint" name="warning" size={16} />
              <p className="min-w-0 flex-1 text-sm text-on-warning-tint">
                {attention.length} automations need attention: {attention.map((a) => a.name).join(", ")}.
              </p>
              <Link className="text-sm font-bold text-on-warning-tint underline" href="/gov/automation">
                Review
              </Link>
            </div>
          ) : null}
        </Card>
      </Enter>

      {/* ------------------------------------------------- two-column body */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="flex flex-col gap-6 xl:col-span-2">
          {/* action required */}
          <Enter index={3}>
            <Card>
              <CardHeader
                action={
                  <Link className="text-sm font-semibold text-navy hover:underline" href="/gov/priority">
                    Full queue
                  </Link>
                }
                icon="target"
                subtitle="Ranked by the priority engine, not by report count. Each row says what it is waiting for."
                title="Action required"
              />
              <div className="flex flex-col gap-2 p-5 pt-4">
                {actionQueue.map((p) => {
                  const action = nextAction(p);
                  return (
                    <ProblemRow
                      key={p.id}
                      problem={p}
                      trailing={
                        <ButtonLink href={action.href} size="sm" tone={action.tone}>
                          {action.label}
                        </ButtonLink>
                      }
                    />
                  );
                })}
              </div>
            </Card>
          </Enter>

          {/* demand vs resolution */}
          <Enter index={4}>
            <Card className="p-5">
              <SectionHeader
                actionHref="/gov/impact"
                actionLabel="Analytics"
                icon="bar-chart"
                title="Citizen demand against resolution"
              />
              <div className="mt-4">
                <TrendChart
                  aLabel="Reports received"
                  bLabel="Problems resolved"
                  caption="12 weeks · Ranchi block"
                  points={govSeed.trend.map((t) => ({ label: t.week, a: t.reported, b: t.resolved }))}
                />
              </div>
            </Card>
          </Enter>

          {/* money */}
          <Enter index={5}>
            <Card className="p-5">
              <SectionHeader
                actionHref="/gov/funding"
                actionLabel="Funding"
                icon="banknote"
                title="Where the money is coming from"
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: "Total budget", value: money.allocated, hint: "Across 5 departments" },
                  { label: "Committed", value: money.committed, hint: "Work orders issued" },
                  { label: "Industry sponsored", value: money.sponsored, hint: "CSR, no government outlay" },
                  { label: "Government funded", value: money.governmentFunded, hint: "Approved this year" },
                ].map((m) => (
                  <div className="rounded-md bg-card-muted p-4" key={m.label}>
                    <p className="label-caps text-ink-faint">{m.label}</p>
                    <p className="mt-1 text-xl font-bold text-ink tabular-nums">{rupees(m.value)}</p>
                    <p className="mt-0.5 text-xs text-ink-muted">{m.hint}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex items-baseline justify-between text-sm">
                  <span className="text-ink-muted">Budget utilisation</span>
                  <span className="font-bold text-ink tabular-nums">
                    {Math.round((money.spent / money.allocated) * 100)}% spent ·{" "}
                    {Math.round((money.committed / money.allocated) * 100)}% committed
                  </span>
                </div>
                <Progress className="mt-2" label="Budget utilisation" value={(money.spent / money.allocated) * 100} />
              </div>
            </Card>
          </Enter>
        </div>

        {/* ------------------------------------------------------- sidebar */}
        <div className="flex flex-col gap-6">
          <Enter index={3}>
            <Card>
              <CardHeader
                action={
                  <Link className="text-sm font-semibold text-navy hover:underline" href="/gov/alerts">
                    All
                  </Link>
                }
                icon="bell"
                subtitle="Act from here — no need to hunt for the record."
                title="Alerts & escalations"
              />
              <ul className="flex flex-col gap-2 p-5 pt-4">
                {alerts.map((a) => (
                  <li className="rounded-md bg-card-muted p-3" key={a.id}>
                    <div className="flex items-start gap-2">
                      <Icon
                        className={cx(
                          "mt-0.5 shrink-0",
                          a.kind === "sla_breach" ? "text-danger" : a.kind === "sponsorship_expiring" ? "text-community-deep" : "text-navy",
                        )}
                        name={a.kind === "sla_breach" ? "alert-circle" : a.kind === "priority_changed" ? "trending-up" : "bell"}
                        size={16}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-ink">{a.title}</p>
                        <p className="mt-0.5 text-xs text-ink-muted">{a.detail}</p>
                        <div className="mt-2 flex items-center gap-2">
                          {a.problemId ? (
                            <ButtonLink
                              href={`/gov/problems/${a.problemId}`}
                              onClick={() => void actions.markAlertRead(a.id)}
                              size="sm"
                              tone="outline"
                            >
                              {a.actionLabel ?? "Open"}
                            </ButtonLink>
                          ) : null}
                          <Button
                            onClick={() => void actions.markAlertRead(a.id)}
                            size="sm"
                            tone="ghost"
                          >
                            Dismiss
                          </Button>
                          <span className="ml-auto text-[11px] text-ink-faint">{relative(a.at)}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
                {alerts.length === 0 ? (
                  <li className="rounded-md bg-card-muted p-4 text-sm text-ink-muted">
                    Nothing outstanding — every alert has been acted on.
                  </li>
                ) : null}
              </ul>
            </Card>
          </Enter>

          <Enter index={4}>
            <Card className="p-5">
              <SectionHeader icon="users" title="Demand by category" />
              <p className="mt-1 text-sm text-ink-muted">
                Citizen reports, after {count(k.duplicates)} duplicates were folded in.
              </p>
              <BarList className="mt-4" data={byCategory} />
            </Card>
          </Enter>

          <Enter index={5}>
            <Card className="p-5">
              <SectionHeader actionHref="/gov/projects" actionLabel="Projects" icon="clipboard" title="Delivery in flight" />
              <ul className="mt-4 flex flex-col gap-3">
                {ranked
                  .filter((p) => p.project && p.project.phase !== "completed")
                  .map((p) => (
                    <li className="rounded-md bg-card-muted p-3" key={p.id}>
                      <Link className="block truncate text-sm font-bold text-ink hover:underline" href={`/gov/problems/${p.id}`}>
                        {p.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {officerName(p.assignedOfficerId, state.officers)} ·{" "}
                        {villageName(p.villageIds[0])}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <Progress className="flex-1" label={`${p.title} progress`} value={p.project!.progress} />
                        <span className="text-xs font-bold text-ink tabular-nums">
                          {p.project!.progress}%
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <SlaChip dense dueAt={p.project!.dueAt} />
                        <span className="text-xs text-ink-muted tabular-nums">
                          {rupees(p.project!.spent)} / {rupees(p.project!.budget)}
                        </span>
                      </div>
                    </li>
                  ))}
              </ul>
            </Card>
          </Enter>

          <Enter index={6}>
            <Card className="p-5">
              <SectionHeader actionHref="/gov/verification" actionLabel="Open" icon="thumbs-up" title="Citizens close the loop" />
              <p className="mt-1 text-sm text-ink-muted">
                A problem is not resolved because an officer said so — it is resolved when the people
                who reported it confirm it.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                {[
                  { label: "Confirmed", value: verification.confirmed, tone: "text-impact-deep" },
                  { label: "Denied", value: verification.denied, tone: "text-danger" },
                  { label: "Pending", value: verification.pending, tone: "text-ink" },
                ].map((v) => (
                  <div className="rounded-md bg-card-muted p-3" key={v.label}>
                    <p className={cx("text-xl font-bold tabular-nums", v.tone)}>{v.value}</p>
                    <p className="text-xs text-ink-muted">{v.label}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-3 rounded-md bg-card-muted p-3">
                <Sparkline
                  label="Resolution confidence trend"
                  tone="impact"
                  values={govSeed.trend.map((t) => t.resolved)}
                />
                <span className="min-w-0 text-xs text-ink-muted">
                  Resolution confidence is the share of reporters who confirmed the fix, weighted by
                  how many replied.
                </span>
              </div>
            </Card>
          </Enter>
        </div>
      </div>

      <Enter index={7}>
        <Card className="flex flex-wrap items-center gap-4 p-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-fixed text-on-primary-fixed-variant">
            <Icon name="map" size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="headline-md text-ink">See it on the ground</h2>
            <p className="text-sm text-ink-muted">
              {ranked.length} problems across {new Set(ranked.flatMap((p) => p.villageIds)).size}{" "}
              villages, pinned by report volume and severity.
            </p>
          </div>
          <ButtonLink href="/gov/map" icon="map-pin" tone="outline">
            Open map
          </ButtonLink>
        </Card>
      </Enter>

      <p className="pb-4 text-center text-xs text-ink-faint">
        Every figure above is scoped to {path[0]} and to the permissions of the signed-in officer.
        Data is served from the mock service layer until <code>/backend/api</code> is live.
      </p>
    </div>
  );
}
