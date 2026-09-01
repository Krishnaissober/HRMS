import { z } from "zod";
import { LEAVE_APPROVAL_POLICIES, LEAVE_REQUEST_STATUSES } from "@/modules/leave/constants";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const days = z.coerce.number().min(0).max(366);

export const leaveTypeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().min(1).max(30).regex(/^[A-Za-z0-9_-]+$/).transform((value) => value.toUpperCase()),
  paid: z.boolean().default(true),
  allocationDays: days.default(0),
  eligibility: z.object({ employmentTypes: z.array(z.string().trim().min(1)).optional(), statuses: z.array(z.string().trim().min(1)).optional(), departments: z.array(z.string().trim().min(1)).optional() }).optional().nullable(),
  accrualPolicy: z.object({ frequency: z.enum(["NONE", "YEARLY", "MONTHLY"]).default("NONE") }).optional().nullable(),
  carryForwardEnabled: z.boolean().default(false),
  maxCarryForwardDays: days.optional().nullable(),
  approvalPolicy: z.enum(LEAVE_APPROVAL_POLICIES).default("HR"),
  active: z.boolean().default(true),
}).refine((value) => value.carryForwardEnabled || value.maxCarryForwardDays == null, { message: "Carry-forward must be enabled before setting a limit", path: ["maxCarryForwardDays"] });

export const leaveBalanceSchema = z.object({ employeeId: z.string().min(1), leaveTypeId: z.string().min(1), periodYear: z.number().int().min(2000).max(2200), allocatedDays: days, notes: z.string().trim().max(1000).optional() });
export const carryForwardSchema = z.object({ employeeId: z.string().min(1), leaveTypeId: z.string().min(1), fromYear: z.number().int().min(2000).max(2200), toYear: z.number().int().min(2000).max(2200) }).refine((value) => value.toYear === value.fromYear + 1, { message: "Carry-forward must target the next year", path: ["toYear"] });
export const leaveRequestSchema = z.object({
  leaveTypeId: z.string().min(1), startDate: dateOnly, endDate: dateOnly,
  durationType: z.enum(["FULL_DAY", "HALF_DAY"]).default("FULL_DAY"), reason: z.string().trim().min(1).max(2000),
  attachmentObjectKey: z.string().trim().max(500).optional(), attachmentFileName: z.string().trim().max(255).optional(),
  attachmentContentType: z.enum(["application/pdf", "image/jpeg", "image/png"]).optional(), attachmentByteSize: z.number().int().positive().max(25 * 1024 * 1024).optional(),
}).refine((value) => value.startDate <= value.endDate, { message: "End date must not precede start date", path: ["endDate"] })
  .refine((value) => value.durationType !== "HALF_DAY" || value.startDate === value.endDate, { message: "Half-day leave must use a single date", path: ["endDate"] })
  .refine((value) => { const fields = [value.attachmentObjectKey, value.attachmentFileName, value.attachmentContentType, value.attachmentByteSize]; return fields.every(Boolean) || fields.every((item) => item == null); }, { message: "Complete attachment metadata is required", path: ["attachmentObjectKey"] });
export const leaveDecisionSchema = z.object({ decision: z.enum(["APPROVED", "REJECTED"]), reason: z.string().trim().max(2000).optional() }).refine((value) => value.decision !== "REJECTED" || Boolean(value.reason), { message: "A rejection reason is required", path: ["reason"] });
export const leaveListSchema = z.object({ employeeId: z.string().optional(), status: z.enum(LEAVE_REQUEST_STATUSES).optional(), from: dateOnly.optional(), to: dateOnly.optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) }).refine((value) => !value.from || !value.to || value.from <= value.to, { message: "From date must not be after to date", path: ["to"] });
export const leaveCalendarSchema = z.object({ view: z.enum(["day", "week", "month"]), date: dateOnly, employeeId: z.string().optional(), leaveTypeId: z.string().optional() });
export const attachmentUploadSchema = z.object({ fileName: z.string().trim().min(1).max(255), contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]), byteSize: z.number().int().positive().max(25 * 1024 * 1024) });

