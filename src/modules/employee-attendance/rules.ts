import { AppError, validationError } from "@/lib/errors";
import type { EmployeeAttendanceStatus } from "@/modules/employee-attendance/constants";

export type CalendarView = "day" | "week" | "month";

export function utcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function calendarRange(view: CalendarView, selectedDate: string) {
  const selected = utcDate(selectedDate);
  let from = new Date(selected);
  let to = new Date(selected);

  if (view === "week") {
    const mondayOffset = (selected.getUTCDay() + 6) % 7;
    from.setUTCDate(from.getUTCDate() - mondayOffset);
    to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 6);
  }

  if (view === "month") {
    from = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth(), 1));
    to = new Date(Date.UTC(selected.getUTCFullYear(), selected.getUTCMonth() + 1, 0));
  }

  return { from: isoDate(from), to: isoDate(to) };
}

export function parseWeeklyOffs(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map(Number)
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
}

export function isWeeklyOff(
  workDate: Date,
  assignmentOffs?: string | null,
  shiftOffs?: string | null,
) {
  const configured = parseWeeklyOffs(assignmentOffs);
  const days = configured.length ? configured : parseWeeklyOffs(shiftOffs);
  return days.includes(workDate.getUTCDay());
}

export function validateAttendanceStatusChange(input: {
  current: EmployeeAttendanceStatus;
  target: EmployeeAttendanceStatus;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  lateArrivalMinutes: number | null;
  overtimeMinutes: number | null;
  holiday: boolean;
  weeklyOff: boolean;
}) {
  if (input.current === input.target) {
    throw new AppError("CONFLICT", "Attendance is already in the requested status", 409);
  }
  if (["ABSENT", "LEAVE"].includes(input.target) && (input.checkInAt || input.checkOutAt)) {
    throw validationError({
      status: ["This status cannot be applied to a record with check-in or check-out timestamps"],
    });
  }
  if (input.target === "LATE" && !input.lateArrivalMinutes) {
    throw validationError({ status: ["Late status requires a calculated late arrival"] });
  }
  if (input.target === "OVERTIME" && !input.overtimeMinutes) {
    throw validationError({ status: ["Overtime status requires calculated overtime"] });
  }
  if (input.target === "HOLIDAY" && !input.holiday) {
    throw validationError({ status: ["The attendance date is not an organization holiday"] });
  }
  if (input.target === "WEEKLY_OFF" && !input.weeklyOff) {
    throw validationError({ status: ["The attendance date is not a configured weekly off"] });
  }
}
