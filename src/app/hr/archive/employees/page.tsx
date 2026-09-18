"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, BriefcaseBusiness, Flame, LogOut, RefreshCw, Search, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type FormerEmployee = {
  id: string;
  employeeNo: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  department?: string | null;
  status: string;
  separationType?: "FIRED" | "LEFT_COMPANY" | null;
  separationReason?: string | null;
  separatedAt?: string | null;
};

type Filter = "" | "FIRED" | "LEFT_COMPANY";

export default function FormerEmployeesArchivePage() {
  const [filter, setFilter] = useState<Filter>("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<FormerEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ view: "archive", page: "1", pageSize: "100" });
    if (filter) params.set("separationType", filter);
    if (query) params.set("q", query);
    void (async () => {
      try {
        const response = await fetch(`/api/v1/employees?${params}`, {
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error?.message || "Could not load former employees");
        if (!controller.signal.aborted) setItems(result.data.items);
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : "Could not load former employees");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [filter, query, refresh]);

  const button =
    "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-50";

  return (
    <main className="page-shell space-y-6 pb-12">
      <header className="enterprise-hero flex flex-wrap items-center justify-between gap-4 rounded-xl bg-card p-6 text-foreground">
        <div>
          <p className="text-xs font-bold uppercase text-primary-ink">Employee lifecycle</p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold">
            <Users aria-hidden="true" /> Former employees
          </h1>
          <p className="mt-3 text-sm text-primary-ink">
            Employees who were fired or left the company, separated from active staff.
          </p>
        </div>
        <Link href="/hr/employees" className={button}>
          <BriefcaseBusiness className="h-4 w-4" /> Active employees
        </Link>
      </header>

      <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
        <nav
          className="flex flex-wrap gap-2 border-b border-border pb-4"
          aria-label="Archive sections"
        >
          <Link className={button} href="/hr/archive">
            <Archive className="h-4 w-4" /> Candidate records
          </Link>
          <Link
            className={`${button} bg-primary text-white hover:bg-primary`}
            href="/hr/archive/employees"
          >
            <Users className="h-4 w-4" /> Former employees
          </Link>
        </nav>

        <div className="flex flex-wrap items-center gap-2" aria-label="Former employee filters">
          {[
            ["", "All", Users],
            ["LEFT_COMPANY", "Left company", LogOut],
            ["FIRED", "Fired", Flame],
          ].map(([value, label, Icon]) => {
            const FilterIcon = Icon as typeof Users;
            return (
              <button
                key={String(value)}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value as Filter)}
                className={cn(
                  button,
                  filter === value &&
                    (value === "FIRED"
                      ? "border-destructive bg-destructive-light text-destructive-ink"
                      : value === "LEFT_COMPANY"
                        ? "border-info bg-info-light text-info-ink"
                        : "bg-primary text-white hover:bg-primary"),
                )}
              >
                <FilterIcon className="h-4 w-4" /> {String(label)}
              </button>
            );
          })}
          <button
            type="button"
            title="Refresh"
            onClick={() => setRefresh((value) => value + 1)}
            disabled={loading}
            className={`${button} ml-auto h-10 w-10 px-0`}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </button>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search.trim());
          }}
        >
          <input
            aria-label="Search former employees"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, employee number or position"
            className="min-h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-foreground"
          />
          <button type="submit" className={button}>
            <Search className="h-4 w-4" /> Search
          </button>
        </form>

        {loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading former employees...
          </p>
        ) : error ? (
          <p role="alert" className="text-sm text-destructive-ink">
            {error}
          </p>
        ) : items.length === 0 ? (
          <p className="border-t border-border py-10 text-center text-sm text-muted-foreground">
            No former employees match this filter.
          </p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {items.map((employee) => {
              const fired = employee.separationType === "FIRED";
              const classified = Boolean(employee.separationType);
              return (
                <li key={employee.id} className="flex flex-wrap items-center gap-4 py-4">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      !classified
                        ? "bg-muted text-muted-foreground"
                        : fired
                          ? "bg-destructive-light text-destructive-ink"
                          : "bg-info-light text-info-ink",
                    )}
                  >
                    {fired ? (
                      <Flame className="h-4 w-4" />
                    ) : classified ? (
                      <LogOut className="h-4 w-4" />
                    ) : (
                      <Archive className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1 basis-56">
                    <Link
                      href={`/hr/employees/${employee.id}`}
                      className="font-bold text-foreground hover:underline"
                    >
                      {employee.employeeNo} · {employee.firstName} {employee.lastName}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">
                      {employee.jobTitle} · {employee.department || "No department"} ·{" "}
                      {employee.email}
                    </p>
                    {employee.separationReason && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {employee.separationReason}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-3 py-1 text-xs font-bold",
                        !classified
                          ? "bg-muted text-muted-foreground"
                          : fired
                            ? "bg-destructive-light text-destructive-ink"
                            : "bg-info-light text-info-ink",
                      )}
                    >
                      {fired ? "Fired" : classified ? "Left company" : "Former employee"}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {employee.separatedAt
                        ? new Date(employee.separatedAt).toLocaleDateString()
                        : "Legacy archived record"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
