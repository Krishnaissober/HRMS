import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ClipboardList,
  FileDown,
  ShieldCheck,
  Users,
} from "lucide-react";
import { DashboardGeminiBackground } from "@/components/layout/dashboard-gemini-background";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminContext } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  let adminContext;
  try {
    adminContext = await getAdminContext();
  } catch {
    redirect("/hr/dashboard");
  }
  const organizationId = adminContext.organizationId;
  const [candidates, employees, attendanceRecords, leaveRequests, payrollRuns, auditEvents] =
    await Promise.all([
      db.candidate.count({ where: { organizationId } }),
      db.employee.count({ where: { organizationId } }),
      db.attendanceRecord.count({ where: { organizationId } }),
      db.leaveRequest.count({ where: { organizationId } }),
      db.payrollRun.count({ where: { organizationId } }),
      db.auditLog.count({ where: { organizationId } }),
    ]);
  const reports = [
    [
      "Recruitment report",
      "Candidates, applications, pipeline, and sources",
      "/hr/reports?view=recruitment",
      candidates,
      BriefcaseBusiness,
    ],
    [
      "Workforce report",
      "Employees, onboarding, and HR operations",
      "/hr/reports?view=workforce",
      employees,
      Users,
    ],
    [
      "Attendance report",
      "Attendance records and exceptions",
      "/hr/reports?view=attendance",
      attendanceRecords,
      CalendarDays,
    ],
    [
      "Leave report",
      "Requests, balances, and approvals",
      "/hr/reports?view=leave",
      leaveRequests,
      ClipboardList,
    ],
    [
      "Payroll report",
      "Payroll runs and expense activity",
      "/hr/reports?view=payroll",
      payrollRuns,
      FileDown,
    ],
    [
      "Audit report",
      "Security and administrative activity",
      "/admin/audit",
      auditEvents,
      ShieldCheck,
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
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
            Reports &amp; Export Hub
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            One place to open the organization’s operational reports and review the records
            available for controlled export.
          </p>
        </div>
      </section>
      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="eyebrow">Report catalog</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">Choose a reporting area</h2>
          </div>
          <BarChart3 className="size-5 text-indigo-500" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {reports.map(([label, detail, href, count, Icon]) => (
            <Link
              key={label}
              href={href}
              className="group rounded-2xl border border-border/60 p-5 transition hover:-translate-y-1 hover:border-indigo-400/60 hover:bg-indigo-500/5"
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                  <Icon className="size-5" />
                </span>
                <span className="text-2xl font-black">{count}</span>
              </div>
              <h3 className="text-sm font-black">{label}</h3>
              <p className="mt-2 min-h-10 text-xs leading-5 text-muted-foreground">{detail}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600">
                Open report <ArrowRight className="size-3 transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-6 shadow-sm">
          <FileDown className="mb-4 size-6 text-indigo-600" />
          <p className="eyebrow">Controlled exports</p>
          <h2 className="mt-1 text-xl font-black tracking-tight">Export with context</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Reports remain organization-scoped and use the existing permission checks. Downloads and
            exports are recorded in the audit trail for administrator review.
          </p>
          <Link
            href="/admin/audit"
            className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:underline"
          >
            Review export activity <ArrowRight className="size-4" />
          </Link>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <ShieldCheck className="mb-4 size-6 text-emerald-500" />
          <p className="eyebrow">Access boundary</p>
          <h2 className="mt-1 text-xl font-black tracking-tight">Administrator only</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This hub is protected by the administrator role and configured administrator email.
            Normal HR users continue using their existing Reports page.
          </p>
        </div>
      </section>
    </main>
  );
}
