"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  BriefcaseBusiness,
  Archive,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CandidateRemovalButton } from "@/components/candidates/CandidateRemovalButton";

type Employee = {
  id: string;
  candidateId?: string | null;
  employeeNo: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department?: string | null;
  status: string;
};
type SelectedCandidate = {
  id: string;
  referenceNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleOfInterest: string;
  status: string;
  source: string;
};
type CompletedOnboarding = { employee: { id: string } };
type CandidateOnboarding = {
  id: string;
  status: string;
  progress: number;
  missingFields: string[];
};

const EMPLOYEE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-success-light dark:bg-success-light/60 text-success-ink dark:text-success-ink",
  INACTIVE:
    "bg-destructive-light dark:bg-destructive-light/60 text-destructive-ink dark:text-destructive-ink",
  TERMINATED:
    "bg-destructive-light dark:bg-destructive-light/60 text-destructive-ink dark:text-destructive-ink",
  ON_LEAVE: "bg-warning-light dark:bg-warning-light/60 text-warning-ink dark:text-warning-ink",
};

export default function EmployeesPage() {
  const [items, setItems] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<SelectedCandidate[]>([]);
  const [message, setMessage] = useState("Loading employees…");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [completedEmployeeIds, setCompletedEmployeeIds] = useState<Set<string>>(new Set());
  const [candidateOnboarding, setCandidateOnboarding] = useState<CandidateOnboarding[]>([]);
  const [employeeToRemove, setEmployeeToRemove] = useState<Employee | null>(null);
  const [separationType, setSeparationType] = useState<"FIRED" | "LEFT_COMPANY">("LEFT_COMPANY");
  const [separationReason, setSeparationReason] = useState("");
  const [removing, setRemoving] = useState(false);

  async function load() {
    setLoading(true);
    setMessage("");
    const [
      employeeResponse,
      selectedResponse,
      completedOnboardingResponse,
      candidateOnboardingResponse,
    ] = await Promise.all([
      fetch("/api/v1/employees?page=1&pageSize=100"),
      fetch("/api/v1/candidates?status=SELECTED&approval=FINAL_HIRED&page=1&pageSize=100"),
      fetch("/api/v1/onboarding?status=COMPLETED&page=1&pageSize=100"),
      fetch("/api/v1/candidates/onboarding"),
    ]);
    const employeeResult = await employeeResponse.json();
    const selectedResult = await selectedResponse.json();
    const completedOnboardingResult = await completedOnboardingResponse.json();
    const candidateOnboardingResult = await candidateOnboardingResponse.json();
    if (!employeeResponse.ok) {
      setLoading(false);
      return setMessage(employeeResult.error?.message || "Could not load employees");
    }
    if (!selectedResponse.ok) {
      setLoading(false);
      return setMessage(selectedResult.error?.message || "Could not load selected hires");
    }
    if (!completedOnboardingResponse.ok) {
      setLoading(false);
      return setMessage(
        completedOnboardingResult.error?.message || "Could not load onboarding status",
      );
    }
    if (!candidateOnboardingResponse.ok) {
      setLoading(false);
      return setMessage(
        candidateOnboardingResult.error?.message || "Could not load candidate onboarding",
      );
    }
    const employees = employeeResult.data.items as Employee[];
    const completedEmployeeIds = new Set(
      (completedOnboardingResult.data.items as CompletedOnboarding[]).map(
        (item) => item.employee.id,
      ),
    );
    setItems(employees);
    setCompletedEmployeeIds(completedEmployeeIds);
    setCandidateOnboarding(candidateOnboardingResult.data as CandidateOnboarding[]);
    setSelected(
      selectedResult.data.items.filter((candidate: SelectedCandidate) => {
        const employee = employees.find((item) => item.candidateId === candidate.id);
        return !employee || !completedEmployeeIds.has(employee.id);
      }),
    );
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function addToOnboarding(employeeId: string) {
    setFeedback("Adding employee to onboarding…");
    const response = await fetch("/api/v1/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ employeeId }),
    });
    const result = await response.json();
    setFeedback(
      response.ok
        ? "Employee added to onboarding."
        : result.error?.message || "Could not add employee to onboarding",
    );
  }

  async function startOnboarding(candidateId: string, employeeId?: string) {
    if (employeeId) return addToOnboarding(employeeId);
    setFeedback("Creating the employee record and starting onboarding…");
    const response = await fetch(`/api/v1/candidates/${candidateId}/convert-to-employee`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const result = await response.json();
    if (!response.ok) return setFeedback(result.error?.message || "Could not start onboarding");
    if (result.data.created) {
      setFeedback("Employee created and onboarding started.");
      return load();
    }
    await addToOnboarding(result.data.employee.id);
    await load();
  }

  async function removeEmployee() {
    if (!employeeToRemove || separationReason.trim().length < 3) {
      setFeedback("Enter a reason before removing the employee.");
      return;
    }
    setRemoving(true);
    const response = await fetch(`/api/v1/employees/${employeeToRemove.id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ separationType, reason: separationReason.trim() }),
    });
    const result = await response.json();
    setRemoving(false);
    if (!response.ok) {
      setFeedback(result.error?.message || "Could not remove employee");
      return;
    }
    setEmployeeToRemove(null);
    setSeparationReason("");
    setFeedback("Employee moved to the Former Employees archive.");
    await load();
  }

  return (
    <main className="page-shell space-y-6 pb-12">
      {/* Hero Banner */}
      <section className="enterprise-hero prism-light relative overflow-hidden rounded-xl border border-primary/20 bg-card p-6 md:p-8 text-foreground shadow-sm">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-info/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-ink">
              Employee Lifecycle
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Employees
            </h1>
            <p className="text-sm text-primary-ink/75 font-medium max-w-lg">
              Manage selected hires and employee records from one workspace.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-2xl bg-muted hover:bg-muted border border-white/20 px-4 py-2.5 text-xs font-bold text-foreground shadow-lg backdrop-blur-md transition-all active:scale-95"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </button>
            <Link
              href="/hr/onboarding"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary hover:bg-primary border border-primary/40 px-4 py-2.5 text-xs font-bold text-foreground shadow-lg transition-all active:scale-95"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              Onboarding
            </Link>
            <Link
              href="/hr/archive/employees"
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-muted"
            >
              <Archive className="h-3.5 w-3.5" />
              Former employees
            </Link>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Selected Hires
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-light dark:bg-warning-light/60 text-warning-ink dark:text-warning-ink">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {selected.length}
            </span>
            <p className="text-xs text-muted-foreground font-medium mt-1">Ready to onboard</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Active Employees
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-light dark:bg-success-light/60 text-success-ink dark:text-success-ink">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-bold tracking-tight text-foreground">
              {items.length}
            </span>
            <p className="text-xs text-muted-foreground font-medium mt-1">In employee directory</p>
          </div>
        </div>
      </div>

      {/* Feedback message */}
      {feedback && (
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm font-semibold",
            feedback.includes("Could not") || feedback.includes("Adding")
              ? "bg-warning-light dark:bg-warning-light/40 text-warning-ink dark:text-warning-ink border border-warning/60"
              : "bg-success-light dark:bg-success-light/40 text-success-ink dark:text-success-ink border border-success/60",
          )}
        >
          {feedback}
        </div>
      )}

      {/* Error / Loading */}
      {loading && (
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4 animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin text-primary-ink" />
          <span className="text-sm font-semibold text-muted-foreground">
            Loading employee workspace…
          </span>
        </div>
      )}
      {message && !loading && (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
          <p className="text-sm font-semibold text-destructive-ink dark:text-destructive-ink">
            {message}
          </p>
        </div>
      )}

      {!loading && !message && (
        <>
          {/* Selected Candidates Section */}
          <section className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-warning-ink dark:text-warning-ink">
                  Selected Hires
                </p>
                <h2 className="text-lg font-semibold text-foreground">Ready to Onboard</h2>
              </div>
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-warning-light dark:bg-warning-light/60 text-warning-ink dark:text-warning-ink text-xs font-bold">
                {selected.length}
              </span>
            </div>
            <div className="p-6 space-y-2.5">
              {selected.length === 0 && (
                <div className="rounded-2xl border border-border/40 bg-muted/30 p-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">
                    No selected candidates found.
                  </p>
                </div>
              )}
              {selected.map((candidate) => {
                const employee = items.find((item) => item.candidateId === candidate.id);
                const completion = candidateOnboarding.find((item) => item.id === candidate.id);
                const candidateDetailsComplete = completion?.status === "COMPLETED";
                const employeePreviewHref = employee
                  ? `/hr/employees/${employee.id}`
                  : `/hr/employees/selected/${candidate.id}`;
                return (
                  <div
                    key={candidate.id}
                    className="group flex flex-wrap items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-warning/40 hover:bg-card hover:shadow-md"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-light dark:bg-warning-light/60 text-warning-ink dark:text-warning-ink font-bold text-sm">
                      {candidate.firstName[0]}
                      {candidate.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={employeePreviewHref}
                        className="block font-semibold text-sm text-foreground group-hover:text-warning-ink transition-colors truncate"
                      >
                        {candidate.firstName} {candidate.lastName}
                      </Link>
                      <span className="block text-xs text-muted-foreground font-medium truncate">
                        {candidate.referenceNo} · {candidate.email}
                      </span>
                    </div>
                    <div className="hidden sm:block min-w-0 max-w-[160px]">
                      <span className="block text-sm font-semibold text-foreground truncate">
                        {candidate.roleOfInterest || "—"}
                      </span>
                      <span className="block text-xs text-muted-foreground font-medium">
                        {candidate.phone}
                      </span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-warning-light dark:bg-warning-light/60 text-warning-ink dark:text-warning-ink shrink-0">
                      {candidate.source === "WALK_IN" ? "Walk-in" : "Online"}
                    </span>
                    <Link
                      href={employeePreviewHref}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary hover:bg-primary px-3 py-1.5 text-xs font-bold text-white transition-colors shrink-0"
                    >
                      Preview
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    {employee || candidateDetailsComplete ? (
                      <button
                        type="button"
                        onClick={() => void startOnboarding(candidate.id, employee?.id)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-success px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-success shrink-0"
                      >
                        <BriefcaseBusiness className="h-3 w-3" />
                        {employee ? "Open onboarding" : "Convert to employee"}
                      </button>
                    ) : (
                      <Link
                        href={`/hr/candidates/${candidate.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-primary shrink-0"
                      >
                        <BriefcaseBusiness className="h-3 w-3" />
                        {completion?.status === "ACTIVE"
                          ? "Open candidate onboarding"
                          : "Request details"}
                      </Link>
                    )}
                    {!employee && (
                      <CandidateRemovalButton
                        candidateId={candidate.id}
                        candidateName={`${candidate.firstName} ${candidate.lastName}`}
                        onRemoved={load}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Employee Directory Section */}
          <section className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink dark:text-primary-ink">
                  Employee Directory
                </p>
                <h2 className="text-lg font-semibold text-foreground">Active Team</h2>
              </div>
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-primary-light dark:bg-primary-light/60 text-primary-ink dark:text-primary-ink text-xs font-bold">
                {items.length}
              </span>
            </div>
            <div className="p-6 space-y-2.5">
              {items.length === 0 && (
                <div className="rounded-2xl border border-border/40 bg-muted/30 p-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">
                    No employee records found.
                  </p>
                </div>
              )}
              {items.map((employee) => (
                <div
                  key={employee.id}
                  className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-md"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light dark:bg-primary-light/60 text-primary-ink dark:text-primary-ink font-bold text-sm">
                    {employee.firstName[0]}
                    {employee.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/hr/employees/${employee.id}`}
                      className="block font-semibold text-sm text-foreground group-hover:text-primary-ink transition-colors truncate"
                    >
                      {employee.employeeNo} · {employee.firstName} {employee.lastName}
                    </Link>
                    <span className="block text-xs text-muted-foreground font-medium truncate">
                      {employee.jobTitle} · {employee.department || "No department"} ·{" "}
                      {employee.email}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0",
                      EMPLOYEE_STATUS_COLORS[employee.status] || "bg-muted text-muted-foreground",
                    )}
                  >
                    {employee.status}
                  </span>
                  {employee.candidateId && (
                    <Link
                      href={`/hr/candidates/${encodeURIComponent(employee.candidateId)}/preview`}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary bg-primary-light px-3 py-1.5 text-xs font-bold text-primary-ink transition-colors hover:border-primary hover:bg-primary-light dark:border-primary/60 dark:bg-primary-light/40 dark:text-primary-ink dark:hover:bg-primary-light/70 shrink-0"
                    >
                      Preview candidate
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                  {!completedEmployeeIds.has(employee.id) && (
                    <button
                      type="button"
                      onClick={() => void addToOnboarding(employee.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card hover:bg-primary-light dark:hover:bg-primary-light/40 hover:border-primary/40 px-3 py-1.5 text-xs font-bold text-foreground hover:text-primary-ink transition-colors shrink-0"
                    >
                      Add to onboarding
                    </button>
                  )}
                  <button
                    type="button"
                    title="Remove employee"
                    onClick={() => {
                      setEmployeeToRemove(employee);
                      setSeparationType("LEFT_COMPANY");
                      setSeparationReason("");
                    }}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-destructive/40 text-destructive transition-colors hover:bg-destructive-light"
                    aria-label={`Remove ${employee.firstName} ${employee.lastName}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
      {employeeToRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-employee-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase text-destructive">Employee lifecycle</p>
                <h2 id="remove-employee-title" className="mt-1 text-xl font-bold text-foreground">
                  Remove {employeeToRemove.firstName} {employeeToRemove.lastName}?
                </h2>
              </div>
              <button
                type="button"
                title="Close"
                onClick={() => setEmployeeToRemove(null)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              The employee will leave the active directory. Employment history and compliance
              records will remain available in Archive.
            </p>
            <fieldset className="mt-5">
              <legend className="text-sm font-bold text-foreground">Separation type</legend>
              <div className="mt-2 flex gap-2">
                {[
                  ["LEFT_COMPANY", "Left company"],
                  ["FIRED", "Fired"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={separationType === value}
                    onClick={() => setSeparationType(value as "FIRED" | "LEFT_COMPANY")}
                    className={cn(
                      "flex-1 rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors",
                      separationType === value
                        ? value === "FIRED"
                          ? "border-destructive bg-destructive-light text-destructive-ink"
                          : "border-info bg-info-light text-info-ink"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="mt-4 block text-sm font-bold text-foreground">
              Reason
              <textarea
                value={separationReason}
                onChange={(event) => setSeparationReason(event.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Record the reason for this action"
                className="mt-2 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none focus:border-primary"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEmployeeToRemove(null)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removing || separationReason.trim().length < 3}
                onClick={() => void removeEmployee()}
                className="inline-flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-bold text-destructive-foreground disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {removing ? "Removing..." : "Remove employee"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
