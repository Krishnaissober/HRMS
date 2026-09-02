"use client";

import { useEffect, useState } from "react";
import { WalletCards, RefreshCw, CheckCircle2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

type Run = {
  id: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  netTotal: string;
  results: Array<{ id: string; employee: { firstName: string; lastName: string }; netAmount: string }>;
};
type Expense = {
  id: string;
  category: string;
  amount: string;
  currency: string;
  approvalStatus: string;
  paymentStatus: string;
  employee: { firstName: string; lastName: string };
};

const RUN_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  PREPARED: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
  REVIEWED: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
  APPROVED: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
};

const EXPENSE_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
  APPROVED: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  REJECTED: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
};

export default function PayrollPage() {
  /* eslint-disable react-hooks/exhaustive-deps */
  const [organizationId, setOrganizationId] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [message, setMessage] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  async function api(path: string, init?: RequestInit) {
    const response = await fetch(path, { ...init, headers: { "content-type": "application/json", "x-organization-id": organizationId, ...init?.headers } });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || "Request failed");
    return body.data;
  }

  async function load(org = organizationId) {
    if (!org) return;
    try {
      const headers = { "x-organization-id": org };
      const [r, e] = await Promise.all([fetch("/api/v1/payroll-runs", { headers }), fetch("/api/v1/expenses", { headers })]);
      const rb = await r.json(), eb = await e.json();
      if (!r.ok) throw new Error(rb.error?.message);
      if (!e.ok) throw new Error(eb.error?.message);
      setRuns(rb.data);
      setExpenses(eb.data);
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load payroll");
    }
  }

  useEffect(() => {
    const org = new URLSearchParams(location.search).get("organizationId") || "";
    setOrganizationId(org);
    void load(org);
  }, []);

  async function salary() {
    try {
      await api("/api/v1/salary-structures", { method: "POST", body: JSON.stringify({ employeeId, currency: "USD", basicSalary: 5000, components: [] }) });
      setMessage("Salary structure saved");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Failed"); }
  }

  async function run() {
    try {
      await api("/api/v1/payroll-runs", { method: "POST", body: JSON.stringify({ periodStart, periodEnd, currency: "USD" }) });
      await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Failed"); }
  }

  async function transition(id: string, status: string) {
    try {
      await api(`/api/v1/payroll-runs/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Failed"); }
  }

  const inputCls = "w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors";
  const labelCls = "block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5";

  return (
    <main className="page-shell space-y-6 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">Payroll &amp; Expenses</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Payroll Workspace</h1>
            <p className="text-sm text-indigo-100/75 font-medium max-w-lg">Manage salary structures, run payroll cycles, and approve employee expenses.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <input
                aria-label="Organization ID"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
                placeholder="Organization ID…"
                className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none backdrop-blur-md w-48"
              />
              <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-all active:scale-95">
                <RefreshCw className="h-3.5 w-3.5" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback */}
      {message && (
        <div className={cn("rounded-2xl px-4 py-3 text-sm font-semibold border", message.includes("Could not") || message.includes("Failed") ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/60" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60")}>
          {message}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Salary Structure Card */}
        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
          <div className="border-b border-border/50 pb-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Configuration</p>
            <h2 className="text-lg font-extrabold text-foreground">Salary Structure</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Employee ID</label>
              <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="Enter employee ID…" className={inputCls} />
            </div>
            <button onClick={() => void salary()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white transition-colors">
              <CheckCircle2 className="h-4 w-4" />
              Save Standard Structure
            </button>
          </div>
        </section>

        {/* Payroll Run Card */}
        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
          <div className="border-b border-border/50 pb-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">New Cycle</p>
            <h2 className="text-lg font-extrabold text-foreground">Create Payroll Run</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Period Start</label>
              <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Period End</label>
              <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputCls} />
            </div>
          </div>
          <button onClick={() => void run()} className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2.5 text-sm font-bold text-white transition-colors">
            <WalletCards className="h-4 w-4" />
            Create Run
          </button>
        </section>
      </div>

      {/* Payroll Runs */}
      <section className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">History</p>
            <h2 className="text-lg font-extrabold text-foreground">Payroll Runs</h2>
          </div>
          <span className="text-sm font-black text-foreground">{runs.length}</span>
        </div>
        <div className="p-6 space-y-2.5">
          {runs.length === 0 && (
            <div className="rounded-2xl border border-border/40 bg-muted/30 p-8 text-center">
              <WalletCards className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">No payroll runs found.</p>
            </div>
          )}
          {runs.map((r) => (
            <article key={r.id} className="flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all hover:border-indigo-500/40 hover:bg-card hover:shadow-md">
              <div className="flex-1 min-w-0">
                <span className="block font-extrabold text-sm text-foreground">{r.periodStart.slice(0, 10)} – {r.periodEnd.slice(0, 10)}</span>
                <span className="block text-xs text-muted-foreground font-medium">{r.currency} {r.netTotal} net total</span>
              </div>
              <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0", RUN_STATUS_COLORS[r.status] || "bg-muted text-muted-foreground")}>
                {r.status}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {r.status === "DRAFT" && <button onClick={() => void transition(r.id, "PREPARED")} className="rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white transition-colors">Prepare</button>}
                {r.status === "PREPARED" && <button onClick={() => void transition(r.id, "REVIEWED")} className="rounded-xl bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-bold text-white transition-colors">Review</button>}
                {r.status === "REVIEWED" && <button onClick={() => void transition(r.id, "APPROVED")} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition-colors">Approve</button>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Expense Approvals */}
      <section className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Finance</p>
            <h2 className="text-lg font-extrabold text-foreground">Expense Approvals</h2>
          </div>
          <span className="text-sm font-black text-foreground">{expenses.length}</span>
        </div>
        <div className="p-6 space-y-2.5">
          {expenses.length === 0 && (
            <div className="rounded-2xl border border-border/40 bg-muted/30 p-8 text-center">
              <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">No expense records found.</p>
            </div>
          )}
          {expenses.map((e) => (
            <article key={e.id} className="flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all hover:border-rose-500/40 hover:bg-card hover:shadow-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-black text-sm">
                {e.employee.firstName[0]}{e.employee.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-extrabold text-sm text-foreground truncate">{e.employee.firstName} {e.employee.lastName}</span>
                <span className="block text-xs text-muted-foreground font-medium">{e.category} · {e.currency} {e.amount}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase", EXPENSE_STATUS_COLORS[e.approvalStatus] || "bg-muted text-muted-foreground")}>
                  {e.approvalStatus}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  {e.paymentStatus}
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
