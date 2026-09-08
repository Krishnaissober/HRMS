import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, LayoutDashboard } from "lucide-react";
import { DashboardWavyBackground } from "@/components/layout/dashboard-wavy-background";

export type PhaseDashboardCard = {
  label: string;
  description: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
};

export function PhaseDashboard({
  eyebrow,
  title,
  description,
  cards,
}: {
  eyebrow: string;
  title: string;
  description: string;
  cards: PhaseDashboardCard[];
}) {
  return (
    <main className="page-shell space-y-6 pb-12">
      <section className="prism-light relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-2xl md:p-8">
        <DashboardWavyBackground />
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/3 h-52 w-52 rounded-full bg-purple-500/20 blur-3xl" />
        <div className="relative z-10 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-indigo-200 backdrop-blur-md">
            <LayoutDashboard className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-300">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight md:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-indigo-100/75 md:text-base">
              {description}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Phase workspace
          </p>
          <h2 className="mt-1 text-xl font-extrabold text-foreground">Choose what to manage</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ label, description: cardDescription, href, icon: Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 transition-all duration-200 hover:-translate-y-1 hover:border-indigo-500/40 hover:bg-card hover:shadow-md"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${tone}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-extrabold text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {label}
                </span>
                <span className="mt-1 block text-xs font-medium text-muted-foreground">
                  {cardDescription}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-indigo-600" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
