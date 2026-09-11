/** Formatting helpers shared by the government screens. */

/** ₹ in the Indian scale — the unit an officer actually reads a budget in. */
export function rupees(value: number, opts: { compact?: boolean } = {}) {
  const { compact = true } = opts;
  if (!compact) return `₹${value.toLocaleString("en-IN")}`;
  if (value >= 1_00_00_000) return `₹${trim(value / 1_00_00_000)} Cr`;
  if (value >= 1_00_000) return `₹${trim(value / 1_00_000)} L`;
  if (value >= 1_000) return `₹${trim(value / 1_000)} K`;
  return `₹${value}`;
}

function trim(n: number) {
  return n.toFixed(n < 10 ? 2 : 1).replace(/\.0+$/, "");
}

export function count(value: number) {
  return value.toLocaleString("en-IN");
}

const NOW = () => Date.now();

/** "12h remaining" / "2 days overdue" — SLA is always read as a distance. */
export function sla(dueIso: string): { label: string; breached: boolean; hours: number } {
  const hours = Math.round((new Date(dueIso).getTime() - NOW()) / 36e5);
  if (hours < 0) {
    const over = Math.abs(hours);
    return {
      label: over >= 48 ? `${Math.round(over / 24)} days overdue` : `${over}h overdue`,
      breached: true,
      hours,
    };
  }
  return {
    label: hours >= 48 ? `${Math.round(hours / 24)} days remaining` : `${hours}h remaining`,
    breached: false,
    hours,
  };
}

export function relative(iso: string) {
  const mins = Math.round((NOW() - new Date(iso).getTime()) / 6e4);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export function dateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function percent(value: number) {
  return `${Math.round(value)}%`;
}

/** "Shri Devendra Munda" → "Devendra". Honorifics are not names. */
export function firstName(full: string) {
  const HONORIFICS = ["shri", "smt.", "smt", "dr.", "dr", "mr.", "mr", "ms.", "ms"];
  const parts = full.replace(/,.*$/, "").trim().split(/\s+/);
  const named = parts.filter((w) => !HONORIFICS.includes(w.toLowerCase()));
  return named[0] ?? parts[0];
}
