import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  UserRound,
  WalletCards,
} from "lucide-react";
import { DashboardGeminiBackground } from "@/components/layout/dashboard-gemini-background";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminContext } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminOperationsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  let adminContext;
  try {
    adminContext = await getAdminContext();
  } catch {
    redirect("/hr/dashboard");
  }
  const organizationId = adminContext.organizationId;
  const now = new Date();
  const [
    overdueTasks,
    pendingOnboarding,
    pendingLeave,
    pendingOffers,
    pendingPayroll,
    failedAudits,
    heldCandidates,
    recentCandidates,
  ] = await Promise.all([
    db.onboardingTask.count({
      where: { organizationId, dueDate: { lt: now }, status: { not: "COMPLETED" } },
    }),
    db.onboardingInstance.count({ where: { organizationId, status: { not: "COMPLETED" } } }),
    db.leaveRequest.count({ where: { organizationId, status: "PENDING" } }),
    db.offer.count({ where: { organizationId, status: { in: ["DRAFT", "PENDING", "SENT"] } } }),
    db.payrollRun.count({
      where: { organizationId, status: { in: ["DRAFT", "IN_REVIEW", "PENDING_APPROVAL"] } },
    }),
    db.auditLog.count({ where: { organizationId, outcome: "FAILURE" } }),
    db.candidate.count({ where: { organizationId, status: "HOLD" } }),
    db.candidate.findMany({
      where: { organizationId, status: { in: ["APPLIED", "SCREENING", "SHORTLISTED", "HOLD"] } },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        referenceNo: true,
        firstName: true,
        lastName: true,
        roleOfInterest: true,
        status: true,
        updatedAt: true,
      },
    }),
  ]);
  const attentionCount =
    overdueTasks + pendingLeave + pendingOffers + pendingPayroll + failedAudits;
  const queues = [
    [
      "Overdue onboarding tasks",
      overdueTasks,
      "/hr/onboarding",
      ClipboardCheck,
      "Tasks past their due date",
    ],
    ["Pending leave requests", pendingLeave, "/hr/leave", WalletCards, "Waiting for HR action"],
    ["Offer work", pendingOffers, "/hr/offers", FileText, "Draft, pending, or sent offers"],
    ["Payroll runs", pendingPayroll, "/hr/payroll", CalendarClock, "Runs needing review"],
    [
      "Failed audit events",
      failedAudits,
      "/admin/audit?outcome=FAILURE",
      AlertTriangle,
      "Review in the audit log",
    ],
  ] as const;

  return (
    <main className="page-shell space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl sm:p-8">
        <DashboardGeminiBackground />
        <div className="relative z-10">
          <Link
            href="/admin"
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-indigo-200 transition hover:text-white"
          >
            <ArrowLeft className="size-4" /> Admin Command Center
          </Link>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-indigo-300">
            Administrator workspace
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Workflow Oversight</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Find stalled work and exceptions quickly so the right team can follow up before they
            become larger problems.
          </p>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 shadow-sm">
          <AlertTriangle className="mb-4 size-5 text-amber-500" />
          <p className="text-sm font-semibold text-muted-foreground">Needs attention</p>
          <p className="mt-1 text-3xl font-black tracking-tight">{attentionCount}</p>
        </div>
        <div className="rounded-2xl border border-indigo-500/20 bg-card p-5 shadow-sm">
          <ClipboardCheck className="mb-4 size-5 text-indigo-500" />
          <p className="text-sm font-semibold text-muted-foreground">Active onboarding</p>
          <p className="mt-1 text-3xl font-black tracking-tight">{pendingOnboarding}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/60 bg-card p-5 shadow-sm dark:border-slate-800">
          <UserRound className="mb-4 size-5 text-sky-500" />
          <p className="text-sm font-semibold text-muted-foreground">Candidates on hold</p>
          <p className="mt-1 text-3xl font-black tracking-tight">{heldCandidates}</p>
        </div>
      </section>
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Follow-up queues</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">Where attention is needed</h2>
          </div>
          <span className="hidden text-sm text-muted-foreground sm:block">
            Live organization totals
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {queues.map(([label, value, href, Icon, detail]) => (
            <Link
              key={label}
              href={href}
              className="group rounded-2xl border border-border/60 p-4 transition hover:-translate-y-1 hover:border-indigo-400/60 hover:bg-indigo-500/5"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                  <Icon className="size-5" />
                </span>
                <span className="text-2xl font-black">{value}</span>
              </div>
              <p className="text-sm font-black">{label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
                Open queue <ArrowRight className="size-3 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="eyebrow">Hiring follow-up</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">Recently updated candidates</h2>
          </div>
          <Link href="/hr/candidates" className="text-sm font-bold text-indigo-600 hover:underline">
            View candidates
          </Link>
        </div>
        {recentCandidates.length ? (
          <div className="space-y-3">
            {recentCandidates.map((candidate) => (
              <Link
                key={candidate.id}
                href={`/hr/candidates/${candidate.id}`}
                className="flex flex-col gap-3 rounded-2xl border border-border/60 p-4 transition hover:border-indigo-400/60 hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-black text-indigo-600">
                    {candidate.firstName.charAt(0)}
                    {candidate.lastName.charAt(0)}
                  </span>
                  <div>
                    <p className="text-sm font-black">
                      {candidate.firstName} {candidate.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {candidate.roleOfInterest} · {candidate.referenceNo}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 self-start rounded-full bg-muted px-3 py-1 text-xs font-bold sm:self-auto">
                  {candidate.status}
                  <ArrowRight className="size-3" />
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-10 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-3 size-6 text-emerald-500" />
            No active candidate follow-up records found.
          </div>
        )}
      </section>
    </main>
  );
}
