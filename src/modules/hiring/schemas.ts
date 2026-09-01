import { z } from "zod";
import { HIRING_DECISIONS, OFFER_STATUSES } from "@/modules/hiring/constants";

const optionalDate = z.string().datetime({ offset: true }).optional().nullable();

export const decisionCreateSchema = z.object({
  applicationId: z.string().min(1),
  decision: z.enum(HIRING_DECISIONS),
  reason: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(5000).optional(),
}).superRefine((value, ctx) => {
  if ((value.decision === "HOLD" || value.decision === "REJECT") && !value.reason) ctx.addIssue({ code: "custom", path: ["reason"], message: "A reason is required for hold or rejection" });
});

export const offerTemplateCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(30000),
  approvalRequired: z.boolean().default(true),
  approvalSteps: z.array(z.string().trim().min(1).max(160)).max(10).default([]),
});

export const offerCreateSchema = z.object({
  applicationId: z.string().min(1),
  hiringDecisionId: z.string().min(1),
  templateId: z.string().min(1),
  compensationSummary: z.string().trim().max(2000).optional(),
  issueDate: optionalDate,
  proposedStartDate: optionalDate,
  expiryDate: optionalDate,
});

export const offerApprovalSchema = z.object({ comments: z.string().trim().max(2000).optional() });
export const offerResponseSchema = z.object({ token: z.string().min(32).max(256), response: z.enum(["ACCEPTED", "DECLINED"]), notes: z.string().trim().max(2000).optional() });
export const offerListSchema = z.object({ status: z.enum(OFFER_STATUSES).optional(), page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(25) });
