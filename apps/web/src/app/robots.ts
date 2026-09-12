import type { MetadataRoute } from "next";

/**
 * What a crawler may read.
 *
 * Allow the public portal, disallow everything behind a session. The
 * authenticated surfaces are already unreachable without a cookie — `proxy.ts`
 * redirects — so this is not the control that protects them; it is there so a
 * crawler does not spend its budget on redirect chains, and so the sign-in page
 * does not turn up as a search result for a citizen looking for the report form.
 */
export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/impact", "/problems", "/ledger", "/leaderboard", "/report"],
        disallow: [
          "/api/",
          "/gov",
          "/industry",
          "/institute",
          "/dashboard",
          "/profile",
          "/settings",
          "/notifications",
          "/applications",
          "/projects",
          "/opportunities",
          "/achievements",
          "/impact-hub",
          "/industry-hub",
          "/problem-explorer",
          "/collaborate",
          "/council",
          "/onboarding",
          "/signin",
          "/signup",
          "/pending",
          // A citizen's own reports and verification queue are theirs.
          "/report/mine",
          "/report/verify",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
