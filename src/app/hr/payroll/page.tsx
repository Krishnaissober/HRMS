"use client";
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
type Run = {
  id: string;
  status: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  netTotal: string;
  results: Array<{
    id: string;
    employee: { firstName: string; lastName: string };
    netAmount: string;
  }>;
};
type Expense = {
  id: string;
  category: string;
  amount: string;
  currency: string;
  approvalStatus: string;
  paymentStatus: string;
  employee: { firstName: string; lastName: string };
};
export default function PayrollPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [runs, setRuns] = useState<Run[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [message, setMessage] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  async function api(path: string, init?: RequestInit) {
    const response = await fetch(path, {
      ...init,
      headers: {
        "content-type": "application/json",
        "x-organization-id": organizationId,
        ...init?.headers,
      },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || "Request failed");
    return body.data;
  }
  async function load(org = organizationId) {
    if (!org) return;
    try {
      const headers = { "x-organization-id": org };
      const [r, e] = await Promise.all([
        fetch("/api/v1/payroll-runs", { headers }),
        fetch("/api/v1/expenses", { headers }),
      ]);
      const rb = await r.json(),
        eb = await e.json();
      if (!r.ok) throw new Error(rb.error?.message);
      if (!e.ok) throw new Error(eb.error?.message);
      setRuns(rb.data);
      setExpenses(eb.data);
      setMessage("");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load payroll");
    }
  }
  useEffect(() => {
    const org = new URLSearchParams(location.search).get("organizationId") || "";
    setOrganizationId(org);
    void load(org);
  }, []);
  async function salary() {
    try {
      await api("/api/v1/salary-structures", {
        method: "POST",
        body: JSON.stringify({ employeeId, currency: "USD", basicSalary: 5000, components: [] }),
      });
      setMessage("Salary structure saved");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    }
  }
  async function run() {
    try {
      await api("/api/v1/payroll-runs", {
        method: "POST",
        body: JSON.stringify({ periodStart, periodEnd, currency: "USD" }),
      });
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    }
  }
  async function transition(id: string, status: string) {
    try {
      await api(`/api/v1/payroll-runs/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Failed");
    }
  }
  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">Payroll and expenses</p>
        <h1>Payroll workspace</h1>
        <div className="toolbar">
          <input
            aria-label="Organization ID"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
          />
          <button onClick={() => void load()}>Refresh</button>
        </div>
        {message && <p role="status">{message}</p>}
        <h2>Salary structure</h2>
        <div className="form-grid">
          <label>
            Employee ID
            <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
          </label>
          <button onClick={() => void salary()}>Save standard structure</button>
        </div>
        <h2>Payroll run</h2>
        <div className="form-grid">
          <label>
            Start
            <input
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </label>
          <label>
            End
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </label>
          <button onClick={() => void run()}>Create run</button>
        </div>
        <div className="candidate-list">
          {runs.map((r) => (
            <article className="candidate-row" key={r.id}>
              <span>
                {r.periodStart.slice(0, 10)}–{r.periodEnd.slice(0, 10)}
              </span>
              <span>{r.status}</span>
              <span>
                {r.currency} {r.netTotal}
              </span>
              <span>
                {r.status === "DRAFT" && (
                  <button onClick={() => void transition(r.id, "PREPARED")}>Prepare</button>
                )}
                {r.status === "PREPARED" && (
                  <button onClick={() => void transition(r.id, "REVIEWED")}>Review</button>
                )}
                {r.status === "REVIEWED" && (
                  <button onClick={() => void transition(r.id, "APPROVED")}>Approve</button>
                )}
              </span>
            </article>
          ))}
        </div>
        <h2>Expense approvals</h2>
        <div className="candidate-list">
          {expenses.map((e) => (
            <article className="candidate-row" key={e.id}>
              <span>
                {e.employee.firstName} {e.employee.lastName}
              </span>
              <span>{e.category}</span>
              <span>
                {e.currency} {e.amount}
              </span>
              <span>
                {e.approvalStatus} · {e.paymentStatus}
              </span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
