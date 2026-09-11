"use client";

/**
 * Industry partners.
 *
 * Split in two: companies already carrying your work, and the rest of the
 * network. The second list is the useful one — an institution whose team needs
 * field deployment or certification needs to know which partner can supply it.
 *
 * "Connected" is derived from something real: a funding commitment against a
 * problem one of your teams is working on. There is no partnership register on
 * the platform yet, so this is a narrower definition than one would give — with
 * the advantage of being true rather than declared.
 */

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Badge, Card, Enter, PageHeading, cx } from "@/components/ui";
import { SearchField } from "@/components/ui-interactive";
import { Chips, EmptyState, Fact, Loaded, NoResults } from "@/components/institute/pieces";
import { InstituteApi } from "@/lib/institute/service";
import { useResource } from "@/lib/institute/use-resource";
import { rupees } from "@/lib/institute/format";
import type { Partner } from "@/lib/institute/types";

export default function PartnersPage() {
  const [query, setQuery] = useState("");
  const partners = useResource(() => InstituteApi.partners(), []);
  const all = useMemo(() => partners.data ?? [], [partners.data]);

  const { connected, network } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = all.filter(
      (p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sector ?? "").toLowerCase().includes(q) ||
        p.technologyDomains.some((d) => d.toLowerCase().includes(q)) ||
        p.capabilities.some((c) => c.toLowerCase().includes(q)),
    );
    return {
      connected: rows.filter((p) => p.connected),
      network: rows.filter((p) => !p.connected),
    };
  }, [all, query]);

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <PageHeading
          emphasis="partners"
          subtitle="Companies, MSMEs, PSUs and CSR trusts on the platform — which of them already fund or mentor your teams, and which could."
          title="Industry"
        />
      </Enter>

      <Loaded
        empty={
          <Card className="p-6">
            <EmptyState
              icon="factory"
              message="No industry partners are on the platform yet. They appear as companies register and are verified."
              title="No partners on the network"
              tone="info"
            />
          </Card>
        }
        isEmpty={() => all.length === 0}
        resource={partners}
      >
        {() => (
          <>
            <Enter index={1}>
              <Card className="p-4 sm:p-5">
                <SearchField
                  label="Search partners"
                  onChange={setQuery}
                  placeholder="Company, sector, technology or capability…"
                  size="sm"
                  value={query}
                />
              </Card>
            </Enter>

            {connected.length + network.length === 0 ? (
              <Card className="p-6">
                <NoResults onClear={() => setQuery("")} what="partners" />
              </Card>
            ) : null}

            {connected.length ? (
              <Enter index={2}>
                <section className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[12px] bg-primary-fixed text-on-primary-fixed-variant">
                      <Icon name="heart" size={17} />
                    </span>
                    <h2 className="headline-md min-w-0 flex-1 text-ink">
                      Already carrying your work
                    </h2>
                  </div>
                  <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
                    {connected.map((p) => (
                      <PartnerCard key={p.id} partner={p} />
                    ))}
                  </div>
                </section>
              </Enter>
            ) : null}

            {network.length ? (
              <Enter index={3}>
                <section className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-[30px] shrink-0 items-center justify-center rounded-[12px] bg-container text-ink-muted">
                      <Icon name="globe" size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="headline-md text-ink">On the network, not yet yours</h2>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        Where a team needs a capability your labs do not hold, this is usually the
                        answer.
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
                    {network.map((p) => (
                      <PartnerCard compact key={p.id} partner={p} />
                    ))}
                  </div>
                </section>
              </Enter>
            ) : null}
          </>
        )}
      </Loaded>
    </div>
  );
}

/* ------------------------------------------------------------------------ */

function PartnerCard({ partner: p, compact }: { partner: Partner; compact?: boolean }) {
  return (
    <Card className="flex h-full flex-col p-5">
      <div className="flex items-start gap-3">
        <span
          className={cx(
            "flex size-11 shrink-0 items-center justify-center rounded-[14px]",
            p.connected ? "bg-tint-amber text-on-tint-amber" : "bg-card-muted text-ink-muted",
          )}
        >
          <Icon name="factory" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="headline-sm text-balance text-ink">{p.name}</h3>
          <p className="truncate text-sm text-ink-muted">
            {p.sector ?? "Sector not stated"}
            {p.city ? ` · ${p.city}, ${p.state}` : ""}
          </p>
        </div>
        {p.connected ? (
          <Badge dense tone="success">
            Partner
          </Badge>
        ) : null}
      </div>

      {!compact && p.about ? (
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">{p.about}</p>
      ) : null}

      {p.connected ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 [&>*]:min-w-0">
          <Fact label="Shared problems" value={p.sharedProblems} />
          <Fact label="Committed" value={rupees(p.committed)} />
        </dl>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        {p.technologyDomains.length ? (
          <div>
            <p className="label-caps text-ink-faint">Technology</p>
            <div className="mt-1.5">
              <Chips items={p.technologyDomains} max={compact ? 3 : 6} />
            </div>
          </div>
        ) : null}
        {p.capabilities.length ? (
          <div>
            <p className="label-caps text-ink-faint">Can supply</p>
            <div className="mt-1.5">
              <Chips items={p.capabilities} max={compact ? 3 : 8} />
            </div>
          </div>
        ) : null}
      </div>

      {p.geographies.length ? (
        <p className="mt-auto flex items-center gap-2 border-t border-line pt-4 text-xs text-ink-faint">
          <Icon name="map-pin" size={13} />
          Works in {p.geographies.slice(0, 3).join(", ")}
          {p.geographies.length > 3 ? ` +${p.geographies.length - 3}` : ""}
        </p>
      ) : null}
    </Card>
  );
}
