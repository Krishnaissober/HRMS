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
  PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { INDIA_FESTIVALS_2026 } from "@/lib/india-festivals";
import { StandbyClock } from "@/components/layout/standby-clock";

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
type Holiday = { id: string; holidayDate: string; name: string };

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
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [message, setMessage] = useState("Loading hiring alerts…");

  const load = useCallback(async () => {
    setMessage("Loading hiring alerts…");
    try {
      const [interviewsResponse, candidatesResponse] = await Promise.all([
        fetch("/api/v1/interviews?page=1&pageSize=100&direction=asc"),
        fetch("/api/v1/candidates?page=1&pageSize=100"),
      ]);
      const holidayResponse = await fetch(
        `/api/v1/holidays?from=${formatDayKey(new Date(month.getFullYear(), month.getMonth(), 1))}&to=${formatDayKey(new Date(month.getFullYear(), month.getMonth() + 1, 0))}`,
      );
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
      if (holidayResponse.ok) {
        const holidayResult = await holidayResponse.json();
        setHolidays(holidayResult.data || []);
      }
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load hiring alerts");
    }
  }, [month]);

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
  const holidaysByDay = useMemo(() => {
    const grouped = new Map<string, string[]>();
    [
      ...INDIA_FESTIVALS_2026.map(([date, name]) => ({ date, name })),
      ...holidays.map((holiday) => ({
        date: holiday.holidayDate.slice(0, 10),
        name: holiday.name,
      })),
    ].forEach((holiday) => {
      grouped.set(holiday.date, [...(grouped.get(holiday.date) || []), holiday.name]);
    });
    return grouped;
  }, [holidays]);
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
      <section className="enterprise-hero prism-light relative overflow-hidden rounded-xl border border-primary/20 bg-card p-6 text-foreground shadow-sm md:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-ink">
              Phase 1 · Hiring
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Hiring alerts</h1>
            <p className="mt-2 max-w-xl text-sm font-medium text-primary-ink/75">
              See what needs attention today, upcoming interviews, and every scheduled conversation
              on one calendar.
            </p>
          </div>
          <div className="hiring-alert-actions">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 self-start rounded-2xl border border-white/20 bg-muted px-4 py-2.5 text-xs font-bold text-foreground shadow-lg backdrop-blur-md transition hover:bg-muted active:scale-95"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", message.startsWith("Loading") && "animate-spin")}
              />
              Refresh alerts
            </button>
            <StandbyClock />
          </div>
        </div>
      </section>

      {message && (
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card p-4 text-sm font-semibold text-muted-foreground">
          {message.startsWith("Loading") && (
            <RefreshCw className="h-4 w-4 animate-spin text-primary-ink" />
          )}
          {message}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-primary/60 bg-primary-light/70 p-5 dark:border-primary/50 dark:bg-primary-light/30">
          <AlarmClock className="h-5 w-5 text-primary-ink dark:text-primary-ink" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Upcoming interviews
          </p>
          <p className="mt-1 text-3xl font-bold text-foreground">{upcoming.length}</p>
        </div>
        <div className="rounded-2xl border border-warning/60 bg-warning-light/70 p-5 dark:border-warning/50 dark:bg-warning-light/30">
          <AlertTriangle className="h-5 w-5 text-warning-ink dark:text-warning-ink" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Needs attention
          </p>
          <p className="mt-1 text-3xl font-bold text-foreground">
            {overdue.length + waitingForInterview.length}
          </p>
        </div>
        <div className="rounded-2xl border border-success/60 bg-success-light/70 p-5 dark:border-success/50 dark:bg-success-light/30">
          <CalendarDays className="h-5 w-5 text-success-ink dark:text-success-ink" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            This month
          </p>
          <p className="mt-1 text-3xl font-bold text-foreground">{monthInterviews.length}</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="calendar-alert-panel rounded-xl border border-border/60 bg-card p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink dark:text-primary-ink">
                Schedule
              </p>
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                className="rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setMonth(startOfMonth(new Date()))}
                className="rounded-xl px-3 py-2 text-xs font-bold text-primary-ink transition hover:bg-primary-light dark:text-primary-ink dark:hover:bg-primary-light/50"
              >
                Today
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                className="rounded-xl p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 border-l border-t border-border/60">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <div
                key={day}
                className="calendar-alert-weekday border-b border-r border-border/60 bg-muted/40 p-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {day}
              </div>
            ))}
            {calendarDays.map(({ date, inMonth }) => {
              const dayEvents = eventsByDay.get(formatDayKey(date)) || [];
              return (
                <div
                  key={formatDayKey(date)}
                  className={cn(
                    "calendar-alert-day min-h-24 border-b border-r border-border/60 p-2",
                    !inMonth && "bg-muted/20 text-muted-foreground/40",
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-bold",
                      formatDayKey(date) === formatDayKey(new Date()) &&
                        "inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white",
                    )}
                  >
                    {date.getDate()}
                  </span>
                  <div className="mt-2 space-y-1">
                    {(holidaysByDay.get(formatDayKey(date)) || []).slice(0, 1).map((holiday) => (
                      <span
                        key={holiday}
                        className="block truncate rounded-md bg-red-500/10 px-1.5 py-1 text-[10px] font-bold text-red-600 dark:text-red-300"
                        title={holiday}
                      >
                        • {holiday}
                      </span>
                    ))}
                    {dayEvents.slice(0, 2).map((event) => (
                      <Link
                        key={event.id}
                        href={`/hr/interviews/${event.id}`}
                        className="block truncate rounded-md bg-primary-light px-1.5 py-1 text-[10px] font-bold text-primary-ink transition hover:bg-primary-light dark:bg-primary-light/60 dark:text-primary-ink"
                      >
                        {new Date(event.scheduledStart).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        · {event.candidate.firstName}
                      </Link>
                    ))}
                    {dayEvents.length > 2 && (
                      <span className="block text-[10px] font-bold text-muted-foreground">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <section className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink dark:text-primary-ink">
                  Next up
                </p>
                <h2 className="text-lg font-bold text-foreground">Upcoming interviews</h2>
              </div>
              <Clock className="h-5 w-5 text-primary-ink" />
            </div>
            <div className="space-y-2">
              {upcoming.slice(0, 5).map((interview) => (
                <Link
                  key={interview.id}
                  href={`/hr/interviews/${interview.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-border/50 p-3 transition hover:border-primary/50 hover:bg-muted/40"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary-ink dark:bg-primary-light/60 dark:text-primary-ink">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {interview.candidate.firstName} {interview.candidate.lastName}
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">
                      {formatDateTime(interview.scheduledStart)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
              {upcoming.length === 0 && (
                <p className="text-sm font-medium text-muted-foreground">No upcoming interviews.</p>
              )}
            </div>
          </section>
          <section className="rounded-xl border border-warning/60 bg-warning-light/50 p-5 shadow-sm dark:border-warning/50 dark:bg-warning-light/20">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning-ink" />
              <h2 className="text-lg font-bold text-foreground">Needs attention</h2>
            </div>
            {waitingForInterview.length > 0 ? (
              <Link
                href="/hr/interviews"
                className="flex items-center justify-between rounded-2xl bg-background/70 p-3 text-sm font-bold text-foreground transition hover:bg-background"
              >
                <span>
                  {waitingForInterview.length} candidate
                  {waitingForInterview.length === 1 ? "" : "s"} waiting for scheduling
                </span>
                <ArrowRight className="h-4 w-4 text-warning-ink" />
              </Link>
            ) : (
              <p className="text-sm font-medium text-muted-foreground">
                No candidates are waiting for scheduling.
              </p>
            )}
            {overdue.length > 0 && (
              <p className="mt-3 text-xs font-bold text-warning-ink dark:text-warning-ink">
                {overdue.length} scheduled item{overdue.length === 1 ? "" : "s"} past its start
                time.
              </p>
            )}
          </section>
          <section className="rounded-xl border border-border/60 bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink">
                  Calendar
                </p>
                <h2 className="text-lg font-bold text-foreground">Festivals & holidays</h2>
              </div>
              <PartyPopper className="h-5 w-5 text-primary-ink" />
            </div>
            <div className="space-y-2">
              {[
                ...INDIA_FESTIVALS_2026.map(([date, name]) => ({ date, name, source: "India" })),
                ...holidays.map((item) => ({
                  date: item.holidayDate.slice(0, 10),
                  name: item.name,
                  source: "Company",
                })),
              ]
                .filter((item) => item.date >= formatDayKey(new Date()))
                .sort((a, b) => a.date.localeCompare(b.date))
                .slice(0, 5)
                .map((item) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-xl bg-muted/40 p-3"
                    key={`${item.date}-${item.name}`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(`${item.date}T12:00:00`).toLocaleDateString("en-IN", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {item.source}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
