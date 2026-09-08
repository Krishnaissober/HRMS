"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, CalendarCheck, Search, Plus, ArrowRight, Clock, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Interview = {
  id: string;
  referenceNo: string;
  scheduledStart: string;
  timezone: string;
  status: string;
  candidate: { firstName: string; lastName: string };
};
type CandidateToSchedule = {
  id: string;
  referenceNo: string;
  firstName: string;
  lastName: string;
  email: string;
  roleOfInterest: string;
  status: string;
  applications: { id: string; status: string }[];
  interviews: { id: string; status: string }[];
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
  RESCHEDULED: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
  CHECKED_IN: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  COMPLETED: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  NO_SHOW: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
};

const CANDIDATE_STATUS_COLORS: Record<string, string> = {
  APPLIED: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
  SCREENING: "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300",
  SHORTLISTED: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
  INTERVIEW: "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300",
};

export default function InterviewListPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Interview[]>([]);
  const [candidates, setCandidates] = useState<CandidateToSchedule[]>([]);
  const [message, setMessage] = useState("Loading interviews…");

  const load = useCallback(async () => {
    setMessage("Loading interviews…");
    const [interviewsResponse, candidatesResponse] = await Promise.all([
      fetch(`/api/v1/interviews?q=${encodeURIComponent(query)}`),
      fetch(`/api/v1/candidates?q=${encodeURIComponent(query)}&pageSize=100`),
    ]);
    const interviewsResult = await interviewsResponse.json();
    const candidatesResult = await candidatesResponse.json();
    if (!interviewsResponse.ok)
      return setMessage(interviewsResult.error?.message || "Could not load interviews");
    if (!candidatesResponse.ok)
      return setMessage(candidatesResult.error?.message || "Could not load candidates to schedule");
    setItems(interviewsResult.data.items);
    setCandidates(candidatesResult.data.items);
    setMessage("");
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const scheduled = items.filter((i) =>
    ["SCHEDULED", "RESCHEDULED", "CHECKED_IN"].includes(i.status),
  );
  const completed = items.filter((i) => i.status === "COMPLETED");
  const toBeScheduled = candidates.filter(
    (c) =>
      ["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW"].includes(c.status) &&
      c.interviews.length === 0,
  );
  const isLoading = message.startsWith("Loading");

  return (
    <main className="page-shell space-y-6 pb-12">
      {/* Hero Banner */}
      <section className="prism-light relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">
                Interview Management
              </p>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Interviews
              </h1>
              <p className="text-sm text-indigo-100/75 font-medium max-w-lg">
                Keep upcoming conversations moving and review completed interviews in one place.
              </p>
            </div>
            <Link
              href="/hr/interviews/new"
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 hover:bg-indigo-400 border border-indigo-400/40 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all active:scale-95 shrink-0 self-start"
            >
              <Plus className="h-3.5 w-3.5" />
              Create Interview
            </Link>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                placeholder="Search reference or candidate…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void load();
                }}
                className="w-full rounded-xl border border-white/20 bg-white/10 pl-10 pr-4 py-2.5 text-sm font-medium text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 backdrop-blur-md transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-bold text-white transition-colors"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </div>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "To Schedule", count: toBeScheduled.length, icon: Clock, color: "amber" },
          { label: "Scheduled", count: scheduled.length, icon: Calendar, color: "indigo" },
          { label: "Completed", count: completed.length, icon: CalendarCheck, color: "emerald" },
        ].map(({ label, count, icon: Icon, color }) => (
          <div
            key={label}
            className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                {label}
              </span>
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-xl",
                  color === "amber"
                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400"
                    : color === "emerald"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                      : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400",
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <span className="mt-3 block text-3xl font-black tracking-tight text-foreground">
              {count}
            </span>
          </div>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4 animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
          <span className="text-sm font-semibold text-muted-foreground">{message}</span>
        </div>
      )}

      {/* Section: To Be Scheduled */}
      <section className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Awaiting Scheduling
            </p>
            <h2 className="text-lg font-extrabold text-foreground">To Be Scheduled</h2>
          </div>
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-black">
            {toBeScheduled.length}
          </span>
        </div>
        <div className="p-6 space-y-2.5">
          {!toBeScheduled.length && (
            <p className="text-sm text-muted-foreground font-medium p-2">
              No candidates are waiting for an interview.
            </p>
          )}
          {toBeScheduled.map((candidate) => (
            <div
              key={candidate.id}
              className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-500/40 hover:bg-card hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-black text-sm">
                {candidate.firstName[0]}
                {candidate.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-extrabold text-sm text-foreground truncate">
                  {candidate.firstName} {candidate.lastName}
                </span>
                <span className="block text-xs text-muted-foreground font-medium truncate">
                  {candidate.referenceNo} · {candidate.roleOfInterest}
                </span>
              </div>
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0",
                  CANDIDATE_STATUS_COLORS[candidate.status] || "bg-muted text-muted-foreground",
                )}
              >
                {candidate.status}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/hr/candidates/${candidate.id}/preview`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card hover:bg-muted px-3 py-1.5 text-xs font-bold text-foreground transition-colors"
                >
                  Preview
                </a>
                <a
                  href={`/hr/interviews/new?candidateId=${encodeURIComponent(candidate.id)}&applicationId=${encodeURIComponent(candidate.applications[0]?.id || "")}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 text-xs font-bold text-white transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Schedule
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section: Scheduled */}
      <section className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Upcoming
            </p>
            <h2 className="text-lg font-extrabold text-foreground">Scheduled Interviews</h2>
          </div>
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-black">
            {scheduled.length}
          </span>
        </div>
        <div className="p-6 space-y-2.5">
          {!scheduled.length && (
            <p className="text-sm text-muted-foreground font-medium p-2">
              No scheduled interviews.
            </p>
          )}
          {scheduled.map((interview) => (
            <Link
              key={interview.id}
              href={`/hr/interviews/${interview.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:bg-card hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-sm">
                {interview.candidate.firstName[0]}
                {interview.candidate.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-extrabold text-sm text-foreground group-hover:text-indigo-600 transition-colors truncate">
                  {interview.candidate.firstName} {interview.candidate.lastName}
                </span>
                <span className="block text-xs text-muted-foreground font-medium">
                  {interview.referenceNo}
                </span>
              </div>
              <div className="hidden sm:block text-right shrink-0">
                <span className="block text-xs font-semibold text-foreground">
                  {new Date(interview.scheduledStart).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {new Date(interview.scheduledStart).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · {interview.timezone}
                </span>
              </div>
              <span
                className={cn(
                  "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0",
                  STATUS_COLORS[interview.status] || "bg-muted text-muted-foreground",
                )}
              >
                {interview.status.replace("_", " ")}
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      {/* Section: Completed */}
      <section className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Done
            </p>
            <h2 className="text-lg font-extrabold text-foreground">Completed Interviews</h2>
          </div>
          <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-black">
            {completed.length}
          </span>
        </div>
        <div className="p-6 space-y-2.5">
          {!completed.length && (
            <p className="text-sm text-muted-foreground font-medium p-2">
              No completed interviews.
            </p>
          )}
          {completed.map((interview) => (
            <Link
              key={interview.id}
              href={`/hr/interviews/${interview.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-500/40 hover:bg-card hover:shadow-md"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-sm">
                {interview.candidate.firstName[0]}
                {interview.candidate.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-extrabold text-sm text-foreground group-hover:text-emerald-600 transition-colors truncate">
                  {interview.candidate.firstName} {interview.candidate.lastName}
                </span>
                <span className="block text-xs text-muted-foreground font-medium">
                  {interview.referenceNo}
                </span>
              </div>
              <div className="hidden sm:block text-right shrink-0">
                <span className="block text-xs font-semibold text-foreground">
                  {new Date(interview.scheduledStart).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="block text-xs text-muted-foreground">{interview.timezone}</span>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                COMPLETED
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-emerald-600 transition-all shrink-0" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
