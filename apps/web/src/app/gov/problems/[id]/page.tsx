"use client";

/**
 * Problem dossier.
 *
 * One record, every face of it: what citizens said, what the system understood,
 * why it ranks where it does, who owns it, who might pay for it, what the
 * government will pay if nobody else does, what was built, and whether the
 * people who reported it agree it is fixed.
 *
 * Actions live next to the evidence for them, so an officer never approves
 * funding on one screen having read the case on another.
 */

import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { GovMap } from "@/components/gov/map";
import {
  AuditTrail,
  CategoryChip,
  LifecycleTimeline,
  ScoreBreakdown,
  SeverityBadge,
  SlaChip,
  StatusBadge,
  WhyThisRank,
} from "@/components/gov/pieces";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Enter,
  Progress,
  cx,
} from "@/components/ui";
import { Tabs } from "@/components/ui-interactive";
import { count, dateTime, percent, relative, rupees, shortDate, sla } from "@/lib/gov/format";
import { CATEGORY_LABEL } from "@/lib/gov/filters";
import {
  department,
  departmentName,
  officerName,
  recommendOfficer,
  sponsor,
  sponsorName,
  villageName,
  villagePopulation,
} from "@/lib/gov/selectors";
import { govSeed, useGov } from "@/lib/gov/store";
import type { SponsorMatch } from "@/lib/gov/types";
import { EvidenceGallery } from "@/components/evidence-gallery";
import { EvidenceUpload } from "@/components/evidence-upload";
import type { EvidencePair } from "@/lib/report/types";
import { GovApi } from "@/lib/gov/api";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "reports", label: "Citizen reports" },
  { id: "intelligence", label: "AI intelligence" },
  { id: "priority", label: "Priority" },
  { id: "routing", label: "Department" },
  { id: "sponsorship", label: "Sponsorship" },
  { id: "funding", label: "Funding" },
  { id: "project", label: "Project" },
  { id: "evidence", label: "Evidence" },
  { id: "verification", label: "Verification" },
  { id: "audit", label: "Audit trail" },
];

export default function ProblemDossier() {
  const params = useParams<{ id: string }>();
  const { state, ranked, dispatch, can, actions } = useGov();
  const [tab, setTab] = useState("overview");
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideDept, setOverrideDept] = useState("");
  const [overrideReason, setOverrideReason] = useState("");

  /**
   * The photographs, fetched rather than derived.
   *
   * `problem.evidence` carries the counts the register has always held; the
   * images live on their own endpoint so the public portal can read them in
   * stage 07 without any of the rest of a government problem coming along.
   */
  const [evidence, setEvidence] = useState<EvidencePair | null>(null);
  useEffect(() => {
    let cancelled = false;
    void GovApi.evidence(params.id)
      .then((pair) => {
        if (!cancelled) setEvidence(pair);
      })
      .catch(() => {
        if (!cancelled) setEvidence(null);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function saveEvidence(side: "before" | "after", keys: string[]) {
    if (keys.length === 0) return;
    await GovApi.addEvidence(params.id, side, keys);
    setEvidence(await GovApi.evidence(params.id));
  }

  const problem = ranked.find((p) => p.id === params.id);

  if (!problem) {
    /* Outside the signed-in officer's jurisdiction, or not a real id — the two
       are deliberately indistinguishable from here. */
    const exists = govSeed.problems.some((p) => p.id === params.id);
    if (!exists) notFound();
    return (
      <Card className="mx-auto mt-10 max-w-lg p-8 text-center">
        <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-critical-tint text-on-critical-tint">
          <Icon name="lock" size={28} />
        </span>
        <h1 className="headline-lg mt-4 text-ink">Outside your jurisdiction</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {params.id} belongs to another administrative unit. Switch jurisdiction from the header if
          you hold a role there.
        </p>
        <ButtonLink className="mt-5" href="/gov/problems" tone="outline">
          Back to the register
        </ButtonLink>
      </Card>
    );
  }

  const reports = govSeed.reports.filter((r) => r.problemId === problem.id);
  const dept = department(problem.departmentId);
  const recommended = recommendOfficer(problem, state.officers);
  const eligibleOfficers = state.officers.filter((o) => o.departmentId === problem.departmentId);

  const sponsorshipOpen =
    problem.sponsorship.status === "invited" ||
    problem.sponsorship.status === "interested" ||
    problem.sponsorship.status === "proposal";

  return (
    <div className="flex flex-col gap-6">
      {/* ---------------------------------------------------------- header */}
      <Enter>
        <div className="flex flex-col gap-4">
          <nav className="label-caps flex flex-wrap items-center gap-2 text-ink-faint">
            <Link className="hover:text-ink" href="/gov/problems">
              Problems
            </Link>
            <Icon name="chevron-right" size={12} />
            <span>{problem.id}</span>
          </nav>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary px-3 py-1 text-sm font-bold text-white tabular-nums">
                  #{problem.rank} · score {problem.score}
                </span>
                <SeverityBadge severity={problem.severity} />
                <StatusBadge status={problem.status} />
                <SlaChip dueAt={problem.slaDueAt} />
              </div>
              <h1 className="headline-xl mt-3 text-ink">{problem.title}</h1>
              <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                <CategoryChip category={problem.category} />
                <span className="inline-flex items-center gap-1">
                  <Icon name="map-pin" size={14} />
                  {problem.villageIds.map(villageName).join(", ")}
                </span>
                <span>{count(problem.reportCount)} citizen reports</span>
                {/* Shown beside the report count, never added to it. Two
                    numbers because the ranking weighs them separately, and an
                    officer deciding what to do next needs to see when the two
                    disagree — a problem few reported and many voted for is a
                    different situation from the reverse. */}
                <span>{count(problem.voteCount)} citizen votes</span>
                <span>{count(problem.affected)} people affected</span>
                <span>opened {relative(problem.createdAt)}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {problem.status === "pending_validation" && can("problem.validate") ? (
                <>
                  <Button
                    icon="check"
                    onClick={() => void actions.validate(problem.id)}
                  >
                    Validate
                  </Button>
                  <Button
                    icon="x"
                    onClick={() =>
                      void actions.reject(
                        problem.id,
                        "Not a civic problem in this jurisdiction",
                      )
                    }
                    tone="outline"
                  >
                    Reject
                  </Button>
                </>
              ) : null}
              {problem.status === "awaiting_sponsorship" &&
              problem.sponsorship.status === "awaiting" &&
              can("sponsorship.invite") ? (
                <Button
                  icon="send"
                  onClick={() => void actions.inviteSponsors(problem.id)}
                >
                  Request sponsorship
                </Button>
              ) : null}
              {problem.funding.status === "recommended" && can("funding.approve") ? (
                <Button
                  icon="banknote"
                  onClick={() => void actions.approveFunding(problem.id)}
                >
                  Approve funding
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </Enter>

      {/* ------------------------------------------------------- lifecycle */}
      <Enter index={1}>
        <Card className="p-5">
          <LifecycleTimeline orientation="horizontal" stage={problem.stage} />
        </Card>
      </Enter>

      <Enter index={2}>
        <Tabs onChange={setTab} tabs={TABS} value={tab} />
      </Enter>

      {/* ========================================================= panels */}
      {tab === "overview" ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="headline-md text-ink">What we know</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { k: "Category", v: CATEGORY_LABEL[problem.category] },
                { k: "Cluster", v: problem.ai.clusterLabel },
                { k: "Duration", v: `${problem.ai.durationDays} days` },
                { k: "Affected population", v: count(problem.affected) },
                { k: "Villages", v: problem.villageIds.map(villageName).join(", ") },
                { k: "Village population", v: count(villagePopulation(problem)) },
                { k: "Department", v: departmentName(problem.departmentId) },
                { k: "Officer", v: officerName(problem.assignedOfficerId, state.officers) },
                { k: "Estimated cost", v: rupees(problem.estimatedCost) },
              ].map((row) => (
                <div key={row.k}>
                  <dt className="label-caps text-ink-faint">{row.k}</dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">{row.v}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 rounded-md bg-card-muted p-4">
              <p className="label-caps text-ink-faint">Where &ldquo;{count(problem.affected)} affected&rdquo; comes from</p>
              <p className="mt-1 text-sm text-ink-muted">
                Sum of the village register population for{" "}
                {problem.villageIds.map(villageName).join(", ")} ({count(villagePopulation(problem))}),
                intersected with the geography the {count(problem.reportCount)} reports fall inside,
                and capped at the service area of the failed asset. Last recomputed{" "}
                {relative(problem.updatedAt)}.
              </p>
            </div>

            <div className="mt-5">
              <h3 className="font-bold text-ink">Before / after at a glance</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md bg-card-muted p-4">
                  <p className="label-caps text-ink-faint">Before</p>
                  <p className="mt-1 text-2xl font-bold text-ink tabular-nums">
                    {problem.evidence.before.activeReports}
                  </p>
                  <p className="text-xs text-ink-muted">active reports · {problem.evidence.before.photos} photos</p>
                  <p className="mt-2 text-sm text-ink-muted">{problem.evidence.before.note}</p>
                </div>
                <div className={cx("rounded-md p-4", problem.evidence.after ? "bg-success-tint" : "bg-card-muted")}>
                  <p className="label-caps text-ink-faint">After</p>
                  <p className="mt-1 text-2xl font-bold text-ink tabular-nums">
                    {problem.evidence.after ? problem.evidence.after.activeReports : "—"}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {problem.evidence.after
                      ? `active reports · ${problem.evidence.after.photos} photos`
                      : "pending completion"}
                  </p>
                  <p className="mt-2 text-sm text-ink-muted">
                    {problem.evidence.after?.note ?? "Completion evidence has not been uploaded yet."}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-6">
            <Card className="p-5">
              <h2 className="headline-md text-ink">Lifecycle</h2>
              <div className="mt-4">
                <LifecycleTimeline stage={problem.stage} />
              </div>
            </Card>

            <Card className="p-5">
              <h2 className="headline-md text-ink">Money</h2>
              <ul className="mt-3 flex flex-col gap-3 text-sm">
                <li className="flex items-center justify-between gap-3">
                  <span className="text-ink-muted">Estimated cost</span>
                  <span className="font-bold text-ink tabular-nums">{rupees(problem.estimatedCost)}</span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-ink-muted">Industry sponsorship</span>
                  <span className="font-bold text-ink">
                    {problem.sponsorship.status === "approved"
                      ? rupees(problem.sponsorship.approvedAmount ?? 0)
                      : problem.sponsorship.status.replace("_", " ")}
                  </span>
                </li>
                <li className="flex items-center justify-between gap-3">
                  <span className="text-ink-muted">Government funding</span>
                  <span className="font-bold text-ink">
                    {problem.funding.status === "approved"
                      ? rupees(problem.funding.required)
                      : problem.funding.status.replace("_", " ")}
                  </span>
                </li>
              </ul>
              <ButtonLink className="mt-4 w-full" href="#" onClick={() => setTab("funding")} size="sm" tone="outline">
                Open funding
              </ButtonLink>
            </Card>
          </div>
        </div>
      ) : null}

      {/* ------------------------------------------------- citizen reports */}
      {tab === "reports" ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="headline-md text-ink">
                {count(problem.reportCount)} reports → one problem
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                {problem.duplicateCount} exact duplicates were folded in automatically. Showing the{" "}
                {reports.length} most recent distinct reports.
              </p>
              <p className="mt-1 text-sm text-ink-muted">
                A further {count(problem.voteCount)}{" "}
                {problem.voteCount === 1 ? "resident has" : "residents have"} voted that this
                matters without filing a report of their own.
              </p>
            </div>
            <Badge icon="bot" tone="info">
              Clustered automatically
            </Badge>
          </div>

          <ul className="mt-4 flex flex-col gap-3">
            {reports.map((r) => (
              <li className="rounded-md bg-card-muted p-4" key={r.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-ink">{r.citizenName}</span>
                  <Badge dense icon={r.channel === "voice" ? "volume-on" : r.channel === "photo" ? "eye" : "message"} tone="neutral">
                    {r.channel}
                  </Badge>
                  <span className="text-xs text-ink-muted">
                    {villageName(r.villageId)} · {relative(r.at)} · {r.language}
                  </span>
                  {r.duplicateOf ? (
                    <Badge dense icon="folder" tone="warning">
                      duplicate of {r.duplicateOf}
                    </Badge>
                  ) : null}
                  <span className="ml-auto text-xs text-ink-faint tabular-nums">
                    {r.aiConfidence}% match
                  </span>
                </div>
                <p className="mt-2 text-sm text-ink">&ldquo;{r.raw}&rdquo;</p>
                {r.photos ? (
                  <p className="mt-1 text-xs text-ink-muted">{r.photos} photos attached</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {/* -------------------------------------------------- ai intelligence */}
      {tab === "intelligence" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-sm bg-tint-orchid text-on-tint-orchid">
                <Icon name="sparkles" size={18} />
              </span>
              <h2 className="headline-md text-ink">What the system understood</h2>
            </div>

            <div className="mt-4 rounded-md bg-card-muted p-4">
              <p className="label-caps text-ink-faint">Citizen&rsquo;s own words · {problem.ai.originalLanguage}</p>
              <p className="mt-2 text-sm text-ink">&ldquo;{problem.ai.originalQuote}&rdquo;</p>
            </div>

            <div className="mt-3 flex justify-center">
              <Icon className="text-ink-faint" name="chevron-down" size={20} />
            </div>

            <div className="rounded-md bg-primary-fixed p-4">
              <p className="label-caps text-on-primary-fixed-variant">Structured interpretation</p>
              <dl className="mt-2 flex flex-col gap-2">
                {problem.ai.interpretation.map((row) => (
                  <div className="flex flex-wrap justify-between gap-2" key={row.label}>
                    <dt className="text-sm text-on-primary-fixed-variant">{row.label}</dt>
                    <dd className="text-sm font-bold text-on-primary-fixed">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <p className="mt-4 text-xs text-ink-muted">
              Interpretation assists; it does not decide. Category, severity and duplicates are model
              outputs an officer can override — the ranking, routing and funding rules that act on
              them are deterministic and shown in full on the Priority and Department tabs.
            </p>
          </Card>

          <Card className="p-5">
            <h2 className="headline-md text-ink">Detection summary</h2>
            <dl className="mt-4 grid grid-cols-2 gap-4">
              {[
                { k: "Category", v: CATEGORY_LABEL[problem.ai.category], c: `${problem.ai.categoryConfidence}% confidence` },
                { k: "Severity", v: problem.ai.severity, c: "policy-mapped from consequence" },
                { k: "Duration", v: `${problem.ai.durationDays} days`, c: "since first credible report" },
                { k: "Affected", v: count(problem.ai.affected), c: "village register ∩ report geography" },
                { k: "Similar reports", v: count(problem.ai.similarReports), c: `${problem.duplicateCount} exact duplicates` },
                { k: "Cluster", v: problem.ai.clusterLabel, c: "one problem, many voices" },
              ].map((row) => (
                <div key={row.k}>
                  <dt className="label-caps text-ink-faint">{row.k}</dt>
                  <dd className="mt-1 text-sm font-bold text-ink capitalize">{row.v}</dd>
                  <dd className="text-xs text-ink-muted">{row.c}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 rounded-md bg-card-muted p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Icon name="gauge" size={16} /> Confidence {problem.ai.categoryConfidence}%
              </p>
              <Progress className="mt-2" label="Classification confidence" value={problem.ai.categoryConfidence} />
              <p className="mt-2 text-xs text-ink-muted">
                Below 70% the problem is held for manual classification instead of being routed.
              </p>
            </div>
          </Card>
        </div>
      ) : null}

      {/* --------------------------------------------------------- priority */}
      {tab === "priority" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="headline-md text-ink">Score {problem.score} · rank #{problem.rank}</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Weighted contribution of each need signal under the current weighting.
            </p>
            <ScoreBreakdown problem={problem} weights={state.weights} />
            <ButtonLink className="mt-5" href="/gov/priority" icon="gauge" tone="outline">
              Open the simulator
            </ButtonLink>
          </Card>
          <Card className="p-5">
            <h2 className="headline-md text-ink">Explainability</h2>
            <div className="mt-4">
              <WhyThisRank defaultOpen problem={problem} weights={state.weights} />
            </div>
          </Card>
        </div>
      ) : null}

      {/* ---------------------------------------------------------- routing */}
      {tab === "routing" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="headline-md text-ink">Auto-routed</h2>
              <Badge icon="bot" tone="info">
                automated
              </Badge>
            </div>
            <dl className="mt-4 flex flex-col gap-3">
              <div>
                <dt className="label-caps text-ink-faint">Department</dt>
                <dd className="text-sm font-bold text-ink">{dept?.name}</dd>
              </div>
              <div>
                <dt className="label-caps text-ink-faint">Officer</dt>
                <dd className="text-sm font-bold text-ink">
                  {officerName(problem.assignedOfficerId, state.officers)}
                </dd>
              </div>
              <div>
                <dt className="label-caps text-ink-faint">Reason</dt>
                <dd className="text-sm text-ink-muted">{problem.ai.routingReason}</dd>
              </div>
              <div>
                <dt className="label-caps text-ink-faint">Department SLA</dt>
                <dd className="text-sm text-ink-muted">{dept?.slaHours}h for this category</dd>
              </div>
            </dl>

            {problem.ai.routingOverridden ? (
              <div className="mt-4 rounded-md bg-warning-tint p-4">
                <p className="text-sm font-bold text-on-warning-tint">Routing was overridden</p>
                <p className="mt-1 text-sm text-on-warning-tint">
                  {problem.ai.routingOverridden.reason}
                </p>
                <p className="mt-1 text-xs text-on-warning-tint">
                  by {officerName(problem.ai.routingOverridden.byOfficerId, state.officers)} ·{" "}
                  {relative(problem.ai.routingOverridden.at)}
                </p>
              </div>
            ) : null}

            {can("problem.route") ? (
              <div className="mt-4">
                {overrideOpen ? (
                  <div className="rounded-md bg-card-muted p-4">
                    <label className="label-caps block text-ink-faint" htmlFor="dept">
                      Route to
                    </label>
                    <select
                      className="mt-1.5 h-11 w-full rounded-md border border-line bg-card px-3 text-sm font-semibold text-ink"
                      id="dept"
                      onChange={(e) => setOverrideDept(e.target.value)}
                      value={overrideDept}
                    >
                      <option value="">Choose a department…</option>
                      {govSeed.departments
                        .filter((d) => d.id !== problem.departmentId)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                    </select>
                    <label className="label-caps mt-3 block text-ink-faint" htmlFor="reason">
                      Reason (recorded in the audit trail)
                    </label>
                    <textarea
                      className="mt-1.5 w-full rounded-md border border-line bg-card p-3 text-sm text-ink"
                      id="reason"
                      onChange={(e) => setOverrideReason(e.target.value)}
                      rows={2}
                      value={overrideReason}
                    />
                    <div className="mt-3 flex gap-2">
                      <Button
                        disabled={!overrideDept || overrideReason.trim().length < 4}
                        onClick={() => {
                          void actions.route(
                            problem.id,
                            overrideDept,
                            overrideReason.trim(),
                          );
                          setOverrideOpen(false);
                          setOverrideReason("");
                        }}
                        size="sm"
                      >
                        Save override
                      </Button>
                      <Button onClick={() => setOverrideOpen(false)} size="sm" tone="ghost">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button icon="file-pen" onClick={() => setOverrideOpen(true)} tone="outline">
                    Override routing
                  </Button>
                )}
              </div>
            ) : null}
          </Card>

          <Card className="p-5" id="assignment">
            <h2 className="headline-md text-ink">Assignment</h2>
            {recommended ? (
              <div className="mt-3 rounded-md bg-primary-fixed p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-on-primary-fixed">
                  <Icon name="bot" size={15} /> System recommendation
                </p>
                <p className="mt-1 text-sm text-on-primary-fixed-variant">
                  Assign to <span className="font-bold">{recommended.name}</span> —{" "}
                  {recommended.activeTasks} active, {recommended.criticalTasks} critical,{" "}
                  {recommended.completionRate}% completion rate, the lightest weighted load in{" "}
                  {dept?.shortName}.
                </p>
              </div>
            ) : null}

            <ul className="mt-4 flex flex-col gap-2">
              {eligibleOfficers.map((o) => {
                const assigned = o.id === problem.assignedOfficerId;
                return (
                  <li
                    className={cx(
                      "flex flex-wrap items-center gap-3 rounded-md p-3",
                      assigned ? "bg-primary-fixed" : "bg-card-muted",
                    )}
                    key={o.id}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-ink">{o.name}</span>
                      <span className="block text-xs text-ink-muted">
                        {o.designation} · {o.activeTasks} active · {o.criticalTasks} critical ·{" "}
                        {o.overdue} overdue
                      </span>
                    </span>
                    {assigned ? (
                      <Badge icon="check" tone="success">
                        Assigned
                      </Badge>
                    ) : can("officer.assign") ? (
                      <Button
                        onClick={() => void actions.assignOfficer(problem.id, o.id)}
                        size="sm"
                        tone="outline"
                      >
                        Assign
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      ) : null}

      {/* ----------------------------------------------------- sponsorship */}
      {tab === "sponsorship" ? (
        <div className="flex flex-col gap-6" id="sponsorship">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="headline-md text-ink">Industry sponsorship</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {problem.sponsorship.eligible
                    ? `Eligible under state CSR guidelines · estimated ${rupees(problem.estimatedCost)}`
                    : problem.sponsorship.failureReason ?? "Not eligible for CSR sponsorship."}
                </p>
              </div>
              <Badge
                icon={problem.sponsorship.status === "approved" ? "check-circle" : "factory"}
                tone={
                  problem.sponsorship.status === "approved"
                    ? "success"
                    : problem.sponsorship.status === "declined"
                      ? "critical"
                      : "info"
                }
              >
                {problem.sponsorship.status.replace("_", " ")}
              </Badge>
            </div>

            {/* status pipeline */}
            <ol className="mt-4 flex flex-wrap gap-1">
              {["awaiting", "invited", "interested", "proposal", "approved"].map((s, i, arr) => {
                const order = arr.indexOf(problem.sponsorship.status);
                const done = order >= 0 && i <= order;
                return (
                  <li className="flex items-center gap-1" key={s}>
                    {i > 0 ? <Icon className="text-ink-faint" name="chevron-right" size={13} /> : null}
                    <span
                      className={cx(
                        "rounded-full px-3 py-1.5 text-xs font-semibold capitalize",
                        done ? "bg-primary text-white" : "bg-card-muted text-ink-muted",
                      )}
                    >
                      {s}
                    </span>
                  </li>
                );
              })}
            </ol>

            {problem.sponsorship.responseDueAt && sponsorshipOpen ? (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md bg-warning-tint p-4">
                <Icon className="text-on-warning-tint" name="clock" size={18} />
                <p className="min-w-0 flex-1 text-sm text-on-warning-tint">
                  Industry response window closes {sla(problem.sponsorship.responseDueAt).label}. If
                  nobody accepts, the government funding fallback fires automatically — no officer
                  action needed.
                </p>
                {can("funding.approve") ? (
                  <Button
                    onClick={() => void actions.sponsorshipFallback(problem.id)}
                    size="sm"
                    tone="outline"
                  >
                    Trigger fallback now
                  </Button>
                ) : null}
              </div>
            ) : null}

            {problem.sponsorship.failureReason && problem.sponsorship.status === "declined" ? (
              <div className="mt-4 rounded-md bg-critical-tint p-4">
                <p className="text-sm font-bold text-on-critical-tint">Industry sponsorship failed</p>
                <p className="mt-1 text-sm text-on-critical-tint">{problem.sponsorship.failureReason}</p>
                <p className="mt-1 text-sm text-on-critical-tint">
                  The problem moved itself into the government funding workflow — see the Funding tab.
                </p>
              </div>
            ) : null}

            {problem.sponsorship.matches.length ? (
              <ul className="mt-5 flex flex-col gap-3">
                {problem.sponsorship.matches.map((m) => (
                  <SponsorRow
                    canApprove={can("sponsorship.approve")}
                    key={m.sponsorId}
                    match={m}
                    onApprove={() => void actions.approveSponsorship(problem.id, m.sponsorId)}
                    onDecline={() =>
                      void actions.declineSponsorship(
                        problem.id,
                        m.sponsorId,
                        "Declined by industry",
                      )
                    }
                  />
                ))}
              </ul>
            ) : (
              <p className="mt-5 rounded-md bg-card-muted p-4 text-sm text-ink-muted">
                No industry match — this problem goes straight to the government funding queue.
              </p>
            )}

            {problem.sponsorship.status === "awaiting" && can("sponsorship.invite") ? (
              <Button
                className="mt-5"
                icon="send"
                onClick={() => void actions.inviteSponsors(problem.id)}
              >
                Send sponsorship request to {problem.sponsorship.matches.length} industries
              </Button>
            ) : null}
          </Card>
        </div>
      ) : null}

      {/* --------------------------------------------------------- funding */}
      {tab === "funding" ? (
        <div className="grid gap-6 lg:grid-cols-3" id="funding">
          <Card className="p-5 lg:col-span-2">
            <h2 className="headline-md text-ink">Government funding</h2>

            {problem.sponsorship.status === "declined" ? (
              <div className="mt-4 flex flex-col gap-3 rounded-md bg-card-muted p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-danger">
                  <Icon name="x" size={16} /> Industry sponsorship failed
                </p>
                <p className="text-sm text-ink-muted">{problem.sponsorship.failureReason}</p>
                <div className="flex items-center gap-2 text-ink-faint">
                  <Icon name="chevron-down" size={16} />
                  <span className="text-xs font-semibold">automatic transition</span>
                </div>
                <p className="flex items-center gap-2 text-sm font-bold text-ink">
                  <Icon name="banknote" size={16} /> Government funding recommendation
                </p>
              </div>
            ) : null}

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-md bg-card-muted p-4">
                <dt className="label-caps text-ink-faint">Required</dt>
                <dd className="mt-1 text-xl font-bold text-ink tabular-nums">
                  {rupees(problem.funding.required || problem.estimatedCost)}
                </dd>
              </div>
              <div className="rounded-md bg-card-muted p-4">
                <dt className="label-caps text-ink-faint">Available in {dept?.shortName}</dt>
                <dd className="mt-1 text-xl font-bold text-ink tabular-nums">
                  {rupees(problem.funding.departmentBudgetAvailable)}
                </dd>
              </div>
              <div className="rounded-md bg-card-muted p-4">
                <dt className="label-caps text-ink-faint">Status</dt>
                <dd className="mt-1">
                  <Badge
                    icon={problem.funding.fundable ? "check-circle" : "alert-circle"}
                    tone={problem.funding.fundable ? "success" : "critical"}
                  >
                    {problem.funding.fundable ? "Fundable" : "Exceeds available budget"}
                  </Badge>
                </dd>
              </div>
              <div className="rounded-md bg-card-muted p-4">
                <dt className="label-caps text-ink-faint">Recommended source</dt>
                <dd className="mt-1 text-sm font-bold text-ink">
                  {problem.funding.source ?? "Not yet determined"}
                </dd>
              </div>
            </dl>

            {problem.funding.note ? (
              <p className="mt-4 text-sm text-ink-muted">{problem.funding.note}</p>
            ) : null}

            {problem.funding.status === "approved" ? (
              <div className="mt-4 rounded-md bg-success-tint p-4">
                <p className="text-sm font-bold text-on-success-tint">
                  Approved {problem.funding.approvedAt ? shortDate(problem.funding.approvedAt) : ""} by{" "}
                  {problem.funding.approvedBy}
                </p>
              </div>
            ) : can("funding.approve") ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  disabled={!problem.funding.fundable}
                  icon="check"
                  onClick={() => void actions.approveFunding(problem.id)}
                >
                  Approve {rupees(problem.funding.required || problem.estimatedCost)}
                </Button>
                <Button
                  icon="x"
                  onClick={() =>
                    void actions.rejectFunding(problem.id, "Deferred to the next financial year")
                  }
                  tone="outline"
                >
                  Reject
                </Button>
              </div>
            ) : (
              <p className="mt-5 rounded-md bg-card-muted p-4 text-sm text-ink-muted">
                Your role cannot approve funding. This decision sits with the Block Development
                Officer or above — switch jurisdiction in the header to act as one.
              </p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="headline-md text-ink">Department budget</h2>
            {dept ? (
              <>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  <li className="flex justify-between gap-3">
                    <span className="text-ink-muted">Allocated</span>
                    <span className="font-bold text-ink tabular-nums">{rupees(dept.budgetAllocated)}</span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span className="text-ink-muted">Committed</span>
                    <span className="font-bold text-ink tabular-nums">{rupees(dept.budgetCommitted)}</span>
                  </li>
                  <li className="flex justify-between gap-3">
                    <span className="text-ink-muted">Spent</span>
                    <span className="font-bold text-ink tabular-nums">{rupees(dept.budgetSpent)}</span>
                  </li>
                  <li className="flex justify-between gap-3 border-t border-line pt-2">
                    <span className="font-semibold text-ink">Uncommitted</span>
                    <span className="font-bold text-ink tabular-nums">
                      {rupees(dept.budgetAllocated - dept.budgetCommitted)}
                    </span>
                  </li>
                </ul>
                <Progress
                  className="mt-4"
                  label="Committed share"
                  value={(dept.budgetCommitted / dept.budgetAllocated) * 100}
                />
              </>
            ) : null}
          </Card>
        </div>
      ) : null}

      {/* --------------------------------------------------------- project */}
      {tab === "project" ? (
        <div className="grid gap-6 lg:grid-cols-3" id="project">
          {problem.project ? (
            <>
              <Card className="p-5 lg:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="label-caps text-ink-faint">{problem.project.id}</p>
                    <h2 className="headline-md text-ink">{problem.project.contractor}</h2>
                    <p className="mt-1 text-sm text-ink-muted">
                      Responsible officer: {officerName(problem.project.officerId, state.officers)}
                    </p>
                  </div>
                  <Badge icon="clipboard" tone="info">
                    {problem.project.phase}
                  </Badge>
                </div>

                <div className="mt-5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-ink-muted">Progress</span>
                    <span className="text-sm font-bold text-ink tabular-nums">
                      {percent(problem.project.progress)}
                    </span>
                  </div>
                  <Progress className="mt-2" label="Project progress" value={problem.project.progress} />
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <dt className="label-caps text-ink-faint">Budget</dt>
                    <dd className="text-sm font-bold text-ink tabular-nums">
                      {rupees(problem.project.spent)} / {rupees(problem.project.budget)}
                    </dd>
                  </div>
                  <div>
                    <dt className="label-caps text-ink-faint">Timeline</dt>
                    <dd className="text-sm font-bold text-ink tabular-nums">
                      Day {problem.project.dayOfPlan} / {problem.project.planDays}
                    </dd>
                  </div>
                  <div>
                    <dt className="label-caps text-ink-faint">Expected completion</dt>
                    <dd className="text-sm font-bold text-ink">{shortDate(problem.project.dueAt)}</dd>
                  </div>
                  <div>
                    <dt className="label-caps text-ink-faint">Started</dt>
                    <dd className="text-sm font-bold text-ink">{shortDate(problem.project.startedAt)}</dd>
                  </div>
                </dl>

                <h3 className="mt-6 font-bold text-ink">Milestones</h3>
                <ol className="mt-3 flex flex-col gap-2">
                  {problem.project.milestones.map((m) => (
                    <li className="flex items-center gap-3 rounded-md bg-card-muted p-3" key={m.label}>
                      <span
                        className={cx(
                          "flex size-6 shrink-0 items-center justify-center rounded-full",
                          m.done ? "bg-primary text-white" : "border border-line bg-card text-ink-faint",
                        )}
                      >
                        {m.done ? <Icon name="check" size={13} /> : null}
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-semibold text-ink">{m.label}</span>
                      <span className="text-xs text-ink-muted">
                        {m.at ? shortDate(m.at) : "pending"}
                      </span>
                    </li>
                  ))}
                </ol>
              </Card>

              <Card className="p-5">
                <h2 className="headline-md text-ink">Update delivery</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Marking a project complete asks its reporters to verify — the officer cannot close
                  it alone.
                </p>
                {can("project.update") ? (
                  <div className="mt-4 flex flex-col gap-3">
                    <label className="label-caps text-ink-faint" htmlFor="progress">
                      Progress: {problem.project.progress}%
                    </label>
                    <input
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-track accent-[var(--color-primary)]"
                      id="progress"
                      max={100}
                      min={0}
                      /* Dragging updates the store only. A range input fires
                         onChange for every pixel of travel, so calling the API
                         here would be a request per pixel — the commit happens
                         on release, below. */
                      onChange={(e) =>
                        dispatch({
                          type: "project/progress",
                          id: problem.id,
                          progress: Number(e.target.value),
                        })
                      }
                      /* Release, or tab away after arrow-keying it. Both, because
                         a slider that only saves on mouse-up is unusable with a
                         keyboard. */
                      onBlur={(e) => void actions.projectProgress(problem.id, Number(e.target.value))}
                      onPointerUp={(e) =>
                        void actions.projectProgress(
                          problem.id,
                          Number((e.target as HTMLInputElement).value),
                        )
                      }
                      step={1}
                      type="range"
                      value={problem.project.progress}
                    />
                    <Button
                      disabled={problem.project.phase === "completed"}
                      icon="check-circle"
                      onClick={() => void actions.completeProject(problem.id)}
                    >
                      Mark complete & request verification
                    </Button>
                    <Button icon="upload" tone="outline">
                      Upload completion evidence
                    </Button>
                  </div>
                ) : (
                  <p className="mt-4 rounded-md bg-card-muted p-4 text-sm text-ink-muted">
                    Your role cannot update project delivery.
                  </p>
                )}
              </Card>
            </>
          ) : (
            <Card className="p-6 lg:col-span-3">
              <p className="text-sm text-ink-muted">
                No project yet. A project is created automatically when funding is approved or an
                industry sponsorship is accepted.
              </p>
            </Card>
          )}
        </div>
      ) : null}

      {/* -------------------------------------------------------- evidence */}
      {tab === "evidence" ? (
        <>
        {/* The photographs themselves. The panels below carry the counts the
            government screens have always shown; this is what a citizen — and
            in stage 07 a stranger on the public portal — actually looks at. */}
        <Card className="mb-6 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="headline-md text-ink">Before and after</h2>
              <p className="mt-1 text-sm text-ink-muted">
                What the citizens who reported this see when they are asked whether it was fixed.
              </p>
            </div>
          </div>

          <EvidenceGallery
            after={evidence?.after ?? null}
            before={evidence?.before ?? null}
            className="mt-5"
          />

          {can("project.update") ? (
            <div className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
              <EvidenceUpload
                hint="The state of the problem as reported."
                label="Add before photographs"
                max={6}
                onChange={(keys) => void saveEvidence("before", keys)}
                purpose="evidence-before"
              />
              <EvidenceUpload
                hint="Required before citizen verification means anything."
                label="Add after photographs"
                max={6}
                onChange={(keys) => void saveEvidence("after", keys)}
                purpose="evidence-after"
              />
            </div>
          ) : null}
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="headline-md text-ink">Before</h2>
            <div className="mt-3 flex aspect-video items-center justify-center rounded-md bg-container">
              <span className="flex flex-col items-center gap-2 text-ink-muted">
                <Icon name="eye" size={28} />
                <span className="text-sm">{problem.evidence.before.photos} field photographs</span>
              </span>
            </div>
            <dl className="mt-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Active reports</dt>
                <dd className="font-bold text-ink tabular-nums">{problem.evidence.before.activeReports}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Affected population</dt>
                <dd className="font-bold text-ink tabular-nums">{count(problem.affected)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Severity</dt>
                <dd className="font-bold text-ink capitalize">{problem.severity}</dd>
              </div>
            </dl>
            <p className="mt-3 text-sm text-ink-muted">{problem.evidence.before.note}</p>
          </Card>

          <Card className={cx("p-5", !problem.evidence.after && "opacity-70")}>
            <h2 className="headline-md text-ink">After</h2>
            <div className="mt-3 flex aspect-video items-center justify-center rounded-md bg-container">
              <span className="flex flex-col items-center gap-2 text-ink-muted">
                <Icon name={problem.evidence.after ? "check-circle" : "upload"} size={28} />
                <span className="text-sm">
                  {problem.evidence.after
                    ? `${problem.evidence.after.photos} completion photographs`
                    : "Awaiting completion evidence"}
                </span>
              </span>
            </div>
            {problem.evidence.after ? (
              <>
                <dl className="mt-4 flex flex-col gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">Active reports</dt>
                    <dd className="font-bold text-ink tabular-nums">
                      {problem.evidence.after.activeReports}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-muted">Demand reduction</dt>
                    <dd className="font-bold text-impact-deep tabular-nums">
                      {Math.round(
                        (1 - problem.evidence.after.activeReports / Math.max(1, problem.evidence.before.activeReports)) * 100,
                      )}
                      %
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm text-ink-muted">{problem.evidence.after.note}</p>
              </>
            ) : (
              <p className="mt-4 text-sm text-ink-muted">
                Completion evidence is uploaded above, and is required before citizen
                verification means anything — a request to confirm work nobody can see is a
                request to take somebody&rsquo;s word for it.
              </p>
            )}
          </Card>
        </div>
        </>
      ) : null}

      {/* ---------------------------------------------------- verification */}
      {tab === "verification" ? (
        <div className="grid gap-6 lg:grid-cols-3" id="verification">
          <Card className="p-5 lg:col-span-2">
            <h2 className="headline-md text-ink">Citizen verification</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Every reporter is asked, in their own language: &ldquo;Is this problem fixed?&rdquo;
            </p>

            {problem.verification.asked === 0 ? (
              <p className="mt-4 rounded-md bg-card-muted p-4 text-sm text-ink-muted">
                Verification has not been requested — it is sent automatically when the project is
                marked complete.
              </p>
            ) : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Asked", value: problem.verification.asked, tone: "text-ink" },
                    { label: "Confirmed", value: problem.verification.confirmed, tone: "text-impact-deep" },
                    { label: "Denied", value: problem.verification.denied, tone: "text-danger" },
                    { label: "Pending", value: problem.verification.pending, tone: "text-ink" },
                  ].map((s) => (
                    <div className="rounded-md bg-card-muted p-4 text-center" key={s.label}>
                      <p className={cx("text-2xl font-bold tabular-nums", s.tone)}>{s.value}</p>
                      <p className="text-xs text-ink-muted">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-ink-muted">Resolution confidence</span>
                    <span className="text-sm font-bold text-ink tabular-nums">
                      {Math.round(
                        (problem.verification.confirmed /
                          Math.max(1, problem.verification.confirmed + problem.verification.denied)) * 100,
                      )}
                      %
                    </span>
                  </div>
                  <Progress
                    className="mt-2"
                    label="Resolution confidence"
                    tone="impact"
                    value={
                      (problem.verification.confirmed /
                        Math.max(1, problem.verification.confirmed + problem.verification.denied)) * 100
                    }
                  />
                  <p className="mt-2 text-xs text-ink-muted">
                    Confidence is confirmations over replies. Pending replies are excluded rather
                    than assumed positive.
                  </p>
                </div>
              </>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="headline-md text-ink">Simulate replies</h2>
            <p className="mt-1 text-sm text-ink-muted">
              In production these arrive from the citizen app. Here you can play the loop forward.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <Button
                disabled={problem.verification.pending === 0}
                icon="thumbs-up"
                onClick={() =>
                  dispatch({
                    type: "verification/record",
                    id: problem.id,
                    confirmed: Math.min(3, problem.verification.pending),
                    denied: 0,
                  })
                }
              >
                Record 3 confirmations
              </Button>
              <Button
                disabled={problem.verification.pending === 0}
                icon="x"
                onClick={() =>
                  dispatch({
                    type: "verification/record",
                    id: problem.id,
                    confirmed: 0,
                    denied: Math.min(1, problem.verification.pending),
                  })
                }
                tone="outline"
              >
                Record 1 denial
              </Button>
              {problem.verification.asked === 0 && can("project.update") ? (
                <Button
                  icon="send"
                  onClick={() => dispatch({ type: "verification/request", id: problem.id })}
                  tone="outline"
                >
                  Request verification now
                </Button>
              ) : null}
            </div>
          </Card>
        </div>
      ) : null}

      {/* ------------------------------------------------------------ map */}
      {tab === "overview" ? (
        <Enter index={3}>
          <Card className="overflow-hidden p-5">
            <h2 className="headline-md text-ink">Where it is</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Pins are grouped by village; the number is distinct problems there.
            </p>
            <div className="mt-4">
              <GovMap
                height={320}
                onSelectVillage={() => undefined}
                problems={[problem]}
                villages={govSeed.villages.filter((v) => problem.villageIds.includes(v.id))}
              />
            </div>
          </Card>
        </Enter>
      ) : null}

      {/* ----------------------------------------------------------- audit */}
      {tab === "audit" ? (
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="headline-md text-ink">Audit trail</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Every action, and whether a person or the system took it.
              </p>
            </div>
            <Badge icon="lock" tone="neutral">
              {problem.audit.length} entries · immutable
            </Badge>
          </div>
          <div className="mt-5">
            <AuditTrail entries={problem.audit} />
          </div>
          <p className="text-xs text-ink-faint">
            Timestamps are recorded in IST. Latest entry {dateTime(problem.audit.at(-1)?.at ?? problem.updatedAt)}.
          </p>
        </Card>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------ sponsor row */

function SponsorRow({
  match,
  canApprove,
  onApprove,
  onDecline,
}: {
  match: SponsorMatch;
  canApprove: boolean;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const s = sponsor(match.sponsorId);
  const declined = match.status === "declined";
  return (
    <li className={cx("rounded-lg p-4", declined ? "bg-card-muted/60" : "bg-card-muted")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-bold text-ink">
            {sponsorName(match.sponsorId)}
            <Badge
              dense
              icon={declined ? "x" : match.status === "approved" ? "check-circle" : "factory"}
              tone={declined ? "critical" : match.status === "approved" ? "success" : "info"}
            >
              {match.status}
            </Badge>
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {s?.sector} · CSR budget remaining {rupees(s?.csrBudgetRemaining ?? 0)} ·{" "}
            {s?.responseRate}% historic response rate
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-muted">Match</p>
          <p className="text-lg font-bold text-ink tabular-nums">{match.score}%</p>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-1.5">
        {match.reasons.map((r) => (
          <li
            className="rounded-full bg-card px-2.5 py-1 text-[11px] font-semibold text-ink-muted"
            key={r}
          >
            {r}
          </li>
        ))}
      </ul>

      {match.note ? <p className="mt-2 text-sm text-ink-muted">{match.note}</p> : null}
      {match.proposalAmount ? (
        <p className="mt-2 text-sm font-bold text-ink">
          Proposal: {rupees(match.proposalAmount)}
        </p>
      ) : null}

      {canApprove && !declined && match.status !== "approved" ? (
        <div className="mt-3 flex gap-2">
          <Button icon="check" onClick={onApprove} size="sm">
            Accept sponsorship
          </Button>
          <Button icon="x" onClick={onDecline} size="sm" tone="outline">
            Record decline
          </Button>
        </div>
      ) : null}
    </li>
  );
}
