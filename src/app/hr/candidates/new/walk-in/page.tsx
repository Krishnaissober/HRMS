"use client";

import { useEffect, useState } from "react";
import { CandidateForm } from "@/components/candidates/CandidateForm";

export default function WalkInCandidatePage() {
  const [requisitions, setRequisitions] = useState<Array<{ id: string; referenceNo: string; title: string }>>([]);
  const [message, setMessage] = useState("Loading published positions…");
  useEffect(() => { void fetch("/api/v1/dashboards/recruitment").then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error?.message || "Could not load positions"); setRequisitions(result.data.openRequisitions); setMessage(""); }).catch((error) => setMessage(error instanceof Error ? error.message : "Could not load positions")); }, []);
  return <main className="page-shell"><section className="panel"><p className="eyebrow">Triple Minds Walk-In Application</p><h1>Register walk-in candidate</h1><p>Search by email or mobile to prefill an existing candidate, or enter a new candidate record.</p>{message && <p role="status" className="form-message">{message}</p>}<CandidateForm mode="WALK_IN" requisitions={requisitions} /></section></main>;
}
