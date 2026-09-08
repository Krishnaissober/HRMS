"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Archive, RefreshCw, Search } from "lucide-react";

type Candidate = {
  id: string;
  referenceNo: string;
  firstName: string;
  lastName: string;
  email: string;
  roleOfInterest: string;
  status: "HOLD" | "REJECTED";
};

export default function CandidateArchivePage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [items, setItems] = useState<Candidate[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      view: "archive",
      page: String(page),
      pageSize: "20",
      q: query,
    });
    if (status) params.set("status", status);
    void (async () => {
      try {
        const response = await fetch(`/api/v1/candidates?${params}`, { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error?.message || "Could not load the archive.");
        if (controller.signal.aborted) return;
        setItems(body.data.items);
        setTotal(body.data.total);
        setPages(body.data.totalPages);
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : "Could not load the archive.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [status, page, query, refresh]);

  const button =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 disabled:opacity-50";
  return (
    <main className="page-shell space-y-6 pb-12">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-br from-slate-900 to-indigo-950 p-6 text-white">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">
            Phase 1 · Hiring
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-extrabold">
            <Archive aria-hidden="true" />
            Candidate archive
          </h1>
          <p className="mt-3 text-sm text-indigo-100">
            On-hold and rejected candidates, with their saved forms and review history.
          </p>
        </div>
        <Link
          href="/hr/candidates"
          className="rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/20"
        >
          All candidates
        </Link>
      </header>
      <section className="space-y-5 rounded-3xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2" aria-label="Archive status filters">
          {[
            ["", "All archived"],
            ["HOLD", "On hold"],
            ["REJECTED", "Rejected"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
              className={`${button} ${status === value ? "bg-indigo-600 text-white hover:bg-indigo-700" : "text-foreground"}`}
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            className={`${button} ml-auto`}
            disabled={loading}
            onClick={() => setRefresh((value) => value + 1)}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
        </div>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            setQuery(search.trim());
            setPage(1);
          }}
        >
          <input
            aria-label="Search archived candidates"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, phone or position…"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-background px-4 text-foreground"
          />
          <button className={button} type="submit">
            <Search className="h-4 w-4" aria-hidden="true" />
            Search
          </button>
        </form>
        {loading ? (
          <p role="status">Loading archived candidates…</p>
        ) : error ? (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {total} candidate{total === 1 ? "" : "s"} found
            </p>
            {!items.length && (
              <p className="rounded-xl bg-muted p-8 text-center text-muted-foreground">
                No candidates match these filters.
              </p>
            )}
            <ul className="space-y-3">
              {items.map((candidate) => (
                <li
                  key={candidate.id}
                  className="flex flex-wrap items-center gap-4 rounded-2xl border border-border p-4"
                >
                  <div className="min-w-0 flex-1 basis-52">
                    <h2 className="font-bold text-foreground">
                      {candidate.firstName} {candidate.lastName}
                    </h2>
                    <p className="break-words text-sm text-muted-foreground">{candidate.email}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {candidate.roleOfInterest || "Position not provided"} ·{" "}
                      {candidate.referenceNo}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${candidate.status === "HOLD" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}
                  >
                    {candidate.status === "HOLD" ? "On hold" : "Rejected"}
                  </span>
                  <Link className={button} href={`/hr/candidates/${candidate.id}/preview`}>
                    View form
                  </Link>
                  <Link className={button} href={`/hr/candidates/${candidate.id}`}>
                    View review
                  </Link>
                </li>
              ))}
            </ul>
            {pages > 1 && (
              <nav
                aria-label="Archive pagination"
                className="flex items-center justify-between gap-3"
              >
                <button
                  type="button"
                  className={button}
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </button>
                <span className="text-sm">
                  Page {page} of {pages}
                </span>
                <button
                  type="button"
                  className={button}
                  disabled={page >= pages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </main>
  );
}
