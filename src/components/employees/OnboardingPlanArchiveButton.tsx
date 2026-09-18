"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, Trash2, X } from "lucide-react";

export function OnboardingPlanArchiveButton({
  onboardingId,
  employeeName,
  onArchived,
}: {
  onboardingId: string;
  employeeName: string;
  onArchived: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !archiving) setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [archiving, open]);

  async function archivePlan() {
    if (reason.trim().length < 3) {
      setMessage("Enter a reason for archiving this onboarding plan.");
      return;
    }
    setArchiving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/onboarding/${encodeURIComponent(onboardingId)}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Could not archive plan");
      setOpen(false);
      setReason("");
      await onArchived();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not archive plan");
    } finally {
      setArchiving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        title="Delete onboarding plan"
        aria-label={`Delete onboarding plan for ${employeeName}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-destructive/40 text-destructive transition-colors hover:bg-destructive-light"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#0b1018] p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`archive-onboarding-${onboardingId}`}
          >
            <div className="my-auto w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-destructive">
                    Onboarding lifecycle
                  </p>
                  <h2 id={`archive-onboarding-${onboardingId}`} className="mt-1 text-xl font-bold">
                    Archive {employeeName}&apos;s plan?
                  </h2>
                </div>
                <button
                  type="button"
                  title="Close"
                  disabled={archiving}
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                The plan, tasks, documents, and audit history will be retained in Archived plans.
                The employee record will not be deleted.
              </p>
              <label className="mt-5 block text-sm font-bold">
                Archive reason
                <textarea
                  rows={4}
                  maxLength={2000}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Record why this onboarding plan is being archived"
                  className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 font-normal outline-none focus:border-primary"
                />
              </label>
              {message && <p className="mt-2 text-sm text-destructive">{message}</p>}
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={archiving}
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-bold hover:bg-muted disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={archiving || reason.trim().length < 3}
                  onClick={() => void archivePlan()}
                  className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground disabled:opacity-50"
                >
                  <Archive className="h-4 w-4" />
                  {archiving ? "Archiving..." : "Archive plan"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
