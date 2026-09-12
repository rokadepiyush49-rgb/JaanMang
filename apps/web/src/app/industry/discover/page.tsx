"use client";

/**
 * The challenge marketplace.
 *
 * Everything the government has validated and published, filterable the way a
 * partner actually narrows a shortlist: by what they fund, where they work,
 * what the challenge needs from them, and how much is still outstanding.
 *
 * The sort control matters more than it looks. "Best match" is the default
 * because it is the portal's argument, but "Lowest funding required" and "Most
 * urgent" are there because those are the two orderings a CSR lead with a
 * closing financial year actually reaches for, and hiding them would make the
 * default feel like a sales pitch.
 */

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/icon";
import {
  ButtonLink,
  Card,
  EmptyState,
  Enter,
  Skeleton,
} from "@/components/ui";
import { SearchField, Select, Tabs } from "@/components/ui-interactive";
import { ChallengeCard } from "@/components/industry/pieces";
import { DOMAIN_LABEL, DOMAINS } from "@/lib/industry/vocabulary";
import { rupees } from "@/lib/industry/format";
import { SUPPORT } from "@/lib/industry/vocabulary";
import { isOpen, ledger, matchContext, scoreAll } from "@/lib/industry/selectors";
import { useIndustry } from "@/lib/industry/store";
import type { Domain, SupportKind } from "@/lib/industry/types";

const SORTS = {
  match: "Best match",
  impact: "Most people affected",
  priority: "Highest priority",
  cheapest: "Lowest funding required",
  urgent: "Most urgent",
  newest: "Newest",
} as const;

type SortKey = keyof typeof SORTS;

const VIEWS = [
  { id: "open", label: "Open to partners" },
  { id: "all", label: "Everything published" },
  { id: "mine", label: "Ours" },
];

const FUNDING_BANDS: Record<string, [number, number]> = {
  All: [0, Number.POSITIVE_INFINITY],
  "Under ₹3 L": [0, 300000],
  "₹3 L – ₹8 L": [300000, 800000],
  "₹8 L – ₹15 L": [800000, 1500000],
  "Over ₹15 L": [1500000, Number.POSITIVE_INFINITY],
};

function DiscoverBody() {
  const params = useSearchParams();
  const { state } = useIndustry();

  const [view, setView] = useState("open");
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState<string>(() => {
    const d = params.get("domain");
    return d && DOMAINS.includes(d as Domain) ? DOMAIN_LABEL[d as Domain] : "All";
  });
  const [stateFilter, setStateFilter] = useState("All");
  const [support, setSupport] = useState("All");
  const [band, setBand] = useState("All");
  const [minMatch, setMinMatch] = useState("All");
  const [sort, setSort] = useState<SortKey>("match");

  const context = matchContext(state.projects, state.assignments);

  const states = useMemo(
    () => ["All", ...new Set(state.challenges.map((c) => c.state))].sort(),
    [state.challenges],
  );

  const rows = useMemo(() => {
    const scored = scoreAll(state.challenges, state.company, context);
    /* Built inside the memo: a Set constructed in the component body is a new
       object on every pass and would defeat the memoization it sits in. */
    const engaged = new Set(state.projects.map((p) => p.challengeId));
    const q = query.trim().toLowerCase();

    const filtered = scored.filter(({ challenge: c, match }) => {
      if (view === "open" && !isOpen(c)) return false;
      if (view === "mine" && !engaged.has(c.id)) return false;
      if (domain !== "All" && DOMAIN_LABEL[c.domain] !== domain) return false;
      if (stateFilter !== "All" && c.state !== stateFilter) return false;
      if (support !== "All" && !c.supportNeeded.includes(support as SupportKind)) return false;
      if (minMatch !== "All" && match.score < Number(minMatch)) return false;

      const [lo, hi] = FUNDING_BANDS[band] ?? FUNDING_BANDS.All;
      const need = c.fundingRequired || c.estimatedCost;
      if (need < lo || need >= hi) return false;

      if (q) {
        const haystack = [
          c.id,
          c.title,
          c.summary,
          DOMAIN_LABEL[c.domain],
          c.district,
          c.state,
          c.department,
          ...c.villages,
          ...c.technologies,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const by: Record<SortKey, (a: typeof filtered[number], b: typeof filtered[number]) => number> = {
      match: (a, b) => b.match.score - a.match.score,
      impact: (a, b) => b.challenge.affected - a.challenge.affected,
      priority: (a, b) => b.challenge.priority - a.challenge.priority,
      cheapest: (a, b) =>
        (a.challenge.fundingRequired || a.challenge.estimatedCost) -
        (b.challenge.fundingRequired || b.challenge.estimatedCost),
      urgent: (a, b) =>
        (a.challenge.responseDueAt ?? "9999").localeCompare(b.challenge.responseDueAt ?? "9999") ||
        b.challenge.priority - a.challenge.priority,
      newest: (a, b) => b.challenge.publishedAt.localeCompare(a.challenge.publishedAt),
    };

    return [...filtered].sort(by[sort]);
  }, [state.challenges, state.projects, state.company, context, view, query, domain, stateFilter, support, band, minMatch, sort]);

  const outstanding = rows.reduce((s, r) => s + ledger(r.challenge).outstanding, 0);
  const affected = rows.reduce((s, r) => s + r.challenge.affected, 0);

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="headline-xl text-ink">
              <span className="font-medium">Challenge</span>{" "}
              <span className="font-bold">marketplace</span>
            </h1>
            <p className="mt-2 max-w-2xl text-base text-ink-muted">
              Every problem the state has validated and published to partners. {rows.length} shown —{" "}
              {affected.toLocaleString("en-IN")} people affected and {rupees(outstanding)} of funding
              still outstanding across them.
            </p>
          </div>
          <ButtonLink href="/industry/opportunities" icon="target" tone="outline">
            Ranked for your company
          </ButtonLink>
        </div>
      </Enter>

      <Enter index={1}>
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Tabs className="flex-1" onChange={setView} tabs={VIEWS} value={view} />
            <SearchField
              className="w-full sm:max-w-sm"
              label="Search challenges"
              onChange={setQuery}
              placeholder="Village, district, technology, department…"
              size="sm"
              value={query}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
            <Select
              label="Domain"
              onChange={setDomain}
              options={["All", ...DOMAINS.map((d) => DOMAIN_LABEL[d])]}
              value={domain}
            />
            <Select label="State" onChange={setStateFilter} options={states} value={stateFilter} />
            <Select
              label="Support needed"
              onChange={setSupport}
              options={["All", ...Object.keys(SUPPORT)]}
              value={support}
            />
            <Select
              label="Funding required"
              onChange={setBand}
              options={Object.keys(FUNDING_BANDS)}
              value={band}
            />
            <Select
              label="Minimum match"
              onChange={setMinMatch}
              options={["All", "60", "70", "80", "90"]}
              value={minMatch}
            />
            <Select
              label="Sort by"
              onChange={(v) => setSort((Object.keys(SORTS) as SortKey[]).find((k) => SORTS[k] === v) ?? "match")}
              options={Object.values(SORTS)}
              value={SORTS[sort]}
            />
          </div>
        </Card>
      </Enter>

      {rows.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {rows.map(({ challenge, match }, i) => (
            <Enter index={i} key={challenge.id}>
              <ChallengeCard
                actions={
                  <ButtonLink href={`/industry/challenges/${challenge.id}`} size="sm">
                    View challenge
                  </ButtonLink>
                }
                challenge={challenge}
                match={match}
              />
            </Enter>
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState
            icon="search"
            message="No published challenge matches these filters. Widen the funding band or clear the minimum match — the state publishes new challenges as they are validated."
            title="Nothing matches yet"
            tone="info"
          />
        </Card>
      )}

      {/* What a partner is not being shown, and why. Stated rather than left
          for them to wonder about. */}
      <Enter index={2}>
        <Card className="flex flex-wrap items-start gap-3 p-5" tone="flat">
          <Icon className="mt-0.5 shrink-0 text-ink-faint" name="lock" size={18} />
          <p className="min-w-0 flex-1 text-sm text-ink-muted">
            Problems still awaiting government validation are not listed here, and never will be —
            an unvalidated report is an allegation about a place and the people in it.{" "}
            <a className="font-semibold text-navy hover:underline" href="/industry/company#visibility">
              See exactly what partners can and cannot see.
            </a>
          </p>
        </Card>
      </Enter>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" rounded="lg" />}>
      <DiscoverBody />
    </Suspense>
  );
}
