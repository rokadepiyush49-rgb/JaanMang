"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, cx } from "@/components/ui";
import { Field, FormError, SelectField, TagField, TextareaField } from "@/components/form";
import type { Taxonomy } from "@/lib/auth/registry";
import { WizardFrame } from "./chrome";
import { Steps } from "./steps";

/**
 * The institute wizard.
 *
 * Departments are required and programmes are not, and the reason is worth
 * being explicit about: every screen in the portal keys on a department — the
 * roster, the team assignment, the analytics — while a programme is only ever a
 * label on a student. An institution with no departments has a dashboard that
 * cannot group anything.
 *
 * `emailDomains` is the one field here that does real work later. It is what
 * lets the roster say "this student's address is on your domain" instead of
 * asking a registrar to confirm six hundred people by hand.
 */

const STEPS = ["Departments", "Programmes", "Your institution"] as const;

type Program = { name: string; level: string; durationYears: string; intake: string };
type Department = { name: string; code: string; programs: Program[] };

const emptyProgram = (): Program => ({
  name: "",
  level: "undergraduate",
  durationYears: "4",
  intake: "",
});

export function InstituteOnboardingForm({ taxonomy }: { taxonomy: Taxonomy }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [departments, setDepartments] = useState<Department[]>([
    { name: "", code: "", programs: [] },
  ]);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [labs, setLabs] = useState<string[]>([]);
  const [emailDomains, setEmailDomains] = useState<string[]>([]);
  const [accreditation, setAccreditation] = useState("");
  const [about, setAbout] = useState("");

  const levels = (taxonomy.programLevels ?? []).map((l) => ({ value: l.key, label: l.label }));

  const filled = departments.filter((d) => d.name.trim().length > 1 && d.code.trim().length > 0);
  const codes = filled.map((d) => d.code.trim().toUpperCase());
  const duplicateCode = new Set(codes).size !== codes.length;
  const step1Valid = filled.length > 0 && !duplicateCode;

  function setDepartment(i: number, patch: Partial<Department>) {
    setDepartments((ds) => ds.map((d, j) => (i === j ? { ...d, ...patch } : d)));
  }

  function setProgram(di: number, pi: number, patch: Partial<Program>) {
    setDepartments((ds) =>
      ds.map((d, j) =>
        j === di
          ? { ...d, programs: d.programs.map((p, k) => (k === pi ? { ...p, ...patch } : p)) }
          : d,
      ),
    );
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/backend/auth/onboarding/institute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          departments: filled.map((d) => ({
            name: d.name.trim(),
            code: d.code.trim().toUpperCase(),
            programs: d.programs
              .filter((p) => p.name.trim().length > 1)
              .map((p) => ({
                name: p.name.trim(),
                level: p.level,
                durationYears: Number(p.durationYears) || 1,
                intake: p.intake ? Number(p.intake) : undefined,
              })),
          })),
          focusAreas,
          labs,
          emailDomains,
          accreditation: accreditation.trim() || undefined,
          about: about.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const problem = (await res.json().catch(() => ({}))) as { detail?: string };
        setError(problem.detail ?? "Could not save that. Check the fields and try again.");
        return;
      }
      router.replace("/institute");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WizardFrame brand="institute" title="Set up your institution">
      <div className="flex flex-col gap-7">
        <div>
          <h1 className="headline-xl text-ink">Draw your academic structure</h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            Your roster, your teams and every figure in Reports are grouped by department, so this
            is the one thing the portal cannot open without. Programmes and the rest can be added
            later from inside.
          </p>
        </div>

        <Steps current={step} steps={STEPS} />

        {/* ---------------------------------------------- departments --- */}
        {step === 1 ? (
          <Card className="flex flex-col gap-4 p-6">
            {departments.map((d, i) => (
              <div className="flex flex-wrap items-end gap-3" key={i}>
                <Field
                  className="min-w-0 flex-1 basis-64"
                  label={i === 0 ? "Department name" : ""}
                  onChange={(e) => setDepartment(i, { name: e.target.value })}
                  placeholder="Computer Science & Engineering"
                  value={d.name}
                />
                <Field
                  className="basis-28"
                  label={i === 0 ? "Code" : ""}
                  maxLength={16}
                  onChange={(e) => setDepartment(i, { code: e.target.value.toUpperCase() })}
                  placeholder="CSE"
                  value={d.code}
                />
                {departments.length > 1 ? (
                  <button
                    aria-label={`Remove department ${i + 1}`}
                    className="mb-0.5 flex size-12 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-critical-tint hover:text-on-critical-tint"
                    onClick={() => setDepartments((ds) => ds.filter((_, j) => j !== i))}
                    type="button"
                  >
                    <Icon name="x" size={18} />
                  </button>
                ) : null}
              </div>
            ))}

            {duplicateCode ? (
              <p className="flex items-center gap-2 text-xs font-semibold text-critical">
                <Icon name="warning" size={13} />
                Two departments share the same code.
              </p>
            ) : null}

            <Button
              className="self-start"
              icon="plus"
              onClick={() =>
                setDepartments((ds) => [...ds, { name: "", code: "", programs: [] }])
              }
              size="sm"
              tone="outline"
              type="button"
            >
              Add another department
            </Button>

            <Button
              className="mt-2"
              disabled={!step1Valid}
              onClick={() => setStep(2)}
              size="lg"
              type="button"
            >
              Continue
            </Button>
          </Card>
        ) : null}

        {/* ------------------------------------------------ programmes --- */}
        {step === 2 ? (
          <Card className="flex flex-col gap-6 p-6">
            <p className="text-sm text-ink-muted">
              Optional. A programme is a label on a student — useful for reporting, not required to
              run a team. You can add them later from Departments & Programmes.
            </p>

            {filled.map((d, di) => {
              const index = departments.indexOf(d);
              return (
                <div className="flex flex-col gap-3 border-t border-line pt-5 first:border-0 first:pt-0" key={di}>
                  <p className="font-bold text-ink">
                    {d.name} <span className="text-ink-faint">· {d.code.toUpperCase()}</span>
                  </p>

                  {d.programs.map((p, pi) => (
                    <div className="flex flex-wrap items-end gap-3" key={pi}>
                      <Field
                        className="min-w-0 flex-1 basis-56"
                        label={pi === 0 ? "Programme" : ""}
                        onChange={(e) => setProgram(index, pi, { name: e.target.value })}
                        placeholder="B.Tech Computer Science & Engineering"
                        value={p.name}
                      />
                      <SelectField
                        className="basis-44"
                        label={pi === 0 ? "Level" : ""}
                        onChange={(e) => setProgram(index, pi, { level: e.target.value })}
                        options={levels}
                        value={p.level}
                      />
                      <Field
                        className="basis-24"
                        label={pi === 0 ? "Years" : ""}
                        max={8}
                        min={1}
                        onChange={(e) => setProgram(index, pi, { durationYears: e.target.value })}
                        type="number"
                        value={p.durationYears}
                      />
                      <Field
                        className="basis-24"
                        label={pi === 0 ? "Seats" : ""}
                        min={1}
                        onChange={(e) => setProgram(index, pi, { intake: e.target.value })}
                        type="number"
                        value={p.intake}
                      />
                      <button
                        aria-label={`Remove programme ${pi + 1}`}
                        className="mb-0.5 flex size-12 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-critical-tint hover:text-on-critical-tint"
                        onClick={() =>
                          setDepartment(index, {
                            programs: d.programs.filter((_, k) => k !== pi),
                          })
                        }
                        type="button"
                      >
                        <Icon name="x" size={18} />
                      </button>
                    </div>
                  ))}

                  <Button
                    className="self-start"
                    icon="plus"
                    onClick={() =>
                      setDepartment(index, { programs: [...d.programs, emptyProgram()] })
                    }
                    size="sm"
                    tone="ghost"
                    type="button"
                  >
                    Add a programme
                  </Button>
                </div>
              );
            })}

            <div className="flex flex-wrap gap-3">
              <Button className="flex-1" onClick={() => setStep(3)} size="lg" type="button">
                Continue
              </Button>
              <Button onClick={() => setStep(1)} size="lg" tone="outline" type="button">
                Back
              </Button>
            </div>
          </Card>
        ) : null}

        {/* ------------------------------------------- the institution --- */}
        {step === 3 ? (
          <Card className="flex flex-col gap-4 p-6">
            <TagField
              hint="A student signing up with an address on one of these is automatically flagged as yours on the roster — which is the difference between confirming six hundred people by hand and confirming the exceptions. Domain only, no @."
              label="Email domains"
              max={10}
              onChange={setEmailDomains}
              optional
              placeholder="bitmesra.ac.in"
              suggestions={[]}
              value={emailDomains}
            />

            <TagField
              hint="What your departments are strong in. Industry partners search on these."
              label="Focus areas"
              max={20}
              onChange={setFocusAreas}
              optional
              suggestions={taxonomy.technologyDomains ?? []}
              value={focusAreas}
            />

            <TagField
              hint="Facilities a partner could actually use — a lab, a workshop, a test rig."
              label="Labs and facilities"
              max={30}
              onChange={setLabs}
              optional
              suggestions={[]}
              value={labs}
            />

            <Field
              label="Accreditation"
              onChange={(e) => setAccreditation(e.target.value)}
              optional
              placeholder="NAAC A+ · Deemed University"
              value={accreditation}
            />

            <TextareaField
              hint="Shown to industry partners and government bodies looking for a collaborator."
              label="About your institution"
              onChange={(e) => setAbout(e.target.value)}
              optional
              rows={4}
              value={about}
            />

            <FormError>{error}</FormError>

            <div className={cx("mt-2 flex flex-wrap gap-3")}>
              <Button className="flex-1" disabled={busy} onClick={finish} size="lg" type="button">
                {busy ? "Setting up…" : "Open my portal"}
              </Button>
              <Button onClick={() => setStep(2)} size="lg" tone="outline" type="button">
                Back
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
    </WizardFrame>
  );
}
