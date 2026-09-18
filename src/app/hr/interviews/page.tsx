"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  FilterX,
  MapPin,
  RefreshCw,
  Search,
  Video,
  Phone,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Interview = {
  id: string;
  referenceNo: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  mode: string;
  location?: string | null;
  meetingLink?: string | null;
  status: string;
  candidate: { firstName: string; lastName: string; referenceNo: string };
  participants: Array<{ user: { name: string | null; email: string } }>;
};

type Candidate = {
  id: string;
  referenceNo: string;
  firstName: string;
  lastName: string;
  roleOfInterest: string;
  status: string;
  applications: Array<{ id: string; status: string }>;
  interviews: Array<{ id: string; status: string }>;
};

type FilterValues = {
  query: string;
  status: string;
  interviewer: string;
  position: string;
  from: string;
  to: string;
};

const interviewStatuses = [
  "SCHEDULED",
  "RESCHEDULED",
  "CHECKED_IN",
  "COMPLETED",
  "NO_SHOW",
  "CANCELLED",
];
const statusLabels: Record<string, string> = {
  SCHEDULED: "Scheduled",
  RESCHEDULED: "Rescheduled",
  CHECKED_IN: "Checked in",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelled",
};
const candidateStatusLabels: Record<string, string> = {
  APPLIED: "New",
  SCREENING: "bg-info-light text-info-ink",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  SELECTED: "Selected",
  HOLD: "Hold",
  REJECTED: "Rejected",
};
const statusStyles: Record<string, string> = {
  SCHEDULED: "bg-info-light text-info-ink dark:bg-info-light/50 dark:text-info-ink",
  RESCHEDULED: "bg-warning-light text-warning-ink dark:bg-warning-light/50 dark:text-warning-ink",
  CHECKED_IN: "bg-success-light text-success-ink dark:bg-success-light/50 dark:text-success-ink",
  COMPLETED: "bg-success-light text-success-ink",
  NO_SHOW: "bg-destructive-light text-destructive-ink dark:bg-destructive-light/50 dark:text-destructive-ink",
  CANCELLED: "bg-muted text-muted-foreground",
};
const candidateStyles: Record<string, string> = {
  APPLIED: "bg-info-light text-info-ink dark:bg-info-light/50 dark:text-info-ink",
  SCREENING: "bg-info-light text-info-ink",
  SHORTLISTED: "bg-warning-light text-warning-ink dark:bg-warning-light/50 dark:text-warning-ink",
  INTERVIEW: "bg-info-light text-info-ink dark:bg-info-light/50 dark:text-info-ink",
  SELECTED: "bg-success-light text-success-ink dark:bg-success-light/50 dark:text-success-ink",
};

function date(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function time(value: string) {
  return new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function isToday(value: string) {
  const d = new Date(value);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}
function modeLabel(mode: string) {
  return mode === "VIDEO" ? "Video" : mode === "PHONE" ? "Phone" : "In person";
}
function ModeIcon({ mode }: { mode: string }) {
  return mode === "VIDEO" ? (
    <Video className="h-3.5 w-3.5" />
  ) : mode === "PHONE" ? (
    <Phone className="h-3.5 w-3.5" />
  ) : (
    <MapPin className="h-3.5 w-3.5" />
  );
}

export default function InterviewListPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [interviewer, setInterviewer] = useState("");
  const [position, setPosition] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [view, setView] = useState("ALL");
  const [items, setItems] = useState<Interview[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [message, setMessage] = useState("Loading interviews…");

  const load = useCallback(async (filters: FilterValues) => {
    setMessage("Loading interviews…");
    const params = new URLSearchParams({
      q: filters.query,
      page: "1",
      pageSize: "100",
      direction: "asc",
    });
    if (filters.status) params.set("status", filters.status);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    try {
      const [interviewsResponse, candidatesResponse] = await Promise.all([
        fetch(`/api/v1/interviews?${params}`),
        fetch(
          `/api/v1/candidates?q=${encodeURIComponent(filters.query)}&pageSize=100&direction=desc`,
        ),
      ]);
      const interviewsResult = await interviewsResponse.json();
      const candidatesResult = await candidatesResponse.json();
      if (!interviewsResponse.ok)
        throw new Error(interviewsResult.error?.message || "Could not load interviews");
      if (!candidatesResponse.ok)
        throw new Error(candidatesResult.error?.message || "Could not load candidate details");
      setItems(interviewsResult.data.items);
      setCandidates(candidatesResult.data.items);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load interviews");
    }
  }, []);

  useEffect(() => {
    void load({ query: "", status: "", interviewer: "", position: "", from: "", to: "" });
  }, [load]);
  const candidateByReference = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.referenceNo, candidate])),
    [candidates],
  );
  const enriched = useMemo(
    () =>
      items.map((interview) => ({
        interview,
        candidate: candidateByReference.get(interview.candidate.referenceNo),
      })),
    [candidateByReference, items],
  );
  const positions = useMemo(
    () =>
      [
        ...new Set(
          enriched.map(({ candidate }) => candidate?.roleOfInterest).filter(Boolean) as string[],
        ),
      ].sort(),
    [enriched],
  );
  const interviewers = useMemo(
    () =>
      [
        ...new Set(
          items.flatMap((item) =>
            item.participants.map((participant) => participant.user.name || participant.user.email),
          ),
        ),
      ].sort(),
    [items],
  );
  const filtered = useMemo(
    () =>
      enriched.filter(({ interview, candidate }) => {
        const matchesInterviewer =
          !interviewer ||
          interview.participants.some(
            (participant) => (participant.user.name || participant.user.email) === interviewer,
          );
        const matchesPosition = !position || candidate?.roleOfInterest === position;
        const matchesView =
          view === "ALL" ||
          (view === "TODAY" && isToday(interview.scheduledStart)) ||
          (view === "UPCOMING" &&
            new Date(interview.scheduledStart).getTime() >= Date.now() &&
            ["SCHEDULED", "RESCHEDULED", "CHECKED_IN"].includes(interview.status)) ||
          (view === "COMPLETED" && interview.status === "COMPLETED") ||
          (view === "CANCELLED" && interview.status === "CANCELLED");
        return matchesInterviewer && matchesPosition && matchesView;
      }),
    [enriched, interviewer, position, view],
  );
  const currentFilters = (): FilterValues => ({ query, status, interviewer, position, from, to });
  const isLoading = message.startsWith("Loading");
  const scheduled = items.filter((item) =>
    ["SCHEDULED", "RESCHEDULED", "CHECKED_IN"].includes(item.status),
  );
  const completed = items.filter((item) => item.status === "COMPLETED");
  const toBeScheduled = candidates.filter(
    (candidate) =>
      ["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW"].includes(candidate.status) &&
      candidate.interviews.length === 0,
  );

  function clearFilters() {
    setQuery("");
    setStatus("");
    setInterviewer("");
    setPosition("");
    setFrom("");
    setTo("");
    setView("ALL");
    void load({ query: "", status: "", interviewer: "", position: "", from: "", to: "" });
  }

  return (
    <main className="page-shell space-y-6 pb-12">
      <section className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-card px-5 py-6 shadow-sm sm:px-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Phase 1 · Hiring
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Interviews
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Schedule, run, and evaluate every interview from one focused workspace.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load(currentFilters())}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground transition hover:bg-muted"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </button>
          <Link
            href="/hr/interviews/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <CalendarPlus className="h-4 w-4" />
            Schedule interview
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border/70 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label="Search interviews"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void load(currentFilters());
                }}
                placeholder="Search candidate or interview reference"
                className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <button
              type="button"
              onClick={() => void load(currentFilters())}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter interview status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                void load({ ...currentFilters(), status: event.target.value });
              }}
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
            >
              <option value="">All statuses</option>
              {interviewStatuses.map((item) => (
                <option key={item} value={item}>
                  {statusLabels[item]}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter interviewer"
              value={interviewer}
              onChange={(event) => setInterviewer(event.target.value)}
              className="h-10 max-w-52 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
            >
              <option value="">All interviewers</option>
              {interviewers.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter position"
              value={position}
              onChange={(event) => setPosition(event.target.value)}
              className="h-10 max-w-52 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
            >
              <option value="">All positions</option>
              {positions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-muted-foreground">
              From
              <input
                aria-label="Interview from date"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="bg-transparent text-xs text-foreground outline-none"
              />
            </label>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-muted-foreground">
              To
              <input
                aria-label="Interview to date"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="bg-transparent text-xs text-foreground outline-none"
              />
            </label>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <FilterX className="h-4 w-4" />
              Clear filters
            </button>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto px-5 py-3 sm:px-6">
          {[
            { value: "ALL", label: `All (${items.length})` },
            {
              value: "TODAY",
              label: `Today (${items.filter((item) => isToday(item.scheduledStart)).length})`,
            },
            { value: "UPCOMING", label: `Upcoming (${scheduled.length})` },
            { value: "COMPLETED", label: `Completed (${completed.length})` },
            {
              value: "CANCELLED",
              label: `Cancelled (${items.filter((item) => item.status === "CANCELLED").length})`,
            },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setView(item.value)}
              className={cn(
                "shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition",
                view === item.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading && (
        <div
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 text-sm font-semibold text-muted-foreground"
          role="status"
        >
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          Loading interview workspace…
        </div>
      )}
      {!isLoading && message && (
        <div
          className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-4 text-sm font-semibold text-destructive"
          role="alert"
        >
          {message}
        </div>
      )}
      {!isLoading && !message && (
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  Interview queue
                </p>
                <h2 className="mt-1 text-base font-semibold text-foreground">
                  {view === "ALL"
                    ? "All interviews"
                    : view[0] + view.slice(1).toLowerCase() + " interviews"}
                </h2>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                {filtered.length}
              </span>
            </div>
            {filtered.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  No interviews match these filters.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Clear a filter or schedule a new interview.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {filtered.map(({ interview, candidate }) => (
                  <Link
                    key={interview.id}
                    href={`/hr/interviews/${interview.id}`}
                    className="group block px-5 py-4 transition hover:bg-muted/30 sm:px-6"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                        {interview.candidate.firstName[0]}
                        {interview.candidate.lastName[0]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-foreground group-hover:text-primary">
                          {interview.candidate.firstName} {interview.candidate.lastName}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {candidate?.roleOfInterest || "Position not specified"} ·{" "}
                          {interview.referenceNo}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-xs font-semibold text-foreground lg:w-48">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        {date(interview.scheduledStart)}
                        <span className="text-muted-foreground">
                          {time(interview.scheduledStart)}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground lg:w-40">
                        <span className="truncate">
                          {interview.participants[0]?.user.name ||
                            interview.participants[0]?.user.email ||
                            "Interviewer not assigned"}
                        </span>
                      </span>
                      <span className="flex items-center gap-1.5 text-xs text-muted-foreground lg:w-28">
                        <ModeIcon mode={interview.mode} />
                        {modeLabel(interview.mode)}
                      </span>
                      <span className="lg:w-28">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase",
                            statusStyles[interview.status] || "bg-muted text-muted-foreground",
                          )}
                        >
                          {statusLabels[interview.status] || interview.status}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                    <div className="mt-2 flex gap-2 pl-13 text-[11px] text-muted-foreground lg:hidden">
                      <span>{candidate?.roleOfInterest || "Position not specified"}</span>
                      <span>·</span>
                      <span>
                        {interview.participants[0]?.user.name || "Interviewer not assigned"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
          <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
            <div className="flex items-center justify-between border-b border-border/70 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-warning-ink dark:text-warning-ink">
                  Next action
                </p>
                <h2 className="mt-1 text-base font-semibold text-foreground">
                  Awaiting scheduling
                </h2>
              </div>
              <span className="rounded-full bg-warning-light px-2.5 py-1 text-xs font-bold text-warning-ink dark:bg-warning-light/50 dark:text-warning-ink">
                {toBeScheduled.length}
              </span>
            </div>
            {toBeScheduled.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm font-semibold text-foreground">
                  No candidates need scheduling.
                </p>
                <Link
                  href="/hr/candidates"
                  className="mt-3 inline-flex text-xs font-bold text-primary hover:underline"
                >
                  Open candidates <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {toBeScheduled.slice(0, 6).map((candidate) => (
                  <div key={candidate.id} className="px-5 py-4 sm:px-6">
                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning-light text-warning-ink dark:bg-warning-light/50 dark:text-warning-ink">
                        <Clock3 className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <Link
                          href={`/hr/candidates/${candidate.id}`}
                          className="block truncate text-sm font-bold text-foreground hover:text-primary"
                        >
                          {candidate.firstName} {candidate.lastName}
                        </Link>
                        <span className="mt-1 block truncate text-xs text-muted-foreground">
                          {candidate.roleOfInterest || "Position not specified"}
                        </span>
                      </span>
                      <Link
                        href={`/hr/interviews/new?candidateId=${encodeURIComponent(candidate.id)}&applicationId=${encodeURIComponent(candidate.applications[0]?.id || "")}`}
                        className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-bold text-primary-foreground"
                      >
                        Schedule
                      </Link>
                    </div>
                    <span
                      className={cn(
                        "mt-3 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase",
                        candidateStyles[candidate.status] || "bg-muted text-muted-foreground",
                      )}
                    >
                      {candidateStatusLabels[candidate.status] || candidate.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
