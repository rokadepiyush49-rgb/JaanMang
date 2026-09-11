"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
import { cx } from "@/components/ui";
import type { PlatformStats } from "@/lib/public/stats";
import { CountUp, motion } from "./motion";
import { useReducedMotion } from "motion/react";

const EASE = [0.215, 0.61, 0.355, 1] as const;

/** The seven stages, as the hero's one-line summary of the whole product. */
const CHAIN: { label: string; icon: IconName }[] = [
  { label: "Speak", icon: "message" },
  { label: "Analyse", icon: "sparkles" },
  { label: "Cluster", icon: "users" },
  { label: "Prioritise", icon: "scale" },
  { label: "Fund", icon: "banknote" },
  { label: "Execute", icon: "clipboard" },
  { label: "Verify", icon: "thumbs-up" },
];

export function Hero({ stats }: { stats: PlatformStats }) {
  const reduced = useReducedMotion();
  const latest = stats.series.at(-1);

  return (
    <section className="relative overflow-hidden px-5 pt-10 pb-16 sm:px-8 lg:pt-16 lg:pb-24">
      {/* A single soft wash behind the headline. The page is already tinted;
          this only lifts the top of it so the nav has something to sit on. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 h-[36rem] bg-[radial-gradient(60%_50%_at_50%_40%,rgba(107,133,240,0.22),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          animate={{ y: 0 }}
          initial={reduced ? false : { y: 18 }}
          transition={{ duration: 0.55, ease: EASE }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-1.5 text-xs font-semibold text-ink-muted shadow-level1">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-mint opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-mint" />
            </span>
            {latest
              ? `${latest.panchayatsOnboard.toLocaleString("en-IN")} local bodies live across Jharkhand`
              : "Live across Jharkhand"}
          </span>
        </motion.div>

        <motion.h1
          animate={{ y: 0 }}
          /* The type scale's own rule: the extra display step exists because a
             1440px page can carry it and a 390px one cannot. So the headline
             starts at the mobile display size and only steps up with room. */
          className="headline-xl mt-6 max-w-4xl text-ink sm:display-xl lg:text-[3.75rem] lg:leading-[1.08]"
          initial={reduced ? false : { y: 22 }}
          transition={{ duration: 0.6, delay: 0.06, ease: EASE }}
        >
          Forty people asking for the same handpump should count as{" "}
          <span className="relative inline-block">
            <span className="relative z-10">one demand</span>
            <motion.span
              aria-hidden
              className="absolute inset-x-0 bottom-0.5 -z-0 h-2 rounded-full bg-amber/45 sm:bottom-1 sm:h-3 lg:bottom-2 lg:h-4"
              initial={reduced ? { scaleX: 1 } : { scaleX: 0 }}
              style={{ originX: 0 }}
              transition={{ duration: 0.7, delay: 0.55, ease: EASE }}
              whileInView={{ scaleX: 1 }}
            />
          </span>{" "}
          with the weight of forty.
        </motion.h1>

        <motion.p
          animate={{ y: 0 }}
          className="mt-6 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg lg:text-xl"
          initial={reduced ? false : { y: 18 }}
          transition={{ duration: 0.55, delay: 0.14, ease: EASE }}
        >
          Jan Setu turns civic need into a ranked, published, funded and citizen-verified record.
          Citizens report in their own voice, AI structures it, identical reports cluster, and
          government funds down a list whose ranking anyone can interrogate.
        </motion.p>

        <motion.div
          animate={{ y: 0 }}
          className="mt-8 flex flex-wrap items-center gap-3"
          initial={reduced ? false : { y: 16 }}
          transition={{ duration: 0.5, delay: 0.22, ease: EASE }}
        >
          <Link
            className={cx(
              "flex h-13 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white",
              "shadow-level2 transition-colors duration-150 ease-jm hover:bg-primary-hover",
            )}
            href="/signup"
          >
            Create an account
            <Icon name="arrow-right" size={18} />
          </Link>
          <Link
            className={cx(
              "flex h-13 items-center gap-2 rounded-full bg-card px-6 text-sm font-bold text-ink",
              "shadow-level1 ring-1 ring-line transition-colors duration-150 ease-jm hover:bg-card-muted",
            )}
            href="#flow"
          >
            See how it works
          </Link>
        </motion.div>

        {/* The seven-stage chain, animated in sequence — the product's own
            narrative, told once at the top. */}
        <motion.ol
          animate="show"
          className="mt-14 flex flex-wrap items-center gap-x-1.5 gap-y-3"
          initial={reduced ? "show" : "hidden"}
          variants={{ hidden: {}, show: { transition: { staggerChildren: reduced ? 0 : 0.07, delayChildren: 0.3 } } }}
        >
          {CHAIN.map((c, i) => (
            <motion.li
              className="flex items-center gap-1.5"
              key={c.label}
              variants={{
                hidden: { y: 10 },
                show: { y: 0, transition: { duration: 0.4, ease: EASE } },
              }}
            >
              <span className="flex items-center gap-2 rounded-full bg-card px-3.5 py-2 shadow-level1">
                <Icon className="text-navy" name={c.icon} size={15} />
                <span className="text-xs font-bold text-ink">{c.label}</span>
              </span>
              {i < CHAIN.length - 1 ? (
                <Icon className="text-line-strong" name="chevron-right" size={14} />
              ) : null}
            </motion.li>
          ))}
        </motion.ol>

        {/* Three figures, at the point a visitor is deciding whether to keep
            reading. Counting up on scroll, static under reduced motion. */}
        {stats.available ? (
          <motion.dl
            animate={{ y: 0 }}
            className="mt-12 grid grid-cols-2 gap-4 border-t border-line pt-8 sm:grid-cols-4"
            initial={reduced ? false : { y: 12 }}
            transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
          >
            <HeroStat
              label="Citizen reports"
              sub={stats.growth ? `since ${stats.growth.fromYear}` : undefined}
              value={stats.totals.reportsSubmitted}
            />
            <HeroStat
              label="Demands resolved"
              sub={stats.growth ? `${stats.growth.resolutionRate}% of validated` : undefined}
              value={stats.totals.problemsResolved}
            />
            <HeroStat label="Villages covered" value={stats.totals.villagesCovered} />
            <HeroStat
              format={(v) => `₹${(v / 10000000).toFixed(1)} Cr`}
              label="Routed through the ledger"
              value={stats.totals.fundsRouted}
            />
          </motion.dl>
        ) : null}
      </div>
    </section>
  );
}

function HeroStat({
  value,
  label,
  sub,
  format,
}: {
  value: number;
  label: string;
  sub?: string;
  format?: (v: number) => string;
}) {
  return (
    <div>
      <dd className="stat-number text-ink">
        <CountUp format={format} value={value} />
      </dd>
      <dt className="mt-1 text-sm font-semibold text-ink-muted">{label}</dt>
      {sub ? <p className="text-xs text-ink-faint">{sub}</p> : null}
    </div>
  );
}
