import { z } from "zod";
const money = z.coerce.number().finite().nonnegative().max(1_000_000_000);
export const componentSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(["ALLOWANCE", "DEDUCTION", "INCENTIVE", "OTHER"]),
  amount: money,
});
export const salarySchema = z.object({
  employeeId: z.string().min(1),
  currency: z.string().regex(/^[A-Z]{3}$/),
  basicSalary: money,
  components: z.array(componentSchema).max(100),
});
export const payrollRunSchema = z
  .object({
    periodStart: z.string().date(),
    periodEnd: z.string().date(),
    currency: z.string().regex(/^[A-Z]{3}$/),
  })
  .refine((v) => v.periodEnd >= v.periodStart, {
    path: ["periodEnd"],
    message: "Period end must not precede start",
  });
export const payrollStateSchema = z.object({
  status: z.enum(["PREPARED", "REVIEWED", "APPROVED"]),
});
export const expenseUploadSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  byteSize: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});
export const expenseSchema = z.object({
  category: z.string().trim().min(1).max(100),
  amount: money.positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  expenseDate: z.string().date(),
  notes: z.string().trim().min(1).max(2000),
  receiptObjectKey: z.string().min(1),
  receiptFileName: z.string().min(1).max(255),
  receiptContentType: z.enum(["application/pdf", "image/jpeg", "image/png"]),
  receiptByteSize: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024),
});
export const expenseDecisionSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    reason: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.status !== "REJECTED" || Boolean(v.reason), {
    path: ["reason"],
    message: "Reason is required for rejection",
  });
export const expensePaymentSchema = z.object({ status: z.enum(["PROCESSING", "PAID"]) });
