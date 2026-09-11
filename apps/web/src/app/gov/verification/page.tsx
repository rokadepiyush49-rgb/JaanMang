"use client";

/**
 * Citizen verification — the loop that closes.
 *
 * The government cannot mark its own homework here: a problem leaves the
 * register when the people who reported it confirm the fix, and a denial sends
 * it back to implementation rather than into a comment box.
 */

import Link from "next/link";
import { Badge, Button, Card, CardHeader, Enter, Progress, cx } from "@/components/ui";
import { count, relative } from "@/lib/gov/format";
import { villageName } from "@/lib/gov/selectors";
import { useGov } from "@/lib/gov/store";

export default function VerificationPage() {
  const { ranked, dispatch } = useGov();

  const asked = ranked.filter((p) => p.verification.asked > 0);
  const totals = asked.reduce(
    (acc, p) => ({
      asked: acc.asked + p.verification.asked,
      confirmed: acc.confirmed + p.verification.confirmed,
      denied: acc.denied + p.verification.denied,
      pending: acc.pending + p.verification.pending,
    }),
    { asked: 0, confirmed: 0, denied: 0, pending: 0 },
  );
  const confidence = Math.round(
    (totals.confirmed / Math.max(1, totals.confirmed + totals.denied)) * 100,
  );

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="min-w-0">
          <h1 className="headline-xl text-ink">
            <span className="font-medium">Citizen</span> <span className="font-bold">verification</span>
          </h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            Every reporter is asked, in the language they reported in: &ldquo;Is this problem
            fixed?&rdquo; Nothing is marked resolved on an officer&rsquo;s word alone.
          </p>
        </div>
      </Enter>

      <Enter index={1}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Citizens asked", value: totals.asked, tone: "text-ink" },
            { label: "Confirmed fixed", value: totals.confirmed, tone: "text-impact-deep" },
            { label: "Said not fixed", value: totals.denied, tone: "text-danger" },
            { label: "Yet to reply", value: totals.pending, tone: "text-ink" },
          ].map((s) => (
            <Card className="p-5" key={s.label}>
              <p className="label-caps text-ink-faint">{s.label}</p>
              <p className={cx("mt-1 stat-number tabular-nums", s.tone)}>{s.value}</p>
            </Card>
          ))}
        </div>
      </Enter>

      <Enter index={2}>
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="headline-md text-ink">Resolution confidence {confidence}%</h2>
            <Badge icon="bot" tone="info">
              Requests sent automatically on completion
            </Badge>
          </div>
          <Progress className="mt-3" label="Resolution confidence" tone="impact" value={confidence} />
          <p className="mt-2 text-sm text-ink-muted">
            Confirmations over replies received. Pending replies are excluded rather than counted as
            agreement — a silent citizen is not a satisfied one.
          </p>
        </Card>
      </Enter>

      <Enter index={3}>
        <Card>
          <CardHeader
            icon="thumbs-up"
            subtitle="A denial reopens the problem and returns it to the responsible officer with the citizen's note attached."
            title="Awaiting citizen confirmation"
          />
          <ul className="flex flex-col gap-3 p-5 pt-4">
            {asked.map((p) => {
              const share = Math.round(
                (p.verification.confirmed / Math.max(1, p.verification.asked)) * 100,
              );
              return (
                <li className="rounded-lg bg-card-muted p-4" key={p.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link className="block" href={`/gov/problems/${p.id}#verification`}>
                        <span className="text-sm font-bold text-ink hover:underline">{p.title}</span>
                      </Link>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                        <span className="font-semibold">{p.id}</span>
                        <span>{p.villageIds.map(villageName).join(", ")}</span>
                        <span>
                          requested{" "}
                          {p.verification.requestedAt ? relative(p.verification.requestedAt) : "—"}
                        </span>
                      </p>
                    </div>
                    <Badge
                      icon={p.verification.pending === 0 ? "check-circle" : "clock"}
                      tone={p.verification.pending === 0 ? "success" : "warning"}
                    >
                      {p.verification.pending === 0 ? "Settled" : `${p.verification.pending} pending`}
                    </Badge>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 sm:w-80">
                    {[
                      { k: "Confirmed", v: p.verification.confirmed, tone: "text-impact-deep" },
                      { k: "Denied", v: p.verification.denied, tone: "text-danger" },
                      { k: "Pending", v: p.verification.pending, tone: "text-ink" },
                    ].map((s) => (
                      <div className="rounded-md bg-card p-2 text-center" key={s.k}>
                        <p className={cx("text-base font-bold tabular-nums", s.tone)}>{s.v}</p>
                        <p className="text-[11px] text-ink-muted">{s.k}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3">
                    <Progress label={`${p.title} confirmations`} size="sm" tone="impact" value={share} />
                    <p className="mt-1 text-xs text-ink-muted">
                      {count(p.verification.confirmed)} of {count(p.verification.asked)} reporters have
                      confirmed the fix.
                    </p>
                  </div>

                  {p.verification.pending > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        icon="thumbs-up"
                        onClick={() =>
                          dispatch({
                            type: "verification/record",
                            id: p.id,
                            confirmed: Math.min(3, p.verification.pending),
                            denied: 0,
                          })
                        }
                        size="sm"
                      >
                        Record 3 confirmations
                      </Button>
                      <Button
                        icon="send"
                        onClick={() => dispatch({ type: "verification/request", id: p.id })}
                        size="sm"
                        tone="outline"
                      >
                        Re-send reminder
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
            {asked.length === 0 ? (
              <li className="rounded-lg bg-card-muted p-5 text-sm text-ink-muted">
                No verification is outstanding. Requests are sent automatically when a project is
                marked complete.
              </li>
            ) : null}
          </ul>
        </Card>
      </Enter>
    </div>
  );
}
