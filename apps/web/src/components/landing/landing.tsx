import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";
import { Card, cx } from "@/components/ui";
import type { PlatformStats } from "@/lib/public/stats";
import { LandingNav } from "./nav";
import { Hero } from "./hero";
import { StatsBand } from "./stats-band";
import { GrowthChart } from "./growth-chart";
import { Flow } from "./flow";
import { Audiences } from "./audiences";
import { Reveal, Stagger, StaggerItem } from "./motion";

/**
 * The public landing page.
 *
 * It answers three questions in order, because that is the order a visitor
 * asks them: *why does this exist*, *what does it actually do*, and *what is
 * it for me*. The statistics sit between the first and the second, where they
 * are evidence rather than decoration.
 *
 * Every figure on the page comes from the API, and the provenance line that
 * comes with them is printed rather than hidden. This product refuses to show
 * a resolution-time metric because its sources cannot compute one; a landing
 * page that quietly invented growth numbers would undo that.
 */
export function Landing({ stats }: { stats: PlatformStats }) {
  return (
    <div className="min-h-dvh">
      <LandingNav />
      <main>
        <Hero stats={stats} />
        <StatsBand stats={stats} />
        <Problem />
        <Flow />
        <GrowthChart stats={stats} />
        <Audiences />
        <Principles />
        <CallToAction />
      </main>
      <Footer stats={stats} />
    </div>
  );
}

/* ============================================================== why === */

const BROKEN: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "volume-off",
    title: "The loudest voice wins",
    body: "A complaint system ranks by who complains best — who has a smartphone, who speaks the official language, who knows which office to call. The village that needs a handpump most is usually the one least able to ask for it.",
  },
  {
    icon: "list",
    title: "Forty reports, forty tickets",
    body: "Forty people reporting the same broken handpump become forty separate grievances, each closed separately, none of them carrying the weight of forty. The scale of a need disappears into the queue.",
  },
  {
    icon: "help",
    title: "Nobody knows why",
    body: "Budgets are allocated and nobody outside the office can say on what basis. Without a published ranking there is no way to tell a considered decision from an arbitrary one — so every decision looks arbitrary.",
  },
  {
    icon: "check-circle",
    title: "Closed is not fixed",
    body: "A ticket is marked resolved by the office that was asked to resolve it. The people who reported it are never asked whether anything actually changed.",
  },
];

function Problem() {
  return (
    <section className="px-5 py-20 sm:px-8 lg:py-28" id="why">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="label-caps text-ink-faint">Why this exists</p>
          <h2 className="headline-xl mt-3 max-w-3xl text-ink lg:text-[2.5rem] lg:leading-[1.15]">
            Civic systems do not fail because nobody reports anything. They fail because reports
            are not evidence.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-muted sm:text-lg">
            Four failures, each of which the platform is built to close.
          </p>
        </Reveal>

        <Stagger className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2">
          {BROKEN.map((b) => (
            <StaggerItem key={b.title}>
              <Card className="h-full p-6">
                <span className="flex size-11 items-center justify-center rounded-[13px] bg-critical-tint text-on-critical-tint">
                  <Icon name={b.icon} size={21} />
                </span>
                <h3 className="headline-md mt-4 text-ink">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{b.body}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>

        <Reveal delay={0.1}>
          <Card className="mt-6 bg-primary p-7 text-white lg:p-9" tone="flat">
            <p className="label-caps text-white/60">What replaces it</p>
            <p className="mt-3 max-w-4xl font-display text-2xl leading-snug font-semibold lg:text-[1.75rem]">
              A citizen reports a need in their own voice. AI structures it. Identical reports are
              clustered, so forty people asking for the same handpump count as{" "}
              <span className="text-amber">one demand with the weight of forty</span>. That demand
              is ranked against every other demand in the district on five published factors.
              Government funds down the ranked list. And the citizens who reported it decide
              whether it was actually fixed.
            </p>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

/* ======================================================= principles === */

const PRINCIPLES: { icon: IconName; title: string; body: string }[] = [
  {
    icon: "scale",
    title: "Need is not votes",
    body: "Priority is computed from seven signals — population affected, severity, deprivation, existing coverage, how long it has gone on, whether it recurs, and repeated demand. Deprivation is in there specifically so the ranking cannot become a popularity contest.",
  },
  {
    icon: "eye",
    title: "Every score is interrogable",
    body: "A rank decomposes on screen into the factors that produced it, each with its weight and its source. A number a person cannot argue with is a number they will not act on.",
  },
  {
    icon: "lock",
    title: "Industry sees a redacted view",
    body: "Partners see aggregates, cluster labels and the government's validation. Citizen identities, verbatim reports, officer notes and coordinates never cross that boundary — a screen cannot leak what it was never given.",
  },
  {
    icon: "thumbs-up",
    title: "Citizens close the loop",
    body: "A problem is not resolved because an office says so. The people who reported it confirm the fix, and the public ledger records who paid, how much, and whether it was verified.",
  },
  {
    icon: "bar-chart",
    title: "No number without its source",
    body: "Every figure carries its provenance. No time-to-resolution metric appears anywhere in this product, because the source data cannot compute one and inventing it would be worse than omitting it.",
  },
  {
    icon: "users",
    title: "Students are not an afterthought",
    body: "Validated problems are real briefs. Teams form across campuses, industry mentors join the design reviews, and a student leaves with a record of verified outcomes rather than a certificate.",
  },
];

function Principles() {
  return (
    <section className="bg-surface-dim/50 px-5 py-20 sm:px-8 lg:py-28" id="principles">
      <div className="mx-auto max-w-6xl">
        <Reveal>
          <p className="label-caps text-ink-faint">The rules it holds</p>
          <h2 className="headline-xl mt-3 max-w-3xl text-ink lg:text-[2.5rem] lg:leading-[1.15]">
            Six commitments that shape every screen
          </h2>
        </Reveal>

        <Stagger className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <StaggerItem key={p.title}>
              <Card className="h-full p-6">
                <span className="flex size-10 items-center justify-center rounded-sm bg-tint-navy text-on-tint-navy">
                  <Icon name={p.icon} size={19} />
                </span>
                <h3 className="mt-4 font-bold text-ink">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p.body}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

/* ============================================================== cta === */

function CallToAction() {
  return (
    <section className="px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-4xl">
        <Reveal>
          <Card className="p-8 text-center lg:p-12">
            <span className="mx-auto flex size-14 items-center justify-center rounded-[16px] bg-tint-mint text-on-tint-mint">
              <Icon name="rocket" size={27} />
            </span>
            <h2 className="headline-xl mt-6 text-ink">Start where you are</h2>
            <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-ink-muted">
              Students are in immediately. Government and industry accounts are verified by a
              person first, because they hold authority over public money and over data about real
              people.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                className={cx(
                  "flex h-12 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white",
                  "shadow-level2 transition-colors duration-150 ease-jm hover:bg-primary-hover",
                )}
                href="/signup"
              >
                Create an account
                <Icon name="arrow-right" size={18} />
              </Link>
              <Link
                className={cx(
                  "flex h-12 items-center gap-2 rounded-full bg-card px-6 text-sm font-bold text-ink",
                  "shadow-level1 ring-1 ring-line transition-colors duration-150 ease-jm hover:bg-card-muted",
                )}
                href="/signin"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-5 text-xs text-ink-muted">
              Trying it out? The sign-in page lists demo accounts for all three roles.
            </p>
          </Card>
        </Reveal>
      </div>
    </section>
  );
}

/* =========================================================== footer === */

function Footer({ stats }: { stats: PlatformStats }) {
  return (
    <footer className="border-t border-line bg-card px-5 py-12 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-md bg-ink text-card">
                <Icon name="landmark" size={20} />
              </span>
              <span className="font-display text-lg font-bold tracking-[-0.01em] text-ink">
                Jan Setu
              </span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-ink-muted">
              A civic demand-to-budget platform for Jharkhand. Citizens, students, government and
              industry on one ranked, published record of what needs doing.
            </p>
          </div>

          <nav className="flex gap-12">
            <div>
              <p className="label-caps mb-3 text-ink-faint">Product</p>
              <ul className="flex flex-col gap-2 text-sm text-ink-muted">
                <li><Link className="hover:text-ink" href="#why">Why it exists</Link></li>
                <li><Link className="hover:text-ink" href="#flow">How it works</Link></li>
                <li><Link className="hover:text-ink" href="#impact">Impact</Link></li>
                <li><Link className="hover:text-ink" href="#audiences">Who it is for</Link></li>
              </ul>
            </div>
            <div>
              <p className="label-caps mb-3 text-ink-faint">Account</p>
              <ul className="flex flex-col gap-2 text-sm text-ink-muted">
                <li><Link className="hover:text-ink" href="/signin">Sign in</Link></li>
                <li><Link className="hover:text-ink" href="/signup">Create an account</Link></li>
                <li><Link className="hover:text-ink" href="/signup/government">Government</Link></li>
                <li><Link className="hover:text-ink" href="/signup/industry">Industry</Link></li>
              </ul>
            </div>
          </nav>
        </div>

        {/* The provenance line, printed rather than buried. */}
        <p className="border-t border-line pt-6 text-xs leading-relaxed text-ink-faint">
          {stats.provenance}
        </p>
      </div>
    </footer>
  );
}
