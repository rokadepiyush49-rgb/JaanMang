"use client";

/**
 * Forming a team.
 *
 * One screen, not a wizard: a team is a name, a brief, some students and a
 * guide, and none of the four depends on another. Splitting four fields across
 * four steps would only make it feel longer.
 *
 * Students and the guide are both optional here, because a team is usually
 * formed before both are settled — and a form that refuses to save until
 * everything is known is a form people work around. Whatever is missing shows
 * up on the dashboard as a queue instead.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Badge, Button, Card, CardHeader, Enter, PageHeading, cx } from "@/components/ui";
import { Field, SelectField, TagField } from "@/components/form";
import { SearchField } from "@/components/ui-interactive";
import { ActionError, Chips, initials } from "@/components/institute/pieces";
import { InstituteApi } from "@/lib/institute/service";
import { useAction, useResource } from "@/lib/institute/use-resource";
import { useInstitute } from "@/lib/institute/store";
import { SEVERITY_TONE, plural } from "@/lib/institute/format";

const SKILL_SUGGESTIONS = [
  "IoT",
  "Embedded C",
  "React",
  "Node.js",
  "Python",
  "Machine Learning",
  "GIS",
  "Structural Analysis",
  "Survey",
  "Solar",
  "Power Electronics",
  "Mobile",
  "Data Analysis",
];

export default function NewTeamPage() {
  const router = useRouter();
  const overview = useInstitute();

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [departmentId, setDepartmentId] = useState("none");
  const [problemId, setProblemId] = useState("none");
  const [facultyId, setFacultyId] = useState("none");
  const [skills, setSkills] = useState<string[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const departments = useResource(() => InstituteApi.departments(), []);
  const faculty = useResource(() => InstituteApi.faculty(), []);
  const roster = useResource(() => InstituteApi.students({ status: "verified" }), []);
  const opportunities = useResource(() => InstituteApi.opportunities(), []);
  const { run, busy, error } = useAction();

  const available = (faculty.data ?? []).filter((f) => f.available || f.id === facultyId);
  const problem = (opportunities.data ?? []).find((o) => o.id === problemId);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (roster.data ?? []).filter((s) => {
      if (s.team) return false;
      if (departmentId !== "none" && s.departmentId && s.departmentId !== departmentId) {
        return false;
      }
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q) ||
        s.skills.some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [roster.data, query, departmentId]);

  const valid = name.trim().length > 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const created = await run(async () => {
      const team = await InstituteApi.createTeam({
        name: name.trim(),
        title: title.trim() || undefined,
        departmentId: departmentId === "none" ? null : departmentId,
        problemId: problemId === "none" ? null : problemId,
        facultyId: facultyId === "none" ? null : facultyId,
        memberIds,
        skills,
      });
      overview.reload();
      router.push(`/institute/teams/${team.id}`);
    });
    if (!created) return;
  }

  return (
    <form className="flex flex-col gap-6" onSubmit={submit}>
      <Enter>
        <PageHeading
          breadcrumb={["Teams", "New"]}
          emphasis="team"
          subtitle="Students, a faculty guide and a brief. You can save with any of them missing — whatever is left shows on the dashboard until it is done."
          title="Form a"
        />
      </Enter>

      <Enter index={1}>
        <div className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
          <Card className="flex flex-col gap-4 p-6 xl:col-span-2">
            <CardHeader icon="rocket" title="The team" />

            <Field
              label="Team name"
              onChange={(e) => setName(e.target.value)}
              placeholder="Jal Setu"
              required
              value={name}
            />

            <Field
              hint="What they are actually building. Shown everywhere the team appears."
              label="Brief"
              onChange={(e) => setTitle(e.target.value)}
              optional
              placeholder="Low-cost telemetry for rural water supply continuity"
              value={title}
            />

            <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
              <SelectField
                label="Department"
                onChange={(e) => setDepartmentId(e.target.value)}
                optional
                options={[
                  { value: "none", label: "No department" },
                  ...(departments.data ?? []).map((d) => ({ value: d.id, label: d.name })),
                ]}
                value={departmentId}
              />

              <SelectField
                hint="Somebody who has room for another team."
                label="Faculty guide"
                onChange={(e) => setFacultyId(e.target.value)}
                optional
                options={[
                  { value: "none", label: "Assign later" },
                  ...available.map((f) => ({
                    value: f.id,
                    label: `${f.name} — ${f.activeTeams}/${f.guideCapacity} teams`,
                  })),
                ]}
                value={facultyId}
              />
            </div>

            <TagField
              hint="What the work needs. The guide picker ranks faculty against these."
              label="Skills"
              onChange={setSkills}
              optional
              suggestions={SKILL_SUGGESTIONS}
              value={skills}
            />
          </Card>

          <Card className="flex flex-col gap-4 p-6">
            <CardHeader icon="map-pin" title="The problem" />
            <p className="text-sm text-ink-muted">
              A validated citizen problem the team will work on. It can be chosen later from the
              Opportunities screen.
            </p>

            <SelectField
              label="Validated problem"
              onChange={(e) => setProblemId(e.target.value)}
              optional
              options={[
                { value: "none", label: "Choose later" },
                ...(opportunities.data ?? [])
                  .filter((o) => !o.ourTeam)
                  .slice(0, 60)
                  .map((o) => ({ value: o.id, label: o.title })),
              ]}
              value={problemId}
            />

            {problem ? (
              <div className="rounded-lg bg-card-muted p-4">
                <p className="text-sm font-bold text-ink">{problem.title}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge dense tone={SEVERITY_TONE[problem.severity] ?? "neutral"}>
                    {problem.severity}
                  </Badge>
                  <Badge dense tone="neutral">
                    {problem.category}
                  </Badge>
                  <Badge dense tone="neutral">
                    {problem.jurisdiction.name}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-ink-muted">
                  {problem.affected.toLocaleString("en-IN")} people affected across{" "}
                  {plural(problem.reportCount, "report")}.
                </p>
              </div>
            ) : null}
          </Card>
        </div>
      </Enter>

      {/* ------------------------------------------------------ members --- */}
      <Enter index={2}>
        <Card className="p-6">
          <CardHeader
            icon="users"
            subtitle="Verified students who are not already on an active team. Filtered to the chosen department, when there is one."
            title={`Members${memberIds.length ? ` — ${plural(memberIds.length, "chosen")}` : ""}`}
          />

          <SearchField
            className="mt-4"
            label="Search the roster"
            onChange={setQuery}
            placeholder="Name, branch or skill…"
            size="sm"
            value={query}
          />

          {roster.loading ? (
            <p className="mt-4 text-sm text-ink-muted">Loading the roster…</p>
          ) : candidates.length === 0 ? (
            <p className="mt-4 rounded-md bg-card-muted px-4 py-6 text-center text-sm text-ink-muted">
              {(roster.data ?? []).length === 0
                ? "No verified students yet. Verify students on the roster screen first — you can still create the team and add them later."
                : "Nobody free matches that search."}
            </p>
          ) : (
            <ul className="mt-4 grid max-h-96 gap-2 overflow-y-auto sm:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
              {candidates.map((s) => {
                const selected = memberIds.includes(s.id);
                return (
                  <li key={s.id}>
                    <button
                      aria-pressed={selected}
                      className={cx(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                        selected ? "bg-primary-fixed" : "bg-card-muted hover:bg-container",
                      )}
                      onClick={() =>
                        setMemberIds((p) =>
                          p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id],
                        )
                      }
                      type="button"
                    >
                      <span
                        className={cx(
                          "flex size-5 shrink-0 items-center justify-center rounded-[6px] border-2",
                          selected ? "border-primary bg-primary text-white" : "border-line-strong",
                        )}
                      >
                        {selected ? <Icon name="check" size={13} /> : null}
                      </span>
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tint-navy text-[11px] font-bold text-on-tint-navy">
                        {initials(s.name)}
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-sm font-bold text-ink">{s.name}</span>
                        <span className="block truncate text-xs text-ink-muted">
                          {s.branch} · Year {s.currentYear}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {skills.length ? (
            <div className="mt-4">
              <p className="label-caps text-ink-faint">Team skills</p>
              <div className="mt-2">
                <Chips items={skills} />
              </div>
            </div>
          ) : null}
        </Card>
      </Enter>

      <Enter index={3}>
        <div className="flex flex-col gap-3">
          <ActionError>{error}</ActionError>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!valid || busy} size="lg" type="submit">
              {busy ? "Forming…" : "Form the team"}
            </Button>
            <Button onClick={() => router.back()} size="lg" tone="outline" type="button">
              Cancel
            </Button>
            {!valid ? (
              <span className="text-sm text-ink-muted">A team needs a name to start.</span>
            ) : null}
          </div>
        </div>
      </Enter>
    </form>
  );
}
