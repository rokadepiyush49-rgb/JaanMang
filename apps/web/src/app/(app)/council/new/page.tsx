"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import {
  Button,
  ButtonLink,
  Card,
  CardHeader,
  PageHeading,
  Tag,
} from "@/components/ui";
import { clearSession, writeSession } from "@/lib/council/session-store";
import { localizedAgent } from "@/lib/council/roster";
import { stringsFor } from "@/lib/i18n/strings";
import { useLocale } from "@/lib/i18n/use-locale";
import { AGENTS, PHASE_KEYS, phaseLabel } from "@/lib/data";

const AGENT_TONES: Record<string, string> = {
  navy: "bg-navy text-white",
  impact: "bg-impact-soft text-impact-deep",
  community: "bg-community-soft text-community-deep",
  muted: "bg-card-muted text-ink-faint",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-[0.5rem] border border-line bg-card px-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:border-navy focus:border-2 focus:outline-none";

export default function CouncilSetupPage() {
  const router = useRouter();
  const [locale] = useLocale();
  const t = stringsFor(locale);
  const [selected, setSelected] = useState<string[]>(
    AGENTS.filter((a) => a.defaultOn).map((a) => a.id),
  );
  const [files, setFiles] = useState<string[]>([
    "baseline-survey-ranchi.csv",
  ]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  /**
   * Hands the brief to the session page through `sessionStorage`.
   *
   * There is no server-side session to POST this into, and putting a
   * multi-paragraph problem statement in the query string is not an option, so
   * the two pages meet at the store. Any previous sitting is cleared first —
   * otherwise a student who abandons one session and starts another arrives at
   * a transcript belonging to the old project.
   */
  function submit(event: FormEvent) {
    event.preventDefault();

    const data = new FormData(event.currentTarget as HTMLFormElement);
    const read = (field: string) => String(data.get(field) ?? "").trim();

    clearSession();
    writeSession({
      brief: {
        title: read("title"),
        problem: read("problem"),
        solution: read("solution"),
        demographic: read("demographic"),
        phase: read("phase"),
        attachments: files,
      },
      seatedAgentIds: selected,
      transcript: [],
      complete: false,
    });

    router.push("/council/session");
  }

  return (
    <form className="mx-auto flex max-w-7xl flex-col gap-6" onSubmit={submit}>
      <PageHeading
        breadcrumb={[t.problemExplorer, t.councilName]}
        subtitle={t.setupSubtitle}
        title={t.setupTitle}
      />

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader
              icon="file-pen"
              subtitle={t.projectDetailsHint}
              title={t.projectDetails}
            />
            <div className="mt-5 flex flex-col gap-5 border-t border-line px-6 pt-5 pb-6">
              <Field label={t.fieldTitle}>
                <input
                  className={inputClass}
                  name="title"
                  placeholder={t.fieldTitlePlaceholder}
                  required
                />
              </Field>
              <Field label={t.fieldProblem}>
                <textarea
                  className={inputClass}
                  name="problem"
                  placeholder={t.fieldProblemPlaceholder}
                  rows={4}
                />
              </Field>
              <Field label={t.fieldSolution}>
                <textarea
                  className={inputClass}
                  name="solution"
                  placeholder={t.fieldSolutionPlaceholder}
                  rows={5}
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label={t.fieldDemographic}>
                  <input
                    className={inputClass}
                    name="demographic"
                    placeholder={t.fieldDemographicPlaceholder}
                  />
                </Field>
                <Field label={t.fieldPhase}>
                  <div className="relative">
                    <select
                      className={`${inputClass} appearance-none pr-10 font-semibold`}
                      defaultValue={PHASE_KEYS[0]}
                      name="phase"
                    >
                      {PHASE_KEYS.map((phase) => (
                        <option key={phase} value={phase}>
                          {phaseLabel(phase, locale)}
                        </option>
                      ))}
                    </select>
                    <Icon
                      className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted"
                      name="chevron-down"
                      size={16}
                    />
                  </div>
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              action={
                <Button
                  icon="plus"
                  onClick={() =>
                    setFiles((prev) => [...prev, `attachment-${prev.length + 1}.pdf`])
                  }
                  size="sm"
                  tone="ghost"
                  type="button"
                >
                  {t.add}
                </Button>
              }
              icon="folder"
              subtitle={t.documentsHint}
              title={t.documents}
            />
            <div className="mt-5 border-t border-line px-6 pt-5 pb-6">
              <div className="flex flex-col items-center gap-2 rounded-md border border-dashed border-line-strong px-6 py-10 text-center">
                <Icon className="text-ink-faint" name="upload" size={28} />
                <p className="text-sm font-semibold text-ink">
                  {t.filePrompt}
                </p>
                <p className="text-xs text-ink-faint">
                  {t.fileHint}
                </p>
              </div>

              {files.length > 0 ? (
                <ul className="mt-4 flex flex-col gap-2">
                  {files.map((file) => (
                    <li
                      className="flex items-center gap-3 rounded-[0.5rem] border border-line px-4 py-3"
                      key={file}
                    >
                      <Icon className="text-navy" name="paperclip" size={17} />
                      <span className="flex-1 truncate text-sm text-ink">
                        {file}
                      </span>
                      <button
                        aria-label={t.removeFile(file)}
                        className="text-ink-faint hover:text-danger"
                        onClick={() =>
                          setFiles((prev) => prev.filter((f) => f !== file))
                        }
                        type="button"
                      >
                        <Icon name="x" size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </Card>
        </div>

        <Card className="h-fit xl:sticky xl:top-24">
          <div className="flex items-start justify-between gap-4 px-6 pt-6">
            <div>
              <h2 className="headline-md flex items-center gap-2 text-ink">
                <Icon className="text-navy" name="users" size={22} />
                {t.assembly}
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                {t.assemblyHint}
              </p>
            </div>
            <Tag tone="navy">{t.selectedCount(selected.length)}</Tag>
          </div>

          <ul className="mt-5 flex flex-col gap-2 border-t border-line px-3 py-4">
            {AGENTS.map((entry) => {
              const agent = localizedAgent(entry.id, locale);
              const on = selected.includes(agent.id);
              return (
                <li key={agent.id}>
                  <button
                    aria-pressed={on}
                    className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors ${
                      on
                        ? "border-line bg-card shadow-level1"
                        : "border-transparent bg-card-muted/60 hover:bg-card-muted"
                    }`}
                    onClick={() => toggle(agent.id)}
                    type="button"
                  >
                    <span
                      className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
                        on ? AGENT_TONES[agent.tone] : AGENT_TONES.muted
                      }`}
                    >
                      <Icon name={agent.icon} size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block font-bold ${on ? "text-ink" : "text-ink-muted"}`}
                      >
                        {agent.name}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                        {agent.blurb}
                      </span>
                    </span>
                    <span
                      className={`mt-1 flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${
                        on ? "bg-primary" : "bg-line-strong"
                      }`}
                    >
                      <span
                        className={`size-5 rounded-full bg-white transition-transform ${
                          on ? "translate-x-5" : ""
                        }`}
                      />
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-3 border-t border-line px-6 py-5">
            <Button
              className="w-full"
              disabled={selected.length === 0}
              icon="sparkles"
              type="submit"
            >
              {t.convene}
            </Button>
            <ButtonLink className="w-full" href="/council" tone="ghost">
              {t.cancel}
            </ButtonLink>
          </div>
        </Card>
      </div>
    </form>
  );
}
