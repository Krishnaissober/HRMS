"use client";
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
type Payslip = {
  id: string;
  currency: string;
  netAmount: string;
  payrollRun: { periodStart: string; periodEnd: string };
};
type Expense = {
  id: string;
  category: string;
  amount: string;
  currency: string;
  approvalStatus: string;
  paymentStatus: string;
};
export default function MyPayroll() {
  const [organizationId, setOrganizationId] = useState("");
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  async function load(org = organizationId) {
    if (!org) return;
    const h = { "x-organization-id": org };
    const [p, e] = await Promise.all([
      fetch("/api/v1/me/payslips", { headers: h }),
      fetch("/api/v1/me/expenses", { headers: h }),
    ]);
    const pb = await p.json(),
      eb = await e.json();
    if (p.ok) setPayslips(pb.data);
    if (e.ok) setExpenses(eb.data);
  }
  useEffect(() => {
    const org = new URLSearchParams(location.search).get("organizationId") || "";
    setOrganizationId(org);
    void load(org);
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    try {
      const h = { "content-type": "application/json", "x-organization-id": organizationId };
      const u = await fetch("/api/v1/expenses/upload-url", {
        method: "POST",
        headers: h,
        body: JSON.stringify({ fileName: file.name, contentType: file.type, byteSize: file.size }),
      });
      const ub = await u.json();
      if (!u.ok) throw new Error(ub.error?.message);
      const put = await fetch(ub.data.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.type },
        body: file,
      });
      if (!put.ok) throw new Error("Receipt upload failed");
      const r = await fetch("/api/v1/expenses", {
        method: "POST",
        headers: h,
        body: JSON.stringify({
          category,
          amount: Number(amount),
          currency: "USD",
          expenseDate: new Date().toISOString().slice(0, 10),
          notes,
          receiptObjectKey: ub.data.objectKey,
          receiptFileName: file.name,
          receiptContentType: file.type,
          receiptByteSize: file.size,
        }),
      });
      const rb = await r.json();
      if (!r.ok) throw new Error(rb.error?.message);
      setMessage("Expense submitted");
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Submission failed");
    }
  }
  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">Employee self-service</p>
        <h1>My payroll and expenses</h1>
        {message && <p role="status">{message}</p>}
        <h2>Payslips</h2>
        <div className="candidate-list">
          {payslips.map((p) => (
            <a
              className="candidate-row"
              key={p.id}
              href={`/api/v1/me/payslips/${p.id}/download?organizationId=${encodeURIComponent(organizationId)}`}
            >
              <span>
                {p.payrollRun.periodStart.slice(0, 10)}–{p.payrollRun.periodEnd.slice(0, 10)}
              </span>
              <span>
                {p.currency} {p.netAmount}
              </span>
              <span>Download PDF</span>
            </a>
          ))}
        </div>
        <h2>Submit expense</h2>
        <form className="form-grid" onSubmit={submit}>
          <label>
            Category
            <input required value={category} onChange={(e) => setCategory(e.target.value)} />
          </label>
          <label>
            Amount
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <label>
            Notes
            <textarea required value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <label>
            Receipt
            <input
              required
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          <button type="submit">Submit expense</button>
        </form>
        <h2>Expense history</h2>
        <div className="candidate-list">
          {expenses.map((e) => (
            <a
              className="candidate-row"
              key={e.id}
              href={`/api/v1/me/expenses/${e.id}/receipt?organizationId=${encodeURIComponent(organizationId)}`}
            >
              <span>{e.category}</span>
              <span>
                {e.currency} {e.amount}
              </span>
              <span>
                {e.approvalStatus} · {e.paymentStatus}
              </span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
