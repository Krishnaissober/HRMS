import { test, expect, request as playwrightRequest } from "@playwright/test";
import { db } from "@/lib/db";

test("persists accepted-offer conversion, onboarding progress and employee foundations", async ({
  page,
}) => {
  test.setTimeout(300000);
  const organizationId = process.env.E2E_ORGANIZATION_ID!;
  const otherOrganizationId = process.env.E2E_OTHER_ORGANIZATION_ID!;
  const headers = { "content-type": "application/json", "x-organization-id": organizationId };
  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        data: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
      })
    ).ok(),
  ).toBeTruthy();
  const requisition = await db.jobRequisition.findFirstOrThrow({ where: { organizationId } });
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const candidate = await db.candidate.create({
    data: {
      organizationId,
      referenceNo: `CAND-P5-${suffix}`,
      firstName: "Phase",
      lastName: "Five",
      email: process.env.E2E_EMAIL!,
      phone: `922${String(Date.now()).slice(-7)}`,
      roleOfInterest: requisition.title,
      source: "WALK_IN",
      status: "INTERVIEW",
      declarationAccepted: true,
      consentAccepted: true,
    },
  });
  const application = await db.application.create({
    data: {
      organizationId,
      referenceNo: `APP-P5-${suffix}`,
      candidateId: candidate.id,
      requisitionId: requisition.id,
      status: "INTERVIEW",
    },
  });
  const decision = await db.hiringDecision.create({
    data: {
      organizationId,
      candidateId: candidate.id,
      applicationId: application.id,
      decision: "HIRE",
      actorUserId: process.env.E2E_INTERVIEWER_ID!,
    },
  });
  const offerTemplate = await db.offerTemplate.create({
    data: {
      organizationId,
      name: `P5 Offer ${suffix}`,
      body: "Phase 5 accepted offer",
      approvalRequired: false,
      approvalSteps: [],
      createdByUserId: process.env.E2E_INTERVIEWER_ID!,
    },
  });
  const offer = await db.offer.create({
    data: {
      organizationId,
      candidateId: candidate.id,
      applicationId: application.id,
      hiringDecisionId: decision.id,
      templateId: offerTemplate.id,
      status: "ACCEPTED",
      respondedAt: new Date(),
      createdByUserId: process.env.E2E_INTERVIEWER_ID!,
    },
  });
  const templateResponse = await page.request.post("/api/v1/onboarding-templates", {
    headers,
    data: {
      name: `P5 Onboarding ${suffix}`,
      role: requisition.title,
      definitions: [
        {
          title: "Collect identity document",
          category: "Documents",
          dueDays: 2,
          required: true,
          sortOrder: 1,
        },
        {
          title: "Confirm access needs",
          category: "Access",
          dueDays: 5,
          required: true,
          sortOrder: 2,
        },
      ],
    },
  });
  expect(templateResponse.status()).toBe(201);
  const onboardingTemplate = (await templateResponse.json()).data;
  const conversionResponse = await page.request.post(
    `/api/v1/candidates/${candidate.id}/convert-to-employee`,
    {
      headers,
      data: {
        joiningDate: new Date().toISOString(),
        probationDurationDays: 30,
        templateId: onboardingTemplate.id,
      },
    },
  );
  expect(conversionResponse.status()).toBe(201);
  const conversion = (await conversionResponse.json()).data;
  expect(conversion.created).toBe(true);
  const employee = conversion.employee;
  const repeat = await page.request.post(`/api/v1/candidates/${candidate.id}/convert-to-employee`, {
    headers,
    data: {},
  });
  expect(repeat.ok()).toBeTruthy();
  expect((await repeat.json()).data.created).toBe(false);
  const crossTenantEmployee = await page.request.get(`/api/v1/employees/${employee.id}`, {
    headers: { "x-organization-id": otherOrganizationId },
  });
  expect(crossTenantEmployee.status()).toBe(404);
  const employeeResponse = await page.request.get(`/api/v1/employees/${employee.id}`, {
    headers: { "x-organization-id": organizationId },
  });
  expect(employeeResponse.ok()).toBeTruthy();
  expect((await employeeResponse.json()).data.application.id).toBe(application.id);
  const selfProfile = await page.request.get("/api/v1/me/employee", {
    headers: { "x-organization-id": organizationId },
  });
  expect(selfProfile.ok()).toBeTruthy();
  expect((await selfProfile.json()).data.id).toBe(employee.id);
  const selfUpdate = await page.request.patch("/api/v1/me/employee", {
    headers,
    data: { phone: "9111111111", department: "Payroll" },
  });
  expect(selfUpdate.status()).toBe(422);
  const permittedSelfUpdate = await page.request.patch("/api/v1/me/employee", {
    headers,
    data: { phone: "9111111111" },
  });
  expect(permittedSelfUpdate.ok()).toBeTruthy();
  expect((await db.employee.findUniqueOrThrow({ where: { id: employee.id } })).phone).toBe(
    "9111111111",
  );
  const documentRequest = await page.request.post(
    `/api/v1/employees/${employee.id}/documents/requests`,
    { headers, data: { kind: "IDENTITY", fileName: "Identity document" } },
  );
  expect(documentRequest.status()).toBe(201);
  const requestedDocument = (await documentRequest.json()).data;
  expect(requestedDocument.status).toBe("REQUESTED");
  const invalidVerification = await page.request.patch(
    `/api/v1/employees/${employee.id}/documents/${requestedDocument.id}/status`,
    { headers, data: { status: "VERIFIED" } },
  );
  expect(invalidVerification.status()).toBe(409);
  const selfDocuments = await page.request.get("/api/v1/me/employee/documents", {
    headers: { "x-organization-id": organizationId },
  });
  expect(selfDocuments.ok()).toBeTruthy();
  expect(
    (await selfDocuments.json()).data.some(
      (item: { id: string }) => item.id === requestedDocument.id,
    ),
  ).toBeTruthy();
  const otherTenantSelfDocuments = await page.request.get("/api/v1/me/employee/documents", {
    headers: { "x-organization-id": otherOrganizationId },
  });
  expect(otherTenantSelfDocuments.status()).toBe(404);
  const otherTenantRequest = await page.request.post(
    `/api/v1/employees/${employee.id}/documents/requests`,
    {
      headers: { ...headers, "x-organization-id": otherOrganizationId },
      data: { kind: "ADDRESS" },
    },
  );
  expect(otherTenantRequest.status()).toBe(404);

  const currentWeekday = new Date().getUTCDay();
  const shiftResponse = await page.request.post("/api/v1/shifts", {
    headers,
    data: {
      name: `P5 Day ${suffix}`,
      startTime: "00:00",
      endTime: "23:59",
      timezone: "UTC",
      gracePeriodMinutes: 0,
      weeklyOffs: [currentWeekday],
    },
  });
  expect(shiftResponse.status()).toBe(201);
  const shift = (await shiftResponse.json()).data;
  const today = new Date().toISOString().slice(0, 10);
  const assignmentResponse = await page.request.post("/api/v1/rosters/assignments", {
    headers,
    data: {
      employeeId: employee.id,
      shiftId: shift.id,
      startDate: today,
      weeklyOffs: [currentWeekday],
    },
  });
  expect(assignmentResponse.status()).toBe(201);
  const overlappingAssignment = await page.request.post("/api/v1/rosters/assignments", {
    headers,
    data: {
      employeeId: employee.id,
      shiftId: shift.id,
      startDate: today,
      weeklyOffs: [currentWeekday],
    },
  });
  expect(overlappingAssignment.status()).toBe(409);
  const crossTenantAssignment = await page.request.post("/api/v1/rosters/assignments", {
    headers: { ...headers, "x-organization-id": otherOrganizationId },
    data: { employeeId: employee.id, shiftId: shift.id, startDate: today },
  });
  expect(crossTenantAssignment.status()).toBe(404);
  const checkIn = await page.request.post("/api/v1/attendance/employee/check-in", { headers });
  expect(checkIn.status()).toBe(201);
  const attendance = (await checkIn.json()).data;
  expect(attendance.status).toBe("WEEKLY_OFF");
  const duplicateCheckIn = await page.request.post("/api/v1/attendance/employee/check-in", {
    headers,
  });
  expect(duplicateCheckIn.status()).toBe(409);
  const checkOut = await page.request.post("/api/v1/attendance/employee/check-out", { headers });
  expect(checkOut.status()).toBe(200);
  expect((await checkOut.json()).data.durationMinutes).toBeGreaterThanOrEqual(0);
  const duplicateCheckOut = await page.request.post("/api/v1/attendance/employee/check-out", {
    headers,
  });
  expect(duplicateCheckOut.status()).toBe(409);
  const selfAttendance = await page.request.get("/api/v1/me/attendance?page=1&pageSize=20", {
    headers: { "x-organization-id": organizationId },
  });
  expect(selfAttendance.ok()).toBeTruthy();
  expect(
    (await selfAttendance.json()).data.items.some(
      (item: { id: string }) => item.id === attendance.id,
    ),
  ).toBeTruthy();
  const correctionResponse = await page.request.post("/api/v1/attendance/employee/corrections", {
    headers,
    data: {
      attendanceId: attendance.id,
      requestedCheckOutAt: new Date().toISOString(),
      reason: "Verified attendance correction",
    },
  });
  expect(correctionResponse.status()).toBe(201);
  const correction = (await correctionResponse.json()).data;
  const review = await page.request.patch(
    `/api/v1/attendance/employee/corrections/${correction.id}`,
    { headers, data: { status: "APPROVED", reviewNotes: "Approved in persisted workflow" } },
  );
  expect(review.ok()).toBeTruthy();
  const correctedAttendance = await db.attendanceRecord.findUniqueOrThrow({
    where: { id: attendance.id },
  });
  expect(correctedAttendance.durationMinutes).toBeGreaterThanOrEqual(0);
  expect(correctedAttendance.status).toBe("WEEKLY_OFF");
  expect(correctedAttendance.overtimeMinutes).toBeNull();
  const invalidStatus = await page.request.patch(
    `/api/v1/attendance/employee/${attendance.id}/status`,
    { headers, data: { status: "ABSENT", notes: "Should be rejected because timestamps exist" } },
  );
  expect(invalidStatus.status()).toBe(422);
  const invalidCrossTenantCorrection = await page.request.post(
    "/api/v1/attendance/employee/corrections",
    {
      headers: { ...headers, "x-organization-id": otherOrganizationId },
      data: {
        attendanceId: attendance.id,
        requestedCheckOutAt: new Date().toISOString(),
        reason: "Wrong tenant",
      },
    },
  );
  expect(invalidCrossTenantCorrection.status()).toBe(404);
  const holidayDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const holiday = await page.request.post("/api/v1/holidays", {
    headers,
    data: { holidayDate, name: `P5 Holiday ${suffix}` },
  });
  expect(holiday.status()).toBe(201);
  const priorDate = new Date(Date.now() - 86400000);
  const priorWorkDate = new Date(`${priorDate.toISOString().slice(0, 10)}T00:00:00.000Z`);
  await db.attendanceRecord.create({
    data: {
      organizationId,
      employeeId: employee.id,
      workDate: priorWorkDate,
      checkInAt: new Date(`${priorDate.toISOString().slice(0, 10)}T09:00:00.000Z`),
      checkOutAt: new Date(`${priorDate.toISOString().slice(0, 10)}T11:00:00.000Z`),
      durationMinutes: 120,
      status: "PRESENT",
      source: "WEB",
    },
  });
  const report = await page.request.get(
    `/api/v1/attendance/employee/report?employeeId=${employee.id}&from=${priorDate.toISOString().slice(0, 10)}&to=${today}&page=1&pageSize=1`,
    { headers: { "x-organization-id": organizationId } },
  );
  expect(report.ok()).toBeTruthy();
  const reportPayload = (await report.json()).data;
  expect(reportPayload.total).toBe(2);
  expect(reportPayload.items).toHaveLength(1);
  expect(reportPayload.summary.durationMinutes).toBeGreaterThanOrEqual(120);
  const invalidReport = await page.request.get(
    "/api/v1/attendance/employee/report?from=2026-08-20&to=2026-08-10",
    { headers: { "x-organization-id": organizationId } },
  );
  expect(invalidReport.status()).toBe(422);
  for (const view of ["day", "week", "month"]) {
    const calendarResponse = await page.request.get(
      `/api/v1/attendance/employee/calendar?view=${view}&date=${today}&employeeId=${employee.id}`,
      { headers: { "x-organization-id": organizationId } },
    );
    expect(calendarResponse.ok()).toBeTruthy();
    const calendar = (await calendarResponse.json()).data;
    expect(calendar.view).toBe(view);
    expect(
      calendar.days
        .flatMap((day: { attendance: { id: string }[] }) => day.attendance)
        .some((item: { id: string }) => item.id === attendance.id),
    ).toBeTruthy();
  }
  const crossTenantCalendar = await page.request.get(
    `/api/v1/attendance/employee/calendar?view=month&date=${today}&employeeId=${employee.id}`,
    { headers: { "x-organization-id": otherOrganizationId } },
  );
  expect(crossTenantCalendar.ok()).toBeTruthy();
  expect(
    (await crossTenantCalendar.json()).data.days.flatMap(
      (day: { attendance: unknown[] }) => day.attendance,
    ),
  ).toHaveLength(0);
  const anonymous = await playwrightRequest.newContext({ baseURL: "http://127.0.0.1:3000" });
  expect(
    (
      await anonymous.get(`/api/v1/attendance/employee/calendar?view=day&date=${today}`, {
        headers: { "x-organization-id": organizationId },
      })
    ).status(),
  ).toBe(401);
  await anonymous.dispose();
  await page.goto(`/hr/employee-attendance/manage?organizationId=${organizationId}`);
  await expect(page.getByTestId("attendance-month-view")).toContainText(employee.employeeNo);
  await page.getByRole("button", { name: "Week", exact: true }).click();
  await expect(page.getByTestId("attendance-week-view")).toContainText(employee.employeeNo);
  await page.getByRole("button", { name: "Day", exact: true }).click();
  await expect(page.getByTestId("attendance-day-view")).toContainText(employee.employeeNo);

  const leaveTypeResponse = await page.request.post("/api/v1/leave-types", {
    headers,
    data: {
      name: `Annual Leave ${suffix}`,
      code: `AL-${String(Date.now()).slice(-8)}`,
      allocationDays: 10,
      carryForwardEnabled: true,
      maxCarryForwardDays: 3,
      approvalPolicy: "HR",
    },
  });
  expect(leaveTypeResponse.status()).toBe(201);
  const leaveType = (await leaveTypeResponse.json()).data;
  const balanceResponse = await page.request.post("/api/v1/leave-balances", {
    headers,
    data: {
      employeeId: employee.id,
      leaveTypeId: leaveType.id,
      periodYear: new Date().getUTCFullYear(),
      allocatedDays: 10,
    },
  });
  expect(balanceResponse.status()).toBe(201);
  const leaveEndDate = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);
  const leaveRequestResponse = await page.request.post("/api/v1/leave-requests", {
    headers,
    data: {
      leaveTypeId: leaveType.id,
      startDate: holidayDate,
      endDate: leaveEndDate,
      reason: "Phase 7 persisted leave",
    },
  });
  expect(leaveRequestResponse.status()).toBe(201);
  const leaveRequest = (await leaveRequestResponse.json()).data;
  expect(Number(leaveRequest.durationDays)).toBe(1);
  const overlappingLeave = await page.request.post("/api/v1/leave-requests", {
    headers,
    data: {
      leaveTypeId: leaveType.id,
      startDate: holidayDate,
      endDate: leaveEndDate,
      reason: "Overlapping leave",
    },
  });
  expect(overlappingLeave.status()).toBe(409);
  await page.goto(`/hr/leave?organizationId=${organizationId}`);
  await expect(page.getByRole("heading", { name: "Leave dashboard" })).toBeVisible();
  await expect(page.getByText("Phase 7 persisted leave")).toBeVisible({ timeout: 20_000 });
  expect(
    (
      await page.request.patch(`/api/v1/leave-requests/${leaveRequest.id}/decision`, {
        headers,
        data: { decision: "APPROVED" },
      })
    ).status(),
  ).toBe(403);
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
  const crossTenantDecision = await page.request.patch(
    `/api/v1/leave-requests/${leaveRequest.id}/decision`,
    {
      headers: { ...headers, "x-organization-id": otherOrganizationId },
      data: { decision: "APPROVED" },
    },
  );
  expect(crossTenantDecision.status()).toBe(404);
  const approval = await page.request.patch(`/api/v1/leave-requests/${leaveRequest.id}/decision`, {
    headers,
    data: { decision: "APPROVED", reason: "Approved in Phase 7 E2E" },
  });
  expect(approval.ok()).toBeTruthy();
  expect((await approval.json()).data.status).toBe("APPROVED");
  expect(
    (
      await page.request.patch(`/api/v1/leave-requests/${leaveRequest.id}/decision`, {
        headers,
        data: { decision: "APPROVED" },
      })
    ).status(),
  ).toBe(409);
  const approvedBalance = await db.leaveBalance.findFirstOrThrow({
    where: {
      organizationId,
      employeeId: employee.id,
      leaveTypeId: leaveType.id,
      periodYear: new Date().getUTCFullYear(),
    },
  });
  expect(Number(approvedBalance.usedDays)).toBe(1);
  const leaveAttendance = await db.attendanceRecord.findUniqueOrThrow({
    where: {
      employeeId_workDate: {
        employeeId: employee.id,
        workDate: new Date(`${leaveEndDate}T00:00:00.000Z`),
      },
    },
  });
  expect(leaveAttendance.status).toBe("LEAVE");
  expect(
    await db.attendanceRecord.findUnique({
      where: {
        employeeId_workDate: {
          employeeId: employee.id,
          workDate: new Date(`${holidayDate}T00:00:00.000Z`),
        },
      },
    }),
  ).toBeNull();
  await page.context().clearCookies();
  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        data: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
      })
    ).ok(),
  ).toBeTruthy();
  const leaveWeekday = new Date(`${leaveEndDate}T00:00:00.000Z`).getUTCDay();
  await db.employeeShiftAssignment.update({
    where: { id: assignmentResponse.ok() ? (await assignmentResponse.json()).data.id : "" },
    data: { weeklyOffs: `${currentWeekday},${leaveWeekday}` },
  });
  expect(
    (
      await page.request.patch(`/api/v1/shifts/${shift.id}`, {
        headers,
        data: { name: shift.name },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    Number(
      (await db.leaveBalance.findUniqueOrThrow({ where: { id: approvedBalance.id } })).usedDays,
    ),
  ).toBe(0);
  expect(
    await db.attendanceRecord.findUnique({
      where: {
        employeeId_workDate: {
          employeeId: employee.id,
          workDate: new Date(`${leaveEndDate}T00:00:00.000Z`),
        },
      },
    }),
  ).toBeNull();
  const assignment = await db.employeeShiftAssignment.findFirstOrThrow({
    where: { organizationId, employeeId: employee.id, shiftId: shift.id },
  });
  await db.employeeShiftAssignment.update({
    where: { id: assignment.id },
    data: { weeklyOffs: String(currentWeekday) },
  });
  expect(
    (
      await page.request.patch(`/api/v1/shifts/${shift.id}`, {
        headers,
        data: { name: shift.name },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    Number(
      (await db.leaveBalance.findUniqueOrThrow({ where: { id: approvedBalance.id } })).usedDays,
    ),
  ).toBe(1);
  expect(
    (
      await db.attendanceRecord.findUniqueOrThrow({
        where: {
          employeeId_workDate: {
            employeeId: employee.id,
            workDate: new Date(`${leaveEndDate}T00:00:00.000Z`),
          },
        },
      })
    ).status,
  ).toBe("LEAVE");
  expect(
    (
      await page.request.post("/api/v1/holidays", {
        headers,
        data: { holidayDate: leaveEndDate, name: `P7 Recalculation ${suffix}` },
      })
    ).status(),
  ).toBe(201);
  expect(
    Number(
      (await db.leaveBalance.findUniqueOrThrow({ where: { id: approvedBalance.id } })).usedDays,
    ),
  ).toBe(0);
  expect(
    await db.attendanceRecord.findUnique({
      where: {
        employeeId_workDate: {
          employeeId: employee.id,
          workDate: new Date(`${leaveEndDate}T00:00:00.000Z`),
        },
      },
    }),
  ).toBeNull();
  const carryResults = await Promise.all(
    [1, 2].map(() =>
      page.request.post("/api/v1/leave-balances/carry-forward", {
        headers,
        data: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          fromYear: new Date().getUTCFullYear(),
          toYear: new Date().getUTCFullYear() + 1,
        },
      }),
    ),
  );
  expect(carryResults.map((r) => r.status()).sort()).toEqual([201, 409]);
  const carried = carryResults.find((r) => r.status() === 201)!;
  expect(Number((await carried.json()).data.carriedDays)).toBe(3);
  expect(
    (
      await page.request.post("/api/v1/leave-balances/carry-forward", {
        headers,
        data: {
          employeeId: employee.id,
          leaveTypeId: leaveType.id,
          fromYear: new Date().getUTCFullYear(),
          toYear: new Date().getUTCFullYear() + 1,
        },
      })
    ).status(),
  ).toBe(409);
  const raceTypeResponse = await page.request.post("/api/v1/leave-types", {
    headers,
    data: {
      name: `Concurrent Leave ${suffix}`,
      code: `CL-${String(Date.now()).slice(-8)}`,
      allocationDays: 1,
      approvalPolicy: "HR",
    },
  });
  expect(raceTypeResponse.status()).toBe(201);
  const raceType = (await raceTypeResponse.json()).data;
  const balanceRaces = await Promise.all(
    [1, 1].map((allocatedDays) =>
      page.request.post("/api/v1/leave-balances", {
        headers,
        data: {
          employeeId: employee.id,
          leaveTypeId: raceType.id,
          periodYear: new Date().getUTCFullYear(),
          allocatedDays,
        },
      }),
    ),
  );
  expect(balanceRaces.every((r) => [201, 409].includes(r.status()))).toBeTruthy();
  const raceDates = [4, 5].map((offset) =>
    new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10),
  );
  const requestRaces = await Promise.all(
    raceDates.map((d, index) =>
      page.request.post("/api/v1/leave-requests", {
        headers,
        data: {
          leaveTypeId: raceType.id,
          startDate: d,
          endDate: d,
          reason: `Concurrent request ${index}`,
        },
      }),
    ),
  );
  expect(requestRaces.map((r) => r.status()).sort()).toEqual([201, 409]);
  const rejectionDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  const rejectionRequestResponse = await page.request.post("/api/v1/leave-requests", {
    headers,
    data: {
      leaveTypeId: leaveType.id,
      startDate: rejectionDate,
      endDate: rejectionDate,
      reason: "Phase 7 rejection path",
    },
  });
  expect(rejectionRequestResponse.status()).toBe(201);
  const rejectionRequest = (await rejectionRequestResponse.json()).data;
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
      await page.request.patch(`/api/v1/leave-requests/${rejectionRequest.id}/decision`, {
        headers,
        data: { decision: "REJECTED" },
      })
    ).status(),
  ).toBe(422);
  const decisionRaces = await Promise.all(
    [1, 2].map(() =>
      page.request.patch(`/api/v1/leave-requests/${rejectionRequest.id}/decision`, {
        headers,
        data: { decision: "REJECTED", reason: "Insufficient coverage" },
      }),
    ),
  );
  expect(decisionRaces.map((r) => r.status()).sort()).toEqual([200, 409]);
  const rejection = decisionRaces.find((r) => r.status() === 200)!;
  expect((await rejection.json()).data.status).toBe("REJECTED");
  const leaveNotifications = await db.leaveNotification.findMany({
    where: { organizationId, leaveRequestId: { in: [leaveRequest.id, rejectionRequest.id] } },
  });
  expect(leaveNotifications.map((item) => item.type)).toEqual(
    expect.arrayContaining(["LEAVE_REQUESTED", "LEAVE_APPROVED", "LEAVE_REJECTED"]),
  );
  expect(leaveNotifications.find((item) => item.type === "LEAVE_REQUESTED")?.recipientEmail).toBe(
    process.env.E2E_LEAVE_APPROVER_EMAIL,
  );
  await page.goto(`/hr/leave/manage?organizationId=${organizationId}`);
  await expect(page.getByText("Phase 7 persisted leave")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "Configure leave policy" })).toBeVisible();
  await expect(page.getByLabel("Approval policy")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Manage balance" })).toBeVisible();
  await page.goto(`/hr/leave/calendar?organizationId=${organizationId}`);
  await expect(page.getByTestId("leave-month-calendar")).toContainText(employee.employeeNo, {
    timeout: 20_000,
  });
  await page.context().clearCookies();
  expect(
    (
      await page.request.post("/api/auth/sign-in/email", {
        data: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
      })
    ).ok(),
  ).toBeTruthy();

  const concurrentCandidate = await db.candidate.create({
    data: {
      organizationId,
      referenceNo: `CAND-P5-RACE-${suffix}`,
      firstName: "Concurrent",
      lastName: "Conversion",
      email: `race-${suffix}@example.test`,
      phone: `924${String(Date.now()).slice(-7)}`,
      roleOfInterest: requisition.title,
      source: "WALK_IN",
      status: "INTERVIEW",
      declarationAccepted: true,
      consentAccepted: true,
    },
  });
  const concurrentApplication = await db.application.create({
    data: {
      organizationId,
      referenceNo: `APP-P5-RACE-${suffix}`,
      candidateId: concurrentCandidate.id,
      requisitionId: requisition.id,
      status: "INTERVIEW",
    },
  });
  const concurrentDecision = await db.hiringDecision.create({
    data: {
      organizationId,
      candidateId: concurrentCandidate.id,
      applicationId: concurrentApplication.id,
      decision: "HIRE",
      actorUserId: process.env.E2E_INTERVIEWER_ID!,
    },
  });
  await db.offer.create({
    data: {
      organizationId,
      candidateId: concurrentCandidate.id,
      applicationId: concurrentApplication.id,
      hiringDecisionId: concurrentDecision.id,
      templateId: offerTemplate.id,
      status: "ACCEPTED",
      respondedAt: new Date(),
      createdByUserId: process.env.E2E_INTERVIEWER_ID!,
    },
  });
  const concurrentResults = await Promise.all([
    page.request.post(`/api/v1/candidates/${concurrentCandidate.id}/convert-to-employee`, {
      headers,
      data: {},
    }),
    page.request.post(`/api/v1/candidates/${concurrentCandidate.id}/convert-to-employee`, {
      headers,
      data: {},
    }),
  ]);
  expect(concurrentResults.every((response) => response.status() === 201)).toBeTruthy();
  const concurrentPayloads = await Promise.all(
    concurrentResults.map((response) => response.json()),
  );
  expect(concurrentPayloads.filter((payload) => payload.data.created).length).toBe(1);
  expect(
    await db.employee.count({ where: { organizationId, candidateId: concurrentCandidate.id } }),
  ).toBe(1);
  const onboarding = (
    await (await page.request.get(`/api/v1/employees/${employee.id}`, { headers })).json()
  ).data.onboardingInstances[0];
  expect(onboarding.tasks).toHaveLength(2);
  const task = onboarding.tasks[0];
  const complete = await page.request.post(
    `/api/v1/onboarding/${onboarding.id}/tasks/${task.id}/complete`,
    { headers, data: { notes: "Verified in persisted workflow" } },
  );
  expect(complete.ok()).toBeTruthy();
  const progress = await page.request.get(`/api/v1/onboarding/${onboarding.id}`, {
    headers: { "x-organization-id": organizationId },
  });
  expect((await progress.json()).data.progress.completed).toBe(1);
  const status = await page.request.patch(`/api/v1/employees/${employee.id}/status`, {
    headers,
    data: { status: "ACTIVE", notes: "Started employment" },
  });
  expect(status.ok()).toBeTruthy();
  const asset = await page.request.post(`/api/v1/employees/${employee.id}/assets`, {
    headers,
    data: { assetType: "LAPTOP", identifier: `LAP-${suffix}` },
  });
  expect(asset.status()).toBe(201);
  const access = await page.request.post(`/api/v1/employees/${employee.id}/access`, {
    headers,
    data: { systemName: "HR Portal" },
  });
  expect(access.status()).toBe(201);

  const mentorCandidate = await db.candidate.create({
    data: {
      organizationId,
      referenceNo: `CAND-P5-M-${suffix}`,
      firstName: "Mentor",
      lastName: "Person",
      email: `mentor-${suffix}@example.test`,
      phone: `923${String(Date.now()).slice(-7)}`,
      roleOfInterest: requisition.title,
      source: "WALK_IN",
      status: "INTERVIEW",
      declarationAccepted: true,
      consentAccepted: true,
    },
  });
  const mentorApplication = await db.application.create({
    data: {
      organizationId,
      referenceNo: `APP-P5-M-${suffix}`,
      candidateId: mentorCandidate.id,
      requisitionId: requisition.id,
      status: "INTERVIEW",
    },
  });
  const mentorDecision = await db.hiringDecision.create({
    data: {
      organizationId,
      candidateId: mentorCandidate.id,
      applicationId: mentorApplication.id,
      decision: "HIRE",
      actorUserId: process.env.E2E_INTERVIEWER_ID!,
    },
  });
  const mentorOffer = await db.offer.create({
    data: {
      organizationId,
      candidateId: mentorCandidate.id,
      applicationId: mentorApplication.id,
      hiringDecisionId: mentorDecision.id,
      templateId: offerTemplate.id,
      status: "ACCEPTED",
      respondedAt: new Date(),
      createdByUserId: process.env.E2E_INTERVIEWER_ID!,
    },
  });
  void offer;
  void mentorOffer;
  const mentorConversion = await page.request.post(
    `/api/v1/candidates/${mentorCandidate.id}/convert-to-employee`,
    { headers, data: {} },
  );
  expect(mentorConversion.status()).toBe(201);
  const mentorEmployee = (await mentorConversion.json()).data.employee;
  const mentor = await page.request.post(`/api/v1/employees/${employee.id}/mentor`, {
    headers,
    data: { mentorId: mentorEmployee.id, notes: "Assigned for onboarding" },
  });
  expect(mentor.status()).toBe(201);
  const fileBody = "phase8-document";
  const upload = await page.request.post("/api/v1/documents/upload-url", {
    headers,
    data: {
      ownerType: "EMPLOYEE",
      ownerId: employee.id,
      fileName: "identity.pdf",
      contentType: "application/pdf",
      byteSize: fileBody.length,
    },
  });
  expect(upload.ok()).toBeTruthy();
  const uploadData = (await upload.json()).data;
  expect(
    (
      await page.request.put(uploadData.uploadUrl, {
        headers: { "content-type": "application/pdf" },
        data: fileBody,
      })
    ).ok(),
  ).toBeTruthy();
  const expiry = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);
  const retention = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  const documentResponse = await page.request.post("/api/v1/documents", {
    headers,
    data: {
      ownerType: "EMPLOYEE",
      ownerId: employee.id,
      documentType: "IDENTITY",
      title: "Phase 8 identity",
      expiresAt: expiry,
      retentionUntil: retention,
      objectKey: uploadData.objectKey,
      fileName: uploadData.fileName,
      contentType: uploadData.contentType,
      byteSize: uploadData.byteSize,
    },
  });
  expect(documentResponse.status()).toBe(201);
  const managedDocument = (await documentResponse.json()).data;
  expect(managedDocument.versions).toHaveLength(1);
  const crossTenantDocument = await page.request.get(
    `/api/v1/documents/${managedDocument.id}/download`,
    { headers: { "x-organization-id": otherOrganizationId } },
  );
  expect(crossTenantDocument.status()).toBe(404);
  expect(
    (
      await page.request.get(`/api/v1/documents/${managedDocument.id}/download`, {
        headers: { "x-organization-id": organizationId },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await page.request.patch(`/api/v1/documents/${managedDocument.id}`, {
        headers,
        data: { status: "DELETED" },
      })
    ).status(),
  ).toBe(409);
  const replacementBody = "phase8-document-version-2";
  const replacementUpload = await page.request.post("/api/v1/documents/upload-url", {
    headers,
    data: {
      ownerType: "EMPLOYEE",
      ownerId: employee.id,
      fileName: "identity-v2.pdf",
      contentType: "application/pdf",
      byteSize: replacementBody.length,
    },
  });
  expect(replacementUpload.ok()).toBeTruthy();
  const replacementData = (await replacementUpload.json()).data;
  expect(
    (
      await page.request.put(replacementData.uploadUrl, {
        headers: { "content-type": "application/pdf" },
        data: replacementBody,
      })
    ).ok(),
  ).toBeTruthy();
  const versionResponse = await page.request.post(
    `/api/v1/documents/${managedDocument.id}/versions`,
    {
      headers,
      data: {
        objectKey: replacementData.objectKey,
        fileName: replacementData.fileName,
        contentType: replacementData.contentType,
        byteSize: replacementData.byteSize,
      },
    },
  );
  expect(versionResponse.status()).toBe(201);
  expect((await versionResponse.json()).data.versionNumber).toBe(2);
  const versionDownload = await page.request.get(
    `/api/v1/documents/${managedDocument.id}/download?version=2`,
    { headers },
  );
  expect(versionDownload.ok()).toBeTruthy();
  expect((await versionDownload.json()).data.versionNumber).toBe(2);
  expect(
    (
      await page.request.post("/api/v1/reminders/generate", { headers, data: { withinDays: 30 } })
    ).ok(),
  ).toBeTruthy();
  const taskResponse = await page.request.post("/api/v1/tasks", {
    headers,
    data: {
      assignedToUserId: process.env.E2E_INTERVIEWER_ID,
      sourceType: "DOCUMENT",
      sourceId: managedDocument.id,
      title: "Verify expiring identity",
      priority: "HIGH",
    },
  });
  expect(taskResponse.status()).toBe(201);
  const workflowTask = (await taskResponse.json()).data;
  expect(
    (
      await page.request.patch(`/api/v1/tasks/${workflowTask.id}`, {
        headers,
        data: { status: "COMPLETED" },
      })
    ).ok(),
  ).toBeTruthy();
  await page.goto(`/hr/documents?organizationId=${organizationId}`);
  await expect(page.getByText("Phase 8 identity")).toBeVisible({ timeout: 20_000 });
  await page.goto(`/hr/notifications?organizationId=${organizationId}`);
  await expect(page.getByRole("heading", { name: "Notifications and tasks" })).toBeVisible();
  await expect(page.getByText("Verify expiring identity").first()).toBeVisible({ timeout: 20_000 });
  const audits = await db.auditLog.findMany({
    where: {
      organizationId,
      entityType: {
        in: [
          "Employee",
          "OnboardingInstance",
          "OnboardingTask",
          "OnboardingDocument",
          "OnboardingAsset",
          "SystemAccessProvisioning",
          "MentorAssignment",
          "Shift",
          "EmployeeShiftAssignment",
          "AttendanceRecord",
          "AttendanceCorrection",
          "Holiday",
          "LeaveType",
          "LeaveBalance",
          "LeaveRequest",
        ],
      },
    },
    select: { action: true },
  });
  expect(audits.map((audit) => audit.action)).toEqual(
    expect.arrayContaining([
      "CANDIDATE_CONVERTED_TO_EMPLOYEE",
      "ONBOARDING_CREATED",
      "ONBOARDING_TASK_COMPLETED",
      "EMPLOYEE_STATUS_CHANGED",
      "ONBOARDING_ASSET_ASSIGNED",
      "SYSTEM_ACCESS_REQUESTED",
      "MENTOR_ASSIGNED",
      "ONBOARDING_DOCUMENT_REQUESTED",
      "EMPLOYEE_SELF_SERVICE_UPDATED",
      "SHIFT_CREATED",
      "SHIFT_ASSIGNED",
      "EMPLOYEE_ATTENDANCE_CHECKED_IN",
      "EMPLOYEE_ATTENDANCE_CHECKED_OUT",
      "ATTENDANCE_CORRECTION_APPROVED",
      "HOLIDAY_CREATED",
      "LEAVE_TYPE_CREATED",
      "LEAVE_BALANCE_ALLOCATED",
      "LEAVE_REQUESTED",
      "LEAVE_APPROVED",
      "LEAVE_REJECTED",
      "LEAVE_BALANCE_CARRIED_FORWARD",
    ]),
  );
});
