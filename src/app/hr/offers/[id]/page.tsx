"use client";

import { useEffect, useState } from "react";

type Detail = {
  id: string;
  status: string;
  compensationSummary?: string | null;
  candidate: { firstName: string; lastName: string };
  application: { referenceNo: string; requisition: { title: string } };
  template: { name: string };
  approvals: Array<{ stepOrder: number; status: string; actor?: { name: string } | null }>;
};

export default function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [offer, setOffer] = useState<Detail | null>(null);
  const [message, setMessage] = useState("Loading offer…");
  useEffect(() => {
    void (async () => {
      const values = await params;
      const response = await fetch(`/api/v1/offers/${values.id}`);
      const result = await response.json();
      if (!response.ok) return setMessage(result.error?.message || "Could not load offer");
      setOffer(result.data);
      setMessage("");
    })();
  }, [params]);
  async function action(name: "approve" | "send") {
    if (!offer) return;
    const response = await fetch(`/api/v1/offers/${offer.id}/${name}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || `Could not ${name} offer`);
    setOffer((current) =>
      current ? { ...current, ...(result.data.offer || result.data) } : current,
    );
    setMessage(`Offer ${name}d`);
  }
  if (!offer)
    return (
      <main className="page-shell">
        <section className="panel">
          <p role="status">{message}</p>
        </section>
      </main>
    );
  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">Offer detail</p>
        <h1>
          {offer.candidate.firstName} {offer.candidate.lastName}
        </h1>
        <p>
          {offer.application.referenceNo} · {offer.application.requisition.title} · {offer.status}
        </p>
        <p>{offer.compensationSummary || "No compensation summary"}</p>
        <p>Template: {offer.template.name}</p>
        <ul>
          {offer.approvals.map((approval) => (
            <li key={approval.stepOrder}>
              Step {approval.stepOrder}: {approval.status}{" "}
              {approval.actor ? `· ${approval.actor.name}` : ""}
            </li>
          ))}
        </ul>
        <div className="toolbar">
          {offer.status === "PENDING_APPROVAL" && (
            <button type="button" onClick={() => void action("approve")}>
              Approve
            </button>
          )}
          {offer.status === "APPROVED" && (
            <button type="button" onClick={() => void action("send")}>
              Send
            </button>
          )}
          <a href={`/api/v1/offers/${offer.id}/download`}>Download PDF</a>
        </div>
        {message && <p role="status">{message}</p>}
      </section>
    </main>
  );
}
