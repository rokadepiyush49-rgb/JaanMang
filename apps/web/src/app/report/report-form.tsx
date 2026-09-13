"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChipField, Field, FormError, SelectField, TextareaField } from "@/components/form";
import { Button, Card, cx } from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  URGENCIES,
  URGENCY_LABEL,
  type Category,
  type ReportReceipt,
  type Urgency,
  type Village,
} from "@/lib/report/types";
import { ReportError, fetchVillages, submitReport } from "@/lib/report/service";

type Locating = "idle" | "asking" | "found" | "denied" | "unsupported";

/**
 * The citizen intake form.
 *
 * Two rules shaped it. One required field — what is wrong — because every
 * additional required field is a person who gives up halfway on a form they
 * were already unsure about filling in. And no account, because requiring one
 * to report a broken handpump filters for exactly the people who least need
 * this platform.
 *
 * Location is asked for twice over: the browser first, and a village picker
 * when the browser says no, which it often will. A refused permission prompt
 * must not be the end of the form.
 */
export function ReportForm({ signedIn }: { signedIn: boolean }) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<Category | undefined>();
  const [urgency, setUrgency] = useState<Urgency | undefined>();
  const [citizenName, setCitizenName] = useState("");

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState<Locating>("idle");
  const [villages, setVillages] = useState<Village[]>([]);
  const [villageId, setVillageId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReportReceipt | null>(null);

  /**
   * One key per submission attempt, regenerated only after a successful file.
   * A retry after a timeout reuses it, which is the whole point.
   */
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  useEffect(() => {
    void fetchVillages()
      .then(setVillages)
      .catch(() => setVillages([]));
  }, []);

  const village = useMemo(
    () => villages.find((v) => v.id === villageId),
    [villages, villageId],
  );

  /** Coordinates from the browser, or from the chosen village as a stand-in. */
  const position = coords ?? (village ? { lat: village.lat, lng: village.lng } : null);

  function locate() {
    if (!("geolocation" in navigator)) {
      setLocating("unsupported");
      return;
    }
    setLocating("asking");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lng: p.coords.longitude });
        setLocating("found");
      },
      // Denied, unavailable and timed out are one outcome as far as this form
      // is concerned: fall back to the picker and say so plainly.
      () => setLocating("denied"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (text.trim().length < 10) {
      setError("Please describe the problem in a sentence or two.");
      return;
    }
    if (!position) {
      setError("We need to know where. Share your location, or pick the village.");
      return;
    }

    setSubmitting(true);
    try {
      const filed = await submitReport(
        {
          text: text.trim(),
          category,
          urgency,
          lat: position.lat,
          lng: position.lng,
          villageId: coords ? undefined : villageId || undefined,
          citizenName: citizenName.trim() || undefined,
          language: "hi",
        },
        idempotencyKey,
      );
      setReceipt(filed);
      setIdempotencyKey(crypto.randomUUID());
    } catch (cause) {
      setError(
        cause instanceof ReportError
          ? cause.message
          : "Could not reach the server. Your report has not been filed — please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) return <Receipt receipt={receipt} signedIn={signedIn} onAnother={() => setReceipt(null)} />;

  return (
    <form className="space-y-7" onSubmit={onSubmit}>
      <TextareaField
        label="What is wrong?"
        hint="In your own words, in any language. Say what it is, where exactly, and how long it has been like this."
        onChange={(e) => setText(e.target.value)}
        placeholder="चापाकल सूखा है, पानी नहीं आ रहा — or type in English"
        required
        rows={5}
        value={text}
      />

      <LocationField
        coords={coords}
        locating={locating}
        onLocate={locate}
        onVillageChange={setVillageId}
        villageId={villageId}
        villages={villages}
      />

      <ChipField
        hint="If you leave this, we work it out from what you wrote — and an officer can correct it."
        label="What kind of problem is it?"
        onToggle={(v) => setCategory((c) => (c === v ? undefined : (v as Category)))}
        optional
        options={CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABEL[c] }))}
        selected={category ? [category] : []}
      />

      <ChipField
        hint="Your judgement, not ours. Nobody overrules the person standing in front of it."
        label="How urgent?"
        onToggle={(v) => setUrgency((u) => (u === v ? undefined : (v as Urgency)))}
        optional
        options={URGENCIES.map((u) => ({ value: u, label: URGENCY_LABEL[u] }))}
        selected={urgency ? [urgency] : []}
      />

      {!signedIn ? (
        <Field
          hint="Only so somebody can be called back. Leave it blank and the report still counts."
          label="Your name"
          onChange={(e) => setCitizenName(e.target.value)}
          optional
          placeholder="e.g. Bimla Devi"
          value={citizenName}
        />
      ) : null}

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button disabled={submitting} icon="send" type="submit">
          {submitting ? "Filing…" : "File this report"}
        </Button>
        <p className="text-xs text-ink-muted">
          {signedIn
            ? "Filed against your account, so you can follow what happens to it."
            : "No account needed. Sign in first if you want to follow what happens to it."}
        </p>
      </div>
    </form>
  );
}

/**
 * Where the problem is.
 *
 * The browser is asked first because it is one tap and exact. The village
 * picker is not a fallback bolted on afterwards — on these devices a refused
 * or unavailable location is common enough that it is the main path as often
 * as not, and it is shown before anyone has pressed anything.
 */
function LocationField({
  coords,
  locating,
  onLocate,
  onVillageChange,
  villageId,
  villages,
}: {
  coords: { lat: number; lng: number } | null;
  locating: Locating;
  onLocate: () => void;
  onVillageChange: (id: string) => void;
  villageId: string;
  villages: Village[];
}) {
  return (
    <div className="min-w-0">
      <span className="label-caps mb-2 block text-ink-faint">Where is it?</span>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          icon={coords ? "check" : "map-pin"}
          onClick={onLocate}
          size="sm"
          tone={coords ? "ghost" : "outline"}
          type="button"
        >
          {coords ? "Location captured" : locating === "asking" ? "Asking…" : "Use my location"}
        </Button>

        {coords ? (
          <span className="text-xs text-ink-muted">
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </span>
        ) : null}
      </div>

      {locating === "denied" || locating === "unsupported" ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-muted">
          <Icon className="mt-px shrink-0" name="alert-circle" size={13} />
          {locating === "unsupported"
            ? "This browser cannot share a location. Pick the village instead — that is enough."
            : "No location from the browser. Pick the village instead — that is enough."}
        </p>
      ) : null}

      <div className="mt-3">
        <SelectField
          hint={
            coords
              ? "Not needed — we have your exact location."
              : "The village nearest to the problem."
          }
          label="Village"
          onChange={(e) => onVillageChange(e.target.value)}
          optional={Boolean(coords)}
          options={villages.map((v) => ({
            value: v.id,
            label: v.name,
            detail: v.jurisdiction,
          }))}
          placeholder={villages.length === 0 ? "Loading the register…" : "Select a village…"}
          value={villageId}
        />
      </div>
    </div>
  );
}

/**
 * The receipt.
 *
 * Shows what the pipeline understood, in the citizen's own terms, because
 * "thank you, your report has been received" is what a black box says. If the
 * classifier misread a drainage complaint as a water one, the person who wrote
 * it is the only one who can tell — and only if they are shown.
 */
function Receipt({
  receipt,
  signedIn,
  onAnother,
}: {
  receipt: ReportReceipt;
  signedIn: boolean;
  onAnother: () => void;
}) {
  const { understood } = receipt;
  const unsure = understood.confidence < 0.55;

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-lg bg-mint-wash p-5 ring-1 ring-line">
        <Icon className="mt-0.5 shrink-0 text-primary" name="check" size={20} />
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">Filed. Thank you.</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Recorded at {receipt.village.name} on{" "}
            {new Date(receipt.receivedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}.
          </p>
        </div>
      </div>

      <Card className="p-5">
        <span className="label-caps text-ink-faint">What we understood</span>
        <p className="mt-2 text-sm font-semibold text-ink">{understood.title}</p>

        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          <Readout label="Category" value={CATEGORY_LABEL[understood.category]} />
          <Readout label="Urgency" value={URGENCY_LABEL[understood.severity].split(" — ")[0]} />
          <Readout
            label="Read by"
            value={understood.readBy === "groq" ? "Language model" : "Keyword matching"}
          />
        </dl>

        {unsure ? (
          <p className="mt-4 flex items-start gap-1.5 rounded-md bg-amber-wash p-3 text-xs text-ink-muted">
            <Icon className="mt-px shrink-0" name="warning" size={13} />
            We were not confident about the category, so this will be reviewed on its own rather
            than grouped with anything. That is deliberate — a wrong grouping buries a report.
          </p>
        ) : null}

        <p className="mt-4 text-xs text-ink-muted">
          If any of that is wrong, it does not change what you wrote. An officer reads your words,
          not our summary, and can correct the classification.
        </p>
      </Card>

      <Card className="p-5">
        <span className="label-caps text-ink-faint">What happens next</span>
        <ol className="mt-3 space-y-2.5 text-sm text-ink-muted">
          <Step n={1}>
            Your report is grouped with others about the same thing. Forty people reporting one
            handpump become one problem weighing forty, not forty items in a queue.
          </Step>
          <Step n={2}>
            The panchayat sees it ranked against everything else — on how many people it affects
            and how under-served the village is, not on how loudly it was reported.
          </Step>
          <Step n={3}>
            When the work is done, the people who reported it are the ones asked whether it was
            actually fixed, with photographs before and after. That is{" "}
            <Link className="font-semibold text-primary hover:underline" href="/report/verify">
              this page
            </Link>
            , and you will be told when there is something on it.
          </Step>
        </ol>
      </Card>

      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={onAnother} tone="outline" type="button">
          Report something else
        </Button>
        {signedIn ? (
          <Link className="text-sm font-semibold text-primary hover:underline" href="/report/mine">
            Follow your reports
          </Link>
        ) : (
          <Link className="text-sm font-semibold text-primary hover:underline" href="/signup">
            Create an account to follow it
          </Link>
        )}
      </div>
    </div>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold tracking-wide text-ink-faint uppercase">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-ink">{value}</dd>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        className={cx(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
          "bg-card-muted text-[11px] font-semibold text-ink-muted ring-1 ring-line",
        )}
      >
        {n}
      </span>
      <span className="min-w-0">{children}</span>
    </li>
  );
}
