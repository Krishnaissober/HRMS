import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { AdminPasswordForm } from "@/components/admin/admin-password-form";
import { DashboardGeminiBackground } from "@/components/layout/dashboard-gemini-background";
import { auth } from "@/lib/auth";
import { getAdminContext } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminSecurityPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");
  try {
    await getAdminContext();
  } catch {
    redirect("/hr/dashboard");
  }

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
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Account Security</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Change the administrator password securely. The password is never stored in the
            interface or repository.
          </p>
        </div>
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
              <LockKeyhole className="size-5" />
            </span>
            <div>
              <p className="eyebrow">Credential management</p>
              <h2 className="mt-1 text-xl font-black tracking-tight">
                Change administrator password
              </h2>
            </div>
          </div>
          <AdminPasswordForm />
        </div>
        <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/5 p-6 shadow-sm">
          <ShieldCheck className="mb-4 size-6 text-emerald-500" />
          <p className="eyebrow">Security rules</p>
          <h2 className="mt-1 text-xl font-black tracking-tight">Protected by Better Auth</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
            <li>Use at least 8 characters.</li>
            <li>Your current password is required.</li>
            <li>Other active sessions are revoked after a successful change.</li>
            <li>Only the configured administrator email can use this page.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
