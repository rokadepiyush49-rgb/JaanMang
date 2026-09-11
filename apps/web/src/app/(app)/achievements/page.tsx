import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import {
  Badge,
  ButtonLink,
  Card,
  Enter,
  MetricBar,
  PageHeading,
  Progress,
  SectionHeader,
  TINT,
  TintTile,
  cx,
} from "@/components/ui";
import { ACHIEVEMENTS, LEADERBOARD, STUDENT, type Achievement } from "@/lib/data";

export const metadata: Metadata = { title: "Achievements" };

/**
 * A badge medallion. Earned badges carry their wash; the ones still in
 * progress are drawn in neutral with their own track, so the grid reads as
 * "what you have" and "what is close" without a second component.
 */
function BadgeTile({ badge }: { badge: Achievement }) {
  const t = TINT[badge.tint];
  return (
    <Card
      className={cx(
        "flex flex-col items-center p-5 text-center",
        !badge.earned && "opacity-95",
      )}
    >
      <span
        className={cx(
          "flex size-16 items-center justify-center rounded-full",
          badge.earned ? t.wash : "bg-card-muted text-line-strong",
        )}
      >
        <Icon name={badge.earned ? badge.icon : "lock"} size={28} />
      </span>
      <p className="mt-3 font-bold text-ink">{badge.label}</p>
      <p className="mt-1 text-xs text-ink-muted">{badge.description}</p>
      {badge.earned ? (
        <Badge className="mt-3" dense icon="check" tone="success">
          Earned {badge.date}
        </Badge>
      ) : (
        <div className="mt-3 w-full">
          <Progress
            label={badge.label}
            size="sm"
            tone={badge.tint}
            value={badge.progress ?? 0}
          />
          <p className="mt-1.5 text-xs font-semibold text-ink-muted">
            {badge.progress}% there
          </p>
        </div>
      )}
    </Card>
  );
}

export default function AchievementsPage() {
  const earned = ACHIEVEMENTS.filter((a) => a.earned);
  const locked = ACHIEVEMENTS.filter((a) => !a.earned);
  const nextUp = [...locked].sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0))[0];

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <Enter>
        <PageHeading
          emphasis="achievements"
          subtitle="Badges are awarded on verified outcomes, never on activity — each one names the work that earned it."
          title="Your"
        />
      </Enter>

      <Enter index={1}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
          <TintTile
            icon="trophy"
            label="Badges earned"
            tint="orchid"
            value={String(earned.length)}
          />
          <TintTile
            icon="rocket"
            label="Impact score"
            tint="navy"
            value={STUDENT.impactScore.toLocaleString("en-IN")}
          />
          <TintTile
            icon="trending-up"
            label="State rank"
            tint="mint"
            value={`#${STUDENT.rank}`}
          />
          <TintTile
            icon="flame"
            label="Day streak"
            tint="clay"
            value={String(STUDENT.streak)}
          />
        </div>
      </Enter>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Enter index={2}>
            <section>
              <SectionHeader icon="award" title={`Earned · ${earned.length}`} />
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {earned.map((badge) => (
                  <BadgeTile badge={badge} key={badge.id} />
                ))}
              </div>
            </section>
          </Enter>

          <Enter index={3}>
            <section>
              <SectionHeader icon="target" title={`In progress · ${locked.length}`} />
              <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {locked.map((badge) => (
                  <BadgeTile badge={badge} key={badge.id} />
                ))}
              </div>
            </section>
          </Enter>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {nextUp ? (
            <Enter index={2}>
              <Card className="p-6">
                <SectionHeader icon="sparkles" title="Closest to earning" />
                <div className="mt-4 flex items-center gap-3">
                  <span
                    className={cx(
                      "flex size-14 shrink-0 items-center justify-center rounded-full",
                      TINT[nextUp.tint].wash,
                    )}
                  >
                    <Icon name={nextUp.icon} size={26} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-ink">{nextUp.label}</p>
                    <p className="text-sm text-ink-muted">{nextUp.description}</p>
                  </div>
                </div>
                <Progress
                  className="mt-4"
                  label={nextUp.label}
                  tone={nextUp.tint}
                  value={nextUp.progress ?? 0}
                />
                <p className="mt-2 text-xs text-ink-muted">
                  {nextUp.progress}% complete. One more verified milestone
                  should carry it over.
                </p>
                <ButtonLink className="mt-5 w-full" href="/projects" tone="outline">
                  Open your projects
                </ButtonLink>
              </Card>
            </Enter>
          ) : null}

          <Enter index={3}>
            <Card className="p-6">
              <SectionHeader icon="bar-chart" title="Points breakdown" />
              <div className="mt-4 flex flex-col gap-4">
                <MetricBar
                  explanation="Verified field submissions and datasets."
                  label="Field work"
                  score={42}
                  suffix="%"
                  tone="blue"
                />
                <MetricBar
                  explanation="Workshops run and learners mentored."
                  label="Mentorship"
                  score={31}
                  suffix="%"
                  tone="mint"
                />
                <MetricBar
                  explanation="Shipped milestones on partner projects."
                  label="Delivery"
                  score={27}
                  suffix="%"
                  tone="amber"
                />
              </div>
            </Card>
          </Enter>

          <Enter index={4}>
            <Card className="p-6">
              <SectionHeader
                actionHref="/impact-hub"
                actionLabel="Full table"
                icon="trophy"
                title="Campus leaderboard"
              />
              <ol className="mt-4 flex flex-col gap-1.5">
                {LEADERBOARD.map((row) => (
                  <li
                    className={cx(
                      "flex items-center gap-3 rounded-full px-3 py-2.5",
                      row.rank === 1 ? "bg-primary-fixed" : "bg-card-muted",
                    )}
                    key={row.name}
                  >
                    <span
                      className={cx(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
                        row.rank === 1
                          ? "bg-primary text-white"
                          : "bg-container text-ink-muted",
                      )}
                    >
                      {row.rank}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                      {row.name}
                    </span>
                    <span className="mono-data shrink-0 text-ink-muted">
                      {row.points}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>
          </Enter>
        </div>
      </div>
    </div>
  );
}
