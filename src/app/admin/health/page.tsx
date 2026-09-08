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
import { DashboardGeminiBackground } from "@/components/layout/dashboard-gemini-background";
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
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">System Health</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            A clear service-level view for administrators. Each status below comes from a live check
            made when this page loads.
          </p>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Live checks</p>
            <h2 className="mt-1 text-xl font-black tracking-tight">Service availability</h2>
          </div>
          <div
            className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 text-sm font-bold ${healthy ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-700"}`}
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
                  <span className="flex size-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                    <ServiceIcon name={service.name} />
                  </span>
                  {isHealthy ? (
                    <CheckCircle2 className="size-5 text-emerald-500" />
                  ) : (
                    <XCircle className="size-5 text-rose-500" />
                  )}
                </div>
                <h3 className="font-black">{service.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{service.detail}</p>
                <p
                  className={`mt-4 text-sm font-bold ${isHealthy ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {isHealthy ? "Available" : "Unavailable or timed out"}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <ShieldCheck className="mb-4 size-6 text-emerald-500" />
          <p className="eyebrow">Access control</p>
          <h2 className="mt-1 text-xl font-black tracking-tight">Admin-only monitoring</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This page is protected by the same role and administrator-email policy as the Command
            Center. Normal HR users are redirected away.
          </p>
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
          <RefreshCw className="mb-4 size-6 text-indigo-500" />
          <p className="eyebrow">Next action</p>
          <h2 className="mt-1 text-xl font-black tracking-tight">Run the check again</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Use your browser refresh when you want a fresh service check. A failed external
            dependency is shown honestly and does not block the admin UI.
          </p>
        </div>
      </section>
    </main>
  );
}
