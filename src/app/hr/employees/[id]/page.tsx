"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Detail = {
  id: string;
  employeeNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  jobTitle: string;
  department?: string | null;
  location?: string | null;
  status: string;
  separationType?: "FIRED" | "LEFT_COMPANY" | null;
  separationReason?: string | null;
  separatedAt?: string | null;
  history: Array<{
    id: string;
    eventType: string;
    fromValue?: string | null;
    toValue?: string | null;
    createdAt: string;
  }>;
  onboardingInstances: Array<{
    id: string;
    status: string;
    template: { name: string };
    tasks: Array<{ id: string; status: string; definition: { title: string } }>;
  }>;
};

const statusStyles: Record<string, string> = {
  ACTIVE: "bg-success-light text-success-ink dark:bg-success-light/50 dark:text-success-ink",
  INACTIVE: "bg-muted text-muted-foreground dark:bg-muted dark:text-muted-foreground",
  ON_LEAVE: "bg-warning-light text-warning-ink dark:bg-warning-light/50 dark:text-warning-ink",
  TERMINATED:
    "bg-destructive-light text-destructive-ink dark:bg-destructive-light/50 dark:text-destructive-ink",
};

export default function EmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const [employee, setEmployee] = useState<Detail | null>(null);
  const [message, setMessage] = useState("Loading employee…");
  useEffect(() => {
    void (async () => {
      const values = await params;
      const response = await fetch(`/api/v1/employees/${values.id}`);
      const result = await response.json();
      if (!response.ok) return setMessage(result.error?.message || "Could not load employee");
      setEmployee(result.data);
      setMessage("");
    })();
  }, [params]);
  async function complete(onboardingId: string, taskId: string) {
    const response = await fetch(`/api/v1/onboarding/${onboardingId}/tasks/${taskId}/complete`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not complete task");
    setMessage("Task completed");
    setEmployee((current) =>
      current
        ? {
            ...current,
            onboardingInstances: current.onboardingInstances.map((instance) =>
              instance.id === onboardingId
                ? {
                    ...instance,
                    tasks: instance.tasks.map((task) =>
                      task.id === taskId ? { ...task, status: "COMPLETED" } : task,
                    ),
                  }
                : instance,
            ),
          }
        : current,
    );
  }
  const metrics = useMemo(() => {
    const tasks = employee?.onboardingInstances.flatMap((instance) => instance.tasks) || [];
    return {
      plans: employee?.onboardingInstances.length || 0,
      pending: tasks.filter((task) => task.status !== "COMPLETED").length,
      completed: tasks.filter((task) => task.status === "COMPLETED").length,
    };
  }, [employee]);
  if (!employee)
    return (
      <main className="page-shell">
        <section className="rounded-xl border border-border/80 bg-white p-6 shadow-sm dark:border-border dark:bg-background/80">
          <p
            role="status"
            className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground"
          >
            {message}
          </p>
        </section>
      </main>
    );
  const initials = `${employee.firstName[0] || ""}${employee.lastName[0] || ""}`.toUpperCase();
  return (
    <main className="page-shell space-y-6 pb-12">
      <section className="enterprise-hero relative overflow-hidden rounded-xl border border-primary/20 bg-card p-6 text-foreground shadow-sm md:p-8">
        <div className="relative z-10">
          <Link
            href="/hr/employees"
            className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-primary-ink transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Employee directory
          </Link>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-muted text-xl font-bold text-foreground shadow-lg ring-1 ring-white/20 backdrop-blur-md">
                {initials}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-ink">
                  Employee profile
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
                  {employee.firstName} {employee.lastName}
                </h1>
                <p className="mt-1 text-sm font-medium text-primary-ink/75">
                  {employee.employeeNo} · {employee.jobTitle}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide",
                statusStyles[employee.status] || statusStyles.INACTIVE,
              )}
            >
              {employee.status.replaceAll("_", " ")}
            </span>
            {employee.separationType && (
              <p className="mt-2 text-xs font-semibold text-muted-foreground">
                {employee.separationType === "FIRED" ? "Fired" : "Left company"}
                {employee.separatedAt
                  ? ` on ${new Date(employee.separatedAt).toLocaleDateString()}`
                  : ""}
                {employee.separationReason ? ` · ${employee.separationReason}` : ""}
              </p>
            )}
          </div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Employment status", employee.status.replaceAll("_", " "), UserRound, "indigo"],
          ["Onboarding plans", metrics.plans, BriefcaseBusiness, "emerald"],
          ["Tasks complete", metrics.completed, CheckCircle2, "blue"],
          ["Tasks remaining", metrics.pending, Clock3, "amber"],
        ].map(([label, value, Icon, color]) => {
          const MetricIcon = Icon as typeof UserRound;
          return (
            <div
              key={String(label)}
              className="rounded-2xl border border-border/80 bg-white p-5 shadow-sm dark:border-border dark:bg-background/80"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
                  {String(label)}
                </span>
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    color === "emerald"
                      ? "bg-success-light text-success-ink dark:bg-success-light/50 dark:text-success-ink"
                      : color === "blue"
                        ? "bg-info-light text-info-ink dark:bg-info-light/50 dark:text-info-ink"
                        : color === "amber"
                          ? "bg-warning-light text-warning-ink dark:bg-warning-light/50 dark:text-warning-ink"
                          : "bg-primary-light text-primary-ink dark:bg-primary-light/50 dark:text-primary-ink",
                  )}
                >
                  <MetricIcon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-bold tracking-tight text-foreground dark:text-white">
                {String(value)}
              </p>
            </div>
          );
        })}
      </section>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-border/80 bg-white p-6 shadow-sm dark:border-border dark:bg-background/80">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-ink dark:text-primary-ink">
            Employee information
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground dark:text-white">
            Personal and work details
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              [Mail, "Email", employee.email],
              [Phone, "Phone", employee.phone],
              [BriefcaseBusiness, "Department", employee.department || "Not provided"],
              [MapPin, "Location", employee.location || "Not provided"],
            ].map(([Icon, label, value]) => {
              const DetailIcon = Icon as typeof Mail;
              return (
                <div
                  key={String(label)}
                  className="flex items-start gap-3 rounded-2xl border border-border/70 bg-muted/70 p-4 dark:border-border dark:bg-background/30"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary-ink dark:bg-primary-light/60 dark:text-primary-ink">
                    <DetailIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
                      {String(label)}
                    </p>
                    <p className="mt-1 break-words text-sm font-bold text-foreground dark:text-muted-foreground">
                      {String(value)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="rounded-xl border border-border/80 bg-white p-6 shadow-sm dark:border-border dark:bg-background/80">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-success-ink dark:text-success-ink">
                Employee lifecycle
              </p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground dark:text-white">
                Onboarding
              </h2>
            </div>
            <Link
              href="/hr/onboarding"
              className="text-sm font-bold text-primary-ink hover:text-primary-ink dark:text-primary-ink"
            >
              View all
            </Link>
          </div>
          {employee.onboardingInstances.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-sm font-semibold text-muted-foreground dark:border-border dark:text-muted-foreground">
              No onboarding plan has been started.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {employee.onboardingInstances.map((instance) => (
                <div
                  key={instance.id}
                  className="rounded-2xl border border-border/80 bg-muted/70 p-4 dark:border-border dark:bg-background/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-foreground dark:text-white">
                        {instance.template.name}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground dark:text-muted-foreground">
                        {instance.tasks.filter((task) => task.status === "COMPLETED").length} of{" "}
                        {instance.tasks.length} tasks complete
                      </p>
                    </div>
                    <span className="rounded-full bg-success-light px-2.5 py-1 text-[10px] font-bold uppercase text-success-ink dark:bg-success-light/50 dark:text-success-ink">
                      {instance.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted dark:bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{
                        width: `${instance.tasks.length ? Math.round((instance.tasks.filter((task) => task.status === "COMPLETED").length / instance.tasks.length) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    {instance.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 dark:bg-background"
                      >
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            task.status === "COMPLETED"
                              ? "text-muted-foreground line-through"
                              : "text-muted-foreground dark:text-muted-foreground",
                          )}
                        >
                          {task.definition.title}
                        </span>
                        {task.status === "COMPLETED" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-success-ink" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => void complete(instance.id, task.id)}
                            className="shrink-0 rounded-lg bg-primary px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-primary"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Link
                    href={`/hr/onboarding/${instance.id}`}
                    className="mt-4 inline-flex text-sm font-bold text-primary-ink hover:text-primary-ink dark:text-primary-ink"
                  >
                    Open onboarding plan →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <section className="rounded-xl border border-border/80 bg-white p-6 shadow-sm dark:border-border dark:bg-background/80">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-ink dark:text-primary-ink">
          Activity timeline
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground dark:text-white">
          Employment history
        </h2>
        {employee.history.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-border p-6 text-sm font-semibold text-muted-foreground dark:border-border dark:text-muted-foreground">
            No employment history recorded.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {employee.history.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 rounded-2xl border border-border/70 p-4 dark:border-border"
              >
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary-ink dark:bg-primary-light/60 dark:text-primary-ink">
                  <Clock3 className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-semibold text-foreground dark:text-white">
                    {item.eventType.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                    {item.fromValue || "—"} <span className="px-1 text-primary-ink">→</span>{" "}
                    {item.toValue || "—"}
                  </p>
                  <time className="mt-2 block text-xs font-semibold text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </time>
                </div>
              </div>
            ))}
          </div>
        )}
        {message && (
          <p
            role="status"
            className="mt-4 text-sm font-semibold text-success-ink dark:text-success-ink"
          >
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
