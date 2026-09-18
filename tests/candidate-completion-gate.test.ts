import { beforeEach, describe, expect, it, vi } from "vitest";

const { db } = vi.hoisted(() => ({
  db: {
    candidate: { findFirst: vi.fn(), findMany: vi.fn() },
    candidateCompletionLink: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/audit", () => ({ writeAuditEvent: vi.fn() }));
vi.mock("@/lib/storage", () => ({ createUploadUrl: vi.fn() }));
vi.mock("@/lib/pii", () => ({ encryptPii: vi.fn((value: string) => value) }));

import {
  createCandidateCompletionLink,
  getCandidateCompletionLink,
  listCandidateOnboarding,
} from "@/modules/candidates/completion";

describe("candidate onboarding approval gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    ["SHORTLISTED", "NOT_REQUESTED"],
    ["SELECTED", "MASTER_APPROVED"],
  ])("blocks completion links for %s candidates in %s", async (status, hiringApprovalStatus) => {
    db.candidate.findFirst.mockResolvedValue({
      id: "candidate-1",
      status,
      hiringApprovalStatus,
      documents: [],
    });

    await expect(
      createCandidateCompletionLink({
        organizationId: "org-a",
        candidateId: "candidate-1",
        actorUserId: "user-hr",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("only queries final-hired selected candidates for the onboarding queue", async () => {
    db.candidate.findMany.mockResolvedValue([]);

    await listCandidateOnboarding("org-a");

    expect(db.candidate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          organizationId: "org-a",
          status: "SELECTED",
          hiringApprovalStatus: "FINAL_HIRED",
          employee: null,
        },
      }),
    );
  });

  it("invalidates legacy completion tokens when the candidate is no longer final hired", async () => {
    db.candidateCompletionLink.findUnique.mockResolvedValue({
      id: "link-1",
      usedAt: null,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      candidate: {
        status: "SHORTLISTED",
        hiringApprovalStatus: "NOT_REQUESTED",
        documents: [],
      },
    });

    await expect(getCandidateCompletionLink("legacy-token")).rejects.toMatchObject({
      code: "NOT_FOUND",
      status: 404,
    });
  });

  it("does not turn an explicit empty field selection into an automatic request", async () => {
    db.candidate.findFirst.mockResolvedValue({
      id: "candidate-1",
      status: "SELECTED",
      hiringApprovalStatus: "FINAL_HIRED",
      documents: [],
    });

    await expect(
      createCandidateCompletionLink({
        organizationId: "org-a",
        candidateId: "candidate-1",
        actorUserId: "user-hr",
        requestedFields: [],
      }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});
