"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  Cell,
  EmptyState,
  Enter,
  PageHeading,
  Row,
  SectionHeader,
  Table,
  TintTile,
  cx,
} from "@/components/ui";
import { Modal, Tabs } from "@/components/ui-interactive";
import { APPLICATIONS, type Application } from "@/lib/data";

const STAGE_ICON: Record<Application["stage"], "clock" | "eye" | "message" | "check-circle" | "x"> = {
  Submitted: "clock",
  "Under Review": "eye",
  Interview: "message",
  Offer: "check-circle",
  "Not selected": "x",
};

/** A phone-friendly card. The table below takes over once there is width. */
function ApplicationCard({
  item,
  onWithdraw,
}: {
  item: Application;
  onWithdraw: () => void;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-bold text-ink">{item.role}</h2>
          <p className="truncate text-sm text-ink-muted">{item.org}</p>
        </div>
        <Badge dense icon={STAGE_ICON[item.stage]} tone={item.tone}>
          {item.stage}
        </Badge>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
        <div>
          <dt className="label-caps text-ink-faint">Submitted</dt>
          <dd className="mt-0.5 font-semibold text-ink">{item.submitted}</dd>
        </div>
        <div className="min-w-0">
          <dt className="label-caps text-ink-faint">Next step</dt>
          <dd className="mt-0.5 font-semibold text-ink">{item.next}</dd>
        </div>
      </dl>
      <div className="mt-4 flex gap-2">
        <ButtonLink className="flex-1" href="/opportunities" size="sm" tone="outline">
          View posting
        </ButtonLink>
        <Button onClick={onWithdraw} size="sm" tone="ghost">
          Withdraw
        </Button>
      </div>
    </Card>
  );
}

export default function ApplicationsPage() {
  const [tab, setTab] = useState("open");
  const [withdrawing, setWithdrawing] = useState<Application | null>(null);

  const open = APPLICATIONS.filter((a) => a.stage !== "Not selected");
  const closed = APPLICATIONS.filter((a) => a.stage === "Not selected");
  const shown = tab === "open" ? open : tab === "closed" ? closed : APPLICATIONS;

  const offers = APPLICATIONS.filter((a) => a.stage === "Offer").length;
  const interviews = APPLICATIONS.filter((a) => a.stage === "Interview").length;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <Enter>
        <PageHeading
          actions={
            <ButtonLink href="/opportunities" icon="plus" tone="outline">
              Apply to something
            </ButtonLink>
          }
          emphasis="applications"
          subtitle="Where each of your applications stands, and what it is waiting on next."
          title="Your"
        />
      </Enter>

      <Enter index={1}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
          <TintTile
            icon="file-pen"
            label="Total sent"
            tint="navy"
            value={String(APPLICATIONS.length)}
          />
          <TintTile icon="eye" label="In review" tint="amber" value={String(open.length - offers - interviews)} />
          <TintTile icon="message" label="Interviews" tint="blue" value={String(interviews)} />
          <TintTile icon="check-circle" label="Offers" tint="mint" value={String(offers)} />
        </div>
      </Enter>

      {offers > 0 ? (
        <Enter index={2}>
          {/* One thing needs an answer. It is said once, in the tone reserved
              for a good outcome, with the action right beside it. */}
          <Card className="flex flex-wrap items-center gap-4 border border-success/25 bg-success-tint p-5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/60 text-on-success-tint">
              <Icon name="check-circle" size={24} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-on-success-tint">
                You have {offers} offer waiting on your answer
              </p>
              <p className="text-sm text-on-success-tint/85">
                AI for Supply Chain Fellowship — accept by Sep 10.
              </p>
            </div>
            <ButtonLink href="/opportunities" size="sm">
              Respond
            </ButtonLink>
          </Card>
        </Enter>
      ) : null}

      <Enter index={3}>
        <Tabs
          onChange={setTab}
          tabs={[
            { id: "open", label: "Open", count: open.length },
            { id: "closed", label: "Closed", count: closed.length },
            { id: "all", label: "All", count: APPLICATIONS.length },
          ]}
          value={tab}
        />
      </Enter>

      {shown.length === 0 ? (
        <Card className="p-6">
          <EmptyState
            actionHref="/opportunities"
            actionLabel="Browse opportunities"
            icon="file-pen"
            message="Nothing in this list yet. Applications you send appear here with their stage and next step."
            title="No applications"
          />
        </Card>
      ) : (
        <>
          {/* Phone: cards. Tablet and up: a table, which is what this data
              actually is. */}
          <Enter className="lg:hidden" index={4}>
            <div className="flex flex-col gap-4">
              {shown.map((item) => (
                <ApplicationCard
                  item={item}
                  key={item.id}
                  onWithdraw={() => setWithdrawing(item)}
                />
              ))}
            </div>
          </Enter>

          <Enter className="hidden lg:block" index={4}>
            <Card className="overflow-hidden py-2">
              <Table head={["Role", "Partner", "Submitted", "Stage", "Next step", ""]}>
                {shown.map((item) => (
                  <Row key={item.id}>
                    <Cell className="font-bold">{item.role}</Cell>
                    <Cell className="text-ink-muted">{item.org}</Cell>
                    <Cell className="whitespace-nowrap text-ink-muted">
                      {item.submitted}
                    </Cell>
                    <Cell>
                      <Badge dense icon={STAGE_ICON[item.stage]} tone={item.tone}>
                        {item.stage}
                      </Badge>
                    </Cell>
                    <Cell className="text-ink-muted">{item.next}</Cell>
                    <Cell className="text-right">
                      <Button
                        onClick={() => setWithdrawing(item)}
                        size="sm"
                        tone="ghost"
                      >
                        Withdraw
                      </Button>
                    </Cell>
                  </Row>
                ))}
              </Table>
            </Card>
          </Enter>
        </>
      )}

      <Enter index={5}>
        <Card className="p-6">
          <SectionHeader icon="bulb" title="Improve your odds" />
          <ul className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {[
              {
                icon: "user" as const,
                title: "Finish your profile",
                body: "Applications from complete profiles are shortlisted about twice as often.",
              },
              {
                icon: "rocket" as const,
                title: "Ship one more milestone",
                body: "Verified impact points are the first thing a partner sorts on.",
              },
              {
                icon: "message" as const,
                title: "Answer within two days",
                body: "Partners close postings early when a shortlist goes quiet.",
              },
            ].map((tip) => (
              <li className="rounded-lg bg-card-muted p-4" key={tip.title}>
                <span
                  className={cx(
                    "flex size-10 items-center justify-center rounded-[12px]",
                    "bg-primary-fixed text-on-primary-fixed-variant",
                  )}
                >
                  <Icon name={tip.icon} size={19} />
                </span>
                <p className="mt-3 font-semibold text-ink">{tip.title}</p>
                <p className="mt-1 text-sm text-ink-muted">{tip.body}</p>
              </li>
            ))}
          </ul>
        </Card>
      </Enter>

      <Modal
        footer={
          <>
            <Button onClick={() => setWithdrawing(null)} tone="outline">
              Keep it
            </Button>
            <Button onClick={() => setWithdrawing(null)} tone="danger">
              Withdraw application
            </Button>
          </>
        }
        onClose={() => setWithdrawing(null)}
        open={withdrawing !== null}
        subtitle={withdrawing ? `${withdrawing.role} · ${withdrawing.org}` : undefined}
        title="Withdraw this application?"
      >
        <p className="text-sm text-ink-muted">
          The partner is told you have withdrawn, and the posting stops showing
          you as a candidate. You can apply again while the posting is still
          open, but you start from the first stage.
        </p>
      </Modal>
    </div>
  );
}
