"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Users, CheckCircle2, AlertTriangle, RefreshCw, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { CandidateRemovalButton } from "@/components/candidates/CandidateRemovalButton";
import { OnboardingPlanArchiveButton } from "@/components/employees/OnboardingPlanArchiveButton";

type Task = { status: string; dueDate: string | null; definition: { required: boolean } };
type Item = {
  id: string;
  status: string;
  employee: { employeeNo: string; firstName: string; lastName: string; status: string };
  template: { name: string };
  tasks: Task[];
  documents: Array<{ status: string }>;
};
type CandidateOnboarding = {
  id: string;
  name: string;
  referenceNo: string;
  position: string;
  updatedAt: string;
  status: string;
  progress: number;
  missingFields: string[];
  link: { expiresAt: string } | null;
};
const filters = ["ALL", "PRE_JOINING", "IN_PROGRESS", "COMPLETED", "BLOCKED", "ARCHIVED"];

const FILTER_LABELS: Record<string, string> = {
  ALL: "All plans",
  PRE_JOINING: "Pre-joining",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  BLOCKED: "Blocked",
  ARCHIVED: "Archived",
};

const STATUS_COLORS: Record<string, string> = {
  PRE_JOINING: "bg-info-light dark:bg-info-light/60 text-info-ink dark:text-info-ink",
  IN_PROGRESS: "bg-primary-light dark:bg-primary-light/60 text-primary-ink dark:text-primary-ink",
  COMPLETED: "bg-success-light dark:bg-success-light/60 text-success-ink dark:text-success-ink",
  BLOCKED:
    "bg-destructive-light dark:bg-destructive-light/60 text-destructive-ink dark:text-destructive-ink",
  ARCHIVED: "bg-muted text-muted-foreground",
};

export default function OnboardingPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [candidateItems, setCandidateItems] = useState<CandidateOnboarding[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [message, setMessage] = useState("Loading onboarding…");

  const load = useCallback(async () => {
    setMessage("Loading onboarding…");
    const [response, candidateResponse] = await Promise.all([
      fetch(`/api/v1/onboarding?page=1&pageSize=100${filter === "ALL" ? "" : `&status=${filter}`}`),
      fetch("/api/v1/candidates/onboarding"),
    ]);
    const result = await response.json();
    const candidateResult = await candidateResponse.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not load onboarding");
    if (!candidateResponse.ok)
      return setMessage(candidateResult.error?.message || "Could not load candidate onboarding");
    setItems(result.data.items);
    setCandidateItems(candidateResult.data);
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
      <section className="enterprise-hero prism-light relative overflow-hidden rounded-xl border border-primary/20 bg-card p-6 md:p-8 text-foreground shadow-sm">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-success/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-ink">
              Employee Lifecycle
            </p>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Onboarding
            </h1>
            <p className="text-sm text-primary-ink/75 font-medium max-w-lg">
              Prepare new employees before day one, guide their first 90 days, and keep every owner
              accountable.
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

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Active Plans
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light dark:bg-primary-light/60 text-primary-ink dark:text-primary-ink">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <span className="mt-3 block text-3xl font-bold tracking-tight text-foreground">
            {items.filter((item) => !["COMPLETED", "ARCHIVED"].includes(item.status)).length}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {summary.completed} completed
          </span>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Task Progress
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-light dark:bg-success-light/60 text-success-ink dark:text-success-ink">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <span className="mt-3 block text-3xl font-bold tracking-tight text-foreground">
            {summary.tasks}
            <span className="text-lg text-muted-foreground font-bold">/{summary.taskTotal}</span>
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {summary.overdue} overdue
          </span>
        </div>
        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Completion Rate
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-light dark:bg-warning-light/60 text-warning-ink dark:text-warning-ink">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <span className="mt-3 block text-3xl font-bold tracking-tight text-foreground">
            {summary.taskTotal ? Math.round((summary.tasks / summary.taskTotal) * 100) : 0}%
          </span>
          <span className="text-xs text-muted-foreground font-medium">Across visible plans</span>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-primary bg-card shadow-sm dark:border-primary/60">
        <div className="flex flex-col gap-3 border-b border-border/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-ink dark:text-primary-ink">
              Selected candidates
            </p>
            <h2 className="mt-1 text-base font-semibold text-foreground">
              Candidate onboarding queue
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete the candidate self-service step before converting them into an employee.
            </p>
          </div>
          <span className="rounded-full bg-primary-light px-3 py-1.5 text-xs font-semibold text-primary-ink dark:bg-primary-light/50 dark:text-primary-ink">
            {candidateItems.length} waiting
          </span>
        </div>
        {candidateItems.length === 0 ? (
          <div className="flex items-center gap-3 px-6 py-8 text-sm font-semibold text-muted-foreground">
            <CheckCircle2 className="h-5 w-5 text-success-ink" /> No selected candidates are waiting
            for candidate onboarding.
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {candidateItems.map((item) => (
              <div
                key={item.id}
                className="group flex flex-col gap-3 px-6 py-4 transition hover:bg-muted/40 sm:flex-row sm:items-center"
              >
                <Link
                  href={`/hr/candidates/${item.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-xs font-bold text-primary-ink dark:bg-primary-light/50 dark:text-primary-ink">
                    {item.name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary">
                      {item.name}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.position} · {item.referenceNo}
                    </span>
                  </span>
                </Link>
                <div className="w-full sm:w-48">
                  <div className="mb-1 flex justify-between text-[11px] font-bold text-muted-foreground">
                    <span>{item.status.replaceAll("_", " ")}</span>
                    <span>{item.progress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
                <span className="flex items-center gap-2 text-xs font-bold text-primary">
                  {item.missingFields.length ? `${item.missingFields.length} pending` : "Review"}{" "}
                  <ArrowRight className="h-4 w-4" />
                </span>
                <CandidateRemovalButton
                  candidateId={item.id}
                  candidateName={item.name}
                  onRemoved={load}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4 animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin text-primary-ink" />
          <span className="text-sm font-semibold text-muted-foreground">{message}</span>
        </div>
      )}

      {/* Filter tabs + list */}
      {!isLoading && (
        <section className="rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 border-b border-border/50 px-6 py-4 overflow-x-auto">
            {filters.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={cn(
                  "rounded-xl px-4 py-2 text-xs font-semibold transition-colors whitespace-nowrap",
                  filter === value
                    ? "bg-primary text-white shadow-sm"
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
                <div
                  key={item.id}
                  className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-md"
                >
                  <Link
                    href={`/hr/onboarding/${item.id}`}
                    className="flex min-w-0 flex-1 items-center gap-4"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-sm font-bold text-primary-ink dark:bg-primary-light/60 dark:text-primary-ink">
                      {item.employee.firstName[0]}
                      {item.employee.lastName[0]}
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="truncate text-sm font-semibold text-foreground transition-colors group-hover:text-primary-ink">
                          {item.employee.firstName} {item.employee.lastName}
                        </span>
                        <span
                          className={cn(
                            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                            STATUS_COLORS[item.status] || "bg-muted text-muted-foreground",
                          )}
                        >
                          {item.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted dark:bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[11px] font-bold text-muted-foreground">
                          {percent}%
                        </span>
                      </div>
                      <span className="block text-xs font-medium text-muted-foreground">
                        {item.employee.employeeNo} · {item.template.name} · {done}/
                        {item.tasks.length} tasks · {documents} verified docs
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary-ink" />
                  </Link>
                  {filter !== "ARCHIVED" && (
                    <OnboardingPlanArchiveButton
                      onboardingId={item.id}
                      employeeName={`${item.employee.firstName} ${item.employee.lastName}`}
                      onArchived={load}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
