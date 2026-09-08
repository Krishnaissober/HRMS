"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Question = { id: string; prompt: string; competency?: string; scoringGuidance?: string };
type Interview = {
  id: string;
  referenceNo: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  mode: string;
  status: string;
  noShowReason?: string | null;
  candidate: { id: string; firstName: string; lastName: string; email: string };
  template?: { name: string; questions: Question[] } | null;
  participants: Array<{ user: { name: string; email: string } }>;
  evaluations: Array<{
    id: string;
    interviewer: { name: string; email: string };
    scores: Record<string, number>;
    comments?: string;
    recommendation?: string;
    status: string;
  }>;
  activities: Array<{
    id: string;
    action: string;
    note?: string | null;
    createdAt: string;
    actor?: { name: string; email: string };
  }>;
};

export default function InterviewDetailPage() {
  const routeParams = useParams<{ id: string }>();
  const routeId = routeParams?.id;
  const [interview, setInterview] = useState<Interview | null>(null);
  const [message, setMessage] = useState("Loading interview…");
  const [scores, setScores] = useState<Record<string, string>>({});
  const [comments, setComments] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [noShowReason, setNoShowReason] = useState("");
  const [noShowNotes, setNoShowNotes] = useState("");
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");
  useEffect(() => {
    if (!routeId) return;
    void (async () => {
      try {
        const response = await fetch(`/api/v1/interviews/${routeId}`);
        const result = await response.json();
        if (!response.ok) return setMessage(result.error?.message || "Could not load interview");
        setInterview(result.data);
        if (result.data.template)
          setScores(
            Object.fromEntries(
              result.data.template.questions.map((question: Question) => [question.id, ""]),
            ),
          );
        setMessage("");
      } catch {
        setMessage("Could not load interview");
      }
    })();
  }, [routeId]);
  if (!interview)
    return (
      <main className="page-shell">
        <section className="panel">
          <p role="status">{message}</p>
        </section>
      </main>
    );
  const currentInterview = interview;
  const canManageAttendance = ["SCHEDULED", "RESCHEDULED", "CHECKED_IN"].includes(interview.status);
  const headers = { "content-type": "application/json" };
  async function attendance(path: "check-in" | "check-out") {
    const response = await fetch(`/api/v1/interviews/${currentInterview.id}/${path}`, {
      method: "POST",
      headers,
      body: "{}",
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not update attendance");
    setInterview((current) => (current ? { ...current, ...result.data } : current));
  }
  async function markNoShow() {
    if (!noShowReason.trim()) return setMessage("A no-show reason is required");
    const response = await fetch(`/api/v1/interviews/${currentInterview.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "NO_SHOW", noShowReason, noShowNotes }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not mark no-show");
    setInterview((current) => (current ? { ...current, ...result.data } : current));
    setMessage("No-show recorded");
  }
  async function reschedule() {
    if (!rescheduleStart || !rescheduleEnd) return setMessage("Select the new start and end time");
    if (new Date(rescheduleEnd) <= new Date(rescheduleStart))
      return setMessage("The new end time must be after the new start time");
    const hasPreviousReschedule = currentInterview.activities.some(
      (activity) => activity.action === "INTERVIEW_RESCHEDULED",
    );
    if (hasPreviousReschedule && !rescheduleReason.trim())
      return setMessage("A reason is required after the first reschedule");
    const response = await fetch(`/api/v1/interviews/${currentInterview.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        status: "RESCHEDULED",
        scheduledStart: new Date(rescheduleStart).toISOString(),
        scheduledEnd: new Date(rescheduleEnd).toISOString(),
        rescheduleReason: rescheduleReason || undefined,
      }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not reschedule interview");
    setInterview((current) => (current ? { ...current, ...result.data } : current));
    setRescheduleOpen(false);
    setRescheduleReason("");
    setMessage("Interview rescheduled");
  }
  async function submitEvaluation(event: React.FormEvent) {
    event.preventDefault();
    const parsedScores = Object.fromEntries(
      Object.entries(scores).map(([id, value]) => [id, Number(value)]),
    );
    if (Object.values(parsedScores).some((value) => !Number.isFinite(value)))
      return setMessage("Complete every template score");
    const response = await fetch(`/api/v1/interviews/${currentInterview.id}/evaluations`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        scores: parsedScores,
        comments,
        recommendation: recommendation || undefined,
      }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not submit evaluation");
    setInterview((current) =>
      current
        ? {
            ...current,
            evaluations: [
              ...current.evaluations.filter((evaluation) => evaluation.id !== result.data.id),
              result.data,
            ],
          }
        : current,
    );
    setMessage("Evaluation submitted");
  }
  return (
    <main className="page-shell">
      <section className="panel interview-detail-panel">
        <p className="eyebrow">Interview detail</p>
        <h1>{interview.referenceNo}</h1>
        <p>
          {interview.candidate.firstName} {interview.candidate.lastName} ·{" "}
          {interview.candidate.email}
        </p>
        <dl className="details">
          <dt>Schedule</dt>
          <dd>
            {new Date(interview.scheduledStart).toLocaleString()} –{" "}
            {new Date(interview.scheduledEnd).toLocaleString()} ({interview.timezone})
          </dd>
          <dt>Mode</dt>
          <dd>{interview.mode}</dd>
          <dt>Status</dt>
          <dd>{interview.status}</dd>
          <dt>Panel</dt>
          <dd>
            {interview.participants
              .map((participant) => `${participant.user.name} (${participant.user.email})`)
              .join(", ")}
          </dd>
        </dl>
        {canManageAttendance && (
          <div className="toolbar">
            {["SCHEDULED", "RESCHEDULED"].includes(interview.status) && (
              <button type="button" onClick={() => void attendance("check-in")}>
                Candidate check-in
              </button>
            )}
            {["SCHEDULED", "RESCHEDULED"].includes(interview.status) && (
              <button type="button" onClick={() => void markNoShow()}>
                Mark no-show
              </button>
            )}
            {["SCHEDULED", "RESCHEDULED"].includes(interview.status) && (
              <button type="button" onClick={() => setRescheduleOpen((current) => !current)}>
                Reschedule interview
              </button>
            )}
            {interview.status === "CHECKED_IN" && (
              <button type="button" onClick={() => void attendance("check-out")}>
                Candidate check-out
              </button>
            )}
          </div>
        )}
        {interview.status === "COMPLETED" && (
          <div className="completed-interview-action">
            <strong>Interview completed</strong>
            <span>The candidate is ready for HR review and hiring decision.</span>
            <Link
              className="button-link"
              href={`/hr/candidates/${encodeURIComponent(interview.candidate.id)}`}
            >
              Review candidate
            </Link>
          </div>
        )}
        {rescheduleOpen && (
          <div className="reschedule-panel">
            <strong>Reschedule interview</strong>
            <span>
              Reason is optional for the first reschedule and required for later reschedules.
            </span>
            <div className="form-grid">
              <label>
                New start
                <input
                  required
                  type="datetime-local"
                  value={rescheduleStart}
                  onChange={(event) => setRescheduleStart(event.target.value)}
                />
              </label>
              <label>
                New end
                <input
                  required
                  type="datetime-local"
                  value={rescheduleEnd}
                  onChange={(event) => setRescheduleEnd(event.target.value)}
                />
              </label>
              <label>
                Reason
                <textarea
                  required={interview.activities.some(
                    (activity) => activity.action === "INTERVIEW_RESCHEDULED",
                  )}
                  value={rescheduleReason}
                  onChange={(event) => setRescheduleReason(event.target.value)}
                />
              </label>
            </div>
            <button type="button" onClick={() => void reschedule()}>
              Save reschedule
            </button>
          </div>
        )}
        {["SCHEDULED", "RESCHEDULED"].includes(interview.status) && (
          <div className="form-grid">
            <label>
              No-show reason
              <input
                value={noShowReason}
                onChange={(event) => setNoShowReason(event.target.value)}
              />
            </label>
            <label>
              No-show notes
              <textarea
                value={noShowNotes}
                onChange={(event) => setNoShowNotes(event.target.value)}
              />
            </label>
          </div>
        )}
        <h2>Evaluation / scorecard{interview.template ? ` · ${interview.template.name}` : ""}</h2>
        {interview.template ? (
          <form className="candidate-form" onSubmit={submitEvaluation}>
            {interview.template.questions.map((question) => (
              <label key={question.id}>
                {question.prompt}
                {question.competency ? ` (${question.competency})` : ""}
                {question.scoringGuidance ? ` — ${question.scoringGuidance}` : ""}
                <input
                  type="number"
                  value={scores[question.id] || ""}
                  onChange={(event) =>
                    setScores((current) => ({ ...current, [question.id]: event.target.value }))
                  }
                  required
                />
              </label>
            ))}
            <label>
              Comments
              <textarea value={comments} onChange={(event) => setComments(event.target.value)} />
            </label>
            <label>
              Recommendation
              <select
                value={recommendation}
                onChange={(event) => setRecommendation(event.target.value)}
              >
                <option value="">Select</option>
                <option value="HIRE">Hire</option>
                <option value="HOLD">Hold</option>
                <option value="REJECT">Reject</option>
              </select>
            </label>
            <button type="submit">Submit evaluation</button>
          </form>
        ) : (
          <p className="form-message">
            No scorecard template was attached when this interview was created.
          </p>
        )}
        <ul>
          {interview.evaluations.map((evaluation) => (
            <li key={evaluation.id}>
              {evaluation.interviewer.name} · {evaluation.status} ·{" "}
              {evaluation.recommendation || "No recommendation"} ·{" "}
              {evaluation.comments || "No comments"}
            </li>
          ))}
        </ul>
        <h2>Interview history</h2>
        <ul>
          {interview.activities.map((activity) => (
            <li key={activity.id}>
              {activity.action} {activity.note ? `· ${activity.note}` : ""} ·{" "}
              {activity.actor ? `${activity.actor.name} (${activity.actor.email})` : "System"} ·{" "}
              {new Date(activity.createdAt).toLocaleString()}
            </li>
          ))}
        </ul>
        {message && <p role="status">{message}</p>}
      </section>
    </main>
  );
}
