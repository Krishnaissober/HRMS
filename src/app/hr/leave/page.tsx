"use client";

import { useEffect, useState } from "react";
import { CalendarDays, RefreshCw, Clock, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type LeaveType = { id: string; name: string; code: string };
type Balance = {
  id: string;
  remainingDays: number;
  allocatedDays: string;
  usedDays: string;
  leaveType: LeaveType;
};
type Request = {
  id: string;
  startDate: string;
  endDate: string;
  durationDays: string;
  status: string;
  reason: string;
  leaveType: LeaveType;
  approvals: { id: string; decision: string; step: string; actor: { name: string } }[];
};

const REQUEST_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-warning-light dark:bg-warning-light/60 text-warning-ink dark:text-warning-ink",
  APPROVED: "bg-success-light dark:bg-success-light/60 text-success-ink dark:text-success-ink",
  REJECTED: "bg-destructive-light dark:bg-destructive-light/60 text-destructive-ink dark:text-destructive-ink",
  CANCELLED: "bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground",
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
    if (t.ok) {
      setTypes(typeResult.data);
      setLeaveTypeId((current) => current || typeResult.data[0]?.id || "");
    }
    setMessage("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/v1/leave-requests", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leaveTypeId, startDate, endDate, durationType, reason }),
    });
    const result = await response.json();
    setMessage(
      response.ok ? "Leave request submitted" : result.error?.message || "Could not request leave",
    );
    if (response.ok) {
      setReason("");
      await load();
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const isLoading = message.startsWith("Loading");
  const inputCls =
    "w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors";
  const labelCls =
    "block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5";

  return (
    <main className="page-shell space-y-6 pb-12">
      {/* Hero Banner */}
      <section className="enterprise-hero prism-light relative overflow-hidden rounded-xl border border-primary/20 bg-card p-6 md:p-8 text-foreground shadow-sm">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-success/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-ink">
              Employee Self-Service
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Leave Dashboard
            </h1>
            <p className="text-sm text-primary-ink/75 font-medium max-w-lg">
              View your leave balances, submit requests, and track approval status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-2xl bg-muted hover:bg-muted border border-white/20 px-4 py-2.5 text-xs font-bold text-foreground shadow-lg backdrop-blur-md transition-all active:scale-95 shrink-0 self-start"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </section>

      {/* Loading/feedback */}
      {message && (
        <div
          className={cn(
            "rounded-2xl px-4 py-3 text-sm font-semibold flex items-center gap-2 border",
            isLoading
              ? "bg-muted/60 text-muted-foreground border-border/40 animate-pulse"
              : message.includes("submitted")
                ? "bg-success-light dark:bg-success-light/40 text-success-ink dark:text-success-ink border-success/60"
                : "bg-destructive-light dark:bg-destructive-light/40 text-destructive-ink dark:text-destructive-ink border-destructive/60",
          )}
        >
          {isLoading && <RefreshCw className="h-4 w-4 animate-spin text-primary-ink" />}
          {message}
        </div>
      )}

      {/* Leave Balances */}
      {balances.length > 0 && (
        <section>
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink dark:text-primary-ink">
              Your Entitlements
            </p>
            <h2 className="text-xl font-semibold text-foreground">Leave Balances</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {balances.map((balance) => (
              <div
                key={balance.id}
                className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
              >
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                  {balance.leaveType.name}
                </span>
                <span className="mt-2 block text-3xl font-bold tracking-tight text-foreground">
                  {balance.remainingDays}
                </span>
                <div className="mt-2 space-y-0.5">
                  <span className="block text-[11px] text-muted-foreground font-medium">
                    Allocated: {balance.allocatedDays}
                  </span>
                  <span className="block text-[11px] text-muted-foreground font-medium">
                    Used: {balance.usedDays}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Request Form */}
        <section className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
          <div className="border-b border-border/50 pb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink dark:text-primary-ink">
              New Request
            </p>
            <h2 className="text-lg font-semibold text-foreground">Request Leave</h2>
          </div>
          <form className="space-y-4" onSubmit={submit}>
            <div>
              <label className={labelCls}>Leave Type</label>
              <select
                required
                value={leaveTypeId}
                onChange={(e) => setLeaveTypeId(e.target.value)}
                className={inputCls}
              >
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Duration</label>
              <select
                value={durationType}
                onChange={(e) => setDurationType(e.target.value)}
                className={inputCls}
              >
                <option value="FULL_DAY">Full day</option>
                <option value="HALF_DAY">Half day</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Start</label>
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>End</label>
                <input
                  required
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Reason</label>
              <textarea
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className={inputCls}
                placeholder="Reason for leave…"
              />
            </div>
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary hover:bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors"
            >
              <CalendarDays className="h-4 w-4" />
              Submit Request
            </button>
          </form>
        </section>

        {/* Request History */}
        <section className="lg:col-span-3 rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink dark:text-primary-ink">
                History
              </p>
              <h2 className="text-lg font-semibold text-foreground">Request History</h2>
            </div>
            <span className="text-sm font-bold text-foreground">{requests.length}</span>
          </div>
          <div className="p-6 space-y-2.5">
            {requests.length === 0 && (
              <div className="rounded-2xl border border-border/40 bg-muted/30 p-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-semibold text-muted-foreground">
                  No leave requests yet.
                </p>
              </div>
            )}
            {requests.map((request) => (
              <article
                key={request.id}
                className="rounded-2xl border border-border/50 bg-background/60 p-4 transition-all hover:border-primary/40 hover:bg-card hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">
                        {request.leaveType.name}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          REQUEST_STATUS_COLORS[request.status] || "bg-muted text-muted-foreground",
                        )}
                      >
                        {request.status}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground font-medium">
                      <Clock className="h-3 w-3" />
                      <span>
                        {request.startDate.slice(0, 10)} → {request.endDate.slice(0, 10)} ·{" "}
                        {request.durationDays} day(s)
                      </span>
                    </div>
                    {request.reason && (
                      <p className="mt-1.5 text-xs text-muted-foreground italic line-clamp-1">
                        {request.reason}
                      </p>
                    )}
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
