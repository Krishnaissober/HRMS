"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, Clock3, FileText, RefreshCw, ShieldCheck, XCircle } from "lucide-react";

type Review = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleOfInterest: string;
  referenceNo: string;
  hiringApprovalRequestedAt: string | null;
  hrReviewedAt: string | null;
  hrComments: string | null;
  hrCommunicationRating: string | null;
  hrTechnicalSkillsRating: string | null;
  hrOverallFit: string | null;
  documents: Array<{ id: string; fileName: string; kind: string }>;
  applications: Array<{ requisition: { title: string } }>;
  submissions: Array<{ referenceNo: string; submittedAt: string; formData: unknown }>;
  interviews: Array<{
    id: string;
    stage: string;
    status: string;
    scheduledStart: string;
    scheduledEnd: string;
    evaluations: Array<{
      comments: string | null;
      recommendation: string | null;
      scores: unknown;
      interviewer: { name: string; email: string };
    }>;
    participants: Array<{ user: { name: string; email: string } }>;
  }>;
  activities: Array<{
    action: string;
    note: string | null;
    createdAt: string;
    actor: { name: string } | null;
  }>;
};

function dateTime(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "Not recorded";
}

function stageTitle(value: string) {
  return value === "PHYSICAL" ? "Physical interview" : "Online interview";
}

export default function HiringApprovalsPage() {
  const [items, setItems] = useState<Review[]>([]);
  const [selected, setSelected] = useState<Review | null>(null);
  const [message, setMessage] = useState("Loading approval queue…");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setMessage("Loading approval queue…");
    const response = await fetch("/api/v1/admin/hiring-approvals");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "Could not load approval queue");
    setItems(result.data as Review[]);
    setSelected((current) => current && result.data.find((item: Review) => item.id === current.id) ? current : null);
    setMessage("");
  }, []);

  useEffect(() => {
    void load().catch((error) => setMessage(error instanceof Error ? error.message : "Could not load approval queue"));
  }, [load]);

  async function openReview(id: string) {
    const response = await fetch(`/api/v1/admin/hiring-approvals/${encodeURIComponent(id)}`);
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not load candidate review");
    setSelected(result.data as Review);
  }

  async function decide(decision: "APPROVED" | "REJECTED") {
    if (!selected || saving) return;
    const remarks = window.prompt(
      decision === "REJECTED" ? "Reason for rejecting hiring:" : "Optional approval remarks:",
      "",
    );
    if (remarks === null) return;
    setSaving(true);
    const response = await fetch(`/api/v1/admin/hiring-approvals/${encodeURIComponent(selected.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ decision, remarks }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(result.error?.message || "Could not record Master decision");
    setSelected(null);
    await load();
  }

  if (selected) {
    const position = selected.applications[0]?.requisition.title || selected.roleOfInterest;
    return (
      <main className="page-shell space-y-6 pb-12">
        <button type="button" onClick={() => setSelected(null)} className="text-sm font-bold text-primary hover:underline">
          ← Back to approval queue
        </button>
        <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Master Admin · Hiring approval</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight">{selected.firstName} {selected.lastName}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{position} · {selected.referenceNo}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={saving} onClick={() => void decide("REJECTED")} className="inline-flex items-center gap-2 rounded-xl border border-destructive px-4 py-2.5 text-sm font-bold text-destructive-ink hover:bg-destructive-light disabled:opacity-50"><XCircle className="h-4 w-4" />Reject hiring</button>
              <button type="button" disabled={saving} onClick={() => void decide("APPROVED")} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"><CheckCircle2 className="h-4 w-4" />Approve hiring</button>
            </div>
          </div>
        </section>
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <h2 className="font-semibold">Candidate application</h2>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Email</span><br />{selected.email}</p><p><span className="text-muted-foreground">Phone</span><br />{selected.phone}</p><p><span className="text-muted-foreground">Submitted</span><br />{dateTime(selected.submissions[0]?.submittedAt)}</p><p><span className="text-muted-foreground">HR reviewed</span><br />{dateTime(selected.hrReviewedAt)}</p></div>
          </section>
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"><h2 className="font-semibold">HR evaluation</h2><div className="mt-4 grid gap-3 text-sm sm:grid-cols-3"><p><span className="text-muted-foreground">Communication</span><br />{selected.hrCommunicationRating || "—"} / 5</p><p><span className="text-muted-foreground">Technical</span><br />{selected.hrTechnicalSkillsRating || "—"} / 5</p><p><span className="text-muted-foreground">Overall fit</span><br />{selected.hrOverallFit || "—"} / 5</p></div>{selected.hrComments && <p className="mt-4 rounded-xl bg-muted/40 p-3 text-sm">{selected.hrComments}</p>}</section>
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm lg:col-span-2"><h2 className="font-semibold">Interview evidence</h2><div className="mt-4 grid gap-4 md:grid-cols-2">{selected.interviews.map((interview) => <div key={interview.id} className="rounded-xl border border-border/70 p-4"><div className="flex items-center justify-between gap-3"><p className="font-bold">{stageTitle(interview.stage)}</p><span className="rounded-full bg-muted px-2 py-1 text-[10px] font-bold uppercase">{interview.status}</span></div><p className="mt-2 text-xs text-muted-foreground">{dateTime(interview.scheduledStart)} · {interview.participants.map((item) => item.user.name).join(", ") || "Interviewer not recorded"}</p>{interview.evaluations.map((evaluation, index) => <div key={index} className="mt-3 border-t border-border pt-3 text-sm"><p className="font-semibold">{evaluation.interviewer.name}</p><p className="text-muted-foreground">{evaluation.recommendation || "No recommendation"}</p>{evaluation.comments && <p className="mt-1">{evaluation.comments}</p>}</div>)}</div>)}</div></section>
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"><h2 className="font-semibold">Documents</h2><div className="mt-4 space-y-2">{selected.documents.length ? selected.documents.map((document) => <p key={document.id} className="flex items-center gap-2 text-sm"><FileText className="h-4 w-4 text-muted-foreground" />{document.fileName} <span className="text-xs text-muted-foreground">({document.kind})</span></p>) : <p className="text-sm text-muted-foreground">No candidate documents are attached.</p>}</div></section>
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm"><h2 className="font-semibold">Timeline</h2><div className="mt-4 space-y-3">{selected.activities.map((activity, index) => <div key={`${activity.createdAt}-${index}`} className="border-l-2 border-primary/30 pl-3"><p className="text-sm font-semibold">{activity.action.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{activity.actor?.name || "System"} · {dateTime(activity.createdAt)}</p>{activity.note && <p className="mt-1 text-sm">{activity.note}</p>}</div>)}</div></section>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell space-y-6 pb-12">
      <section className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-6 shadow-sm md:flex-row md:items-end md:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Master Admin · Control center</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Hiring approvals</h1><p className="mt-2 text-sm text-muted-foreground">Review complete candidate packages before HR can make the final hiring decision.</p></div><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold hover:bg-muted"><RefreshCw className="h-4 w-4" />Refresh</button></section>
      {message && <div className="rounded-xl border border-border bg-card p-4 text-sm font-semibold text-muted-foreground">{message}</div>}
      {!message && !items.length && <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center"><ShieldCheck className="mx-auto h-8 w-8 text-success-ink" /><h2 className="mt-3 font-semibold">No candidates awaiting approval</h2><p className="mt-1 text-sm text-muted-foreground">HR-submitted candidate packages will appear here.</p></div>}
      <div className="space-y-3">{items.map((item) => <button key={item.id} type="button" onClick={() => void openReview(item.id)} className="flex w-full flex-col gap-4 rounded-2xl border border-border/70 bg-card p-5 text-left shadow-sm transition hover:border-primary/50 hover:shadow-md md:flex-row md:items-center md:justify-between"><div className="flex items-start gap-3"><span className="mt-0.5 rounded-xl bg-primary/10 p-2 text-primary"><Clock3 className="h-5 w-5" /></span><div><p className="font-semibold">{item.firstName} {item.lastName}</p><p className="mt-1 text-sm text-muted-foreground">{item.applications[0]?.requisition.title || item.roleOfInterest} · sent {dateTime(item.hiringApprovalRequestedAt)}</p></div></div><span className="inline-flex items-center gap-2 text-sm font-bold text-primary">Open package <ArrowRight className="h-4 w-4" /></span></button>)}</div>
      <p className="text-xs text-muted-foreground">Master approval unlocks HR&apos;s final action; it does not create an employee or onboarding record.</p>
    </main>
  );
}
