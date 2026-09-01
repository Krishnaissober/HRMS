import { z } from "zod";
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const file = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
  objectKey: z.string().trim().min(1).max(600),
  checksum: z.string().trim().max(200).optional(),
});
export const documentUploadSchema = z.object({
  ownerType: z.enum(["CANDIDATE", "EMPLOYEE"]),
  ownerId: z.string().min(1),
  documentType: z.string().trim().min(1).max(100),
  title: z.string().trim().min(1).max(200),
  expiresAt: date.optional().nullable(),
  retentionUntil: date.optional().nullable(),
  ...file.shape,
});
export const uploadUrlSchema = z.object({
  ownerType: z.enum(["CANDIDATE", "EMPLOYEE"]),
  ownerId: z.string().min(1),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(25 * 1024 * 1024),
});
export const documentVersionSchema = file;
export const documentListSchema = z.object({
  ownerType: z.enum(["CANDIDATE", "EMPLOYEE"]).optional(),
  ownerId: z.string().optional(),
  status: z.enum(["ACTIVE", "ARCHIVED", "DELETED"]).optional(),
  expiringWithinDays: z.coerce.number().int().min(0).max(365).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export const documentStateSchema = z.object({ status: z.enum(["ACTIVE", "ARCHIVED", "DELETED"]) });
export const notificationListSchema = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export const notificationReadSchema = z.object({ read: z.boolean() });
export const taskSchema = z.object({
  assignedToUserId: z.string().min(1),
  sourceType: z.string().trim().min(1).max(80),
  sourceId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  dueAt: z.string().datetime().optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).default("NORMAL"),
});
export const taskStateSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED", "CANCELLED"]),
});
export const reminderGenerateSchema = z.object({
  withinDays: z.number().int().min(1).max(365).default(30),
});
