import { describe, expect, it } from "vitest";
import { candidateHrReviewSchema } from "../src/modules/candidates/schemas";
import { assessInterviewRatings } from "../src/modules/candidates/constants";

describe("rating-based assessment", () => {
  it.each([
    ["5", "3", "4", "SHORTLISTED"],
    ["3", "4", "3.5", "HOLD"],
    ["3", "3", "3", "HOLD"],
    ["2", "3", "2.5", "REJECTED"],
    ["1", "1", "1", "REJECTED"],
  ])("averages %s and %s", (communication, technical, overallFit, recommendation) => {
    expect(assessInterviewRatings(communication, technical)).toEqual({
      overallFit,
      recommendation,
    });
  });
  it("waits for two valid ratings", () => {
    expect(assessInterviewRatings("5", "")).toBeNull();
    expect(assessInterviewRatings("6", "3")).toBeNull();
  });
});

const review = {
  status: "SHORTLISTED",
  communicationRating: "4",
  technicalSkillsRating: "3",
  overallFit: "4",
  comments: "Strong communication; suitable for the role.",
};

describe("post-interview feedback validation", () => {
  it.each(["SHORTLISTED", "HOLD", "REJECTED"])("accepts a complete %s review", (status) => {
    expect(candidateHrReviewSchema.safeParse({ ...review, status }).success).toBe(true);
  });
  it.each(["", "0", "6", "excellent"])("rejects invalid rating %s", (overallFit) => {
    expect(candidateHrReviewSchema.safeParse({ ...review, overallFit }).success).toBe(false);
  });
  it("requires an outcome and meaningful comments", () => {
    expect(candidateHrReviewSchema.safeParse({ ...review, status: undefined }).success).toBe(false);
    expect(candidateHrReviewSchema.safeParse({ ...review, comments: "   " }).success).toBe(false);
  });
});
