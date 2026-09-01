export const EMPLOYEE_ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "HALF_DAY", "WFH", "ON_DUTY", "OVERTIME", "LEAVE", "HOLIDAY", "WEEKLY_OFF"] as const;
export type EmployeeAttendanceStatus = (typeof EMPLOYEE_ATTENDANCE_STATUSES)[number];
export const ATTENDANCE_CORRECTION_STATUSES = ["REQUESTED", "APPROVED", "REJECTED"] as const;
export const ATTENDANCE_EXCEPTION_TYPES = ["MISSED_CHECK_OUT", "LATE_ARRIVAL", "EARLY_DEPARTURE", "MANUAL_CORRECTION"] as const;
export const EMPLOYEE_ATTENDANCE_PERMISSIONS = {
  read: "attendance.read",
  checkIn: "attendance.check-in",
  checkOut: "attendance.check-out",
  manage: "attendance.manage",
  correctionsRequest: "attendance.corrections.request",
  correctionsApprove: "attendance.corrections.approve",
  shiftsManage: "shifts.manage",
  rostersManage: "rosters.manage",
  holidaysManage: "holidays.manage",
} as const;
