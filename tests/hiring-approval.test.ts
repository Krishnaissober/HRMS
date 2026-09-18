import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    candidate: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/audit", () => ({ writeAuditEvent: vi.fn() }));
vi.mock("@/modules/candidates/completion", () => ({
  createCandidateCompletionLink: vi.fn(),
}));

import { requestMasterHiringReview } from "@/modules/hiring/approval";

function candidate(status: string, interviews: Array<Record<string, string>>) {
  return {
    id: "candidate-1",
    status,
    hiringApprovalStatus: "NOT_REQUESTED",
    hrReviewedAt: new Date(),
    interviews,
    submissions: [],
    documents: [],
    applications: [],
    activities: [],
  };
}

describe("Master hiring review gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects non-shortlisted candidates even after an interview and HR review", async () => {
    db.candidate.findFirst.mockResolvedValue(
      candidate("REJECTED", [{ stage: "ONLINE", mode: "IN_PERSON", status: "COMPLETED" }]),
    );

    await expect(
      requestMasterHiringReview({
        organizationId: "org-a",
        actorUserId: "user-hr",
        candidateId: "candidate-1",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("requires a completed physical interview after a remote interview", async () => {
    db.candidate.findFirst.mockResolvedValue(
      candidate("SHORTLISTED", [{ stage: "ONLINE", mode: "VIDEO", status: "COMPLETED" }]),
    );

    await expect(
      requestMasterHiringReview({
        organizationId: "org-a",
        actorUserId: "user-hr",
        candidateId: "candidate-1",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("does not accept a legacy remote-mode interview as the physical round", async () => {
    db.candidate.findFirst.mockResolvedValue(
      candidate("SHORTLISTED", [
        { stage: "ONLINE", mode: "VIDEO", status: "COMPLETED" },
        { stage: "PHYSICAL", mode: "VIDEO", status: "COMPLETED" },
      ]),
    );

    await expect(
      requestMasterHiringReview({
        organizationId: "org-a",
        actorUserId: "user-hr",
        candidateId: "candidate-1",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
