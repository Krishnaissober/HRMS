"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import { useCallback, useEffect, useState } from "react";

type Interview = { id: string; referenceNo: string; scheduledStart: string; timezone: string; status: string; candidate: { firstName: string; lastName: string }; };
type CandidateToSchedule = { id: string; referenceNo: string; firstName: string; lastName: string; email: string; roleOfInterest: string; status: string; applications: { id: string; status: string }[]; interviews: { id: string; status: string }[] };

export default function InterviewListPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Interview[]>([]);
  const [candidates, setCandidates] = useState<CandidateToSchedule[]>([]);
  const [message, setMessage] = useState("Loading interviews…");
  const load = useCallback(async () => {
    setMessage("Loading interviews…");
    const [interviewsResponse, candidatesResponse] = await Promise.all([
      fetch(`/api/v1/interviews?q=${encodeURIComponent(query)}`),
      fetch(`/api/v1/candidates?q=${encodeURIComponent(query)}&pageSize=100`),
    ]);
    const interviewsResult = await interviewsResponse.json();
    const candidatesResult = await candidatesResponse.json();
    if (!interviewsResponse.ok) return setMessage(interviewsResult.error?.message || "Could not load interviews");
    if (!candidatesResponse.ok) return setMessage(candidatesResult.error?.message || "Could not load candidates to schedule");
    setItems(interviewsResult.data.items);
    setCandidates(candidatesResult.data.items);
    setMessage("");
  }, [query]);
  useEffect(() => { void load(); }, [load]);
  const scheduled = items.filter((interview) => ["SCHEDULED", "RESCHEDULED", "CHECKED_IN"].includes(interview.status));
  const completed = items.filter((interview) => interview.status === "COMPLETED");
  const toBeScheduled = candidates.filter((candidate) => ["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW"].includes(candidate.status) && candidate.interviews.length === 0);
  const list = (listItems: Interview[]) => <div className="candidate-list">{listItems.map((interview) => <a className="candidate-row" href={`/hr/interviews/${interview.id}`} key={interview.id}><span>{interview.candidate.firstName} {interview.candidate.lastName}</span><span>{new Date(interview.scheduledStart).toLocaleString()} ({interview.timezone})</span><span>{interview.status}</span><small>{interview.referenceNo}</small></a>)}</div>;
  return <main className="page-shell"><section className="panel interviews-page-panel"><div className="interviews-page-header"><div><p className="eyebrow">Interview management</p><h1>Interviews</h1><p>Keep upcoming conversations moving and review completed interviews in one place.</p></div><a className="interviews-create-button" href="/hr/interviews/new">+ Create interview</a></div><div className="interviews-toolbar toolbar"><input placeholder="Search reference or candidate" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load(); }} /><button className="interviews-search-button" type="button" onClick={() => void load()}>Search</button></div>{message && <p role="status">{message}</p>}<section className="interview-list-section"><h2>To be scheduled <span>{toBeScheduled.length}</span></h2>{toBeScheduled.length ? <div className="candidate-list">{toBeScheduled.map((candidate) => <div className="candidate-row interview-candidate-row" key={candidate.id}><span><strong>{candidate.firstName} {candidate.lastName}</strong><small>{candidate.referenceNo}</small></span><span>{candidate.roleOfInterest}</span><span>{candidate.status}</span><span className="interview-candidate-actions"><a className="candidate-preview-button" href={`/hr/candidates/${candidate.id}/preview`}>Preview candidate</a><a className="interview-schedule-button" href={`/hr/interviews/new?candidateId=${encodeURIComponent(candidate.id)}&applicationId=${encodeURIComponent(candidate.applications[0]?.id || "")}`}>Schedule interview</a></span></div>)}</div> : <p className="empty-state">No candidates are waiting for an interview.</p>}</section><section className="interview-list-section"><h2>Scheduled <span>{scheduled.length}</span></h2>{scheduled.length ? list(scheduled) : <p className="empty-state">No scheduled interviews.</p>}</section><section className="interview-list-section"><h2>Completed <span>{completed.length}</span></h2>{completed.length ? list(completed) : <p className="empty-state">No completed interviews.</p>}</section></section></main>;
}
