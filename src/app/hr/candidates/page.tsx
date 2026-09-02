"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, Users, Plus, ArrowRight, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Candidate = {
  id: string;
  referenceNo: string;
  firstName: string;
  lastName: string;
  email: string;
  roleOfInterest: string;
  source: string;
  status: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  APPLIED: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
  SCREENING: "bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300",
  SHORTLISTED: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
  INTERVIEW: "bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300",
  SELECTED: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  HOLD: "bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300",
  REJECTED: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
};

export default function CandidateListPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [items, setItems] = useState<Candidate[]>([]);
  const [message, setMessage] = useState("Loading candidates…");

  const load = useCallback(async (targetQuery: string, targetStatus = "", targetSource = "") => {
    setMessage("Loading candidates…");
    const params = new URLSearchParams({ q: targetQuery });
    if (targetStatus) params.set("status", targetStatus);
    if (targetSource) params.set("source", targetSource);
    const response = await fetch(`/api/v1/candidates?${params}`);
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not load candidates");
    setItems(result.data.items);
    setMessage(result.data.items.length ? "" : "No candidates found.");
  }, []);

  useEffect(() => {
    const routeQuery = new URLSearchParams(window.location.search);
    const currentStatus = routeQuery.get("status") || "";
    const currentSource = routeQuery.get("source") || "";
    setStatus(currentStatus);
    setSource(currentSource);
    void load("", currentStatus, currentSource);
  }, [load]);

  const isLoading = message.startsWith("Loading");

  return (
    <main className="page-shell space-y-6 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">Recruitment Intake</p>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Candidates</h1>
              <p className="text-sm text-indigo-100/75 font-medium max-w-lg">
                Search, filter and manage all candidate applications from one workspace.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => void load(query, status, source)}
                className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-all active:scale-95"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
                Refresh
              </button>
              <Link
                href="/hr/candidates/new"
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-500 hover:bg-indigo-400 border border-indigo-400/40 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5" />
                New Candidate
              </Link>
            </div>
          </div>

          {/* Search toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                placeholder="Search name, email, phone or skills…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void load(query, status, source); }}
                className="w-full rounded-xl border border-white/20 bg-white/10 pl-10 pr-4 py-2.5 text-sm font-medium text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 backdrop-blur-md transition-colors"
              />
            </div>
            <select
              aria-label="Candidate status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white focus:outline-none backdrop-blur-md min-w-[140px]"
            >
              <option value="" className="bg-slate-900">All statuses</option>
              {["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW", "SELECTED", "HOLD", "REJECTED"].map((v) => (
                <option key={v} value={v} className="bg-slate-900">{v}</option>
              ))}
            </select>
            <select
              aria-label="Candidate source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-medium text-white focus:outline-none backdrop-blur-md min-w-[130px]"
            >
              <option value="" className="bg-slate-900">All sources</option>
              <option value="ONLINE" className="bg-slate-900">Online</option>
              <option value="WALK_IN" className="bg-slate-900">Walk-in</option>
            </select>
            <button
              type="button"
              onClick={() => void load(query, status, source)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-bold text-white transition-colors"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Results</p>
            <h2 className="text-lg font-extrabold text-foreground">Candidate List</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/60">
              <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm font-black text-foreground">{items.length}</span>
          </div>
        </div>

        <div className="p-6 space-y-2.5">
          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center gap-3 rounded-2xl bg-muted/60 p-4 animate-pulse">
              <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
              <span className="text-sm font-semibold text-muted-foreground">{message}</span>
            </div>
          )}

          {/* Error state */}
          {!isLoading && message && message !== "No candidates found." && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">{message}</p>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && (message === "No candidates found." || (!message && items.length === 0)) && (
            <div className="rounded-2xl border border-border/40 bg-muted/30 p-10 text-center space-y-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="font-extrabold text-sm text-foreground">No candidates found</p>
              <p className="text-xs text-muted-foreground font-medium">Try adjusting your search filters or add a new candidate.</p>
            </div>
          )}

          {/* Candidates list */}
          {!isLoading && items.map((candidate) => (
            <a
              key={candidate.id}
              href={`/hr/candidates/${candidate.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-500/40 hover:bg-card hover:shadow-md"
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-black text-sm">
                {candidate.firstName[0]}{candidate.lastName[0]}
              </div>

              {/* Name + ref */}
              <div className="flex-1 min-w-0">
                <span className="block font-extrabold text-sm text-foreground group-hover:text-indigo-600 transition-colors truncate">
                  {candidate.firstName} {candidate.lastName}
                </span>
                <span className="block text-xs text-muted-foreground font-medium truncate">
                  {candidate.referenceNo} · {candidate.email}
                </span>
              </div>

              {/* Role */}
              <div className="hidden sm:block min-w-0 max-w-[180px]">
                <span className="block text-sm font-semibold text-foreground truncate">{candidate.roleOfInterest || "—"}</span>
                <span className="block text-xs text-muted-foreground font-medium">{candidate.source === "WALK_IN" ? "Walk-in" : "Online"}</span>
              </div>

              {/* Status badge */}
              <span className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase shrink-0",
                STATUS_COLORS[candidate.status] || "bg-muted text-muted-foreground"
              )}>
                {candidate.status}
              </span>

              {/* Date */}
              <span className="hidden md:block text-xs text-muted-foreground font-medium shrink-0">
                {new Date(candidate.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>

              <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
