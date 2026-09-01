import { z } from "zod";

export const analyticsDomainSchema = z.enum([
  "recruitment",
  "workforce",
  "attendance",
  "leave",
  "hr",
  "payroll",
  "audit",
]);

export const analyticsQuerySchema = z
  .object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
    department: z.string().trim().min(1).max(120).optional(),
    employeeId: z.string().trim().min(1).max(64).optional(),
  })
  .strict()
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "The start date must not be after the end date",
    path: ["from"],
  });

export type AnalyticsDomain = z.infer<typeof analyticsDomainSchema>;
export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
