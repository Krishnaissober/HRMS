import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  TrendingUp,
  Users,
} from "lucide-react";
import { DashboardGeminiBackground } from "@/components/layout/dashboard-gemini-background";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminContext } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

function change(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "0%" : "New";
  const percentage = Math.round(((current - previous) / previous) * 100);
  return `${percentage > 0 ? "+" : ""}${percentage}%`;
}

export default async function AdminAnalyticsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  let adminContext;
  try {
    adminContext = await getAdminContext();
  } catch {
    redirect("/hr/dashboard");
  }

  const organizationId = adminContext.organizationId;
  const end = new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);
  const previousStart = new Date(start);
  previousStart.setDate(previousStart.getDate() - 30);
  const dateRange = { gte: start, lt: end };
  const previousRange = { gte: previousStart, lt: start };
  const [
    applications,
    previousApplications,
    hires,
    previousHires,
    newEmployees,
    previousEmployees,
    leaveRequests,
    previousLeave,
    attendanceExceptions,
    publishedRoles,
  ] = await Promise.all([
    db.application.count({ where: { organizationId, createdAt: dateRange } }),
    db.application.count({ where: { organizationId, createdAt: previousRange } }),
    db.hiringDecision.count({ where: { organizationId, decision: "HIRE", createdAt: dateRange } }),
    db.hiringDecision.count({
      where: { organizationId, decision: "HIRE", createdAt: previousRange },
    }),
    db.employee.count({ where: { organizationId, createdAt: dateRange } }),
    db.employee.count({ where: { organizationId, createdAt: previousRange } }),
    db.leaveRequest.count({ where: { organizationId, createdAt: dateRange } }),
    db.leaveRequest.count({ where: { organizationId, createdAt: previousRange } }),
    db.attendanceRecord.count({
      where: { organizationId, workDate: dateRange, exceptionType: { not: null } },
    }),
    db.jobRequisition.count({ where: { organizationId, status: "PUBLISHED" } }),
  ]);
  const metrics = [
    [
      "Applications",
      applications,
      change(applications, previousApplications),
      BriefcaseBusiness,
      "text-indigo-500",
      "/hr/candidates",
    ],
    [
      "Hires",
      hires,
      change(hires, previousHires),
      CheckCircle2,
      "text-emerald-500",
      "/hr/employees",
    ],
    [
      "New employees",
      newEmployees,
      change(newEmployees, previousEmployees),
      Users,
      "text-sky-500",
      "/hr/employees",
    ],
    [
      "Leave requests",
      leaveRequests,
      change(leaveRequests, previousLeave),
      CalendarDays,
      "text-amber-500",
      "/hr/leave",
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
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Executive Analytics</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Understand how the organization is moving across the last 30 days, with a comparison
            against the previous period.
          </p>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(([label, value, delta, Icon, tone, href]) => (
          <Link
            key={label}
            href={href}
            className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-400/60"
          >
            <div className="mb-4 flex items-center justify-between">
              <span
                className={`flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 ${tone}`}
              >
                <Icon className="size-5" />
              </span>
              <span className="text-xs font-black text-muted-foreground">vs previous 30d</span>
            </div>
            <p className="text-sm font-semibold text-muted-foreground">{label}</p>
            <p className="mt-1 text-3xl font-black tracking-tight">{value}</p>
            <p
              className={`mt-2 text-sm font-bold ${delta.startsWith("-") ? "text-rose-600" : "text-emerald-600"}`}
            >
              {delta}
            </p>
          </Link>
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="eyebrow">Operational pulse</p>
              <h2 className="mt-1 text-xl font-black tracking-tight">What needs context</h2>
            </div>
            <TrendingUp className="size-5 text-indigo-500" />
          </div>
          <div className="space-y-4">
            {[
              [
                "Published roles",
                publishedRoles,
                "Open positions available to candidates",
                "/hr/recruitment/dashboard",
              ],
              [
                "Attendance exceptions",
                attendanceExceptions,
                "Records that may need manager review",
                "/hr/attendance",
              ],
              [
                "Hiring conversion",
                `${applications ? Math.round((hires / applications) * 100) : 0}%`,
                "Hires compared with applications in this period",
                "/hr/reports",
              ],
            ].map(([label, value, detail, href]) => (
              <Link
                key={label}
                href={href as string}
                className="flex items-center justify-between rounded-2xl border border-border/60 p-4 transition hover:border-indigo-400/60 hover:bg-muted/30"
              >
                <div>
                  <p className="text-sm font-black">{label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                </div>
                <span className="flex items-center gap-2 text-xl font-black">
                  {value}
                  <ArrowRight className="size-4 text-muted-foreground" />
                </span>
              </Link>
            ))}
          </div>
        </section>
        <section className="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-6 shadow-sm">
          <BarChart3 className="mb-4 size-6 text-indigo-600" />
          <p className="eyebrow">Reporting boundary</p>
          <h2 className="mt-1 text-xl font-black tracking-tight">Real data, clear context</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            All values are limited to the current organization. Period comparisons use the last 30
            complete days of stored records and do not include demo data or cross-organization
            totals.
          </p>
          <div className="mt-5 flex items-center gap-2 text-sm font-bold text-indigo-700">
            <CalendarDays className="size-4" /> Last 30 days vs previous 30 days
          </div>
        </section>
      </div>
    </main>
  );
}
