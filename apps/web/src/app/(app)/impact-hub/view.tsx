"use client";

import { Icon } from "@/components/icon";
import {
  Avatar,
  Button,
  Card,
  PageHeading,
  Progress,
  Tag,
} from "@/components/ui";
import { toViewAchievements } from "@/lib/student/adapters";
import { useStudent } from "@/lib/student/store";


const TONES: Record<string, string> = {
  navy: "bg-navy-soft text-navy",
  impact: "bg-impact-soft/60 text-impact-deep",
  community: "bg-community-soft/70 text-community-deep",
};

const HEADLINE_STATS = [
  { icon: "check-circle", value: "12", label: "Projects Completed" },
  { icon: "users", value: "450+", label: "Citizens Impacted" },
  { icon: "bulb", value: "3", label: "Active Proposals" },
] as const;

export function ImpactHubPage() {
  const { state } = useStudent();
  const profile = state.profile!;
  const badges = state.achievements ? toViewAchievements(state.achievements) : [];
  /* The ledger, not a story. Each row is a verified contribution the platform
     recorded points for. */
  const contributions = (state.achievements?.ledger ?? []).map((e) => ({
    icon: "star" as const,
    tone: "navy" as const,
    title: e.source,
    date: new Date(e.at).toLocaleDateString("en-IN", { dateStyle: "medium" }),
    body: "",
    kind: "Verified contribution",
    points: `+${e.points} Impact Pts`,
  }));
  /* What this campus works on, from the student's own declared interests and
     the categories their institution's teams are actually carrying. */
  const campusFocus = profile.preferredCategories.map((category, i) => ({
    label: category,
    value: Math.round(100 / Math.max(1, profile.preferredCategories.length)),
    icon: (["leaf", "graduation", "shield"] as const)[i % 3],
    tone: (["impact", "navy", "community"] as const)[i % 3],
  }));
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeading
        subtitle="Track your individual contributions, institutional performance, and historical societal impact."
        title="Impact Hub"
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <Avatar name="Aisha Patel" size={64} tone="navy" />
                <div>
                  <h2 className="headline-lg text-ink">Aisha Patel</h2>
                  <p className="text-sm text-ink-muted">
                    B.Tech Student, Social Innovator
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="label-caps text-ink-faint">Impact Score</p>
                <p className="flex items-center justify-end gap-2 text-4xl font-bold text-ink tabular-nums">
                  842
                  <Icon className="text-impact" name="trending-up" size={24} />
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
              {HEADLINE_STATS.map((stat) => (
                <div className="flex items-center gap-3" key={stat.label}>
                  <span className="flex size-11 items-center justify-center rounded-full bg-card-muted text-navy">
                    <Icon name={stat.icon} size={20} />
                  </span>
                  <div>
                    <p className="headline-md text-ink tabular-nums">{stat.value}</p>
                    <p className="text-sm text-ink-muted">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="headline-lg text-ink">Recent Badges</h2>
              <button
                className="text-sm font-semibold text-navy hover:underline"
                type="button"
              >
                View All
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {badges.map((badge) => (
                <div
                  className="flex items-center gap-3 rounded-md border border-line px-4 py-3"
                  key={badge.label}
                >
                  <span
                    className={`flex size-10 items-center justify-center rounded-full ${TONES[badge.tint] ?? TONES.navy}`}
                  >
                    <Icon name={badge.icon} size={19} />
                  </span>
                  <span className="text-sm font-semibold text-ink">
                    {badge.label}
                  </span>
                </div>
              ))}
              <button
                className="flex items-center gap-2 rounded-md border border-dashed border-line-strong px-4 py-3 text-sm font-semibold text-ink-faint hover:border-navy hover:text-navy"
                type="button"
              >
                <Icon name="plus" size={18} />
                Earn more
              </button>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <h2 className="headline-lg text-ink">Recent Contributions</h2>
              <button
                className="text-sm font-semibold text-navy hover:underline"
                type="button"
              >
                View Full History
              </button>
            </div>
            <ul className="mt-2 divide-y divide-line">
              {contributions.map((item) => (
                <li className="flex gap-4 py-4" key={item.title}>
                  <span
                    className={`flex size-11 shrink-0 items-center justify-center rounded-full ${TONES[item.tone]}`}
                  >
                    <Icon name={item.icon} size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-bold text-ink">{item.title}</h3>
                      <span className="mono-data text-ink-faint">{item.date}</span>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{item.body}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Tag tone="neutral">{item.kind}</Tag>
                      <Tag tone="impact">{item.points}</Tag>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="h-fit p-6">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-full bg-navy text-white">
              <Icon name="landmark" size={22} />
            </span>
            <div>
              <h2 className="headline-lg text-ink">BIT Mesra</h2>
              <p className="label-caps text-ink-faint">Institution Profile</p>
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-3 gap-3 border-y border-line py-5 text-center">
            <div>
              <dd className="headline-lg text-ink">#2</dd>
              <dt className="mt-1 text-xs text-ink-muted">in Jharkhand</dt>
            </div>
            <div>
              <dd className="headline-lg text-ink tabular-nums">45.2k</dd>
              <dt className="mt-1 text-xs text-ink-muted">Total Impact</dt>
            </div>
            <div>
              <dd className="headline-lg text-ink tabular-nums">1,204</dd>
              <dt className="mt-1 text-xs text-ink-muted">Active Innovators</dt>
            </div>
          </dl>

          <div className="mt-5">
            <div className="flex items-center justify-between text-sm font-semibold text-ink">
              <span>Monthly Goal Progress</span>
              <span className="tabular-nums">78%</span>
            </div>
            <Progress className="mt-2" tone="impact" value={78} />
          </div>

          <h3 className="mt-6 font-bold text-ink">Campus Impact Focus</h3>
          <ul className="mt-3 flex flex-col gap-4">
            {campusFocus.map((focus) => (
              <li key={focus.label}>
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className={`flex size-8 items-center justify-center rounded-full ${TONES[focus.tone]}`}
                  >
                    <Icon name={focus.icon} size={16} />
                  </span>
                  <span className="flex-1 font-semibold text-ink">
                    {focus.label}
                  </span>
                  <span className="mono-data text-ink-muted">{focus.value}%</span>
                </div>
                <Progress className="mt-2" tone={focus.tone} value={focus.value} />
              </li>
            ))}
          </ul>

          <Button className="mt-6 w-full" iconAfter="arrow-right" tone="outline">
            View Detailed Metrics
          </Button>
        </Card>
      </div>
    </div>
  );
}
