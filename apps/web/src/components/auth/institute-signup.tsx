"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, cx } from "@/components/ui";
import { Field, FormError, SelectField } from "@/components/form";
import type { Institution, Taxonomy } from "@/lib/auth/registry";
import { WizardFrame } from "./chrome";
import { Steps } from "./steps";
import { useRegister } from "./use-register";

/**
 * Institute registration.
 *
 * Two steps — the administrator, then the institution — matching the government
 * and industry flows, because a reviewer cannot verify half an application. The
 * academic structure is asked for afterwards, in the wizard, where a registrar
 * can see what each department unlocks.
 *
 * The part worth reading is the claim. Six institutions are already on the
 * register because students pick their college from it during their own
 * onboarding, so a registrar from one of them must attach to the *existing*
 * organisation rather than create a second. Creating a second would split the
 * roster: the students who already named that college would sit under an
 * organisation nobody administers, and the new account would open on an empty
 * dashboard and conclude the product is broken.
 */

const STEPS = ["You", "Your institution"] as const;

export function InstituteSignupForm({
  taxonomy,
  institutions,
}: {
  taxonomy: Taxonomy;
  institutions: Institution[];
}) {
  const router = useRouter();
  const { submit, busy, error, fieldErrors } = useRegister("institute");
  const [step, setStep] = useState(1);

  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  const [claimOrgId, setClaimOrgId] = useState("new");
  const [institutionName, setInstitutionName] = useState("");
  const [shortName, setShortName] = useState("");
  const [institutionType, setInstitutionType] = useState("");
  const [aisheCode, setAisheCode] = useState("");
  const [website, setWebsite] = useState("");
  const [establishedYear, setEstablishedYear] = useState("");
  const [state, setState] = useState("Jharkhand");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  const districts = taxonomy.districtsByState[state] ?? [];
  const claimed = institutions.find((i) => i.id === claimOrgId) ?? null;

  /* The strongest automated signal a reviewer gets, shown live so the person
     can fix it now rather than wait a day to be told. An academic domain is
     issued through an accreditation process; a free provider proves nothing. */
  const emailHost = email.split("@")[1]?.toLowerCase() ?? "";
  const domainClass = useMemo(() => {
    if (!emailHost) return null;
    if (claimed?.emailDomains.some((d) => emailHost.endsWith(d))) return "registered";
    if (/\.(ac\.in|edu|edu\.in)$/.test(emailHost)) return "academic";
    if (/^(gmail|yahoo|outlook|hotmail|rediffmail|icloud|proton)\./.test(`${emailHost}.`))
      return "free";
    return "other";
  }, [emailHost, claimed]);

  const step1Valid =
    fullName.trim().length > 1 &&
    designation.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(email) &&
    /^\+?[0-9]{8,15}$/.test(phone.replace(/\s/g, "")) &&
    password.length >= 8 &&
    /[a-zA-Z]/.test(password) &&
    /[0-9]/.test(password);

  const step2Valid = claimed
    ? institutionType !== ""
    : institutionName.trim().length > 1 &&
      shortName.trim().length > 1 &&
      institutionType !== "" &&
      city.trim().length > 1;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const to = await submit({
      fullName,
      designation,
      email,
      phone: phone.replace(/\s/g, ""),
      password,
      claimOrgId: claimed ? claimed.id : undefined,
      institutionName: claimed ? claimed.name : institutionName,
      shortName: claimed ? claimed.shortName : shortName,
      institutionType,
      aisheCode: aisheCode || undefined,
      website: website || undefined,
      establishedYear: establishedYear ? Number(establishedYear) : undefined,
      state: claimed ? claimed.state : state,
      district: district || undefined,
      city: claimed ? claimed.city : city,
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
      brand="institute"
      onBack={step > 1 ? () => setStep(1) : undefined}
      title="Institute registration"
    >
      <div className="flex flex-col gap-7">
        <div>
          <h1 className="headline-xl text-ink">Register your institution</h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            Two steps now. Your departments, programmes and labs are asked for after approval —
            that is the structure every screen in the portal groups by, and it deserves its own
            sitting.
          </p>
        </div>

        <Steps current={step} steps={STEPS} />

        <form onSubmit={onSubmit}>
          {step === 1 ? (
            <Card className="flex flex-col gap-4 p-6">
              <Field
                autoComplete="name"
                error={fieldErrors.fullName}
                label="Your full name"
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dr. Sunita Bhengra"
                required
                value={fullName}
              />
              <Field
                error={fieldErrors.designation}
                hint="Your role at the institution — registrar, dean, training & placement officer."
                label="Designation"
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="Dean, Student Innovation & Outreach"
                required
                value={designation}
              />
              <Field
                autoComplete="email"
                error={fieldErrors.email}
                hint={
                  domainClass === "registered" ? (
                    <span className="flex items-center gap-1.5 font-semibold text-success">
                      <Icon name="check-circle" size={13} />
                      On a domain already registered to that institution — the strongest signal a
                      reviewer can get.
                    </span>
                  ) : domainClass === "academic" ? (
                    <span className="flex items-center gap-1.5 font-semibold text-success">
                      <Icon name="check-circle" size={13} />
                      An academic domain. This speeds up your review.
                    </span>
                  ) : domainClass === "free" ? (
                    <span className="flex items-center gap-1.5 font-semibold text-warning">
                      <Icon name="warning" size={13} />
                      A personal address proves nothing on its own. An institutional one gets you
                      reviewed faster.
                    </span>
                  ) : (
                    "Preferably your institution's own domain."
                  )
                }
                label="Official email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="registrar@yourinstitute.ac.in"
                required
                type="email"
                value={email}
              />
              <Field
                autoComplete="tel"
                error={fieldErrors.phone}
                label="Contact number"
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                required
                type="tel"
                value={phone}
              />
              <Field
                autoComplete="new-password"
                error={fieldErrors.password}
                hint="At least 8 characters, with a letter and a number."
                inputClassName="pr-12"
                label="Password"
                onChange={(e) => setPassword(e.target.value)}
                required
                type={show ? "text" : "password"}
                value={password}
              />
              <button
                className="-mt-2 self-end text-xs font-semibold text-navy"
                onClick={() => setShow((v) => !v)}
                type="button"
              >
                {show ? "Hide password" : "Show password"}
              </button>

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
          ) : (
            <Card className="flex flex-col gap-4 p-6">
              <SelectField
                hint="If your institution is already on the register — because your students picked it when they signed up — claim it rather than creating a second record."
                label="Your institution"
                onChange={(e) => setClaimOrgId(e.target.value)}
                options={[
                  { value: "new", label: "Not listed — register a new institution" },
                  ...institutions.map((i) => ({
                    value: i.id,
                    label: `${i.name} — ${i.city}, ${i.state}`,
                  })),
                ]}
                value={claimOrgId}
              />

              {claimed ? (
                <div className="rounded-lg bg-mint/15 p-4">
                  <p className="flex items-start gap-2 text-sm text-ink">
                    <Icon className="mt-0.5 shrink-0 text-success" name="check-circle" size={15} />
                    <span>
                      You are claiming <strong>{claimed.name}</strong>. Students who already named
                      it will appear on your roster the moment you are verified. A reviewer checks
                      the claim before anything is granted.
                    </span>
                  </p>
                </div>
              ) : (
                <>
                  <Field
                    error={fieldErrors.institutionName}
                    label="Institution name"
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="Birla Institute of Technology, Mesra"
                    required
                    value={institutionName}
                  />
                  <Field
                    error={fieldErrors.shortName}
                    hint="The acronym people actually use."
                    label="Short name"
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder="BIT Mesra"
                    required
                    value={shortName}
                  />
                </>
              )}

              <SelectField
                error={fieldErrors.institutionType}
                label="Type"
                onChange={(e) => setInstitutionType(e.target.value)}
                options={(taxonomy.institutionTypes ?? []).map((t) => ({
                  value: t.key,
                  label: t.label,
                }))}
                required
                value={institutionType}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  error={fieldErrors.aisheCode}
                  hint="Optional — ITIs and private training institutes routinely have none, and requiring one would lock out exactly the institutions this is built for."
                  label="AISHE / registration number"
                  onChange={(e) => setAisheCode(e.target.value)}
                  optional
                  value={aisheCode}
                />
                <Field
                  error={fieldErrors.establishedYear}
                  label="Year established"
                  max={new Date().getFullYear()}
                  min={1800}
                  onChange={(e) => setEstablishedYear(e.target.value)}
                  optional
                  type="number"
                  value={establishedYear}
                />
              </div>

              <Field
                error={fieldErrors.website}
                label="Website"
                onChange={(e) => setWebsite(e.target.value)}
                optional
                placeholder="https://yourinstitute.ac.in"
                type="url"
                value={website}
              />

              {claimed ? null : (
                <div className="grid gap-4 sm:grid-cols-2">
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
                    optional
                    options={districts.map((d) => ({ value: d, label: d }))}
                    value={district}
                  />
                  <Field
                    error={fieldErrors.city}
                    label="City"
                    onChange={(e) => setCity(e.target.value)}
                    required
                    value={city}
                  />
                  <Field
                    error={fieldErrors.pincode}
                    label="PIN code"
                    onChange={(e) => setPincode(e.target.value)}
                    optional
                    value={pincode}
                  />
                </div>
              )}

              <FormError>{error}</FormError>

              <div className="mt-2 flex flex-wrap gap-3">
                <Button
                  className={cx("flex-1")}
                  disabled={!step2Valid || busy}
                  size="lg"
                  type="submit"
                >
                  {busy ? "Registering…" : "Register the institution"}
                </Button>
                <Button onClick={() => setStep(1)} size="lg" tone="outline" type="button">
                  Back
                </Button>
              </div>

              <p className="flex items-start gap-2 rounded-md bg-card-muted px-4 py-3 text-xs leading-relaxed text-ink-muted">
                <Icon className="mt-0.5 shrink-0" name="shield" size={14} />
                <span>
                  An institution vouches for students and signs off their work, so the account is
                  reviewed by a person before it is granted. You can sign in while you wait and see
                  exactly where the review stands.
                </span>
              </p>
            </Card>
          )}
        </form>

        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link className="font-semibold text-navy hover:underline" href="/signin">
            Sign in
          </Link>
        </p>
      </div>
    </WizardFrame>
  );
}
