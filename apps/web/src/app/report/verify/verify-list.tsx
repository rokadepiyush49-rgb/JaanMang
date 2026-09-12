"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Button, Card, cx } from "@/components/ui";
import { TextareaField } from "@/components/form";
import { EvidenceGallery } from "@/components/evidence-gallery";
import { EvidenceUpload } from "@/components/evidence-upload";
import { ReportError, VerificationApi } from "@/lib/report/service";
import { CATEGORY_LABEL, type EvidencePair, type VerificationRequest } from "@/lib/report/types";

/**
 * "Was it actually fixed?"
 *
 * Only reachable with something to answer, and only ever showing problems this
 * person reported. That narrowing happens on the server; this screen could not
 * widen it if it tried.
 */
export function VerifyList() {
  const [requests, setRequests] = useState<VerificationRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void VerificationApi.mine()
      .then(setRequests)
      .catch(() => setError("Could not load your verification requests."));
  }, []);

  if (error) {
    return (
      <p className="flex items-start gap-1.5 text-sm font-semibold text-critical">
        <Icon className="mt-0.5 shrink-0" name="warning" size={15} />
        {error}
      </p>
    );
  }

  if (requests === null) return <p className="text-sm text-ink-muted">Loading…</p>;

  if (requests.length === 0) {
    return (
      <Card className="p-6">
        <p className="text-sm text-ink-muted">
          Nothing to verify right now. When work finishes on something you reported, you will be
          asked here whether it was actually done — and shown the before-and-after.
        </p>
      </Card>
    );
  }

  return (
    <ul className="space-y-5">
      {requests.map((request) => (
        <li key={request.problemId}>
          <VerifyCard
            onAnswered={(updated) =>
              setRequests((prev) =>
                (prev ?? []).map((r) => (r.problemId === updated.problemId ? updated : r)),
              )
            }
            request={request}
          />
        </li>
      ))}
    </ul>
  );
}

function VerifyCard({
  request,
  onAnswered,
}: {
  request: VerificationRequest;
  onAnswered: (r: VerificationRequest) => void;
}) {
  const [evidence, setEvidence] = useState<EvidencePair | null>(null);
  const [note, setNote] = useState("");
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rated, setRated] = useState(request.myRating);

  useEffect(() => {
    void VerificationApi.evidence(request.problemId).then(setEvidence).catch(() => setEvidence(null));
  }, [request.problemId]);

  async function answer(fixed: boolean) {
    setBusy(true);
    setError(null);
    try {
      const status = await VerificationApi.verify(request.problemId, {
        fixed,
        note: note.trim() || undefined,
        photoKeys: photoKeys.length ? photoKeys : undefined,
      });
      onAnswered({
        ...request,
        confirmed: status.confirmed,
        denied: status.denied,
        pending: status.pending,
        status: status.problemStatus,
        myVerification: { fixed, at: new Date().toISOString() },
      });
    } catch (cause) {
      setError(cause instanceof ReportError ? cause.message : "Could not record your answer.");
    } finally {
      setBusy(false);
    }
  }

  const answered = request.myVerification;

  return (
    <Card className="p-5">
      <span className="label-caps text-ink-faint">
        {CATEGORY_LABEL[request.category]} · {request.villages.join(", ")}
      </span>
      <h2 className="mt-1 text-base font-semibold text-ink">{request.title}</h2>

      <p className="mt-1 text-xs text-ink-muted">
        {request.confirmed} of {request.asked} reporters have confirmed
        {request.denied > 0 ? `, ${request.denied} said it is not fixed` : ""}.
      </p>

      <EvidenceGallery
        after={evidence?.after ?? null}
        before={evidence?.before ?? null}
        className="mt-4"
      />

      {answered ? (
        <div
          className={cx(
            "mt-4 flex items-start gap-2 rounded-md p-3 text-sm",
            answered.fixed ? "bg-mint-wash text-ink" : "bg-amber-wash text-ink",
          )}
        >
          <Icon
            className="mt-0.5 shrink-0"
            name={answered.fixed ? "check-circle" : "alert-circle"}
            size={15}
          />
          <span>
            You said this {answered.fixed ? "was fixed" : "is not fixed"}. You can change your
            answer if you have been back since.
          </span>
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        <TextareaField
          hint="Optional. If it is not fixed, what is still wrong?"
          label="Anything to add?"
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          value={note}
        />

        <EvidenceUpload
          hint="A photograph of what you can see now. This is what makes your answer checkable."
          label="Your photographs"
          max={4}
          onChange={setPhotoKeys}
          purpose="verification"
        />

        {error ? (
          <p className="flex items-start gap-1.5 text-xs font-semibold text-critical">
            <Icon className="mt-px shrink-0" name="warning" size={13} />
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button disabled={busy} icon="check" onClick={() => void answer(true)}>
            {answered?.fixed ? "Still fixed" : "Yes, it was fixed"}
          </Button>
          <Button disabled={busy} icon="x" onClick={() => void answer(false)} tone="outline">
            No, it is not
          </Button>
        </div>
      </div>

      {/* Rating is a different question, and only worth asking once somebody
          has said the work was done. */}
      {request.project && answered?.fixed && !rated ? (
        <RateBlock
          onRated={() => setRated(true)}
          projectId={request.project.id}
        />
      ) : null}
    </Card>
  );
}

function RateBlock({ projectId, onRated }: { projectId: string; onRated: () => void }) {
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <div className="mt-5 border-t border-line pt-5">
      <span className="label-caps text-ink-faint">And how well was it done?</span>
      <p className="mt-1 text-xs text-ink-muted">
        A different question from whether it was fixed. This is what the delivery rankings are
        built from.
      </p>

      <div className="mt-3 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className={cx(
              "flex size-9 items-center justify-center rounded-full transition-colors",
              n <= stars ? "bg-primary text-white" : "bg-card-muted text-ink-faint",
            )}
            key={n}
            onClick={() => setStars(n)}
            type="button"
          >
            <Icon name="star" size={16} />
          </button>
        ))}
      </div>

      <div className="mt-3">
        <TextareaField
          label="Why?"
          onChange={(e) => setComment(e.target.value)}
          optional
          rows={2}
          value={comment}
        />
      </div>

      <Button
        className="mt-3"
        disabled={stars === 0 || busy}
        onClick={() => {
          setBusy(true);
          void VerificationApi.rate(projectId, { stars, comment: comment.trim() || undefined })
            .then(onRated)
            .finally(() => setBusy(false));
        }}
        size="sm"
      >
        Submit rating
      </Button>
    </div>
  );
}
