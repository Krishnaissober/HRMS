"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CheckSquare,
  Download,
  FileText,
  Filter,
  RefreshCw,
  Star,
  TrendingUp,
  UsersRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Domain = "recruitment" | "workforce" | "attendance" | "leave" | "hr" | "payroll" | "audit";
type ApiState = { loading: boolean; error: string; data: Record<string, unknown> | null };
const navigation: Array<{ label: string; domains: Domain[] }> = [
  { label: "Recruitment", domains: ["recruitment"] },
  { label: "Workforce", domains: ["workforce"] },
  { label: "Attendance", domains: ["attendance"] },
  { label: "Leave", domains: ["leave"] },
  { label: "HR KPIs", domains: ["hr", "payroll", "audit"] },
];
const labels: Record<Domain, string> = {
  recruitment: "Recruitment",
  workforce: "Workforce",
  attendance: "Attendance",
  leave: "Leave",
  hr: "Onboarding and HR operations",
  payroll: "Payroll and expenses",
  audit: "Audit",
};
function title(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .replace(/^\s+/, "")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function displayCellValue(value: unknown): string {
  if (value == null || value === "") return "—";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return value.length ? value.map(displayCellValue).join(", ") : "—";
  const record = value as Record<string, unknown>;
  const preferred = record.applications ?? record._all ?? record.count;
  if (preferred != null && typeof preferred !== "object") return String(preferred);
  const values = Object.values(record).filter((item) => item != null && typeof item !== "object");
  return values.length ? values.map(String).join(" · ") : "—";
}

function appendQuery(path: string, query: string) {
  if (!query) return path;
  const hashIndex = path.indexOf("#");
  const pathname = hashIndex === -1 ? path : path.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : path.slice(hashIndex);
  return `${pathname}${pathname.includes("?") ? "&" : "?"}${query}${hash}`;
}

function Value({
  name,
  value,
  drilldownQuery,
}: {
  name: string;
  value: unknown;
  drilldownQuery: string;
}): ReactNode {
  if (value == null || typeof value !== "object")
    return (
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-white/80 px-4 py-3 dark:border-border dark:bg-background/30">
        <span className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground">
          {title(name)}
        </span>
        <strong className="text-right text-lg font-bold tracking-tight text-foreground dark:text-white">
          {value == null || value === "" ? "—" : String(value)}
        </strong>
      </div>
    );
  if (Array.isArray(value)) {
    if (value.length === 0)
      return (
        <p className="rounded-2xl border border-dashed border-border bg-muted p-6 text-sm font-medium text-muted-foreground dark:border-border dark:bg-background/20 dark:text-muted-foreground">
          No records in this period.
        </p>
      );
    const keys = [
      ...new Set(
        value.flatMap((row) =>
          row && typeof row === "object" ? Object.keys(row as object) : ["value"],
        ),
      ),
    ];
    return (
      <div className="overflow-x-auto rounded-2xl border border-border/80 dark:border-border">
        <table className="min-w-full divide-y divide-border text-left dark:divide-border">
          <thead className="bg-muted/80 dark:bg-background/50">
            <tr>
              {keys.map((key) => (
                <th
                  key={key}
                  className="whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-primary-ink dark:text-primary-ink"
                >
                  {title(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white dark:divide-border/70 dark:bg-transparent">
            {value.map((row, index) => (
              <tr
                key={index}
                className="transition-colors hover:bg-primary-light/40 dark:hover:bg-primary-light/20"
              >
                {keys.map((key) => (
                  <td
                    key={key}
                    className="whitespace-nowrap px-4 py-3 text-sm font-medium text-muted-foreground dark:text-muted-foreground"
                  >
                    {displayCellValue(
                      row && typeof row === "object"
                        ? (row as Record<string, unknown>)[key]
                        : row,
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  const object = value as Record<string, unknown>;
  if (name === "drilldowns")
    return (
      <div className="flex flex-wrap gap-3">
        {Object.entries(object).map(([key, path]) => (
          <a
            key={key}
            href={appendQuery(String(path), drilldownQuery)}
            className="inline-flex items-center gap-2 rounded-xl border border-primary bg-primary-light px-4 py-2.5 text-sm font-bold text-primary-ink transition hover:-translate-y-0.5 hover:bg-primary-light dark:border-primary dark:bg-primary-light/40 dark:text-primary-ink"
          >
            View {title(key)} records <TrendingUp className="h-4 w-4" />
          </a>
        ))}
      </div>
    );
  return (
    <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/70 p-4 dark:border-border dark:bg-background/20">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
        {title(name)}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(object).map(([key, child]) => (
          <Value key={key} name={key} value={child} drilldownQuery={drilldownQuery} />
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const searchParams = useSearchParams();
  const [active, setActive] = useState(0);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [department, setDepartment] = useState("");
  const [states, setStates] = useState<Partial<Record<Domain, ApiState>>>({});
  const domains = useMemo(() => navigation[active].domains, [active]);
  const drilldownQuery = useMemo(() => {
    const query = new URLSearchParams();
    const organizationId = searchParams.get("organizationId");
    if (organizationId) query.set("organizationId", organizationId);
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    if (department) query.set("department", department);
    return query.toString();
  }, [department, from, searchParams, to]);
  const load = useCallback(
    async (selected: Domain[]) => {
      setStates((current) => ({
        ...current,
        ...Object.fromEntries(
          selected.map((domain) => [domain, { loading: true, error: "", data: null }]),
        ),
      }));
      const query = new URLSearchParams();
      if (from) query.set("from", from);
      if (to) query.set("to", to);
      if (department) query.set("department", department);
      await Promise.all(
        selected.map(async (domain) => {
          try {
            const response = await fetch(`/api/v1/analytics/${domain}?${query}`);
            const result = await response.json();
            setStates((current) => ({
              ...current,
              [domain]: response.ok
                ? { loading: false, error: "", data: result.data }
                : {
                    loading: false,
                    error:
                      response.status === 403
                        ? "This report is outside your assigned permissions."
                        : result.error?.message || "Could not load this report.",
                    data: null,
                  },
            }));
          } catch {
            setStates((current) => ({
              ...current,
              [domain]: {
                loading: false,
                error: "Could not reach the reporting service.",
                data: null,
              },
            }));
          }
        }),
      );
    },
    [department, from, to],
  );
  useEffect(() => {
    void load(domains);
  }, [domains, load]);
  function exportUrl(domain: Domain) {
    const query = new URLSearchParams();
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    if (department) query.set("department", department);
    return `/api/v1/reports/${domain}/export?${query}`;
  }
  const recruitment = states.recruitment?.data;
  const metric = (key: string, fallback: string | number = "—") => {
    const value = recruitment?.[key];
    return value == null || value === "" ? fallback : value;
  };
  return (
    <main className="page-shell space-y-6 pb-12">
      <section className="enterprise-hero prism-light relative overflow-hidden rounded-xl border border-primary/20 bg-card p-6 text-foreground shadow-sm md:p-8">
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-ink">
              Reports &amp; analytics
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              See the whole picture
            </h1>
            <p className="max-w-2xl text-sm font-medium leading-6 text-primary-ink/75">
              Company-scoped metrics calculated from persisted HR records. Explore a domain, filter
              the period, and drill into the underlying records.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load(domains)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-muted px-4 py-3 text-sm font-bold text-foreground shadow-lg backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-muted active:scale-95"
          >
            <RefreshCw className="h-4 w-4" /> Refresh report
          </button>
        </div>
      </section>
      {active === 0 && recruitment && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Recruitment summary">
          {[
            ["Total Applications", metric("applications", 0), "40%", FileText, "rose"],
            ["Open Positions", metric("openPositions", 0), "50%", UsersRound, "blue"],
            ["Interview Pass Rate", `${metric("interviewPassRate", 0)}%`, "—", CheckSquare, "green"],
            ["Offer Acceptance Rate", `${metric("offerAcceptanceRate", 0)}%`, "—", Star, "amber"],
          ].map(([label, value, change, Icon, tone]) => {
            const toneClass =
              tone === "blue"
                ? "report-kpi-blue"
                : tone === "green"
                  ? "report-kpi-green"
                  : tone === "amber"
                    ? "report-kpi-amber"
                    : "report-kpi-rose";
            const MetricIcon = Icon as typeof FileText;
            return (
              <div key={String(label)} className={`report-kpi-card ${toneClass}`}>
                <span className="report-kpi-icon"><MetricIcon className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-muted-foreground">{String(label)}</p>
                  <strong className="mt-1 block text-2xl font-black tracking-tight text-foreground">
                    {String(value)}
                  </strong>
                  <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-success-ink">
                    <TrendingUp className="h-3 w-3" /> {String(change)}
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      )}
      <section className="rounded-xl border border-border/80 bg-white p-4 shadow-sm dark:border-border dark:bg-background/80 md:p-6">
        <div className="mb-5 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary-ink" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-ink dark:text-primary-ink">
            Report workspace
          </p>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Report areas">
          {navigation.map((item, index) => (
            <button
              key={item.label}
              type="button"
              aria-current={active === index ? "page" : undefined}
              onClick={() => setActive(index)}
              className={cn(
                "rounded-xl px-4 py-2.5 text-sm font-bold transition",
                active === index
                  ? "bg-primary text-white shadow-lg "
                  : "bg-muted text-muted-foreground hover:-translate-y-0.5 hover:bg-primary-light hover:text-primary-ink dark:bg-muted dark:text-muted-foreground dark:hover:bg-primary-light/50 dark:hover:text-primary-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="mt-6 grid gap-4 rounded-2xl border border-border/80 bg-muted/70 p-4 dark:border-border dark:bg-background/30 md:grid-cols-[1fr_1fr_1.4fr_auto_auto] md:items-end">
          <label className="space-y-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
            From
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-ink" />
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-3 pl-9 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-border dark:bg-background dark:text-white"
              />
            </div>
          </label>
          <label className="space-y-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
            To
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-ink" />
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-3 py-3 pl-9 text-sm font-semibold text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-border dark:bg-background dark:text-white"
              />
            </div>
          </label>
          <label className="space-y-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
            Department
            <input
              value={department}
              maxLength={120}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="All departments"
              className="w-full rounded-xl border border-border bg-white px-3 py-3 text-sm font-semibold normal-case tracking-normal text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-border dark:bg-background dark:text-white"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setFrom("");
              setTo("");
              setDepartment("");
            }}
            className="inline-flex items-center justify-center rounded-xl border border-border bg-white px-4 py-3 text-sm font-bold text-muted-foreground transition hover:bg-muted dark:border-border dark:bg-background dark:text-muted-foreground"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => void load(domains)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white shadow-lg  transition hover:-translate-y-0.5 hover:bg-primary active:scale-95"
          >
            <Filter className="h-4 w-4" /> Apply filters
          </button>
        </div>
      </section>
      {domains.map((domain) => {
        const state = states[domain];
        return (
          <section
            key={domain}
            className="rounded-xl border border-border/80 bg-white p-5 shadow-sm dark:border-border dark:bg-background/80 md:p-6"
          >
            <div className="mb-5 flex flex-col justify-between gap-3 border-b border-border pb-5 dark:border-border sm:flex-row sm:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-ink dark:text-primary-ink">
                  Analytics domain
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground dark:text-white">
                  {domain === "recruitment" ? "Recruitment Overview" : labels[domain]}
                </h2>
              </div>
              {state?.data && (
                <a
                  href={exportUrl(domain)}
                  className="inline-flex items-center gap-2 self-start rounded-xl border border-primary bg-primary-light px-4 py-2.5 text-sm font-bold text-primary-ink transition hover:-translate-y-0.5 hover:bg-primary-light dark:border-primary dark:bg-primary-light/40 dark:text-primary-ink"
                >
                  <Download className="h-4 w-4" /> Export CSV
                </a>
              )}
            </div>
            {(!state || state.loading) && (
              <p
                role="status"
                className="rounded-2xl border border-dashed border-primary bg-primary-light/60 p-6 text-sm font-semibold text-primary-ink dark:border-primary dark:bg-primary-light/20 dark:text-primary-ink"
              >
                Loading {labels[domain].toLowerCase()} analytics…
              </p>
            )}
            {state?.error && (
              <p
                role="alert"
                className="rounded-2xl border border-destructive bg-destructive-light p-4 text-sm font-semibold text-destructive-ink dark:border-destructive dark:bg-destructive-light/20 dark:text-destructive-ink"
              >
                {state.error}
              </p>
            )}
            {state?.data && (
              <div className="space-y-4">
                {Object.entries(state.data)
                  .filter(([key]) => !["domain", "filters", "range"].includes(key))
                  .map(([key, value]) => (
                    <Value key={key} name={key} value={value} drilldownQuery={drilldownQuery} />
                  ))}
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
