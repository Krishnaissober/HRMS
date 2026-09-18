"use client";

import { useState } from "react";
import { Loader2, UserMinus, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export function AdminMembershipActions({ membershipId, active }: { membershipId: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function changeStatus() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/admin/memberships/${membershipId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: active ? "INACTIVE" : "ACTIVE" }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error?.message || "Could not update HR access.");
      }
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update HR access.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="flex items-center gap-2">
      {error ? <span className="max-w-48 text-right text-[11px] font-semibold text-destructive-ink">{error}</span> : null}
      <button
        type="button"
        onClick={changeStatus}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-xl border border-destructive/40 px-3 py-2 text-xs font-bold text-destructive-ink transition hover:bg-destructive/10 disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : active ? <UserMinus className="size-3.5" /> : <UserRoundCheck className="size-3.5" />}
        {active ? "Remove access" : "Restore access"}
      </button>
    </div>
  );
}
