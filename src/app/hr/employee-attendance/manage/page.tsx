"use client";

import { useEffect, useMemo, useState } from "react";
import { EMPLOYEE_ATTENDANCE_STATUSES } from "@/modules/employee-attendance/constants";

type View = "day" | "week" | "month";
type RecordItem = {
  id: string;
  workDate: string;
  status: string;
  durationMinutes: number | null;
  exceptionType: string | null;
  employee: { id: string; employeeNo: string; firstName: string; lastName: string };
  shift: { name: string; startTime: string; endTime: string; timezone: string } | null;
};
type CalendarDay = { date: string; attendance: RecordItem[]; holidays: { id: string; name: string }[] };
type CalendarResponse = { view: View; selectedDate: string; from: string; to: string; days: CalendarDay[] };

function today() { return new Date().toISOString().slice(0, 10); }
function moveDate(value: string, view: View, direction: -1 | 1) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (view === "day") date.setUTCDate(date.getUTCDate() + direction);
  if (view === "week") date.setUTCDate(date.getUTCDate() + direction * 7);
  if (view === "month") date.setUTCMonth(date.getUTCMonth() + direction);
  return date.toISOString().slice(0, 10);
}

export default function EmployeeAttendanceManagePage() {
  const [organizationId, setOrganizationId] = useState("");
  const [view, setView] = useState<View>("month");
  const [selectedDate, setSelectedDate] = useState(today());
  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState("");
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [message, setMessage] = useState("Loading attendance calendar…");

  async function load(overrides?: { organizationId?: string; view?: View; date?: string }) {
    const tenant = overrides?.organizationId ?? organizationId;
    if (!tenant) return setMessage("Select an organization to load attendance.");
    const params = new URLSearchParams({ view: overrides?.view ?? view, date: overrides?.date ?? selectedDate });
    if (employeeId.trim()) params.set("employeeId", employeeId.trim());
    if (status) params.set("status", status);
    const response = await fetch(`/api/v1/attendance/employee/calendar?${params}`, { headers: { "x-organization-id": tenant } });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message || "Could not load attendance calendar");
    setCalendar(result.data);
    setMessage("");
  }

  function changeView(next: View) { setView(next); void load({ view: next }); }
  function navigate(direction: -1 | 1) { const next = moveDate(selectedDate, view, direction); setSelectedDate(next); void load({ date: next }); }
  const title = useMemo(() => calendar ? `${calendar.from} to ${calendar.to}` : selectedDate, [calendar, selectedDate]);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("organizationId") || "";
    setOrganizationId(value);
    if (value) void load({ organizationId: value });
    // Initial tenant context is derived once from the current route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <main className="page-shell"><section className="panel">
    <p className="eyebrow">HR operations</p>
    <h1>Attendance calendar</h1>
    <div className="toolbar" aria-label="Attendance calendar controls">
      <input aria-label="Organization ID" placeholder="Organization ID" value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} />
      {(["day", "week", "month"] as View[]).map((option) => <button key={option} type="button" aria-pressed={view === option} onClick={() => changeView(option)}>{option[0].toUpperCase() + option.slice(1)}</button>)}
      <button type="button" onClick={() => navigate(-1)} aria-label="Previous period">Previous</button>
      <input aria-label="Calendar date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} />
      <button type="button" onClick={() => navigate(1)} aria-label="Next period">Next</button>
    </div>
    <div className="toolbar">
      <input aria-label="Employee filter" placeholder="Employee ID" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} />
      <select aria-label="Status filter" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option>{EMPLOYEE_ATTENDANCE_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}</select>
      <button type="button" onClick={() => void load()}>Apply filters</button>
      <a href={`/hr/shifts?organizationId=${encodeURIComponent(organizationId)}`}>Shifts and rosters</a>
      <a href={`/hr/holidays?organizationId=${encodeURIComponent(organizationId)}`}>Holiday calendar</a>
    </div>
    <h2>{view[0].toUpperCase() + view.slice(1)} view · {title}</h2>
    {message && <p role="status">{message}</p>}
    <div className={`attendance-calendar attendance-calendar-${view}`} data-testid={`attendance-${view}-view`}>
      {calendar?.days.map((day) => <article className="panel" key={day.date} data-date={day.date}>
        <h3>{new Date(`${day.date}T00:00:00.000Z`).toLocaleDateString(undefined, { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" })}</h3>
        {day.holidays.map((holiday) => <p key={holiday.id}>Holiday · {holiday.name}</p>)}
        {!day.attendance.length && !day.holidays.length && <p>No attendance</p>}
        {day.attendance.map((item) => <div className="candidate-row" key={item.id}>
          <span>{item.employee.employeeNo} · {item.employee.firstName} {item.employee.lastName}</span>
          <span>{item.status} · {item.durationMinutes ?? 0} min</span>
          <span>{item.shift ? `${item.shift.name} ${item.shift.startTime}–${item.shift.endTime} ${item.shift.timezone}` : "No shift"}</span>
          <span>{item.exceptionType || "No exception"}</span>
        </div>)}
      </article>)}
    </div>
  </section></main>;
}
