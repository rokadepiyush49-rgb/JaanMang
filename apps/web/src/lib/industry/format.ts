/**
 * Formatting for the industry screens.
 *
 * Money, counts and dates are re-exported from the government module rather
 * than reimplemented: ₹6.2 L has to mean the same thing and render the same way
 * on an officer's screen and a partner's, or the two surfaces stop describing
 * one product.
 */

export { count, dateTime, percent, relative, rupees, shortDate, sla } from "@/lib/gov/format";

/** "in 12 days" / "3 days ago" — a deadline is always read as a distance. */
export function until(iso: string, now = Date.now()) {
  const hours = Math.round((new Date(iso).getTime() - now) / 36e5);
  if (hours < 0) {
    const over = Math.abs(hours);
    return over >= 48 ? `${Math.round(over / 24)} days ago` : `${over}h ago`;
  }
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.round(hours / 24)} days`;
}

/** People, in the register a CSR report uses: 18,420 → "18,420", 1,240 → "1,240". */
export function people(value: number) {
  return value.toLocaleString("en-IN");
}

/** "₹228" — cost per beneficiary is never abbreviated; the rupees are the point. */
export function exactRupees(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}
