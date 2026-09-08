"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { assessInterviewRatings } from "@/modules/candidates/constants";

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

type ReviewFields = Pick<
  ReviewCandidate,
  | "hrInterviewScheduledBy"
  | "hrInterviewerName"
  | "hrCommunicationRating"
  | "hrTechnicalSkillsRating"
  | "hrOverallFit"
  | "hrComments"
>;
const ratings = [1, 2, 3, 4, 5];

export function CandidateHrReview({
  candidate,
  onSaved,
}: {
  candidate: ReviewCandidate;
  onSaved: (review: ReviewFields) => void;
}) {
  const router = useRouter();
  const completed = candidate.interviews.some((interview) => interview.status === "COMPLETED");
  const [communicationRating, setCommunicationRating] = useState(
    candidate.hrCommunicationRating || "",
  );
  const [technicalSkillsRating, setTechnicalSkillsRating] = useState(
    candidate.hrTechnicalSkillsRating || "",
  );
  const [comments, setComments] = useState(candidate.hrComments || "");
  const [reviewStatus, setReviewStatus] = useState(
    candidate.status === "HOLD" ||
      candidate.status === "REJECTED" ||
      candidate.status === "SHORTLISTED"
      ? candidate.status
      : assessInterviewRatings(
          candidate.hrCommunicationRating || "",
          candidate.hrTechnicalSkillsRating || "",
        )?.recommendation || "",
  );
  const [saving, setSaving] = useState(false);
  const assessment = assessInterviewRatings(communicationRating, technicalSkillsRating);
  const overallFit = assessment?.overallFit || "";
  function updateRatings(communication: string, technical: string) {
    setCommunicationRating(communication);
    setTechnicalSkillsRating(technical);
    setReviewStatus(assessInterviewRatings(communication, technical)?.recommendation || "");
  }
  const closed = candidate.status === "SELECTED" || candidate.status === "REJECTED";
  const [message, setMessage] = useState("");
  const [reviewer, setReviewer] = useState("Loading your profile…");
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/auth/session", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Profile unavailable");
        const result = await response.json();
        setReviewer(result.data.user.name || result.data.user.email);
      })
      .catch(() => {
        if (!controller.signal.aborted) setReviewer("Your signed-in account");
      });
    return () => controller.abort();
  }, []);

  function ratingOptions() {
    return (
      <>
        <option value="">Select rating</option>
        {ratings.map((rating) => (
          <option key={rating} value={rating}>
            {rating} / 5 —{" "}
            {
              [
                "Needs improvement",
                "Below expectations",
                "Meets expectations",
                "Strong",
                "Excellent",
              ][rating - 1]
            }
          </option>
        ))}
      </>
    );
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/candidates/${candidate.id}/review`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(reviewStatus ? { status: reviewStatus } : {}),
          communicationRating,
          technicalSkillsRating,
          comments,
        }),
      });
      const result = await response.json();
      if (!response.ok) return setMessage(result.error?.message || "Could not save HR review");
      onSaved(result.data);
      if (reviewStatus === "SHORTLISTED" || reviewStatus === "REJECTED") {
        const shouldSend = window.confirm(
          `HR review saved. Would you like to email the candidate about the ${reviewStatus === "SHORTLISTED" ? "shortlist" : "rejection"} decision?`,
        );
        if (shouldSend) {
          setMessage("Sending decision email…");
          const emailResponse = await fetch(`/api/v1/candidates/${candidate.id}/decision-email`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ status: reviewStatus }),
          });
          const emailResult = await emailResponse.json();
          if (!emailResponse.ok)
            return setMessage(
              `HR review saved, but the decision email was not sent: ${emailResult.error?.message || "delivery failed"}`,
            );
          setMessage("HR review saved and decision email sent");
          router.push("/hr/candidates");
          return;
        }
      }
      setMessage("HR review saved");
      router.push("/hr/candidates");
    } catch {
      setMessage("The request could not be completed. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!completed)
    return (
      <div className="workflow-lock" role="status">
        <strong>HR review locked</strong>
        <span>Complete check-out/interview before filling the HR review.</span>
      </div>
    );
  return (
    <form className="hr-review-form" onSubmit={save}>
      {closed && (
        <p role="status">
          This review is closed because the candidate is {candidate.status.toLowerCase()}.
        </p>
      )}
      <fieldset disabled={saving || closed} className="review-fields">
        <div className="hr-review-heading">
          <div>
            <p className="eyebrow">For HR use only</p>
            <h3>Post-interview assessment</h3>
          </div>
          <span className="hr-review-private-badge">Private review</span>
        </div>
        <p className="hr-review-intro">
          Capture the interview outcome and assessment for this candidate. HR identity is taken from
          the signed-in profile.
        </p>
        <div className="hr-review-identity">
          <div>
            <span>Reviewing as</span>
            <strong>{reviewer}</strong>
          </div>
          <div>
            <span>Interview progress</span>
            <strong>Completed · Ready for feedback</strong>
          </div>
        </div>
        <div className="hr-review-ratings">
          <label>
            <span>Communication</span>
            <select
              required
              value={communicationRating}
              onChange={(event) => updateRatings(event.target.value, technicalSkillsRating)}
            >
              {ratingOptions()}
            </select>
          </label>
          <label>
            <span>Technical skills</span>
            <select
              required
              value={technicalSkillsRating}
              onChange={(event) => updateRatings(communicationRating, event.target.value)}
            >
              {ratingOptions()}
            </select>
          </label>
          <label>
            <span>Overall fit · Automatic</span>
            <input
              readOnly
              value={overallFit ? `${overallFit} / 5` : "Rate both skills first"}
              className="min-h-12 w-full rounded-lg border border-border bg-muted px-3 text-foreground"
            />
            <small>
              Average of both ratings. 4–5 suggests Shortlisted; 3–below 4 suggests On hold; below 3
              suggests Rejected. Changing a rating updates the suggestion; you can override it
              before saving.
            </small>
          </label>
        </div>
        <fieldset>
          <legend>
            1. Recommendation <small>Choose one outcome</small>
          </legend>
          <div className="hr-review-status">
            <label className={reviewStatus === "SHORTLISTED" ? "is-selected" : ""}>
              <input
                name="hr-review-status"
                required
                type="radio"
                value="SHORTLISTED"
                checked={reviewStatus === "SHORTLISTED"}
                onChange={(event) => setReviewStatus(event.target.value)}
              />
              <span>
                <strong>Shortlisted</strong>
                <small>Continue with the hiring process</small>
              </span>
            </label>
            <label className={reviewStatus === "HOLD" ? "is-selected" : ""}>
              <input
                name="hr-review-status"
                type="radio"
                value="HOLD"
                checked={reviewStatus === "HOLD"}
                onChange={(event) => setReviewStatus(event.target.value)}
              />
              <span>
                <strong>On hold</strong>
                <small>Keep the candidate under review</small>
              </span>
            </label>
            <label className={reviewStatus === "REJECTED" ? "is-selected" : ""}>
              <input
                name="hr-review-status"
                type="radio"
                value="REJECTED"
                checked={reviewStatus === "REJECTED"}
                onChange={(event) => setReviewStatus(event.target.value)}
              />
              <span>
                <strong>Rejected</strong>
                <small>Close this application</small>
              </span>
            </label>
          </div>
        </fieldset>
        <label className="hr-review-comments">
          <span>2. Interview summary and reasons for your recommendation</span>
          <textarea
            required
            maxLength={5000}
            rows={4}
            placeholder="Describe strengths, areas of concern, and why you recommend this outcome."
            value={comments}
            onChange={(event) => setComments(event.target.value)}
          />
        </label>
        <div className="hr-review-actions">
          <span className="hr-review-save-hint">Your review is saved to the candidate record.</span>
          <button className="hr-review-save-button" type="submit" disabled={saving}>
            {saving ? "Saving HR review..." : "Save HR review"}
          </button>
        </div>
      </fieldset>
      {message && (
        <p className="hr-review-message" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
