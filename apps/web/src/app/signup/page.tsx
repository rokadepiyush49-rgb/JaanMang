import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
import { Card, cx } from "@/components/ui";
import { AuthPage } from "@/components/auth/chrome";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Join Jan Setu as a student, an institution, a government authority or an industry partner.",
};

/**
 * The role picker.
 *
 * Four cards, using the same shape `/collaborate/new` uses for its innovation
 * goals — an icon tile, a name, and what selecting it actually means.
 *
 * Each card states its own cost up front: a student is in immediately, a
 * government or industry account waits for review. Telling someone that after
 * they have filled in eleven fields is how a signup flow earns a bad reputation.
 */
const CHOICES: {
  href: string;
  role: string;
  icon: IconName;
  wash: string;
  blurb: string;
  points: string[];
  wait: string;
  waitTone: "instant" | "review";
}[] = [
  {
    href: "/signup/student",
    role: "Student",
    icon: "graduation",
    wash: "bg-tint-mint text-on-tint-mint",
    blurb:
      "Browse validated civic challenges, form a team across campuses, apply to opportunities and build a verified record of what you actually shipped.",
    points: ["Challenges near you", "Team formation", "Impact record"],
    wait: "Start straight away",
    waitTone: "instant",
  },
  {
    href: "/signup/government",
    role: "Government",
    icon: "landmark",
    wash: "bg-tint-navy text-on-tint-navy",
    blurb:
      "Gram panchayat, nagar panchayat, municipal council or corporation, block and district administration — validate demand, rank it, route it, fund it and prove it was fixed.",
    points: ["Ranked demand", "Department routing", "Public ledger"],
    wait: "Verified before access",
    waitTone: "review",
  },
  {
    href: "/signup/institute",
    role: "Institute",
    icon: "book",
    wash: "bg-tint-blue text-on-tint-blue",
    blurb:
      "Universities, colleges, polytechnics, ITIs and training institutes. Manage your student roster, assign faculty guides to teams, and follow every project from a validated citizen problem through to a signed-off submission.",
    points: ["Student roster", "Faculty assignment", "Project to submission"],
    wait: "Verified before access",
    waitTone: "review",
  },
  {
    href: "/signup/industry",
    role: "Industry",
    icon: "factory",
    wash: "bg-tint-amber text-on-tint-amber",
    blurb:
      "Companies, MSMEs, PSUs and CSR trusts. Find government-validated challenges that match what you can genuinely bring — money is one of seven ways to carry one.",
    points: ["Explainable matches", "CSR ledger", "Student mentoring"],
    wait: "Verified before access",
    waitTone: "review",
  },
];

export default function SignUpPage() {
  return (
    <AuthPage
      footer={
        <p className="text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link className="font-semibold text-navy hover:underline" href="/signin">
            Sign in
          </Link>
        </p>
      }
      subtitle="Four audiences, one platform. Pick the one that describes you — it decides what you are asked for and where you land."
      title="Create an account"
      wide
    >
      <div className="flex flex-col gap-3">
        {CHOICES.map((c) => (
          <Link className="group block" href={c.href} key={c.href}>
            <Card className="p-5 transition-shadow duration-200 ease-jm group-hover:shadow-level3 sm:p-6">
              <div className="flex items-start gap-4">
                <span
                  className={cx(
                    "flex size-12 shrink-0 items-center justify-center rounded-[14px]",
                    c.wash,
                  )}
                >
                  <Icon name={c.icon} size={24} />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <h2 className="headline-md text-ink">{c.role}</h2>
                    <span
                      className={cx(
                        "rounded-full px-2.5 py-1 text-[11px] font-bold",
                        c.waitTone === "instant"
                          ? "bg-success-tint text-on-success-tint"
                          : "bg-warning-tint text-on-warning-tint",
                      )}
                    >
                      {c.wait}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">{c.blurb}</p>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {c.points.map((p) => (
                      <li
                        className="rounded-full bg-card-muted px-2.5 py-1 text-xs font-semibold text-ink-muted"
                        key={p}
                      >
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                <Icon
                  className="mt-3 hidden shrink-0 text-ink-faint transition-transform duration-200 ease-jm group-hover:translate-x-1 sm:block"
                  name="arrow-right"
                  size={20}
                />
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <p className="mt-5 flex items-start gap-2 rounded-md bg-card-muted px-4 py-3 text-xs leading-relaxed text-ink-muted">
        <Icon className="mt-0.5 shrink-0" name="shield" size={14} />
        <span>
          Government, institute and industry accounts hold authority over public money or over
          data about real people, so they are reviewed by a person before they are granted. You can
          sign in while you wait and see exactly where the review stands.
        </span>
      </p>
    </AuthPage>
  );
}
