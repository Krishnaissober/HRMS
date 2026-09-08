"use client";

import { useEffect, useState } from "react";

export default function NewInterviewPage() {
  const defaultInstructions =
    "Please join 10 minutes before the scheduled time. Keep your resume and a valid photo ID available for the interview.";
  const [fields, setFields] = useState({
    candidateId: "",
    applicationId: "",
    participantIds: "",
    templateId: "",
    round: "1",
    scheduledStart: "",
    scheduledEnd: "",
    timezone: "UTC",
    mode: "IN_PERSON",
    meetingLink: "",
    instructions: defaultInstructions,
  });
  const [hrName, setHrName] = useState("Loading HR profile…");
  const [hrUserId, setHrUserId] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const candidateId = query.get("candidateId") || "";
    const applicationId = query.get("applicationId") || "";
    if (candidateId || applicationId)
      setFields((current) => ({ ...current, candidateId, applicationId }));
    void (async () => {
      const sessionResponse = await fetch("/api/v1/auth/session");
      if (sessionResponse.ok) {
        const sessionResult = await sessionResponse.json();
        setHrName(sessionResult.data.user.name || sessionResult.data.user.email);
        setHrUserId(sessionResult.data.user.id);
        setFields((current) => ({ ...current, participantIds: sessionResult.data.user.id }));
      }
      if (!candidateId) return;
      const candidateResponse = await fetch(
        `/api/v1/candidates/${encodeURIComponent(candidateId)}`,
      );
      if (candidateResponse.ok) {
        const candidateResult = await candidateResponse.json();
        setCandidateEmail(candidateResult.data.email || "");
      }
    })();
  }, []);
  function update(name: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/v1/interviews", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...fields,
        timezone: fields.timezone || "UTC",
        round: Number(fields.round),
        templateId: fields.templateId || undefined,
        participantIds: fields.participantIds
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        scheduledStart: new Date(fields.scheduledStart).toISOString(),
        scheduledEnd: new Date(fields.scheduledEnd).toISOString(),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      const fieldErrors = result.error?.details?.fieldErrors || result.error?.details?.formErrors;
      const detail =
        fieldErrors && typeof fieldErrors === "object"
          ? Object.entries(fieldErrors)
              .flatMap(([field, errors]) =>
                Array.isArray(errors) ? errors.map((error) => `${field}: ${error}`) : [],
              )
              .join("; ")
          : "";
      const conflict =
        result.error?.details?.interviewReferenceNo &&
        result.error?.details?.scheduledStart &&
        result.error?.details?.scheduledEnd
          ? `Conflict with ${result.error.details.interviewReferenceNo}: ${new Date(result.error.details.scheduledStart).toLocaleString()} – ${new Date(result.error.details.scheduledEnd).toLocaleString()}. Choose another time or interviewer.`
          : "";
      return setMessage(
        detail || conflict || result.error?.message || "Could not create interview",
      );
    }
    if (candidateEmail) {
      const subject = encodeURIComponent(`Interview invitation · ${result.data.referenceNo}`);
      const body = encodeURIComponent(
        `${fields.instructions}\n\nInterview mode: ${fields.mode}\nScheduled start: ${fields.scheduledStart}\nScheduled end: ${fields.scheduledEnd}\n\nRegards,\n${hrName}`,
      );
      window.open(
        `mailto:${encodeURIComponent(candidateEmail)}?subject=${subject}&body=${body}`,
        "_blank",
      );
    }
    window.location.assign(`/hr/interviews/${encodeURIComponent(result.data.id)}`);
  }
  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">Interview scheduling</p>
        <h1>Create interview</h1>
        <form className="candidate-form" onSubmit={submit}>
          <div className="form-grid">
            <label>
              Candidate email (from candidate form)
              <input readOnly value={candidateEmail || "Loading candidate email…"} />
            </label>
            <label>
              Candidate ID
              <input
                required
                value={fields.candidateId}
                onChange={(event) => update("candidateId", event.target.value)}
              />
            </label>
            <label>
              Application ID
              <input
                required
                value={fields.applicationId}
                onChange={(event) => update("applicationId", event.target.value)}
              />
            </label>
            <label>
              Interview round
              <input readOnly value="Round 1 (automatic)" />
            </label>
            <label>
              Interviewer
              <input readOnly required value={hrName} />
            </label>
            <label>
              Start
              <input
                required
                type="datetime-local"
                value={fields.scheduledStart}
                onChange={(event) => update("scheduledStart", event.target.value)}
              />
            </label>
            <label>
              End
              <input
                required
                type="datetime-local"
                value={fields.scheduledEnd}
                onChange={(event) => update("scheduledEnd", event.target.value)}
              />
            </label>
            <label>
              Mode
              <select
                value={fields.mode}
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    mode: event.target.value,
                    meetingLink: event.target.value === "VIDEO" ? current.meetingLink : "",
                  }))
                }
              >
                <option value="IN_PERSON">In person</option>
                <option value="VIDEO">Video</option>
                <option value="PHONE">Phone</option>
              </select>
            </label>
            {fields.mode === "VIDEO" && (
              <label>
                Meeting link
                <input
                  required
                  type="url"
                  value={fields.meetingLink}
                  onChange={(event) => update("meetingLink", event.target.value)}
                  placeholder="https://meet.example.com/..."
                />
              </label>
            )}
          </div>
          <label>
            Default instructions
            <textarea
              value={fields.instructions}
              onChange={(event) => update("instructions", event.target.value)}
            />
          </label>
          <button type="submit" disabled={!hrUserId}>
            Create interview and email candidate
          </button>
          {message && <p role="status">{message}</p>}
        </form>
      </section>
    </main>
  );
}
