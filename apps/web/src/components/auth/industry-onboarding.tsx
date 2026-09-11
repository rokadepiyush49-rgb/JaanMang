"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, cx } from "@/components/ui";
import { ChipField, Field, FormError, SelectField } from "@/components/form";
import type { Taxonomy } from "@/lib/auth/registry";
import { WizardFrame } from "./chrome";
import { Steps } from "./steps";

const STEPS = ["What you fund", "What you bring", "Where you are", "CSR budget"] as const;

type Branch = {
  kind: "branch" | "plant" | "office";
  label: string;
  state: string;
  district: string;
  city: string;
  pincode: string;
};

const EMPTY_BRANCH: Branch = {
  kind: "branch",
  label: "",
  state: "Jharkhand",
  district: "",
  city: "",
  pincode: "",
};

const LAKH = 100000;

/**
 * The match profile.
 *
 * The weights shown against each step are the real ones from the match engine:
 * CSR theme 25, technical capability 25, geography 20, funding range 15,
 * deployment capability 15. Showing them is the point — a partner who knows
 * which field moves their matches will keep that field current, and one who
 * does not will never touch this screen again.
 */
export function IndustryOnboarding({
  taxonomy,
  companyName,
  homeState,
  pending,
}: {
  taxonomy: Taxonomy;
  companyName: string;
  homeState: string;
  pending: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [csrThemes, setCsrThemes] = useState<string[]>([]);
  const [geographies, setGeographies] = useState<string[]>([homeState]);
  const [fundingMin, setFundingMin] = useState("1.5");
  const [fundingMax, setFundingMax] = useState("25");

  const [technologyDomains, setTechnologyDomains] = useState<string[]>([]);
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [sdgPreferences, setSdgPreferences] = useState<string[]>([]);
  const [employeeCount, setEmployeeCount] = useState("");
  const [yearEstablished, setYearEstablished] = useState("");

  const [branches, setBranches] = useState<Branch[]>([]);

  const [csrFinancialYear, setCsrFinancialYear] = useState("");
  const [csrAllocated, setCsrAllocated] = useState("");
  const [csrPreferredCeiling, setCsrPreferredCeiling] = useState("");

  const min = Number(fundingMin) * LAKH;
  const max = Number(fundingMax) * LAKH;
  const rangeValid = Number.isFinite(min) && Number.isFinite(max) && max >= min && min >= 0;
  const step1Valid = csrThemes.length > 0 && geographies.length > 0 && rangeValid;

  function toggle(setter: (fn: (prev: string[]) => string[]) => void) {
    return (v: string) =>
      setter((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  function patchBranch(i: number, patch: Partial<Branch>) {
    setBranches((prev) => prev.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/backend/auth/onboarding/industry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          csrThemes,
          geographies,
          fundingMin: Math.round(min),
          fundingMax: Math.round(max),
          technologyDomains,
          capabilities,
          sdgPreferences: sdgPreferences.map(Number),
          employeeCount: employeeCount ? Number(employeeCount) : undefined,
          yearEstablished: yearEstablished ? Number(yearEstablished) : undefined,
          branches: branches
            .filter((b) => b.city.trim() && b.state)
            .map((b) => ({
              kind: b.kind,
              label: b.label || undefined,
              state: b.state,
              district: b.district || undefined,
              city: b.city,
              pincode: b.pincode || undefined,
            })),
          csrFinancialYear: csrFinancialYear || undefined,
          csrAllocated: csrAllocated ? Number(csrAllocated) * LAKH : undefined,
          csrPreferredCeiling: csrPreferredCeiling ? Number(csrPreferredCeiling) * LAKH : undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        setError(body.detail ?? "Could not save the profile.");
        return;
      }
      router.replace(pending ? "/pending" : "/industry");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WizardFrame
      brand="industry"
      onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
      title="Match profile"
    >
      <div className="flex flex-col gap-7">
        <div>
          <h1 className="headline-xl text-ink">What {companyName} is looking for</h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            This profile is a control on discovery, not a description. Every field below moves the
            match score on challenges you are shown — the weights are printed beside each one.
          </p>
        </div>

        <Steps current={step} steps={STEPS} />

        {step === 1 ? (
          <Card className="p-6 sm:p-7">
            <Weighted points={60} title="What you fund" />
            <div className="mt-6 flex flex-col gap-6">
              <ChipField
                hint="25 of 100 match points. A challenge outside every theme you name scores zero here."
                label="CSR themes"
                onToggle={toggle(setCsrThemes)}
                options={taxonomy.csrDomains.map((d) => ({ value: d.key, label: d.label }))}
                selected={csrThemes}
              />
              <ChipField
                hint="20 points. States you are registered to spend and deploy in. A neighbouring state scores partial credit and says so."
                label="Geographies"
                onToggle={toggle(setGeographies)}
                options={taxonomy.states.map((s) => ({ value: s, label: s }))}
                selected={geographies}
              />
              <div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field
                    hint="In lakhs."
                    inputMode="decimal"
                    label="Smallest project you review"
                    onChange={(e) => setFundingMin(e.target.value)}
                    value={fundingMin}
                  />
                  <Field
                    error={rangeValid ? undefined : "The maximum must be at least the minimum."}
                    hint="In lakhs. A larger challenge is not refused — it is offered as a co-funded one."
                    inputMode="decimal"
                    label="Largest project you review"
                    onChange={(e) => setFundingMax(e.target.value)}
                    value={fundingMax}
                  />
                </div>
                <p className="mt-2 text-xs text-ink-muted">
                  15 points. Currently ₹{fundingMin} L – ₹{fundingMax} L.
                </p>
              </div>
            </div>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card className="p-6 sm:p-7">
            <Weighted points={40} title="What you bring" />
            <div className="mt-6 flex flex-col gap-6">
              <ChipField
                hint="25 points. Claiming a domain you cannot staff produces matches you will decline, so keep this narrower than the marketing list."
                label="Technology domains"
                onToggle={toggle(setTechnologyDomains)}
                options={taxonomy.technologyDomains.map((t) => ({ value: t, label: t }))}
                selected={technologyDomains}
              />
              <ChipField
                hint="15 points. What you can actually put behind a build and a handover."
                label="Deployment capabilities"
                onToggle={toggle(setCapabilities)}
                options={taxonomy.capabilities.map((c) => ({ value: c.key, label: c.label }))}
                selected={capabilities}
              />
              <ChipField
                hint="A small tie-breaker, and what your CSR report is written against."
                label="SDGs you report on"
                onToggle={toggle(setSdgPreferences)}
                optional
                options={taxonomy.sdgs.map((s) => ({
                  value: String(s.number),
                  label: `${s.number} · ${s.short}`,
                }))}
                selected={sdgPreferences}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  inputMode="numeric"
                  label="Employees"
                  onChange={(e) => setEmployeeCount(e.target.value.replace(/\D/g, ""))}
                  optional
                  placeholder="2140"
                  value={employeeCount}
                />
                <Field
                  inputMode="numeric"
                  label="Year established"
                  onChange={(e) => setYearEstablished(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  optional
                  placeholder="2004"
                  value={yearEstablished}
                />
              </div>
            </div>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card className="p-6 sm:p-7">
            <h2 className="headline-lg text-ink">Your sites</h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              Your headquarters is already recorded. Add plants, branches and regional offices as
              their own rows — that is what later lets the portal tell you which of your sites is
              nearest a challenge, and lets you report impact per location.
            </p>

            <div className="mt-6 flex flex-col gap-4">
              {branches.map((b, i) => (
                <div className="rounded-md bg-card-muted p-4 ring-1 ring-line" key={i}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="label-caps text-ink-faint">Site {i + 1}</p>
                    <button
                      className="flex items-center gap-1.5 text-xs font-semibold text-critical hover:underline"
                      onClick={() => setBranches((prev) => prev.filter((_, x) => x !== i))}
                      type="button"
                    >
                      <Icon name="x" size={13} />
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <SelectField
                      label="Type"
                      onChange={(e) => patchBranch(i, { kind: e.target.value as Branch["kind"] })}
                      options={[
                        { value: "branch", label: "Branch" },
                        { value: "plant", label: "Plant / works" },
                        { value: "office", label: "Office" },
                      ]}
                      value={b.kind}
                    />
                    <Field
                      label="Name"
                      onChange={(e) => patchBranch(i, { label: e.target.value })}
                      optional
                      placeholder="Bokaro works"
                      value={b.label}
                    />
                    <SelectField
                      label="State"
                      onChange={(e) => patchBranch(i, { state: e.target.value, district: "" })}
                      options={taxonomy.states.map((s) => ({ value: s, label: s }))}
                      value={b.state}
                    />
                    <Field
                      label="City"
                      onChange={(e) => patchBranch(i, { city: e.target.value })}
                      placeholder="Bokaro"
                      required
                      value={b.city}
                    />
                    <SelectField
                      label="District"
                      onChange={(e) => patchBranch(i, { district: e.target.value })}
                      optional
                      options={(taxonomy.districtsByState[b.state] ?? []).map((d) => ({
                        value: d,
                        label: d,
                      }))}
                      placeholder="Not listed"
                      value={b.district}
                    />
                    <Field
                      inputMode="numeric"
                      label="Pincode"
                      onChange={(e) =>
                        patchBranch(i, { pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })
                      }
                      optional
                      placeholder="827001"
                      value={b.pincode}
                    />
                  </div>
                </div>
              ))}

              <button
                className={cx(
                  "flex items-center justify-center gap-2 rounded-md border border-dashed border-line-strong px-4 py-4",
                  "text-sm font-semibold text-ink-muted transition-colors hover:border-primary hover:text-ink",
                )}
                disabled={branches.length >= 25}
                onClick={() => setBranches((prev) => [...prev, { ...EMPTY_BRANCH }])}
                type="button"
              >
                <Icon name="plus" size={17} />
                Add a site
              </button>

              {branches.length === 0 ? (
                <p className="text-xs text-ink-muted">
                  No branches is a perfectly valid answer — skip straight on.
                </p>
              ) : null}
            </div>
          </Card>
        ) : null}

        {step === 4 ? (
          <Card className="p-6 sm:p-7">
            <h2 className="headline-lg text-ink">CSR budget</h2>
            <p className="mt-1.5 text-sm text-ink-muted">
              Optional, and only relevant if you carry a CSR obligation. It drives the ledger on
              the CSR screen; the platform only ever accounts for its own share of it.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field
                label="Financial year"
                onChange={(e) => setCsrFinancialYear(e.target.value)}
                optional
                placeholder="FY 2026–27"
                value={csrFinancialYear}
              />
              <Field
                hint="In lakhs."
                inputMode="decimal"
                label="Allocated"
                onChange={(e) => setCsrAllocated(e.target.value)}
                optional
                placeholder="120"
                value={csrAllocated}
              />
              <Field
                hint="In lakhs. The largest single project your board pre-approved."
                inputMode="decimal"
                label="Project ceiling"
                onChange={(e) => setCsrPreferredCeiling(e.target.value)}
                optional
                placeholder="25"
                value={csrPreferredCeiling}
              />
            </div>

            {pending ? (
              <p className="mt-6 flex items-start gap-2 rounded-md bg-warning-tint px-4 py-3 text-xs leading-relaxed text-on-warning-tint">
                <Icon className="mt-0.5 shrink-0" name="clock" size={14} />
                <span>
                  Your account is still awaiting verification. Saving this now means the portal is
                  useful from the first minute you are approved.
                </span>
              </p>
            ) : null}

            <FormError>{error}</FormError>
          </Card>
        ) : null}

        <div className="flex items-center justify-between gap-3 border-t border-line pt-6">
          {step > 1 ? (
            <Button onClick={() => setStep((s) => s - 1)} tone="ghost" type="button">
              Back
            </Button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-3">
            {step >= 3 ? (
              <Button disabled={busy} onClick={() => void save()} tone={step === 4 ? undefined : "outline"} type="button">
                {busy ? "Saving…" : step === 4 ? "Finish" : "Save and finish"}
              </Button>
            ) : null}
            {step < 4 ? (
              <Button
                disabled={step === 1 && !step1Valid}
                iconAfter="arrow-right"
                onClick={() => setStep((s) => s + 1)}
                type="button"
              >
                Continue
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </WizardFrame>
  );
}

function Weighted({ title, points }: { title: string; points: number }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <h2 className="headline-lg text-ink">{title}</h2>
      <span className="rounded-full bg-primary-fixed px-2.5 py-1 text-[11px] font-bold text-on-primary-fixed-variant">
        {points} of 100 match points
      </span>
    </div>
  );
}
