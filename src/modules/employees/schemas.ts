import { z } from "zod";
import {
  EMPLOYEE_STATUSES,
  ONBOARDING_DOCUMENT_STATUSES,
  ONBOARDING_TASK_STATUSES,
  ONBOARDING_STATUSES,
} from "@/modules/employees/constants";

const date = z.string().datetime({ offset: true }).optional().nullable();
export const conversionSchema = z.object({
  joiningDate: date,
  probationDurationDays: z.number().int().min(0).max(3650).optional().nullable(),
  templateId: z.string().min(1).optional(),
});
export const employeeListSchema = z.object({
  q: z.string().trim().optional(),
  status: z.enum(EMPLOYEE_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export const employeeUpdateSchema = z.object({
  department: z.string().trim().max(160).optional().nullable(),
  location: z.string().trim().max(160).optional().nullable(),
  jobTitle: z.string().trim().min(1).max(160).optional(),
  managerEmployeeId: z.string().min(1).optional().nullable(),
  profileImageUrl: z.string().url().optional().nullable(),
});
export const selfServiceProfileSchema = z
  .object({
    phone: z.string().trim().min(1).max(40).optional(),
    addressLine1: z.string().trim().max(240).optional().nullable(),
    addressLine2: z.string().trim().max(240).optional().nullable(),
    city: z.string().trim().max(120).optional().nullable(),
    state: z.string().trim().max(120).optional().nullable(),
    country: z.string().trim().max(120).optional().nullable(),
    postalCode: z.string().trim().max(40).optional().nullable(),
    profileImageUrl: z.string().url().optional().nullable(),
  })
  .strict();
export const employeeStatusSchema = z.object({
  status: z.enum(EMPLOYEE_STATUSES),
  notes: z.string().trim().max(2000).optional(),
});
export const templateCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  department: z.string().trim().max(160).optional().nullable(),
  role: z.string().trim().max(160).optional().nullable(),
  employmentType: z.string().trim().max(100).optional().nullable(),
  definitions: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(200),
        description: z.string().trim().max(2000).optional(),
        category: z.string().trim().max(100).optional(),
        dueDays: z.number().int().min(0).max(3650).optional(),
        required: z.boolean().default(true),
        sortOrder: z.number().int().min(0).default(0),
      }),
    )
    .max(100),
});
export const onboardingCreateSchema = z.object({
  employeeId: z.string().min(1),
  templateId: z.string().min(1).optional(),
});
export const taskCompleteSchema = z.object({ notes: z.string().trim().max(2000).optional() });
export const documentCreateSchema = z.object({
  onboardingId: z.string().min(1).optional().nullable(),
  kind: z.string().trim().min(1).max(100),
  objectKey: z.string().trim().min(1).max(500),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(120),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
});
export const documentRequestSchema = z.object({
  onboardingId: z.string().min(1).optional().nullable(),
  kind: z.string().trim().min(1).max(100),
  fileName: z.string().trim().max(255).optional(),
});
export const documentSubmitSchema = z.object({
  objectKey: z.string().trim().min(1).max(500),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
});
export const documentUploadRequestSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
});
export const documentStatusSchema = z.object({
  status: z.enum(ONBOARDING_DOCUMENT_STATUSES),
  acknowledged: z.boolean().optional(),
});
export const assetCreateSchema = z.object({
  assetType: z.string().trim().min(1).max(100),
  identifier: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(2000).optional(),
});
export const accessCreateSchema = z.object({
  systemName: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(2000).optional(),
});
export const accessStatusSchema = z.object({
  status: z.enum(["REQUESTED", "PROVISIONING", "PROVISIONED", "FAILED", "REVOKED"]),
  notes: z.string().trim().max(2000).optional(),
});
export const mentorSchema = z.object({
  mentorId: z.string().min(1),
  notes: z.string().trim().max(2000).optional(),
});
export const onboardingListSchema = z.object({
  status: z.enum(ONBOARDING_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export const taskListSchema = z.object({ status: z.enum(ONBOARDING_TASK_STATUSES).optional() });
export const exitCreateSchema = z.object({
  reason: z.string().trim().min(1).max(2000),
  noticePeriodDays: z.number().int().min(0).max(3650).optional(),
  expectedLastWorkingDay: z.string().date().optional(),
});
export const exitTaskSchema = z.object({
  department: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(200),
  dueAt: z.string().datetime({ offset: true }).optional(),
  assignedToUserId: z.string().min(1).optional(),
});
export const exitTaskStatusSchema = z.object({
  status: z.enum(["OPEN", "COMPLETED", "REJECTED"]),
  notes: z.string().trim().max(2000).optional(),
});
export const exitInterviewSchema = z.object({
  feedback: z.record(z.string(), z.string().trim().max(2000)),
  rating: z.number().int().min(1).max(5).optional(),
});
export const exitSettlementSchema = z.object({
  status: z.enum(["PENDING", "READY", "COMPLETED"]),
  notes: z.string().trim().max(2000).optional(),
  amount: z.number().nonnegative().optional(),
});
export const exitDocumentAttachSchema = z.object({ documentId: z.string().min(1) });
