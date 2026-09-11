"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
import { Card, cx } from "@/components/ui";
import { Reveal, Stagger, StaggerItem } from "./motion";

/**
 * Who it is for.
 *
 * Each card is written from that audience's point of view and lists what they
 * actually get, not what the platform does. The citizen card has no signup
 * link because citizens use the mobile app — saying so is better than a button
 * that leads nowhere.
 */
const AUDIENCES: {
  title: string;
  icon: IconName;
  wash: string;
  lead: string;
  gets: string[];
  href?: string;
  cta?: string;
  note?: string;
}[] = [
  {
    title: "Students",
    icon: "graduation",
    wash: "bg-tint-mint text-on-tint-mint",
    lead: "Real briefs instead of invented ones. Every challenge on the board is a problem a government body has already validated as real.",
    gets: [
      "Challenges ranked by how well they match your skills",
      "Teams formed across campuses, with faculty and industry mentors",
      "A verified record of outcomes, not a certificate of attendance",
      "An AI council that stress-tests your proposal before you commit to it",
    ],
    href: "/signup/student",
    cta: "Join as a student",
  },
  {
    title: "Government",
    icon: "landmark",
    wash: "bg-tint-navy text-on-tint-navy",
    lead: "From gram panchayat to district administration. See what your jurisdiction is actually asking for, ranked on evidence you can publish.",
    gets: [
      "Demand clustered and ranked across your whole jurisdiction",
      "Automatic routing to the department that owns the category",
      "Industry sponsorship invited first, with a funding fallback that fires on time",
      "Citizen verification closing the loop, and a public ledger of every rupee",
    ],
    href: "/signup/government",
    cta: "Register an authority",
  },
  {
    title: "Industry",
    icon: "factory",
    wash: "bg-tint-amber text-on-tint-amber",
    lead: "CSR that lands where it is needed, with a match score you can argue with and an outcome you can report against.",
    gets: [
      "Government-validated challenges matched on five weighted factors",
      "Every match decomposed into the profile fields that produced it",
      "Seven ways to contribute — funding is one of them",
      "A CSR ledger tied to milestones, so money follows delivery",
    ],
    href: "/signup/industry",
    cta: "Register a partner",
  },
  {
    title: "Citizens",
    icon: "users",
    wash: "bg-tint-orchid text-on-tint-orchid",
    lead: "Speak in your own language. No form, no category dropdown, no English requirement.",
    gets: [
      "Report by voice, text, photo or IVR",
      "See your report merged into a demand and ranked in public",
      "Confirm — or deny — that the work was actually done",
      "Follow the money for your village in the public ledger",
    ],
    note: "Citizens use the Jan Setu mobile app, not this portal.",
  },
];

export function Audiences() {
  return (
    <section className="px-5 py-20 sm:px-8 lg:py-28" id="audiences">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="label-caps text-ink-faint">Who it is for</p>
          <h2 className="headline-xl mt-3 max-w-3xl text-ink lg:text-[2.5rem] lg:leading-[1.15]">
            One platform, four vantage points on the same chain
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
            Each surface is designed around what its user is accountable for, not around a shared
            feature list.
          </p>
        </Reveal>

        <Stagger className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {AUDIENCES.map((a) => (
            <StaggerItem key={a.title}>
              <Card className="flex h-full flex-col p-6 sm:p-7">
                <div className="flex items-center gap-4">
                  <span
                    className={cx(
                      "flex size-12 shrink-0 items-center justify-center rounded-[14px]",
                      a.wash,
                    )}
                  >
                    <Icon name={a.icon} size={23} />
                  </span>
                  <h3 className="headline-lg text-ink">{a.title}</h3>
                </div>

                <p className="mt-4 text-base leading-relaxed text-ink-muted">{a.lead}</p>

                <ul className="mt-5 flex flex-col gap-2.5">
                  {a.gets.map((g) => (
                    <li className="flex items-start gap-2.5 text-sm text-ink" key={g}>
                      <Icon className="mt-0.5 shrink-0 text-mint" name="check" size={15} />
                      {g}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 pt-1">
                  {a.href ? (
                    <Link
                      className={cx(
                        "inline-flex h-11 items-center gap-2 rounded-full bg-card-muted px-5 text-sm font-bold text-ink",
                        "ring-1 ring-line transition-colors duration-150 ease-jm",
                        "hover:bg-primary hover:text-white hover:ring-primary",
                      )}
                      href={a.href}
                    >
                      {a.cta}
                      <Icon name="arrow-right" size={16} />
                    </Link>
                  ) : (
                    <p className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
                      <Icon name="help" size={14} />
                      {a.note}
                    </p>
                  )}
                </div>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
