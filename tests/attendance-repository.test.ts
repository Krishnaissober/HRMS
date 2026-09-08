import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, writeAuditEvent } = vi.hoisted(() => {
  const tx = {
    candidate: { findFirst: vi.fn() },
    candidateVisit: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    interview: { findFirst: vi.fn() },
    membership: { findUnique: vi.fn() },
    candidateActivity: { create: vi.fn() },
  };
  return {
    db: { $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)), tx },
    writeAuditEvent: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/audit", () => ({ writeAuditEvent }));

import { checkInVisit, checkOutVisit } from "@/modules/attendance/repository";

describe("candidate attendance persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.tx.membership.findUnique.mockResolvedValue({ status: "ACTIVE" });
    db.tx.candidateVisit.update.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: "visit-1",
        candidateId: "candidate-1",
        ...data,
      }),
    );
    db.tx.candidateVisit.findUniqueOrThrow.mockResolvedValue({
      id: "visit-1",
      status: "CHECKED_OUT",
    });
  });

  it("rejects duplicate active check-in", async () => {
    db.tx.candidateVisit.findFirst.mockResolvedValue({
      id: "visit-1",
      organizationId: "org-a",
      candidateId: "candidate-1",
      status: "CHECKED_IN",
    });
    await expect(
      checkInVisit({ organizationId: "org-a", actorUserId: "user-a", visitId: "visit-1" }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects checkout without check-in", async () => {
    db.tx.candidateVisit.findFirst.mockResolvedValue({
      id: "visit-1",
      organizationId: "org-a",
      status: "REGISTERED",
    });
    await expect(
      checkOutVisit({ organizationId: "org-a", actorUserId: "user-a", visitId: "visit-1" }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("stores late arrival and early departure values for an interview visit", async () => {
    const checkedIn = {
      id: "visit-1",
      organizationId: "org-a",
      candidateId: "candidate-1",
      interviewId: "interview-1",
      status: "CHECKED_IN",
      checkedInAt: new Date(Date.now() - 10 * 60000),
      hostUserId: "host-1",
    };
    db.tx.candidateVisit.findFirst.mockResolvedValue(checkedIn);
    db.tx.interview.findFirst.mockResolvedValue({
      id: "interview-1",
      scheduledEnd: new Date(Date.now() + 20 * 60000),
      scheduledStart: new Date(Date.now() - 20 * 60000),
    });
    await checkOutVisit({ organizationId: "org-a", actorUserId: "user-a", visitId: "visit-1" });
    expect(db.tx.candidateVisit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          earlyDepartureMinutes: expect.any(Number),
          durationMinutes: expect.any(Number),
        }),
      }),
    );
  });
});
