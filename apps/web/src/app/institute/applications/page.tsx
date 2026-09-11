"use client";

/**
 * Applications.
 *
 * What this institution's students and teams have applied to, and where each
 * one stands. Read-only on purpose: the decision belongs to whoever posted the
 * opportunity, and a screen with buttons that only pretend to decide is worse
 * than one with none.
 *
 * The header carries the one figure worth acting on — the selection rate across
 * applications that actually got a decision, which is the number a placement
 * cell is asked for.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge, Card, Cell, Enter, PageHeading, Row, StatTile, Table } from "@/components/ui";
import { SearchField, Tabs } from "@/components/ui-interactive";
import { EmptyState, Loaded, NoResults, PersonLine } from "@/components/institute/pieces";
import { InstituteApi } from "@/lib/institute/service";
import { useResource } from "@/lib/institute/use-resource";
import { APPLICATION_LABEL, APPLICATION_TONE, shortDate } from "@/lib/institute/format";
import type { ApplicationStatus } from "@/lib/institute/types";

const OPEN: ApplicationStatus[] = ["submitted", "under_review", "shortlisted"];

export default function ApplicationsPage() {
  const [tab, setTab] = useState("open");
  const [query, setQuery] = useState("");
  const applications = useResource(() => InstituteApi.applications(), []);
  const all = useMemo(() => applications.data ?? [], [applications.data]);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = all.filter(
      (a) =>
        !q ||
        (a.opportunityRef ?? "").toLowerCase().includes(q) ||
        (a.student?.name ?? "").toLowerCase().includes(q) ||
        (a.team?.name ?? "").toLowerCase().includes(q),
    );
    return {
      open: rows.filter((a) => OPEN.includes(a.status)),
      decided: rows.filter((a) => a.status === "accepted" || a.status === "rejected"),
      draft: rows.filter((a) => a.status === "draft" || a.status === "withdrawn"),
      all: rows,
    };
  }, [all, query]);

  const shown = groups[tab as keyof typeof groups] ?? groups.all;

  const decided = all.filter((a) => a.status === "accepted" || a.status === "rejected");
  const accepted = all.filter((a) => a.status === "accepted").length;
  const rate = decided.length ? Math.round((accepted / decided.length) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      <Enter>
        <PageHeading
          emphasis="applications"
          subtitle="Where every application from your students and teams stands. The decision belongs to whoever posted the opportunity — this is the record of it."
          title="Student"
        />
      </Enter>

      <Loaded
        empty={
          <Card className="p-6">
            <EmptyState
              actionHref="/institute/opportunities"
              actionLabel="Browse opportunities"
              icon="send"
              message="Nothing has been applied to yet. Opportunities are validated citizen problems and partner programmes your students can take on."
              title="No applications yet"
              tone="info"
            />
          </Card>
        }
        isEmpty={() => all.length === 0}
        resource={applications}
      >
        {() => (
          <>
            <Enter index={1}>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 [&>*]:min-w-0">
                <StatTile icon="send" label="Total" tone="navy" value={String(all.length)} />
                <StatTile
                  hint="waiting on a decision"
                  icon="clock"
                  label="Open"
                  tone="amber"
                  value={String(groups.open.length)}
                />
                <StatTile
                  icon="check-circle"
                  label="Selected"
                  tone="mint"
                  value={String(accepted)}
                />
                <StatTile
                  hint={
                    rate === null
                      ? "nothing decided yet"
                      : `of ${decided.length} decided applications`
                  }
                  icon="trending-up"
                  label="Selection rate"
                  tone="orchid"
                  value={rate === null ? "—" : `${rate}%`}
                />
              </div>
            </Enter>

            <Enter index={2}>
              <Card className="flex flex-col gap-4 p-4 sm:p-5">
                <SearchField
                  label="Search applications"
                  onChange={setQuery}
                  placeholder="Opportunity, student or team…"
                  size="sm"
                  value={query}
                />
                <Tabs
                  onChange={setTab}
                  tabs={[
                    { id: "open", label: "Open", count: groups.open.length },
                    { id: "decided", label: "Decided", count: groups.decided.length },
                    { id: "draft", label: "Draft & withdrawn", count: groups.draft.length },
                    { id: "all", label: "All", count: groups.all.length },
                  ]}
                  value={tab}
                />
              </Card>
            </Enter>

            <Enter index={3}>
              {shown.length === 0 ? (
                <Card className="p-6">
                  <NoResults
                    onClear={() => {
                      setQuery("");
                      setTab("all");
                    }}
                    what="applications"
                  />
                </Card>
              ) : (
                <Card className="py-2">
                  <Table head={["Opportunity", "Student", "Team", "Submitted", "Decided", "Status"]}>
                    {shown.map((a) => (
                      <Row key={a.id}>
                        <Cell className="font-semibold">
                          {a.opportunityRef ?? (
                            <span className="text-ink-faint">Untitled opportunity</span>
                          )}
                        </Cell>
                        <Cell>
                          {a.student ? (
                            <PersonLine
                              detail={`${a.student.branch} · Year ${a.student.currentYear}`}
                              name={a.student.name}
                            />
                          ) : (
                            <span className="text-xs text-ink-faint">Not on your roster</span>
                          )}
                        </Cell>
                        <Cell>
                          {a.team ? (
                            <Link
                              className="text-sm font-semibold text-navy hover:underline"
                              href={`/institute/teams/${a.team.id}`}
                            >
                              {a.team.name}
                            </Link>
                          ) : (
                            <span className="text-xs text-ink-faint">Individual</span>
                          )}
                        </Cell>
                        <Cell className="text-ink-muted">{shortDate(a.submittedAt)}</Cell>
                        <Cell className="text-ink-muted">{shortDate(a.decidedAt)}</Cell>
                        <Cell>
                          <Badge dense tone={APPLICATION_TONE[a.status]}>
                            {APPLICATION_LABEL[a.status]}
                          </Badge>
                        </Cell>
                      </Row>
                    ))}
                  </Table>
                </Card>
              )}
            </Enter>
          </>
        )}
      </Loaded>
    </div>
  );
}
