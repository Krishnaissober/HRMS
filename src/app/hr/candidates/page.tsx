"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Columns3,
  FilterX,
  List,
  MessageSquareMore,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { CandidateBulkRemovalDialog } from "@/components/candidates/CandidateBulkRemovalDialog";
import { cn } from "@/lib/utils";

type Candidate = {
  id: string;
  referenceNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleOfInterest: string;
  source: string;
  status: string;
  hiringApprovalStatus?: string;
  createdAt: string;
  updatedAt: string;
  applications: Array<{ id: string; status: string }>;
  interviews: Array<{
    id: string;
    stage: string;
    status: string;
    scheduledStart: string;
    scheduledEnd: string;
  }>;
};

type ViewMode = "table" | "workflow";
type FilterValues = {
  query: string;
  status: string;
  source: string;
  approval: string;
  from: string;
  to: string;
};

const stages = [
  { value: "APPLIED", label: "New", color: "bg-info", soft: "bg-info-light dark:bg-info-light/40" },
  {
    value: "SCREENING",
    label: "Under Review",
    color: "bg-info",
    soft: "bg-info-light dark:bg-info-light/40",
  },
  {
    value: "SHORTLISTED",
    label: "Shortlisted",
    color: "bg-warning",
    soft: "bg-warning-light dark:bg-warning-light/40",
  },
  {
    value: "INTERVIEW",
    label: "Interview",
    color: "bg-info",
    soft: "bg-info-light dark:bg-info-light/40",
  },
  {
    value: "SELECTED",
    label: "Selected",
    color: "bg-success",
    soft: "bg-success-light dark:bg-success-light/40",
  },
  {
    value: "HOLD",
    label: "Hold",
    color: "bg-warning",
    soft: "bg-warning-light dark:bg-warning-light/40",
  },
  {
    value: "REJECTED",
    label: "Rejected",
    color: "bg-destructive",
    soft: "bg-destructive-light dark:bg-destructive-light/40",
  },
] as const;

const statusLabels = Object.fromEntries(stages.map((stage) => [stage.value, stage.label]));
const statusStyles: Record<string, string> = {
  APPLIED: "bg-info-light text-info-ink dark:bg-info-light/50 dark:text-info-ink",
  SCREENING: "bg-info-light text-info-ink",
  SHORTLISTED: "bg-warning-light text-warning-ink dark:bg-warning-light/50 dark:text-warning-ink",
  INTERVIEW: "bg-info-light text-info-ink dark:bg-info-light/50 dark:text-info-ink",
  SELECTED: "bg-success-light text-success-ink dark:bg-success-light/50 dark:text-success-ink",
  HOLD: "bg-warning-light text-warning-ink dark:bg-warning-light/50 dark:text-warning-ink",
  REJECTED:
    "bg-destructive-light text-destructive-ink dark:bg-destructive-light/50 dark:text-destructive-ink",
};

function displayDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function displayInterview(candidate: Candidate) {
  const interview = candidate.interviews[0];
  if (!interview) return "Not scheduled";
  if (interview.status === "COMPLETED") return "Completed";
  return `${interview.status.replaceAll("_", " ")} · ${displayDate(interview.scheduledStart)}`;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase",
        statusStyles[status] || "bg-muted text-muted-foreground",
      )}
    >
      {statusLabels[status] || status.replaceAll("_", " ")}
    </span>
  );
}

function ApprovalBadge({ status }: { status?: string }) {
  if (!status || status === "NOT_REQUESTED") return null;
  const labels: Record<string, string> = {
    AWAITING_MASTER_REVIEW: "Awaiting Master Review",
    MASTER_APPROVED: "Master Approved",
    MASTER_REJECTED: "Master Rejected",
    FINAL_HIRED: "Final Hired",
    FINAL_REJECTED: "Final Rejected",
  };
  const styles: Record<string, string> = {
    AWAITING_MASTER_REVIEW: "bg-warning-light text-warning-ink",
    MASTER_APPROVED: "bg-success-light text-success-ink",
    MASTER_REJECTED: "bg-destructive-light text-destructive-ink",
    FINAL_HIRED: "bg-success-light text-success-ink",
    FINAL_REJECTED: "bg-destructive-light text-destructive-ink",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase",
        styles[status] || "bg-muted text-muted-foreground",
      )}
    >
      {labels[status] || status.replaceAll("_", " ")}
    </span>
  );
}

export default function CandidateListPage() {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [approval, setApproval] = useState("");
  const [position, setPosition] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [interviewFilter, setInterviewFilter] = useState("");
  const [view, setView] = useState<ViewMode>("table");
  const [items, setItems] = useState<Candidate[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkRemovalOpen, setBulkRemovalOpen] = useState(false);
  const [message, setMessage] = useState("Loading candidates…");

  const load = useCallback(async (filters: FilterValues) => {
    setMessage("Loading candidates…");
    const params = new URLSearchParams({
      q: filters.query,
      page: "1",
      pageSize: "100",
      direction: "desc",
    });
    if (filters.status) params.set("status", filters.status);
    if (filters.source) params.set("source", filters.source);
    if (filters.approval) params.set("approval", filters.approval);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    try {
      const response = await fetch(`/api/v1/candidates?${params}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || "Could not load candidates");
      setItems(result.data.items);
      setSelectedIds(new Set());
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load candidates");
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initial = {
      query: params.get("q") || "",
      status: params.get("status") || "",
      source: params.get("source") || "",
      approval: params.get("approval") || "",
      from: params.get("from") || "",
      to: params.get("to") || "",
    };
    setQuery(initial.query);
    setStatus(initial.status);
    setSource(initial.source);
    setApproval(initial.approval);
    setFrom(initial.from);
    setTo(initial.to);
    void load(initial);
  }, [load]);

  const filteredItems = useMemo(
    () =>
      items.filter((candidate) => {
        const matchesPosition = !position || candidate.roleOfInterest === position;
        const interview = candidate.interviews[0];
        const matchesInterview =
          !interviewFilter ||
          (interviewFilter === "NONE"
            ? !interview
            : interviewFilter === "COMPLETED"
              ? interview?.status === "COMPLETED"
              : Boolean(
                  interview && interview.status !== "COMPLETED" && interview.status !== "CANCELLED",
                ));
        return matchesPosition && matchesInterview;
      }),
    [interviewFilter, items, position],
  );
  const positions = useMemo(
    () => [...new Set(items.map((candidate) => candidate.roleOfInterest).filter(Boolean))].sort(),
    [items],
  );
  const isLoading = message.startsWith("Loading");
  const selectedCandidates = useMemo(
    () =>
      items
        .filter((candidate) => selectedIds.has(candidate.id))
        .map((candidate) => ({
          id: candidate.id,
          name: `${candidate.firstName} ${candidate.lastName}`,
        })),
    [items, selectedIds],
  );
  function currentFilters(): FilterValues {
    return { query, status, source, approval, from, to };
  }

  function clearFilters() {
    setQuery("");
    setStatus("");
    setSource("");
    setApproval("");
    setPosition("");
    setFrom("");
    setTo("");
    setInterviewFilter("");
    void load({ query: "", status: "", source: "", approval: "", from: "", to: "" });
  }
  return (
    <main className="page-shell space-y-6 pb-12">
      <section className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-card px-5 py-6 shadow-sm sm:px-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Phase 1 · Hiring
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Candidates
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Review every application, move candidates through the hiring workflow, and keep the next
            action clear.
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
            href="/hr/candidates/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            New candidate
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border/70 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label="Search candidates"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void load(currentFilters());
                }}
                placeholder="Search name, email, phone, role or skills"
                className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
              />
            </div>
            <button
              type="button"
              onClick={() => void load(currentFilters())}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                void load({ query, status: event.target.value, source, approval, from, to });
              }}
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
            >
              <option value="">All statuses</option>
              {stages.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by applied position"
              value={position}
              onChange={(event) => {
                setPosition(event.target.value);
                setSelectedIds(new Set());
              }}
              className="h-10 max-w-52 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
            >
              <option value="">All jobs / forms</option>
              {positions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by source"
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                void load({ query, status, source: event.target.value, approval, from, to });
              }}
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
            >
              <option value="">All sources</option>
              <option value="ONLINE">Online</option>
              <option value="WALK_IN">Walk-in</option>
            </select>
            <select
              aria-label="Filter by interview"
              value={interviewFilter}
              onChange={(event) => {
                setInterviewFilter(event.target.value);
                setSelectedIds(new Set());
              }}
              className="h-10 rounded-xl border border-border bg-background px-3 text-xs font-semibold"
            >
              <option value="">All interviews</option>
              <option value="NONE">No interview</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-muted-foreground">
              From
              <input
                aria-label="Filter from date"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="bg-transparent text-xs text-foreground outline-none"
              />
            </label>
            <label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold text-muted-foreground">
              To
              <input
                aria-label="Filter to date"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="bg-transparent text-xs text-foreground outline-none"
              />
            </label>
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-3 text-xs font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <FilterX className="h-4 w-4" />
              Clear filters
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-foreground">{filteredItems.length}</span>
            <span className="text-sm text-muted-foreground">visible candidates</span>
            {view === "table" && selectedIds.size > 0 && (
              <>
                <span className="h-4 w-px bg-border" aria-hidden="true" />
                <span className="text-sm font-bold text-primary">{selectedIds.size} selected</span>
                <button
                  type="button"
                  onClick={() => setBulkRemovalOpen(true)}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-destructive/40 px-3 text-xs font-bold text-destructive transition-colors hover:bg-destructive-light"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove selected
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-xl border border-border p-1">
            <button
              type="button"
              onClick={() => setView("table")}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold",
                view === "table"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
              aria-pressed={view === "table"}
            >
              <List className="h-3.5 w-3.5" />
              Table
            </button>
            <button
              type="button"
              onClick={() => {
                setView("workflow");
                setSelectedIds(new Set());
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold",
                view === "workflow"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
              aria-pressed={view === "workflow"}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Workflow
            </button>
          </div>
        </div>
      </section>

      {isLoading && (
        <div
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 text-sm font-semibold text-muted-foreground"
          role="status"
        >
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          Loading candidate workspace…
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
      {!isLoading && !message && view === "table" && (
        <TableView
          items={filteredItems}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
        />
      )}
      {!isLoading && !message && view === "workflow" && <WorkflowView items={filteredItems} />}
      {bulkRemovalOpen && selectedCandidates.length > 0 && (
        <CandidateBulkRemovalDialog
          candidates={selectedCandidates}
          onClose={() => setBulkRemovalOpen(false)}
          onRemoved={async () => {
            setBulkRemovalOpen(false);
            setSelectedIds(new Set());
            await load(currentFilters());
          }}
        />
      )}
    </main>
  );
}

function TableView({
  items,
  selectedIds,
  onSelectedIdsChange,
}: {
  items: Candidate[];
  selectedIds: Set<string>;
  onSelectedIdsChange: (ids: Set<string>) => void;
}) {
  const visibleIds = items.map((candidate) => candidate.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));

  function selectAllVisible(checked: boolean) {
    const next = new Set(selectedIds);
    for (const id of visibleIds) {
      if (checked) next.add(id);
      else next.delete(id);
    }
    onSelectedIdsChange(next);
  }

  function selectCandidate(id: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    onSelectedIdsChange(next);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left">
          <thead className="border-b border-border/70 bg-muted/30">
            <tr>
              <th className="w-12 px-3 py-3 text-center">
                <input
                  type="checkbox"
                  aria-label="Select all visible candidates"
                  checked={allVisibleSelected}
                  disabled={items.length === 0}
                  onChange={(event) => selectAllVisible(event.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
              </th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Candidate
              </th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Position
              </th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Applied
              </th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Status
              </th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Source
              </th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Interview
              </th>
              <th className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {items.map((candidate) => (
              <tr key={candidate.id} className="group transition hover:bg-muted/30">
                <td className="w-12 px-3 py-4 text-center">
                  <input
                    type="checkbox"
                    aria-label={`Select ${candidate.firstName} ${candidate.lastName}`}
                    checked={selectedIds.has(candidate.id)}
                    onChange={(event) => selectCandidate(candidate.id, event.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                </td>
                <td className="px-3 py-4">
                  <Link
                    href={`/hr/candidates/${candidate.id}`}
                    className="flex min-w-52 items-center gap-3"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                      {candidate.firstName[0]}
                      {candidate.lastName[0]}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-foreground group-hover:text-primary">
                        {candidate.firstName} {candidate.lastName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {candidate.referenceNo}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="max-w-48 px-3 py-4">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {candidate.roleOfInterest || "Position not specified"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {candidate.applications[0]?.status || "Application"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-xs text-muted-foreground">
                  {displayDate(candidate.createdAt)}
                </td>
                <td className="px-3 py-4">
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge status={candidate.status} />
                    <ApprovalBadge status={candidate.hiringApprovalStatus} />
                  </div>
                </td>
                <td className="px-3 py-4">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    {candidate.source === "WALK_IN" ? (
                      <UserRound className="h-3.5 w-3.5" />
                    ) : (
                      <MessageSquareMore className="h-3.5 w-3.5" />
                    )}
                    {candidate.source === "WALK_IN" ? "Walk-in" : "Online"}
                  </span>
                </td>
                <td className="max-w-44 px-3 py-4 text-xs text-muted-foreground">
                  <span className="block truncate">{displayInterview(candidate)}</span>
                </td>
                <td className="px-3 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/hr/candidates/${candidate.id}`}
                      className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted"
                    >
                      Review
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-12 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-semibold text-foreground">
              No candidates match these filters.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Clear a filter or wait for a new application.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function WorkflowView({ items }: { items: Candidate[] }) {
  return (
    <section className="overflow-x-auto rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="grid min-w-[1120px] grid-cols-7 gap-3">
        {stages.map((stage) => {
          const column = items.filter((candidate) => candidate.status === stage.value);
          return (
            <div
              key={stage.value}
              className="min-h-96 rounded-xl border border-border/70 bg-muted/20"
            >
              <div
                className={cn(
                  "flex items-center justify-between rounded-t-xl border-b border-border/70 px-3 py-3",
                  stage.soft,
                )}
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <span className={cn("h-2 w-2 rounded-full", stage.color)} />
                  {stage.label}
                </span>
                <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                  {column.length}
                </span>
              </div>
              <div className="space-y-2 p-2">
                {column.map((candidate) => (
                  <article
                    key={candidate.id}
                    className="rounded-xl border border-border/70 bg-card p-3 shadow-sm"
                  >
                    <Link href={`/hr/candidates/${candidate.id}`} className="block">
                      <div className="flex items-start gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-[10px] font-bold text-primary">
                          {candidate.firstName[0]}
                          {candidate.lastName[0]}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-bold text-foreground hover:text-primary">
                            {candidate.firstName} {candidate.lastName}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                            {candidate.roleOfInterest || "Position not specified"}
                          </span>
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>{displayDate(candidate.createdAt)}</span>
                        {candidate.interviews.length > 0 && (
                          <CalendarDays className="h-3.5 w-3.5" />
                        )}
                      </div>
                    </Link>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
                      <Link
                        href={`/hr/candidates/${candidate.id}`}
                        className="text-[10px] font-bold text-primary hover:underline"
                      >
                        Review
                      </Link>
                    </div>
                  </article>
                ))}
                {column.length === 0 && (
                  <p className="px-2 py-8 text-center text-[11px] text-muted-foreground">
                    No candidates
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Check className="h-3.5 w-3.5 text-success-ink" />
        Open a candidate to review details and take the next permitted action.
      </p>
    </section>
  );
}
