"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  Download,
  FileText,
  History,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { CandidateHrReview } from "@/components/candidates/CandidateHrReview";
import { CandidateEditForm } from "@/components/candidates/CandidateEditForm";
import { CandidateCompletionLink } from "@/components/candidates/CandidateCompletionLink";
import { cn } from "@/lib/utils";

type Candidate = {
  id: string;
  referenceNo: string;
  firstName: string;
  lastName: string;
  status: string;
  hiringApprovalStatus?: string;
  hiringApprovalRequestedAt?: string | null;
  masterDecisionAt?: string | null;
  finalDecisionAt?: string | null;
  source: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
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
    stage: string;
    round: number;
    status: string;
    mode: string;
    scheduledStart: string;
    scheduledEnd: string;
  }>;
  visits: Array<{ id: string; visitDate: string; status: string }>;
  documents: Array<{
    id: string;
    fileName: string;
    kind?: string;
    contentType?: string;
    byteSize?: number;
    createdAt?: string;
  }>;
  activities: Array<{
    id: string;
    action: string;
    fromStatus?: string | null;
    toStatus?: string | null;
    note?: string | null;
    createdAt: string;
    actor?: { name?: string | null; email?: string | null } | null;
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
type Tab = "overview" | "application" | "interview" | "documents" | "history";

const statusLabels: Record<string, string> = {
  APPLIED: "New",
  SCREENING: "bg-info-light text-info-ink",
  SHORTLISTED: "Shortlisted",
  INTERVIEW: "Interview",
  SELECTED: "Selected",
  HOLD: "Hold",
  REJECTED: "Rejected",
};
const statusStyles: Record<string, string> = {
  APPLIED: "bg-info-light text-info-ink dark:bg-info-light/50 dark:text-info-ink",
  SCREENING: "bg-info-light text-info-ink",
  SHORTLISTED: "bg-warning-light text-warning-ink dark:bg-warning-light/50 dark:text-warning-ink",
  INTERVIEW: "bg-info-light text-info-ink dark:bg-info-light/50 dark:text-info-ink",
  SELECTED: "bg-success-light text-success-ink dark:bg-success-light/50 dark:text-success-ink",
  HOLD: "bg-warning-light text-warning-ink dark:bg-warning-light/50 dark:text-warning-ink",
  REJECTED:
    "bg-destructive-light text-destructive-ink dark:bg-destructive-light/50 dark:text-destructive-ink",
};

function value(input?: string | null) {
  return input?.trim() || "Not provided";
}
function EducationSummary({ input }: { input?: string | null }) {
  if (!input?.trim()) return <span>Not provided</span>;
  try {
    const details = JSON.parse(input) as Record<string, string>;
    const rows = [
      ["10th", details.tenthInstitution, details.tenthScore],
      ["12th", details.twelfthInstitution, details.twelfthScore],
      ["College", details.collegeName, details.collegeScore],
    ].filter(([, name, score]) => name || score);
    if (!rows.length) return <span>{input}</span>;
    return (
      <div className="candidate-education-summary">
        {rows.map(([level, name, score]) => (
          <div key={level}>
            <strong>{level}</strong>
            <span>{[name, score && `Grade: ${score}`].filter(Boolean).join(" · ")}</span>
          </div>
        ))}
      </div>
    );
  } catch {
    return <span>{input}</span>;
  }
}
function date(valueToFormat: string) {
  return new Date(valueToFormat).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function dateTime(valueToFormat: string) {
  return new Date(valueToFormat).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function label(status: string) {
  return statusLabels[status] || status.replaceAll("_", " ");
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase",
        statusStyles[status] || "bg-muted text-muted-foreground",
      )}
    >
      {label(status)}
    </span>
  );
}

function ApprovalBadge({ status }: { status?: string }) {
  if (!status || status === "NOT_REQUESTED") return null;
  const labels: Record<string, string> = {
    AWAITING_MASTER_REVIEW: "Awaiting Master Review",
    MASTER_APPROVED: "Master Approved",
    MASTER_REJECTED: "Master Rejected",
    FINAL_HIRED: "Final Hired",
    FINAL_REJECTED: "Final Rejected",
  };
  const styles: Record<string, string> = {
    AWAITING_MASTER_REVIEW: "bg-warning-light text-warning-ink",
    MASTER_APPROVED: "bg-success-light text-success-ink",
    MASTER_REJECTED: "bg-destructive-light text-destructive-ink",
    FINAL_HIRED: "bg-success-light text-success-ink",
    FINAL_REJECTED: "bg-destructive-light text-destructive-ink",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
        styles[status] || "bg-muted text-muted-foreground",
      )}
    >
      {labels[status] || status.replaceAll("_", " ")}
    </span>
  );
}

function DetailGrid({ values }: { values: Array<[string, string | null | undefined]> }) {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {values.map(([key, item]) => (
        <div key={key}>
          <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {key}
          </dt>
          <dd className="mt-1 break-words text-sm font-semibold text-foreground">
            {key === "Education" ? <EducationSummary input={item} /> : value(item)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Section({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
      <div className="mb-5 border-b border-border/70 pb-4">
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-1 text-base font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function PrimaryAction({ candidate, onChanged }: { candidate: Candidate; onChanged: () => void }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const existingInterview = candidate.interviews.find(
    (interview) => interview.status !== "CANCELLED",
  );
  const onlineComplete = candidate.interviews.some(
    (interview) => interview.stage === "ONLINE" && interview.status === "COMPLETED",
  );
  const remoteOnlineComplete = candidate.interviews.some(
    (interview) =>
      interview.stage === "ONLINE" &&
      interview.status === "COMPLETED" &&
      (interview.mode === "VIDEO" || interview.mode === "PHONE"),
  );
  const physicalComplete = candidate.interviews.some(
    (interview) =>
      interview.stage === "PHYSICAL" &&
      interview.mode === "IN_PERSON" &&
      interview.status === "COMPLETED",
  );
  const interviewPathComplete = remoteOnlineComplete
    ? physicalComplete
    : onlineComplete || physicalComplete;
  const action =
    candidate.status === "APPLIED"
      ? { text: "Start review", next: "SCREENING" }
      : candidate.status === "HOLD"
        ? { text: "Resume review", next: "SCREENING" }
        : null;
  if (
    candidate.status === "SHORTLISTED" &&
    candidate.hiringApprovalStatus === "NOT_REQUESTED" &&
    candidate.hrReviewedAt &&
    interviewPathComplete
  ) {
    async function sendToMaster() {
      if (
        !window.confirm(
          "Share the complete application, interviews, documents, and HR evaluation with Master Admin?",
        )
      )
        return;
      setSaving(true);
      try {
        const response = await fetch(
          `/api/v1/candidates/${encodeURIComponent(candidate.id)}/send-to-master`,
          { method: "POST" },
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error?.message || "Could not send candidate to Master review");
        onChanged();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Could not send candidate to Master review",
        );
      } finally {
        setSaving(false);
      }
    }
    return (
      <button
        type="button"
        disabled={saving}
        onClick={() => void sendToMaster()}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90 disabled:opacity-60"
      >
        Send to Master for Review <ArrowRight className="h-4 w-4" />
      </button>
    );
  }
  if (candidate.hiringApprovalStatus === "AWAITING_MASTER_REVIEW")
    return (
      <span className="rounded-xl border border-warning bg-warning-light px-4 py-2.5 text-sm font-bold text-warning-ink">
        Awaiting Master review
      </span>
    );
  if (["MASTER_APPROVED", "MASTER_REJECTED"].includes(candidate.hiringApprovalStatus || "")) {
    const canHire = candidate.hiringApprovalStatus === "MASTER_APPROVED";
    async function finalize(decision: "HIRE" | "REJECT") {
      const remarks = decision === "REJECT" ? window.prompt("Reason for final rejection:") : "";
      if (decision === "REJECT" && !remarks?.trim()) return;
      setSaving(true);
      try {
        const response = await fetch(
          `/api/v1/candidates/${encodeURIComponent(candidate.id)}/final-decision`,
          {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ decision, remarks }),
          },
        );
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.error?.message || "Could not record final hiring decision");
        onChanged();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Could not record final hiring decision",
        );
      } finally {
        setSaving(false);
      }
    }
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving || !canHire}
          onClick={() => void finalize("HIRE")}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-success px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-success disabled:cursor-not-allowed disabled:opacity-50"
        >
          Hire Candidate <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void finalize("REJECT")}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-destructive bg-background px-5 py-2.5 text-sm font-bold text-destructive-ink transition hover:bg-destructive-light disabled:cursor-not-allowed disabled:opacity-50 dark:border-destructive/60 dark:text-destructive-ink dark:hover:bg-destructive-light/30"
        >
          Reject Candidate
        </button>
      </div>
    );
  }
  if (["APPLIED", "SCREENING", "SHORTLISTED"].includes(candidate.status) && !existingInterview)
    return (
      <Link
        href={`/hr/interviews/new?candidateId=${encodeURIComponent(candidate.id)}${candidate.applications[0]?.id ? `&applicationId=${encodeURIComponent(candidate.applications[0].id)}` : ""}`}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
      >
        Schedule online interview <ArrowRight className="h-4 w-4" />
      </Link>
    );
  if (candidate.status === "INTERVIEW" && existingInterview)
    return (
      <Link
        href={`/hr/interviews/${encodeURIComponent(existingInterview.id)}`}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
      >
        Open interview <ArrowRight className="h-4 w-4" />
      </Link>
    );
  if (candidate.status === "SELECTED" && candidate.hiringApprovalStatus === "FINAL_HIRED")
    return (
      <Link
        href="/hr/onboarding"
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
      >
        Open onboarding <ArrowRight className="h-4 w-4" />
      </Link>
    );
  if (!action)
    return (
      <span className="text-xs font-semibold text-muted-foreground">
        No further action available
      </span>
    );
  const nextAction = action;
  const candidateId = candidate.id;
  async function updateStatus() {
    if (saving) return;
    if (!window.confirm(`Move this candidate to ${label(nextAction.next)}?`)) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/v1/candidates/${encodeURIComponent(candidateId)}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: nextAction.next }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message || "Could not update candidate status");
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update candidate status");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={saving}
        onClick={() => void updateStatus()}
        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
      >
        {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
        {nextAction.text}
        <ArrowRight className="h-4 w-4" />
      </button>
      {message && (
        <span className="max-w-56 text-right text-[11px] text-destructive">{message}</span>
      )}
    </div>
  );
}

export default function CandidateProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [message, setMessage] = useState("Loading candidate…");
  const [tab, setTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [decisions, setDecisions] = useState<Decision[]>([]);

  async function loadCandidate(id: string) {
    setMessage("Loading candidate…");
    const response = await fetch(`/api/v1/candidates/${encodeURIComponent(id)}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || "Could not load candidate");
    setCandidate(result.data);
    const applicationId = result.data.applications[0]?.id;
    if (applicationId) {
      try {
        const decisionResponse = await fetch(
          `/api/v1/hiring-decisions?applicationId=${encodeURIComponent(applicationId)}`,
        );
        if (decisionResponse.ok) setDecisions((await decisionResponse.json()).data);
      } catch {
        setDecisions([]);
      }
    }
    setMessage("");
  }

  useEffect(() => {
    void params
      .then(({ id }) => loadCandidate(id))
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : "Could not load candidate"),
      );
  }, [params]);

  if (!candidate)
    return (
      <main className="page-shell">
        <section
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-6 text-sm font-semibold text-muted-foreground"
          role="status"
        >
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          {message}
        </section>
      </main>
    );

  const completedInterview = candidate.interviews.find(
    (interview) => interview.status === "COMPLETED",
  );
  const tabs: Array<{ value: Tab; label: string; icon: typeof UserRound }> = [
    { value: "overview", label: "Overview", icon: UserRound },
    { value: "application", label: "Application", icon: BriefcaseBusiness },
    { value: "interview", label: "Interview", icon: CalendarDays },
    { value: "documents", label: "Documents", icon: FileText },
    { value: "history", label: "History", icon: History },
  ];
  const submission = candidate.submissions[0];
  const submittedFields = submission
    ? Object.entries(submission.formData).filter(
        ([, item]) => typeof item === "string" && item.trim(),
      )
    : [];
  const profileCandidateId = candidate.id;

  async function refresh() {
    try {
      await loadCandidate(profileCandidateId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not refresh candidate");
    }
  }

  return (
    <main className="page-shell space-y-6 pb-12">
      <Link
        href="/hr/candidates"
        className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to candidates
      </Link>
      <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
        <div className="flex flex-col gap-6 px-5 py-6 sm:px-7 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-lg font-bold text-primary">
              {candidate.firstName[0]}
              {candidate.lastName[0]}
            </span>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                Candidate profile
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                {candidate.firstName} {candidate.lastName}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {candidate.roleOfInterest || "Position not specified"} · {candidate.referenceNo}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={candidate.status} />
                <ApprovalBadge status={candidate.hiringApprovalStatus} />
                <span className="text-xs text-muted-foreground">
                  Applied {date(candidate.createdAt)}
                </span>
                <span className="text-xs text-muted-foreground">
                  · {candidate.source === "WALK_IN" ? "Walk-in" : "Online"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[31rem] lg:items-end">
            {candidate.hiringApprovalStatus === "MASTER_APPROVED" && (
              <p className="text-xs font-bold text-success-ink dark:text-success-ink">
                Final HR decision required
              </p>
            )}
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Link
                href={`/hr/candidates/${candidate.id}/preview`}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground transition hover:bg-muted"
              >
                Submitted form
              </Link>
              <PrimaryAction candidate={candidate} onChanged={() => void refresh()} />
            </div>
          </div>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto border-t border-border/70 px-4 py-3 sm:px-6"
          aria-label="Candidate profile sections"
        >
          {tabs.map(({ value: tabValue, label: tabLabel, icon: Icon }) => (
            <button
              key={tabValue}
              type="button"
              onClick={() => setTab(tabValue)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition",
                tab === tabValue
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-current={tab === tabValue ? "page" : undefined}
            >
              <Icon className="h-3.5 w-3.5" />
              {tabLabel}
              {tabValue === "documents" && (
                <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] text-current">
                  {candidate.documents.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </section>

      {message && (
        <div
          className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground"
          role="status"
        >
          {message}
        </div>
      )}
      {tab === "overview" && (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <Section eyebrow="Candidate submitted" title="Overview">
              <p className="mb-5 rounded-xl border border-info bg-info-light px-4 py-3 text-xs font-medium text-info-ink dark:border-info/50 dark:bg-info-light/30 dark:text-info-ink">
                This information was submitted by the candidate. It remains read-only during hiring
                review.
              </p>
              <DetailGrid
                values={[
                  ["Full name", `${candidate.firstName} ${candidate.lastName}`],
                  ["Email", candidate.email],
                  ["Mobile number", candidate.phone],
                  ["Position applied", candidate.roleOfInterest],
                  ["Experience", candidate.experience],
                  ["Current company", candidate.currentCompany],
                  ["Education", candidate.education],
                  ["Skills", candidate.skills],
                  [
                    "Location",
                    [candidate.city, candidate.state, candidate.country].filter(Boolean).join(", "),
                  ],
                ]}
              />
            </Section>
            <Section eyebrow="Application" title="Recruitment context">
              <DetailGrid
                values={[
                  ["Application", candidate.applications[0]?.referenceNo],
                  ["Form", candidate.applications[0]?.requisition.title],
                  ["Application status", candidate.applications[0]?.status],
                  [
                    "Submitted",
                    submission?.submittedAt ? dateTime(submission.submittedAt) : undefined,
                  ],
                  ["Source", candidate.source === "WALK_IN" ? "Walk-in" : "Online"],
                  [
                    "Documents",
                    `${candidate.documents.length} submitted document${candidate.documents.length === 1 ? "" : "s"}`,
                  ],
                ]}
              />
            </Section>
          </div>
          <div className="space-y-6">
            {candidate.status === "SELECTED" &&
              candidate.hiringApprovalStatus === "FINAL_HIRED" && (
                <CandidateCompletionLink candidateId={candidate.id} />
              )}
            <Section eyebrow="HR controls" title="Review information">
              <p className="mb-5 rounded-xl border border-warning bg-warning-light px-4 py-3 text-xs font-medium text-warning-ink dark:border-warning/50 dark:bg-warning-light/30 dark:text-warning-ink">
                HR review is separate from the candidate&apos;s submitted application. Complete the
                interview before recording an assessment.
              </p>
              <DetailGrid
                values={[
                  [
                    "Communication",
                    candidate.hrCommunicationRating
                      ? `${candidate.hrCommunicationRating} / 5`
                      : "Not rated",
                  ],
                  [
                    "Technical skills",
                    candidate.hrTechnicalSkillsRating
                      ? `${candidate.hrTechnicalSkillsRating} / 5`
                      : "Not rated",
                  ],
                  [
                    "Overall fit",
                    candidate.hrOverallFit
                      ? `${candidate.hrOverallFit} / 5`
                      : "Automatic after ratings",
                  ],
                  [
                    "Reviewed",
                    candidate.hrReviewedAt ? dateTime(candidate.hrReviewedAt) : "Not reviewed",
                  ],
                  ["Reviewer", candidate.hrInterviewerName || candidate.hrInterviewScheduledBy],
                  [
                    "Hiring approval",
                    (candidate.hiringApprovalStatus || "NOT_REQUESTED").replaceAll("_", " "),
                  ],
                  [
                    "Master decision",
                    candidate.masterDecisionAt
                      ? dateTime(candidate.masterDecisionAt)
                      : "Not recorded",
                  ],
                ]}
              />
              {candidate.hrComments && (
                <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Review summary
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                    {candidate.hrComments}
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={() => setTab("interview")}
                className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
              >
                Open interview review <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </Section>
            {candidate.status === "SELECTED" &&
              candidate.hiringApprovalStatus === "FINAL_HIRED" && (
                <Section eyebrow="Selected" title="Candidate corrections">
                  <p className="text-sm text-muted-foreground">
                    This candidate is selected. Corrections and financial details can be added
                    without changing the original review history.
                  </p>
                  <button
                    type="button"
                    onClick={() => setEditing((value) => !value)}
                    className="mt-4 rounded-xl border border-border px-4 py-2 text-xs font-bold text-foreground transition hover:bg-muted"
                  >
                    {editing ? "Close editor" : "Edit selected candidate"}
                  </button>
                  {editing && (
                    <div className="mt-5 border-t border-border pt-5">
                      <CandidateEditForm
                        candidate={candidate}
                        onSaved={(updated) => {
                          setCandidate((current) =>
                            current ? ({ ...current, ...updated } as Candidate) : current,
                          );
                          setEditing(false);
                        }}
                        onCancel={() => setEditing(false)}
                        onMessage={setMessage}
                      />
                    </div>
                  )}
                </Section>
              )}
          </div>
        </div>
      )}

      {tab === "application" && (
        <div className="space-y-6">
          <Section eyebrow="Candidate submitted" title="Application details">
            <p className="mb-5 rounded-xl border border-info bg-info-light px-4 py-3 text-xs font-medium text-info-ink dark:border-info/50 dark:bg-info-light/30 dark:text-info-ink">
              The values below are the submitted application record. HR review notes are
              intentionally not mixed into this section.
            </p>
            <DetailGrid
              values={[
                ["Full name", `${candidate.firstName} ${candidate.lastName}`],
                ["Email", candidate.email],
                ["Phone", candidate.phone],
                ["Date of birth", candidate.dateOfBirth],
                ["Gender", candidate.gender],
                [
                  "Address",
                  [candidate.addressLine1, candidate.addressLine2].filter(Boolean).join(", "),
                ],
                ["City", candidate.city],
                ["State", candidate.state],
                ["Position", candidate.roleOfInterest],
                ["Experience", candidate.experience],
                ["Current / last company", candidate.currentCompany],
                ["Employment history", candidate.employmentHistory],
                ["Education", candidate.education],
                ["Skills", candidate.skills],
                ["Current CTC", candidate.ctc],
                ["Expected hike", candidate.hikePercentage],
                ["Expected CTC", candidate.expectedCompensation],
                ["Notice period", candidate.noticePeriod],
                ["How they heard about us", candidate.howFound || candidate.otherSource],
                ["Reason for job change", candidate.reasonForJobChange],
              ]}
            />
          </Section>
          <Section
            eyebrow="Submitted fields"
            title={submission ? `Form response · ${submission.referenceNo}` : "Form response"}
          >
            {submittedFields.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {submittedFields.map(([key, item]) => (
                  <div key={key} className="rounded-xl border border-border/70 bg-background p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {key.replaceAll(/([A-Z])/g, " $1")}
                    </p>
                    {key.toLowerCase() === "education" ? (
                      <div className="mt-2 text-sm font-semibold text-foreground">
                        <EducationSummary input={typeof item === "string" ? item : null} />
                      </div>
                    ) : (
                      <p className="mt-2 break-words text-sm font-semibold text-foreground">
                        {String(item)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No additional form fields were submitted.
              </p>
            )}
          </Section>
        </div>
      )}

      {tab === "interview" && (
        <div className="space-y-6">
          <Section eyebrow="Interview history" title="Scheduled interviews">
            {candidate.interviews.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <CalendarDays className="mx-auto h-7 w-7 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  No interview has been scheduled.
                </p>
                {candidate.status === "SHORTLISTED" && (
                  <Link
                    href={`/hr/interviews/new?candidateId=${encodeURIComponent(candidate.id)}${candidate.applications[0]?.id ? `&applicationId=${encodeURIComponent(candidate.applications[0].id)}` : ""}`}
                    className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                  >
                    Schedule interview <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {candidate.interviews.map((interview) => (
                  <Link
                    key={interview.id}
                    href={`/hr/interviews/${interview.id}`}
                    className="group flex flex-col gap-3 rounded-xl border border-border/70 bg-background p-4 transition hover:border-primary/40 hover:shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-info-light text-info-ink dark:bg-info-light/50 dark:text-info-ink">
                        <CalendarDays className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-bold text-foreground group-hover:text-primary">
                          {interview.stage === "PHYSICAL" ? "Physical" : "Online"} interview · round{" "}
                          {interview.round}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {dateTime(interview.scheduledStart)} · {dateTime(interview.scheduledEnd)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={interview.status} />
                  </Link>
                ))}
              </div>
            )}
          </Section>
          <Section eyebrow="HR review" title="Interview evaluation">
            {completedInterview ? (
              <CandidateHrReview
                candidate={candidate}
                onSaved={(review) => setCandidate({ ...candidate, ...review })}
              />
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-warning bg-warning-light p-4 text-sm text-warning-ink dark:border-warning/50 dark:bg-warning-light/30 dark:text-warning-ink">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>Interview review unlocks after any scheduled interview is completed.</span>
              </div>
            )}
          </Section>
        </div>
      )}

      {tab === "documents" && (
        <div className="space-y-6">
          <Section
            eyebrow="Candidate files"
            title={`Documents and printable profile (${candidate.documents.length})`}
          >
            {candidate.documents.length ? (
              <div className="space-y-3">
                {candidate.documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                        <FileText className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">
                          {document.fileName}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {document.kind || "Candidate document"} · Available
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/api/v1/candidates/${encodeURIComponent(candidate.id)}/documents/${encodeURIComponent(document.id)}/download`}
                      className="inline-flex items-center gap-2 text-xs font-bold text-primary hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <FileText className="mx-auto h-7 w-7 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  No candidate documents submitted.
                </p>
              </div>
            )}
            <div className="mt-5 border-t border-border pt-5">
              <a
                href={`/api/v1/candidates/${encodeURIComponent(candidate.id)}/print`}
                className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-foreground transition hover:bg-muted"
              >
                <Download className="h-4 w-4" />
                Download printable profile
              </a>
            </div>
          </Section>
        </div>
      )}

      {tab === "history" && (
        <div className="space-y-6">
          <Section eyebrow="Audit trail" title="Candidate history">
            {candidate.activities.length ? (
              <ol className="space-y-0">
                {candidate.activities.map((activity, index) => (
                  <li key={activity.id} className="relative flex gap-4 pb-6 last:pb-0">
                    <div className="relative flex w-5 justify-center">
                      <span className="z-10 mt-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-primary/10" />
                      {index < candidate.activities.length - 1 && (
                        <span className="absolute top-4 h-full w-px bg-border" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 rounded-xl border border-border/70 bg-background p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-sm font-bold text-foreground">
                          {activity.action.replaceAll("_", " ")}
                        </p>
                        <time className="text-xs text-muted-foreground">
                          {dateTime(activity.createdAt)}
                        </time>
                      </div>
                      {(activity.fromStatus || activity.toStatus) && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {activity.fromStatus ? label(activity.fromStatus) : "New"}{" "}
                          <ArrowRight className="mx-1 inline h-3 w-3" />{" "}
                          {activity.toStatus ? label(activity.toStatus) : "Updated"}
                        </p>
                      )}
                      {activity.note && (
                        <p className="mt-2 text-xs text-muted-foreground">{activity.note}</p>
                      )}
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {activity.actor?.name ||
                          activity.actor?.email ||
                          "System or public submission"}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <History className="mx-auto h-7 w-7 text-muted-foreground/50" />
                <p className="mt-3 text-sm font-semibold text-foreground">
                  No activity history is available.
                </p>
              </div>
            )}
          </Section>
          {decisions.length > 0 && (
            <Section eyebrow="Hiring decisions" title="Recorded decisions">
              <div className="space-y-3">
                {decisions.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border/70 bg-background p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-bold text-foreground">{item.decision}</span>
                      <span className="text-xs text-muted-foreground">
                        {dateTime(item.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {item.reason || "No reason recorded"} ·{" "}
                      {item.actor?.name || item.actor?.email || "Author unavailable"}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </main>
  );
}
