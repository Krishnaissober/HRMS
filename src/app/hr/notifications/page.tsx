"use client";
import { useEffect, useState } from "react";
type N = { id: string; title: string; body: string; readAt: string | null };
type T = { id: string; title: string; dueAt: string | null; priority: string };
export default function Center() {
  const [notes, setNotes] = useState<N[]>([]);
  const [tasks, setTasks] = useState<T[]>([]);
  const [message, setMessage] = useState("Loading notifications…");
  async function load() {
    const [n, t] = await Promise.all([
      fetch("/api/v1/notifications?page=1&pageSize=100"),
      fetch("/api/v1/tasks"),
    ]);
    if (n.ok) setNotes((await n.json()).data.items);
    if (t.ok) setTasks((await t.json()).data);
    setMessage(n.ok && t.ok ? "" : "Could not load notifications");
  }
  async function read(id: string) {
    await fetch(`/api/v1/notifications/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ read: true }),
    });
    await load();
  }
  async function done(id: string) {
    await fetch(`/api/v1/tasks/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "COMPLETED" }),
    });
    await load();
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">Action center</p>
        <h1>Notifications and tasks</h1>
        <button type="button" onClick={() => void load()}>
          Refresh
        </button>
        {message && <p role="status">{message}</p>}
        <h2>Notifications</h2>
        <div className="candidate-list">
          {notes.map((n) => (
            <article className="candidate-row" key={n.id}>
              <span>{n.title}</span>
              <span>{n.body}</span>
              <span>
                {n.readAt ? (
                  "Read"
                ) : (
                  <button type="button" onClick={() => void read(n.id)}>
                    Mark read
                  </button>
                )}
              </span>
            </article>
          ))}
        </div>
        <h2>My tasks</h2>
        <div className="candidate-list">
          {tasks.map((t) => (
            <article className="candidate-row" key={t.id}>
              <span>{t.title}</span>
              <span>
                {t.priority} · {t.dueAt?.slice(0, 10) || "No due date"}
              </span>
              <button type="button" onClick={() => void done(t.id)}>
                Complete
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
