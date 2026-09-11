"use client";

import { useEffect } from "react";

/**
 * The last boundary.
 *
 * `error.tsx` sits inside the root layout and cannot catch the root layout
 * itself failing. This can, and because it *replaces* that layout it has to
 * ship its own `<html>` and `<body>`.
 *
 * Everything below is inline-styled on purpose. If the root layout threw, the
 * font loader or the stylesheet is a candidate for what threw, so a fallback
 * that depends on either is a fallback that renders a blank page at the exact
 * moment it is needed. No design system import, no Tailwind class, no font
 * variable — just a page that always draws.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[root error]", error.digest ?? "(no digest)", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background: "#f6f7f9",
          color: "#17181c",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div
          style={{
            maxWidth: "28rem",
            textAlign: "center",
            background: "#fff",
            border: "1px solid #e4e6ea",
            borderRadius: "16px",
            padding: "40px 32px",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 12px" }}>
            Jan Setu could not start.
          </h1>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#5b5f69", margin: 0 }}>
            Something failed before the page could be drawn. Reloading usually fixes
            it; if it does not, the service is likely down.
          </p>
          {error.digest ? (
            <p style={{ fontSize: "0.75rem", color: "#82868f", marginTop: "12px" }}>
              Reference <code>{error.digest}</code>
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              marginTop: "24px",
              padding: "10px 20px",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#fff",
              background: "#17181c",
              border: "none",
              borderRadius: "999px",
              cursor: "pointer",
            }}
            type="button"
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
