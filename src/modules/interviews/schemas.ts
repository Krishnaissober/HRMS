import { z } from "zod";
import { INTERVIEW_STATUSES } from "@/modules/interviews/constants";

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));

const scheduleFields = {
  scheduledStart: z.string().datetime(),
  scheduledEnd: z.string().datetime(),
  timezone: z.string().trim().min(1).max(100).default("UTC"),
  mode: z.enum(["IN_PERSON", "VIDEO", "PHONE"]),
  location: optionalText(500),
  meetingLink: z.string().url().max(2000).optional().or(z.literal("")),
  instructions: optionalText(5000),
};

function validateWindow(
  value: { scheduledStart?: string; scheduledEnd?: string; startsAt?: string; endsAt?: string },
  context: z.RefinementCtx,
) {
  const start = value.scheduledStart || value.startsAt;
  const end = value.scheduledEnd || value.endsAt;
  if (start && end && new Date(end).getTime() <= new Date(start).getTime())
    context.addIssue({
      code: "custom",
      path: [value.scheduledEnd ? "scheduledEnd" : "endsAt"],
      message: "End must be after start",
    });
}

export const interviewCreateSchema = z
  .object({
    candidateId: z.string().trim().min(1).max(100),
    applicationId: z.string().trim().min(1).max(100),
    round: z.number().int().min(1).max(100).default(1),
    participantIds: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
    templateId: z.string().trim().min(1).max(100).optional(),
    ...scheduleFields,
  })
  .superRefine((value, context) => {
    validateWindow(value, context);
  });

export const interviewUpdateSchema = z
  .object({
    status: z.enum(INTERVIEW_STATUSES).optional(),
    noShowReason: optionalText(500),
    noShowNotes: optionalText(5000),
    round: z.number().int().min(1).max(100).optional(),
    participantIds: z.array(z.string().trim().min(1).max(100)).min(1).max(20).optional(),
    scheduledStart: z.string().datetime().optional(),
    scheduledEnd: z.string().datetime().optional(),
    timezone: z.string().trim().min(1).max(100).optional(),
    mode: z.enum(["IN_PERSON", "VIDEO", "PHONE"]).optional(),
    location: optionalText(500),
    meetingLink: z.string().url().max(2000).optional().or(z.literal("")),
    instructions: optionalText(5000),
    rescheduleReason: optionalText(1000),
  })
  .partial()
  .superRefine((value, context) => {
    validateWindow(value, context);
    if (value.status === "NO_SHOW" && !value.noShowReason?.trim()) {
      context.addIssue({
        code: "custom",
        path: ["noShowReason"],
        message: "A reason is required when marking an interview as no-show",
      });
    }
  });

export const interviewParticipantSchema = z.object({
  participantIds: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
});

export const interviewEvaluationSchema = z.object({
  templateId: z.string().trim().min(1).max(100).optional(),
  scores: z.record(z.string().trim().min(1).max(200), z.number().finite()),
  comments: optionalText(5000),
  recommendation: z.enum(["HIRE", "HOLD", "REJECT"]).optional(),
});

export const interviewListSchema = z.object({
  q: optionalText(200),
  status: z.enum(INTERVIEW_STATUSES).optional(),
  from: z.string().date().optional(),
  to: z.string().date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  direction: z.enum(["asc", "desc"]).default("desc"),
});

export const interviewTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: optionalText(1000),
  questions: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        prompt: z.string().trim().min(1).max(1000),
        competency: optionalText(200),
        scoringGuidance: optionalText(1000),
      }),
    )
    .min(1)
    .max(100),
});

export const interviewAvailabilitySchema = z
  .object({
    userId: z.string().trim().min(1).max(100),
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime(),
    timezone: z.string().trim().min(1).max(100),
  })
  .superRefine(validateWindow);

export const interviewCheckInSchema = z.object({});
export const interviewCheckOutSchema = z.object({});
