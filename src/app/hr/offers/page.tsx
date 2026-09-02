"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, Plus, RefreshCw, CheckCircle2, Send, FileText, Download } from "lucide-react";
import { cn } from "@/lib/utils";

type Template = { id: string; name: string; approvalRequired: boolean };
type Offer = { id: string; status: string; candidate: { firstName: string; lastName: string }; application: { referenceNo: string; requisition: { title: string } }; approvals: Array<{ stepOrder: number; status: string }> };
const JSON_HEADERS = { "content-type": "application/json" };

const OFFER_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
  PENDING_APPROVAL: "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300",
  APPROVED: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  SENT: "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300",
  ACCEPTED: "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300",
  DECLINED: "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300",
};

export default function OffersPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [form, setForm] = useState({ applicationId: "", hiringDecisionId: "", templateId: "", compensationSummary: "", templateName: "", templateBody: "" });
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const [templateResponse, offerResponse] = await Promise.all([fetch("/api/v1/offer-templates", { headers: JSON_HEADERS }), fetch("/api/v1/offers", { headers: JSON_HEADERS })]);
    const templateResult = await templateResponse.json();
    const offerResult = await offerResponse.json();
    if (!templateResponse.ok || !offerResponse.ok) return setMessage(templateResult.error?.message || offerResult.error?.message || "Could not load offers");
    setTemplates(templateResult.data);
    setOffers(offerResult.data.items);
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function createTemplate() {
    const response = await fetch("/api/v1/offer-templates", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ name: form.templateName, body: form.templateBody, approvalRequired: true, approvalSteps: ["HR approval"] }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not create template");
    setTemplates((current) => [result.data, ...current]);
    setForm((current) => ({ ...current, templateName: "", templateBody: "" }));
    setMessage("Template created");
  }

  async function createOffer() {
    const response = await fetch("/api/v1/offers", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ applicationId: form.applicationId, hiringDecisionId: form.hiringDecisionId, templateId: form.templateId, compensationSummary: form.compensationSummary }) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not create offer");
    setOffers((current) => [result.data, ...current]);
    setMessage("Offer created");
  }

  async function act(id: string, action: "approve" | "send") {
    const response = await fetch(`/api/v1/offers/${id}/${action}`, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({}) });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || `Could not ${action} offer`);
    setMessage(`Offer ${action}d`);
    await load();
  }

  const inputCls = "w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors";
  const labelCls = "block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5";

  return (
    <main className="page-shell space-y-6 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">Hiring &amp; Offers</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Offer Management</h1>
            <p className="text-sm text-indigo-100/75 font-medium max-w-lg">Create templates, generate offers, manage approvals, and send to candidates.</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-all active:scale-95 shrink-0 self-start">
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </section>

      {/* Feedback */}
      {message && (
        <div className={cn("rounded-2xl px-4 py-3 text-sm font-semibold border", message.includes("Could not") || message.includes("Failed") ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/60" : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60")}>
          {message}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Template Form */}
        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
          <div className="border-b border-border/50 pb-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Templates</p>
            <h2 className="text-lg font-extrabold text-foreground">Create Offer Template</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Template Name</label>
              <input value={form.templateName} onChange={(e) => setForm({ ...form, templateName: e.target.value })} placeholder="e.g. Standard Offer Letter" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Template Body</label>
              <textarea value={form.templateBody} onChange={(e) => setForm({ ...form, templateBody: e.target.value })} rows={4} className={inputCls} placeholder="Enter offer letter content…" />
            </div>
            <button type="button" onClick={() => void createTemplate()} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white transition-colors">
              <FileText className="h-4 w-4" />
              Create Template
            </button>
          </div>
          {templates.length > 0 && (
            <div className="space-y-2">
              <p className={labelCls}>Saved Templates ({templates.length})</p>
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/60 px-4 py-2.5">
                  <span className="text-sm font-semibold text-foreground">{t.name}</span>
                  {t.approvalRequired && <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300">Approval req.</span>}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Create Offer Form */}
        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
          <div className="border-b border-border/50 pb-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">New Offer</p>
            <h2 className="text-lg font-extrabold text-foreground">Create Offer</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Application ID</label>
              <input value={form.applicationId} onChange={(e) => setForm({ ...form, applicationId: e.target.value })} placeholder="Enter application ID…" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Hiring Decision ID</label>
              <input value={form.hiringDecisionId} onChange={(e) => setForm({ ...form, hiringDecisionId: e.target.value })} placeholder="Enter hiring decision ID…" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Template</label>
              <select value={form.templateId} onChange={(e) => setForm({ ...form, templateId: e.target.value })} className={inputCls}>
                <option value="">Select template…</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Compensation Summary</label>
              <textarea value={form.compensationSummary} onChange={(e) => setForm({ ...form, compensationSummary: e.target.value })} rows={3} className={inputCls} placeholder="Describe compensation package…" />
            </div>
            <button type="button" onClick={() => void createOffer()} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition-colors">
              <Plus className="h-4 w-4" />
              Create Offer
            </button>
          </div>
        </section>
      </div>

      {/* Offers List */}
      <section className="rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">All Offers</p>
            <h2 className="text-lg font-extrabold text-foreground">Offer Pipeline</h2>
          </div>
          <span className="text-sm font-black text-foreground">{offers.length}</span>
        </div>
        <div className="p-6 space-y-2.5">
          {offers.length === 0 && (
            <div className="rounded-2xl border border-border/40 bg-muted/30 p-10 text-center">
              <Award className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">No offers found.</p>
            </div>
          )}
          {offers.map((offer) => (
            <article key={offer.id} className="flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all hover:border-indigo-500/40 hover:bg-card hover:shadow-md">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-black text-sm">
                {offer.candidate.firstName[0]}{offer.candidate.lastName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <span className="block font-extrabold text-sm text-foreground truncate">{offer.candidate.firstName} {offer.candidate.lastName}</span>
                <span className="block text-xs text-muted-foreground font-medium truncate">{offer.application.requisition.title} · {offer.application.referenceNo}</span>
              </div>
              <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0", OFFER_STATUS_COLORS[offer.status] || "bg-muted text-muted-foreground")}>
                {offer.status.replace("_", " ")}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {offer.status === "PENDING_APPROVAL" && (
                  <button type="button" onClick={() => void act(offer.id, "approve")} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white transition-colors">
                    <CheckCircle2 className="h-3 w-3" />
                    Approve
                  </button>
                )}
                {offer.status === "APPROVED" && (
                  <button type="button" onClick={() => void act(offer.id, "send")} className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-xs font-bold text-white transition-colors">
                    <Send className="h-3 w-3" />
                    Send
                  </button>
                )}
                {!["DRAFT", "PENDING_APPROVAL"].includes(offer.status) && (
                  <a href={`/api/v1/offers/${offer.id}/download`} className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card hover:bg-muted px-3 py-1.5 text-xs font-bold text-foreground transition-colors">
                    <Download className="h-3 w-3" />
                    PDF
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
