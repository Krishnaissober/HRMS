export default function HrLoading() {
  return (
    <main className="page-shell space-y-6 pb-12" aria-label="Loading HR workspace">
      <section className="h-48 animate-pulse rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 shadow-2xl" />
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-border/60 bg-card shadow-sm"
          />
        ))}
      </section>
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="h-[28rem] animate-pulse rounded-3xl border border-border/60 bg-card lg:col-span-8" />
        <div className="h-[28rem] animate-pulse rounded-3xl border border-border/60 bg-card lg:col-span-4" />
      </section>
    </main>
  );
}
