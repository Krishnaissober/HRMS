"use client";

import { useEffect, useState } from "react";
import { Clock, Plus, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Shift = { id: string; name: string; startTime: string; endTime: string; timezone: string; gracePeriodMinutes: number };

export default function ShiftsPage() {
  const [items, setItems] = useState<Shift[]>([]);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("Loading shifts…");

  async function load() {
    const response = await fetch("/api/v1/shifts");
    const result = await response.json();
    if (response.ok) { setItems(result.data); setMessage(""); }
    else setMessage(result.error?.message || "Could not load shifts");
  }

  async function create(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/v1/shifts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, startTime: "09:00", endTime: "17:00", timezone: "UTC", gracePeriodMinutes: 15, weeklyOffs: [0, 6] }) });
    const result = await response.json();
    setMessage(response.ok ? "Shift created" : result.error?.message || "Could not create shift");
    if (response.ok) { setName(""); await load(); }
  }

  useEffect(() => { void load(); }, []);

  const isLoading = message.startsWith("Loading");

  return (
    <main className="page-shell space-y-6 pb-12">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white shadow-2xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-16 h-48 w-48 rounded-full bg-purple-500/15 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-indigo-300">Shifts &amp; Rosters</p>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Shift Management</h1>
            <p className="text-sm text-indigo-100/75 font-medium max-w-lg">Define work shifts, set grace periods, and manage weekly schedules.</p>
          </div>
          <button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2.5 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-all active:scale-95 shrink-0 self-start">
            <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            Refresh
          </button>
        </div>
      </section>

      {/* Feedback */}
      {message && (
        <div className={cn("rounded-2xl px-4 py-3 text-sm font-semibold flex items-center gap-2 border",
          isLoading ? "bg-muted/60 text-muted-foreground border-border/40 animate-pulse" :
          message === "Shift created" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60" :
          "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200/60"
        )}>
          {isLoading && <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />}
          {message}
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Create Shift Form */}
        <section className="lg:col-span-2 rounded-3xl border border-border/60 bg-card p-6 shadow-sm space-y-5">
          <div className="border-b border-border/50 pb-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">New Shift</p>
            <h2 className="text-lg font-extrabold text-foreground">Create Standard Shift</h2>
          </div>
          <form className="space-y-4" onSubmit={create}>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">Shift Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Morning Shift, Night Shift…"
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors"
              />
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Default Settings</p>
              <div className="grid grid-cols-2 gap-2 text-xs font-medium text-muted-foreground">
                <div>🕘 09:00 – 17:00</div>
                <div>🌐 UTC timezone</div>
                <div>⏱ 15 min grace</div>
                <div>📅 Sat, Sun off</div>
              </div>
            </div>
            <button type="submit" className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 text-sm font-bold text-white transition-colors">
              <Plus className="h-4 w-4" />
              Create Shift
            </button>
          </form>
        </section>

        {/* Shifts List */}
        <section className="lg:col-span-3 rounded-3xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/50 px-6 py-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Active Schedules</p>
              <h2 className="text-lg font-extrabold text-foreground">All Shifts</h2>
            </div>
            <span className="text-sm font-black text-foreground">{items.length}</span>
          </div>
          <div className="p-6 space-y-2.5">
            {!isLoading && items.length === 0 && (
              <div className="rounded-2xl border border-border/40 bg-muted/30 p-8 text-center">
                <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-semibold text-muted-foreground">No shifts defined yet. Create one to get started.</p>
              </div>
            )}
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-border/50 bg-background/60 p-4 transition-all hover:border-indigo-500/40 hover:bg-card hover:shadow-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block font-extrabold text-sm text-foreground">{item.name}</span>
                  <span className="block text-xs text-muted-foreground font-medium">{item.startTime} – {item.endTime} · {item.timezone}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="block text-xs font-bold text-foreground">Grace: {item.gracePeriodMinutes}m</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
