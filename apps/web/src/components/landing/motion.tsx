"use client";

/**
 * The landing page's motion vocabulary.
 *
 * Three primitives, all built on the tokens the rest of the product already
 * uses — `--duration-medium` (260ms) and `--ease-jm` (easeOutCubic), which are
 * transcribed from the citizen app's `motion.dart`. The landing page does not
 * get its own timing curve; it gets the product's.
 *
 * Every one of them honours `prefers-reduced-motion` through Motion's own
 * `useReducedMotion`, and in that mode content is rendered at its resting
 * state rather than being animated faster. The global stylesheet already
 * collapses CSS animation durations under the same query; this is the JS half
 * of the same promise.
 *
 * **Entrances animate transform, never opacity.** `globals.css` records why,
 * and it was learned the hard way here: an entrance that starts at
 * `opacity: 0` renders the page blank if the animation never runs — a
 * backgrounded tab, a prerender, a failed hydration, an extension that
 * suppresses animation. Animating translate alone makes the worst case a 14px
 * offset instead of invisible content, and the motion still reads as rising
 * in. The same rule that governs the CSS keyframes governs these.
 */

import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";

const EASE = [0.215, 0.61, 0.355, 1] as const;

/** Fade and rise, on entering the viewport. The page's default entrance. */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
  once = true,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  once?: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { y }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      viewport={{ once, margin: "-80px" }}
      whileInView={reduced ? undefined : { y: 0 }}
    >
      {children}
    </motion.div>
  );
}

/** A container whose children arrive in sequence. */
export function Stagger({
  children,
  className,
  gap = 0.07,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  const reduced = useReducedMotion();
  const variants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduced ? 0 : gap } },
  };
  return (
    <motion.div
      animate="show"
      className={className}
      initial={reduced ? "show" : "hidden"}
      variants={variants}
      viewport={{ once: true, margin: "-60px" }}
      whileInView="show"
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  y = 14,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
}) {
  const reduced = useReducedMotion();
  const variants: Variants = {
    hidden: { y },
    show: { y: 0, transition: { duration: 0.45, ease: EASE } },
  };
  return (
    <motion.div className={className} variants={reduced ? undefined : variants}>
      {children}
    </motion.div>
  );
}

/**
 * A number that counts up when it scrolls into view.
 *
 * Spring-driven rather than linear, so it decelerates into its final value the
 * way the rest of the product's motion does. Under reduced motion it simply
 * prints the number — an animated statistic is decoration, and decoration is
 * the first thing to drop.
 */
export function CountUp({
  value,
  format = (v: number) => Math.round(v).toLocaleString("en-IN"),
  className,
}: {
  value: number;
  format?: (v: number) => string;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });

  const raw = useMotionValue(0);
  const spring = useSpring(raw, { stiffness: 70, damping: 20, mass: 0.8 });
  const text = useTransform(spring, (v) => format(v));

  useEffect(() => {
    if (inView && !reduced) raw.set(value);
  }, [inView, reduced, raw, value]);

  if (reduced) {
    return (
      <span className={className} ref={ref}>
        {format(value)}
      </span>
    );
  }
  return (
    <motion.span className={className} ref={ref}>
      {text}
    </motion.span>
  );
}

/** A bar that grows from zero when its row scrolls in. */
export function GrowBar({
  percent,
  className,
  delay = 0,
}: {
  percent: number;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      className={className}
      initial={reduced ? { width: `${percent}%` } : { width: 0 }}
      transition={{ duration: 0.8, delay, ease: EASE }}
      viewport={{ once: true, margin: "-40px" }}
      whileInView={{ width: `${percent}%` }}
    />
  );
}

export { motion };
