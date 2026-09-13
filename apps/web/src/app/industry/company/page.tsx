"use client";

/**
 * Company profile.
 *
 * This is not an about page. Everything on it is an input to the match engine,
 * so the screen shows, beside each section, what changing it would do to the
 * challenges the company is offered. A profile field nobody can see the
 * consequence of is a field nobody keeps current.
 */

import Link from "next/link";
import { Icon } from "@/components/icon";
import { Avatar, Badge, ButtonLink, Card, Enter, Progress, cx } from "@/components/ui";
import { CountUp, SdgChips } from "@/components/industry/pieces";
import { DOMAIN_LABEL } from "@/lib/industry/vocabulary";
import { people, rupees } from "@/lib/industry/format";
import { csrBook, isOpen, matchContext, recommended } from "@/lib/industry/selectors";
import { useIndustry } from "@/lib/industry/store";


const CAPABILITY_LABEL: Record<string, string> = {
  manufacturing: "Manufacturing",
  testing: "Testing & calibration",
  "field-deployment": "Field deployment",
  software: "Software",
  hardware: "Hardware",
  logistics: "Logistics",
  training: "Training",
  certification: "Certification & standards",
};

const ALL_CAPABILITIES = Object.keys(CAPABILITY_LABEL);

export default function CompanyPage() {
  const { state, totals } = useIndustry();
  const company = state.company;
  const book = csrBook(company, state.projects, state.challenges);
  const context = matchContext(state.projects, state.assignments);
  const matches = recommended(state.challenges, company, context, {
    engagedIds: state.projects.map((p) => p.challengeId),
  });

  const openChallenges = state.challenges.filter(isOpen);
  const inGeography = openChallenges.filter((c) => company.geographies.includes(c.state)).length;
  const inTheme = openChallenges.filter((c) => company.csrThemes.includes(c.domain)).length;

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <Card className="p-6 lg:p-8">
          <div className="flex flex-wrap items-start gap-6">
            <Avatar name={company.name} size={72} tone="ink" />
            <div className="min-w-0 flex-1">
              <h1 className="headline-xl text-ink">{company.legalName}</h1>
              <p className="mt-1 text-sm font-semibold text-ink-muted">{company.sector}</p>
              <p className="mt-3 max-w-2xl text-base text-ink-muted">{company.about}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge icon="map-pin" tone="neutral">
                  {company.headquarters}
                </Badge>
                <Badge icon="users" tone="neutral">
                  {company.employees.toLocaleString("en-IN")} employees
                </Badge>
                <Badge icon="trophy" tone="gold">
                  Partner rank #3
                </Badge>
              </div>
            </div>
            <ButtonLink href="/industry/settings" icon="settings" tone="outline">
              Edit profile
            </ButtonLink>
          </div>
        </Card>
      </Enter>

      {/* ------------------------------------------- what the profile buys */}
      <Enter index={1}>
        <Card className="bg-primary p-6 text-white lg:p-8" tone="flat">
          <p className="label-caps text-white/64">What this profile currently earns you</p>
          <div className="mt-4 grid gap-6 sm:grid-cols-4">
            <div>
              <p className="stat-number">
                <CountUp value={matches.length} />
              </p>
              <p className="mt-1 text-sm text-white/72">challenges matched above 70%</p>
            </div>
            <div>
              <p className="stat-number">{inTheme}</p>
              <p className="mt-1 text-sm text-white/72">open in your CSR themes</p>
            </div>
            <div>
              <p className="stat-number">{inGeography}</p>
              <p className="mt-1 text-sm text-white/72">open in your geographies</p>
            </div>
            <div>
              <p className="stat-number">{openChallenges.length - inGeography}</p>
              <p className="mt-1 text-sm text-white/72">open elsewhere, scored down</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-white/72">
            Each of these moves the moment you change a field below. The profile is a control on
            discovery, not a description.
          </p>
        </Card>
      </Enter>

      {/* ------------------------------------------------------ expertise */}
      <Enter index={2}>
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-sm bg-tint-navy text-on-tint-navy">
                <Icon name="code" size={17} />
              </span>
              <h2 className="headline-md text-ink">Technology</h2>
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              Drives 25 of the 100 match points. Claiming a domain you cannot staff produces matches
              you will decline, so this list is narrower than the marketing one.
            </p>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {company.technologyDomains.map((t) => (
                <li
                  className="inline-flex items-center gap-1 rounded-full bg-tint-navy px-2.5 py-1 text-xs font-semibold text-on-tint-navy"
                  key={t}
                >
                  <Icon name="check" size={11} />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-md bg-card-muted p-3 text-xs text-ink-muted">
              Known gaps: <span className="font-semibold text-ink">AI/ML</span>,{" "}
              <span className="font-semibold text-ink">hydraulic modelling</span> and{" "}
              <span className="font-semibold text-ink">certification</span>. These are the reason
              some strong matches sit at 90 rather than 100 —{" "}
              <Link className="font-semibold text-navy hover:underline" href="/industry/universities">
                a university lab usually closes them.
              </Link>
            </p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-sm bg-tint-mint text-on-tint-mint">
                <Icon name="heart" size={17} />
              </span>
              <h2 className="headline-md text-ink">CSR focus</h2>
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              Drives 25 points. Board-approved for {company.csrBudget.financialYear}; a challenge
              outside every theme is not fundable from this budget at all.
            </p>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {company.csrThemes.map((t) => (
                <li
                  className="inline-flex items-center gap-1 rounded-full bg-tint-mint px-2.5 py-1 text-xs font-semibold text-on-tint-mint"
                  key={t}
                >
                  <Icon name="check" size={11} />
                  {DOMAIN_LABEL[t]}
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <p className="label-caps text-ink-faint">Preferred SDGs</p>
              <div className="mt-2">
                <SdgChips max={8} sdgs={company.sdgPreferences} />
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-sm bg-tint-clay text-on-tint-clay">
                <Icon name="map-pin" size={17} />
              </span>
              <h2 className="headline-md text-ink">Deployment</h2>
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              Geography drives 20 points and capability 15. Both describe what you can actually put
              in a village, not what you would be willing to pay for.
            </p>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {company.geographies.map((g) => (
                <li
                  className="inline-flex items-center gap-1 rounded-full bg-tint-clay px-2.5 py-1 text-xs font-semibold text-on-tint-clay"
                  key={g}
                >
                  <Icon name="map-pin" size={11} />
                  {g}
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <p className="label-caps text-ink-faint">Capabilities</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {ALL_CAPABILITIES.map((c) => {
                  const held = company.capabilities.includes(c as never);
                  return (
                    <li
                      className={cx(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        held ? "bg-card-muted text-ink" : "bg-container text-ink-faint line-through",
                      )}
                      key={c}
                    >
                      <Icon name={held ? "check" : "x"} size={11} />
                      {CAPABILITY_LABEL[c]}
                    </li>
                  );
                })}
              </ul>
            </div>
          </Card>
        </div>
      </Enter>

      {/* --------------------------------------------------------- money */}
      <Enter index={3}>
        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="p-6">
            <h2 className="headline-md text-ink">Funding envelope</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Drives 15 points. Challenges below the floor cost more in review than they are worth;
              ones above the ceiling become co-funding candidates rather than rejections.
            </p>
            <dl className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Cell label="Floor" value={rupees(company.fundingRange.min)} />
              <Cell label="Ceiling" value={rupees(company.fundingRange.max)} />
              <Cell label="Board project cap" value={rupees(company.csrBudget.preferredProjectCeiling)} />
              <Cell label="Available now" value={rupees(book.available)} />
            </dl>
            <div className="mt-5">
              <Progress
                label="Allocation committed"
                tone="navy"
                value={(book.committed / book.allocated) * 100}
              />
              <p className="mt-1.5 text-xs text-ink-muted">
                {rupees(book.committed)} of {rupees(book.allocated)} committed this year.
              </p>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="headline-md text-ink">Track record</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Domains you have actually delivered in earn a small named adjustment, because delivery
              risk is genuinely lower where a company has done it before.
            </p>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {company.provenDomains.map((d) => (
                <li
                  className="inline-flex items-center gap-1 rounded-full bg-gold-tint px-2.5 py-1 text-xs font-semibold text-on-gold-tint"
                  key={d}
                >
                  <Icon name="award" size={11} />
                  {DOMAIN_LABEL[d]}
                </li>
              ))}
            </ul>
            <dl className="mt-5 grid grid-cols-3 gap-4">
              <Cell label="Projects" value={String(totals.projects)} />
              <Cell label="People reached" value={people(totals.peopleImpacted)} />
              <Cell label="Clusters closed" value={String(totals.clustersClosed)} />
            </dl>
            <div className="mt-5">
              <p className="label-caps text-ink-faint">Communities you target</p>
              <ul className="mt-2 flex flex-col gap-1">
                {company.targetCommunities.map((c) => (
                  <li className="flex gap-2 text-sm text-ink-muted" key={c}>
                    <Icon className="mt-0.5 shrink-0 text-ink-faint" name="check" size={13} />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </Enter>

      {/* --------------------------------------------------- visibility */}
      <Enter index={4}>
        <Card className="p-6 lg:p-8" id="visibility">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-tint-navy text-on-tint-navy">
              <Icon name="lock" size={20} />
            </span>
            <div className="min-w-0">
              <h2 className="headline-lg text-ink">What you can and cannot see</h2>
              <p className="mt-1 text-sm text-ink-muted">
                Published in full, because a partner who knows exactly where the line is drawn trusts
                the data on their side of it more, not less.
              </p>
            </div>
          </div>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {state.redactions.map((r) => (
              <li className="rounded-lg bg-card-muted p-4" key={r.visible}>
                <p className="flex gap-2 text-sm text-ink">
                  <Icon className="mt-0.5 shrink-0 text-impact-deep" name="eye" size={15} />
                  <span>{r.visible}</span>
                </p>
                <p className="mt-2 flex gap-2 text-sm text-ink-muted">
                  <Icon className="mt-0.5 shrink-0 text-ink-faint" name="lock" size={15} />
                  <span>{r.hidden}</span>
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-5 rounded-md bg-container p-4 text-sm text-ink-muted">
            These rules are enforced in one module, <code className="text-ink">visibility.ts</code>, which
            is the only place a government problem record becomes a partner-facing challenge. A screen
            cannot show a field it was never handed.
          </p>
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
