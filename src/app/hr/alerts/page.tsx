"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlarmClock,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Interview = {
  id: string;
  referenceNo: string;
  scheduledStart: string;
  scheduledEnd?: string;
  timezone: string;
  status: string;
  candidate: { id?: string; firstName: string; lastName: string; referenceNo?: string };
};

type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  referenceNo: string;
  status: string;
  applications: Array<{ id: string }>;
  interviews: Array<{ id: string; status: string }>;
};

const activeInterviewStatuses = ["SCHEDULED", "RESCHEDULED", "CHECKED_IN"];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HiringAlertsPage() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState("Loading hiring alerts…");

  const load = useCallback(async () => {
    setMessage("Loading hiring alerts…");
    try {
      const [interviewsResponse, candidatesResponse] = await Promise.all([
        fetch("/api/v1/interviews?page=1&pageSize=100&direction=asc"),
        fetch("/api/v1/candidates?page=1&pageSize=100"),
      ]);
      const [interviewsResult, candidatesResult] = await Promise.all([
        interviewsResponse.json(),
        candidatesResponse.json(),
      ]);
      if (!interviewsResponse.ok)
        throw new Error(interviewsResult.error?.message || "Could not load interviews");
      if (!candidatesResponse.ok)
        throw new Error(candidatesResult.error?.message || "Could not load candidates");
      setInterviews(interviewsResult.data.items || []);
      setCandidates(candidatesResult.data.items || []);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load hiring alerts");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const now = new Date();
  const upcoming = interviews
    .filter((interview) => activeInterviewStatuses.includes(interview.status))
    .filter((interview) => new Date(interview.scheduledStart) >= now)
    .sort((a, b) => +new Date(a.scheduledStart) - +new Date(b.scheduledStart));
  const overdue = interviews.filter(
    (interview) =>
      activeInterviewStatuses.includes(interview.status) &&
      new Date(interview.scheduledStart) < now,
  );
  const waitingForInterview = candidates.filter(
    (candidate) =>
      ["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW"].includes(candidate.status) &&
      candidate.interviews.length === 0,
  );
  const monthInterviews = interviews.filter((interview) => {
    const date = new Date(interview.scheduledStart);
    return date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
  });
  const eventsByDay = useMemo(() => {
    const grouped = new Map<string, Interview[]>();
    monthInterviews.forEach((interview) => {
      const key = formatDayKey(new Date(interview.scheduledStart));
      grouped.set(key, [...(grouped.get(key) || []), interview]);
    });
    return grouped;
  }, [monthInterviews]);
  const calendarDays = useMemo(() => {
    const first = startOfMonth(month);
    const offset = (first.getDay() + 6) % 7;
    const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
      const day = new Date(month.getFullYear(), month.getMonth(), index - offset + 1);
      return { date: day, inMonth: day.getMonth() === month.getMonth() };
    });
  }, [month]);

  return (
    <main className="page-shell space-y-6 pb-12">
      <section className="prism-light relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">
              Phase 1 · Hiring
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Hiring alerts</h1>
            <p className="mt-2 max-w-xl text-sm font-medium text-indigo-100/75">
              See what needs attention today, upcoming interviews, and every scheduled conversation on one calendar.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition hover:bg-white/20 active:scale-95"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", message.startsWith("Loading") && "animate-spin")} />
            Refresh alerts
          </button>
        </div>
      </section>

      {message && (
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 text-sm font-semibold text-muted-foreground">
          {message.startsWith("Loading") && <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />}
          {message}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-indigo-200/60 bg-indigo-50/70 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/30">
          <AlarmClock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Upcoming interviews</p>
          <p className="mt-1 text-3xl font-black text-foreground">{upcoming.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-200/60 bg-amber-50/70 p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Needs attention</p>
          <p className="mt-1 text-3xl font-black text-foreground">{overdue.length + waitingForInterview.length}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/70 p-5 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <p className="mt-4 text-xs font-extrabold uppercase tracking-wider text-muted-foreground">This month</p>
          <p className="mt-1 text-3xl font-black text-foreground">{monthInterviews.length}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Schedule</p>
              <h2 className="text-xl font-black tracking-tight text-foreground">
                {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Previous month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => setMonth(startOfMonth(new Date()))} className="rounded-xl px-3 py-2 text-xs font-bold text-indigo-600 transition hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50">Today</button>
              <button type="button" aria-label="Next month" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-l border-t border-border/60">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <div key={day} className="border-b border-r border-border/60 bg-muted/40 p-2 text-center text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">{day}</div>)}
            {calendarDays.map(({ date, inMonth }) => {
              const dayEvents = eventsByDay.get(formatDayKey(date)) || [];
              return <div key={formatDayKey(date)} className={cn("min-h-24 border-b border-r border-border/60 p-2", !inMonth && "bg-muted/20 text-muted-foreground/40")}>
                <span className={cn("text-xs font-bold", formatDayKey(date) === formatDayKey(new Date()) && "inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-white")}>{date.getDate()}</span>
                <div className="mt-2 space-y-1">{dayEvents.slice(0, 2).map((event) => <Link key={event.id} href={`/hr/interviews/${event.id}`} className="block truncate rounded-md bg-indigo-100 px-1.5 py-1 text-[10px] font-bold text-indigo-700 transition hover:bg-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300">{new Date(event.scheduledStart).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {event.candidate.firstName}</Link>)}{dayEvents.length > 2 && <span className="block text-[10px] font-bold text-muted-foreground">+{dayEvents.length - 2} more</span>}</div>
              </div>;
            })}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-3xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Next up</p><h2 className="text-lg font-black text-foreground">Upcoming interviews</h2></div><Clock className="h-5 w-5 text-indigo-500" /></div>
            <div className="space-y-2">{upcoming.slice(0, 5).map((interview) => <Link key={interview.id} href={`/hr/interviews/${interview.id}`} className="flex items-center gap-3 rounded-2xl border border-border/50 p-3 transition hover:border-indigo-400/50 hover:bg-muted/40"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"><UserRound className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-foreground">{interview.candidate.firstName} {interview.candidate.lastName}</p><p className="text-xs font-medium text-muted-foreground">{formatDateTime(interview.scheduledStart)}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link>)}{upcoming.length === 0 && <p className="text-sm font-medium text-muted-foreground">No upcoming interviews.</p>}</div>
          </section>
          <section className="rounded-3xl border border-amber-200/60 bg-amber-50/50 p-5 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="mb-4 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /><h2 className="text-lg font-black text-foreground">Needs attention</h2></div>
            {waitingForInterview.length > 0 ? <Link href="/hr/interviews" className="flex items-center justify-between rounded-2xl bg-background/70 p-3 text-sm font-bold text-foreground transition hover:bg-background"><span>{waitingForInterview.length} candidate{waitingForInterview.length === 1 ? "" : "s"} waiting for scheduling</span><ArrowRight className="h-4 w-4 text-amber-600" /></Link> : <p className="text-sm font-medium text-muted-foreground">No candidates are waiting for scheduling.</p>}
            {overdue.length > 0 && <p className="mt-3 text-xs font-bold text-amber-700 dark:text-amber-300">{overdue.length} scheduled item{overdue.length === 1 ? "" : "s"} past its start time.</p>}
          </section>
        </div>
      </section>
    </main>
  );
}
