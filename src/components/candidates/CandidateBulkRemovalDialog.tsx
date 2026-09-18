"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2, X } from "lucide-react";

export function CandidateBulkRemovalDialog({
  candidates,
  onClose,
  onRemoved,
}: {
  candidates: Array<{ id: string; name: string }>;
  onClose: () => void;
  onRemoved: () => void | Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !removing) onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onClose, removing]);

  async function remove() {
    if (reason.trim().length < 3) return setMessage("Enter a reason for removing the candidates.");
    setRemoving(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/candidates/bulk-remove", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidateIds: candidates.map((candidate) => candidate.id),
          reason: reason.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Could not remove candidates");
      await onRemoved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove candidates");
      setRemoving(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#0b1018] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-remove-candidates-title"
    >
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase text-destructive">Candidate lifecycle</p>
            <h2 id="bulk-remove-candidates-title" className="mt-1 text-xl font-bold">
              Remove {candidates.length} candidate{candidates.length === 1 ? "" : "s"}?
            </h2>
          </div>
          <button
            type="button"
            title="Close"
            disabled={removing}
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          The selected candidates will leave Applicants and move to Candidate Archive. Their forms,
          applications, and audit history will be retained.
        </p>
        <div className="mt-4 max-h-28 overflow-y-auto rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
          {candidates.map((candidate) => (
            <p key={candidate.id} className="truncate py-0.5 font-semibold">
              {candidate.name}
            </p>
          ))}
        </div>
        <label className="mt-5 block text-sm font-bold">
          Removal reason
          <textarea
            rows={4}
            maxLength={2000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Record why these candidates are being removed"
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
            disabled={removing}
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-muted disabled:opacity-50"
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
            {removing ? "Removing..." : "Remove selected"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
