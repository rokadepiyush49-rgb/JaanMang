"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import {
  Button,
  ButtonLink,
  Card,
  PageHeading,
  StatTile,
  Tag,
} from "@/components/ui";
import { toViewPartner } from "@/lib/student/adapters";
import { StudentApi, type Partner } from "@/lib/student/service";


export function IndustryHubPage() {
  const [partners, setPartners] = useState<ReturnType<typeof toViewPartner>[]>([]);
  useEffect(() => {
    let cancelled = false;
    void StudentApi.partners()
      .then((rows: Partner[]) => {
        if (!cancelled) setPartners(rows.map(toViewPartner));
      })
      .catch(() => {
        if (!cancelled) setPartners([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openRoles = partners.reduce((sum, p) => sum + p.open, 0);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeading
        actions={
          <>
            <ButtonLink href="/collaborate/new" icon="plus" tone="outline">
              Propose a partnership
            </ButtonLink>
            {/* The partner's own side of this page. A student sees who is
                offering; a company sees the challenges they could carry. */}
            <ButtonLink href="/industry" icon="factory">
              Open the Industry Portal
            </ButtonLink>
          </>
        }
        subtitle="Industry partners posting sponsored challenges, internships, and mentorship across the state."
        title="Industry Hub"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile
          icon="factory"
          label="Active Partners"
          tone="navy"
          value={String(partners.length)}
        />
        <StatTile
          icon="briefcase"
          label="Open Roles"
          tone="impact"
          value={String(openRoles)}
        />
        <StatTile icon="banknote" label="Pooled Stipend" tone="community" value="₹8.4L" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {partners.map((partner) => (
          <Card className="p-6" key={partner.name}>
            <div className="flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-navy text-white">
                <Icon name="factory" size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="headline-md text-ink">{partner.name}</h2>
                <p className="text-sm text-ink-muted">{partner.sector}</p>
              </div>
              <Tag tone="impact">{partner.open} live</Tag>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {partner.focus.map((area) => (
                <Tag key={area} tone="neutral">
                  {area}
                </Tag>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <span className="flex items-center gap-2 text-sm font-semibold text-ink-muted">
                <Icon name="briefcase" size={16} />
                {partner.open} open role{partner.open === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                <Button size="sm" tone="outline">
                  View brief
                </Button>
                <ButtonLink href="/problem-explorer" size="sm">
                  Explore challenges
                </ButtonLink>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
