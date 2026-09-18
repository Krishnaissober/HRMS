import Link from "next/link";
import type { ComponentType } from "react";
import { ArrowRight, LayoutDashboard } from "lucide-react";

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
      <section className="enterprise-hero">
        <div className="relative z-10 flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-primary-light text-primary-ink">
            <LayoutDashboard className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-ink">
              {eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium text-primary-ink/75 md:text-base">
              {description}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary-ink dark:text-primary-ink">
            Phase workspace
          </p>
          <h2 className="mt-1 text-xl font-semibold text-foreground">Choose what to manage</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ label, description: cardDescription, href, icon: Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 transition-all duration-200 hover:-translate-y-px hover:border-primary/40 hover:bg-card hover:shadow-md"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm ${tone}`}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-foreground group-hover:text-primary-ink dark:group-hover:text-primary-ink">
                  {label}
                </span>
                <span className="mt-1 block text-xs font-medium text-muted-foreground">
                  {cardDescription}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary-ink" />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
