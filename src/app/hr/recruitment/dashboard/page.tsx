"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FilePlus2,
  RefreshCw,
  UserCheck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

type RecruitmentData = {
  applications: number;
  pipelineCounts: Record<string, number>;
  openPositions: number;
  openRequisitions: Array<{
    id: string;
    referenceNo: string;
    title: string;
    openedAt: string | null;
    _count: { applications: number };
  }>;
};

type Candidate = {
  id: string;
  referenceNo: string;
  firstName: string;
  lastName: string;
  roleOfInterest: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  interviews: Array<{ id: string; status: string; scheduledStart: string; scheduledEnd: string }>;
};

type Interview = {
  id: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string;
  timezone: string;
  candidate: { firstName: string; lastName: string; referenceNo: string };
  application?: { requisition?: { title?: string } | null } | null;
  participants: Array<{ user: { name: string | null; email: string } }>;
};

type CandidateOnboarding = {
  id: string;
  name: string;
  position: string;
  status: string;
  progress: number;
  missingFields: string[];
  updatedAt: string;
};
type ApiResult<T> = { data: T; error?: { message?: string } };

const pipeline = [
  { status: "APPLIED", label: "New", tone: "bg-info", href: "/hr/candidates?status=APPLIED" },
  {
    status: "SCREENING",
    label: "Under Review",
    tone: "bg-info",
    href: "/hr/candidates?status=SCREENING",
  },
  {
    status: "SHORTLISTED",
    label: "Shortlisted",
    tone: "bg-warning",
    href: "/hr/candidates?status=SHORTLISTED",
  },
  {
    status: "INTERVIEW",
    label: "Interview",
    tone: "bg-info",
    href: "/hr/candidates?status=INTERVIEW",
  },
  {
    status: "SELECTED",
    label: "Selected",
    tone: "bg-success",
    href: "/hr/candidates?status=SELECTED",
  },
] as const;

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

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const timeFormatter = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

function formatDate(value: string) {
  return dateFormatter.format(new Date(value));
}
function formatTime(value: string) {
  return timeFormatter.format(new Date(value));
}
function formatStatus(status: string) {
  return status.replaceAll("_", " ");
}
function isToday(value: string) {
  const date = new Date(value);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

async function getJson<T>(url: string) {
  const response = await fetch(url);
  const result = (await response.json()) as ApiResult<T>;
  if (!response.ok) throw new Error(result.error?.message || "Could not load dashboard data");
  return result.data;
}

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 px-5 py-4 sm:px-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
        <h2 className="mt-1 text-base font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ message, href, label }: { message: string; href?: string; label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{message}</p>
      {href && label && (
        <Link href={href} className="mt-3 text-xs font-bold text-primary hover:underline">
          {label} <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

export default function RecruitmentDashboardPage() {
  const [dashboard, setDashboard] = useState<RecruitmentData | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [candidateOnboarding, setCandidateOnboarding] = useState<CandidateOnboarding[]>([]);
  const [message, setMessage] = useState("Loading hiring dashboard…");

  const load = useCallback(async () => {
    setMessage("Loading hiring dashboard…");
    try {
      const [dashboardResult, candidateResult, interviewResult, onboardingResult] =
        await Promise.all([
          getJson<RecruitmentData>("/api/v1/dashboards/recruitment"),
          getJson<{ items: Candidate[] }>("/api/v1/candidates?page=1&pageSize=100&direction=desc"),
          getJson<{ items: Interview[] }>("/api/v1/interviews?page=1&pageSize=100&direction=asc"),
          getJson<CandidateOnboarding[]>("/api/v1/candidates/onboarding"),
        ]);
      setDashboard(dashboardResult);
      setCandidates(candidateResult.items);
      setInterviews(interviewResult.items);
      setCandidateOnboarding(onboardingResult);
      setMessage("");
    } catch (error) {
      setDashboard(null);
      setMessage(error instanceof Error ? error.message : "Could not load hiring dashboard");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const isLoading = message.startsWith("Loading");
  const activeInterviews = useMemo(
    () => interviews.filter((item) => !["CANCELLED", "COMPLETED", "NO_SHOW"].includes(item.status)),
    [interviews],
  );
  const upcomingInterviews = activeInterviews
    .filter((item) => new Date(item.scheduledStart).getTime() >= Date.now())
    .slice(0, 5);
  const todayInterviews = activeInterviews.filter((item) => isToday(item.scheduledStart));
  const pendingDecisions = candidates.filter(
    (candidate) => candidate.status === "INTERVIEW",
  ).length;
  const recentApplications = candidates.slice(0, 6);
  const maxPipelineCount = Math.max(
    ...pipeline.map((item) => dashboard?.pipelineCounts[item.status] || 0),
    1,
  );

  const kpis = dashboard
    ? [
        {
          label: "Open jobs / forms",
          value: dashboard.openPositions,
          detail: "Published opportunities",
          icon: BriefcaseBusiness,
          href: "/hr/candidates/new",
          tone: "text-info-ink bg-info-light dark:bg-info-light/50",
        },
        {
          label: "New applications",
          value: dashboard.pipelineCounts.APPLIED || 0,
          detail: "Ready for first review",
          icon: Users,
          href: "/hr/candidates?status=APPLIED",
          tone: "text-info-ink bg-info-light dark:bg-info-light/50",
        },
        {
          label: "Awaiting review",
          value: dashboard.pipelineCounts.SCREENING || 0,
          detail: "In the review queue",
          icon: ClipboardCheck,
          href: "/hr/candidates?status=SCREENING",
          tone: "text-primary-ink bg-primary-light dark:bg-primary-light/50",
        },
        {
          label: "Interviews today",
          value: todayInterviews.length,
          detail: "Scheduled for today",
          icon: CalendarDays,
          href: "/hr/interviews",
          tone: "text-info-ink bg-info-light dark:bg-info-light/50",
        },
        {
          label: "Pending decisions",
          value: pendingDecisions,
          detail: "Awaiting next decision",
          icon: Clock3,
          href: "/hr/candidates?status=INTERVIEW",
          tone: "text-warning-ink bg-warning-light dark:bg-warning-light/50",
        },
        {
          label: "Awaiting onboarding",
          value: candidateOnboarding.filter((item) => item.status !== "COMPLETED").length,
          detail: "Candidate details still pending",
          icon: UserCheck,
          href: "/hr/candidates?status=SELECTED",
          tone: "text-success-ink bg-success-light dark:bg-success-light/50",
        },
      ]
    : [];

  return (
    <main className="page-shell space-y-6 pb-12">
      <section className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-card px-5 py-6 shadow-sm sm:px-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Phase 1 · Hiring
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Hiring
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            A clear view of your recruitment pipeline, today&apos;s interviews, and the actions that
            keep hiring moving.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-bold text-foreground transition hover:bg-muted"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} aria-hidden="true" />
            Refresh
          </button>
          <Link
            href="/hr/candidates/new"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />
            Create job / form
          </Link>
        </div>
      </section>

      {isLoading && (
        <div
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-muted-foreground"
          role="status"
        >
          <RefreshCw className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          {message}
        </div>
      )}
      {!isLoading && message && (
        <div
          className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{message}</span>
        </div>
      )}

      {dashboard && (
        <>
          <section
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
            aria-label="Hiring summary"
          >
            {kpis.map(({ label, value, detail, icon: Icon, href, tone }) => (
              <Link
                key={label}
                href={href}
                className="group rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">{label}</p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                      {value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                  </div>
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      tone,
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary opacity-0 transition group-hover:opacity-100">
                  Open queue <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
              </Link>
            ))}
          </section>

          <section className="rounded-2xl border border-border/70 bg-card shadow-sm">
            <SectionHeading
              eyebrow="Workflow"
              title="Recruitment pipeline"
              action={
                <Link
                  href="/hr/candidates"
                  className="text-xs font-bold text-primary hover:underline"
                >
                  View candidates{" "}
                  <ArrowRight className="ml-1 inline h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              }
            />
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5 sm:p-6">
              {pipeline.map((item, index) => {
                const count = dashboard.pipelineCounts[item.status] || 0;
                return (
                  <Link
                    key={item.status}
                    href={item.href}
                    className="group rounded-xl border border-border/70 bg-background p-4 transition hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-muted-foreground">0{index + 1}</span>
                      <span className={cn("h-2 w-2 rounded-full", item.tone)} aria-hidden="true" />
                    </div>
                    <p className="mt-4 text-sm font-bold text-foreground">{item.label}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{count}</p>
                    <div className="mt-4 h-1.5 rounded-full bg-muted">
                      <div
                        className={cn("h-full rounded-full", item.tone)}
                        style={{
                          width: `${Math.max(count ? 10 : 0, Math.round((count / maxPipelineCount) * 100))}%`,
                        }}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
              <SectionHeading
                eyebrow="Latest intake"
                title="Recent applications"
                action={
                  <Link
                    href="/hr/candidates"
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    View all
                  </Link>
                }
              />
              {recentApplications.length === 0 ? (
                <EmptyState
                  message="No applications have arrived yet."
                  href="/hr/candidates/new"
                  label="Create a candidate form"
                />
              ) : (
                <div className="divide-y divide-border/60">
                  {recentApplications.map((candidate) => (
                    <Link
                      key={candidate.id}
                      href={`/hr/candidates/${candidate.id}`}
                      className="group flex items-center gap-3 px-5 py-4 transition hover:bg-muted/40 sm:px-6"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                        {candidate.firstName[0]}
                        {candidate.lastName[0]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-foreground group-hover:text-primary">
                          {candidate.firstName} {candidate.lastName}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {candidate.roleOfInterest || "Position not specified"} · Applied{" "}
                          {formatDate(candidate.createdAt)}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "hidden rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase sm:inline-flex",
                          statusStyles[candidate.status] || "bg-muted text-muted-foreground",
                        )}
                      >
                        {formatStatus(candidate.status)}
                      </span>
                      <ArrowRight
                        className="h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </Link>
                  ))}
                </div>
              )}
            </section>
            <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
              <SectionHeading
                eyebrow="Today"
                title="Upcoming interviews"
                action={
                  <Link
                    href="/hr/interviews"
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Calendar
                  </Link>
                }
              />
              {upcomingInterviews.length === 0 ? (
                <EmptyState
                  message="No upcoming interviews are scheduled."
                  href="/hr/interviews/new"
                  label="Schedule an interview"
                />
              ) : (
                <div className="divide-y divide-border/60">
                  {upcomingInterviews.map((interview) => (
                    <Link
                      key={interview.id}
                      href={`/hr/interviews/${interview.id}`}
                      className="group block px-5 py-4 transition hover:bg-muted/40 sm:px-6"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-info-light text-info-ink dark:bg-info-light/50 dark:text-info-ink">
                          <CalendarDays className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-bold text-foreground group-hover:text-primary">
                            {interview.candidate.firstName} {interview.candidate.lastName}
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {interview.application?.requisition?.title || "Position not specified"}
                          </span>
                        </span>
                        <span className="text-right text-xs font-bold text-foreground">
                          {formatDate(interview.scheduledStart)}
                          <span className="block font-medium text-muted-foreground">
                            {formatTime(interview.scheduledStart)}
                          </span>
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3 pl-12 text-[11px] text-muted-foreground">
                        <span className="truncate">
                          {interview.participants[0]?.user.name ||
                            interview.participants[0]?.user.email ||
                            "Interviewer not assigned"}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-1 font-bold uppercase">
                          {formatStatus(interview.status)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
              <SectionHeading
                eyebrow="Next step"
                title="Selected candidates awaiting onboarding"
                action={
                  <Link
                    href="/hr/onboarding"
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    Open onboarding
                  </Link>
                }
              />
              {candidateOnboarding.length === 0 ? (
                <EmptyState message="No selected candidates are waiting for onboarding." />
              ) : (
                <div className="divide-y divide-border/60">
                  {candidateOnboarding.slice(0, 5).map((candidate) => (
                    <Link
                      key={candidate.id}
                      href={`/hr/candidates/${candidate.id}`}
                      className="group flex items-center gap-3 px-5 py-4 transition hover:bg-muted/40 sm:px-6"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success-light text-success-ink dark:bg-success-light/50 dark:text-success-ink">
                        <UserCheck className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-foreground group-hover:text-primary">
                          {candidate.name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {candidate.position || "Position not specified"}
                        </span>
                      </span>
                      <span className="text-right text-xs text-muted-foreground">
                        <span className="block font-bold text-foreground">
                          {candidate.progress}% complete
                        </span>
                        <span className="block">
                          {candidate.missingFields.length} item
                          {candidate.missingFields.length === 1 ? "" : "s"} pending
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
            <section className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
              <SectionHeading
                eyebrow="Activity"
                title="Recent recruitment activity"
                action={
                  <Link
                    href="/hr/notifications"
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    View all
                  </Link>
                }
              />
              {recentApplications.length === 0 && interviews.length === 0 ? (
                <EmptyState message="Activity will appear as candidates move through hiring." />
              ) : (
                <div className="divide-y divide-border/60">
                  {[
                    ...recentApplications.slice(0, 3).map((candidate) => ({
                      id: `candidate-${candidate.id}`,
                      icon: Users,
                      text: `${candidate.firstName} ${candidate.lastName} submitted an application`,
                      detail: candidate.roleOfInterest || "Position not specified",
                      date: candidate.createdAt,
                    })),
                    ...interviews.slice(0, 3).map((interview) => ({
                      id: `interview-${interview.id}`,
                      icon: CalendarDays,
                      text: `Interview scheduled with ${interview.candidate.firstName} ${interview.candidate.lastName}`,
                      detail: interview.application?.requisition?.title || "Position not specified",
                      date: interview.scheduledStart,
                    })),
                  ]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .slice(0, 5)
                    .map((activity) => {
                      const Icon = activity.icon;
                      return (
                        <div
                          key={activity.id}
                          className="flex items-center gap-3 px-5 py-4 sm:px-6"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">
                              {activity.text}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {activity.detail}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {formatDate(activity.date)}
                          </span>
                        </div>
                      );
                    })}
                </div>
              )}
            </section>
          </div>

          <section className="rounded-2xl border border-border/70 bg-card shadow-sm">
            <SectionHeading
              eyebrow="Hiring now"
              title="Open jobs and forms"
              action={
                <Link
                  href="/hr/candidates/new"
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Create new
                </Link>
              }
            />
            {dashboard.openRequisitions.length === 0 ? (
              <EmptyState
                message="No published jobs or forms are available."
                href="/hr/candidates/new"
                label="Create a job form"
              />
            ) : (
              <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
                {dashboard.openRequisitions.map((requisition) => (
                  <Link
                    key={requisition.id}
                    href="/hr/candidates"
                    className="rounded-xl border border-border/70 bg-background p-4 transition hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-info-light text-info-ink dark:bg-info-light/50 dark:text-info-ink">
                        <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <p className="mt-4 truncate text-sm font-bold text-foreground">
                      {requisition.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {requisition._count.applications} applications · {requisition.referenceNo}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
