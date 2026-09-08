import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

test.afterAll(async () => {
  await db.$disconnect();
});

test("persists the authenticated Phase 12 offboarding workflow and security boundaries", async ({
  page,
}) => {
  const organizationId = process.env.E2E_ORGANIZATION_ID!;
  const otherOrganizationId = process.env.E2E_OTHER_ORGANIZATION_ID!;
  const actorUserId = process.env.E2E_INTERVIEWER_ID!;
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const headers = { "x-organization-id": organizationId };

  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        data: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto(`/hr/offboarding?organizationId=${organizationId}`);
  await expect(page.getByRole("heading", { name: "Offboarding" })).toBeVisible();

  const requisition = await db.jobRequisition.create({
    data: {
      organizationId,
      referenceNo: `REQ-P12-${suffix}`,
      title: "Phase 12 Exit Role",
      status: "PUBLISHED",
      approvedAt: new Date(),
      openedAt: new Date(),
    },
  });
  async function employee(label: string) {
    const candidate = await db.candidate.create({
      data: {
        organizationId,
        referenceNo: `CAND-P12-${label}-${suffix}`,
        firstName: "Phase",
        lastName: label,
        email: `phase12-${label}-${suffix}@example.test`,
        phone: `91${String(Date.now()).slice(-8)}`,
        roleOfInterest: requisition.title,
        source: "WALK_IN",
        declarationAccepted: true,
        consentAccepted: true,
        status: "SELECTED",
      },
    });
    const application = await db.application.create({
      data: {
        organizationId,
        referenceNo: `APP-P12-${label}-${suffix}`,
        candidateId: candidate.id,
        requisitionId: requisition.id,
        status: "SELECTED",
      },
    });
    return db.employee.create({
      data: {
        organizationId,
        candidateId: candidate.id,
        applicationId: application.id,
        employeeNo: `EMP-P12-${label}-${suffix}`,
        firstName: "Phase",
        lastName: label,
        email: candidate.email,
        phone: candidate.phone,
        jobTitle: requisition.title,
        joiningDate: new Date(),
        status: "ACTIVE",
      },
    });
  }
  const exitingEmployee = await employee("Exiting");
  const otherEmployee = await employee("Other");
  const asset = await db.onboardingAsset.create({
    data: {
      organizationId,
      employeeId: exitingEmployee.id,
      assetType: "LAPTOP",
      identifier: `P12-LAP-${suffix}`,
      status: "ASSIGNED",
    },
  });
  const access = await db.systemAccessProvisioning.create({
    data: {
      organizationId,
      employeeId: exitingEmployee.id,
      systemName: `P12-System-${suffix}`,
      status: "PROVISIONED",
      provisionedAt: new Date(),
    },
  });

  const exitResponse = await page.request.post(`/api/v1/employees/${exitingEmployee.id}/exit`, {
    headers,
    data: {
      reason: "Persisted Phase 12 validation",
      noticePeriodDays: 30,
      expectedLastWorkingDay: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    },
  });
  expect(exitResponse.status()).toBe(201);
  const exitCase = (await exitResponse.json()).data;
  expect(await db.exitCase.findUnique({ where: { id: exitCase.id } })).not.toBeNull();

  const exitDocument = await db.managedDocument.create({
    data: {
      organizationId,
      ownerType: "EMPLOYEE",
      ownerId: exitingEmployee.id,
      documentType: "CLEARANCE",
      title: "Persisted exit clearance",
      createdByUserId: actorUserId,
    },
  });
  await db.documentVersion.create({
    data: {
      organizationId,
      documentId: exitDocument.id,
      versionNumber: 1,
      objectKey: `e2e/${suffix}/clearance.pdf`,
      fileName: "clearance.pdf",
      contentType: "application/pdf",
      byteSize: 128,
      createdByUserId: actorUserId,
    },
  });
  expect(
    (
      await page.request.post(`/api/v1/exit/${exitCase.id}/documents`, {
        headers,
        data: { documentId: exitDocument.id },
      })
    ).ok(),
  ).toBeTruthy();
  const exitDocuments = await page.request.get(`/api/v1/exit/${exitCase.id}/documents`, {
    headers,
  });
  expect(exitDocuments.ok()).toBeTruthy();
  expect(
    (await exitDocuments.json()).data.some(
      (document: { id: string }) => document.id === exitDocument.id,
    ),
  ).toBeTruthy();

  expect(
    (
      await page.request.get(`/api/v1/exit/${exitCase.id}`, {
        headers: { "x-organization-id": otherOrganizationId },
      })
    ).status(),
  ).toBe(404);
  const taskDueAt = new Date(Date.now() + 7 * 86400000).toISOString();
  const taskResponse = await page.request.post(`/api/v1/exit/${exitCase.id}/tasks`, {
    headers,
    data: {
      department: "HR",
      title: "Persisted HR clearance",
      assignedToUserId: actorUserId,
      dueAt: taskDueAt,
    },
  });
  expect(taskResponse.status()).toBe(201);
  const task = (await taskResponse.json()).data;

  await page.context().clearCookies();
  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        data: {
          email: process.env.E2E_LEAVE_APPROVER_EMAIL,
          password: process.env.E2E_LEAVE_APPROVER_PASSWORD,
        },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await page.request.patch(`/api/v1/exit/tasks/${task.id}/status`, {
        headers,
        data: { status: "COMPLETED" },
      })
    ).status(),
  ).toBe(403);
  await page.context().clearCookies();
  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        data: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await page.request.patch(`/api/v1/exit/tasks/${task.id}/status`, {
        headers,
        data: { status: "COMPLETED", notes: "Cleared by assignee" },
      })
    ).ok(),
  ).toBeTruthy();
  expect((await db.exitClearanceTask.findUniqueOrThrow({ where: { id: task.id } })).status).toBe(
    "COMPLETED",
  );
  expect(
    (
      await db.workflowTask.findFirstOrThrow({
        where: { organizationId, sourceType: "EXIT_CLEARANCE", sourceId: task.id },
      })
    ).status,
  ).toBe("COMPLETED");
  expect(
    (
      await db.reminder.findFirstOrThrow({
        where: { organizationId, sourceType: "EXIT_CLEARANCE", sourceId: task.id },
      })
    ).status,
  ).toBe("COMPLETED");

  expect(
    (
      await page.request.post(`/api/v1/exit/${exitCase.id}/interview`, {
        headers,
        data: { feedback: { summary: "Structured persisted feedback" }, rating: 4 },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (await db.exitInterview.findUniqueOrThrow({ where: { exitCaseId: exitCase.id } })).rating,
  ).toBe(4);
  expect(
    (
      await page.request.post(`/api/v1/employees/${otherEmployee.id}/assets/${asset.id}/return`, {
        headers,
        data: {},
      })
    ).status(),
  ).toBe(404);
  expect(
    (
      await page.request.post(`/api/v1/employees/${exitingEmployee.id}/assets/${asset.id}/return`, {
        headers,
        data: { notes: "Returned during exit" },
      })
    ).ok(),
  ).toBeTruthy();
  expect((await db.onboardingAsset.findUniqueOrThrow({ where: { id: asset.id } })).status).toBe(
    "RETURNED",
  );

  expect(
    (
      await page.request.patch(`/api/v1/exit/${exitCase.id}/settlement`, {
        headers,
        data: { status: "COMPLETED", amount: 1000 },
      })
    ).status(),
  ).toBe(409);
  expect(
    (
      await page.request.patch(`/api/v1/exit/${exitCase.id}/settlement`, {
        headers,
        data: { status: "READY", amount: 1000 },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await page.request.patch(`/api/v1/exit/${exitCase.id}/settlement`, {
        headers,
        data: { status: "COMPLETED", amount: 1000 },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (await db.exitSettlement.findUniqueOrThrow({ where: { exitCaseId: exitCase.id } })).status,
  ).toBe("COMPLETED");
  expect(
    (
      await page.request.patch(`/api/v1/exit/${exitCase.id}/settlement`, {
        headers,
        data: { status: "COMPLETED", amount: 1000 },
      })
    ).status(),
  ).toBe(409);

  expect(
    (await page.request.post(`/api/v1/exit/${exitCase.id}/complete`, { headers })).ok(),
  ).toBeTruthy();
  expect((await db.employee.findUniqueOrThrow({ where: { id: exitingEmployee.id } })).status).toBe(
    "EXITED",
  );
  expect(
    (await db.systemAccessProvisioning.findUniqueOrThrow({ where: { id: access.id } })).status,
  ).toBe("REVOKED");
  expect(
    (
      await page.request.patch(`/api/v1/employees/${exitingEmployee.id}`, {
        headers,
        data: { jobTitle: "Must not change after exit" },
      })
    ).status(),
  ).toBe(409);
  expect(
    await db.appNotification.count({
      where: {
        organizationId,
        eventType: {
          in: [
            "EXIT_CASE_CREATED",
            "EXIT_CLEARANCE_ASSIGNED",
            "EXIT_CLEARANCE_UPDATED",
            "EXIT_INTERVIEW_RECORDED",
            "EXIT_SETTLEMENT_UPDATED",
            "EMPLOYEE_EXIT_COMPLETED",
          ],
        },
      },
    }),
  ).toBeGreaterThanOrEqual(7);
  const summary = await page.request.get("/api/v1/reports/exit", { headers });
  expect(summary.ok()).toBeTruthy();
  expect((await summary.json()).data.completedExitCases).toBeGreaterThanOrEqual(1);
  expect(
    await db.auditLog.count({
      where: {
        organizationId,
        entityId: { in: [exitCase.id, task.id, asset.id, exitDocument.id] },
      },
    }),
  ).toBeGreaterThanOrEqual(4);
  expect(
    await db.auditLog.count({
      where: { organizationId, entityId: access.id, action: "SYSTEM_ACCESS_REVOKED" },
    }),
  ).toBe(1);
  expect(
    await db.auditLog.count({
      where: { organizationId, entityId: exitDocument.id, action: "EXIT_DOCUMENT_ATTACHED" },
    }),
  ).toBe(1);

  await page.goto(`/hr/offboarding?organizationId=${organizationId}`);
  await expect(page.getByText(exitingEmployee.employeeNo)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/COMPLETED/).first()).toBeVisible();
});
