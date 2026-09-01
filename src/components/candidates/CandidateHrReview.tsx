"use client";

import { useState } from "react";

type ReviewCandidate = {
  id: string;
  status: string;
  interviews: Array<{ status: string }>;
  hrInterviewScheduledBy?: string | null;
  hrInterviewerName?: string | null;
  hrCommunicationRating?: string | null;
  hrTechnicalSkillsRating?: string | null;
  hrOverallFit?: string | null;
  hrComments?: string | null;
};

type ReviewFields = Pick<ReviewCandidate, "hrInterviewScheduledBy" | "hrInterviewerName" | "hrCommunicationRating" | "hrTechnicalSkillsRating" | "hrOverallFit" | "hrComments">;
const ratings = [1, 2, 3, 4, 5];

export function CandidateHrReview({ candidate, onSaved }: { candidate: ReviewCandidate; onSaved: (review: ReviewFields) => void }) {
  const completed = candidate.interviews.some((interview) => interview.status === "COMPLETED");
  const [communicationRating, setCommunicationRating] = useState(candidate.hrCommunicationRating || "");
  const [technicalSkillsRating, setTechnicalSkillsRating] = useState(candidate.hrTechnicalSkillsRating || "");
  const [overallFit, setOverallFit] = useState(candidate.hrOverallFit || "");
  const [comments, setComments] = useState(candidate.hrComments || "");
  const [reviewStatus, setReviewStatus] = useState(candidate.status === "HOLD" || candidate.status === "REJECTED" || candidate.status === "SHORTLISTED" ? candidate.status : "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  function ratingOptions() {
    return <><option value="">Select rating</option>{ratings.map((rating) => <option key={rating} value={rating}>{rating} / 5</option>)}</>;
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    const response = await fetch(`/api/v1/candidates/${candidate.id}/review`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...(reviewStatus ? { status: reviewStatus } : {}), communicationRating, technicalSkillsRating, overallFit, comments }) });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) return setMessage(result.error?.message || "Could not save HR review");
    onSaved(result.data);
    setMessage("HR review saved");
  }

  if (!completed) return <div className="workflow-lock" role="status"><strong>HR review locked</strong><span>Complete check-out/interview before filling the HR review.</span></div>;
  return <form className="hr-review-form" onSubmit={save}>
    <div className="hr-review-heading"><div><p className="eyebrow">For HR use only</p><h3>Candidate review</h3></div><span className="hr-review-private-badge">Private review</span></div>
    <p className="hr-review-intro">Capture the interview outcome and assessment for this candidate. HR identity is taken from the signed-in profile.</p>
    <div className="hr-review-identity"><div><span>Interview scheduled by</span><strong>{candidate.hrInterviewScheduledBy || "Signed-in HR"}</strong></div><div><span>Interviewer name</span><strong>{candidate.hrInterviewerName || candidate.hrInterviewScheduledBy || "Signed-in HR"}</strong></div></div>
    <fieldset><legend>Review outcome <small>Optional until a decision is made</small></legend><div className="hr-review-status"><label className={reviewStatus === "SHORTLISTED" ? "is-selected" : ""}><input name="hr-review-status" type="radio" value="SHORTLISTED" checked={reviewStatus === "SHORTLISTED"} onChange={(event) => setReviewStatus(event.target.value)} /><span><strong>Shortlisted</strong><small>Continue with the hiring process</small></span></label><label className={reviewStatus === "HOLD" ? "is-selected" : ""}><input name="hr-review-status" type="radio" value="HOLD" checked={reviewStatus === "HOLD"} onChange={(event) => setReviewStatus(event.target.value)} /><span><strong>On hold</strong><small>Keep the candidate under review</small></span></label><label className={reviewStatus === "REJECTED" ? "is-selected" : ""}><input name="hr-review-status" type="radio" value="REJECTED" checked={reviewStatus === "REJECTED"} onChange={(event) => setReviewStatus(event.target.value)} /><span><strong>Rejected</strong><small>Close this application</small></span></label></div></fieldset>
    <div className="hr-review-ratings"><label><span>Communication</span><select value={communicationRating} onChange={(event) => setCommunicationRating(event.target.value)}>{ratingOptions()}</select></label><label><span>Technical skills</span><select value={technicalSkillsRating} onChange={(event) => setTechnicalSkillsRating(event.target.value)}>{ratingOptions()}</select></label><label><span>Overall fit</span><select value={overallFit} onChange={(event) => setOverallFit(event.target.value)}>{ratingOptions()}</select></label></div>
    <label className="hr-review-comments"><span>Comments and recommendation notes</span><textarea rows={4} placeholder="Add a concise summary of the interview…" value={comments} onChange={(event) => setComments(event.target.value)} /></label>
    <div className="hr-review-actions"><span className="hr-review-save-hint">Your review is saved to the candidate record.</span><button className="hr-review-save-button" type="submit" disabled={saving}>{saving ? "Saving HR review..." : "Save HR review"}</button></div>{message && <p className="hr-review-message" role="status">{message}</p>}
  </form>;
}
