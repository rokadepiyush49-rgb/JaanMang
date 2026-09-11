"use client";

import { Icon, type IconName } from "@/components/icon";
import { Card } from "@/components/ui";
import type { PlatformStats } from "@/lib/public/stats";
import { CountUp, Reveal, Stagger, StaggerItem } from "./motion";

/**
 * The statistics band.
 *
 * Two rows with a deliberate distinction between them: the platform-wide
 * figures across the whole programme, and what *this* deployment is holding
 * right now. Conflating the two would be the easiest possible way to overstate
 * the product, so they are labelled apart and the live row says exactly what
 * it is.
 */
const TILES: {
  key: keyof PlatformStats["totals"];
  label: string;
  icon: IconName;
  wash: string;
  format?: (v: number) => string;
}[] = [
  {
    key: "reportsSubmitted",
    label: "Citizen reports received",
    icon: "message",
    wash: "bg-tint-navy text-on-tint-navy",
  },
  {
    key: "problemsValidated",
    label: "Demands validated by government",
    icon: "check-circle",
    wash: "bg-tint-mint text-on-tint-mint",
  },
  {
    key: "problemsResolved",
    label: "Demands resolved and verified",
    icon: "thumbs-up",
    wash: "bg-tint-blue text-on-tint-blue",
  },
  {
    key: "citizensVerifying",
    label: "Citizens confirming fixes",
    icon: "users",
    wash: "bg-tint-orchid text-on-tint-orchid",
  },
  {
    key: "panchayatsOnboard",
    label: "Local bodies onboarded",
    icon: "landmark",
    wash: "bg-tint-clay text-on-tint-clay",
  },
  {
    key: "villagesCovered",
    label: "Villages covered",
    icon: "map-pin",
    wash: "bg-tint-amber text-on-tint-amber",
  },
  {
    key: "studentsEngaged",
    label: "Students building on it",
    icon: "graduation",
    wash: "bg-tint-mint text-on-tint-mint",
  },
  {
    key: "partnerOrgs",
    label: "Industry partners",
    icon: "factory",
    wash: "bg-tint-navy text-on-tint-navy",
  },
];

export function StatsBand({ stats }: { stats: PlatformStats }) {
  if (!stats.available) return null;
  const span = stats.growth ? `${stats.growth.fromYear}–${stats.growth.toYear}` : "to date";

  return (
    <section className="bg-surface-dim/50 px-5 py-16 sm:px-8 lg:py-20" id="impact">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="label-caps text-ink-faint">The record so far</p>
              <h2 className="headline-xl mt-2 text-ink">Four years, counted</h2>
            </div>
            <p className="text-sm font-semibold text-ink-muted">{span}</p>
          </div>
        </Reveal>

        <Stagger className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4" gap={0.05}>
          {TILES.map((t) => (
            <StaggerItem key={t.key}>
              <Card className="h-full p-5">
                <span
                  className={`flex size-10 items-center justify-center rounded-sm ${t.wash}`}
                >
                  <Icon name={t.icon} size={19} />
                </span>
                <p className="stat-number mt-4 text-ink">
                  <CountUp format={t.format} value={stats.totals[t.key]} />
                </p>
                <p className="mt-1 text-xs leading-snug font-semibold text-ink-muted">{t.label}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>

        {/* What this particular deployment holds, kept visibly separate from
            the programme-wide figures above. */}
        <Reveal delay={0.1}>
          <Card className="mt-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-sm bg-card-muted text-ink-muted">
                  <Icon name="gauge" size={18} />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink">In this deployment right now</p>
                  <p className="text-xs text-ink-muted">Counted live from the database</p>
                </div>
              </div>
              <dl className="flex flex-wrap items-center gap-x-8 gap-y-3">
                <LiveStat label="problems" value={stats.live.problems} />
                <LiveStat label="citizen reports" value={stats.live.reports} />
                <LiveStat label="villages" value={stats.live.villages} />
                <LiveStat label="local bodies" value={stats.live.localBodies} />
                <LiveStat label="partners" value={stats.live.partnerOrgs} />
              </dl>
            </div>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

function LiveStat({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dd className="mono-data text-base font-bold text-ink">
        {value.toLocaleString("en-IN")}
      </dd>
      <dt className="text-xs text-ink-muted">{label}</dt>
    </div>
  );
}
