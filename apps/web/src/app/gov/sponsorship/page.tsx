"use client";

/**
 * Industry sponsorship pipeline.
 *
 * The government's question here is not "who might pay?" but "is anyone going
 * to pay before the window closes?" — so the screen is organised by response
 * state and by time remaining, with the fallback consequence stated on every
 * row that is running out of it.
 */

import Link from "next/link";
import { Icon } from "@/components/icon";
import { BarList } from "@/components/gov/charts";
import { SeverityBadge } from "@/components/gov/pieces";
import { Badge, Button, ButtonLink, Card, CardHeader, Enter, cx } from "@/components/ui";
import { count, relative, rupees, sla } from "@/lib/gov/format";
import { sponsorName, villageName } from "@/lib/gov/selectors";
import { govSeed, useGov } from "@/lib/gov/store";
import type { RankedProblem, SponsorshipStatus } from "@/lib/gov/types";

const COLUMNS: { status: SponsorshipStatus[]; title: string; hint: string }[] = [
  { status: ["awaiting"], title: "Matched, not yet invited", hint: "Eligibility confirmed automatically" },
  { status: ["invited"], title: "Invitations out", hint: "96-hour industry response window" },
  { status: ["interested", "proposal"], title: "Industry engaged", hint: "Interest or a proposal received" },
  { status: ["approved"], title: "Sponsored", hint: "No government outlay required" },
  { status: ["declined"], title: "Failed → government funding", hint: "Fallback fired automatically" },
];

export default function SponsorshipPage() {
  const { ranked, dispatch, can } = useGov();
  const eligible = ranked.filter((p) => p.sponsorship.eligible || p.sponsorship.status !== "not_eligible");

  const sponsored = ranked
    .filter((p) => p.sponsorship.status === "approved")
    .reduce((s, p) => s + (p.sponsorship.approvedAmount ?? 0), 0);
  const inPlay = ranked
    .filter((p) => ["invited", "interested", "proposal"].includes(p.sponsorship.status))
    .reduce((s, p) => s + p.estimatedCost, 0);
  const lost = ranked
    .filter((p) => p.sponsorship.status === "declined")
    .reduce((s, p) => s + p.estimatedCost, 0);

  const bySponsor = govSeed.sponsors
    .map((s) => ({
      label: s.name,
      value: ranked.filter((p) => p.sponsorship.matches.some((m) => m.sponsorId === s.id)).length,
      hint: `${s.csrThemes.join(", ")} · ${rupees(s.csrBudgetRemaining)} CSR remaining · ${s.responseRate}% response rate`,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="headline-xl text-ink">
              <span className="font-medium">Industry</span>{" "}
              <span className="font-bold">sponsorship</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              Validated problems are matched to CSR programmes on theme, geography, unspent budget
              and historic response rate. If nobody accepts before the window closes, the government
              funding workflow starts itself.
            </p>
          </div>
          <ButtonLink href="/gov/funding" icon="banknote" tone="outline">
            Government funding
          </ButtonLink>
        </div>
      </Enter>

      <Enter index={1}>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Sponsored to date", value: sponsored, hint: "CSR money, no government outlay", tone: "bg-success-tint" },
            { label: "In play", value: inPlay, hint: "Awaiting an industry decision", tone: "bg-card-muted" },
            { label: "Fell back to government", value: lost, hint: "Industry route closed", tone: "bg-warning-tint" },
          ].map((m) => (
            <Card className={cx("p-5", m.tone)} key={m.label} tone="flat">
              <p className="label-caps text-ink-faint">{m.label}</p>
              <p className="mt-1 stat-number text-ink">{rupees(m.value)}</p>
              <p className="mt-0.5 text-xs text-ink-muted">{m.hint}</p>
            </Card>
          ))}
        </div>
      </Enter>

      <Enter index={2}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
          {COLUMNS.map((col) => {
            const items = eligible.filter((p) => col.status.includes(p.sponsorship.status));
            return (
              <Card className="flex flex-col p-4" key={col.title}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-ink">{col.title}</h2>
                    <p className="mt-0.5 text-xs text-ink-muted">{col.hint}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-card-muted px-2 py-0.5 text-xs font-bold text-ink tabular-nums">
                    {items.length}
                  </span>
                </div>

                <ul className="mt-3 flex flex-1 flex-col gap-2">
                  {items.map((p) => (
                    <SponsorshipCard
                      canInvite={can("sponsorship.invite")}
                      key={p.id}
                      onInvite={() => dispatch({ type: "sponsorship/invite", id: p.id })}
                      problem={p}
                    />
                  ))}
                  {items.length === 0 ? (
                    <li className="rounded-md bg-card-muted p-3 text-xs text-ink-muted">
                      Nothing here right now.
                    </li>
                  ) : null}
                </ul>
              </Card>
            );
          })}
        </div>
      </Enter>

      <div className="grid gap-6 lg:grid-cols-2">
        <Enter index={3}>
          <Card className="p-5">
            <h2 className="headline-md text-ink">Sponsor pool</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Matches generated automatically — an industry never sees a problem outside its CSR
              geography or theme.
            </p>
            <BarList className="mt-4" data={bySponsor} format={(v) => `${v} matches`} />
          </Card>
        </Enter>

        <Enter index={4}>
          <Card>
            <CardHeader
              icon="clock"
              subtitle="Reminders go out at 50% and 85% of the window; expiry triggers the fallback."
              title="Response windows"
            />
            <ul className="flex flex-col gap-2 p-5 pt-4">
              {eligible
                .filter((p) => p.sponsorship.responseDueAt && p.sponsorship.status !== "approved")
                .map((p) => {
                  const s = sla(p.sponsorship.responseDueAt!);
                  return (
                    <li className="rounded-md bg-card-muted p-3" key={p.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          className="min-w-0 flex-1 truncate text-sm font-bold text-ink hover:underline"
                          href={`/gov/problems/${p.id}#sponsorship`}
                        >
                          {p.title}
                        </Link>
                        <Badge dense icon={s.breached ? "alert-circle" : "clock"} tone={s.breached ? "critical" : "warning"}>
                          {s.label}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-ink-muted">
                        {p.sponsorship.matches.filter((m) => m.status !== "declined").length} sponsors still
                        in play · {rupees(p.estimatedCost)} · fallback armed
                      </p>
                    </li>
                  );
                })}
              {eligible.filter((p) => p.sponsorship.responseDueAt && p.sponsorship.status !== "approved")
                .length === 0 ? (
                <li className="rounded-md bg-card-muted p-4 text-sm text-ink-muted">
                  No open industry windows in this jurisdiction.
                </li>
              ) : null}
            </ul>
          </Card>
        </Enter>
      </div>
    </div>
  );
}

function SponsorshipCard({
  problem,
  canInvite,
  onInvite,
}: {
  problem: RankedProblem;
  canInvite: boolean;
  onInvite: () => void;
}) {
  const live = problem.sponsorship.matches.filter((m) => m.status !== "declined");
  const best = [...problem.sponsorship.matches].sort((a, b) => b.score - a.score)[0];

  return (
    <li className="rounded-md bg-card-muted p-3">
      <Link className="block" href={`/gov/problems/${problem.id}#sponsorship`}>
        <span className="block text-sm font-bold text-ink hover:underline">{problem.title}</span>
      </Link>
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
        <span className="font-semibold">{problem.id}</span>
        <span>{rupees(problem.estimatedCost)}</span>
        <span>{villageName(problem.villageIds[0])}</span>
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <SeverityBadge dense severity={problem.severity} />
        {best ? (
          <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold text-ink-muted">
            {sponsorName(best.sponsorId)} {best.score}%
          </span>
        ) : null}
      </div>
      {problem.sponsorship.status === "declined" ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-danger">
          <Icon className="mt-0.5 shrink-0" name="arrow-right" size={12} />
          {problem.sponsorship.failureReason}
        </p>
      ) : null}
      {problem.sponsorship.status === "awaiting" && canInvite ? (
        <Button className="mt-2 w-full" icon="send" onClick={onInvite} size="sm">
          Invite {live.length}
        </Button>
      ) : null}
      {problem.sponsorship.invitedAt ? (
        <p className="mt-2 text-[11px] text-ink-faint">
          Invited {relative(problem.sponsorship.invitedAt)} · {count(live.length)} in play
        </p>
      ) : null}
    </li>
  );
}
