"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icon";
import { Stepper } from "@/components/stepper";
import {
  Avatar,
  Button,
  ButtonLink,
  Card,
  PageHeading,
  Tag,
} from "@/components/ui";
import { CANDIDATES, SKILL_FILTERS } from "@/lib/data";

const TEAM_SIZE = 4;

export default function TeamFormationPage() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string[]>(["React", "UI/UX"]);
  const [invited, setInvited] = useState<string[]>(["rohan"]);

  function toggleFilter(tag: string) {
    setActive((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function toggleInvite(id: string) {
    setInvited((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < TEAM_SIZE - 1
          ? [...prev, id]
          : prev,
    );
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CANDIDATES.filter((c) => {
      if (
        active.length > 0 &&
        !active.some(
          (tag) => c.skills.includes(tag) || c.college === tag,
        )
      ) {
        return false;
      }
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.college.toLowerCase().includes(q) ||
        c.skills.some((s) => s.toLowerCase().includes(q))
      );
    });
  }, [active, query]);

  const team = CANDIDATES.filter((c) => invited.includes(c.id));
  const full = invited.length >= TEAM_SIZE - 1;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8">
      <PageHeading
        actions={<Stepper current={2} />}
        subtitle="Discover and invite collaborators for your new project."
        title="Team Formation"
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <label className="relative block">
              <span className="sr-only">Search collaborators</span>
              <Icon
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-faint"
                name="search"
                size={18}
              />
              <input
                className="h-12 w-full rounded-md border border-line bg-card-muted pr-4 pl-11 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:bg-card focus:ring-2 focus:ring-primary focus:outline-none"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by student name, college, or skill…"
                type="search"
                value={query}
              />
            </label>

            <div className="mt-4 flex flex-wrap gap-2">
              {SKILL_FILTERS.map((tag) => {
                const on = active.includes(tag);
                return (
                  <button
                    aria-pressed={on}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                      on
                        ? "bg-navy text-white"
                        : "bg-card-muted text-ink-muted hover:text-ink"
                    }`}
                    key={tag}
                    onClick={() => toggleFilter(tag)}
                    type="button"
                  >
                    {tag}
                    {on ? <Icon name="x" size={14} /> : null}
                  </button>
                );
              })}
            </div>
          </Card>

          {visible.length === 0 ? (
            <Card className="p-10 text-center text-sm text-ink-faint">
              No collaborators match those filters yet.
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {visible.map((candidate) => {
                const isInvited = invited.includes(candidate.id);
                return (
                  <Card className="flex flex-col p-5" key={candidate.id}>
                    <div className="flex items-start gap-4">
                      <Avatar name={candidate.name} size={56} tone="muted" />
                      <div className="min-w-0 flex-1">
                        <h3 className="headline-md truncate text-ink">
                          {candidate.name}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-muted">
                          <Icon name="graduation" size={16} />
                          {candidate.college}
                        </p>
                      </div>
                      <Tag icon="star" tone="impact">
                        {candidate.points} pts
                      </Tag>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {candidate.skills.map((skill) => (
                        <Tag key={skill} tone="neutral">
                          {skill}
                        </Tag>
                      ))}
                    </div>

                    <Button
                      className="mt-5 w-full"
                      disabled={!isInvited && full}
                      icon={isInvited ? "check" : "user-plus"}
                      onClick={() => toggleInvite(candidate.id)}
                      tone={isInvited ? "outline" : "primary"}
                    >
                      {isInvited ? "Invited" : "Invite to Team"}
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <Card className="h-fit p-6 xl:sticky xl:top-24">
          <div className="flex items-center justify-between">
            <h2 className="headline-lg text-ink">Selected Team</h2>
            <Tag tone="navy">
              {invited.length + 1}/{TEAM_SIZE}
            </Tag>
          </div>

          <ul className="mt-5 flex flex-col gap-3">
            <li className="flex items-center gap-3 rounded-md border border-line bg-card-muted px-4 py-3">
              <Avatar name="Aisha Patel" size={40} tone="navy" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-ink">
                  Aisha Patel
                </span>
                <span className="text-xs text-ink-muted">Team lead · you</span>
              </span>
            </li>

            {team.map((member) => (
              <li
                className="flex items-center gap-3 rounded-md border border-line px-4 py-3"
                key={member.id}
              >
                <Avatar name={member.name} size={40} tone="muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-ink">
                    {member.name}
                  </span>
                  <span className="text-xs text-ink-muted">
                    {member.skills[0]}
                  </span>
                </span>
                <button
                  aria-label={`Remove ${member.name}`}
                  className="text-ink-faint hover:text-danger"
                  onClick={() => toggleInvite(member.id)}
                  type="button"
                >
                  <Icon name="x" size={18} />
                </button>
              </li>
            ))}

            {team.length > 0 ? (
              <li className="rounded-lg bg-card-muted px-4 py-4 text-center text-sm text-ink-muted">
                Pending Invite…
              </li>
            ) : null}

            {Array.from({
              length: Math.max(0, TEAM_SIZE - 1 - invited.length - (team.length > 0 ? 1 : 0)),
            }).map((_, i) => (
              <li
                className="rounded-lg bg-card-muted px-4 py-4 text-center text-sm text-ink-muted"
                key={i}
              >
                Open Slot
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="flex items-center justify-between border-t border-line pt-6">
        <ButtonLink href="/collaborate/new" tone="outline">
          Back
        </ButtonLink>
        <ButtonLink href="/collaborate/review" iconAfter="arrow-right">
          Continue to Review
        </ButtonLink>
      </div>
    </div>
  );
}
