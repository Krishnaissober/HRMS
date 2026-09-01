import { z } from "zod";
import { ATTENDANCE_EXCEPTION_TYPES, EMPLOYEE_ATTENDANCE_STATUSES } from "@/modules/employee-attendance/constants";

const dateTime = z.string().datetime({ offset: true });
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm");
const weeklyOffs = z.array(z.number().int().min(0).max(6)).max(7).default([]);

export const attendanceListSchema = z.object({ employeeId: z.string().optional(), status: z.enum(EMPLOYEE_ATTENDANCE_STATUSES).optional(), from: dateOnly.optional(), to: dateOnly.optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25), direction: z.enum(["asc", "desc"]).default("desc") }).refine((value) => !value.from || !value.to || value.from <= value.to, { message: "From date must not be after to date", path: ["to"] });
export const attendanceCalendarSchema = z.object({ view: z.enum(["day", "week", "month"]), date: dateOnly, employeeId: z.string().optional(), status: z.enum(EMPLOYEE_ATTENDANCE_STATUSES).optional() });
export const shiftCreateSchema = z.object({ name: z.string().trim().min(1).max(120), startTime: time, endTime: time, timezone: z.string().trim().min(1).max(80), gracePeriodMinutes: z.number().int().min(0).max(1440).default(0), weeklyOffs, rotationPattern: z.string().trim().max(500).optional().nullable(), active: z.boolean().default(true) });
export const shiftUpdateSchema = shiftCreateSchema.partial();
export const shiftAssignmentSchema = z.object({ employeeId: z.string().min(1), shiftId: z.string().min(1), startDate: dateOnly, endDate: dateOnly.optional().nullable(), weeklyOffs, rotationCode: z.string().trim().max(100).optional().nullable(), active: z.boolean().default(true) });
export const holidaySchema = z.object({ holidayDate: dateOnly, name: z.string().trim().min(1).max(160), active: z.boolean().default(true) });
export const correctionRequestSchema = z.object({ attendanceId: z.string().min(1), requestedCheckInAt: dateTime.optional().nullable(), requestedCheckOutAt: dateTime.optional().nullable(), reason: z.string().trim().min(1).max(2000) }).refine((value) => value.requestedCheckInAt || value.requestedCheckOutAt, { message: "At least one corrected timestamp is required", path: ["requestedCheckInAt"] });
export const correctionReviewSchema = z.object({ status: z.enum(["APPROVED", "REJECTED"]), reviewNotes: z.string().trim().max(2000).optional() });
export const attendanceExceptionSchema = z.object({ exceptionType: z.enum(ATTENDANCE_EXCEPTION_TYPES), notes: z.string().trim().min(1).max(2000) });
export const overtimeSchema = z.object({ approvedOvertimeMinutes: z.number().int().min(0).max(1440) });
export const attendanceStatusSchema = z.object({ status: z.enum(EMPLOYEE_ATTENDANCE_STATUSES), notes: z.string().trim().max(2000).optional() });
