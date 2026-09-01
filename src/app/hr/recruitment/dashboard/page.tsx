"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

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
    const response = await fetch(`/api/v1/dashboards/recruitment?${query}`, {
    });
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

  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">Triple Minds HR</p>
        <h1>Recruitment pipeline</h1>
        <div className="dashboard-actions"><Link className="recruitment-form-button social" href="/hr/candidates/new#form-editor-social">Social media form</Link><Link className="recruitment-form-button walk-in" href="/hr/candidates/new/walk-in">Walk-in form</Link><a href={link("/hr/reports", "")}>Open Reports &amp; Analytics</a></div>
        <div className="dashboard-filters">
          <label>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
          <label>To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
          <button type="button" onClick={() => void load(from, to)}>Apply range</button>
        </div>
        {message && <p role="status" className="form-message">{message}</p>}
        {data && (
          <>
            <div className="dashboard-grid">
              <a className="metric-card" href={link("/hr/candidates", "")}><span>Applications</span><strong>{data.applications}</strong><small>View candidate applications</small></a>
              <a className="metric-card" href="#open-positions"><span>Open positions</span><strong>{data.openPositions}</strong><small>Published requisitions</small></a>
              <a className="metric-card" href={link("/hr/interviews", "")} title={data.definitions.interviewPassRate}><span>Interview pass rate</span><strong>{data.interviewPassRate}%</strong><small>Hire recommendations</small></a>
              <a className="metric-card" href={link("/hr/interviews", "")} title={data.definitions.interviewNoShowRate}><span>Interview no-show rate</span><strong>{data.interviewNoShowRate}%</strong><small>View interviews</small></a>
              <a className="metric-card" href={link("/hr/offers", "")} title={data.definitions.offerAcceptanceRate}><span>Offer acceptance rate</span><strong>{data.offerAcceptanceRate}%</strong><small>View offers</small></a>
            </div>
            <section id="time"><h2>Hiring speed</h2><div className="dashboard-grid"><a className="metric-card" href={link("/hr/offers", "")} title={data.definitions.timeToHire}><span>Average time to hire</span><strong>{data.averageTimeToHireDays == null ? "Not available" : `${data.averageTimeToHireDays} days`}</strong><small>Approval to accepted offer</small></a><a className="metric-card" href={link("/hr/offers", "")} title={data.definitions.timeToFill}><span>Average time to fill</span><strong>{data.averageTimeToFillDays == null ? "Not available" : `${data.averageTimeToFillDays} days`}</strong><small>Opening to accepted offer</small></a></div></section>
            <section><h2>Pipeline counts</h2>{Object.keys(data.pipelineCounts).length === 0 ? <p className="empty-state">No applications match this date range.</p> : <div className="dashboard-grid">{Object.entries(data.pipelineCounts).map(([status, count]) => <a className="metric-card compact" key={status} href={link("/hr/candidates", "", { status })}><span>{status}</span><strong>{count}</strong><small>View underlying records</small></a>)}</div>}</section>
            <section><h2>Source effectiveness</h2>{data.sourceEffectiveness.length === 0 ? <p className="empty-state">No candidate sources match this date range.</p> : <div className="dashboard-list">{data.sourceEffectiveness.map((source) => <a key={source.source} href={link("/hr/candidates", "", { source: source.source })}><strong>{source.source}</strong><span>{source.applications} applications · {source.acceptedOffers} accepted offers</span><small>{source.acceptanceRate}% application-to-accepted-offer rate</small></a>)}</div>}</section>
            <section id="open-positions"><h2>Open positions</h2>{data.openRequisitions.length === 0 ? <p className="empty-state">No published requisitions.</p> : <div className="dashboard-list">{data.openRequisitions.map((requisition) => <a key={requisition.id} href={link("/hr/candidates", "")}><strong>{requisition.referenceNo} · {requisition.title}</strong><span>{requisition._count.applications} applications</span><small>{requisition.openedAt ? `Opened ${new Date(requisition.openedAt).toLocaleDateString()}` : "Opening date unavailable"}</small></a>)}</div>}</section>
          </>
        )}
      </section>
    </main>
  );
}
