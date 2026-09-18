"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";

export function CandidateRemovalButton({
  candidateId,
  candidateName,
  onRemoved,
}: {
  candidateId: string;
  candidateName: string;
  onRemoved: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function remove() {
    if (reason.trim().length < 3) return setMessage("Enter a reason for removing this candidate.");
    setRemoving(true);
    setMessage("");
    const response = await fetch(`/api/v1/candidates/${candidateId}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    });
    const result = await response.json();
    setRemoving(false);
    if (!response.ok) return setMessage(result.error?.message || "Could not remove candidate");
    setOpen(false);
    setReason("");
    await onRemoved();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-bold text-destructive transition-colors hover:bg-destructive-light"
      >
        <Trash2 className="h-3.5 w-3.5" /> Remove candidate
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#0b1018] p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`remove-candidate-${candidateId}`}
          >
            <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-destructive">
                    Candidate lifecycle
                  </p>
                  <h2 id={`remove-candidate-${candidateId}`} className="mt-1 text-xl font-bold">
                    Remove {candidateName}?
                  </h2>
                </div>
                <button
                  type="button"
                  title="Close"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                The candidate will leave Selected and Onboarding and move to Candidate Archive.
                Their application and audit history will be retained.
              </p>
              <label className="mt-5 block text-sm font-bold">
                Removal reason
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Record why this candidate is being removed"
                  className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
                />
              </label>
              {message && (
                <p role="alert" className="mt-2 text-sm text-destructive">
                  {message}
                </p>
              )}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={removing || reason.trim().length < 3}
                  onClick={() => void remove()}
                  className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                  {removing ? "Removing..." : "Remove candidate"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
