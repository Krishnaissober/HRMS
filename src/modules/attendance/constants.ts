export const VISIT_STATUSES = ["REGISTERED", "CHECKED_IN", "CHECKED_OUT"] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const ATTENDANCE_PERMISSIONS = {
  read: "candidate-attendance.read",
  checkIn: "candidate-attendance.check-in",
  checkOut: "candidate-attendance.check-out",
  manage: "candidate-attendance.manage",
  exceptions: "candidate-attendance.exceptions",
} as const;

export const ATTENDANCE_EXCEPTION_TYPES = [
  "MISSED_CHECK_OUT",
  "UNEXPECTED_ARRIVAL",
  "EARLY_DEPARTURE",
  "LATE_ARRIVAL",
  "INVALID_ATTENDANCE_STATE",
] as const;
export type AttendanceExceptionType = (typeof ATTENDANCE_EXCEPTION_TYPES)[number];
