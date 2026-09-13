"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Button, cx } from "@/components/ui";
import { ReportError, uploadFile } from "@/lib/report/service";

/**
 * Pick photographs and upload them, returning the keys.
 *
 * Uploads as they are chosen rather than on submit: on a rural connection a
 * photograph takes long enough that doing it at submit time reads as a hung
 * button. Each file carries its own state, so one failure out of four does not
 * lose the other three.
 */
export function EvidenceUpload({
  label = "Add photographs",
  hint,
  purpose = "evidence",
  max = 6,
  onChange,
}: {
  label?: string;
  hint?: string;
  purpose?: string;
  max?: number;
  onChange: (keys: string[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<
    { id: string; name: string; url?: string; key?: string; error?: string }[]
  >([]);

  async function pick(files: FileList | null) {
    if (!files?.length) return;
    const chosen = [...files].slice(0, max - items.length);

    for (const file of chosen) {
      const id = `${file.name}-${file.size}-${Date.now()}`;
      setItems((prev) => [...prev, { id, name: file.name }]);

      try {
        const { key, url } = await uploadFile(file, purpose);
        setItems((prev) => {
          const next = prev.map((i) => (i.id === id ? { ...i, key, url } : i));
          onChange(next.map((i) => i.key).filter((k): k is string => Boolean(k)));
          return next;
        });
      } catch (error) {
        const message =
          error instanceof ReportError ? error.message : "That file could not be uploaded.";
        setItems((prev) => prev.map((i) => (i.id === id ? { ...i, error: message } : i)));
      }
    }
  }

  function remove(id: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      onChange(next.map((i) => i.key).filter((k): k is string => Boolean(k)));
      return next;
    });
  }

  return (
    <div className="min-w-0">
      <span className="label-caps mb-2 block text-ink-faint">{label}</span>

      <input
        accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
        className="sr-only"
        multiple
        onChange={(e) => void pick(e.target.files)}
        ref={input}
        type="file"
      />

      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <div
            className={cx(
              "relative size-20 overflow-hidden rounded-md ring-1",
              item.error ? "ring-critical" : "ring-line",
            )}
            key={item.id}
          >
            {item.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={item.name} className="size-full object-cover" src={item.url} />
            ) : (
              <div className="flex size-full items-center justify-center bg-card-muted">
                {item.error ? (
                  <Icon className="text-critical" name="warning" size={16} />
                ) : (
                  <span className="size-4 animate-spin rounded-full border-2 border-line border-t-ink" />
                )}
              </div>
            )}
            <button
              aria-label={`Remove ${item.name}`}
              className="absolute top-0.5 right-0.5 flex size-5 items-center justify-center rounded-full bg-ink/70 text-card"
              onClick={() => remove(item.id)}
              type="button"
            >
              <Icon name="x" size={11} />
            </button>
          </div>
        ))}

        {items.length < max ? (
          <Button
            className="size-20 flex-col gap-1 !px-0"
            icon="upload"
            onClick={() => input.current?.click()}
            size="sm"
            tone="outline"
            type="button"
          >
            <span className="text-[11px]">Add</span>
          </Button>
        ) : null}
      </div>

      {items.some((i) => i.error) ? (
        <p className="mt-2 text-xs font-semibold text-critical">
          {items.find((i) => i.error)?.error}
        </p>
      ) : hint ? (
        <p className="mt-2 text-xs text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
