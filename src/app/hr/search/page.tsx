"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Search, UserRound, Users } from "lucide-react";

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  kind: "Candidate" | "Employee";
};

type Candidate = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  roleOfInterest?: string | null;
};

type Employee = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle?: string | null;
  employeeNo?: string | null;
};

export default function HrSearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [message, setMessage] = useState(
    searchParams.get("q")
      ? "Searching candidates and employees…"
      : "Search by name, email, role, or employee number.",
  );
  const [loading, setLoading] = useState(Boolean(searchParams.get("q")));

  useEffect(() => {
    const target = searchParams.get("q")?.trim() || "";
    setQuery(target);
    if (!target) {
      setResults([]);
      setLoading(false);
      setMessage("Search by name, email, role, or employee number.");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setMessage("Searching candidates and employees…");
    void Promise.all([
      fetch(`/api/v1/candidates?q=${encodeURIComponent(target)}&page=1&pageSize=100`),
      fetch(`/api/v1/employees?q=${encodeURIComponent(target)}&page=1&pageSize=100`),
    ])
      .then(async ([candidateResponse, employeeResponse]) => {
        const [candidateResult, employeeResult] = await Promise.all([
          candidateResponse.json(),
          employeeResponse.json(),
        ]);
        if (!candidateResponse.ok || !employeeResponse.ok) {
          throw new Error(
            candidateResult.error?.message || employeeResult.error?.message || "Search failed.",
          );
        }
        if (cancelled) return;
        const candidateItems = (candidateResult.data?.items || []) as Candidate[];
        const employeeItems = (employeeResult.data?.items || []) as Employee[];
        setResults([
          ...candidateItems.map((item) => ({
            id: `candidate-${item.id}`,
            title: `${item.firstName} ${item.lastName}`.trim(),
            subtitle: `${item.email} · ${item.roleOfInterest || "Candidate"}`,
            href: `/hr/candidates/${item.id}`,
            kind: "Candidate" as const,
          })),
          ...employeeItems.map((item) => ({
            id: `employee-${item.id}`,
            title: `${item.firstName} ${item.lastName}`.trim(),
            subtitle: `${item.email} · ${item.jobTitle || item.employeeNo || "Employee"}`,
            href: `/hr/employees/${item.id}`,
            kind: "Employee" as const,
          })),
        ]);
        setMessage(
          candidateItems.length || employeeItems.length ? "" : "No matching records found.",
        );
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setResults([]);
          setMessage(error instanceof Error ? error.message : "Search failed.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = query.trim();
    router.push(target ? `/hr/search?q=${encodeURIComponent(target)}` : "/hr/search");
  }

  return (
    <main className="page-shell space-y-6 pb-12">
      <section className="prism-light relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl md:p-8">
        <div className="relative z-10 space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-300">
            HR workspace
          </p>
          <h1 className="text-2xl font-black tracking-tight md:text-3xl">Global search</h1>
          <p className="max-w-2xl text-sm font-medium text-indigo-100/75 md:text-base">
            Find candidates and employees quickly from one place.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search candidates and employees</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name, email, role, or employee number…"
              className="h-12 w-full rounded-xl border border-border bg-background pl-12 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              autoFocus
            />
          </label>
          <button
            type="submit"
            className="h-12 rounded-xl bg-indigo-600 px-6 text-sm font-bold text-white transition hover:bg-indigo-500 active:scale-[0.98]"
          >
            Search
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Results
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight">People directory</h2>
          </div>
          {results.length > 0 && (
            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-600">
              {results.length} found
            </span>
          )}
        </div>
        {loading ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Searching…
          </p>
        ) : results.length ? (
          <div className="space-y-3">
            {results.map((result) => (
              <Link
                key={result.id}
                href={result.href}
                className="group flex items-center gap-4 rounded-2xl border border-border/60 p-4 transition hover:-translate-y-0.5 hover:border-indigo-500/40 hover:shadow-sm"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                  {result.kind === "Candidate" ? (
                    <UserRound className="size-5" />
                  ) : (
                    <Users className="size-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{result.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {result.kind} · {result.subtitle}
                  </span>
                </span>
                <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-indigo-600" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
