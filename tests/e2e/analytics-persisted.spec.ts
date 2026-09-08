import { expect, request as playwrightRequest, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

test("loads persisted Phase 11 analytics, filters, drill-downs, exports, RBAC, and tenant isolation", async ({
  page,
}) => {
  const db = new PrismaClient();
  const organizationId = process.env.E2E_ORGANIZATION_ID!;
  const otherOrganizationId = process.env.E2E_OTHER_ORGANIZATION_ID!;
  const userId = process.env.E2E_INTERVIEWER_ID!;
  const stamp = Date.now();
  const headers = { "x-organization-id": organizationId };

  const requisition = await db.jobRequisition.create({
    data: {
      organizationId,
      referenceNo: `REQ-AN-${stamp}`,
      title: "Analytics Specialist",
      status: "CLOSED",
      approvedAt: new Date("2026-01-01T00:00:00Z"),
      openedAt: new Date("2025-12-20T00:00:00Z"),
    },
  });
  const candidate = await db.candidate.create({
    data: {
      organizationId,
      referenceNo: `CAND-AN-${stamp}`,
      firstName: "Analytics",
      lastName: "Employee",
      email: `analytics-${stamp}@example.test`,
      phone: `8${String(stamp).slice(-9)}`,
      roleOfInterest: "Analytics Specialist",
      source: "ONLINE",
      declarationAccepted: true,
      consentAccepted: true,
      status: "HIRED",
    },
  });
  const application = await db.application.create({
    data: {
      organizationId,
      referenceNo: `APP-AN-${stamp}`,
      candidateId: candidate.id,
      requisitionId: requisition.id,
      status: "HIRED",
      createdAt: new Date("2026-01-02T00:00:00Z"),
    },
  });
  const employee = await db.employee.create({
    data: {
      organizationId,
      candidateId: candidate.id,
      applicationId: application.id,
      employeeNo: `EMP-AN-${stamp}`,
      firstName: "Analytics",
      lastName: "Employee",
      email: candidate.email,
      phone: candidate.phone,
      jobTitle: "Analytics Specialist",
      department: "People",
      location: "HQ",
      employmentType: "FULL_TIME",
      joiningDate: new Date("2026-01-05T00:00:00Z"),
      status: "CONFIRMED",
      confirmationDate: new Date("2026-02-05T00:00:00Z"),
    },
  });
  const noShowInterview = await db.interview.create({
    data: {
      organizationId,
      referenceNo: `INT-AN-${stamp}`,
      candidateId: candidate.id,
      applicationId: application.id,
      round: 1,
      scheduledStart: new Date("2026-02-15T10:00:00Z"),
      scheduledEnd: new Date("2026-02-15T11:00:00Z"),
      timezone: "UTC",
      mode: "IN_PERSON",
      status: "NO_SHOW",
      noShowReason: "Persisted analytics no-show",
      createdByUserId: userId,
    },
  });
  await db.candidateVisit.createMany({
    data: Array.from({ length: 101 }, (_, index) => ({
      organizationId,
      candidateId: candidate.id,
      interviewId: index === 0 ? noShowInterview.id : null,
      visitDate: new Date(Date.UTC(2026, 1, 1, 0, index)),
      status: index % 2 ? "CHECKED_OUT" : "REGISTERED",
      checkedInAt: index % 2 ? new Date(Date.UTC(2026, 1, 1, 0, index)) : null,
    })),
  });
  const leaveType = await db.leaveType.create({
    data: {
      organizationId,
      name: `Annual ${stamp}`,
      code: `AN${stamp}`,
      allocationDays: 20,
      createdByUserId: userId,
    },
  });
  const payrollRun = await db.payrollRun.create({
    data: {
      organizationId,
      periodStart: new Date("2026-02-01T00:00:00Z"),
      periodEnd: new Date("2026-02-28T00:00:00Z"),
      status: "APPROVED",
      currency: "USD",
      grossTotal: 1100,
      deductionTotal: 100,
      netTotal: 1000,
      createdByUserId: userId,
      approvedByUserId: userId,
      approvedAt: new Date("2026-02-28T12:00:00Z"),
    },
  });
  await db.payrollResult.create({
    data: {
      organizationId,
      payrollRunId: payrollRun.id,
      employeeId: employee.id,
      currency: "USD",
      basicSalary: 1000,
      components: [
        { name: "Housing", type: "ADDITION", amount: 100 },
        { name: "Tax", type: "DEDUCTION", amount: 100 },
      ],
      grossAmount: 1100,
      deductionAmount: 100,
      netAmount: 1000,
      overtimeMinutes: 30,
    },
  });
  await db.$transaction([
    db.attendanceRecord.create({
      data: {
        organizationId,
        employeeId: employee.id,
        workDate: new Date("2026-02-10T00:00:00Z"),
        status: "LATE",
        source: "WEB",
        lateArrivalMinutes: 10,
        overtimeMinutes: 30,
      },
    }),
    db.leaveBalance.create({
      data: {
        organizationId,
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        periodYear: 2026,
        allocatedDays: 20,
        usedDays: 2,
      },
    }),
    db.leaveBalance.create({
      data: {
        organizationId,
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        periodYear: 2025,
        allocatedDays: 99,
        usedDays: 99,
      },
    }),
    db.leaveRequest.create({
      data: {
        organizationId,
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        startDate: new Date("2026-02-11T00:00:00Z"),
        endDate: new Date("2026-02-12T00:00:00Z"),
        durationDays: 2,
        reason: "Persisted analytics fixture",
        status: "APPROVED",
        requestedByUserId: userId,
        decidedAt: new Date("2026-02-10T12:00:00Z"),
      },
    }),
    db.managedDocument.create({
      data: {
        organizationId,
        ownerType: "EMPLOYEE",
        ownerId: employee.id,
        documentType: "CERTIFICATE",
        title: "Expiring certificate",
        expiresAt: new Date("2026-02-28T00:00:00Z"),
        createdByUserId: userId,
      },
    }),
  ]);

  try {
    expect(
      (
        await page.request.post("/api/auth/sign-in/email", {
          data: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
        })
      ).ok(),
    ).toBeTruthy();

    const workforceResponse = await page.request.get(
      "/api/v1/analytics/workforce?from=2026-01-01&to=2026-02-28&department=People",
      { headers },
    );
    expect(workforceResponse.ok()).toBeTruthy();
    const workforce = (await workforceResponse.json()).data;
    expect(workforce.headcount).toBeGreaterThanOrEqual(1);
    expect(workforce.departmentDistribution).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: "People", count: 1 })]),
    );

    const attendanceResponse = await page.request.get(
      "/api/v1/analytics/attendance?from=2026-02-01&to=2026-02-28&department=People",
      { headers },
    );
    const attendance = (await attendanceResponse.json()).data;
    expect(attendance.employee.totalRecords).toBe(1);
    expect(attendance.employee.lateArrivalRate).toBe(100);
    expect(attendance.employee.statusTrends).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: "2026-02-10", status: "LATE", count: 1 }),
      ]),
    );
    expect(attendance.candidate.noShows).toBeGreaterThanOrEqual(1);
    expect(attendance.candidate.visitHistoryCount).toBeGreaterThanOrEqual(101);

    const leaveResponse = await page.request.get(
      "/api/v1/analytics/leave?from=2026-02-01&to=2026-02-28&department=People",
      { headers },
    );
    const leave = (await leaveResponse.json()).data;
    expect(leave.utilizationDays).toBe(2);
    expect(leave.balances.availableDays).toBe(18);
    expect(leave.requestTrends).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ date: "2026-02-11", status: "APPROVED", count: 1 }),
      ]),
    );

    const payrollResponse = await page.request.get(
      "/api/v1/analytics/payroll?from=2026-02-01&to=2026-02-28",
      { headers },
    );
    expect(payrollResponse.ok()).toBeTruthy();
    expect((await payrollResponse.json()).data.salaryComponents).toEqual(
      expect.arrayContaining([
        { label: "Housing", total: 100 },
        { label: "Tax", total: 100 },
      ]),
    );

    const exportResponse = await page.request.get(
      "/api/v1/reports/workforce/export?from=2026-01-01&to=2026-02-28&department=People",
      { headers },
    );
    expect(exportResponse.ok()).toBeTruthy();
    expect(exportResponse.headers()["content-type"]).toContain("text/csv");
    expect(await exportResponse.text()).toContain("headcount");
    expect(
      await db.auditLog.findFirst({
        where: { organizationId, action: "REPORT_EXPORTED", entityId: "workforce" },
      }),
    ).not.toBeNull();

    await page.goto(`/hr/reports?organizationId=${organizationId}`);
    await expect(page.getByRole("heading", { name: "See the whole picture" })).toBeVisible();
    await page.getByRole("button", { name: "Workforce" }).click();
    await page.getByRole("textbox", { name: "From", exact: true }).fill("2026-01-01");
    await page.getByRole("textbox", { name: "To", exact: true }).fill("2026-02-28");
    await page.getByRole("textbox", { name: "Department", exact: true }).fill("People");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page.getByText("People", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "View Employees records" })).toHaveAttribute(
      "href",
      new RegExp(
        `/hr/employees\\?organizationId=${organizationId}.*from=2026-01-01.*to=2026-02-28.*department=People`,
      ),
    );
    await page.getByRole("button", { name: "Recruitment" }).click();
    await expect(page.getByRole("link", { name: "View Open Positions records" })).toHaveAttribute(
      "href",
      new RegExp(`/hr/recruitment/dashboard\\?organizationId=${organizationId}.*#open-positions$`),
    );

    const other = await page.request.get("/api/v1/analytics/workforce?department=People", {
      headers: { "x-organization-id": otherOrganizationId },
    });
    expect(other.ok()).toBeTruthy();
    expect((await other.json()).data.headcount).toBe(0);

    const outside = await db.organization.create({
      data: { name: `Analytics outside ${stamp}`, slug: `analytics-outside-${stamp}` },
    });
    try {
      expect(
        (
          await page.request.get("/api/v1/analytics/workforce", {
            headers: { "x-organization-id": outside.id },
          })
        ).status(),
      ).toBe(403);
    } finally {
      await db.organization.delete({ where: { id: outside.id } });
    }
    const outsideDrilldown = await page.request.get("/api/v1/employees", {
      headers: { "x-organization-id": `outside-${stamp}` },
    });
    expect(outsideDrilldown.status()).toBe(403);

    const restricted = await playwrightRequest.newContext({
      baseURL: process.env.E2E_BASE_URL || "http://localhost:3002",
    });
    try {
      expect(
        (
          await restricted.post("/api/auth/sign-in/email", {
            data: {
              email: process.env.E2E_LEAVE_APPROVER_EMAIL,
              password: process.env.E2E_LEAVE_APPROVER_PASSWORD,
            },
          })
        ).ok(),
      ).toBeTruthy();
      expect((await restricted.get("/api/v1/analytics/workforce", { headers })).status()).toBe(403);
      expect((await restricted.get("/api/v1/reports/leave/export", { headers })).status()).toBe(
        403,
      );
    } finally {
      await restricted.dispose();
    }
  } finally {
    await db.payrollRun.delete({ where: { id: payrollRun.id } });
    await db.employee.delete({ where: { id: employee.id } });
    await db.application.delete({ where: { id: application.id } });
    await db.candidate.delete({ where: { id: candidate.id } });
    await db.jobRequisition.delete({ where: { id: requisition.id } });
    await db.$disconnect();
  }
});
