import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { forbiddenError, unauthenticatedError } from "@/lib/errors";

const {
  getAuthenticatedContext,
  requirePermission,
  convertCandidateToEmployee,
  getEmployee,
  createOnboarding,
  completeTask,
  assignMentor,
} = vi.hoisted(() => ({
  getAuthenticatedContext: vi.fn(),
  requirePermission: vi.fn(),
  convertCandidateToEmployee: vi.fn(),
  getEmployee: vi.fn(),
  createOnboarding: vi.fn(),
  completeTask: vi.fn(),
  assignMentor: vi.fn(),
}));
vi.mock("@/lib/tenant", () => ({ getAuthenticatedContext }));
vi.mock("@/lib/rbac", () => ({ requirePermission }));
vi.mock("@/modules/employees/service", () => ({
  convertCandidateToEmployee,
  createOnboarding,
  completeTask,
  assignMentor,
}));
vi.mock("@/modules/employees/repository", () => ({
  getEmployee,
  listEmployees: vi.fn(),
  listTemplates: vi.fn(),
  listOnboarding: vi.fn(),
}));

import { POST as convertRoute } from "@/app/api/v1/candidates/[id]/convert-to-employee/route";
import { GET as employeeRoute } from "@/app/api/v1/employees/[id]/route";
import { POST as onboardingRoute } from "@/app/api/v1/onboarding/route";
import { POST as mentorRoute } from "@/app/api/v1/employees/[id]/mentor/route";

const context = { organizationId: "org-a", session: { user: { id: "user-a" } } } as never;
function request(url: string, method = "POST", body?: unknown, organizationId = "org-a") {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", "x-organization-id": organizationId },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("employee and onboarding API authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAuthenticatedContext.mockResolvedValue(context);
    requirePermission.mockResolvedValue(undefined);
    convertCandidateToEmployee.mockResolvedValue({
      created: true,
      employee: { id: "employee-1", employeeNo: "EMP-1" },
    });
    getEmployee.mockResolvedValue({ id: "employee-1", organizationId: "org-a" });
    createOnboarding.mockResolvedValue({ id: "onboarding-1" });
    assignMentor.mockResolvedValue({ id: "mentor-1" });
  });
  it("protects conversion and employee retrieval", async () => {
    getAuthenticatedContext.mockRejectedValueOnce(unauthenticatedError());
    expect(
      (
        await convertRoute(
          request("/api/v1/candidates/candidate-1/convert-to-employee", "POST", {}),
          { params: Promise.resolve({ id: "candidate-1" }) },
        )
      ).status,
    ).toBe(401);
    getAuthenticatedContext.mockResolvedValue(context);
    requirePermission.mockRejectedValueOnce(forbiddenError());
    expect(
      (
        await convertRoute(
          request("/api/v1/candidates/candidate-1/convert-to-employee", "POST", {}),
          { params: Promise.resolve({ id: "candidate-1" }) },
        )
      ).status,
    ).toBe(403);
    requirePermission.mockResolvedValue(undefined);
    expect(
      (
        await employeeRoute(request("/api/v1/employees/employee-1", "GET"), {
          params: Promise.resolve({ id: "employee-1" }),
        })
      ).status,
    ).toBe(200);
    expect(getEmployee).toHaveBeenCalledWith("org-a", "employee-1");
  });
  it("forwards tenant and actor context for onboarding and mentor assignment", async () => {
    expect(
      (
        await onboardingRoute(
          request("/api/v1/onboarding", "POST", {
            employeeId: "employee-1",
            templateId: "template-1",
          }),
        )
      ).status,
    ).toBe(201);
    expect(createOnboarding).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-a", actorUserId: "user-a" }),
    );
    expect(
      (
        await mentorRoute(
          request("/api/v1/employees/employee-1/mentor", "POST", { mentorId: "employee-2" }),
          { params: Promise.resolve({ id: "employee-1" }) },
        )
      ).status,
    ).toBe(201);
    expect(assignMentor).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: "org-a", employeeId: "employee-1" }),
    );
  });
});
