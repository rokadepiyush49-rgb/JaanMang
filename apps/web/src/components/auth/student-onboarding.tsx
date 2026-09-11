"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, cx } from "@/components/ui";
import { ChipField, Field, FormError, SelectField, TagField } from "@/components/form";
import type { Institution, Taxonomy } from "@/lib/auth/registry";
import { WizardFrame } from "./chrome";
import { Steps } from "./steps";

const STEPS = ["Education", "Location", "Skills"] as const;

const YEARS = [1, 2, 3, 4, 5, 6];

/**
 * Each step says what it turns on.
 *
 * A wizard that just asks is a wizard people abandon; one that shows the
 * consequence of each answer is one they finish. These are not marketing
 * claims — each is literally the screen that reads the field.
 */
const WHY: Record<number, { icon: Parameters<typeof Icon>[0]["name"]; text: string }> = {
  1: {
    icon: "users",
    text: "Your college and branch are how teams find you on Team Formation, and how faculty and industry mentors are matched to your work.",
  },
  2: {
    icon: "map-pin",
    text: "Your district is what puts nearby challenges and opportunities at the top of the list instead of ones four hours away.",
  },
  3: {
    icon: "target",
    text: "Skills are what the match percentage on every opportunity is computed from. Three is enough to start; the list keeps learning from what you actually deliver.",
  },
};

export function StudentOnboarding({
  taxonomy,
  institutions,
  firstName,
}: {
  taxonomy: Taxonomy;
  institutions: Institution[];
  firstName: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orgId, setOrgId] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [degree, setDegree] = useState("");
  const [branch, setBranch] = useState("");
  const [currentYear, setCurrentYear] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [enrollmentNo, setEnrollmentNo] = useState("");

  const [state, setState] = useState("Jharkhand");
  const [district, setDistrict] = useState("");
  const [phone, setPhone] = useState("");

  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);

  const districts = taxonomy.districtsByState[state] ?? [];
  const notListed = orgId === "__other";

  /* Graduation year is derived from the year of study rather than asked for
     twice — it stays editable because diplomas, integrated degrees and a
     dropped year all break the arithmetic. */
  function pickYear(value: string) {
    setCurrentYear(value);
    const n = Number(value);
    if (!Number.isNaN(n) && !graduationYear) {
      const typical = degree.startsWith("M") || degree === "MBA" || degree === "MCA" ? 2 : 4;
      setGraduationYear(String(new Date().getFullYear() + Math.max(0, typical - n) + 1));
    }
  }

  const step1Valid =
    (orgId !== "" || institutionName.trim().length > 1) &&
    (!notListed || institutionName.trim().length > 1) &&
    degree !== "" &&
    branch !== "" &&
    currentYear !== "" &&
    graduationYear !== "";
  const step2Valid = state !== "" && district !== "";
  const step3Valid = skills.length >= 3;

  async function save(skip: boolean) {
    setBusy(true);
    setError(null);
    try {
      const chosen = institutions.find((i) => i.id === orgId);
      const res = await fetch("/api/backend/auth/onboarding/student", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orgId: chosen?.id ?? null,
          institutionName: chosen?.name ?? institutionName,
          degree,
          branch,
          currentYear: Number(currentYear),
          graduationYear: Number(graduationYear),
          enrollmentNo: enrollmentNo || undefined,
          state,
          district,
          skills: skip ? [] : skills,
          interests: skip ? [] : interests,
          phone: phone ? phone.replace(/\s/g, "") : undefined,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        setError(body.detail ?? "Could not save your profile.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const why = WHY[step];

  return (
    <WizardFrame
      brand="student"
      onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
      title="Set up your profile"
    >
      <div className="flex flex-col gap-7">
        <div>
          <h1 className="headline-xl text-ink">
            <span className="font-medium">Welcome,</span>{" "}
            <span className="font-bold">{firstName}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            Three short steps. Everything here is something a screen actually uses — nothing is
            collected to fill a database column.
          </p>
        </div>

        <Steps current={step} steps={STEPS} />

        <Card className="p-6 sm:p-7">
          {step === 1 ? (
            <>
              <h2 className="headline-lg text-ink">Where you study</h2>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  className="sm:col-span-2"
                  label="Institution"
                  onChange={(e) => {
                    setOrgId(e.target.value);
                    if (e.target.value !== "__other") setInstitutionName("");
                  }}
                  options={[
                    ...institutions.map((i) => ({ value: i.id, label: `${i.name} · ${i.city}` })),
                    { value: "__other", label: "My institution is not listed" },
                  ]}
                  placeholder="Select your college or university…"
                  required
                  value={orgId}
                />
                {notListed ? (
                  <Field
                    className="sm:col-span-2"
                    hint="A reviewer adds it to the register, and your profile links to it automatically."
                    label="Institution name"
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="Full name of your college"
                    required
                    value={institutionName}
                  />
                ) : null}

                <SelectField
                  label="Degree"
                  onChange={(e) => setDegree(e.target.value)}
                  options={taxonomy.degrees.map((d) => ({ value: d, label: d }))}
                  placeholder="Select…"
                  required
                  value={degree}
                />
                <SelectField
                  label="Branch or department"
                  onChange={(e) => setBranch(e.target.value)}
                  options={taxonomy.branches.map((b) => ({ value: b, label: b }))}
                  placeholder="Select…"
                  required
                  value={branch}
                />
                <SelectField
                  label="Current year"
                  onChange={(e) => pickYear(e.target.value)}
                  options={YEARS.map((y) => ({ value: String(y), label: `Year ${y}` }))}
                  placeholder="Select…"
                  required
                  value={currentYear}
                />
                <SelectField
                  hint="Filled in from your year — change it if that is wrong."
                  label="Graduating in"
                  onChange={(e) => setGraduationYear(e.target.value)}
                  options={Array.from({ length: 9 }, (_, i) => {
                    const y = new Date().getFullYear() + i - 1;
                    return { value: String(y), label: String(y) };
                  })}
                  placeholder="Select…"
                  required
                  value={graduationYear}
                />
                <Field
                  className="sm:col-span-2"
                  hint="Only ever used as evidence if your institution verifies you."
                  label="Enrolment number"
                  onChange={(e) => setEnrollmentNo(e.target.value)}
                  optional
                  placeholder="BTECH/10234/26"
                  value={enrollmentNo}
                />
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h2 className="headline-lg text-ink">Where you are</h2>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="State"
                  onChange={(e) => {
                    setState(e.target.value);
                    setDistrict("");
                  }}
                  options={taxonomy.states.map((s) => ({ value: s, label: s }))}
                  required
                  value={state}
                />
                <SelectField
                  label="District"
                  onChange={(e) => setDistrict(e.target.value)}
                  options={districts.map((d) => ({ value: d, label: d }))}
                  placeholder={districts.length ? "Select…" : "Not listed"}
                  required
                  value={district}
                />
                <Field
                  className="sm:col-span-2"
                  hint="For deadline reminders and team invitations. Nothing else."
                  label="Phone"
                  onChange={(e) => setPhone(e.target.value)}
                  optional
                  placeholder="+91 98765 43210"
                  type="tel"
                  value={phone}
                />
              </div>
              <p className="mt-5 text-xs leading-relaxed text-ink-muted">
                We do not ask for your street address, your pincode or your date of birth. No screen
                in this product reads any of them.
              </p>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <h2 className="headline-lg text-ink">What you can do</h2>
              <div className="mt-6 flex flex-col gap-6">
                <TagField
                  error={
                    skills.length > 0 && skills.length < 3
                      ? `Add ${3 - skills.length} more to get matched.`
                      : undefined
                  }
                  hint="At least three. Pick from the suggestions or type your own and press Enter."
                  label="Skills"
                  max={20}
                  onChange={setSkills}
                  suggestions={taxonomy.skills}
                  value={skills}
                />
                <ChipField
                  hint="Used to sort what shows up first on your dashboard."
                  label="Interests"
                  onToggle={(v) =>
                    setInterests((prev) =>
                      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
                    )
                  }
                  optional
                  options={taxonomy.interests.map((i) => ({ value: i, label: i }))}
                  selected={interests}
                />
              </div>
            </>
          ) : null}

          {why ? (
            <p
              className={cx(
                "mt-6 flex items-start gap-2.5 rounded-md bg-navy-soft px-4 py-3",
                "text-xs leading-relaxed text-on-tint-navy",
              )}
            >
              <Icon className="mt-0.5 shrink-0" name={why.icon} size={15} />
              <span>{why.text}</span>
            </p>
          ) : null}

          <FormError>{error}</FormError>
        </Card>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-6">
          {step > 1 ? (
            <Button onClick={() => setStep((s) => s - 1)} tone="ghost" type="button">
              Back
            </Button>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-3">
            {step === 3 ? (
              <>
                <Button disabled={busy} onClick={() => void save(true)} tone="ghost" type="button">
                  Skip for now
                </Button>
                <Button disabled={busy || !step3Valid} onClick={() => void save(false)} type="button">
                  {busy ? "Saving…" : "Finish"}
                </Button>
              </>
            ) : (
              <Button
                disabled={step === 1 ? !step1Valid : !step2Valid}
                iconAfter="arrow-right"
                onClick={() => setStep((s) => s + 1)}
                type="button"
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </div>
    </WizardFrame>
  );
}
