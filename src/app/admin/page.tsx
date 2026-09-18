import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  UserCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { AdminRefreshButton } from "@/components/admin/admin-refresh-button";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminContext } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

const cardClass =
  "rounded-3xl border border-border/70 bg-card/95 p-5 shadow-[0_12px_32px_rgb(15_23_42/0.06)] backdrop-blur-sm md:p-6";
const tones = {
  indigo: "bg-primary/10 text-primary-ink dark:text-primary-ink",
  emerald: "bg-success/10 text-success-ink dark:text-success-ink",
  amber: "bg-warning/10 text-warning-ink dark:text-warning-ink",
  sky: "bg-info/10 text-info-ink dark:text-info-ink",
  rose: "bg-destructive/10 text-destructive-ink dark:text-destructive-ink",
};

function formatAction(action: string) {
  return action
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export default async function AdminEntryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  let adminContext;
  try {
    adminContext = await getAdminContext();
  } catch {
    redirect("/hr/dashboard");
  }

  const { organizationId } = adminContext;
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const [
    activeEmployees,
    openCandidates,
    scheduledInterviews,
    onboarding,
    pendingLeave,
    pendingOffers,
    pendingPayroll,
    presentToday,
    publishedPositions,
    recentActivity,
  ] = await Promise.all([
    db.employee.count({ where: { organizationId, status: { in: ["ACTIVE", "PROBATION"] } } }),
    db.application.count({
      where: { organizationId, status: { in: ["APPLIED", "SCREENING", "SHORTLISTED"] } },
    }),
    db.interview.count({ where: { organizationId, status: { in: ["SCHEDULED", "RESCHEDULED"] } } }),
    db.onboardingInstance.count({ where: { organizationId, status: { not: "COMPLETED" } } }),
    db.leaveRequest.count({ where: { organizationId, status: "PENDING" } }),
    db.offer.count({ where: { organizationId, status: { in: ["DRAFT", "PENDING", "SENT"] } } }),
    db.payrollRun.count({
      where: { organizationId, status: { in: ["DRAFT", "IN_REVIEW", "PENDING_APPROVAL"] } },
    }),
    db.attendanceRecord.count({
      where: { organizationId, workDate: { gte: startOfDay, lt: endOfDay }, status: "PRESENT" },
    }),
    db.jobRequisition.count({ where: { organizationId, status: "PUBLISHED" } }),
    db.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        action: true,
        entityType: true,
        outcome: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
      },
    }),
  ]);

  const attentionCount = pendingLeave + pendingOffers + pendingPayroll + onboarding;
  const workflow = [
    {
      label: "Open candidates",
      value: openCandidates,
      href: "/hr/candidates",
      icon: Users,
      tone: tones.indigo,
    },
    {
      label: "Interviews",
      value: scheduledInterviews,
      href: "/hr/interviews",
      icon: CalendarClock,
      tone: tones.sky,
    },
    {
      label: "Onboarding",
      value: onboarding,
      href: "/hr/onboarding",
      icon: ClipboardCheck,
      tone: tones.amber,
    },
    {
      label: "Employees",
      value: activeEmployees,
      href: "/hr/employees",
      icon: UserCheck,
      tone: tones.emerald,
    },
  ];
  const metrics = [
    ["Active employees", activeEmployees, Users, tones.indigo],
    ["Open candidates", openCandidates, BriefcaseBusiness, tones.sky],
    ["Needs attention", attentionCount, Activity, tones.amber],
    ["Present today", presentToday, CheckCircle2, tones.emerald],
    ["Published roles", publishedPositions, FileText, tones.rose],
  ] as const;
  const attentionItems = [
    ["Leave requests", pendingLeave, "/hr/leave", WalletCards],
    ["Offer work", pendingOffers, "/hr/offers", FileText],
    ["Payroll runs", pendingPayroll, "/hr/payroll", CircleDollarSign],
    ["Onboarding tasks", onboarding, "/hr/onboarding", ClipboardCheck],
  ] as const;

  return (
    <main className="page-shell admin-command-center space-y-6 pb-12">
      <section className="admin-hero enterprise-hero">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-primary-ink">
              MASTER ADMIN workspace
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Master Admin Control Center
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Keep a clear view of people, hiring activity, approvals, and the work that needs
              attention today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AdminRefreshButton />
            <Link
              href="/hr/reports"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-primary-ink transition hover:-translate-y-0.5 hover:bg-primary-light"
            >
              Open reports <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="admin-metrics grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(([label, value, Icon, tone]) => (
          <div key={label} className={`${cardClass} admin-metric-card transition hover:-translate-y-1`}>
            <div className={`mb-5 flex size-11 items-center justify-center rounded-2xl ${tone}`}>
              <Icon className="size-5" />
            </div>
            <p className="text-sm font-semibold text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight">{value}</p>
          </div>
        ))}
      </section>

      <section className={`${cardClass} admin-workflow`}>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Workflow overview</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">
              Follow work from hiring to employment
            </h2>
          </div>
          <span className="hidden text-sm text-muted-foreground sm:block">
            Live organization totals
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          {workflow.map(({ label, value, href, icon: Icon, tone }) => (
            <Link
              key={label}
              href={href}
              className="group flex items-center justify-between rounded-2xl border border-border/60 bg-muted/30 p-4 transition hover:-translate-y-px hover:border-primary/60 hover:bg-primary/5"
            >
              <span className="flex items-center gap-3">
                <span className={`flex size-10 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="size-5" />
                </span>
                <span className="text-sm font-bold">{label}</span>
              </span>
              <span className="flex items-center gap-2 text-xl font-bold">
                {value}
                <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className={`${cardClass} admin-queue`}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="eyebrow">Attention queue</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">
                Decisions waiting for action
              </h2>
            </div>
            <Activity className="size-5 text-primary-ink" />
          </div>
          <div className="space-y-3">
            {attentionItems.map(([label, value, href, Icon]) => (
              <Link
                key={label as string}
                href={href as string}
                className="flex items-center justify-between rounded-xl border border-border/60 p-3 transition hover:border-primary/60 hover:bg-muted/40"
              >
                <span className="flex items-center gap-3">
                  <Icon className="size-4 text-primary-ink" />
                  <span className="text-sm font-bold">{label as string}</span>
                </span>
                <span className="flex items-center gap-2 text-sm font-bold">
                  {value as number}
                  <ArrowRight className="size-4 text-muted-foreground" />
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className={`${cardClass} admin-status`}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="eyebrow">Control status</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">Protected and ready</h2>
            </div>
            <ShieldCheck className="size-5 text-success-ink" />
          </div>
          <div className="space-y-3">
            {[
              ["Admin access", "Protected by role and email", "text-success-ink"],
              ["Database", "Connected — live metrics loaded", "text-success-ink"],
              ["Organization scope", "Current organization only", "text-primary-ink"],
            ].map(([label, value, tone]) => (
              <div key={label} className="flex items-start gap-3 rounded-xl bg-muted/30 p-3">
                <CheckCircle2 className={`mt-0.5 size-4 ${tone}`} />
                <div>
                  <p className="text-sm font-bold">{label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={`${cardClass} admin-audit`}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="eyebrow">Audit trail</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">Recent activity</h2>
          </div>
          <Activity className="size-5 text-primary-ink" aria-hidden="true" />
        </div>
        <nav
          className="mb-2 flex flex-wrap gap-2 border-y border-border/60 py-3"
          aria-label="Master admin navigation"
        >
          <Link
            href="/admin/health"
            className="rounded-lg bg-muted/50 px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-primary/10 hover:text-primary-ink"
          >
            System health
          </Link>
          <Link
            href="/admin/audit"
            className="rounded-lg bg-primary/10 px-3 py-2 text-xs font-bold text-primary-ink transition-colors hover:bg-primary/15"
          >
            Audit log
          </Link>
          <Link
            href="/admin/access"
            className="rounded-lg bg-muted/50 px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-primary/10 hover:text-primary-ink"
          >
            People &amp; access
          </Link>
          <Link
            href="/admin/governance"
            className="rounded-lg bg-muted/50 px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-primary/10 hover:text-primary-ink"
          >
            Organization policy
          </Link>
          <Link
            href="/admin/operations"
            className="rounded-lg bg-muted/50 px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-primary/10 hover:text-primary-ink"
          >
            Workflow oversight
          </Link>
          <Link
            href="/admin/analytics"
            className="rounded-lg bg-muted/50 px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-primary/10 hover:text-primary-ink"
          >
            Executive analytics
          </Link>
          <Link
            href="/admin/reports"
            className="rounded-lg bg-muted/50 px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-primary/10 hover:text-primary-ink"
          >
            Reports &amp; exports
          </Link>
          <Link
            href="/admin/security"
            className="rounded-lg bg-muted/50 px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-primary/10 hover:text-primary-ink"
          >
            Account security
          </Link>
          <Link
            href="/admin/wavy-demo"
            className="rounded-lg bg-muted/50 px-3 py-2 text-xs font-bold text-foreground transition-colors hover:bg-primary/10 hover:text-primary-ink"
          >
            Wavy effect demo
          </Link>
        </nav>
        {recentActivity.length ? (
          <div className="divide-y divide-border/60">
            {recentActivity.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-bold">
                    {formatAction(event.action)}{" "}
                    <span className="font-normal text-muted-foreground">
                      on {event.entityType.toLowerCase()}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.actor?.name || event.actor?.email || "System"} ·{" "}
                    {event.outcome.toLowerCase()}
                  </p>
                </div>
                <time
                  className="text-xs text-muted-foreground"
                  dateTime={event.createdAt.toISOString()}
                >
                  {event.createdAt.toLocaleString()}
                </time>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            No recent activity has been recorded yet.
          </div>
        )}
      </section>
    </main>
  );
}
