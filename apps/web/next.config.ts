import path from "node:path";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * Written as an allow-list of the origins this app actually uses, which is a
 * short list: fonts are self-hosted via `next/font/local`, the Groq key is only
 * ever read inside a route handler so the browser never talks to Groq, and the
 * backend is reached same-origin through `/api/backend` and `/api/gov`. That
 * leaves OpenStreetMap's tile servers as the only third party, and only for
 * images.
 *
 * `script-src` keeps `'unsafe-inline'` because Next's hydration bootstrap is an
 * inline script; removing it needs a nonce threaded through the document, which
 * is a real change and not a config line. `'unsafe-eval'` is development-only —
 * React Refresh needs it, production does not.
 *
 * `frame-ancestors 'none'` is the one that matters most here: it is what stops
 * the government workspace being framed by another site and clickjacked.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Two years, preloadable. Only meaningful over HTTPS, which is what the
  // deployed origins are; it is inert on localhost.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing in this product uses a camera, a microphone or a payment handler.
  // Geolocation is asked for by name where a map needs it, so it stays denied
  // at the document level until a screen genuinely requires it.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack ignores the stray lockfile in $HOME.
  turbopack: { root: path.resolve(".") },

  // Keep a build honest: a type error should fail the deploy, not be waved
  // through. This is already the default — stated so nobody "fixes" a red
  // build by flipping it.
  typescript: { ignoreBuildErrors: false },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
