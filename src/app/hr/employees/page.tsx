"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, UserCheck, RefreshCw, ArrowRight, CheckCircle2, BriefcaseBusiness } from "lucide-react";
import { cn } from "@/lib/utils";

type Employee = { id: string; candidateId?: string | null; employeeNo: string; firstName: string; lastName: string; email: string; jobTitle: string; department?: string | null; status: string };
type SelectedCandidate = { id: string; referenceNo: string; firstName: string; lastName: string; email: string; phone: string; roleOfInterest: string; status: string; source: string };

const EMPLOYEE_STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  INACTIVE: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
  TERMINATED: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
  ON_LEAVE: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
};

export default function EmployeesPage() {
  const [items, setItems] = useState<Employee[]>([]);
  const [selected, setSelected] = useState<SelectedCandidate[]>([]);
  const [message, setMessage] = useState("Loading employees…");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setMessage("");
    const [employeeResponse, selectedResponse] = await Promise.all([fetch("/api/v1/employees?page=1&pageSize=50"), fetch("/api/v1/candidates?status=SELECTED&page=1&pageSize=100")]);
    const employeeResult = await employeeResponse.json();
    const selectedResult = await selectedResponse.json();
    if (!employeeResponse.ok) { setLoading(false); return setMessage(employeeResult.error?.message || "Could not load employees"); }
    if (!selectedResponse.ok) { setLoading(false); return setMessage(selectedResult.error?.message || "Could not load selected hires"); }
    setItems(employeeResult.data.items);
    setSelected(selectedResult.data.items);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function addToOnboarding(employeeId: string) {
    setFeedback("Adding employee to onboarding…");
    const response = await fetch("/api/v1/onboarding", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ employeeId }) });
    const result = await response.json();
    setFeedback(response.ok ? "Employee added to onboarding." : result.error?.message || "Could not add employee to onboarding");
  }

  async function startOnboarding(candidateId: string, employeeId?: string) {
    if (employeeId) return addToOnboarding(employeeId);
    setFeedback("Creating the employee record and starting onboarding…");
    const response = await fetch(`/api/v1/candidates/${candidateId}/convert-to-employee`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
    const result = await response.json();
    if (!response.ok) return setFeedback(result.error?.message || "Could not start onboarding");
    if (result.data.created) {
      setFeedback("Employee created and onboarding started.");
      return load();
    }
    await addToOnboarding(result.data.employee.id);
    await load();
  }

  return (
    <main className="page-shell space-y-6 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">Employee Lifecycle</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Employees</h1>
            <p className="text-sm text-indigo-100/75 font-medium max-w-lg">
              Manage selected hires and employee records from one workspace.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-all active:scale-95">
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </button>
            <Link href="/hr/onboarding" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 hover:bg-indigo-400 border border-indigo-400/40 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all active:scale-95">
              <ArrowRight className="h-3.5 w-3.5" />
              Onboarding
            </Link>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Selected Hires</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black tracking-tight text-foreground">{selected.length}</span>
            <p className="text-xs text-muted-foreground font-medium mt-1">Ready to onboard</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Active Employees</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-black tracking-tight text-foreground">{items.length}</span>
            <p className="text-xs text-muted-foreground font-medium mt-1">In employee directory</p>
          </div>
        </div>
      </div>

      {/* Feedback message */}
      {feedback && (
        <div className={cn("rounded-2xl px-4 py-3 text-sm font-semibold", feedback.includes("Could not") || feedback.includes("Adding") ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60")}>
          {feedback}
        </div>
      )}

      {/* Error / Loading */}
      {loading && (
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4 animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
          <span className="text-sm font-semibold text-muted-foreground">Loading employee workspace…</span>
        </div>
      )}
      {message && !loading && (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
          <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{message}</p>
        </div>
      )}

      {!loading && !message && (
        <>
          {/* Selected Candidates Section */}
          <section className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Selected Hires</p>
                <h2 className="text-lg font-extrabold text-foreground">Ready to Onboard</h2>
              </div>
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-black">{selected.length}</span>
            </div>
            <div className="p-6 space-y-2.5">
              {selected.length === 0 && (
                <div className="rounded-2xl border border-border/40 bg-muted/30 p-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">No selected candidates found.</p>
                </div>
              )}
              {selected.map((candidate) => {
                const employee = items.find((item) => item.candidateId === candidate.id);
                const employeePreviewHref = employee ? `/hr/employees/${employee.id}` : `/hr/employees/selected/${candidate.id}`;
                return (
                  <div key={candidate.id} className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/40 hover:bg-card hover:shadow-md">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-black text-sm">
                      {candidate.firstName[0]}{candidate.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={employeePreviewHref} className="block font-extrabold text-sm text-foreground group-hover:text-amber-600 transition-colors truncate">
                        {candidate.firstName} {candidate.lastName}
                      </Link>
                      <span className="block text-xs text-muted-foreground font-medium truncate">{candidate.referenceNo} · {candidate.email}</span>
                    </div>
                    <div className="hidden sm:block min-w-0 max-w-[160px]">
                      <span className="block text-sm font-semibold text-foreground truncate">{candidate.roleOfInterest || "—"}</span>
                      <span className="block text-xs text-muted-foreground font-medium">{candidate.phone}</span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0">
                      {candidate.source === "WALK_IN" ? "Walk-in" : "Online"}
                    </span>
                    <Link href={employeePreviewHref} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white transition-colors shrink-0">
                      Preview
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                    <button type="button" onClick={() => void startOnboarding(candidate.id, employee?.id)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-emerald-700 shrink-0">
                        <BriefcaseBusiness className="h-3 w-3" />
                        Start onboarding
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Employee Directory Section */}
          <section className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Employee Directory</p>
                <h2 className="text-lg font-extrabold text-foreground">Active Team</h2>
              </div>
              <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-black">{items.length}</span>
            </div>
            <div className="p-6 space-y-2.5">
              {items.length === 0 && (
                <div className="rounded-2xl border border-border/40 bg-muted/30 p-8 text-center">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-muted-foreground">No employee records found.</p>
                </div>
              )}
              {items.map((employee) => (
                <div key={employee.id} className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:bg-card hover:shadow-md">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-sm">
                    {employee.firstName[0]}{employee.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/hr/employees/${employee.id}`} className="block font-extrabold text-sm text-foreground group-hover:text-indigo-600 transition-colors truncate">
                      {employee.employeeNo} · {employee.firstName} {employee.lastName}
                    </Link>
                    <span className="block text-xs text-muted-foreground font-medium truncate">{employee.jobTitle} · {employee.department || "No department"} · {employee.email}</span>
                  </div>
                  <span className={cn(
                    "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0",
                    EMPLOYEE_STATUS_COLORS[employee.status] || "bg-muted text-muted-foreground"
                  )}>
                    {employee.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => void addToOnboarding(employee.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:border-indigo-500/40 px-3 py-1.5 text-xs font-bold text-foreground hover:text-indigo-600 transition-colors shrink-0"
                  >
                    Add to onboarding
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
