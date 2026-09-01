import { z } from "zod";

export const dashboardRangeSchema = z
  .object({
    from: z.string().date().optional(),
    to: z.string().date().optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: "The start date must not be after the end date",
    path: ["from"],
  });

export type DashboardRange = z.infer<typeof dashboardRangeSchema>;
