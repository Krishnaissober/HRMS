"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type View = "day" | "week" | "month";
type LeaveRequest = {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  employee: { employeeNo: string; firstName: string; lastName: string };
  leaveType: { name: string };
};

const views: View[] = ["day", "week", "month"];

export default function LeaveCalendarPage() {
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [range, setRange] = useState("");
  const [message, setMessage] = useState("Loading leave calendar...");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (nextView: View, nextDate: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/leave-calendar?view=${nextView}&date=${encodeURIComponent(nextDate)}`,
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message || "Could not load leave calendar");
      setRequests(result.data.requests);
      setRange(`${result.data.from} to ${result.data.to}`);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load leave calendar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(view, date);
  }, [date, load, view]);

  return (
    <main className="page-shell space-y-6 pb-12">
      <section className="enterprise-hero prism-light relative overflow-hidden rounded-xl border border-primary/20 bg-card p-6 text-foreground shadow-sm md:p-8">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-ink">
              Workplace and leave
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Leave calendar</h1>
            <p className="mt-2 text-sm font-medium text-primary-ink/75">
              Review approved, pending, and rejected employee leave in one schedule.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(view, date)}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold disabled:opacity-60"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink">
              Schedule
            </p>
            <h2 className="mt-1 text-lg font-bold text-foreground">{range || "Leave period"}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-border bg-background p-1">
              {views.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={view === item}
                  onClick={() => setView(item)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-xs font-bold capitalize",
                    view === item
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
            <input
              aria-label="Calendar date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm"
            />
          </div>
        </div>

        {message && (
          <p
            className="mt-5 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm"
            role="status"
          >
            {message}
          </p>
        )}

        <div className="mt-5 space-y-2" data-testid={`leave-${view}-calendar`}>
          {!loading && !message && requests.length === 0 && (
            <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-border text-center">
              <CalendarDays className="h-7 w-7 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold text-muted-foreground">
                No leave requests in this period.
              </p>
            </div>
          )}
          {requests.map((request) => (
            <article
              key={request.id}
              className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/60 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="text-sm font-bold text-foreground">
                  {request.employee.employeeNo} - {request.employee.firstName}{" "}
                  {request.employee.lastName}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{request.leaveType.name}</p>
              </div>
              <div className="text-xs font-semibold text-muted-foreground md:text-right">
                <p>
                  {request.startDate.slice(0, 10)} to {request.endDate.slice(0, 10)}
                </p>
                <p className="mt-1 uppercase text-foreground">{request.status}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
