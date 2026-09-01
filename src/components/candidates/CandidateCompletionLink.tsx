"use client";
import { useState } from "react";
export function CandidateCompletionLink({ candidateId }: { candidateId: string }) {
  const [url, setUrl] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  async function createLink() { setBusy(true); setMessage(""); try { const response = await fetch(`/api/v1/candidates/${candidateId}/completion-link`, { method: "POST" }); const result = await response.json(); if (!response.ok) throw new Error(result.error?.message || "Could not create completion link"); setUrl(result.data.url); setMessage("Secure link created. It expires in 7 days and can be used once."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create completion link"); } finally { setBusy(false); } }
  return <div className="completion-link-box"><button type="button" disabled={busy} onClick={() => void createLink()}>{busy ? "Scanning…" : "Create missing-details link"}</button>{url && <input aria-label="Candidate completion link" readOnly value={url} onFocus={(event) => event.currentTarget.select()} />}{message && <p role="status">{message}</p>}</div>;
}
