"use client";
import { useEffect, useState } from "react";
type Request = {
  id: string;
  status: string;
  approvalStep: string;
  startDate: string;
  endDate: string;
  durationDays: string;
  reason: string;
  employee: { employeeNo: string; firstName: string; lastName: string };
  leaveType: { name: string };
};
type LeaveType = { id: string; name: string };
type Employee = { id: string; employeeNo: string; firstName: string; lastName: string };
export default function LeaveManagePage() {
  const [organizationId, setOrganizationId] = useState("");
  const [requests, setRequests] = useState<Request[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [allocationDays, setAllocationDays] = useState(0);
  const [approvalPolicy, setApprovalPolicy] = useState("HR");
  const [accrual, setAccrual] = useState("NONE");
  const [carry, setCarry] = useState(false);
  const [carryLimit, setCarryLimit] = useState(0);
  const [employmentTypes, setEmploymentTypes] = useState("");
  const [departments, setDepartments] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [year, setYear] = useState(new Date().getUTCFullYear());
  const [days, setDays] = useState(0);
  async function load(tenant = organizationId) {
    if (!tenant) return;
    const h = { "x-organization-id": tenant };
    const [r, t, e] = await Promise.all([
      fetch("/api/v1/leave-requests?page=1&pageSize=100", { headers: h }),
      fetch("/api/v1/leave-types?all=true", { headers: h }),
      fetch("/api/v1/employees?page=1&pageSize=100", { headers: h }),
    ]);
    const rr = await r.json(),
      tt = await t.json(),
      ee = await e.json();
    if (r.ok) setRequests(rr.data.items);
    else setMessage(rr.error?.message || "Could not load requests");
    if (t.ok) {
      setTypes(tt.data);
      setLeaveTypeId((v) => v || tt.data[0]?.id || "");
    }
    if (e.ok) {
      const items = ee.data.items || ee.data;
      setEmployees(items);
      setEmployeeId((v) => v || items[0]?.id || "");
    }
  }
  async function createPolicy(event: React.FormEvent) {
    event.preventDefault();
    const eligibility = {
      ...(employmentTypes
        ? {
            employmentTypes: employmentTypes
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
          }
        : {}),
      ...(departments
        ? {
            departments: departments
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
          }
        : {}),
    };
    const response = await fetch("/api/v1/leave-types", {
      method: "POST",
      headers: { "content-type": "application/json", "x-organization-id": organizationId },
      body: JSON.stringify({
        name,
        code,
        allocationDays,
        approvalPolicy,
        accrualPolicy: { frequency: accrual },
        carryForwardEnabled: carry,
        maxCarryForwardDays: carry ? carryLimit : null,
        eligibility: Object.keys(eligibility).length ? eligibility : null,
      }),
    });
    const result = await response.json();
    setMessage(
      response.ok ? "Leave policy created" : result.error?.message || "Could not create policy",
    );
    if (response.ok) await load();
  }
  async function allocate(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/v1/leave-balances", {
      method: "POST",
      headers: { "content-type": "application/json", "x-organization-id": organizationId },
      body: JSON.stringify({ employeeId, leaveTypeId, periodYear: year, allocatedDays: days }),
    });
    const result = await response.json();
    setMessage(
      response.ok ? "Leave balance saved" : result.error?.message || "Could not save balance",
    );
  }
  async function carryForward() {
    const response = await fetch("/api/v1/leave-balances/carry-forward", {
      method: "POST",
      headers: { "content-type": "application/json", "x-organization-id": organizationId },
      body: JSON.stringify({ employeeId, leaveTypeId, fromYear: year, toYear: year + 1 }),
    });
    const result = await response.json();
    setMessage(
      response.ok ? "Carry-forward applied" : result.error?.message || "Could not carry forward",
    );
  }
  async function decide(id: string, decision: "APPROVED" | "REJECTED") {
    const reason = decision === "REJECTED" ? window.prompt("Rejection reason") || "" : "Approved";
    if (decision === "REJECTED" && !reason) return;
    const response = await fetch(`/api/v1/leave-requests/${id}/decision`, {
      method: "PATCH",
      headers: { "content-type": "application/json", "x-organization-id": organizationId },
      body: JSON.stringify({ decision, reason }),
    });
    const result = await response.json();
    setMessage(
      response.ok
        ? `Leave ${decision.toLowerCase()}`
        : result.error?.message || "Could not decide leave",
    );
    if (response.ok) await load();
  }
  useEffect(() => {
    const tenant = new URLSearchParams(window.location.search).get("organizationId") || "";
    setOrganizationId(tenant);
    if (tenant) void load(tenant); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <main className="page-shell">
      <section className="panel">
        <p className="eyebrow">Manager / HR</p>
        <h1>Leave management</h1>
        <div className="toolbar">
          <input
            aria-label="Organization ID"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
          />
          <button type="button" onClick={() => void load()}>
            Refresh
          </button>
          <a href={`/hr/leave/calendar?organizationId=${encodeURIComponent(organizationId)}`}>
            Leave calendar
          </a>
        </div>
        {message && <p role="status">{message}</p>}
        <h2>Configure leave policy</h2>
        <form className="form-grid" onSubmit={createPolicy}>
          <label>
            Name
            <input required value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            Code
            <input required value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <label>
            Default allocation
            <input
              type="number"
              min="0"
              step="0.5"
              value={allocationDays}
              onChange={(e) => setAllocationDays(Number(e.target.value))}
            />
          </label>
          <label>
            Approval policy
            <select value={approvalPolicy} onChange={(e) => setApprovalPolicy(e.target.value)}>
              <option value="HR">HR</option>
              <option value="MANAGER">Manager</option>
              <option value="MANAGER_THEN_HR">Manager then HR</option>
            </select>
          </label>
          <label>
            Accrual
            <select value={accrual} onChange={(e) => setAccrual(e.target.value)}>
              <option value="NONE">None</option>
              <option value="YEARLY">Yearly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
          </label>
          <label>
            Employment types
            <input
              value={employmentTypes}
              onChange={(e) => setEmploymentTypes(e.target.value)}
              placeholder="Comma separated"
            />
          </label>
          <label>
            Departments
            <input
              value={departments}
              onChange={(e) => setDepartments(e.target.value)}
              placeholder="Comma separated"
            />
          </label>
          <label>
            <input type="checkbox" checked={carry} onChange={(e) => setCarry(e.target.checked)} />{" "}
            Enable carry-forward
          </label>
          {carry && (
            <label>
              Carry-forward limit
              <input
                type="number"
                min="0"
                step="0.5"
                value={carryLimit}
                onChange={(e) => setCarryLimit(Number(e.target.value))}
              />
            </label>
          )}
          <button type="submit">Create leave policy</button>
        </form>
        <h2>Manage balance</h2>
        <form className="form-grid" onSubmit={allocate}>
          <label>
            Employee
            <select required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.employeeNo} · {e.firstName} {e.lastName}
                </option>
              ))}
            </select>
          </label>
          <label>
            Leave type
            <select required value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Year
            <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
          </label>
          <label>
            Allocated days
            <input
              type="number"
              min="0"
              step="0.5"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            />
          </label>
          <button type="submit">Save balance</button>
          <button type="button" onClick={() => void carryForward()}>
            Carry forward
          </button>
        </form>
        <h2>Approval queue</h2>
        <div className="candidate-list">
          {requests.map((r) => (
            <article className="candidate-row" key={r.id}>
              <span>
                {r.employee.employeeNo} · {r.employee.firstName} {r.employee.lastName}
              </span>
              <span>
                {r.leaveType.name} · {r.startDate.slice(0, 10)} to {r.endDate.slice(0, 10)} ·{" "}
                {r.durationDays} day(s)
              </span>
              <span>
                {r.status} · {r.approvalStep}
              </span>
              <span>
                {r.reason}
                {r.status === "PENDING" && (
                  <>
                    <button type="button" onClick={() => void decide(r.id, "APPROVED")}>
                      Approve
                    </button>
                    <button type="button" onClick={() => void decide(r.id, "REJECTED")}>
                      Reject
                    </button>
                  </>
                )}
              </span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
