import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";
import { DashboardGeminiBackground } from "@/components/layout/dashboard-gemini-background";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getAdminContext } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
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
  const status =
    params.status === "ACTIVE" || params.status === "INACTIVE" ? params.status : undefined;
  const memberships = await db.membership.findMany({
    where: {
      organizationId: adminContext.organizationId,
      ...(status ? { status } : {}),
      ...(query
        ? { user: { OR: [{ name: { contains: query } }, { email: { contains: query } }] } }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      roles: { select: { role: { select: { name: true, slug: true } } } },
    },
  });
  const [totalMembers, activeMembers, adminMembers] = await Promise.all([
    db.membership.count({ where: { organizationId: adminContext.organizationId } }),
    db.membership.count({
      where: { organizationId: adminContext.organizationId, status: "ACTIVE" },
    }),
    db.membership.count({
      where: {
        organizationId: adminContext.organizationId,
        status: "ACTIVE",
        roles: { some: { role: { slug: env.ADMIN_ROLE_SLUG } } },
      },
    }),
  ]);
  const accessMetrics = [
    ["Organization members", totalMembers, Users, "text-indigo-500"],
    ["Active access", activeMembers, CheckCircle2, "text-emerald-500"],
    ["Administrators", adminMembers, ShieldCheck, "text-amber-500"],
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
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">People &amp; Access</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            See who has access to this organization and which role controls their workspace. Changes
            are intentionally outside this read-only monitoring phase.
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {accessMetrics.map(([label, value, Icon, tone]) => (
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
          <Search className="size-5 text-indigo-500" />
          <div>
            <p className="eyebrow">Find a member</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">Access directory</h2>
          </div>
        </div>
        <form className="flex flex-col gap-3 md:flex-row" method="get">
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by name or email"
            className="min-h-11 flex-1 rounded-xl border border-border/70 bg-background px-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="min-h-11 rounded-xl border border-border/70 bg-background px-4 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-indigo-700"
          >
            Apply filters
          </button>
          {query || status ? (
            <Link
              href="/admin/access"
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
            <p className="eyebrow">Members</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">Current access posture</h2>
          </div>
          <LockKeyhole className="size-5 text-indigo-500" />
        </div>
        {memberships.length ? (
          <div className="space-y-3">
            {memberships.map((member) => {
              const active = member.status === "ACTIVE";
              const roles =
                member.roles.map(({ role }) => role.name).join(", ") || "No role assigned";
              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 rounded-2xl border border-border/60 p-4 transition hover:border-indigo-400/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                      <UserRound className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-black">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
                      {roles}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}
                    >
                      {active ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <XCircle className="size-3" />
                      )}
                      {member.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-10 text-center text-sm text-muted-foreground">
            No members match these filters.
          </div>
        )}
      </section>
    </main>
  );
}
