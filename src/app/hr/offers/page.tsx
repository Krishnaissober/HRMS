"use client";

import { useCallback, useEffect, useState } from "react";

type Template = { id: string; name: string; approvalRequired: boolean };
type Offer = { id: string; status: string; candidate: { firstName: string; lastName: string }; application: { referenceNo: string; requisition: { title: string } }; approvals: Array<{ stepOrder: number; status: string }> };
const JSON_HEADERS = { "content-type": "application/json" };

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
  return <main className="page-shell"><section className="panel"><p className="eyebrow">Hiring and offers</p><h1>Offer management</h1><div className="toolbar"><button type="button" onClick={() => void load()}>Refresh offers</button></div>{message && <p role="status">{message}</p>}<h2>Offer template</h2><div className="form-grid"><label>Name<input value={form.templateName} onChange={(event) => setForm({ ...form, templateName: event.target.value })} /></label><label>Template body<textarea value={form.templateBody} onChange={(event) => setForm({ ...form, templateBody: event.target.value })} /></label><button type="button" onClick={() => void createTemplate()}>Create template</button></div><h2>Create offer</h2><div className="form-grid"><label>Application ID<input value={form.applicationId} onChange={(event) => setForm({ ...form, applicationId: event.target.value })} /></label><label>Hiring decision ID<input value={form.hiringDecisionId} onChange={(event) => setForm({ ...form, hiringDecisionId: event.target.value })} /></label><label>Template<select value={form.templateId} onChange={(event) => setForm({ ...form, templateId: event.target.value })}><option value="">Select template</option>{templates.map((template) => <option value={template.id} key={template.id}>{template.name}</option>)}</select></label><label>Compensation summary<textarea value={form.compensationSummary} onChange={(event) => setForm({ ...form, compensationSummary: event.target.value })} /></label><button type="button" onClick={() => void createOffer()}>Create offer</button></div><h2>Offers</h2><div className="candidate-list">{offers.map((offer) => <article className="candidate-row" key={offer.id}><span>{offer.candidate.firstName} {offer.candidate.lastName}</span><span>{offer.application.requisition.title} · {offer.application.referenceNo}</span><span>{offer.status}</span><span>{offer.status === "PENDING_APPROVAL" && <button type="button" onClick={() => void act(offer.id, "approve")}>Approve</button>} {offer.status === "APPROVED" && <button type="button" onClick={() => void act(offer.id, "send")}>Send</button>} {!['DRAFT', 'PENDING_APPROVAL'].includes(offer.status) && <a href={`/api/v1/offers/${offer.id}/download`}>Download PDF</a>}</span></article>)}</div></section></main>;
}
