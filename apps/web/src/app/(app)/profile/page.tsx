import type { Metadata } from "next";
import { Icon } from "@/components/icon";
import {
  Avatar,
  Badge,
  Button,
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
import {
  ACHIEVEMENTS,
  CONTRIBUTIONS,
  STUDENT,
  STUDENT_PROJECTS,
} from "@/lib/data";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "My Profile" };

const SKILLS = [
  { name: "React", level: 88 },
  { name: "IoT & Embedded", level: 74 },
  { name: "Data Analytics", level: 69 },
  { name: "Community Facilitation", level: 82 },
];

/* The legacy contribution fixtures name their colour with the old palette
   words; map them onto the tile tints they now resolve to. */
const LEGACY_TINT = {
  navy: "navy",
  impact: "mint",
  community: "clay",
} as const;

export default async function ProfilePage() {
  const earned = ACHIEVEMENTS.filter((a) => a.earned);
  const completed = STUDENT_PROJECTS.filter((p) => p.percent === 100).length;

  /* Who this is comes from the session. The impact record below it is still a
     fixture — that is the student API, which has not been built yet. */
  const session = await getSession();
  const profile = session?.student;
  const name = session?.displayName ?? STUDENT.name;
  const institution = profile?.institutionName ?? STUDENT.institution;
  const location = profile ? `${profile.district}, ${profile.state}` : STUDENT.location;
  const year = profile ? `Year ${profile.currentYear} · ${profile.branch}` : STUDENT.year;
  const role = profile ? `${profile.degree} Student, Social Innovator` : STUDENT.role;
  const skills = profile?.skills.length ? profile.skills : STUDENT.skills;
  const interests = profile?.interests.length ? profile.interests : STUDENT.interests;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <Enter>
        <PageHeading
          actions={
            <>
              <Button icon="download" tone="outline">
                Export impact résumé
              </Button>
              <ButtonLink href="/settings" icon="file-pen">
                Edit profile
              </ButtonLink>
            </>
          }
          emphasis="profile"
          subtitle="Your verified record of societal contribution across Jharkhand. Everything here is evidenced by a signed-off outcome, never self-declared."
          title="My"
        />
      </Enter>

      {/* The summary card: who this is, the three facts a partner sorts on,
          and how complete the record is. */}
      <Enter index={1}>
        <Card className="p-6 lg:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-5">
              <Avatar name={name} size={80} />
              <div className="min-w-0">
                <h2 className="headline-lg text-ink">{name}</h2>
                <p className="text-sm text-ink-muted">
                  {role} · {institution}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge icon="check-circle" tone="success">
                    Verified innovator
                  </Badge>
                  <Badge icon="map-pin" tone="neutral">
                    {location}
                  </Badge>
                  <Badge icon="graduation" tone="info">
                    {year}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="w-full shrink-0 rounded-lg bg-card-muted p-4 lg:w-72">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-ink">
                  Profile completeness
                </span>
                <span className="mono-data text-ink-muted">
                  {STUDENT.profileComplete}%
                </span>
              </div>
              <Progress
                className="mt-2"
                label="Profile completeness"
                value={STUDENT.profileComplete}
              />
              <p className="mt-2 text-xs text-ink-muted">
                Add two more verified outcomes to reach 100%.
              </p>
              <ButtonLink
                className="mt-3 w-full"
                href="/settings"
                size="sm"
                tone="outline"
              >
                Complete profile
              </ButtonLink>
            </div>
          </div>
        </Card>
      </Enter>

      <Enter index={2}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
          <TintTile
            icon="rocket"
            label="Impact points"
            tint="navy"
            value={STUDENT.impactScore.toLocaleString("en-IN")}
          />
          <TintTile
            icon="check-circle"
            label="Projects completed"
            tint="mint"
            value={String(completed)}
          />
          <TintTile
            icon="trophy"
            label="Badges"
            tint="orchid"
            value={String(earned.length)}
          />
          <TintTile
            icon="trending-up"
            label="State rank"
            tint="amber"
            value={`#${STUDENT.rank}`}
          />
        </div>
      </Enter>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Enter className="min-w-0" index={3}>
          <Card className="p-6">
            <SectionHeader icon="bar-chart" title="Skill signal" />
            <p className="mt-2 text-sm text-ink-muted">
              Derived from verified project contributions, not self-declared
              tags.
            </p>
            {/* A proficiency level is earned from delivered work, and a new
                account has none — so it lists the declared skills plainly
                rather than inventing a score for them. */}
            {profile && !SKILLS.some((s) => skills.includes(s.name)) ? (
              <>
                <div className="mt-5 flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} tone="neutral">
                      {skill}
                    </Badge>
                  ))}
                </div>
                <p className="mt-3 text-xs text-ink-muted">
                  Levels appear here once a project you contributed to is signed off.
                </p>
              </>
            ) : (
              <ul className="mt-5 flex flex-col gap-4">
                {SKILLS.map((skill) => (
                  <li key={skill.name}>
                    <MetricBar label={skill.name} score={skill.level} suffix="%" />
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 border-t border-line pt-5">
              <p className="label-caps text-ink-faint">Interests</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <Badge key={interest} tone="info">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        </Enter>

        <Enter className="min-w-0" index={4}>
          <Card className="p-6">
            <SectionHeader
              actionHref="/achievements"
              actionLabel="All"
              icon="award"
              title="Badges"
            />
            <div className="mt-4 flex flex-col gap-2">
              {earned.slice(0, 5).map((badge) => {
                const t = TINT[badge.tint];
                return (
                  <div
                    className="flex items-center gap-3 rounded-full bg-card-muted p-2"
                    key={badge.id}
                  >
                    <span
                      className={cx(
                        "flex size-10 shrink-0 items-center justify-center rounded-full",
                        t.wash,
                      )}
                    >
                      <Icon name={badge.icon} size={19} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-ink">
                        {badge.label}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">
                        Earned {badge.date}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </Enter>
      </div>

      <Enter index={5}>
        <Card className="p-6">
          <SectionHeader icon="clock" title="Contribution history" />
          <ul className="mt-2 divide-y divide-line">
            {CONTRIBUTIONS.map((item) => {
              const t = TINT[LEGACY_TINT[item.tone]];
              return (
                <li className="flex gap-4 py-5" key={item.title}>
                  <span
                    className={cx(
                      "flex size-11 shrink-0 items-center justify-center rounded-full",
                      t.wash,
                    )}
                  >
                    <Icon name={item.icon} size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-bold text-ink">{item.title}</h3>
                      <span className="mono-data text-ink-faint">
                        {item.date}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-ink-muted">{item.body}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge tone="neutral">{item.kind}</Badge>
                      <Badge tone="success">{item.points}</Badge>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </Enter>
    </div>
  );
}
