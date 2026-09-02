"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock, LogIn, LogOut, AlertTriangle, RefreshCw, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Visit = {
  id: string;
  status: string;
  visitDate: string;
  checkedInAt?: string | null;
  checkedOutAt?: string | null;
  lateArrivalMinutes?: number | null;
  earlyDepartureMinutes?: number | null;
  exceptionType?: string | null;
  candidate: { firstName: string; lastName: string; referenceNo: string };
  interview?: { referenceNo: string } | null;
  host?: { name: string } | null;
};

const STATUS_COLORS: Record<string, string> = {
  REGISTERED: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
  CHECKED_IN: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  CHECKED_OUT: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
};

const DOT_COLORS: Record<string, string> = {
  REGISTERED: "bg-blue-500 animate-pulse",
  CHECKED_IN: "bg-emerald-500 animate-pulse",
  CHECKED_OUT: "bg-slate-400",
};

export default function AttendancePage() {
  const [items, setItems] = useState<Visit[]>([]);
  const [message, setMessage] = useState("Loading attendance…");

  async function load() {
    setMessage("Loading attendance…");
    const response = await fetch("/api/v1/attendance?page=1&pageSize=50");
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not load attendance");
    setItems(result.data.items);
    setMessage(result.data.items.length ? "" : "No attendance records found.");
  }

  async function updateVisit(id: string, action: "check-in" | "check-out") {
    const response = await fetch(`/api/v1/attendance/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ visitId: id }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not update attendance");
    setItems((current) => current.map((item) => item.id === id ? result.data : item));
  }

  async function addException(id: string) {
    const notes = window.prompt("Exception notes");
    if (!notes?.trim()) return;
    const response = await fetch(`/api/v1/attendance/${id}/exception`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ exceptionType: "INVALID_ATTENDANCE_STATE", notes }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not record exception");
    setItems((current) => current.map((item) => item.id === id ? result.data : item));
  }

  useEffect(() => { void load(); }, []);

  const isLoading = message.startsWith("Loading");

  return (
    <main className="page-shell space-y-6 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">Candidate Attendance</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Attendance & Visitor Records</h1>
            <p className="text-sm text-indigo-100/75 font-medium max-w-lg">
              Track check-ins, check-outs, and visit exceptions for candidates and visitors.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-all active:scale-95">
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              Refresh
            </button>
            <Link href="/hr/visitors" className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 hover:bg-indigo-400 border border-indigo-400/40 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all active:scale-95">
              <Users className="h-3.5 w-3.5" />
              Register Visitor
            </Link>
          </div>
        </div>
      </section>

      {/* Records Section */}
      <section className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Visit Records</p>
            <h2 className="text-lg font-extrabold text-foreground">Today&apos;s Attendance</h2>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-black text-foreground">{items.length}</span>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {isLoading && (
            <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4 animate-pulse">
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
              <span className="text-sm font-semibold text-muted-foreground">{message}</span>
            </div>
          )}
          {!isLoading && message && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{message}</p>
            </div>
          )}
          {!isLoading && !message && items.length === 0 && (
            <div className="rounded-2xl border border-border/40 bg-muted/30 p-10 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">No attendance records found.</p>
            </div>
          )}

          {items.map((item) => (
            <article key={item.id} className="rounded-2xl border border-border/50 bg-background/60 p-4 transition-all duration-200 hover:border-indigo-500/40 hover:bg-card hover:shadow-md">
              <div className="flex items-start gap-4">
                {/* Status dot */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <span className={cn("h-3 w-3 rounded-full", DOT_COLORS[item.status] || "bg-slate-400")} />
                </div>

                {/* Candidate info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <span className="block font-extrabold text-sm text-foreground">
                        {item.candidate.firstName} {item.candidate.lastName}
                      </span>
                      <span className="block text-xs text-muted-foreground font-medium">
                        {item.candidate.referenceNo} · {item.interview?.referenceNo || "Visitor"} · Host: {item.host?.name || "None"}
                      </span>
                    </div>
                    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0", STATUS_COLORS[item.status] || "bg-muted text-muted-foreground")}>
                      {item.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Late/early flags */}
                  {(item.lateArrivalMinutes || item.earlyDepartureMinutes) && (
                    <div className="mt-2 flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {item.lateArrivalMinutes ? `${item.lateArrivalMinutes}m late` : ""}
                        {item.lateArrivalMinutes && item.earlyDepartureMinutes ? " · " : ""}
                        {item.earlyDepartureMinutes ? `${item.earlyDepartureMinutes}m early` : ""}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.status === "REGISTERED" && (
                    <button type="button" onClick={() => void updateVisit(item.id, "check-in")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition-colors">
                      <LogIn className="h-3 w-3" />
                      Check In
                    </button>
                  )}
                  {item.status === "CHECKED_IN" && (
                    <button type="button" onClick={() => void updateVisit(item.id, "check-out")} className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 px-3 py-1.5 text-xs font-bold text-white transition-colors">
                      <LogOut className="h-3 w-3" />
                      Check Out
                    </button>
                  )}
                  <button type="button" onClick={() => void addException(item.id)} className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-500/40 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-rose-600 transition-colors">
                    <AlertTriangle className="h-3 w-3" />
                    Exception
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
