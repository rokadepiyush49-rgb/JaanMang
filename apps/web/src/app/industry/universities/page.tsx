"use client";

/**
 * University partners.
 *
 * Split deliberately in two: institutions you already work with, and ones in
 * the network you do not. The second list is the useful one — a partner whose
 * technology gap is machine learning needs to know which lab could close it,
 * and that is a question about universities rather than about challenges.
 */

import Link from "next/link";
import { Icon } from "@/components/icon";
import { Badge, Card, Enter, Progress } from "@/components/ui";
import { people, rupees } from "@/lib/industry/format";
import { FACULTY, TEAMS } from "@/lib/industry/mock-data";
import { universityRollup } from "@/lib/industry/selectors";
import { useIndustry } from "@/lib/industry/store";

export default function UniversitiesPage() {
  const { state, totals } = useIndustry();
  const rollup = universityRollup(state.projects);
  const partners = rollup.filter((r) => r.projects.length);
  const network = rollup.filter((r) => !r.projects.length);

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="min-w-0">
          <h1 className="headline-xl text-ink">
            <span className="font-medium">University</span>{" "}
            <span className="font-bold">collaboration</span>
          </h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            {partners.length} institutions carrying your work and {totals.students} students engaged
            across them. {network.length} more are on the network and have never worked with you.
          </p>
        </div>
      </Enter>

      <Enter index={1}>
        <div className="grid gap-4 xl:grid-cols-2">
          {partners.map((row) => (
            <Card className="flex h-full flex-col p-6" key={row.university.id}>
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-tint-orchid text-on-tint-orchid">
                  <Icon name="graduation" size={24} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="headline-md text-balance text-ink">{row.university.name}</h2>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {row.university.city}, {row.university.state} · {row.university.accreditation}
                  </p>
                </div>
                <Badge dense tone={row.university.deliveryScore >= 88 ? "success" : "info"}>
                  {row.university.deliveryScore}% delivery
                </Badge>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Cell label="Projects" value={String(row.projects.length)} />
                <Cell label="Students" value={String(row.students)} />
                <Cell label="Committed" value={rupees(row.investment)} />
                <Cell label="People reached" value={people(row.peopleImpacted)} />
              </dl>

              <div className="mt-4">
                <p className="label-caps text-ink-faint">Labs and focus</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {[...row.university.labs, ...row.university.focusAreas].map((l) => (
                    <li
                      className="rounded-full bg-card-muted px-2.5 py-1 text-xs font-semibold text-ink-muted"
                      key={l}
                    >
                      {l}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4">
                {row.projects.map((p) => {
                  const team = TEAMS.find((t) => t.id === p.teamId);
                  const faculty = FACULTY.find((f) => f.id === p.facultyId);
                  return (
                    <Link
                      className="flex flex-wrap items-center gap-3 rounded-md bg-card-muted p-3 transition-colors hover:bg-container"
                      href={`/industry/projects/${p.id}`}
                      key={p.id}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-ink">{p.title}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {team?.name} · {faculty?.name} · {p.stage.replace("_", " ")}
                        </span>
                      </span>
                      <span className="w-20 shrink-0">
                        <Progress label={`${p.title} progress`} size="sm" value={p.progress} />
                      </span>
                      <Icon className="shrink-0 text-ink-muted" name="chevron-right" size={16} />
                    </Link>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </Enter>

      <Enter index={2}>
        <Card className="p-6">
          <h2 className="headline-md text-ink">On the network, not yet yours</h2>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Where a challenge needs a capability you do not hold, this is usually the answer. Your
            declared technology gaps are machine learning, hydraulic modelling and certification —
            three of these labs cover them.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {network.map((row) => (
              <li className="rounded-lg bg-card-muted p-4" key={row.university.id}>
                <p className="font-bold text-ink">{row.university.shortName}</p>
                <p className="text-xs text-ink-muted">
                  {row.university.city}, {row.university.state}
                </p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {row.university.focusAreas.map((f) => (
                    <li
                      className="rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold text-ink-muted"
                      key={f}
                    >
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-ink-faint">
                  {row.university.facultyCount} faculty on the network since {row.university.since}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      </Enter>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="label-caps text-ink-faint">{label}</dt>
      <dd className="truncate text-base font-bold text-ink tabular-nums">{value}</dd>
    </div>
  );
}
