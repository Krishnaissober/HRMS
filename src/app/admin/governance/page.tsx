import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Globe2,
  KeyRound,
  Settings2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { DashboardGeminiBackground } from "@/components/layout/dashboard-gemini-background";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getAdminContext } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminGovernancePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  let adminContext;
  try {
    adminContext = await getAdminContext();
  } catch {
    redirect("/hr/dashboard");
  }

  const organization = await db.organization.findUnique({
    where: { id: adminContext.organizationId },
    select: {
      name: true,
      slug: true,
      status: true,
      timezone: true,
      createdAt: true,
      _count: { select: { memberships: true, roles: true } },
      roles: {
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { memberships: true, permissions: true } },
        },
      },
    },
  });
  if (!organization) redirect("/hr/dashboard");
  const activeMembers = await db.membership.count({
    where: { organizationId: adminContext.organizationId, status: "ACTIVE" },
  });
  const adminRole = organization.roles.find((role) => role.slug === env.ADMIN_ROLE_SLUG);
  const governanceMetrics = [
    ["Organization status", organization.status, CheckCircle2, "text-emerald-500"],
    ["Active members", activeMembers, Users, "text-indigo-500"],
    ["Configured roles", organization._count.roles, ShieldCheck, "text-amber-500"],
    ["Timezone", organization.timezone, Globe2, "text-sky-500"],
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
            Organization &amp; Policy
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            A single source of truth for organization status, regional settings, and the access
            roles that govern the workspace.
          </p>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {governanceMetrics.map(([label, value, Icon, tone]) => (
          <div key={label} className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
            <Icon className={`mb-4 size-5 ${tone}`} />
            <p className="text-sm font-semibold text-muted-foreground">{label}</p>
            <p className="mt-1 truncate text-2xl font-black tracking-tight">{value}</p>
          </div>
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
              <Settings2 className="size-5" />
            </span>
            <div>
              <p className="eyebrow">Organization profile</p>
              <h2 className="mt-1 text-xl font-black tracking-tight">Core configuration</h2>
            </div>
          </div>
          <dl className="space-y-4">
            {[
              ["Name", organization.name],
              ["Slug", organization.slug],
              ["Timezone", organization.timezone],
              ["Created", organization.createdAt.toLocaleDateString()],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex items-start justify-between gap-4 border-b border-border/60 pb-3 last:border-0 last:pb-0"
              >
                <dt className="text-sm font-semibold text-muted-foreground">{label}</dt>
                <dd className="text-right text-sm font-bold">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="eyebrow">Access policy</p>
              <h2 className="mt-1 text-xl font-black tracking-tight">Role coverage</h2>
            </div>
            <KeyRound className="size-5 text-indigo-500" />
          </div>
          <div className="space-y-3">
            {organization.roles.length ? (
              organization.roles.map((role) => (
                <div
                  key={role.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-black">
                      {role.name}
                      {role.slug === env.ADMIN_ROLE_SLUG ? (
                        <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700">
                          Admin role
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{role.slug}</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                    <span>
                      {role._count.memberships} member{role._count.memberships === 1 ? "" : "s"}
                    </span>
                    <span>
                      {role._count.permissions} permission{role._count.permissions === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                No organization roles configured.
              </p>
            )}
          </div>
        </section>
      </div>
      <section className="rounded-3xl border border-indigo-500/20 bg-indigo-500/5 p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 size-5 text-indigo-600" />
          <div>
            <h2 className="text-lg font-black tracking-tight">Governance status</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {adminRole
                ? `The ${adminRole.name} role is configured with ${adminRole._count.permissions} permissions.`
                : `The configured administrator role (${env.ADMIN_ROLE_SLUG}) is not present in this organization.`}{" "}
              This phase is read-only; role and permission editing can be introduced separately with
              explicit confirmation and audit logging.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
