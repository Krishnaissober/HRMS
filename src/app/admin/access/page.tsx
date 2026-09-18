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
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getAdminContext } from "@/lib/admin-access";
import { AdminMembershipActions } from "@/components/admin/admin-membership-actions";

export const dynamic = "force-dynamic";

export default async function AdminAccessPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; role?: string }>;
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
  const role = params.role?.trim() || "";
  const excludedAdminEmail = (
    env.ADMIN_EMAIL || env.LOCAL_ADMIN_EMAIL || adminContext.session.user.email
  )
    .trim()
    .toLowerCase();
  const status =
    params.status === "ACTIVE" || params.status === "INACTIVE" ? params.status : undefined;
  const memberships = await db.membership.findMany({
    where: {
      organizationId: adminContext.organizationId,
      ...(status ? { status } : {}),
      user: {
        email: { not: excludedAdminEmail },
        ...(query ? { OR: [{ name: { contains: query } }, { email: { contains: query } }] } : {}),
      },
      roles: {
        some: role ? { role: { slug: role } } : undefined,
        none: { role: { slug: env.ADMIN_ROLE_SLUG } },
      },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
      roles: { select: { role: { select: { name: true, slug: true } } } },
    },
  });
  const onlineUserIds = new Set(
    await db.session
      .findMany({
        where: {
          userId: { in: memberships.map((member) => member.user.id) },
          expiresAt: { gt: new Date() },
        },
        select: { userId: true },
      })
      .then((sessions) => sessions.map((session) => session.userId)),
  );
  const [totalMembers, activeMembers, adminMembers] = await Promise.all([
    db.membership.count({
      where: {
        organizationId: adminContext.organizationId,
        user: { email: { not: excludedAdminEmail } },
        roles: { none: { role: { slug: env.ADMIN_ROLE_SLUG } } },
      },
    }),
    db.membership.count({
      where: {
        organizationId: adminContext.organizationId,
        status: "ACTIVE",
        user: { email: { not: excludedAdminEmail } },
        roles: { none: { role: { slug: env.ADMIN_ROLE_SLUG } } },
      },
    }),
    db.membership.count({
      where: {
        organizationId: adminContext.organizationId,
        status: "ACTIVE",
        user: { email: { not: excludedAdminEmail } },
        roles: {
          some: { role: { slug: "hr-admin" } },
          none: { role: { slug: env.ADMIN_ROLE_SLUG } },
        },
      },
    }),
  ]);
  const accessMetrics = [
    ["Organization members", totalMembers, Users, "text-primary-ink"],
    ["Active access", activeMembers, CheckCircle2, "text-success-ink"],
    ["HR administrators", adminMembers, ShieldCheck, "text-warning-ink"],
  ] as const;

  return (
    <main className="page-shell space-y-6 pb-12">
      <section className="enterprise-hero relative overflow-hidden rounded-xl border border-primary/20 bg-card p-6 text-foreground shadow-sm sm:p-8">
        <div className="relative z-10">
          <Link
            href="/admin"
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary-ink transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> Admin Command Center
          </Link>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-primary-ink">
            Administrator workspace
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {role === "hr-admin" ? "HR Administrators" : "People & Access"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            {role === "hr-admin"
              ? "Review every active HR Administrator assigned to this organization."
              : "See managed HR members and their assigned roles. The Master Admin account is governed separately from this access policy."}
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
            <p className="mt-1 text-3xl font-bold tracking-tight">{value as number}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Search className="size-5 text-primary-ink" />
          <div>
            <p className="eyebrow">Find a member</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">Access directory</h2>
          </div>
        </div>
        <form className="flex flex-col gap-3 md:flex-row" method="get">
          {role ? <input type="hidden" name="role" value={role} /> : null}
          <input
            name="q"
            defaultValue={query}
            placeholder="Search by name or email"
            className="min-h-11 flex-1 rounded-xl border border-border/70 bg-background px-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <select
            name="status"
            defaultValue={status ?? ""}
            className="min-h-11 rounded-xl border border-border/70 bg-background px-4 text-sm outline-none focus:border-primary"
          >
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-primary px-5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-primary"
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

      <section className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="eyebrow">Members</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">
              {role === "hr-admin" ? "HR administrator directory" : "Current access posture"}
            </h2>
          </div>
          <LockKeyhole className="size-5 text-primary-ink" />
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
                  className="flex flex-col gap-4 rounded-2xl border border-border/60 p-4 transition hover:border-primary/60 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary-ink dark:text-primary-ink">
                      <UserRound className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-bold">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
                      {roles}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${active ? "bg-success/10 text-success-ink" : "bg-destructive/10 text-destructive-ink"}`}
                    >
                      {active ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <XCircle className="size-3" />
                      )}
                      {member.status}
                    </span>
                    {role === "hr-admin" ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${onlineUserIds.has(member.user.id) ? "bg-success/10 text-success-ink" : "bg-muted text-muted-foreground"}`}
                        title={
                          onlineUserIds.has(member.user.id)
                            ? "Valid session detected"
                            : "No valid session detected"
                        }
                      >
                        <span
                          className={`size-1.5 rounded-full ${onlineUserIds.has(member.user.id) ? "bg-success" : "bg-muted-foreground/50"}`}
                        />
                        {onlineUserIds.has(member.user.id) ? "ONLINE" : "OFFLINE"}
                      </span>
                    ) : null}
                    {role === "hr-admin" ? (
                      <AdminMembershipActions membershipId={member.id} active={active} />
                    ) : null}
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
