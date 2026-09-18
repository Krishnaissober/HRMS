"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BriefcaseBusiness,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from "lucide-react";

type Candidate = {
  referenceNo: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: string;
  source: string;
  roleOfInterest: string;
  experience?: string | null;
  skills?: string | null;
  education?: string | null;
  currentCompany?: string | null;
  employmentHistory?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  applications: Array<{ referenceNo: string; status: string; requisition: { title: string } }>;
};

const valueOrFallback = (value?: string | null) => value?.trim() || "Not provided";
function educationSummary(value?: string | null) {
  if (!value?.trim()) return "Not provided";
  try {
    const details = JSON.parse(value) as Record<string, string>;
    const rows = [
      ["10th", details.tenthInstitution, details.tenthScore],
      ["12th", details.twelfthInstitution, details.twelfthScore],
      ["College", details.collegeName, details.collegeScore],
    ].filter(([, name, score]) => name || score);
    return rows.length
      ? rows
          .map(([level, name, score]) => `${level}: ${[name, score].filter(Boolean).join(" · ")}`)
          .join("  |  ")
      : value;
  } catch {
    return value;
  }
}

export default function SelectedEmployeePreview({ params }: { params: Promise<{ id: string }> }) {
  const [employee, setEmployee] = useState<Candidate | null>(null);
  const [message, setMessage] = useState("Loading employee details…");
  useEffect(() => {
    void (async () => {
      const { id } = await params;
      const response = await fetch(`/api/v1/candidates/${id}`);
      const result = await response.json();
      if (!response.ok)
        return setMessage(result.error?.message || "Could not load employee details");
      if (result.data.status !== "SELECTED")
        return setMessage("This record is no longer a selected employee");
      setEmployee(result.data);
      setMessage("");
    })();
  }, [params]);
  const initials = useMemo(
    () =>
      employee ? `${employee.firstName[0] || ""}${employee.lastName[0] || ""}`.toUpperCase() : "",
    [employee],
  );
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
  const address = [employee.addressLine1, employee.addressLine2].filter(Boolean).join(", ");
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
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-xl font-bold ring-1 ring-white/20 backdrop-blur-md">
                {initials}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-ink">
                  Selected hire · employee preview
                </p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight md:text-4xl">
                  {employee.firstName} {employee.lastName}
                </h1>
                <p className="mt-1 text-sm font-medium text-primary-ink/75">
                  {employee.referenceNo} · {employee.roleOfInterest || "Position not provided"}
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center rounded-full bg-success-light px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-success-ink">
              Employee
            </span>
          </div>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [UserRound, "Source", employee.source === "WALK_IN" ? "Walk-in" : "Online"],
          [BriefcaseBusiness, "Position", valueOrFallback(employee.roleOfInterest)],
          [GraduationCap, "Education", educationSummary(employee.education)],
          [FileText, "Applications", employee.applications.length],
        ].map(([Icon, label, value]) => {
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
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-light text-primary-ink dark:bg-primary-light/50 dark:text-primary-ink">
                  <MetricIcon className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-3 truncate text-lg font-bold tracking-tight text-foreground dark:text-white">
                {String(value)}
              </p>
            </div>
          );
        })}
      </section>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-xl border border-border/80 bg-white p-6 shadow-sm dark:border-border dark:bg-background/80">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-ink dark:text-primary-ink">
            Candidate information
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground dark:text-white">
            Personal and professional details
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              [Mail, "Email", employee.email],
              [Phone, "Phone", employee.phone],
              [BriefcaseBusiness, "Current company", valueOrFallback(employee.currentCompany)],
              [GraduationCap, "Experience", valueOrFallback(employee.experience)],
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
          <div className="mt-4 rounded-2xl border border-border/70 bg-muted/70 p-4 dark:border-border dark:bg-background/30">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground">
              Skills
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-muted-foreground dark:text-muted-foreground">
              {valueOrFallback(employee.skills)}
            </p>
          </div>
        </section>
        <section className="rounded-xl border border-border/80 bg-white p-6 shadow-sm dark:border-border dark:bg-background/80">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-success-ink dark:text-success-ink">
            Contact location
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground dark:text-white">
            Address
          </h2>
          <div className="mt-6 flex gap-3 rounded-2xl border border-border/70 bg-muted/70 p-4 dark:border-border dark:bg-background/30">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success-light text-success-ink dark:bg-success-light/60 dark:text-success-ink">
              <MapPin className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-bold text-foreground dark:text-muted-foreground">
                {valueOrFallback(address)}
              </p>
              <p className="mt-2 text-sm font-semibold text-muted-foreground dark:text-muted-foreground">
                {valueOrFallback(employee.city)} · {valueOrFallback(employee.state)}
              </p>
              <p className="mt-1 text-sm font-semibold text-muted-foreground dark:text-muted-foreground">
                Postal code: {valueOrFallback(employee.postalCode)}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-primary bg-primary-light/70 p-4 dark:border-primary dark:bg-primary-light/30">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink dark:text-primary-ink">
              Employment history
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm font-semibold leading-6 text-muted-foreground dark:text-muted-foreground">
              {valueOrFallback(employee.employmentHistory)}
            </p>
          </div>
        </section>
      </div>
      <section className="rounded-xl border border-border/80 bg-white p-6 shadow-sm dark:border-border dark:bg-background/80">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-ink dark:text-primary-ink">
              Hiring record
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground dark:text-white">
              Applications
            </h2>
          </div>
          <span className="rounded-xl bg-primary-light px-3 py-1.5 text-xs font-bold text-primary-ink dark:bg-primary-light/50 dark:text-primary-ink">
            {employee.applications.length} total
          </span>
        </div>
        {employee.applications.length === 0 ? (
          <p className="mt-5 rounded-2xl border border-dashed border-border p-6 text-sm font-semibold text-muted-foreground dark:border-border dark:text-muted-foreground">
            No applications recorded.
          </p>
        ) : (
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {employee.applications.map((application) => (
              <div
                key={application.referenceNo}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/70 p-4 dark:border-border dark:bg-background/30"
              >
                <div>
                  <p className="font-semibold text-foreground dark:text-white">
                    {application.requisition.title}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground dark:text-muted-foreground">
                    {application.referenceNo}
                  </p>
                </div>
                <span className="rounded-full bg-success-light px-2.5 py-1 text-[10px] font-bold uppercase text-success-ink dark:bg-success-light/50 dark:text-success-ink">
                  {application.status.replaceAll("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
