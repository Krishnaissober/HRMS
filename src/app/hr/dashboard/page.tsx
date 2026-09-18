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
  FilePlus2,
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

type DashboardData = {
  user: User;
  overview: { applications: number; openPositions: number; pipelineCounts: Record<string, number> };
  kpis: {
    interviewNoShowRate: number;
    offerAcceptanceRate: number;
    averageTimeToHireDays: number | null;
  };
  alerts: Array<{ id: string; title: string; body: string; actionableUrl: string | null }>;
  tasks: Array<{ id: string; title: string; sourceType: string; priority: string }>;
};

type User = { name?: string | null };
type WorkflowCandidate = {
  id: string;
  status: string;
  hrReviewedAt?: string | null;
  hiringApprovalStatus?: string;
  interviews: Array<{ stage: string; status: string }>;
};
type CandidateOnboarding = { status: string };

const quickActions = [
  ["Add candidate", "Create a new candidate record", "/hr/candidates/new", UserPlus, "bg-primary"],
  [
    "Schedule interview",
    "Schedule a candidate interview",
    "/hr/interviews/new",
    CalendarDays,
    "bg-info",
  ],
  ["Employees", "Manage converted employees and hires", "/hr/employees", Users, "bg-info"],
  [
    "Start onboarding",
    "Begin employee onboarding",
    "/hr/onboarding",
    BriefcaseBusiness,
    "bg-success",
  ],
  ["Run payroll", "Open the payroll workflow", "/hr/payroll", WalletCards, "bg-warning"],
] as const;

const pipelineStages = [
  { key: "APPLIED", label: "Applied", icon: UserSearch, badgeColor: "bg-info" },
  { key: "SCREENING", label: "Screening", icon: FileCheck2, badgeColor: "bg-primary" },
  { key: "INTERVIEW", label: "Interview", icon: CalendarDays, badgeColor: "bg-info" },
  { key: "SELECTED", label: "Selected", icon: Award, badgeColor: "bg-success" },
  { key: "HIRED", label: "Hired", icon: UserCheck, badgeColor: "bg-success" },
] as const;

function cleanHref(value: string | null | undefined, fallback: string) {
  const url = new URL(value || fallback, "http://triple-minds.local");
  url.searchParams.delete("organizationId");
  return `${url.pathname}${url.search}${url.hash}`;
}

function dashboardDisplayName(name: string | null | undefined) {
  const trimmed = name?.trim() || "";
  if (!trimmed) return "";
  const normalized = trimmed.toLowerCase();
  if (normalized.includes("master admin") || normalized.includes("master administrator")) {
    return "Master";
  }
  if (normalized.includes("hr administrator") || normalized === "admin") return "Admin";
  return trimmed;
}

export default function HrDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [workflowCandidates, setWorkflowCandidates] = useState<WorkflowCandidate[]>([]);
  const [onboardingCount, setOnboardingCount] = useState(0);
  const [user, setUser] = useState<User | null>(null);
  const [message, setMessage] = useState("Loading your command center…");
  const [greeting, setGreeting] = useState("Good morning");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formattedDate, setFormattedDate] = useState("");
  const [appStatus, setAppStatus] = useState<"checking" | "online" | "offline">("checking");

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
      }),
    );
  }, []);

  const load = useCallback(async () => {
    setIsRefreshing(true);
    setMessage("Loading your command center…");
    try {
      const [dashboardResponse, candidatesResponse, onboardingResponse] = await Promise.all([
        fetch("/api/v1/dashboards/hr", { cache: "no-store" }),
        fetch("/api/v1/candidates?page=1&pageSize=100&direction=desc", { cache: "no-store" }),
        fetch("/api/v1/candidates/onboarding", { cache: "no-store" }),
      ]);
      if (dashboardResponse.status === 401) {
        window.location.replace("/");
        return;
      }
      const dashboardResult = await dashboardResponse.json();
      if (!dashboardResponse.ok)
        throw new Error(dashboardResult.error?.message || "Could not load the HR dashboard");
      setData(dashboardResult.data);
      if (candidatesResponse.ok) {
        const candidatesResult = await candidatesResponse.json();
        setWorkflowCandidates(candidatesResult.data.items as WorkflowCandidate[]);
      }
      if (onboardingResponse.ok) {
        const onboardingResult = await onboardingResponse.json();
        const onboardingItems = (onboardingResult.data || []) as CandidateOnboarding[];
        setOnboardingCount(onboardingItems.filter((item) => item.status !== "COMPLETED").length);
      }
      setUser(dashboardResult.data.user);
      setAppStatus("online");
      setMessage("");
    } catch (error) {
      setAppStatus("offline");
      setMessage(error instanceof Error ? error.message : "Could not load the HR dashboard");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pipeline = data?.overview.pipelineCounts || {};
  const pipelineTotal = Math.max(
    Number(data?.overview.applications) || 0,
    ...Object.values(pipeline).map((value) => Number(value) || 0),
    1,
  );
  const workflowAlerts = [
    {
      label: "Awaiting physical interview",
      description: "Online interview completed; schedule the in-office stage.",
      href: "/hr/interviews/new",
      icon: CalendarDays,
      tone: "info",
      count: workflowCandidates.filter(
        (candidate) =>
          candidate.status === "INTERVIEW" &&
          candidate.interviews.some(
            (item) => item.stage === "ONLINE" && item.status === "COMPLETED",
          ) &&
          !candidate.interviews.some(
            (item) => item.stage === "PHYSICAL" && item.status !== "CANCELLED",
          ),
      ).length,
    },
    {
      label: "Ready to send to Master",
      description: "Both interviews and the HR evaluation are complete.",
      href: "/hr/candidates?approval=ready",
      icon: FileCheck2,
      tone: "primary",
      count: workflowCandidates.filter(
        (candidate) =>
          candidate.hiringApprovalStatus === "NOT_REQUESTED" &&
          Boolean(candidate.hrReviewedAt) &&
          candidate.interviews.some(
            (item) => item.stage === "ONLINE" && item.status === "COMPLETED",
          ) &&
          candidate.interviews.some(
            (item) => item.stage === "PHYSICAL" && item.status === "COMPLETED",
          ),
      ).length,
    },
    {
      label: "Awaiting Master decision",
      description: "Packages currently in the Master Admin queue.",
      href: "/hr/candidates?approval=AWAITING_MASTER_REVIEW",
      icon: UserSearch,
      tone: "warning",
      count: workflowCandidates.filter(
        (candidate) => candidate.hiringApprovalStatus === "AWAITING_MASTER_REVIEW",
      ).length,
    },
    {
      label: "Master-approved · final HR hire",
      description: "Master approved; HR must still perform the final hire action.",
      href: "/hr/candidates?approval=MASTER_APPROVED",
      icon: UserCheck,
      tone: "success",
      count: workflowCandidates.filter(
        (candidate) => candidate.hiringApprovalStatus === "MASTER_APPROVED",
      ).length,
    },
    {
      label: "Rejected by Master",
      description: "Final HR rejection action is available.",
      href: "/hr/candidates?approval=MASTER_REJECTED",
      icon: CheckCircle2,
      tone: "danger",
      count: workflowCandidates.filter(
        (candidate) => candidate.hiringApprovalStatus === "MASTER_REJECTED",
      ).length,
    },
  ];
  const workflowAttentionTotal = workflowAlerts.reduce((total, item) => total + item.count, 0);
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
      <section className="enterprise-hero">
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="relative z-10 space-y-2">
            <div className="relative z-10 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary-ink backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-primary-ink" />
              <span>Triple Minds HR</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px]",
                  appStatus === "online"
                    ? "bg-success/20 text-success-ink"
                    : appStatus === "offline"
                      ? "bg-destructive/20 text-destructive-ink"
                      : "bg-white/10 text-primary-ink",
                )}
              >
                {appStatus === "online"
                  ? "System connected"
                  : appStatus === "offline"
                    ? "System offline"
                    : "Connecting system…"}
              </span>
              {formattedDate && (
                <>
                  <span className="h-1 w-1 rounded-full bg-primary" />
                  <span className="text-primary-ink/80">{formattedDate}</span>
                </>
              )}
            </div>
            <h1 className="relative z-10 text-2xl font-bold tracking-tight text-foreground  md:text-3xl">
              {greeting}
              {dashboardDisplayName(user?.name) ? `, ${dashboardDisplayName(user?.name)}` : ""}
            </h1>
            <p className="relative z-10 mx-auto max-w-2xl text-sm font-medium text-foreground  md:text-base">
              Your hiring pipeline, team activity, and priorities in one place.
            </p>
          </div>

          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void load()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4 text-primary-ink", isRefreshing && "animate-spin")} />
            <span>{isRefreshing ? "Refreshing Data…" : "Refresh Dashboard"}</span>
          </button>
        </div>
      </section>

      {/* 2. Top Metric Cards (5 Column Grid) */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Metric 1: Applications */}
        <Link
          href="/hr/candidates"
          aria-label={`${data?.overview.applications ?? 0} Applications`}
          className="group relative flex min-h-[136px] flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-primary/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Applications
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light dark:bg-primary-light/60 text-primary-ink dark:text-primary-ink group-hover:scale-110 transition-transform">
              <Users className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {data?.overview.applications ?? 0}
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-primary-ink bg-primary-light dark:bg-primary-light/50 px-2 py-0.5 rounded-full">
              Total Candidates
            </span>
          </div>
        </Link>

        {/* Metric 2: Open Positions */}
        <Link
          href="/hr/recruitment/dashboard"
          aria-label={`${data?.overview.openPositions ?? 0} Open positions`}
          className="group relative flex min-h-[136px] flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-info/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Open Positions
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-info-light dark:bg-info-light/60 text-info-ink dark:text-info-ink group-hover:scale-110 transition-transform">
              <BriefcaseBusiness className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {data?.overview.openPositions ?? 0}
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-info-ink bg-info-light dark:bg-info-light/50 px-2 py-0.5 rounded-full">
              Active Jobs
            </span>
          </div>
        </Link>

        {/* Metric 3: Interview No-Show Rate */}
        <Link
          href="/hr/interviews"
          className="group relative flex min-h-[136px] flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-destructive/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              No-Show Rate
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive-light dark:bg-destructive-light/60 text-destructive-ink dark:text-destructive-ink group-hover:scale-110 transition-transform">
              <CalendarDays className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {data?.kpis.interviewNoShowRate ?? 0}%
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-destructive-ink bg-destructive-light dark:bg-destructive-light/50 px-2 py-0.5 rounded-full">
              Target &lt;5%
            </span>
          </div>
        </Link>

        {/* Metric 4: Offer Acceptance Rate */}
        <Link
          href="/hr/offers"
          className="group relative flex min-h-[136px] flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-success/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Offer Acceptance
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-success-light dark:bg-success-light/60 text-success-ink dark:text-success-ink group-hover:scale-110 transition-transform">
              <Award className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {data?.kpis.offerAcceptanceRate ?? 0}%
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-success-ink bg-success-light dark:bg-success-light/50 px-2 py-0.5 rounded-full">
              Conversion
            </span>
          </div>
        </Link>

        {/* Metric 5: Avg Time to Hire */}
        <Link
          href="/hr/reports"
          className="group relative flex min-h-[136px] flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-px hover:border-warning/40 hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Avg. Time to Hire
            </span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-warning-light dark:bg-warning-light/60 text-warning-ink dark:text-warning-ink group-hover:scale-110 transition-transform">
              <Clock className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {data?.kpis.averageTimeToHireDays == null
                ? "—"
                : `${data.kpis.averageTimeToHireDays}d`}
            </span>
            <span className="inline-flex items-center text-[10px] font-bold text-warning-ink bg-warning-light dark:bg-warning-light/50 px-2 py-0.5 rounded-full">
              Speed Metric
            </span>
          </div>
        </Link>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 px-5 py-5 md:px-6">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Final hiring control
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
              Workflow alerts
            </h2>
          </div>
          <Link
            href="/hr/candidates"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold text-foreground transition hover:border-primary/40 hover:bg-muted"
          >
            Open candidates <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="p-4 md:p-5">
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-slate-50 text-foreground shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-white">
            <div className="flex flex-wrap items-end justify-between gap-5 border-b border-border/70 px-5 py-5 md:px-6 dark:border-white/10">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary dark:text-blue-300">
                  Operations queue
                </p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-4xl font-bold tracking-tight">{workflowAttentionTotal}</span>
                  <span className="text-sm text-muted-foreground dark:text-slate-300">
                    {workflowAttentionTotal === 1 ? "item requires" : "items require"} attention
                  </span>
                </div>
              </div>
              <span className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground dark:border-white/15 dark:bg-white/10 dark:text-slate-200">
                Live workflow data
              </span>
            </div>
            <div className="divide-y divide-border/70 dark:divide-white/10">
              {workflowAlerts.map((item, index) => {
                const AlertIcon = item.icon;
                const accent = ["bg-blue-400", "bg-violet-400", "bg-amber-400", "bg-emerald-400", "bg-rose-400"][index];
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={cn(
                      "group relative grid gap-3 px-5 py-4 transition md:grid-cols-[2.5rem_minmax(0,1fr)_8rem_1.5rem] md:items-center md:px-6",
                      item.count > 0
                        ? "bg-primary/[0.06] hover:bg-primary/[0.1] dark:bg-white/[0.08] dark:hover:bg-white/[0.12]"
                        : "bg-transparent opacity-75 hover:bg-muted/60 hover:opacity-100 dark:hover:bg-white/[0.04]",
                    )}
                  >
                    <span className={cn("absolute inset-y-0 left-0 w-1 opacity-80", accent)} />
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-background text-primary ring-1 ring-border dark:bg-white/10 dark:text-slate-200 dark:ring-0">
                      <AlertIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-foreground dark:text-white">{item.label}</span>
                      <span className="mt-1 block truncate text-xs text-muted-foreground dark:text-slate-400">{item.description}</span>
                    </span>
                    <span className="flex items-center gap-2 md:justify-end">
                      <span className={cn("text-2xl font-bold", item.count > 0 ? "text-primary dark:text-blue-200" : "text-muted-foreground dark:text-slate-300")}>
                        {item.count}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-slate-500">
                        {item.count === 1 ? "item" : "items"}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary dark:text-slate-500 dark:group-hover:text-white" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Main Dashboard 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          {/* SECTION: Recruitment Pipeline Visualizer */}
          <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm md:p-6">
            <div className="mb-4 flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink dark:text-primary-ink">
                  Recruitment Workflow
                </p>
                <h2 className="text-lg font-semibold text-foreground">
                  Recruitment Pipeline Funnel
                </h2>
              </div>
              <Link
                href="/hr/recruitment/dashboard"
                aria-label="Open recruitment"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-ink hover:text-primary-ink dark:text-primary-ink transition-colors"
              >
                <span>Open Pipeline</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Pipeline Stage Cards */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              {pipelineStages.map(({ key, label, badgeColor, icon: StageIcon }) => {
                const count = pipeline[key] || 0;
                const percentage = Math.min(
                  100,
                  Math.max(count ? 4 : 0, (count / pipelineTotal) * 100),
                );

                return (
                  <Link
                    key={key}
                    aria-label={`${label}: ${count} of ${pipelineTotal} total applications`}
                    href={`/hr/candidates?status=${key}`}
                    className="group relative flex min-h-32 flex-col justify-between overflow-hidden rounded-2xl border border-border/50 bg-background/60 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-md"
                  >
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                          {label}
                        </span>
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/70 text-muted-foreground transition-colors group-hover:bg-primary-light group-hover:text-primary-ink">
                          <StageIcon className="h-4 w-4" />
                        </span>
                      </div>
                      <div className="flex items-end gap-2">
                        <span className="block text-2xl font-bold text-foreground">{count}</span>
                        <span className="pb-0.5 text-[10px] font-semibold text-muted-foreground">
                          of {pipelineTotal}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Visualizer */}
                    <div className="mt-4 space-y-1.5">
                      <div className="h-2 w-full rounded-full bg-muted dark:bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all duration-500",
                            badgeColor,
                          )}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-primary-ink dark:text-primary-ink inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        View records <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* SECTION: Daily Operations */}
          <section className="rounded-xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
            <div className="border-b border-border/50 pb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink dark:text-primary-ink">
                Daily Operations
              </p>
              <h2 className="text-lg font-semibold text-foreground">Today at Triple Minds</h2>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/hr/attendance"
                className="group flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4 transition-all hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
                    <Users className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-foreground transition-colors group-hover:text-primary-ink">
                      Attendance Today
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      Review present, late, absent & leave
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary-ink" />
              </Link>

              <Link
                href="/hr/candidates/new"
                className="group flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4 transition-all hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary-ink transition-transform group-hover:scale-105">
                    <FilePlus2 className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-foreground transition-colors group-hover:text-primary-ink">
                      Create job / form
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">
                      Publish a new hiring opportunity
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary-ink" />
              </Link>

              <Link
                href="/hr/interviews"
                className="group flex items-center justify-between rounded-xl border border-border bg-muted/30 p-4 transition-all hover:border-primary/40 hover:bg-primary/[0.04] hover:shadow-sm"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary-ink transition-transform group-hover:scale-105">
                    <CalendarDays className="h-5.5 w-5.5" />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-foreground transition-colors group-hover:text-primary-ink">
                      Interviews Today
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      Review scheduled interviews & candidates
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary-ink" />
              </Link>
            </div>
          </section>
          {/* SECTION: Quick Actions */}
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="border-b border-border pb-4 m-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink dark:text-primary-ink">
                Move Work Forward
              </p>
              <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
            </div>

            <div className="quick-actions-grid">
              {quickActions.map(([title, description, href, Icon, gradient]) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-start gap-3.5 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-md"
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md group-hover:scale-110 transition-transform",
                      gradient,
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-semibold text-sm text-foreground block truncate group-hover:text-primary-ink transition-colors">
                      {title}
                    </span>
                    <span className="text-xs text-muted-foreground line-clamp-1 block mt-0.5 font-medium">
                      {description}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary-ink group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN (4 Columns) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Action Center: Needs Your Attention */}
          <section className="rounded-xl border border-border/60 bg-card p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink dark:text-primary-ink">
                  Action Center
                </p>
                <h2 className="text-lg font-semibold text-foreground">Needs Attention</h2>
              </div>
              <Link
                href="/hr/notifications"
                className="text-xs font-bold text-primary-ink hover:underline"
              >
                View All
              </Link>
            </div>

            {/* Loading state */}
            {message && (
              <div className="flex items-center gap-2 rounded-2xl bg-muted/60 p-4 text-xs font-semibold text-muted-foreground animate-pulse">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary-ink" />
                <span>{message}</span>
              </div>
            )}

            {!message && onboardingCount > 0 && (
              <Link
                href="/hr/onboarding"
                className="group flex items-center justify-between gap-4 rounded-2xl border border-destructive/70 bg-destructive/[0.08] px-4 py-3.5 transition-colors hover:bg-destructive/[0.14]"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive-ink">
                    <UserCheck className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-destructive-ink">
                      Candidate onboarding needs attention
                    </span>
                    <span className="mt-0.5 block text-xs font-medium text-destructive-ink/80">
                      {onboardingCount} selected candidate{onboardingCount === 1 ? "" : "s"} still
                      need to complete requested details.
                    </span>
                  </span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-destructive-ink">
                  Open onboarding queue
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            )}

            {/* Empty state */}
            {!message && !attentionItems.length && (
              <div className="rounded-2xl border border-success/20 bg-success/5 p-5 text-center space-y-2">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-success-light dark:bg-success-light text-success-ink dark:text-success-ink">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="font-semibold text-sm text-foreground">You’re all caught up!</p>
                <p className="text-xs text-muted-foreground font-medium">
                  There are no pending alerts or assigned tasks right now.
                </p>
              </div>
            )}

            {/* Attention items list */}
            {!message && !!attentionItems.length && (
              <div className="space-y-2.5">
                {attentionItems.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="group flex items-start gap-3 rounded-2xl border border-border/50 bg-background/60 p-3.5 transition-all duration-150 hover:border-primary/40 hover:bg-card hover:shadow-sm"
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 rounded-full shrink-0",
                        item.status === "Alert" ? "bg-destructive animate-pulse" : "bg-primary",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-xs text-foreground truncate group-hover:text-primary-ink transition-colors">
                          {item.title}
                        </span>
                        <span
                          className={cn(
                            "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0",
                            item.status === "Alert"
                              ? "bg-destructive-light dark:bg-destructive-light/60 text-destructive-ink dark:text-destructive-ink"
                              : "bg-primary-light dark:bg-primary-light/60 text-primary-ink dark:text-primary-ink",
                          )}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1 font-medium">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Quick Management Shortcuts */}
          <section className="enterprise-hero rounded-xl border border-primary/20 bg-card p-6 text-foreground shadow-sm space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary-ink">
                Quick Shortcuts
              </span>
              <h3 className="text-base font-semibold text-foreground">Management Center</h3>
            </div>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <Link
                href="/hr/candidates"
                className="flex items-center gap-2 rounded-xl bg-muted hover:bg-muted p-3 font-bold text-foreground transition-colors"
              >
                <Users className="h-4 w-4 text-primary-ink" />
                <span>Candidates</span>
              </Link>
              <Link
                href="/hr/employees"
                className="flex items-center gap-2 rounded-xl bg-muted hover:bg-muted p-3 font-bold text-foreground transition-colors"
              >
                <UserCheck className="h-4 w-4 text-primary-ink" />
                <span>Employees</span>
              </Link>
              <Link
                href="/hr/reports"
                className="flex items-center gap-2 rounded-xl bg-muted hover:bg-muted p-3 font-bold text-foreground transition-colors"
              >
                <BarChart3 className="h-4 w-4 text-primary-ink" />
                <span>Reports</span>
              </Link>
              <Link
                href="/me/profile"
                className="flex items-center gap-2 rounded-xl bg-muted hover:bg-muted p-3 font-bold text-foreground transition-colors"
              >
                <Settings className="h-4 w-4 text-primary-ink" />
                <span>Settings</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
