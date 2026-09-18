import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, tx } = vi.hoisted(() => {
  const tx = {
    employee: { findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    onboardingInstance: { findFirst: vi.fn(), update: vi.fn() },
    onboardingAsset: { count: vi.fn() },
    employeeShiftAssignment: { updateMany: vi.fn() },
    systemAccessProvisioning: { updateMany: vi.fn() },
    employeeHistory: { create: vi.fn() },
  };
  return { db: { $transaction: vi.fn((callback) => callback(tx)) }, tx };
});

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/audit", () => ({ writeAuditEvent: vi.fn() }));
vi.mock("@/lib/storage", () => ({
  createDownloadUrl: vi.fn(),
  createUploadUrl: vi.fn(),
  verifyStoredObject: vi.fn(),
}));
vi.mock("@/lib/notifications", () => ({ emailProvider: { send: vi.fn() } }));
vi.mock("@/lib/env", () => ({ env: {} }));
vi.mock("@/modules/employees/repository", () => ({ getOnboarding: vi.fn() }));

import { archiveOnboarding, removeEmployee } from "@/modules/employees/service";

describe("employee removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tx.employee.findFirst.mockResolvedValue({
      id: "employee-1",
      status: "ACTIVE",
      separationType: null,
    });
    tx.onboardingAsset.count.mockResolvedValue(0);
    tx.employee.update.mockResolvedValue({
      id: "employee-1",
      status: "INACTIVE",
      separationType: "FIRED",
    });
  });

  it("archives the employee and disables active operational assignments", async () => {
    await removeEmployee({
      organizationId: "org-a",
      actorUserId: "user-a",
      id: "employee-1",
      separationType: "FIRED",
      reason: "Policy violation",
    });

    expect(tx.employee.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "employee-1" },
        data: expect.objectContaining({
          status: "INACTIVE",
          separationType: "FIRED",
          separationReason: "Policy violation",
        }),
      }),
    );
    expect(tx.employeeShiftAssignment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ active: false }) }),
    );
    expect(tx.systemAccessProvisioning.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REVOKED" }) }),
    );
  });

  it("blocks removal while company assets are still assigned", async () => {
    tx.onboardingAsset.count.mockResolvedValue(1);

    await expect(
      removeEmployee({
        organizationId: "org-a",
        actorUserId: "user-a",
        id: "employee-1",
        separationType: "LEFT_COMPANY",
        reason: "Resigned",
      }),
    ).rejects.toMatchObject({ code: "CONFLICT", status: 409 });
    expect(tx.employee.update).not.toHaveBeenCalled();
  });

  it("archives an onboarding plan without deleting its employee", async () => {
    tx.onboardingInstance.findFirst.mockResolvedValue({
      id: "onboarding-1",
      employeeId: "employee-1",
      status: "COMPLETED",
      employee: { employeeNo: "EMP-001" },
    });
    tx.onboardingInstance.update.mockResolvedValue({ id: "onboarding-1", status: "ARCHIVED" });

    await archiveOnboarding({
      organizationId: "org-a",
      actorUserId: "user-a",
      id: "onboarding-1",
      reason: "Plan retained for historical records",
    });

    expect(tx.onboardingInstance.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "onboarding-1" },
        data: { status: "ARCHIVED" },
      }),
    );
    expect(tx.employeeHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          employeeId: "employee-1",
          eventType: "ONBOARDING_PLAN_ARCHIVED",
        }),
      }),
    );
  });
});
