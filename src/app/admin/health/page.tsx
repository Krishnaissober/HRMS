import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Database,
  HardDrive,
  RefreshCw,
  Server,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getAdminContext } from "@/lib/admin-access";
import { checkRedis } from "@/lib/redis";
import { checkStorage } from "@/lib/storage";

export const dynamic = "force-dynamic";

type CheckState = "ok" | "unavailable";

async function withTimeout<T>(work: Promise<T>, timeoutMs = 2500): Promise<CheckState> {
  try {
    await Promise.race([
      work,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
    return "ok";
  } catch {
    return "unavailable";
  }
}

function ServiceIcon({ name }: { name: string }) {
  if (name === "Database") return <Database className="size-5" />;
  if (name === "Redis") return <Server className="size-5" />;
  return <HardDrive className="size-5" />;
}

export default async function AdminHealthPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  try {
    await getAdminContext();
  } catch {
    redirect("/hr/dashboard");
  }

  const [database, redis, storage] = await Promise.all([
    withTimeout(db.$queryRaw`SELECT 1`),
    withTimeout(checkRedis()),
    withTimeout(checkStorage()),
  ]);
  const services = [
    { name: "Database", detail: "Primary application data", state: database },
    { name: "Redis", detail: "Cache and background jobs", state: redis },
    { name: "Storage", detail: "Documents and uploaded files", state: storage },
  ];
  const healthy = services.every((service) => service.state === "ok");

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
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">System Health</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            A clear service-level view for administrators. Each status below comes from a live check
            made when this page loads.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Live checks</p>
            <h2 className="mt-1 text-xl font-bold tracking-tight">Service availability</h2>
          </div>
          <div
            className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-sm font-bold ${healthy ? "bg-success/10 text-success-ink" : "bg-warning/10 text-warning-ink"}`}
          >
            {healthy ? <CheckCircle2 className="size-4" /> : <RefreshCw className="size-4" />}
            {healthy ? "All services available" : "Attention required"}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {services.map((service) => {
            const isHealthy = service.state === "ok";
            return (
              <div
                key={service.name}
                className="rounded-2xl border border-border/60 bg-muted/20 p-5"
              >
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary-ink dark:text-primary-ink">
                    <ServiceIcon name={service.name} />
                  </span>
                  {isHealthy ? (
                    <CheckCircle2 className="size-5 text-success-ink" />
                  ) : (
                    <XCircle className="size-5 text-destructive-ink" />
                  )}
                </div>
                <h3 className="font-bold">{service.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{service.detail}</p>
                <p
                  className={`mt-4 text-sm font-bold ${isHealthy ? "text-success-ink" : "text-destructive-ink"}`}
                >
                  {isHealthy ? "Available" : "Unavailable or timed out"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <ShieldCheck className="mb-4 size-6 text-success-ink" />
          <p className="eyebrow">Access control</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">Admin-only monitoring</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This page is protected by the same role and administrator-email policy as the Command
            Center. Normal HR users are redirected away.
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
          <RefreshCw className="mb-4 size-6 text-primary-ink" />
          <p className="eyebrow">Next action</p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">Run the check again</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Use your browser refresh when you want a fresh service check. A failed external
            dependency is shown honestly and does not block the admin UI.
          </p>
        </div>
      </section>
    </main>
  );
}
