"use client";

import { useCallback, useEffect, useState } from "react";

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
    const response = await fetch(`/api/v1/candidates?${params}`, {
    });
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

  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">Recruitment intake</p>
        <h1>Candidates</h1>
        <div className="toolbar">
          <input
            placeholder="Search name, email, phone or skills"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void load(query, status, source);
            }}
          />
          <select aria-label="Candidate status" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW", "SELECTED", "HOLD", "REJECTED"].map((value) => <option key={value}>{value}</option>)}
          </select>
          <select aria-label="Candidate source" value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="">All sources</option>
            <option value="ONLINE">ONLINE</option>
            <option value="WALK_IN">WALK_IN</option>
          </select>
          <button onClick={() => void load(query, status, source)}>Search</button>
        </div>
        {message && <p role="status">{message}</p>}
        <div className="candidate-list">
          {items.map((candidate) => (
            <a
              className="candidate-row"
              href={`/hr/candidates/${candidate.id}`}
              key={candidate.id}
            >
              <span>
                {candidate.firstName} {candidate.lastName}
              </span>
              <span>{candidate.roleOfInterest}</span>
              <span>{candidate.status}</span>
              <small>{candidate.referenceNo}</small>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
