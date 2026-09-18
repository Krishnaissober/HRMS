import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";
import { AdminPasswordForm } from "@/components/admin/admin-password-form";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AccountSecurityPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  return (
    <main className="page-shell space-y-6 pb-12">
      <section className="rounded-xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
        <Link
          href="/me/profile"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to profile
        </Link>
        <p className="eyebrow">Account</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Security</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
          Change your password with your current credential. Other active sessions are revoked
          after a successful change.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary-ink dark:text-primary-ink">
              <LockKeyhole className="size-5" />
            </span>
            <div>
              <p className="eyebrow">Credential management</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight">Change password</h2>
            </div>
          </div>
          <AdminPasswordForm />
        </div>
        <div className="rounded-xl border border-success/20 bg-success/5 p-6 shadow-sm">
          <ShieldCheck className="mb-4 size-6 text-success-ink" />
          <p className="eyebrow">Security rules</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">Protected by Better Auth</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
            <li>Your current password is required.</li>
            <li>Use at least 8 characters for the new password.</li>
            <li>Other active sessions are revoked after a successful change.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
