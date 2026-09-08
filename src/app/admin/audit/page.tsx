import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Filter, ShieldAlert, UserRound, XCircle } from "lucide-react";
import { DashboardGeminiBackground } from "@/components/layout/dashboard-gemini-background";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminContext } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

function formatAction(action: string) {
  return action
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; outcome?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  let adminContext;
  try {
    adminContext = await getAdminContext();
  } catch {
    redirect("/hr/dashboard");
  }

  const params = await searchParams;
  const query = params.q?.trim() || "";
  const outcome =
    params.outcome === "SUCCESS" || params.outcome === "FAILURE" ? params.outcome : undefined;
  const where = {
    organizationId: adminContext.organizationId,
    ...(query ? { action: { contains: query } } : {}),
    ...(outcome ? { outcome } : {}),
  };
  const [events, totalEvents, successfulEvents, failedEvents] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        outcome: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
      },
    }),
    db.auditLog.count({ where: { organizationId: adminContext.organizationId } }),
    db.auditLog.count({
      where: { organizationId: adminContext.organizationId, outcome: "SUCCESS" },
    }),
    db.auditLog.count({
      where: { organizationId: adminContext.organizationId, outcome: "FAILURE" },
    }),
  ]);
  const auditMetrics = [
    ["Total events", totalEvents, ShieldAlert, "text-indigo-500"],
    ["Successful", successfulEvents, CheckCircle2, "text-emerald-500"],
    ["Failed", failedEvents, XCircle, "text-rose-500"],
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
            Security &amp; Audit Activity
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Review organization activity in one place. This view is read-only and limited to the
            administrator.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {auditMetrics.map(([label, value, Icon, tone]) => (
          <div
            key={label as string}
            className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm"
          >
            <Icon className={`mb-4 size-5 ${tone}`} />
            <p className="text-sm font-semibold text-muted-foreground">{label as string}</p>
            <p className="mt-1 text-3xl font-black tracking-tight">{value as number}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Filter className="size-5 text-indigo-500" />
          <div>
            <p className="eyebrow">Find activity</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">Filter the audit trail</h2>
          </div>
        </div>
        <form className="flex flex-col gap-3 md:flex-row" method="get">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by action, for example LOGIN or EXPORT"
            className="min-h-11 flex-1 rounded-xl border border-border/70 bg-background px-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <select
            name="outcome"
            defaultValue={outcome ?? ""}
            className="min-h-11 rounded-xl border border-border/70 bg-background px-4 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All outcomes</option>
            <option value="SUCCESS">Successful</option>
            <option value="FAILURE">Failed</option>
          </select>
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-indigo-700"
          >
            Apply filters
          </button>
          {query || outcome ? (
            <Link
              href="/admin/audit"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border/70 px-5 text-sm font-bold transition hover:bg-muted"
            >
              Clear
            </Link>
          ) : null}
        </form>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="eyebrow">Recent events</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">Latest organization activity</h2>
          </div>
          <span className="text-sm text-muted-foreground">
            Showing {events.length} of {totalEvents}
          </span>
        </div>
        {events.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="border-b border-border/60 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-3 py-3 font-bold">Event</th>
                  <th className="px-3 py-3 font-bold">Actor</th>
                  <th className="px-3 py-3 font-bold">Result</th>
                  <th className="px-3 py-3 font-bold">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {events.map((event) => (
                  <tr key={event.id} className="transition hover:bg-muted/30">
                    <td className="px-3 py-4">
                      <p className="text-sm font-bold">{formatAction(event.action)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {event.entityType}
                        {event.entityId ? ` · ${event.entityId.slice(0, 12)}` : ""}
                      </p>
                    </td>
                    <td className="px-3 py-4">
                      <span className="flex items-center gap-2 text-sm">
                        <UserRound className="size-4 text-indigo-500" />
                        {event.actor?.name || event.actor?.email || "System"}
                      </span>
                    </td>
                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${event.outcome === "SUCCESS" ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}
                      >
                        {event.outcome}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-muted-foreground">
                      <time dateTime={event.createdAt.toISOString()}>
                        {event.createdAt.toLocaleString()}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-10 text-center text-sm text-muted-foreground">
            No audit events match these filters.
          </div>
        )}
      </section>
    </main>
  );
}
