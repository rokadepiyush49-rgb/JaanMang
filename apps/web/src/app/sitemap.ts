import type { MetadataRoute } from "next";
import { Portal } from "@/lib/public/portal";

/**
 * The sitemap.
 *
 * Only the public portal. Every authenticated surface is deliberately absent —
 * a sitemap is a list of what a stranger should find, and `/gov/problems/P-1042`
 * is not that even though the redacted `/problems/P-1042` is.
 *
 * The problem pages are enumerated from the API, so a problem published today
 * is indexable today. If the API is unreachable the static pages still ship: a
 * sitemap that 500s is worse than a short one.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const now = new Date();

  const statics: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/impact`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/problems`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/ledger`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/leaderboard`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    // The intake form is the most useful page on the site for the person it is
    // for, and it needs no account.
    { url: `${base}/report`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];

  const problems = await Portal.problems();
  return [
    ...statics,
    ...problems.map((p) => ({
      url: `${base}/problems/${p.id}`,
      lastModified: new Date(p.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
