"use client";

import { useEffect, useState } from "react";

type OfferView = { candidateName: string; position: string; compensationSummary?: string | null; expiryDate?: string | null };
export default function OfferResponsePage() {
  const [token, setToken] = useState("");
  const [offer, setOffer] = useState<OfferView | null>(null);
  const [message, setMessage] = useState("Loading offer…");
  const [notes, setNotes] = useState("");
  useEffect(() => { const value = new URLSearchParams(window.location.search).get("token") || ""; setToken(value); void (async () => { const response = await fetch(`/api/v1/public/offers/view?token=${encodeURIComponent(value)}`); const result = await response.json(); if (!response.ok) return setMessage(result.error?.message || "This offer is unavailable"); setOffer(result.data); setMessage(""); })(); }, []);
  async function respond(responseValue: "ACCEPTED" | "DECLINED") { const response = await fetch("/api/v1/public/offers/respond", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token, response: responseValue, notes }) }); const result = await response.json(); setMessage(response.ok ? `Offer ${responseValue.toLowerCase()}.` : result.error?.message || "Could not record response"); }
  return <main className="page-shell"><section className="panel"><p className="eyebrow">Offer response</p><h1>Review your offer</h1>{offer ? <><p>{offer.candidateName} · {offer.position}</p><p>{offer.compensationSummary || "Compensation details are provided in the offer document."}</p><p>{offer.expiryDate ? `Expires ${new Date(offer.expiryDate).toLocaleDateString()}` : "No expiry date provided"}</p><label>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} /></label><div className="toolbar"><button type="button" onClick={() => void respond("ACCEPTED")}>Accept offer</button><button type="button" onClick={() => void respond("DECLINED")}>Decline offer</button></div></> : <p role="status">{message}</p>}{message && offer && <p role="status">{message}</p>}</section></main>;
}
