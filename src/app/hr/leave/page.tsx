"use client";

import { useEffect, useState } from "react";
import { CalendarDays, RefreshCw, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LeaveType = { id: string; name: string; code: string };
type Balance = { id: string; remainingDays: number; allocatedDays: string; usedDays: string; leaveType: LeaveType };
type Request = { id: string; startDate: string; endDate: string; durationDays: string; status: string; reason: string; leaveType: LeaveType; approvals: { id: string; decision: string; step: string; actor: { name: string } }[] };

const REQUEST_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
  APPROVED: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  REJECTED: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
  CANCELLED: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
};

export default function EmployeeLeavePage() {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [requests, setRequests] = useState<Request[]>([]);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationType, setDurationType] = useState("FULL_DAY");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("Loading leave…");

  async function load() {
    const [d, t] = await Promise.all([fetch("/api/v1/me/leave"), fetch("/api/v1/leave-types")]);
    const dashboard = await d.json();
    const typeResult = await t.json();
    if (!d.ok) return setMessage(dashboard.error?.message || "Could not load leave");
    setBalances(dashboard.data.balances);
    setRequests(dashboard.data.requests);
    if (t.ok) { setTypes(typeResult.data); setLeaveTypeId((current) => current || typeResult.data[0]?.id || ""); }
    setMessage("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/v1/leave-requests", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ leaveTypeId, startDate, endDate, durationType, reason }) });
    const result = await response.json();
    setMessage(response.ok ? "Leave request submitted" : result.error?.message || "Could not request leave");
    if (response.ok) { setReason(""); await load(); }
  }

  useEffect(() => { void load(); }, []);

  const isLoading = message.startsWith("Loading");
  const inputCls = "w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors";
  const labelCls = "block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5";

  return (
    <main className="page-shell space-y-6 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">Employee Self-Service</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Leave Dashboard</h1>
            <p className="text-sm text-indigo-100/75 font-medium max-w-lg">View your leave balances, submit requests, and track approval status.</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-all active:scale-95 shrink-0 self-start">
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </section>

      {/* Loading/feedback */}
      {message && (
        <div className={cn("rounded-2xl px-4 py-3 text-sm font-semibold flex items-center gap-2 border",
          isLoading ? "bg-muted/60 text-muted-foreground border-border/40 animate-pulse" :
          message.includes("submitted") ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60" :
          "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/60"
        )}>
          {isLoading && <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />}
          {message}
        </div>
      )}

      {/* Leave Balances */}
      {balances.length > 0 && (
        <section>
          <div className="mb-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Your Entitlements</p>
            <h2 className="text-xl font-extrabold text-foreground">Leave Balances</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {balances.map((balance) => (
              <div key={balance.id} className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground truncate">{balance.leaveType.name}</span>
                <span className="mt-2 block text-3xl font-black tracking-tight text-foreground">{balance.remainingDays}</span>
                <div className="mt-2 space-y-0.5">
                  <span className="block text-[11px] text-muted-foreground font-medium">Allocated: {balance.allocatedDays}</span>
                  <span className="block text-[11px] text-muted-foreground font-medium">Used: {balance.usedDays}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Request Form */}
        <section className="lg:col-span-2 rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
          <div className="border-b border-border/50 pb-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">New Request</p>
            <h2 className="text-lg font-extrabold text-foreground">Request Leave</h2>
          </div>
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className={labelCls}>Leave Type</label>
              <select required value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)} className={inputCls}>
                {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Duration</label>
              <select value={durationType} onChange={(e) => setDurationType(e.target.value)} className={inputCls}>
                <option value="FULL_DAY">Full day</option>
                <option value="HALF_DAY">Half day</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start</label>
                <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>End</label>
                <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Reason</label>
              <textarea required value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className={inputCls} placeholder="Reason for leave…" />
            </div>
            <button type="submit" className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white transition-colors">
              <CalendarDays className="h-4 w-4" />
              Submit Request
            </button>
          </form>
        </section>

        {/* Request History */}
        <section className="lg:col-span-3 rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">History</p>
              <h2 className="text-lg font-extrabold text-foreground">Request History</h2>
            </div>
            <span className="text-sm font-black text-foreground">{requests.length}</span>
          </div>
          <div className="p-6 space-y-2.5">
            {requests.length === 0 && (
              <div className="rounded-2xl border border-border/40 bg-muted/30 p-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-semibold text-muted-foreground">No leave requests yet.</p>
              </div>
            )}
            {requests.map((request) => (
              <article key={request.id} className="rounded-2xl border border-border/50 bg-background/60 p-4 transition-all hover:border-indigo-500/40 hover:bg-card hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-foreground">{request.leaveType.name}</span>
                      <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase", REQUEST_STATUS_COLORS[request.status] || "bg-muted text-muted-foreground")}>
                        {request.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Clock className="h-3 w-3" />
                      <span>{request.startDate.slice(0, 10)} → {request.endDate.slice(0, 10)} · {request.durationDays} day(s)</span>
                    </div>
                    {request.reason && <p className="mt-1.5 text-xs text-muted-foreground italic line-clamp-1">{request.reason}</p>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
