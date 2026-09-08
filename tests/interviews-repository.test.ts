import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, writeAuditEvent } = vi.hoisted(() => {
  const tx = {
    interview: { findFirst: vi.fn(), update: vi.fn(), findUniqueOrThrow: vi.fn() },
    interviewParticipant: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    interviewAvailability: { findMany: vi.fn() },
    interviewActivity: { create: vi.fn() },
  };
  return {
    db: { $transaction: vi.fn((callback: (value: typeof tx) => unknown) => callback(tx)), tx },
    writeAuditEvent: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/audit", () => ({ writeAuditEvent }));

import { updateInterview } from "@/modules/interviews/repository";

const current = {
  id: "interview-1",
  organizationId: "org-a",
  candidateId: "candidate-1",
  status: "SCHEDULED",
  scheduledStart: new Date("2026-08-20T10:00:00.000Z"),
  scheduledEnd: new Date("2026-08-20T11:00:00.000Z"),
};

describe("interview repository remediation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.tx.interview.findFirst.mockResolvedValue(current);
    db.tx.interviewParticipant.findMany.mockResolvedValue([{ userId: "user-1" }]);
    db.tx.interviewParticipant.findFirst.mockResolvedValue(null);
    db.tx.interviewAvailability.findMany.mockResolvedValue([]);
    db.tx.interview.update.mockResolvedValue({
      ...current,
      status: "NO_SHOW",
      noShowReason: "Did not attend",
      noShowNotes: "No response",
    });
    db.tx.interview.findUniqueOrThrow.mockResolvedValue({ ...current, status: "NO_SHOW" });
  });

  it("rejects a reschedule that overlaps another interview", async () => {
    db.tx.interview.findFirst
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce({ id: "conflicting-interview" });
    await expect(
      updateInterview({
        organizationId: "org-a",
        actorUserId: "user-hr",
        id: "interview-1",
        patch: {
          scheduledStart: "2026-08-20T10:30:00.000Z",
          scheduledEnd: "2026-08-20T11:30:00.000Z",
        },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(db.tx.interview.update).not.toHaveBeenCalled();
  });

  it("persists no-show reason and writes the transactional audit/history event", async () => {
    await updateInterview({
      organizationId: "org-a",
      actorUserId: "user-hr",
      id: "interview-1",
      patch: { status: "NO_SHOW", noShowReason: "Did not attend", noShowNotes: "No response" },
    });
    expect(db.tx.interview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "NO_SHOW",
          noShowReason: "Did not attend",
          noShowNotes: "No response",
        }),
      }),
    );
    expect(db.tx.interviewActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "INTERVIEW_NO_SHOW", note: "Did not attend" }),
      }),
    );
    expect(writeAuditEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "INTERVIEW_NO_SHOW", organizationId: "org-a" }),
    );
  });
});
