"use client";

import { useState } from "react";
import { Icon, type IconName } from "@/components/icon";
import { Card, cx } from "@/components/ui";
import { Reveal, motion } from "./motion";
import { useReducedMotion } from "motion/react";

const EASE = [0.215, 0.61, 0.355, 1] as const;

/**
 * The seven stages, in full.
 *
 * Each one names who acts, what it produces, and — where it matters — the rule
 * that stops it being gamed. This is the section that has to do real work: a
 * visitor who reads only this should be able to explain the product to someone
 * else.
 */
const STAGES: {
  n: string;
  title: string;
  actor: string;
  icon: IconName;
  wash: string;
  body: string;
  guard?: string;
}[] = [
  {
    n: "01",
    title: "Speak",
    actor: "Citizen",
    icon: "message",
    wash: "bg-tint-navy text-on-tint-navy",
    body: "A resident reports a need in their own language — by voice, text, photo, IVR, or to a field worker. No form, no category dropdown, no English requirement.",
    guard: "The conversation is never stored. Only a confirmed report outlives it.",
  },
  {
    n: "02",
    title: "Analyse",
    actor: "AI",
    icon: "sparkles",
    wash: "bg-tint-blue text-on-tint-blue",
    body: "The model reads the utterance and produces structure: category, severity, how many people are affected, how long it has gone on — each with its confidence, each shown beside the original words.",
    guard: "The verbatim quote stays visible, so an officer can always check the reading against what was said.",
  },
  {
    n: "03",
    title: "Cluster",
    actor: "System",
    icon: "users",
    wash: "bg-tint-orchid text-on-tint-orchid",
    body: "Reports about the same thing are merged into one demand carrying the weight of all of them. Forty handpump reports become one demand affecting forty households, not forty tickets.",
    guard: "Duplicates are counted, never discarded — the count is the evidence of scale.",
  },
  {
    n: "04",
    title: "Prioritise",
    actor: "Priority engine",
    icon: "scale",
    wash: "bg-tint-mint text-on-tint-mint",
    body: "Every demand is scored against every other demand in the district on seven normalised signals — population affected, severity, deprivation, existing coverage, duration, recurrence and repeated demand.",
    guard: "Deprivation is weighted in deliberately, so the ranking cannot become a popularity contest.",
  },
  {
    n: "05",
    title: "Fund",
    actor: "Government + industry",
    icon: "banknote",
    wash: "bg-tint-amber text-on-tint-amber",
    body: "Matched industry partners are invited first; if no partner commits inside the response window, the government funding fallback fires automatically. Every rupee lands in a public ledger.",
    guard: "Money is one of seven contributions. Mentoring, technology, testing and deployment count too.",
  },
  {
    n: "06",
    title: "Execute",
    actor: "Officers + student teams",
    icon: "clipboard",
    wash: "bg-tint-clay text-on-tint-clay",
    body: "Work is routed to the department that owns the category, assigned to an officer with capacity, and delivered against milestones — often by a student team with an industry mentor in the design reviews.",
  },
  {
    n: "07",
    title: "Verify",
    actor: "Citizen",
    icon: "thumbs-up",
    wash: "bg-tint-mint text-on-tint-mint",
    body: "The people who reported it are asked whether it was actually fixed. Their answer, not the office's, closes the demand and marks the ledger entry verified.",
    guard: "An office cannot mark its own work done.",
  },
];

export function Flow() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(0);

  return (
    <section className="bg-surface-dim/50 px-5 py-20 sm:px-8 lg:py-28" id="flow">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="label-caps text-ink-faint">How it works</p>
          <h2 className="headline-xl mt-3 max-w-3xl text-ink lg:text-[2.5rem] lg:leading-[1.15]">
            One chain, from a person speaking to a person confirming
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
            Seven stages. Nothing skips a link, and every link is visible to the people it
            affects.
          </p>
        </Reveal>

        <div className="mt-10 grid grid-cols-1 gap-3">
          {STAGES.map((s, i) => {
            const on = open === i;
            return (
              <motion.div
                initial={reduced ? false : { y: 14 }}
                key={s.n}
                transition={{ duration: 0.45, delay: i * 0.05, ease: EASE }}
                viewport={{ once: true, margin: "-60px" }}
                whileInView={reduced ? undefined : { y: 0 }}
              >
                <Card
                  className={cx(
                    "overflow-hidden p-0 transition-shadow duration-200 ease-jm",
                    on && "shadow-level3",
                  )}
                >
                  <button
                    aria-expanded={on}
                    className="flex w-full items-center gap-4 p-5 text-left sm:gap-5 sm:p-6"
                    onClick={() => setOpen(on ? -1 : i)}
                    type="button"
                  >
                    <span
                      className={cx(
                        "flex size-12 shrink-0 items-center justify-center rounded-[14px]",
                        s.wash,
                      )}
                    >
                      <Icon name={s.icon} size={23} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="mono-data text-xs font-bold text-ink-faint">{s.n}</span>
                        <span className="headline-md text-ink">{s.title}</span>
                        <span className="rounded-full bg-card-muted px-2.5 py-0.5 text-[11px] font-bold text-ink-muted">
                          {s.actor}
                        </span>
                      </span>
                      {!on ? (
                        <span className="mt-1 block truncate text-sm text-ink-muted">{s.body}</span>
                      ) : null}
                    </span>

                    <Icon
                      className={cx(
                        "shrink-0 text-ink-muted transition-transform duration-200 ease-jm",
                        on && "rotate-180",
                      )}
                      name="chevron-down"
                      size={20}
                    />
                  </button>

                  <motion.div
                    animate={{ height: on ? "auto" : 0, opacity: on ? 1 : 0 }}
                    className="overflow-hidden"
                    initial={false}
                    transition={{ duration: reduced ? 0 : 0.3, ease: EASE }}
                  >
                    <div className="px-5 pb-6 sm:px-6 sm:pl-[5.75rem]">
                      <p className="text-base leading-relaxed text-ink-muted">{s.body}</p>
                      {s.guard ? (
                        <p className="mt-3 flex items-start gap-2 rounded-md bg-card-muted px-3.5 py-3 text-sm text-ink">
                          <Icon className="mt-0.5 shrink-0 text-mint" name="shield" size={15} />
                          <span>{s.guard}</span>
                        </p>
                      ) : null}
                    </div>
                  </motion.div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
