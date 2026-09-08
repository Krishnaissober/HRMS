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
  ACTIVE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
  INACTIVE: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  ON_LEAVE: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300",
  TERMINATED: "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300",
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
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <p role="status" className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {message}
          </p>
        </section>
      </main>
    );
  const initials = `${employee.firstName[0] || ""}${employee.lastName[0] || ""}`.toUpperCase();
  return (
    <main className="page-shell space-y-6 pb-12">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative z-10">
          <Link
            href="/hr/employees"
            className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-indigo-200 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Employee directory
          </Link>
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-black text-white shadow-lg ring-1 ring-white/20 backdrop-blur-md">
                {initials}
              </div>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-300">
                  Employee profile
                </p>
                <h1 className="mt-1 text-3xl font-black tracking-tight md:text-4xl">
                  {employee.firstName} {employee.lastName}
                </h1>
                <p className="mt-1 text-sm font-medium text-indigo-100/75">
                  {employee.employeeNo} · {employee.jobTitle}
                </p>
              </div>
            </div>
            <span
              className={cn(
                "inline-flex w-fit items-center rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide",
                statusStyles[employee.status] || statusStyles.INACTIVE,
              )}
            >
              {employee.status.replaceAll("_", " ")}
            </span>
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
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {String(label)}
                </span>
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    color === "emerald"
                      ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : color === "blue"
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300"
                        : color === "amber"
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-300"
                          : "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300",
                  )}
                >
                  <MetricIcon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                {String(value)}
              </p>
            </div>
          );
        })}
      </section>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
            Employee information
          </p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
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
                  className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                    <DetailIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {String(label)}
                    </p>
                    <p className="mt-1 break-words text-sm font-bold text-slate-800 dark:text-slate-200">
                      {String(value)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-300">
                Employee lifecycle
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
                Onboarding
              </h2>
            </div>
            <Link
              href="/hr/onboarding"
              className="text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300"
            >
              View all
            </Link>
          </div>
          {employee.onboardingInstances.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
              No onboarding plan has been started.
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {employee.onboardingInstances.map((instance) => (
                <div
                  key={instance.id}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white">
                        {instance.template.name}
                      </h3>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {instance.tasks.filter((task) => task.status === "COMPLETED").length} of{" "}
                        {instance.tasks.length} tasks complete
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                      {instance.status.replaceAll("_", " ")}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500"
                      style={{
                        width: `${instance.tasks.length ? Math.round((instance.tasks.filter((task) => task.status === "COMPLETED").length / instance.tasks.length) * 100) : 0}%`,
                      }}
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    {instance.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2.5 dark:bg-slate-900"
                      >
                        <span
                          className={cn(
                            "text-sm font-semibold",
                            task.status === "COMPLETED"
                              ? "text-slate-400 line-through"
                              : "text-slate-700 dark:text-slate-200",
                          )}
                        >
                          {task.definition.title}
                        </span>
                        {task.status === "COMPLETED" ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => void complete(instance.id, task.id)}
                            className="shrink-0 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-indigo-700"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <Link
                    href={`/hr/onboarding/${instance.id}`}
                    className="mt-4 inline-flex text-sm font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-300"
                  >
                    Open onboarding plan →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-600 dark:text-indigo-300">
          Activity timeline
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">
          Employment history
        </h2>
        {employee.history.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No employment history recorded.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {employee.history.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 rounded-2xl border border-slate-200/70 p-4 dark:border-slate-800"
              >
                <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <Clock3 className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-extrabold text-slate-900 dark:text-white">
                    {item.eventType.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
                    {item.fromValue || "—"} <span className="px-1 text-indigo-400">→</span>{" "}
                    {item.toValue || "—"}
                  </p>
                  <time className="mt-2 block text-xs font-semibold text-slate-400">
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
            className="mt-4 text-sm font-semibold text-emerald-600 dark:text-emerald-300"
          >
            {message}
          </p>
        )}
      </section>
    </main>
  );
}
