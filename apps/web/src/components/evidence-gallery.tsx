"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { cx } from "@/components/ui";
import { assetUrl } from "@/lib/report/service";
import type { EvidenceSide } from "@/lib/report/types";

/**
 * Before and after, side by side.
 *
 * The argument the whole platform makes is that a citizen can check the claim,
 * and this is where they check it. So both sides are always drawn — a missing
 * "after" renders as an empty frame saying the work is not photographed yet,
 * rather than collapsing to a single picture that reads as though there were
 * nothing to compare.
 */
export function EvidenceGallery({
  before,
  after,
  className,
}: {
  before: EvidenceSide | null;
  after: EvidenceSide | null;
  className?: string;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <div className={className}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Side label="Before" onOpen={setLightbox} side={before} />
        <Side label="After" onOpen={setLightbox} side={after} tone="success" />
      </div>

      {lightbox ? (
        <button
          aria-label="Close"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-6"
          onClick={() => setLightbox(null)}
          type="button"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img alt="Evidence" className="max-h-full max-w-full rounded-lg" src={lightbox} />
        </button>
      ) : null}
    </div>
  );
}

function Side({
  label,
  side,
  onOpen,
  tone = "neutral",
}: {
  label: string;
  side: EvidenceSide | null;
  onOpen: (url: string) => void;
  tone?: "neutral" | "success";
}) {
  const images = side?.images ?? [];

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="label-caps text-ink-faint">{label}</span>
        {side?.activeReports !== null && side?.activeReports !== undefined ? (
          <span className="text-xs text-ink-muted">
            {side.activeReports} active report{side.activeReports === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>

      {images.length > 0 ? (
        <div className={cx("grid gap-2", images.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
          {images.map((image) => (
            <button
              className="overflow-hidden rounded-md bg-card-muted ring-1 ring-line"
              key={image.key}
              onClick={() => onOpen(assetUrl(image.url))}
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${label} evidence`}
                className="aspect-4/3 w-full object-cover transition-transform duration-200 hover:scale-[1.02]"
                loading="lazy"
                src={assetUrl(image.url)}
              />
            </button>
          ))}
        </div>
      ) : (
        <div
          className={cx(
            "flex aspect-4/3 flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4 text-center",
            tone === "success" ? "border-line bg-mint-wash" : "border-line bg-card-muted",
          )}
        >
          <Icon className="text-ink-faint" name="upload" size={20} />
          <p className="text-xs text-ink-muted">
            {label === "After"
              ? "Not photographed yet. The work is not verifiable until it is."
              : "No photograph of the original problem."}
          </p>
        </div>
      )}

      {side?.note ? <p className="mt-2 text-xs text-ink-muted">{side.note}</p> : null}
    </div>
  );
}
