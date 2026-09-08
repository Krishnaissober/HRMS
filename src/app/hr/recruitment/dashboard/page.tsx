"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  BriefcaseBusiness,
  Award,
  Clock,
  BarChart3,
  RefreshCw,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardWavyBackground } from "@/components/layout/dashboard-wavy-background";

type RecruitmentData = {
  applications: number;
  pipelineCounts: Record<string, number>;
  openPositions: number;
  interviewPassRate: number;
  interviewNoShowRate: number;
  offerAcceptanceRate: number;
  averageTimeToHireDays: number | null;
  averageTimeToFillDays: number | null;
  sourceEffectiveness: Array<{
    source: string;
    applications: number;
    acceptedOffers: number;
    acceptanceRate: number;
  }>;
  openRequisitions: Array<{
    id: string;
    referenceNo: string;
    title: string;
    openedAt: string | null;
    _count: { applications: number };
  }>;
  definitions: Record<string, string>;
};

function link(path: string, _organizationId: string, values: Record<string, string> = {}) {
  const query = new URLSearchParams(values);
  return query.toString() ? `${path}?${query}` : path;
}

const PIPELINE_COLORS: Record<string, string> = {
  APPLIED: "bg-blue-500",
  SCREENING: "bg-indigo-500",
  SHORTLISTED: "bg-amber-500",
  INTERVIEW: "bg-purple-500",
  SELECTED: "bg-emerald-500",
  HIRED: "bg-teal-500",
};

export default function RecruitmentDashboardPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<RecruitmentData | null>(null);
  const [message, setMessage] = useState("Loading recruitment dashboard…");

  const load = useCallback(async (start = "", end = "") => {
    setMessage("Loading recruitment dashboard…");
    const query = new URLSearchParams();
    if (start) query.set("from", start);
    if (end) query.set("to", end);
    const response = await fetch(`/api/v1/dashboards/recruitment?${query}`);
    const result = await response.json();
    if (!response.ok) {
      setData(null);
      return setMessage(result.error?.message || "Could not load recruitment dashboard");
    }
    setData(result.data);
    setMessage("");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isLoading = message.startsWith("Loading");
  const inputCls =
    "rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none backdrop-blur-md transition-colors";

  return (
    <main className="page-shell space-y-6 pb-12">
      {/* Hero Banner */}
      <section className="prism-light relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl">
        <DashboardWavyBackground />
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">
                Triple Minds HR
              </p>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Recruitment Pipeline
              </h1>
              <p className="text-sm text-indigo-100/75 font-medium max-w-lg">
                End-to-end recruitment metrics, pipeline visibility, and source analysis.
              </p>
            </div>
            <div className="flex items-center shrink-0">
              <Link
                href="/hr/candidates/new"
                className="forms-dashboard-cta"
                aria-label="Open Forms dashboard"
              >
                <span>Forms dashboard</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
          {/* Date filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/60">From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={inputCls}
              />
            </label>
            <label className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/60">To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={inputCls}
              />
            </label>
            <button
              type="button"
              onClick={() => void load(from, to)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-bold text-white transition-colors"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              Apply Range
            </button>
            <Link
              href={link("/hr/reports", "")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-300 hover:text-white transition-colors"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Open Reports &amp; Analytics
            </Link>
          </div>
        </div>
      </section>

      {isLoading && (
        <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4 animate-pulse">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
          <span className="text-sm font-semibold text-muted-foreground">{message}</span>
        </div>
      )}

      {data && (
        <>
          {/* KPI Cards */}
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              {
                label: "Applications",
                value: data.applications,
                color: "indigo",
                icon: Users,
                href: link("/hr/candidates", ""),
                sub: "Total candidates",
              },
              {
                label: "Open Positions",
                value: data.openPositions,
                color: "blue",
                icon: BriefcaseBusiness,
                href: "#open-positions",
                sub: "Published requisitions",
              },
              {
                label: "Interview Pass",
                value: `${data.interviewPassRate}%`,
                color: "emerald",
                icon: Award,
                href: link("/hr/interviews", ""),
                sub: "Hire recommendations",
              },
              {
                label: "No-Show Rate",
                value: `${data.interviewNoShowRate}%`,
                color: "rose",
                icon: Clock,
                href: link("/hr/interviews", ""),
                sub: "Target <5%",
              },
              {
                label: "Offer Acceptance",
                value: `${data.offerAcceptanceRate}%`,
                color: "amber",
                icon: TrendingUp,
                href: link("/hr/offers", ""),
                sub: "Conversion rate",
              },
            ].map(({ label, value, color, icon: Icon, href, sub }) => (
              <a
                key={label}
                href={href}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md",
                  color === "indigo"
                    ? "hover:border-indigo-500/40"
                    : color === "blue"
                      ? "hover:border-blue-500/40"
                      : color === "emerald"
                        ? "hover:border-emerald-500/40"
                        : color === "rose"
                          ? "hover:border-rose-500/40"
                          : "hover:border-amber-500/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    {label}
                  </span>
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl group-hover:scale-110 transition-transform",
                      color === "indigo"
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                        : color === "blue"
                          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400"
                          : color === "emerald"
                            ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                            : color === "rose"
                              ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                              : "bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-black tracking-tight text-foreground">
                    {value}
                  </span>
                  <p className="text-xs text-muted-foreground font-medium mt-1">{sub}</p>
                </div>
              </a>
            ))}
          </section>

          {/* Time to Hire */}
          <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-4">
            <div className="border-b border-border/50 pb-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Speed Metrics
              </p>
              <h2 className="text-xl font-extrabold text-foreground">Hiring Speed</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <a
                href={link("/hr/offers", "")}
                title={data.definitions.timeToHire}
                className="group rounded-2xl border border-border/50 bg-background/60 p-5 hover:border-amber-500/40 hover:bg-card transition-all"
              >
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Avg. Time to Hire
                </span>
                <span className="mt-2 block text-3xl font-black tracking-tight text-foreground">
                  {data.averageTimeToHireDays == null ? "—" : `${data.averageTimeToHireDays}d`}
                </span>
                <span className="block text-xs text-muted-foreground font-medium mt-1">
                  Approval to accepted offer
                </span>
              </a>
              <a
                href={link("/hr/offers", "")}
                title={data.definitions.timeToFill}
                className="group rounded-2xl border border-border/50 bg-background/60 p-5 hover:border-indigo-500/40 hover:bg-card transition-all"
              >
                <span className="block text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Avg. Time to Fill
                </span>
                <span className="mt-2 block text-3xl font-black tracking-tight text-foreground">
                  {data.averageTimeToFillDays == null ? "—" : `${data.averageTimeToFillDays}d`}
                </span>
                <span className="block text-xs text-muted-foreground font-medium mt-1">
                  Opening to accepted offer
                </span>
              </a>
            </div>
          </section>

          {/* Pipeline */}
          <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
            <div className="border-b border-border/50 pb-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                Funnel
              </p>
              <h2 className="text-xl font-extrabold text-foreground">Pipeline Counts</h2>
            </div>
            {Object.keys(data.pipelineCounts).length === 0 ? (
              <p className="text-sm text-muted-foreground font-medium">
                No applications match this date range.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {Object.entries(data.pipelineCounts).map(([status, count]) => {
                  const maxCount = Math.max(...Object.values(data.pipelineCounts).map(Number), 1);
                  const pct = Math.max(15, Math.round((Number(count) / maxCount) * 100));
                  return (
                    <a
                      key={status}
                      href={link("/hr/candidates", "", { status })}
                      className="group rounded-2xl border border-border/50 bg-background/60 p-4 hover:border-indigo-500/40 hover:bg-card hover:shadow-md transition-all"
                    >
                      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                        {status}
                      </span>
                      <span className="block text-2xl font-black tracking-tight text-foreground mt-1">
                        {count}
                      </span>
                      <div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            PIPELINE_COLORS[status] || "bg-indigo-500",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </a>
                  );
                })}
              </div>
            )}
          </section>

          {/* Source Effectiveness */}
          <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
            <div className="border-b border-border/50 pb-4">
              <p className="text-xs font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Analytics
              </p>
              <h2 className="text-xl font-extrabold text-foreground">Source Effectiveness</h2>
            </div>
            {data.sourceEffectiveness.length === 0 ? (
              <p className="text-sm text-muted-foreground font-medium">
                No candidate sources match this date range.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.sourceEffectiveness.map((source) => (
                  <a
                    key={source.source}
                    href={link("/hr/candidates", "", { source: source.source })}
                    className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 hover:border-purple-500/40 hover:bg-card hover:shadow-md transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="block font-extrabold text-sm text-foreground group-hover:text-purple-600 transition-colors">
                        {source.source}
                      </span>
                      <span className="block text-xs text-muted-foreground font-medium">
                        {source.applications} applications · {source.acceptedOffers} accepted offers
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-sm font-black text-foreground">
                        {source.acceptanceRate}%
                      </span>
                      <span className="block text-xs text-muted-foreground font-medium">
                        acceptance
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-purple-600 transition-all shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* Open Positions */}
          <section
            id="open-positions"
            className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-5"
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Hiring Now
                </p>
                <h2 className="text-xl font-extrabold text-foreground">Open Positions</h2>
              </div>
              <span className="text-sm font-black text-foreground">
                {data.openRequisitions.length}
              </span>
            </div>
            {data.openRequisitions.length === 0 ? (
              <p className="text-sm text-muted-foreground font-medium">
                No published requisitions.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.openRequisitions.map((req) => (
                  <a
                    key={req.id}
                    href={link("/hr/candidates", "")}
                    className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 hover:border-blue-500/40 hover:bg-card hover:shadow-md transition-all"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      <BriefcaseBusiness className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block font-extrabold text-sm text-foreground group-hover:text-blue-600 transition-colors truncate">
                        {req.referenceNo} · {req.title}
                      </span>
                      <span className="block text-xs text-muted-foreground font-medium">
                        {req._count.applications} applications ·{" "}
                        {req.openedAt
                          ? `Opened ${new Date(req.openedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                          : "Opening date unavailable"}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-blue-600 transition-all shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
