import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { Icon } from "@/components/icon";
import { ButtonLink, Card, cx } from "@/components/ui";
import { AuthLockup } from "@/components/auth/chrome";
import { SignOutButton } from "@/components/auth/sign-out";
import { requireSession } from "@/lib/auth/guard";
import { destinationFor } from "@/lib/auth/destination";

export const metadata: Metadata = { title: "Awaiting verification" };

/**
 * The waiting room.
 *
 * "Pending" with no detail is indistinguishable from "broken", so this page
 * names what was submitted, which automated checks passed, and what happens
 * next. The automated signals are shown to the applicant as well as the
 * reviewer — someone whose work email does not match their website can fix
 * that now instead of finding out in a day.
 */
type Verification = {
  status: "pending" | "verified" | "rejected" | "info_requested";
  requestedRoleKey: string | null;
  organisation: { name: string; type: string; designation: string } | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reason: string | null;
  signals: Record<string, unknown>;
};

const ROLE_LABEL: Record<string, string> = {
  gov_panchayat: "Panchayat Secretary",
  gov_urban_body: "Urban Local Body Officer",
  gov_block: "Block Development Officer",
  gov_district: "District Administration",
  gov_field_officer: "Delivery Officer",
  institute_admin: "Institute — registrar / administrator",
  industry_admin: "Industry partner — primary contact",
  industry_user: "Industry partner",
};

export default async function PendingPage() {
  const session = await requireSession();
  // An approved account has no reason to sit here.
  if (session.status !== "pending") redirect(destinationFor(session));

  const backend = process.env.BACKEND_API_URL ?? "http://localhost:4000";
  const token = (await cookies()).get("js_at")?.value;
  const res = await fetch(`${backend}/api/v1/auth/verification`, {
    headers: { authorization: `Bearer ${token ?? ""}` },
    cache: "no-store",
  }).catch(() => null);
  const v = (res?.ok ? await res.json() : null) as Verification | null;

  const checks = signalChecks(v?.signals ?? {});
  const isIndustry = session.surface === "industry";
  const isInstitute = session.surface === "institute";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col justify-center px-5 py-12 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <AuthLockup
          brand={
            session.surface === "gov"
              ? "gov"
              : session.surface === "institute"
                ? "institute"
                : "industry"
          }
        />
        <SignOutButton />
      </div>

      <Card className="p-6 sm:p-8">
        <span className="flex size-12 items-center justify-center rounded-[14px] bg-warning-tint text-on-warning-tint">
          <Icon name="clock" size={24} />
        </span>

        <h1 className="headline-xl mt-5 text-ink">Awaiting verification</h1>
        <p className="mt-2 text-base leading-relaxed text-ink-muted">
          Your account exists and you are signed in, but the workspace stays closed until a
          reviewer approves it. Accounts that can approve public funding or read data about real
          people are not granted by a form.
        </p>

        <dl className="mt-7 divide-y divide-line border-y border-line">
          <Row label="Signed in as" value={`${session.displayName} · ${session.email ?? ""}`} />
          {v?.organisation ? (
            <Row label="Organisation" value={v.organisation.name} />
          ) : null}
          {v?.organisation?.designation ? (
            <Row label="Designation" value={v.organisation.designation} />
          ) : null}
          {v?.requestedRoleKey ? (
            <Row
              label="Access requested"
              value={ROLE_LABEL[v.requestedRoleKey] ?? v.requestedRoleKey}
            />
          ) : null}
          {v?.submittedAt ? (
            <Row
              label="Submitted"
              value={new Date(v.submittedAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            />
          ) : null}
        </dl>

        {checks.length ? (
          <div className="mt-6">
            <p className="label-caps mb-3 text-ink-faint">Automated checks</p>
            <ul className="flex flex-col gap-2">
              {checks.map((c) => (
                <li className="flex items-start gap-2.5 text-sm" key={c.label}>
                  <span
                    className={cx(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                      c.ok
                        ? "bg-success-tint text-on-success-tint"
                        : "bg-warning-tint text-on-warning-tint",
                    )}
                  >
                    <Icon name={c.ok ? "check" : "minus"} size={12} />
                  </span>
                  <span className={c.ok ? "text-ink-muted" : "text-ink"}>{c.label}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-muted">
              A check that has not passed does not mean a refusal — it means a person reads that
              part rather than the server confirming it.
            </p>
          </div>
        ) : null}

        {v?.reason ? (
          <p className="mt-6 rounded-md bg-critical/10 px-4 py-3 text-sm text-critical">
            <span className="font-semibold">Reviewer note: </span>
            {v.reason}
          </p>
        ) : null}

        {isIndustry ? (
          <div className="mt-7 rounded-md bg-navy-soft p-4">
            <p className="text-sm font-semibold text-on-tint-navy">
              You can use the wait productively
            </p>
            <p className="mt-1 text-sm leading-relaxed text-on-tint-navy/85">
              Fill in your match profile now — CSR themes, geographies, technologies and funding
              range — and Discover has ranked, explainable matches waiting the minute you are
              approved.
            </p>
            <ButtonLink className="mt-3" href="/onboarding/industry" size="sm">
              Set up the match profile
            </ButtonLink>
          </div>
        ) : null}

        {isInstitute ? (
          <div className="mt-7 rounded-md bg-navy-soft p-4">
            <p className="text-sm font-semibold text-on-tint-navy">
              You can use the wait productively
            </p>
            <p className="mt-1 text-sm leading-relaxed text-on-tint-navy/85">
              Draw your departments and programmes now. Every screen in the portal groups by
              department, so doing it while you wait is the difference between opening on a
              working dashboard and opening on an empty one.
            </p>
            <ButtonLink className="mt-3" href="/onboarding/institute" size="sm">
              Set up the academic structure
            </ButtonLink>
          </div>
        ) : null}

        <p className="mt-7 text-xs leading-relaxed text-ink-muted">
          Reviews are usually same-day. If something above is wrong, sign out and register again
          with the correct details, or write to{" "}
          <Link className="font-semibold text-navy hover:underline" href="mailto:verify@jansetu.local">
            verify@jansetu.local
          </Link>
          .
        </p>
      </Card>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

/** Turns the recorded signals into sentences an applicant can act on. */
function signalChecks(signals: Record<string, unknown>): { label: string; ok: boolean }[] {
  const out: { label: string; ok: boolean }[] = [];

  if ("emailDomainClass" in signals) {
    const cls = String(signals.emailDomainClass);
    // Government registration records "official"; institute registration
    // records "academic". Both mean the same thing — the domain itself is
    // evidence — and neither should be described in the other's words.
    const label: Record<string, string> = {
      official: "Your email is on a government domain (.gov.in / .nic.in)",
      academic: "Your email is on an academic domain (.ac.in / .edu)",
      institutional: "Your email is on an organisational domain, which a reviewer will check",
      free: "Your email is with a free provider, so it proves nothing on its own",
    };
    out.push({
      label:
        label[cls] ??
        "Your email domain is not one the server recognises, so it is checked by hand",
      ok: cls === "official" || cls === "academic",
    });
  }
  if ("matchesRegisteredDomain" in signals) {
    out.push({
      label: signals.matchesRegisteredDomain
        ? "Your email is on a domain already registered to that institution"
        : "Your email is not on a domain registered to that institution",
      ok: Boolean(signals.matchesRegisteredDomain),
    });
  }
  if ("claimedExistingOrg" in signals) {
    out.push({
      label: signals.claimedExistingOrg
        ? "You are claiming an institution already on the register, so its students join your roster"
        : "A new institution — nothing on the register matched, so it is created fresh",
      // Neither is a problem; a claim simply gives the reviewer more to check.
      ok: true,
    });
  }
  if ("aisheCodeProvided" in signals) {
    out.push({
      label: signals.aisheCodeProvided
        ? "An AISHE / registration number was provided"
        : "No AISHE number — not required, but it speeds up review",
      ok: Boolean(signals.aisheCodeProvided),
    });
  }
  if ("lgdCodeProvided" in signals) {
    out.push({
      label: signals.lgdCodeProvided
        ? "An LGD code was provided"
        : "No LGD code — not required, but it speeds up review",
      ok: Boolean(signals.lgdCodeProvided),
    });
  }
  if ("jurisdictionResolved" in signals) {
    out.push({
      label: signals.jurisdictionResolved
        ? "Your body maps to a known jurisdiction"
        : "Your body is not mapped yet — a reviewer will attach it",
      ok: Boolean(signals.jurisdictionResolved),
    });
  }
  if ("websiteMatchesEmail" in signals) {
    out.push({
      label: signals.websiteMatchesEmail
        ? "Your work email is on the same domain as your website"
        : "Your work email is not on your website's domain, so ownership is checked by hand",
      ok: Boolean(signals.websiteMatchesEmail),
    });
  }
  if ("freeEmailProvider" in signals && signals.freeEmailProvider) {
    out.push({ label: "A free email provider was used, which proves nothing on its own", ok: false });
  }
  const dupes = signals.duplicateOrgIds;
  if (Array.isArray(dupes)) {
    out.push({
      label: dupes.length
        ? "Another registration exists for this organisation — a reviewer will merge or refuse"
        : "No duplicate registration found",
      ok: dupes.length === 0,
    });
  }
  return out;
}

export const dynamic = "force-dynamic";
