import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
test("persists salary, payroll, payslip, expense, audit and tenant boundaries", async ({
  page,
}) => {
  const db = new PrismaClient();
  const organizationId = process.env.E2E_ORGANIZATION_ID!,
    otherOrganizationId = process.env.E2E_OTHER_ORGANIZATION_ID!,
    candidateId = process.env.E2E_CANDIDATE_ID!,
    applicationId = process.env.E2E_APPLICATION_ID!,
    userId = process.env.E2E_INTERVIEWER_ID!;
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  let employee = await db.employee.findFirst({ where: { organizationId, email: user.email } });
  if (!employee)
    employee = await db.employee.create({
      data: {
        organizationId,
        candidateId,
        applicationId,
        employeeNo: `PAY-${Date.now()}`,
        firstName: "Payroll",
        lastName: "Employee",
        email: user.email,
        phone: "9000000000",
        jobTitle: "Analyst",
        joiningDate: new Date(),
        status: "ACTIVE",
      },
    });
  const login = await page.request.post("/api/auth/sign-in/email", {
    data: { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD },
  });
  expect(login.ok()).toBeTruthy();
  const headers = { "x-organization-id": organizationId };
  const salary = await page.request.post("/api/v1/salary-structures", {
    headers,
    data: {
      employeeId: employee.id,
      currency: "USD",
      basicSalary: 5000,
      components: [
        { name: "Allowance", type: "ALLOWANCE", amount: 500 },
        { name: "Deduction", type: "DEDUCTION", amount: 100 },
      ],
    },
  });
  expect(salary.status()).toBe(201);
  const start = `2026-${String((Date.now() % 9) + 1).padStart(2, "0")}-01`,
    end = start.slice(0, 8) + "28";
  const create = await page.request.post("/api/v1/payroll-runs", {
    headers,
    data: { periodStart: start, periodEnd: end, currency: "USD" },
  });
  expect(create.status()).toBe(201);
  const run = (await create.json()).data;
  for (const status of ["PREPARED", "REVIEWED", "APPROVED"]) {
    const r = await page.request.patch(`/api/v1/payroll-runs/${run.id}/status`, {
      headers,
      data: { status },
    });
    expect(r.ok()).toBeTruthy();
  }
  const stored = await db.payrollRun.findUniqueOrThrow({
    where: { id: run.id },
    include: { results: true },
  });
  expect(stored.status).toBe("APPROVED");
  expect(Number(stored.netTotal)).toBe(5400);
  const result = stored.results[0];
  expect(
    (await page.request.post(`/api/v1/payroll-results/${result.id}/generate`, { headers })).ok(),
  ).toBeTruthy();
  const pdf = await page.request.get(`/api/v1/payroll-results/${result.id}/download`, { headers });
  expect(pdf.headers()["content-type"]).toContain("application/pdf");
  const mine = await page.request.get("/api/v1/me/payslips", { headers });
  expect((await mine.json()).data).toHaveLength(1);
  const upload = await page.request.post("/api/v1/expenses/upload-url", {
    headers,
    data: { fileName: "receipt.pdf", contentType: "application/pdf", byteSize: 4 },
  });
  expect(upload.ok()).toBeTruthy();
  const uploadData = (await upload.json()).data;
  const put = await fetch(uploadData.uploadUrl, {
    method: "PUT",
    headers: { "content-type": "application/pdf" },
    body: Buffer.from("%PDF"),
  });
  expect(put.ok).toBeTruthy();
  const expenseResponse = await page.request.post("/api/v1/expenses", {
    headers,
    data: {
      category: "Travel",
      amount: 25,
      currency: "USD",
      expenseDate: "2026-08-18",
      notes: "Approved local travel",
      receiptObjectKey: uploadData.objectKey,
      receiptFileName: "receipt.pdf",
      receiptContentType: "application/pdf",
      receiptByteSize: 4,
    },
  });
  expect(expenseResponse.status()).toBe(201);
  const expense = (await expenseResponse.json()).data;
  expect(
    (
      await page.request.patch(`/api/v1/expenses/${expense.id}/decision`, {
        headers,
        data: { status: "APPROVED" },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await page.request.patch(`/api/v1/expenses/${expense.id}/payment`, {
        headers,
        data: { status: "PROCESSING" },
      })
    ).ok(),
  ).toBeTruthy();
  expect(
    (
      await page.request.patch(`/api/v1/expenses/${expense.id}/payment`, {
        headers,
        data: { status: "PAID" },
      })
    ).ok(),
  ).toBeTruthy();
  const cross = await page.request.get("/api/v1/payroll-runs", {
    headers: { "x-organization-id": otherOrganizationId },
  });
  expect(cross.status()).toBe(200);
  expect((await cross.json()).data).toHaveLength(0);
  expect(
    await db.auditLog.count({
      where: {
        organizationId,
        entityType: { in: ["SalaryStructure", "PayrollRun", "PayrollResult", "Expense"] },
      },
    }),
  ).toBeGreaterThanOrEqual(8);
  await db.$disconnect();
});
