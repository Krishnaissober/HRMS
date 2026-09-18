"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";

type Candidate = {
  id: string;
  referenceNo: string;
  firstName: string;
  lastName: string;
  email: string;
  roleOfInterest: string;
  status: string;
  applications: Array<{ id: string; status: string }>;
  interviews: Array<{ id: string; stage: string; status: string; mode: string }>;
};
type Template = { id: string; name: string; description?: string | null };

const defaultInstructions =
  "Please join 10 minutes before the scheduled time. Keep your resume and a valid photo ID available for the interview.";

export default function NewInterviewPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [candidateId, setCandidateId] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [hrName, setHrName] = useState("Loading your profile…");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [fields, setFields] = useState({
    templateId: "",
    round: "1",
    stage: "ONLINE",
    scheduledStart: "",
    scheduledEnd: "",
    timezone: "UTC",
    mode: "IN_PERSON",
    location: "",
    meetingLink: "",
    instructions: defaultInstructions,
  });
  const [message, setMessage] = useState("Loading scheduling options…");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedCandidate = params.get("candidateId") || "";
    const requestedApplication = params.get("applicationId") || "";
    void (async () => {
      try {
        const [sessionResponse, candidateResponse, templateResponse] = await Promise.all([
          fetch("/api/v1/auth/session"),
          fetch("/api/v1/candidates?page=1&pageSize=100&direction=desc"),
          fetch("/api/v1/interview-templates"),
        ]);
        const sessionResult = await sessionResponse.json();
        const candidateResult = await candidateResponse.json();
        const templateResult = await templateResponse.json();
        if (!sessionResponse.ok) throw new Error("Could not load your HR profile");
        if (!candidateResponse.ok)
          throw new Error(candidateResult.error?.message || "Could not load candidates");
        setHrName(sessionResult.data.user.name || sessionResult.data.user.email);
        setParticipantId(sessionResult.data.user.id);
        setCandidates(candidateResult.data.items);
        if (templateResponse.ok) setTemplates(templateResult.data);
        const initial = candidateResult.data.items.find(
          (candidate: Candidate) => candidate.id === requestedCandidate,
        );
        const firstCandidate =
          initial ||
          candidateResult.data.items.find(
            (candidate: Candidate) =>
              ["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW"].includes(candidate.status) &&
              candidate.interviews.length === 0,
          );
        const selected = initial || firstCandidate;
        if (selected) {
          setCandidateId(selected.id);
          setCandidateEmail(selected.email);
          setApplicationId(requestedApplication || selected.applications[0]?.id || "");
        }
        setMessage("");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not load scheduling options");
      }
    })();
  }, []);

  const eligibleCandidates = useMemo(
    () =>
      candidates.filter((candidate) => {
        if (!["APPLIED", "SCREENING", "SHORTLISTED", "INTERVIEW"].includes(candidate.status)) return false;
        if (fields.stage === "ONLINE")
          return !candidate.interviews.some(
            (interview) =>
              interview.stage === "ONLINE" &&
              !["CANCELLED", "NO_SHOW"].includes(interview.status),
          );
        return (
          candidate.interviews.some(
            (interview) =>
              interview.stage === "ONLINE" &&
              interview.status === "COMPLETED" &&
              (interview.mode === "VIDEO" || interview.mode === "PHONE"),
          ) &&
          !candidate.interviews.some(
            (interview) =>
              interview.stage === "PHYSICAL" &&
              !["CANCELLED", "NO_SHOW"].includes(interview.status),
          )
        );
      }),
    [candidates, fields.stage],
  );
  const selectedCandidate = candidates.find((candidate) => candidate.id === candidateId);
  function update(name: keyof typeof fields, value: string) {
    setFields((current) => ({ ...current, [name]: value }));
  }
  function selectCandidate(id: string) {
    const candidate = candidates.find((item) => item.id === id);
    setCandidateId(id);
    setCandidateEmail(candidate?.email || "");
    setApplicationId(candidate?.applications[0]?.id || "");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!candidateId || !applicationId || !participantId)
      return setMessage("Choose a candidate and confirm your interviewer profile is available");
    if (!fields.scheduledStart || !fields.scheduledEnd)
      return setMessage("Choose a start and end time");
    if (new Date(fields.scheduledEnd) <= new Date(fields.scheduledStart))
      return setMessage("The end time must be after the start time");
    setSaving(true);
    setMessage("Creating interview…");
    try {
      const response = await fetch("/api/v1/interviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          candidateId,
          applicationId,
          participantIds: [participantId],
          templateId: fields.templateId || undefined,
          round: Number(fields.round),
          stage: fields.stage,
          scheduledStart: new Date(fields.scheduledStart).toISOString(),
          scheduledEnd: new Date(fields.scheduledEnd).toISOString(),
          timezone: fields.timezone || "UTC",
          mode: fields.mode,
          location: fields.location,
          meetingLink: fields.meetingLink,
          instructions: fields.instructions,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        const errors = result.error?.details?.fieldErrors;
        const details =
          errors && typeof errors === "object"
            ? Object.entries(errors)
                .flatMap(([field, values]) =>
                  Array.isArray(values) ? values.map((value) => `${field}: ${value}`) : [],
                )
                .join("; ")
            : "";
        const conflict = result.error?.details?.interviewReferenceNo
          ? `Conflict with ${result.error.details.interviewReferenceNo}. Choose another time or interviewer.`
          : "";
        throw new Error(
          details || conflict || result.error?.message || "Could not create interview",
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
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create interview");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page-shell space-y-6 pb-12">
      <Link
        href="/hr/interviews"
        className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to interviews
      </Link>
      <section className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-card px-5 py-6 shadow-sm sm:px-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Phase 1 · Hiring
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
            Schedule interview
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Set the conversation details once. The existing interview validation will protect
            candidate and interviewer availability.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <ShieldIcon />
          Assigned interviewer: {hrName}
        </span>
      </section>
      {message && !message.startsWith("Loading") && !message.startsWith("Creating") && (
        <div
          className="rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-4 text-sm font-semibold text-destructive"
          role="alert"
        >
          {message}
        </div>
      )}
      {message.startsWith("Loading") && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 text-sm font-semibold text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          {message}
        </div>
      )}
      <form onSubmit={submit} className="space-y-6">
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 border-b border-border/70 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Who is meeting?
            </p>
            <h2 className="mt-1 text-base font-semibold text-foreground">
              Candidate and interviewer
            </h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold text-foreground sm:col-span-2">
              Candidate
              <select
                required
                value={candidateId}
                onChange={(event) => selectCandidate(event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-normal"
              >
                <option value="">Select a shortlisted candidate</option>
                {eligibleCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.firstName} {candidate.lastName} ·{" "}
                    {candidate.roleOfInterest || "Position not specified"}
                  </option>
                ))}
                {selectedCandidate &&
                  !eligibleCandidates.some(
                    (candidate) => candidate.id === selectedCandidate.id,
                  ) && (
                    <option value={selectedCandidate.id}>
                      {selectedCandidate.firstName} {selectedCandidate.lastName} · Existing
                      selection
                    </option>
                  )}
              </select>
            </label>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Position
              </p>
              <p className="mt-2 text-sm font-bold text-foreground">
                {selectedCandidate?.roleOfInterest || "Choose a candidate"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Application {applicationId || "not selected"}
              </p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Candidate email
              </p>
              <p className="mt-2 truncate text-sm font-bold text-foreground">
                {candidateEmail || "Choose a candidate"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Used to prepare an optional invitation email
              </p>
            </div>
            <label className="text-sm font-semibold text-foreground">
              Interviewer
              <input
                readOnly
                value={hrName}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-muted/30 px-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-foreground">
              Interview stage
              <select
                value={fields.stage}
                onChange={(event) => update("stage", event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="ONLINE">Online interview</option>
                <option value="PHYSICAL">Physical / in-office interview</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-foreground">
              Interview round
              <input
                type="number"
                min="1"
                max="100"
                value={fields.round}
                onChange={(event) => update("round", event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
            </label>
          </div>
        </section>
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 border-b border-border/70 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              When and where
            </p>
            <h2 className="mt-1 text-base font-semibold text-foreground">Interview details</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold text-foreground">
              Start
              <input
                required
                type="datetime-local"
                value={fields.scheduledStart}
                onChange={(event) => update("scheduledStart", event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-foreground">
              End
              <input
                required
                type="datetime-local"
                value={fields.scheduledEnd}
                onChange={(event) => update("scheduledEnd", event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-foreground">
              Timezone
              <input
                value={fields.timezone}
                onChange={(event) => update("timezone", event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              />
            </label>
            <label className="text-sm font-semibold text-foreground">
              Interview mode
              <select
                value={fields.mode}
                onChange={(event) =>
                  setFields((current) => ({
                    ...current,
                    mode: event.target.value,
                    meetingLink: event.target.value === "VIDEO" ? current.meetingLink : "",
                    location: event.target.value === "IN_PERSON" ? current.location : "",
                  }))
                }
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="IN_PERSON">In person</option>
                <option value="VIDEO">Video</option>
                <option value="PHONE">Phone</option>
              </select>
            </label>
            {fields.mode === "IN_PERSON" && (
              <label className="text-sm font-semibold text-foreground sm:col-span-2">
                Location
                <input
                  value={fields.location}
                  onChange={(event) => update("location", event.target.value)}
                  placeholder="Office, meeting room, or address"
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                />
              </label>
            )}
            {fields.mode === "VIDEO" && (
              <label className="text-sm font-semibold text-foreground sm:col-span-2">
                Meeting link
                <input
                  required
                  type="url"
                  value={fields.meetingLink}
                  onChange={(event) => update("meetingLink", event.target.value)}
                  placeholder="https://meet.example.com/..."
                  className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                />
              </label>
            )}
          </div>
        </section>
        <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
          <div className="mb-5 border-b border-border/70 pb-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Preparation
            </p>
            <h2 className="mt-1 text-base font-semibold text-foreground">Scorecard and notes</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold text-foreground">
              Evaluation template
              <select
                value={fields.templateId}
                onChange={(event) => update("templateId", event.target.value)}
                className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
              >
                <option value="">No template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end text-xs text-muted-foreground">
              Templates use the existing evaluation questions and scoring rules.
            </div>
            <label className="text-sm font-semibold text-foreground sm:col-span-2">
              Interview instructions / notes
              <textarea
                rows={4}
                value={fields.instructions}
                onChange={(event) => update("instructions", event.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-background p-3 text-sm"
              />
            </label>
          </div>
        </section>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <Link
            href="/hr/interviews"
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || !participantId || message.startsWith("Loading")}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            {saving && <RefreshCw className="h-4 w-4 animate-spin" />}Create interview
          </button>
        </div>
      </form>
    </main>
  );
}

function ShieldIcon() {
  return <CheckCircle2 className="h-4 w-4 text-success-ink" />;
}
