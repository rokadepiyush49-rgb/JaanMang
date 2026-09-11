"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card } from "@/components/ui";
import { Field, FormError, SelectField } from "@/components/form";
import type { Taxonomy } from "@/lib/auth/registry";
import { WizardFrame } from "./chrome";
import { Steps } from "./steps";
import { useRegister } from "./use-register";

const STEPS = ["You", "Your organisation"] as const;

export function IndustrySignupForm({ taxonomy }: { taxonomy: Taxonomy }) {
  const router = useRouter();
  const { submit, busy, error, fieldErrors } = useRegister("industry");
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [orgSize, setOrgSize] = useState("");
  const [sector, setSector] = useState("");
  const [website, setWebsite] = useState("");
  const [state, setState] = useState("Jharkhand");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  const districts = taxonomy.districtsByState[state] ?? [];

  const step1Valid =
    fullName.trim().length > 1 &&
    designation.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(email) &&
    /^\+?[0-9]{8,15}$/.test(phone.replace(/\s/g, "")) &&
    password.length >= 8;

  const step2Valid =
    companyName.trim().length > 1 &&
    legalName.trim().length > 1 &&
    orgSize !== "" &&
    sector !== "" &&
    /^https?:\/\/.+\..+/.test(website) &&
    city.trim().length > 1;

  /* The strongest automated signal a reviewer gets: a work email on the same
     domain as the declared website. Shown live so the person can fix it now
     rather than wait a day to be told. */
  const emailHost = email.split("@")[1]?.toLowerCase() ?? "";
  let siteHost = "";
  try {
    siteHost = new URL(website).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    siteHost = "";
  }
  const domainsMatch = Boolean(emailHost && siteHost) && emailHost.endsWith(siteHost.split(".").slice(-3).join("."));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const to = await submit({
      fullName,
      designation,
      email,
      phone: phone.replace(/\s/g, ""),
      password,
      companyName,
      legalName,
      orgSize,
      sector,
      website,
      state,
      city,
      district: district || undefined,
      pincode: pincode || undefined,
    });
    if (to) {
      router.replace(to);
      router.refresh();
    }
  }

  return (
    <WizardFrame
      backHref={step === 1 ? "/signup" : undefined}
      brand="industry"
      onBack={step > 1 ? () => setStep(1) : undefined}
      title="Industry registration"
    >
      <div className="flex flex-col gap-7">
        <div>
          <h1 className="headline-xl text-ink">Register as an industry partner</h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            Two steps now. What you want to fund, where, and what you can build is asked after
            approval — that is the profile the match engine reads, and it deserves its own sitting.
          </p>
        </div>

        <Steps current={step} steps={STEPS} />

        <form onSubmit={onSubmit}>
          {step === 1 ? (
            <Card className="p-6 sm:p-7">
              <h2 className="headline-lg text-ink">Who is signing in</h2>
              <p className="mt-1.5 text-sm text-ink-muted">
                Your designation decides what you can approve. A finance controller signing off a
                commitment and an engineer approving a technical milestone are different rights.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  autoComplete="name"
                  error={fieldErrors.fullName}
                  label="Full name"
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Rakesh Sinha"
                  required
                  value={fullName}
                />
                <Field
                  error={fieldErrors.designation}
                  label="Designation"
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Head of CSR & Sustainability"
                  required
                  value={designation}
                />
                <Field
                  autoComplete="email"
                  error={fieldErrors.email}
                  hint="Must be on your company's own domain."
                  icon="mail"
                  label="Work email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.co.in"
                  required
                  type="email"
                  value={email}
                />
                <Field
                  autoComplete="tel"
                  error={fieldErrors.phone}
                  label="Phone"
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98300 11223"
                  required
                  type="tel"
                  value={phone}
                />
                <div className="relative sm:col-span-2">
                  <Field
                    autoComplete="new-password"
                    inputClassName="pr-12"
                    error={fieldErrors.password}
                    hint="At least 8 characters, with a letter and a number."
                    icon="lock"
                    label="Password"
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    type={show ? "text" : "password"}
                    value={password}
                  />
                  <button
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute top-[2.05rem] right-3 flex size-8 items-center justify-center rounded-full text-ink-muted hover:bg-card-muted"
                    onClick={() => setShow((v) => !v)}
                    type="button"
                  >
                    <Icon name={show ? "eye-off" : "eye"} size={17} />
                  </button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-6 sm:p-7">
              <h2 className="headline-lg text-ink">Your organisation</h2>
              <p className="mt-1.5 text-sm text-ink-muted">
                The organisation is a separate record from your login, so colleagues can be added
                to it later without registering the company twice.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  error={fieldErrors.companyName}
                  hint="How you are known."
                  label="Company name"
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Nirvaha Technologies"
                  required
                  value={companyName}
                />
                <Field
                  error={fieldErrors.legalName}
                  hint="Appears on every funding commitment."
                  label="Registered legal name"
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Nirvaha Technologies Ltd."
                  required
                  value={legalName}
                />
                <SelectField
                  error={fieldErrors.orgSize}
                  label="Organisation type"
                  onChange={(e) => setOrgSize(e.target.value)}
                  options={taxonomy.orgSizes.map((o) => ({ value: o.key, label: o.label }))}
                  placeholder="Select…"
                  required
                  value={orgSize}
                />
                <SelectField
                  error={fieldErrors.sector}
                  label="Industry sector"
                  onChange={(e) => setSector(e.target.value)}
                  options={taxonomy.sectors.map((s) => ({ value: s, label: s }))}
                  placeholder="Select…"
                  required
                  value={sector}
                />
                <Field
                  className="sm:col-span-2"
                  error={fieldErrors.website}
                  hint={
                    website && email ? (
                      <span
                        className={
                          domainsMatch ? "font-semibold text-success" : "font-semibold text-warning"
                        }
                      >
                        {domainsMatch
                          ? `Your email is on ${siteHost} — that verifies automatically.`
                          : `Your email domain (${emailHost || "—"}) does not match ${siteHost || "the site"}, so this needs a manual check.`}
                      </span>
                    ) : (
                      "The strongest verification signal we have."
                    )
                  }
                  label="Website"
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://company.co.in"
                  required
                  type="url"
                  value={website}
                />

                <SelectField
                  hint="This is the geography the match engine scores against."
                  label="Headquarters state"
                  onChange={(e) => {
                    setState(e.target.value);
                    setDistrict("");
                  }}
                  options={taxonomy.states.map((s) => ({ value: s, label: s }))}
                  required
                  value={state}
                />
                <Field
                  error={fieldErrors.city}
                  label="Headquarters city"
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Jamshedpur"
                  required
                  value={city}
                />
                <SelectField
                  label="District"
                  onChange={(e) => setDistrict(e.target.value)}
                  optional
                  options={districts.map((d) => ({ value: d, label: d }))}
                  placeholder={districts.length ? "Select…" : "Not listed"}
                  value={district}
                />
                <Field
                  inputMode="numeric"
                  label="Pincode"
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  optional
                  placeholder="831001"
                  value={pincode}
                />
              </div>

              <p className="mt-5 flex items-start gap-2 rounded-md bg-card-muted px-3.5 py-3 text-xs leading-relaxed text-ink-muted">
                <Icon className="mt-0.5 shrink-0" name="map-pin" size={14} />
                <span>
                  Branches, plants and regional offices come next, as their own rows — never as one
                  line of text — so the portal can later tell you which of your sites is nearest a
                  challenge.
                </span>
              </p>

              <FormError>{error}</FormError>
            </Card>
          )}

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-6">
            {step === 1 ? (
              <Link className="text-sm font-semibold text-ink-muted hover:text-ink" href="/signup">
                Choose a different account type
              </Link>
            ) : (
              <Button onClick={() => setStep(1)} tone="ghost" type="button">
                Back
              </Button>
            )}

            {step === 1 ? (
              <Button
                disabled={!step1Valid}
                iconAfter="arrow-right"
                onClick={() => setStep(2)}
                type="button"
              >
                Continue
              </Button>
            ) : (
              <Button disabled={busy || !step2Valid} type="submit">
                {busy ? "Submitting…" : "Submit for verification"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </WizardFrame>
  );
}
