import { z } from "zod";
import { ATTENDANCE_EXCEPTION_TYPES, VISIT_STATUSES } from "@/modules/attendance/constants";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

export const attendanceListSchema = z.object({
  q: optionalText(200),
  status: z.enum(VISIT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export const visitorCreateSchema = z.object({
  candidateId: z.string().trim().min(1).max(100),
  interviewId: z.string().trim().min(1).max(100).optional(),
  hostUserId: z.string().trim().min(1).max(100).optional(),
  visitDate: z.string().datetime(),
  purpose: optionalText(500),
});

export const attendanceCheckInSchema = z.object({
  visitId: z.string().trim().min(1).max(100).optional(),
  candidateId: z.string().trim().min(1).max(100).optional(),
  interviewId: z.string().trim().min(1).max(100).optional(),
  hostUserId: z.string().trim().min(1).max(100).optional(),
  purpose: optionalText(500),
}).refine((value) => value.visitId || value.candidateId || value.interviewId, { message: "A visit, candidate or interview is required" });

export const attendanceCheckOutSchema = z.object({ visitId: z.string().trim().min(1).max(100) });

export const attendanceExceptionSchema = z.object({
  exceptionType: z.enum(ATTENDANCE_EXCEPTION_TYPES),
  notes: z.string().trim().min(1).max(2000),
});
