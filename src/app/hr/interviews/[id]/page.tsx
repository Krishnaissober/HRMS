"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  MapPin,
  MessageSquare,
  RefreshCw,
  UserRound,
  Video,
} from "lucide-react";

type Question = { id: string; prompt: string; competency?: string; scoringGuidance?: string };
type Interview = {
  id: string;
  referenceNo: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  mode: string;
  location?: string | null;
  meetingLink?: string | null;
  instructions?: string | null;
  status: string;
  noShowReason?: string | null;
  candidate: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    roleOfInterest?: string | null;
    status?: string | null;
  };
  application?: { requisition?: { title?: string | null } | null } | null;
  template?: { name: string; questions: Question[] } | null;
  participants: Array<{ user: { name?: string | null; email: string } }>;
  evaluations: Array<{
    id: string;
    interviewer: { name?: string | null; email: string };
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
    actor?: { name?: string | null; email: string } | null;
  }>;
};

const statusLabel: Record<string, string> = {
  SCHEDULED: "Scheduled",
  RESCHEDULED: "Rescheduled",
  CHECKED_IN: "In progress",
  COMPLETED: "Completed",
  NO_SHOW: "No-show",
  CANCELLED: "Cancelled",
};
const statusClass: Record<string, string> = {
  SCHEDULED: "border-info bg-info-light text-info-ink",
  RESCHEDULED: "border-warning bg-warning-light text-warning-ink",
  CHECKED_IN: "border-info bg-info-light text-info-ink",
  COMPLETED: "border-success bg-success-light text-success-ink",
  NO_SHOW: "border-destructive bg-destructive-light text-destructive-ink",
  CANCELLED: "border-border bg-muted text-muted-foreground",
};
const candidateStatusLabel: Record<string, string> = {
  APPLIED: "New",
  SCREENING: "bg-info-light text-info-ink",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  SELECTED: "Selected",
  HOLD: "On hold",
  REJECTED: "Rejected",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function formatTime(value: string) {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function modeLabel(mode: string) {
  return mode
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (letter) => letter.toUpperCase());
}
function IconForMode({ mode }: { mode: string }) {
  if (mode === "VIDEO") return <Video className="h-4 w-4" />;
  if (mode === "PHONE") return <MessageSquare className="h-4 w-4" />;
  return <MapPin className="h-4 w-4" />;
}

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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!routeId) return;
    void (async () => {
      try {
        const response = await fetch(`/api/v1/interviews/${routeId}`);
        const result = await response.json();
        if (!response.ok) {
          setMessage(result.error?.message || "Could not load interview");
          return;
        }
        const loaded = result.data as Interview;
        setInterview(loaded);
        if (loaded.template)
          setScores(
            Object.fromEntries(loaded.template.questions.map((question) => [question.id, ""])),
          );
        setMessage("");
      } catch {
        setMessage("Could not load interview");
      }
    })();
  }, [routeId]);

  const currentInterview = interview;
  const candidateName = currentInterview
    ? `${currentInterview.candidate.firstName} ${currentInterview.candidate.lastName}`
    : "";
  const position =
    currentInterview?.application?.requisition?.title ||
    currentInterview?.candidate.roleOfInterest ||
    "Position not specified";
  const interviewer = currentInterview?.participants
    .map((participant) => participant.user.name || participant.user.email)
    .join(", ");
  const latestEvaluation = useMemo(() => currentInterview?.evaluations.at(-1), [currentInterview]);
  const canManageAttendance = Boolean(
    currentInterview &&
    ["SCHEDULED", "RESCHEDULED", "CHECKED_IN"].includes(currentInterview.status),
  );

  if (!currentInterview)
    return (
      <main className="page-shell">
        <section className="rounded-2xl border border-border/70 bg-card p-6 shadow-sm">
          <div
            className="flex items-center gap-3 text-sm font-semibold text-muted-foreground"
            role="status"
          >
            {message.startsWith("Loading") && (
              <RefreshCw className="h-4 w-4 animate-spin text-primary" />
            )}
            {message}
          </div>
        </section>
      </main>
    );

  const headers = { "content-type": "application/json" };
  async function attendance(path: "check-in" | "check-out") {
    setSaving(true);
    const response = await fetch(`/api/v1/interviews/${currentInterview!.id}/${path}`, {
      method: "POST",
      headers,
      body: "{}",
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error?.message || "Could not update attendance");
      return;
    }
    setInterview((current) => (current ? { ...current, ...result.data } : current));
    setMessage(path === "check-in" ? "Candidate checked in" : "Interview marked as completed");
  }
  async function markNoShow() {
    if (!noShowReason.trim()) {
      setMessage("A no-show reason is required");
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/v1/interviews/${currentInterview!.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "NO_SHOW", noShowReason, noShowNotes }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error?.message || "Could not mark no-show");
      return;
    }
    setInterview((current) => (current ? { ...current, ...result.data } : current));
    setMessage("No-show recorded");
  }
  async function reschedule() {
    if (!rescheduleStart || !rescheduleEnd) {
      setMessage("Select the new start and end time");
      return;
    }
    if (new Date(rescheduleEnd) <= new Date(rescheduleStart)) {
      setMessage("The new end time must be after the new start time");
      return;
    }
    const hasPreviousReschedule = currentInterview!.activities.some(
      (activity) => activity.action === "INTERVIEW_RESCHEDULED",
    );
    if (hasPreviousReschedule && !rescheduleReason.trim()) {
      setMessage("A reason is required after the first reschedule");
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/v1/interviews/${currentInterview!.id}`, {
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
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error?.message || "Could not reschedule interview");
      return;
    }
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
    if (Object.values(parsedScores).some((value) => !Number.isFinite(value))) {
      setMessage("Complete every template score");
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/v1/interviews/${currentInterview!.id}/evaluations`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        scores: parsedScores,
        comments,
        recommendation: recommendation || undefined,
      }),
    });
    const result = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(result.error?.message || "Could not submit evaluation");
      return;
    }
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
    <main className="page-shell space-y-6 pb-12">
      <Link
        href="/hr/interviews"
        className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to interviews
      </Link>
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              Interview workspace
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                {candidateName}
              </h1>
              <span
                className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClass[currentInterview.status] || statusClass.CANCELLED}`}
              >
                {statusLabel[currentInterview.status] || currentInterview.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {position} · {currentInterview.referenceNo}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentInterview.status === "COMPLETED" && (
              <span className="inline-flex items-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-bold text-white">
                <CheckCircle2 className="h-4 w-4" />
                Interview complete
              </span>
            )}
          </div>
        </div>
        <div className="mt-6 grid gap-3 border-t border-border/70 pt-5 sm:grid-cols-2 xl:grid-cols-4">
          <InfoItem
            icon={<CalendarDays className="h-4 w-4" />}
            label="Date"
            value={formatDate(currentInterview.scheduledStart)}
          />
          <InfoItem
            icon={<Clock3 className="h-4 w-4" />}
            label="Time"
            value={`${formatTime(currentInterview.scheduledStart)} – ${formatTime(currentInterview.scheduledEnd)} · ${currentInterview.timezone}`}
          />
          <InfoItem
            icon={<IconForMode mode={currentInterview.mode} />}
            label="Format"
            value={`${modeLabel(currentInterview.mode)}${currentInterview.location ? ` · ${currentInterview.location}` : ""}`}
          />
          <InfoItem
            icon={<UserRound className="h-4 w-4" />}
            label="Interviewer"
            value={interviewer || "Not assigned"}
          />
        </div>
      </section>
      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm font-semibold ${message.includes("Could not") || message.includes("required") || message.includes("must be") || message.includes("Complete") ? "border-destructive/25 bg-destructive/5 text-destructive" : "border-success bg-success-light text-success-ink"}`}
          role="status"
        >
          {message}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.75fr)]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <SectionHeading
              icon={<UserRound className="h-4 w-4" />}
              eyebrow="Candidate summary"
              title="Application context"
            />
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <InfoBlock label="Candidate" value={candidateName} />
              <InfoBlock label="Email" value={currentInterview.candidate.email} />
              <InfoBlock label="Position" value={position} />
              <InfoBlock
                label="Candidate status"
                value={
                  candidateStatusLabel[currentInterview.candidate.status || ""] ||
                  currentInterview.candidate.status ||
                  "Not available"
                }
              />
            </div>
          </section>
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <SectionHeading
              icon={<CalendarDays className="h-4 w-4" />}
              eyebrow="Interview details"
              title="Manage the appointment"
            />
            <div className="mt-5 flex flex-wrap gap-2">
              {canManageAttendance &&
                ["SCHEDULED", "RESCHEDULED"].includes(currentInterview.status) && (
                  <ActionButton disabled={saving} onClick={() => void attendance("check-in")}>
                    Candidate check-in
                  </ActionButton>
                )}
              {canManageAttendance &&
                ["SCHEDULED", "RESCHEDULED"].includes(currentInterview.status) && (
                  <ActionButton
                    variant="outline"
                    disabled={saving}
                    onClick={() => void markNoShow()}
                  >
                    Mark no-show
                  </ActionButton>
                )}
              {canManageAttendance &&
                ["SCHEDULED", "RESCHEDULED"].includes(currentInterview.status) && (
                  <ActionButton
                    variant="outline"
                    disabled={saving}
                    onClick={() => setRescheduleOpen((open) => !open)}
                  >
                    Reschedule
                  </ActionButton>
                )}
              {currentInterview.status === "CHECKED_IN" && (
                <ActionButton disabled={saving} onClick={() => void attendance("check-out")}>
                  Complete interview
                </ActionButton>
              )}
            </div>
            {currentInterview.status === "NO_SHOW" && currentInterview.noShowReason && (
              <div className="mt-4 rounded-xl border border-destructive bg-destructive-light p-4 text-sm text-destructive-ink">
                <p className="font-bold">No-show reason</p>
                <p className="mt-1">{currentInterview.noShowReason}</p>
              </div>
            )}
            {currentInterview.meetingLink && (
              <a
                href={currentInterview.meetingLink}
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
              >
                Open meeting link <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {currentInterview.instructions && (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {currentInterview.instructions}
              </p>
            )}
            {rescheduleOpen && (
              <div className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
                <p className="text-sm font-bold text-foreground">Choose a new time</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-semibold">
                    New start
                    <input
                      required
                      type="datetime-local"
                      value={rescheduleStart}
                      onChange={(event) => setRescheduleStart(event.target.value)}
                      className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal"
                    />
                  </label>
                  <label className="text-sm font-semibold">
                    New end
                    <input
                      required
                      type="datetime-local"
                      value={rescheduleEnd}
                      onChange={(event) => setRescheduleEnd(event.target.value)}
                      className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal"
                    />
                  </label>
                  <label className="text-sm font-semibold sm:col-span-2">
                    Reason
                    <textarea
                      required={currentInterview.activities.some(
                        (activity) => activity.action === "INTERVIEW_RESCHEDULED",
                      )}
                      value={rescheduleReason}
                      onChange={(event) => setRescheduleReason(event.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm font-normal"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => void reschedule()}
                  disabled={saving}
                  className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
                >
                  Save new time
                </button>
              </div>
            )}
            {["SCHEDULED", "RESCHEDULED"].includes(currentInterview.status) && (
              <div className="mt-5 grid gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  No-show reason
                  <input
                    value={noShowReason}
                    onChange={(event) => setNoShowReason(event.target.value)}
                    className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal"
                  />
                </label>
                <label className="text-sm font-semibold">
                  No-show notes
                  <textarea
                    value={noShowNotes}
                    onChange={(event) => setNoShowNotes(event.target.value)}
                    rows={2}
                    className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm font-normal"
                  />
                </label>
              </div>
            )}
          </section>
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <SectionHeading
              icon={<FileText className="h-4 w-4" />}
              eyebrow="Evaluation"
              title={
                currentInterview.template ? currentInterview.template.name : "Interview evaluation"
              }
            />
            {currentInterview.template ? (
              <form onSubmit={submitEvaluation} className="mt-5 space-y-5">
                <div className="space-y-3">
                  {currentInterview.template.questions.map((question) => (
                    <label
                      key={question.id}
                      className="block rounded-xl border border-border/70 bg-muted/10 p-4 text-sm font-bold text-foreground"
                    >
                      {question.prompt}
                      {question.competency && (
                        <span className="ml-2 text-xs font-semibold text-muted-foreground">
                          {question.competency}
                        </span>
                      )}
                      {question.scoringGuidance && (
                        <p className="mt-1 text-xs font-normal leading-5 text-muted-foreground">
                          {question.scoringGuidance}
                        </p>
                      )}
                      <input
                        type="number"
                        value={scores[question.id] || ""}
                        onChange={(event) =>
                          setScores((current) => ({
                            ...current,
                            [question.id]: event.target.value,
                          }))
                        }
                        required
                        className="mt-3 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal"
                      />
                    </label>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-bold">
                    Recommendation
                    <select
                      value={recommendation}
                      onChange={(event) => setRecommendation(event.target.value)}
                      className="mt-2 h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-normal"
                    >
                      <option value="">Select recommendation</option>
                      <option value="HIRE">Hire</option>
                      <option value="HOLD">Hold</option>
                      <option value="REJECT">Reject</option>
                    </select>
                  </label>
                  <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
                    Submit the evaluation after the interview. The existing candidate status
                    workflow remains the source of truth for the final decision.
                  </div>
                </div>
                <label className="block text-sm font-bold">
                  Interview notes
                  <textarea
                    value={comments}
                    onChange={(event) => setComments(event.target.value)}
                    rows={5}
                    placeholder="Capture strengths, concerns, and evidence from the conversation…"
                    className="mt-2 w-full rounded-lg border border-border bg-background p-3 text-sm font-normal"
                  />
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm disabled:opacity-60"
                >
                  {saving && <RefreshCw className="h-4 w-4 animate-spin" />}Save evaluation
                </button>
              </form>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                No scorecard template was attached when this interview was created.
              </div>
            )}
            {latestEvaluation && (
              <div className="mt-6 rounded-xl border border-success bg-success-light/60 p-4 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-success-ink">Latest evaluation saved</p>
                  <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-success-ink">
                    {latestEvaluation.recommendation || "No recommendation"}
                  </span>
                </div>
                <p className="mt-2 leading-6 text-success-ink/80">
                  {latestEvaluation.comments || "No notes were added."}
                </p>
              </div>
            )}
          </section>
        </div>
        <aside className="space-y-6">
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <SectionHeading
              icon={<CheckCircle2 className="h-4 w-4" />}
              eyebrow="Next action"
              title="Keep the workflow moving"
            />
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {currentInterview.status === "COMPLETED"
                ? "Review the candidate profile to make the next hiring decision."
                : "Complete the appointment and record the evaluation when the conversation is finished."}
            </p>
            <Link
              href={`/hr/candidates/${encodeURIComponent(currentInterview.candidate.id)}`}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:opacity-90"
            >
              Review candidate
            </Link>
          </section>
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <SectionHeading
              icon={<MessageSquare className="h-4 w-4" />}
              eyebrow="Saved evaluations"
              title={`${currentInterview.evaluations.length} recorded`}
            />
            <div className="mt-4 space-y-3">
              {currentInterview.evaluations.length ? (
                currentInterview.evaluations.map((evaluation) => (
                  <div
                    key={evaluation.id}
                    className="rounded-xl border border-border/70 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold">
                        {evaluation.interviewer.name || evaluation.interviewer.email}
                      </p>
                      <span className="text-xs font-bold text-muted-foreground">
                        {evaluation.recommendation || "—"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {evaluation.status} · {evaluation.comments || "No notes"}
                    </p>
                  </div>
                ))
              ) : (
                <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                  No evaluation has been submitted yet.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
            <SectionHeading
              icon={<Clock3 className="h-4 w-4" />}
              eyebrow="History"
              title="Activity timeline"
            />
            <div className="mt-4 space-y-4">
              {currentInterview.activities.length ? (
                currentInterview.activities.map((activity) => (
                  <div key={activity.id} className="relative border-l-2 border-border pl-4 text-sm">
                    <span className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-primary" />
                    <p className="font-bold text-foreground">
                      {activity.action.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {activity.note || "No additional note"} ·{" "}
                      {activity.actor?.name || activity.actor?.email || "System"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}

function SectionHeading({
  icon,
  eyebrow,
  title,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border/70 pb-4">
      <span className="mt-0.5 rounded-lg bg-primary/10 p-2 text-primary">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-base font-semibold text-foreground">{title}</h2>
      </div>
    </div>
  );
}
function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}
function ActionButton({
  children,
  onClick,
  disabled,
  variant = "solid",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "solid" | "outline";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:opacity-60 ${variant === "outline" ? "border border-border text-foreground hover:bg-muted" : "bg-primary text-primary-foreground shadow-sm hover:opacity-90"}`}
    >
      {children}
    </button>
  );
}
