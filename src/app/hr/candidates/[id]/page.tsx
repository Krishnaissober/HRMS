"use client";

import { useEffect, useState } from "react";
import { CandidateHrReview } from "@/components/candidates/CandidateHrReview";
import { CandidateEditForm } from "@/components/candidates/CandidateEditForm";
import Link from "next/link";

type Candidate = {
  id: string;
  referenceNo: string;
  firstName: string;
  lastName: string;
  status: string;
  source: string;
  email: string;
  phone: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postalCode?: string | null;
  education?: string | null;
  employmentHistory?: string | null;
  currentCompany?: string | null;
  howFound?: string | null;
  otherSource?: string | null;
  referenceName?: string | null;
  reasonForJobChange?: string | null;
  professionalReference?: string | null;
  professionalReferenceName?: string | null;
  professionalReferenceProfile?: string | null;
  professionalReferenceExperience?: string | null;
  professionalReferenceContact?: string | null;
  signatureName?: string | null;
  acknowledgementDate?: string | null;
  expectedCompensation?: string | null;
  ctc?: string | null;
  hikePercentage?: string | null;
  noticePeriod?: string | null;
  roleOfInterest: string;
  experience?: string | null;
  skills?: string | null;
  submissions: Array<{
    id: string;
    source: string;
    referenceNo: string;
    submittedAt: string;
    formData: Record<string, unknown>;
  }>;
  applications: Array<{
    id: string;
    referenceNo: string;
    status: string;
    requisition: { referenceNo: string; title: string };
  }>;
  interviews: Array<{
    id: string;
    applicationId: string;
    status: string;
    scheduledStart: string;
    scheduledEnd: string;
  }>;
  visits: Array<{ id: string; visitDate: string; status: string }>;
  documents: Array<{ id: string; fileName: string }>;
  activities: Array<{
    id: string;
    action: string;
    fromStatus?: string;
    toStatus?: string;
    createdAt: string;
    actor?: { name: string; email: string };
  }>;
  hrInterviewScheduledBy?: string | null;
  hrInterviewerName?: string | null;
  hrCommunicationRating?: string | null;
  hrTechnicalSkillsRating?: string | null;
  hrOverallFit?: string | null;
  hrComments?: string | null;
  hrReviewedAt?: string | null;
};
type Decision = {
  id: string;
  decision: string;
  reason?: string | null;
  createdAt: string;
  actor?: { name?: string | null; email?: string | null } | null;
  application: { referenceNo: string };
};

export default function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [message, setMessage] = useState("Loading candidate...");
  const [reason, setReason] = useState("");
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [decisionApplicationId, setDecisionApplicationId] = useState("");
  const [decision, setDecision] = useState("HIRE");
  const [editing, setEditing] = useState(false);
  const [decisionSaving, setDecisionSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { id } = await params;
      const response = await fetch(`/api/v1/candidates/${id}`);
      const result = await response.json();
      if (!response.ok) return setMessage(result.error?.message || "Could not load candidate");
      setCandidate(result.data);
      const applicationId = result.data.applications[0]?.id || "";
      setDecisionApplicationId(applicationId);
      const decisionsResponse = await fetch(
        `/api/v1/hiring-decisions?applicationId=${encodeURIComponent(applicationId)}`,
      );
      const decisionsResult = await decisionsResponse.json();
      if (decisionsResponse.ok) setDecisions(decisionsResult.data);
      setMessage("");
    })();
  }, [params]);
  if (!candidate)
    return (
      <main className="page-shell">
        <section className="panel">
          <p role="status">{message}</p>
        </section>
      </main>
    );
  const headers = { "content-type": "application/json" };
  const currentCandidate = candidate;
  const canEdit = candidate.status === "SELECTED";
  const completed = candidate.interviews.some((interview) => interview.status === "COMPLETED");
  const existingInterview = candidate.interviews.find(
    (interview) => interview.status !== "CANCELLED",
  );

  async function recordDecision() {
    if (decisionSaving) return;
    if (!decisionApplicationId) return setMessage("Select an application first");
    setDecisionSaving(true);
    try {
      const response = await fetch("/api/v1/hiring-decisions", {
        method: "POST",
        headers,
        body: JSON.stringify({
          applicationId: decisionApplicationId,
          decision,
          reason: reason || undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok) return setMessage(result.error?.message || "Could not record decision");
      setDecisions((current) => [result.data, ...current]);
      setReason("");
      setMessage("Hiring decision recorded");
      const refreshed = await fetch(`/api/v1/candidates/${currentCandidate.id}`);
      if (refreshed.ok) setCandidate((await refreshed.json()).data);
    } catch {
      setMessage("Could not confirm the decision. Refresh the page before retrying.");
    } finally {
      setDecisionSaving(false);
    }
  }
  async function attendance(action: "check-in" | "check-out", visitId?: string) {
    const response = await fetch(`/api/v1/candidates/${currentCandidate.id}/visits/${action}`, {
      method: "POST",
      headers,
      body: JSON.stringify(visitId ? { visitId } : {}),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || `Could not ${action}`);
    setMessage(`Candidate ${action} completed`);
  }

  return (
    <main className="page-shell candidate-review-page">
      <section className="panel candidate-profile-panel">
        <div className="candidate-profile-header">
          <div>
            <p className="eyebrow">Hiring · HR review</p>
            <h1>
              {candidate.firstName} {candidate.lastName}
            </h1>
            <p className="candidate-profile-meta">
              {candidate.roleOfInterest} · {candidate.referenceNo}
            </p>
            <p className="review-page-intro">
              Record your assessment after the interview. Submitted candidate details remain
              read-only until selection.
            </p>
          </div>
          <div className="candidate-profile-actions">
            <Link className="button-link secondary" href={`/hr/candidates/${candidate.id}/preview`}>
              View submitted form
            </Link>
            <span
              className={`candidate-status-badge candidate-status-${candidate.status.toLowerCase()}`}
            >
              {candidate.status}
            </span>
            {canEdit && (
              <button type="button" onClick={() => setEditing((current) => !current)}>
                {editing ? "Close editor" : "Edit candidate"}
              </button>
            )}
          </div>
        </div>
        {editing ? (
          <>
            <p className="form-message">
              Correct information submitted by the candidate, then save the changes. Updates are
              recorded in the activity history.
            </p>
            <CandidateEditForm
              candidate={candidate}
              onSaved={(updated) => {
                setCandidate(updated as Candidate);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
              onMessage={setMessage}
            />
          </>
        ) : (
          <dl className="details">
            <dt>Email</dt>
            <dd>{candidate.email}</dd>
            <dt>Phone</dt>
            <dd>{candidate.phone}</dd>
            <dt>Role of interest</dt>
            <dd>{candidate.roleOfInterest}</dd>
            <dt>Skills</dt>
            <dd>{candidate.skills || "Not provided"}</dd>
          </dl>
        )}
        <h2>Interview context</h2>
        <ul>
          {candidate.applications.map((application) => (
            <li key={application.id}>
              <strong>{application.requisition.title}</strong>
              {" · "}
              {existingInterview?.applicationId === application.id
                ? existingInterview.status.replaceAll("_", " ")
                : "Not scheduled"}{" "}
              {!existingInterview && (
                <a
                  className="button-link candidate-schedule-button"
                  href={`/hr/interviews/new?candidateId=${encodeURIComponent(candidate.id)}&applicationId=${encodeURIComponent(application.id)}`}
                >
                  Schedule interview
                </a>
              )}
              {existingInterview?.applicationId === application.id && (
                <a
                  className="button-link candidate-schedule-button"
                  href={`/hr/interviews/${encodeURIComponent(existingInterview.id)}`}
                >
                  View interview
                </a>
              )}
            </li>
          ))}
        </ul>
        <h2>Your review</h2>
        <CandidateHrReview
          candidate={candidate}
          onSaved={(review) => setCandidate({ ...candidate, ...review })}
        />
        {completed && candidate.hrReviewedAt && candidate.status === "SHORTLISTED" ? (
          <>
            <h2>Next step: hiring decision</h2>
            {candidate.status === "SHORTLISTED" && (
              <p className="form-message">
                This candidate is shortlisted. No additional interview is required; choose the next
                hiring action below.
              </p>
            )}
            <div className="form-grid">
              <label>
                Application
                <select
                  value={decisionApplicationId}
                  onChange={(event) => setDecisionApplicationId(event.target.value)}
                >
                  {candidate.applications.map((application) => (
                    <option key={application.id} value={application.id}>
                      {application.referenceNo} · {application.requisition.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Decision
                <select value={decision} onChange={(event) => setDecision(event.target.value)}>
                  <option value="HIRE">Hire</option>
                  <option value="HOLD">Hold</option>
                  <option value="REJECT">Reject</option>
                </select>
              </label>
              <label>
                Decision reason / notes
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} />
              </label>
              <button type="button" disabled={decisionSaving} onClick={() => void recordDecision()}>
                {decisionSaving ? "Saving decision…" : "Record decision"}
              </button>
            </div>
          </>
        ) : (
          <div className="workflow-lock" role="status">
            <strong>
              {candidate.status === "SELECTED" ? "Candidate selected" : "Review comes first"}
            </strong>
            <span>
              {candidate.status === "SELECTED"
                ? "Candidate corrections are now available. Continue in Employees for onboarding."
                : "Save a shortlist recommendation to unlock the hiring decision. Hold and reject outcomes do not require another decision here."}
            </span>
          </div>
        )}
        <ul>
          {decisions.map((item) => (
            <li key={item.id}>
              {item.decision} · {item.reason || "No reason"} · {item.actor?.name || item.actor?.email || "Author unavailable"} ·{" "}
              {new Date(item.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
        {candidate.source === "WALK_IN" && (
          <details className="review-records">
            <summary>Walk-in visit history</summary>
            <button type="button" onClick={() => void attendance("check-in")}>
              Check in visit
            </button>
            <ul>
              {candidate.visits.map((visit) => (
                <li key={visit.id}>
                  {new Date(visit.visitDate).toLocaleString()} · {visit.status}{" "}
                  {visit.status === "CHECKED_IN" && (
                    <button type="button" onClick={() => void attendance("check-out", visit.id)}>
                      Check out
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
        <details className="review-records">
          <summary>Documents and printable profile ({candidate.documents.length})</summary>
          <ul>
            {candidate.documents.map((document) => (
              <li key={document.id}>
                <a href={`/api/v1/candidates/${candidate.id}/documents/${document.id}/download`}>
                  {document.fileName}
                </a>
              </li>
            ))}
          </ul>
          <a href={`/api/v1/candidates/${candidate.id}/print`}>Download printable PDF profile</a>
        </details>
        {message && <p role="status">{message}</p>}
      </section>
    </main>
  );
}
