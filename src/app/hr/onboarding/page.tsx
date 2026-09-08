"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, CheckCircle2, AlertTriangle, RefreshCw, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Task = { status: string; dueDate: string | null; definition: { required: boolean } };
type Item = {
  id: string;
  status: string;
  employee: { employeeNo: string; firstName: string; lastName: string; status: string };
  template: { name: string };
  tasks: Task[];
  documents: Array<{ status: string }>;
};
const filters = ["ALL", "PRE_JOINING", "IN_PROGRESS", "COMPLETED", "BLOCKED"];

const FILTER_LABELS: Record<string, string> = {
  ALL: "All plans",
  PRE_JOINING: "Pre-joining",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  BLOCKED: "Blocked",
};

const STATUS_COLORS: Record<string, string> = {
  PRE_JOINING: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
  IN_PROGRESS: "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300",
  COMPLETED: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  BLOCKED: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
};

export default function OnboardingPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [message, setMessage] = useState("Loading onboarding…");

  const load = useCallback(async () => {
    setMessage("Loading onboarding…");
    const response = await fetch(
      `/api/v1/onboarding?page=1&pageSize=100${filter === "ALL" ? "" : `&status=${filter}`}`,
    );
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not load onboarding");
    setItems(result.data.items);
    setMessage("");
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(
    () =>
      items.reduce(
        (result, item) => {
          const completed = item.tasks.filter((task) => task.status === "COMPLETED").length;
          result.total += 1;
          result.completed += item.status === "COMPLETED" ? 1 : 0;
          result.tasks += completed;
          result.taskTotal += item.tasks.length;
          result.overdue += item.tasks.filter((task) => task.status === "OVERDUE").length;
          return result;
        },
        { total: 0, completed: 0, tasks: 0, taskTotal: 0, overdue: 0 },
      ),
    [items],
  );

  const isLoading = message.startsWith("Loading");

  return (
    <main className="page-shell space-y-6 pb-12">
      {/* Hero Banner */}
      <section className="prism-light relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">
              Employee Lifecycle
            </p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Onboarding
            </h1>
            <p className="text-sm text-indigo-100/75 font-medium max-w-lg">
              Prepare new employees before day one, guide their first 90 days, and keep every owner
              accountable.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-all active:scale-95 shrink-0 self-start"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </section>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
              Active Plans
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <span className="mt-3 block text-3xl font-black tracking-tight text-foreground">
            {summary.total - summary.completed}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {summary.completed} completed
          </span>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
              Task Progress
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <span className="mt-3 block text-3xl font-black tracking-tight text-foreground">
            {summary.tasks}
            <span className="text-lg text-muted-foreground font-bold">/{summary.taskTotal}</span>
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {summary.overdue} overdue
          </span>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
              Completion Rate
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <span className="mt-3 block text-3xl font-black tracking-tight text-foreground">
            {summary.taskTotal ? Math.round((summary.tasks / summary.taskTotal) * 100) : 0}%
          </span>
          <span className="text-xs text-muted-foreground font-medium">Across visible plans</span>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4 animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
          <span className="text-sm font-semibold text-muted-foreground">{message}</span>
        </div>
      )}

      {/* Filter tabs + list */}
      {!isLoading && (
        <section className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 border-b border-border/50 px-6 py-4 overflow-x-auto">
            {filters.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-extrabold transition-colors whitespace-nowrap",
                  filter === value
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {FILTER_LABELS[value] || value}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-2.5">
            {items.length === 0 && (
              <div className="rounded-2xl border border-border/40 bg-muted/30 p-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-semibold text-muted-foreground">
                  No onboarding plans match this filter.
                </p>
              </div>
            )}
            {items.map((item) => {
              const done = item.tasks.filter((task) => task.status === "COMPLETED").length;
              const percent = item.tasks.length ? Math.round((done / item.tasks.length) * 100) : 0;
              const documents = item.documents.filter((doc) => doc.status === "VERIFIED").length;
              return (
                <Link
                  key={item.id}
                  href={`/hr/onboarding/${item.id}`}
                  className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:bg-card hover:shadow-md"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-sm">
                    {item.employee.firstName[0]}
                    {item.employee.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-extrabold text-sm text-foreground group-hover:text-indigo-600 transition-colors truncate">
                        {item.employee.firstName} {item.employee.lastName}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0",
                          STATUS_COLORS[item.status] || "bg-muted text-muted-foreground",
                        )}
                      >
                        {item.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-muted-foreground shrink-0">
                        {percent}%
                      </span>
                    </div>
                    <span className="block text-xs text-muted-foreground font-medium">
                      {item.employee.employeeNo} · {item.template.name} · {done}/{item.tasks.length}{" "}
                      tasks · {documents} verified docs
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
