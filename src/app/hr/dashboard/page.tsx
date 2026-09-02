"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileCheck2,
  RefreshCw,
  Settings,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  UserSearch,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { backendFetch } from "@/lib/backend";

type DashboardData = {
  overview: { applications: number; openPositions: number; pipelineCounts: Record<string, number> };
  kpis: { interviewNoShowRate: number; offerAcceptanceRate: number; averageTimeToHireDays: number | null };
  alerts: Array<{ id: string; title: string; body: string; actionableUrl: string | null }>;
  tasks: Array<{ id: string; title: string; sourceType: string; priority: string }>;
};

type User = { name?: string | null };

const quickActions = [
  ["Add candidate", "Create a new candidate record", "/hr/candidates/new", UserPlus, "bg-gradient-to-br from-indigo-500 to-indigo-700"],
  ["Schedule interview", "Schedule a candidate interview", "/hr/interviews/new", CalendarDays, "bg-gradient-to-br from-purple-500 to-purple-700"],
  ["Employees", "Manage converted employees and hires", "/hr/employees", Users, "bg-gradient-to-br from-blue-500 to-blue-700"],
  ["Start onboarding", "Begin employee onboarding", "/hr/onboarding", BriefcaseBusiness, "bg-gradient-to-br from-emerald-500 to-emerald-700"],
  ["Run payroll", "Open the payroll workflow", "/hr/payroll", WalletCards, "bg-gradient-to-br from-amber-500 to-amber-700"],
] as const;

const pipelineStages = [
  { key: "APPLIED", label: "Applied", icon: UserSearch, badgeColor: "bg-blue-500" },
  { key: "SCREENING", label: "Screening", icon: FileCheck2, badgeColor: "bg-indigo-500" },
  { key: "INTERVIEW", label: "Interview", icon: CalendarDays, badgeColor: "bg-purple-500" },
  { key: "SELECTED", label: "Selected", icon: Award, badgeColor: "bg-amber-500" },
  { key: "HIRED", label: "Hired", icon: UserCheck, badgeColor: "bg-emerald-500" },
] as const;

function cleanHref(value: string | null | undefined, fallback: string) {
  const url = new URL(value || fallback, "http://triple-minds.local");
  url.searchParams.delete("organizationId");
  return `${url.pathname}${url.search}${url.hash}`;
}

export default function HrDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("Loading your command center…");
  const [greeting, setGreeting] = useState("Good morning");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formattedDate, setFormattedDate] = useState("");
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    const now = new Date();
    setFormattedDate(
      now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    );
  }, []);

  useEffect(() => {
    void backendFetch("/health", { cache: "no-store" })
      .then((response) => setBackendStatus(response.ok ? "online" : "offline"))
      .catch(() => setBackendStatus("offline"));
  }, []);

  const load = useCallback(async () => {
    setIsRefreshing(true);
    setMessage("Loading your command center…");
    try {
      const [dashboardResponse, sessionResponse] = await Promise.all([
        fetch("/api/v1/dashboards/hr"),
        fetch("/api/v1/auth/session"),
      ]);
      const dashboardResult = await dashboardResponse.json();
      const sessionResult = await sessionResponse.json();
      if (!dashboardResponse.ok) throw new Error(dashboardResult.error?.message || "Could not load the HR dashboard");
      setData(dashboardResult.data);
      if (sessionResponse.ok) setUser(sessionResult.data.user);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the HR dashboard");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pipeline = data?.overview.pipelineCounts || {};
  const attentionItems = [
    ...(data?.alerts || []).map((item) => ({
      id: `alert-${item.id}`,
      title: item.title,
      description: item.body,
      status: "Alert",
      href: cleanHref(item.actionableUrl, "/hr/notifications"),
    })),
    ...(data?.tasks || []).map((item) => ({
      id: `task-${item.id}`,
      title: item.title,
      description: `${item.sourceType} · ${item.priority}`,
      status: "Task",
      href: "/hr/notifications",
    })),
  ].slice(0, 6);

  return (
    <main className="page-shell dashboard-command-center space-y-6 pb-12">
      {/* 1. Hero Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl">
        {/* Glowing backdrop Orbs */}
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-200 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-indigo-300 animate-pulse" />
              <span>Triple Minds HR</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px]", backendStatus === "online" ? "bg-emerald-400/20 text-emerald-200" : backendStatus === "offline" ? "bg-rose-400/20 text-rose-200" : "bg-white/10 text-indigo-200")}>{backendStatus === "online" ? "Backend connected" : backendStatus === "offline" ? "Backend offline" : "Connecting backend…"}</span>
              {formattedDate && (
                <>
                  <span className="h-1 w-1 rounded-full bg-indigo-400" />
                  <span className="text-indigo-300/80">{formattedDate}</span>
                </>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {greeting}{user?.name ? `, ${user.name}` : ""} 👋
            </h1>
            <p className="text-sm md:text-base text-indigo-100/75 max-w-xl font-medium">
              Here is your live real-time HR command dashboard for recruitment, operations, and team tasks.
            </p>
          </div>

          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void load()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-5 py-3 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-all duration-200 active:scale-95 disabled:opacity-50 shrink-0 self-start md:self-auto cursor-pointer"
          >
            <RefreshCw className={cn("h-4 w-4 text-indigo-200", isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? "Refreshing Data…" : "Refresh Dashboard"}</span>
          </button>
        </div>
      </section>

      {/* 2. Lifecycle workflow: the links clarify hand-offs without changing either intake or interview behavior. */}
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">People workflow</p>
            <h2 className="text-xl font-extrabold text-foreground">Move each hire through the lifecycle</h2>
          </div>
          <Link href="/hr/reports" className="text-sm font-bold text-indigo-600 hover:text-indigo-500">View reports <ArrowRight className="ml-1 inline h-3.5 w-3.5" /></Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            ["Phase 1", "Hire", "Candidates, interviews, and offers", "/hr/recruitment/dashboard", Users, "indigo"],
            ["Phase 2", "Onboard", "Employees, documents, and onboarding", "/hr/onboarding", UserPlus, "emerald"],
            ["Phase 3", "Operate", "Attendance, leave, payroll, and reports", "/hr/attendance", UserCheck, "amber"],
          ].map(([number, title, description, href, Icon, color]) => { const stepNumber = number as string; const stepTitle = title as string; const stepDescription = description as string; const stepHref = href as string; const stepColor = color as string; const StepIcon = Icon as typeof Users; return <Link href={stepHref} key={stepNumber} className="group flex items-center gap-3 rounded-2xl border border-border/50 bg-background/60 p-4 transition-colors hover:border-indigo-500/40 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20">
            <span className={cn("flex min-h-9 min-w-9 shrink-0 items-center justify-center rounded-xl px-2 text-xs font-black", stepColor === "emerald" ? "bg-emerald-100 text-emerald-700" : stepColor === "blue" ? "bg-blue-100 text-blue-700" : stepColor === "amber" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700")}>{stepNumber}</span>
            <span className="min-w-0"><strong className="block text-sm font-extrabold text-foreground">{stepTitle}</strong><small className="block truncate text-xs text-muted-foreground">{stepDescription}</small></span>
            <StepIcon className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>; })}
        </div>
      </section>

      {/* 2. Top Metric Cards (5 Column Grid) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Applications */}
        <Link
          href="/hr/candidates"
          className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Applications</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-foreground">{data?.overview.applications ?? 0}</span>
            <span className="inline-flex items-center text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full">
              Total Candidates
            </span>
          </div>
        </Link>

        {/* Metric 2: Open Positions */}
        <Link
          href="/hr/recruitment/dashboard"
          className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Open Positions</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <BriefcaseBusiness className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-foreground">{data?.overview.openPositions ?? 0}</span>
            <span className="inline-flex items-center text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-full">
              Active Jobs
            </span>
          </div>
        </Link>

        {/* Metric 3: Interview No-Show Rate */}
        <Link
          href="/hr/interviews"
          className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-rose-500/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">No-Show Rate</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform">
              <CalendarDays className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-foreground">{data?.kpis.interviewNoShowRate ?? 0}%</span>
            <span className="inline-flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-full">
              Target &lt;5%
            </span>
          </div>
        </Link>

        {/* Metric 4: Offer Acceptance Rate */}
        <Link
          href="/hr/offers"
          className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Offer Acceptance</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
              <Award className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-foreground">{data?.kpis.offerAcceptanceRate ?? 0}%</span>
            <span className="inline-flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
              Conversion
            </span>
          </div>
        </Link>

        {/* Metric 5: Avg Time to Hire */}
        <Link
          href="/hr/reports"
          className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-amber-500/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">Avg. Time to Hire</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black tracking-tight text-foreground">
              {data?.kpis.averageTimeToHireDays == null ? "—" : `${data.kpis.averageTimeToHireDays}d`}
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
              Speed Metric
            </span>
          </div>
        </Link>
      </section>

      {/* 3. Main Dashboard 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION: Recruitment Pipeline Visualizer */}
          <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Recruitment Workflow
                </p>
                <h2 className="text-lg font-extrabold text-foreground">Recruitment Pipeline Funnel</h2>
              </div>
              <Link
                href="/hr/recruitment/dashboard"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 transition-colors"
              >
                <span>Open Pipeline</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Pipeline Stage Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {pipelineStages.map(({ key, label, badgeColor, icon: StageIcon }) => {
                const count = pipeline[key] || 0;
                const maxCount = Math.max(...Object.values(pipeline).map((v) => Number(v) || 0), 1);
                const percentage = Math.min(100, Math.max(15, (count / maxCount) * 100));

                return (
                  <Link
                    key={key}
                    href={`/hr/candidates?status=${key}`}
                    className="group relative overflow-hidden rounded-2xl border border-border/50 bg-background/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:bg-card hover:shadow-md flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-extrabold tracking-wider text-muted-foreground uppercase">{label}</span>
                        <StageIcon className="h-4 w-4 text-muted-foreground group-hover:text-indigo-600 transition-colors" />
                      </div>
                      <span className="text-2xl font-black text-foreground block">{count}</span>
                    </div>

                    {/* Progress Bar Visualizer */}
                    <div className="mt-4 space-y-1.5">
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all duration-500", badgeColor)}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        View records <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* SECTION: Quick Actions */}
          <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
            <div className="border-b border-border/50 pb-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Move Work Forward
              </p>
              <h2 className="text-lg font-extrabold text-foreground">Quick Actions</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {quickActions.map(([title, description, href, Icon, gradient]) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-start gap-3.5 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:bg-card hover:shadow-md"
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md group-hover:scale-110 transition-transform",
                      gradient
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-extrabold text-sm text-foreground block truncate group-hover:text-indigo-600 transition-colors">
                      {title}
                    </span>
                    <span className="text-xs text-muted-foreground line-clamp-1 block mt-0.5 font-medium">{description}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </section>

          {/* SECTION: Daily Operations */}
          <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
            <div className="border-b border-border/50 pb-3">
              <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Daily Operations
              </p>
              <h2 className="text-lg font-extrabold text-foreground">Today at Triple Minds</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link
                href="/hr/attendance"
                className="group flex items-center justify-between rounded-2xl border border-border/50 bg-gradient-to-br from-indigo-50/50 via-background to-background dark:from-indigo-950/20 dark:to-background p-4.5 transition-all hover:border-indigo-500/40 hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md group-hover:scale-105 transition-transform">
                    <Users className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-base text-foreground block group-hover:text-indigo-600 transition-colors">
                      Attendance Today
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">Review present, late, absent & leave</span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-indigo-600 shrink-0 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/hr/interviews"
                className="group flex items-center justify-between rounded-2xl border border-border/50 bg-gradient-to-br from-purple-50/50 via-background to-background dark:from-purple-950/20 dark:to-background p-4.5 transition-all hover:border-purple-500/40 hover:shadow-md"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-md group-hover:scale-105 transition-transform">
                    <CalendarDays className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-base text-foreground block group-hover:text-purple-600 transition-colors">
                      Interviews Today
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">Review scheduled interviews & candidates</span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-purple-600 shrink-0 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (4 Columns) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Action Center: Needs Your Attention */}
          <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Action Center</p>
                <h2 className="text-lg font-extrabold text-foreground">Needs Attention</h2>
              </div>
              <Link href="/hr/notifications" className="text-xs font-bold text-indigo-600 hover:underline">
                View All
              </Link>
            </div>

            {/* Loading state */}
            {message && (
              <div className="flex items-center gap-2 rounded-2xl bg-muted/60 p-4 text-xs font-semibold text-muted-foreground animate-pulse">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                <span>{message}</span>
              </div>
            )}

            {/* Empty state */}
            {!message && !attentionItems.length && (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 text-center space-y-2">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="font-extrabold text-sm text-foreground">You’re all caught up!</p>
                <p className="text-xs text-muted-foreground font-medium">There are no pending alerts or assigned tasks right now.</p>
              </div>
            )}

            {/* Attention items list */}
            {!message && !!attentionItems.length && (
              <div className="space-y-2.5">
                {attentionItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="group flex items-start gap-3 rounded-2xl border border-border/50 bg-background/60 p-3.5 transition-all duration-150 hover:border-indigo-500/40 hover:bg-card hover:shadow-sm"
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 rounded-full shrink-0",
                        item.status === "Alert" ? "bg-rose-500 animate-pulse" : "bg-indigo-500"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-xs text-foreground truncate group-hover:text-indigo-600 transition-colors">
                          {item.title}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0",
                            item.status === "Alert"
                              ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300"
                              : "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300"
                          )}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-medium">{item.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Quick Management Shortcuts */}
          <section className="rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300">Quick Shortcuts</span>
              <h3 className="text-base font-extrabold text-white">Management Center</h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <Link
                href="/hr/candidates"
                className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 p-3 font-bold text-white transition-colors"
              >
                <Users className="h-4 w-4 text-indigo-300" />
                <span>Candidates</span>
              </Link>
              <Link
                href="/hr/employees"
                className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 p-3 font-bold text-white transition-colors"
              >
                <UserCheck className="h-4 w-4 text-indigo-300" />
                <span>Employees</span>
              </Link>
              <Link
                href="/hr/reports"
                className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 p-3 font-bold text-white transition-colors"
              >
                <BarChart3 className="h-4 w-4 text-indigo-300" />
                <span>Reports</span>
              </Link>
              <Link
                href="/me/profile"
                className="flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 p-3 font-bold text-white transition-colors"
              >
                <Settings className="h-4 w-4 text-indigo-300" />
                <span>Settings</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
