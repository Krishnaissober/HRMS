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
  REGISTERED: "bg-info-light dark:bg-info-light/60 text-info-ink dark:text-info-ink",
  CHECKED_IN: "bg-success-light dark:bg-success-light/60 text-success-ink dark:text-success-ink",
  CHECKED_OUT: "bg-muted dark:bg-muted text-muted-foreground dark:text-muted-foreground",
};

const DOT_COLORS: Record<string, string> = {
  REGISTERED: "bg-info animate-pulse",
  CHECKED_IN: "bg-success animate-pulse",
  CHECKED_OUT: "bg-muted",
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
    const response = await fetch(`/api/v1/attendance/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ visitId: id }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not update attendance");
    setItems((current) => current.map((item) => (item.id === id ? result.data : item)));
  }

  async function addException(id: string) {
    const notes = window.prompt("Exception notes");
    if (!notes?.trim()) return;
    const response = await fetch(`/api/v1/attendance/${id}/exception`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ exceptionType: "INVALID_ATTENDANCE_STATE", notes }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not record exception");
    setItems((current) => current.map((item) => (item.id === id ? result.data : item)));
  }

  useEffect(() => {
    void load();
  }, []);

  const isLoading = message.startsWith("Loading");

  return (
    <main className="page-shell space-y-6 pb-12">
      {/* Hero Banner */}
      <section className="enterprise-hero prism-light relative overflow-hidden rounded-xl border border-primary/20 bg-card p-6 md:p-8 text-foreground shadow-sm">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-info/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-ink">
              Candidate Attendance
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Attendance & Visitor Records
            </h1>
            <p className="text-sm text-primary-ink/75 font-medium max-w-lg">
              Track check-ins, check-outs, and visit exceptions for candidates and visitors.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-2xl bg-muted hover:bg-muted border border-white/20 px-4 py-2.5 text-xs font-bold text-foreground shadow-lg backdrop-blur-md transition-all active:scale-95"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
              Refresh
            </button>
            <Link
              href="/hr/visitors"
              className="inline-flex items-center gap-2 rounded-2xl bg-primary hover:bg-primary border border-primary/40 px-4 py-2.5 text-xs font-bold text-foreground shadow-lg transition-all active:scale-95"
            >
              <Users className="h-3.5 w-3.5" />
              Register Visitor
            </Link>
          </div>
        </div>
      </section>

      {/* Records Section */}
      <section className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink dark:text-primary-ink">
              Visit Records
            </p>
            <h2 className="text-lg font-semibold text-foreground">Today&apos;s Attendance</h2>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold text-foreground">{items.length}</span>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {isLoading && (
            <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4 animate-pulse">
              <RefreshCw className="h-4 w-4 animate-spin text-primary-ink" />
              <span className="text-sm font-semibold text-muted-foreground">{message}</span>
            </div>
          )}
          {!isLoading && message && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
              <p className="text-sm font-semibold text-destructive-ink dark:text-destructive-ink">{message}</p>
            </div>
          )}
          {!isLoading && !message && items.length === 0 && (
            <div className="rounded-2xl border border-border/40 bg-muted/30 p-10 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">
                No attendance records found.
              </p>
            </div>
          )}

          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-border/50 bg-background/60 p-4 transition-all duration-200 hover:border-primary/40 hover:bg-card hover:shadow-md"
            >
              <div className="flex items-start gap-4">
                {/* Status dot */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center">
                  <span
                    className={cn(
                      "h-3 w-3 rounded-full",
                      DOT_COLORS[item.status] || "bg-muted",
                    )}
                  />
                </div>

                {/* Candidate info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <span className="block font-semibold text-sm text-foreground">
                        {item.candidate.firstName} {item.candidate.lastName}
                      </span>
                      <span className="block text-xs text-muted-foreground font-medium">
                        {item.candidate.referenceNo} · {item.interview?.referenceNo || "Visitor"} ·
                        Host: {item.host?.name || "None"}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0",
                        STATUS_COLORS[item.status] || "bg-muted text-muted-foreground",
                      )}
                    >
                      {item.status.replace("_", " ")}
                    </span>
                  </div>

                  {/* Late/early flags */}
                  {(item.lateArrivalMinutes || item.earlyDepartureMinutes) && (
                    <div className="mt-2 flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-warning-ink" />
                      <span className="text-xs font-semibold text-warning-ink dark:text-warning-ink">
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
                    <button
                      type="button"
                      onClick={() => void updateVisit(item.id, "check-in")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-success hover:bg-success px-3 py-1.5 text-xs font-bold text-white transition-colors"
                    >
                      <LogIn className="h-3 w-3" />
                      Check In
                    </button>
                  )}
                  {item.status === "CHECKED_IN" && (
                    <button
                      type="button"
                      onClick={() => void updateVisit(item.id, "check-out")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-warning hover:bg-warning px-3 py-1.5 text-xs font-bold text-white transition-colors"
                    >
                      <LogOut className="h-3 w-3" />
                      Check Out
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void addException(item.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card hover:bg-destructive-light dark:hover:bg-destructive-light/40 hover:border-destructive/40 px-3 py-1.5 text-xs font-bold text-muted-foreground hover:text-destructive-ink transition-colors"
                  >
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
