"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

type CompletionState = {
  status: "NOT_REQUESTED" | "ACTIVE" | "COMPLETED" | "REVOKED" | "EXPIRED";
  requestedFields: string[];
  missingFields: string[];
  progress: number;
  link: { id: string; expiresAt: string; usedAt: string | null; revokedAt: string | null } | null;
};

const groups = [
  {
    label: "Personal and contact",
    fields: ["dateOfBirth", "gender", "addressLine1", "city", "state", "postalCode"],
  },
  {
    label: "Education and employment",
    fields: [
      "education",
      "employmentHistory",
      "currentCompany",
      "skills",
      "ctc",
      "hikePercentage",
      "noticePeriod",
    ],
  },
  {
    label: "Banking and payroll",
    fields: [
      "bankAccountName",
      "bankName",
      "bankBranchName",
      "bankAccountNumber",
      "bankIfscCode",
      "bankAccountType",
    ],
  },
  {
    label: "Identity verification",
    fields: ["aadhaarNumber", "panNumber", "aadhaarImage", "panImage"],
  },
] as const;

const labels: Record<string, string> = {
  dateOfBirth: "Date of birth",
  gender: "Gender",
  addressLine1: "Address",
  city: "City",
  state: "State",
  postalCode: "Postal code",
  education: "Education",
  employmentHistory: "Employment history",
  currentCompany: "Current / last company",
  skills: "Skills",
  ctc: "Current CTC",
  hikePercentage: "Expected hike",
  noticePeriod: "Notice period",
  bankAccountName: "Account holder name",
  bankName: "Bank name",
  bankBranchName: "Branch name",
  bankAccountNumber: "Account number",
  bankIfscCode: "IFSC code",
  bankAccountType: "Account type",
  aadhaarNumber: "Aadhaar number",
  panNumber: "PAN number",
  aadhaarImage: "Aadhaar image",
  panImage: "PAN image",
};

export function CandidateCompletionLink({ candidateId }: { candidateId: string }) {
  const [state, setState] = useState<CompletionState | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/v1/candidates/${candidateId}/completion-link`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "Could not load onboarding request");
    setState(result.data);
    setSelected((current) => (current.length ? current : result.data.missingFields));
  }, [candidateId]);

  useEffect(() => {
    void load().catch((error) =>
      setMessage(error instanceof Error ? error.message : "Could not load onboarding request"),
    );
  }, [load]);

  const fieldCount = useMemo(() => selected.length, [selected]);
  function toggle(field: string) {
    setSelected((current) =>
      current.includes(field) ? current.filter((item) => item !== field) : [...current, field],
    );
  }
  async function create(regenerate = false) {
    if (!selected.length) {
      setMessage("Select at least one detail or document to request.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/candidates/${candidateId}/completion-link`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestedFields: selected, regenerate }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message || "Could not create onboarding link");
      setUrl(result.data.url);
      setMessage("Secure onboarding link ready. Share it with the candidate.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create onboarding link");
    } finally {
      setBusy(false);
    }
  }
  async function revoke() {
    if (
      !window.confirm(
        "Revoke this onboarding link? The candidate will no longer be able to use it.",
      )
    )
      return;
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/candidates/${candidateId}/completion-link`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Could not revoke link");
      setUrl("");
      setMessage("The onboarding link was revoked.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not revoke link");
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setMessage("Link copied to clipboard.");
  }

  if (!state)
    return (
      <div className="rounded-2xl border border-border/70 bg-card p-5 text-sm text-muted-foreground">
        {message || "Loading onboarding request…"}
      </div>
    );

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            Candidate onboarding
          </p>
          <h2 className="mt-1 text-base font-semibold text-foreground">Request missing details</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose what the candidate must complete. The original application stays unchanged.
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase",
            state.status === "COMPLETED"
              ? "bg-success-light text-success-ink"
              : state.status === "ACTIVE"
                ? "bg-info-light text-info-ink"
                : "bg-muted text-muted-foreground",
          )}
        >
          {state.status === "COMPLETED" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5" />
          )}
          {state.status.replaceAll("_", " ")}
        </span>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {groups.map((group) => (
          <fieldset key={group.label} className="rounded-xl border border-border/70 p-4">
            <legend className="px-1 text-xs font-semibold text-foreground">{group.label}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {group.fields.map((field) => (
                <label
                  key={field}
                  className="flex items-center gap-2 text-xs font-semibold text-foreground"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(field)}
                    onChange={() => toggle(field)}
                  />
                  {labels[field]}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-xl bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-muted-foreground">
          <strong className="text-foreground">{state.progress}% complete</strong> ·{" "}
          {state.missingFields.length} item{state.missingFields.length === 1 ? "" : "s"} pending
          {state.link?.expiresAt && (
            <span> · Link expires {new Date(state.link.expiresAt).toLocaleDateString()}</span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void create(Boolean(state.link))}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
          >
            {busy && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
            {state.link ? "Regenerate link" : `Create request · ${fieldCount}`}
          </button>
          {state.status === "ACTIVE" && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void revoke()}
              className="inline-flex items-center gap-2 rounded-xl border border-destructive px-4 py-2.5 text-xs font-bold text-destructive-ink hover:bg-destructive-light disabled:opacity-60"
            >
              <XCircle className="h-3.5 w-3.5" /> Revoke
            </button>
          )}
        </div>
      </div>

      {url && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            aria-label="Secure candidate onboarding link"
            readOnly
            value={url}
            onFocus={(event) => event.currentTarget.select()}
            className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs"
          />
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted"
          >
            <Copy className="h-3.5 w-3.5" /> Copy link
          </button>
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-bold hover:bg-muted"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open
          </a>
        </div>
      )}
      {message && (
        <p
          role="status"
          className="mt-3 flex items-center gap-2 text-xs font-semibold text-muted-foreground"
        >
          <Link2 className="h-3.5 w-3.5" />
          {message}
        </p>
      )}
    </section>
  );
}
