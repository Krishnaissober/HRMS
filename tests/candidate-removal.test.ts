import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, tx } = vi.hoisted(() => {
  const tx = {
    candidate: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    application: { updateMany: vi.fn() },
    candidateCompletionLink: { updateMany: vi.fn() },
    offer: { updateMany: vi.fn() },
    candidateActivity: { create: vi.fn() },
  };
  return { db: { $transaction: vi.fn((callback) => callback(tx)) }, tx };
});

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/audit", () => ({ writeAuditEvent: vi.fn() }));
vi.mock("@/lib/storage", () => ({ createDownloadUrl: vi.fn(), verifyStoredObject: vi.fn() }));
vi.mock("@/modules/candidates/repository", () => ({
  createCandidateIntake: vi.fn(),
  findOrganizationBySlug: vi.fn(),
  getCandidate: vi.fn(),
  updateCandidateStatus: vi.fn(),
}));

import { removeCandidates, removeSelectedCandidate } from "@/modules/candidates/service";

describe("selected candidate removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.candidate.findMany.mockResolvedValue([
      {
        id: "candidate-1",
        status: "SELECTED",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        employee: null,
        activities: [],
      },
    ]);
    tx.candidate.updateMany.mockResolvedValue({ count: 1 });
    tx.candidate.findUniqueOrThrow.mockResolvedValue({ id: "candidate-1", status: "REJECTED" });
  });

  it("removes the candidate from selected queues and revokes active workflows", async () => {
    await removeSelectedCandidate({
      organizationId: "org-a",
      actorUserId: "user-a",
      id: "candidate-1",
      reason: "Candidate withdrew",
    });

    expect(tx.candidate.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-a", status: "SELECTED" }),
        data: expect.objectContaining({
          status: "REJECTED",
          hiringApprovalStatus: "FINAL_REJECTED",
        }),
      }),
    );
    expect(tx.application.updateMany).toHaveBeenCalled();
    expect(tx.candidateCompletionLink.updateMany).toHaveBeenCalled();
    expect(tx.offer.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "WITHDRAWN" }) }),
    );
  });

  it("blocks candidate removal after conversion to an employee", async () => {
    tx.candidate.findMany.mockResolvedValue([
      {
        id: "candidate-1",
        status: "SELECTED",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        employee: { id: "employee-1" },
        activities: [],
      },
    ]);

    await expect(
      removeSelectedCandidate({
        organizationId: "org-a",
        actorUserId: "user-a",
        id: "candidate-1",
        reason: "Invalid removal",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
    expect(tx.candidate.updateMany).not.toHaveBeenCalled();
  });

  it("bulk removes non-employee applicants with one shared reason", async () => {
    tx.candidate.findMany.mockResolvedValue([
      {
        id: "candidate-1",
        status: "APPLIED",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        employee: null,
        activities: [],
      },
      {
        id: "candidate-2",
        status: "INTERVIEW",
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
        employee: null,
        activities: [],
      },
    ]);

    const result = await removeCandidates({
      organizationId: "org-a",
      actorUserId: "user-a",
      candidateIds: ["candidate-1", "candidate-2"],
      reason: "Positions were cancelled",
    });

    expect(result).toEqual({
      count: 2,
      candidateIds: ["candidate-1", "candidate-2"],
    });
    expect(tx.candidate.updateMany).toHaveBeenCalledTimes(2);
    expect(tx.candidateActivity.create).toHaveBeenCalledTimes(2);
    expect(tx.candidateActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "CANDIDATE_REMOVED",
          note: "Positions were cancelled",
        }),
      }),
    );
  });
});
