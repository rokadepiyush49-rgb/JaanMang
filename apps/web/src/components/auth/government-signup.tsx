"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icon";
import { Button, Card, cx } from "@/components/ui";
import { ChipField, Field, FormError, SelectField } from "@/components/form";
import type { JurisdictionNode, Taxonomy } from "@/lib/auth/registry";
import { WizardFrame } from "./chrome";
import { Steps } from "./steps";
import { useRegister } from "./use-register";

const STEPS = ["You", "Your authority", "Review"] as const;

/** Which access levels make sense for which kind of body. */
const LEVELS_FOR: Record<string, string[]> = {
  gram_panchayat: ["gov_panchayat", "gov_field_officer"],
  nagar_panchayat: ["gov_urban_body", "gov_field_officer"],
  municipal_council: ["gov_urban_body", "gov_field_officer"],
  municipal_corporation: ["gov_urban_body", "gov_district", "gov_field_officer"],
  block_office: ["gov_block", "gov_field_officer"],
  district_office: ["gov_district", "gov_field_officer"],
  line_department: ["gov_field_officer", "gov_block"],
  other: ["gov_field_officer"],
};

export function GovernmentSignupForm({
  taxonomy,
  jurisdictions,
  departments,
}: {
  taxonomy: Taxonomy;
  jurisdictions: JurisdictionNode[];
  departments: { id: string; name: string; shortName: string }[];
}) {
  const router = useRouter();
  const { submit, busy, error, fieldErrors } = useRegister("government");
  const [step, setStep] = useState(1);

  // Step 1 — the person.
  const [fullName, setFullName] = useState("");
  const [designation, setDesignation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);

  // Step 2 — the authority.
  const [bodyType, setBodyType] = useState("");
  const [state, setState] = useState("Jharkhand");
  const [district, setDistrict] = useState("");
  const [block, setBlock] = useState("");
  const [bodyName, setBodyName] = useState("");
  const [lgdCode, setLgdCode] = useState("");
  const [jurisdictionId, setJurisdictionId] = useState("");
  const [requestedRoleKey, setRequestedRoleKey] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [pincode, setPincode] = useState("");

  const districts = taxonomy.districtsByState[state] ?? [];

  /* The jurisdiction tree is filtered down as the person narrows their
     location — the id they end up with is what `ScopeService` expands into
     everything this account will ever be able to see. */
  const blocks = useMemo(
    () => jurisdictions.filter((j) => j.level === "block"),
    [jurisdictions],
  );
  const localBodies = useMemo(() => {
    const parent = blocks.find((b) => b.name === block);
    return jurisdictions.filter(
      (j) =>
        (j.level === "panchayat" || j.level === "ulb") &&
        (parent ? j.parentId === parent.id : true),
    );
  }, [jurisdictions, blocks, block]);

  const levelOptions = (LEVELS_FOR[bodyType] ?? []).flatMap((key) => {
    const found = taxonomy.govAccessLevels.find((l) => l.key === key);
    return found ? [{ value: found.key, label: found.label, detail: found.detail }] : [];
  });

  const needsDepartment = requestedRoleKey === "gov_field_officer";

  const step1Valid =
    fullName.trim().length > 1 &&
    designation.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(email) &&
    /^\+?[0-9]{8,15}$/.test(phone.replace(/\s/g, "")) &&
    password.length >= 8;

  const step2Valid =
    bodyType !== "" &&
    state !== "" &&
    district !== "" &&
    bodyName.trim().length > 1 &&
    requestedRoleKey !== "" &&
    (!needsDepartment || departmentId !== "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const to = await submit({
      fullName,
      designation,
      email,
      phone: phone.replace(/\s/g, ""),
      password,
      bodyType,
      bodyName,
      state,
      district,
      block: block || undefined,
      lgdCode: lgdCode || undefined,
      jurisdictionId: jurisdictionId || null,
      requestedRoleKey,
      departmentId: needsDepartment ? departmentId : null,
      officeAddress: officeAddress || undefined,
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
      brand="gov"
      onBack={step > 1 ? () => setStep((s) => s - 1) : undefined}
      title="Government registration"
    >
      <div className="flex flex-col gap-7">
        <div>
          <h1 className="headline-xl text-ink">Register a government authority</h1>
          <p className="mt-2 max-w-2xl text-base text-ink-muted">
            Your jurisdiction decides what this account can see and approve, so it is the one
            thing worth getting exactly right.
          </p>
        </div>

        <Steps current={step} steps={STEPS} />

        <form onSubmit={onSubmit}>
          {step === 1 ? (
            <Card className="p-6 sm:p-7">
              <h2 className="headline-lg text-ink">Who is signing in</h2>
              <p className="mt-1.5 text-sm text-ink-muted">
                This is your personal login. The authority itself is the next step — they are
                separate records, so a colleague can be added later without registering the body
                again.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field
                  autoComplete="name"
                  error={fieldErrors.fullName}
                  label="Full name"
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Shri Devendra Munda"
                  required
                  value={fullName}
                />
                <Field
                  error={fieldErrors.designation}
                  hint="Your official post — the reviewer's main evidence of authority."
                  label="Designation"
                  onChange={(e) => setDesignation(e.target.value)}
                  placeholder="Panchayat Secretary"
                  required
                  value={designation}
                />
                <Field
                  autoComplete="email"
                  error={fieldErrors.email}
                  hint="A .gov.in or .nic.in address is verified far faster."
                  icon="mail"
                  label="Official email"
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@jharkhand.gov.in"
                  required
                  type="email"
                  value={email}
                />
                <Field
                  autoComplete="tel"
                  error={fieldErrors.phone}
                  label="Official phone"
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 94311 02218"
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
          ) : null}

          {step === 2 ? (
            <div className="flex flex-col gap-4">
              <Card className="p-6 sm:p-7">
                <h2 className="headline-lg text-ink">The authority</h2>
                <p className="mt-1.5 text-sm text-ink-muted">
                  Rural and urban bodies are both supported — a gram panchayat and a municipal
                  corporation sit at different points in the same tree.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <SelectField
                    error={fieldErrors.bodyType}
                    label="Type of authority"
                    onChange={(e) => {
                      setBodyType(e.target.value);
                      setRequestedRoleKey("");
                    }}
                    options={taxonomy.govBodyTypes.map((t) => ({ value: t.key, label: t.label }))}
                    placeholder="Select the type…"
                    required
                    value={bodyType}
                  />
                  <Field
                    error={fieldErrors.bodyName}
                    label="Authority name"
                    onChange={(e) => setBodyName(e.target.value)}
                    placeholder="Nagri Gram Panchayat"
                    required
                    value={bodyName}
                  />

                  <SelectField
                    label="State"
                    onChange={(e) => {
                      setState(e.target.value);
                      setDistrict("");
                      setBlock("");
                      setJurisdictionId("");
                    }}
                    options={taxonomy.states.map((s) => ({ value: s, label: s }))}
                    required
                    value={state}
                  />
                  <SelectField
                    error={fieldErrors.district}
                    label="District"
                    onChange={(e) => {
                      setDistrict(e.target.value);
                      setBlock("");
                      setJurisdictionId("");
                    }}
                    options={districts.map((d) => ({ value: d, label: d }))}
                    placeholder={districts.length ? "Select a district…" : "No districts listed"}
                    required
                    value={district}
                  />

                  <SelectField
                    hint="Leave blank for a district-level body."
                    label="Block / Taluka"
                    onChange={(e) => {
                      setBlock(e.target.value);
                      setJurisdictionId("");
                    }}
                    optional
                    options={blocks.map((b) => ({ value: b.name, label: b.name }))}
                    placeholder="Select a block…"
                    value={block}
                  />
                  <SelectField
                    hint="Linking to a mapped body is what scopes what you can see. If yours is not listed, a reviewer will attach it."
                    label="Mapped jurisdiction"
                    onChange={(e) => setJurisdictionId(e.target.value)}
                    optional
                    options={localBodies.map((j) => ({ value: j.id, label: j.name }))}
                    placeholder={
                      localBodies.length ? "Select your body…" : "None mapped yet — that is fine"
                    }
                    value={jurisdictionId}
                  />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Field
                    error={fieldErrors.lgdCode}
                    hint="Local Government Directory code."
                    inputMode="numeric"
                    label="LGD code"
                    onChange={(e) => setLgdCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    optional
                    placeholder="123456"
                    value={lgdCode}
                  />
                  <Field
                    label="Office address"
                    onChange={(e) => setOfficeAddress(e.target.value)}
                    optional
                    placeholder="Panchayat Bhawan, Nagri"
                    value={officeAddress}
                  />
                  <Field
                    error={fieldErrors.pincode}
                    inputMode="numeric"
                    label="Pincode"
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    optional
                    placeholder="835303"
                    value={pincode}
                  />
                </div>

                <p className="mt-3 flex items-start gap-2 rounded-md bg-card-muted px-3.5 py-3 text-xs leading-relaxed text-ink-muted">
                  <Icon className="mt-0.5 shrink-0" name="help" size={14} />
                  <span>
                    The LGD code is optional because most units on this platform still carry a null
                    one — the LGD-to-Census crosswalk has not been built, and the product says so
                    rather than pretending otherwise. Providing it speeds up review; leaving it out
                    blocks nothing.
                  </span>
                </p>
              </Card>

              <Card className="p-6 sm:p-7">
                <h2 className="headline-lg text-ink">Access you are requesting</h2>
                <p className="mt-1.5 text-sm text-ink-muted">
                  A request, not a grant. A reviewer decides what is actually issued, and may issue
                  less than you ask for.
                </p>

                <div className="mt-5">
                  {bodyType ? (
                    <ChipField
                      columns
                      error={fieldErrors.requestedRoleKey}
                      label="Access level"
                      onToggle={(v) => setRequestedRoleKey(v === requestedRoleKey ? "" : v)}
                      options={levelOptions}
                      selected={requestedRoleKey ? [requestedRoleKey] : []}
                    />
                  ) : (
                    <p className="rounded-md bg-card-muted px-4 py-3 text-sm text-ink-muted">
                      Choose a type of authority above and the levels available to it appear here.
                    </p>
                  )}
                </div>

                {needsDepartment ? (
                  <div className="mt-5">
                    <SelectField
                      error={fieldErrors.departmentId}
                      hint="Delivery officers are assigned work from one department's queue."
                      label="Department"
                      onChange={(e) => setDepartmentId(e.target.value)}
                      options={departments.map((d) => ({ value: d.id, label: d.name }))}
                      placeholder="Select a department…"
                      required
                      value={departmentId}
                    />
                  </div>
                ) : null}
              </Card>
            </div>
          ) : null}

          {step === 3 ? (
            <Card className="p-6 sm:p-7">
              <h2 className="headline-lg text-ink">Check and submit</h2>
              <p className="mt-1.5 text-sm text-ink-muted">
                A reviewer reads exactly this. Anything wrong here is a round trip.
              </p>

              <dl className="mt-6 divide-y divide-line">
                <ReviewRow label="Name" value={fullName} />
                <ReviewRow label="Designation" value={designation} />
                <ReviewRow label="Official email" value={email} />
                <ReviewRow label="Official phone" value={phone} />
                <ReviewRow
                  label="Authority"
                  value={`${bodyName} · ${
                    taxonomy.govBodyTypes.find((t) => t.key === bodyType)?.label ?? bodyType
                  }`}
                />
                <ReviewRow
                  label="Location"
                  value={[block, district, state].filter(Boolean).join(" · ")}
                />
                <ReviewRow
                  label="Mapped jurisdiction"
                  muted={!jurisdictionId}
                  value={
                    localBodies.find((j) => j.id === jurisdictionId)?.name ??
                    "Not mapped — a reviewer will attach it"
                  }
                />
                <ReviewRow label="LGD code" muted={!lgdCode} value={lgdCode || "Not provided"} />
                <ReviewRow
                  label="Access requested"
                  value={
                    taxonomy.govAccessLevels.find((l) => l.key === requestedRoleKey)?.label ?? "—"
                  }
                />
                {needsDepartment ? (
                  <ReviewRow
                    label="Department"
                    value={departments.find((d) => d.id === departmentId)?.name ?? "—"}
                  />
                ) : null}
              </dl>

              <p className="mt-5 flex items-start gap-2 rounded-md bg-warning-tint px-4 py-3 text-xs leading-relaxed text-on-warning-tint">
                <Icon className="mt-0.5 shrink-0" name="clock" size={14} />
                <span>
                  Your account is created immediately and can sign in, but the workspace stays
                  closed until a reviewer approves it. You will see exactly where the review stands.
                </span>
              </p>

              <FormError>{error}</FormError>
            </Card>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-line pt-6">
            {step === 1 ? (
              <Link className="text-sm font-semibold text-ink-muted hover:text-ink" href="/signup">
                Choose a different account type
              </Link>
            ) : (
              <Button onClick={() => setStep((s) => s - 1)} tone="ghost" type="button">
                Back
              </Button>
            )}

            {step < 3 ? (
              <Button
                disabled={step === 1 ? !step1Valid : !step2Valid}
                iconAfter="arrow-right"
                onClick={() => setStep((s) => s + 1)}
                type="button"
              >
                Continue
              </Button>
            ) : (
              <Button disabled={busy} type="submit">
                {busy ? "Submitting…" : "Submit for verification"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </WizardFrame>
  );
}

function ReviewRow({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-2.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className={cx("text-sm font-semibold", muted ? "text-ink-faint" : "text-ink")}>
        {value || "—"}
      </dd>
    </div>
  );
}
