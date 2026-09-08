import { describe, expect, it } from "vitest";
import { canTransitionInterview } from "@/modules/interviews/constants";
import {
  interviewCreateSchema,
  interviewEvaluationSchema,
  interviewTemplateSchema,
  interviewUpdateSchema,
} from "@/modules/interviews/schemas";

const valid = {
  candidateId: "candidate-1",
  applicationId: "application-1",
  round: 1,
  participantIds: ["user-1"],
  scheduledStart: "2026-08-20T10:00:00.000Z",
  scheduledEnd: "2026-08-20T11:00:00.000Z",
  timezone: "Asia/Calcutta",
  mode: "VIDEO" as const,
};

describe("interview scheduling", () => {
  it("requires a valid time window and an interviewer", () => {
    expect(interviewCreateSchema.parse(valid).participantIds).toEqual(["user-1"]);
    expect(() =>
      interviewCreateSchema.parse({
        ...valid,
        participantIds: [],
        scheduledEnd: valid.scheduledStart,
      }),
    ).toThrow();
  });

  it("enforces supported status transitions", () => {
    expect(canTransitionInterview("SCHEDULED", "CHECKED_IN")).toBe(true);
    expect(canTransitionInterview("CHECKED_IN", "COMPLETED")).toBe(true);
    expect(canTransitionInterview("COMPLETED", "SCHEDULED")).toBe(false);
  });

  it("requires a reason when marking an interview as no-show", () => {
    expect(
      interviewUpdateSchema.parse({ status: "NO_SHOW", noShowReason: "Candidate did not attend" })
        .noShowReason,
    ).toBe("Candidate did not attend");
    expect(() => interviewUpdateSchema.parse({ status: "NO_SHOW" })).toThrow();
  });
});

describe("interview evaluation", () => {
  it("accepts structured scores and supported recommendations", () => {
    expect(
      interviewEvaluationSchema.parse({
        scores: { communication: 4 },
        comments: "Clear explanation",
        recommendation: "HOLD",
      }).recommendation,
    ).toBe("HOLD");
    expect(() => interviewEvaluationSchema.parse({ scores: { communication: "4" } })).toThrow();
  });

  it("accepts reusable template questions", () => {
    expect(
      interviewTemplateSchema.parse({
        name: "Technical",
        questions: [{ id: "q1", prompt: "Explain the approach" }],
      }).questions,
    ).toHaveLength(1);
  });
});
