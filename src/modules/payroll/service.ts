import { Prisma } from "@prisma/client";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { writeAuditEvent } from "@/lib/audit";
import { AppError, forbiddenError, notFoundError } from "@/lib/errors";
import { createDownloadUrl, createUploadUrl, verifyStoredObject } from "@/lib/storage";

type Component = {
  name: string;
  type: "ALLOWANCE" | "DEDUCTION" | "INCENTIVE" | "OTHER";
  amount: number;
};
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
async function employee(organizationId: string, id: string) {
  const row = await db.employee.findFirst({ where: { id, organizationId } });
  if (!row) throw notFoundError();
  return row;
}
async function self(organizationId: string, email: string) {
  const row = await db.employee.findFirst({
    where: { organizationId, email: { equals: email } },
  });
  if (!row) throw forbiddenError();
  return row;
}
export function calculateAmounts(basic: number, components: Component[]) {
  const additions = components
    .filter((x) => x.type !== "DEDUCTION")
    .reduce((s, x) => s + x.amount, 0);
  const deductions = components
    .filter((x) => x.type === "DEDUCTION")
    .reduce((s, x) => s + x.amount, 0);
  return { gross: basic + additions, deductions, net: basic + additions - deductions };
}

export async function saveSalary(input: {
  organizationId: string;
  actorUserId: string;
  employeeId: string;
  currency: string;
  basicSalary: number;
  components: Component[];
  requestId?: string;
}) {
  await employee(input.organizationId, input.employeeId);
  return db.$transaction(async (tx) => {
    const old = await tx.salaryStructure.findUnique({
      where: {
        organizationId_employeeId: {
          organizationId: input.organizationId,
          employeeId: input.employeeId,
        },
      },
    });
    const row = await tx.salaryStructure.upsert({
      where: {
        organizationId_employeeId: {
          organizationId: input.organizationId,
          employeeId: input.employeeId,
        },
      },
      update: {
        currency: input.currency,
        basicSalary: input.basicSalary,
        components: input.components,
      },
      create: {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        currency: input.currency,
        basicSalary: input.basicSalary,
        components: input.components,
        createdByUserId: input.actorUserId,
      },
    });
    await tx.employeeHistory.create({
      data: {
        organizationId: input.organizationId,
        employeeId: input.employeeId,
        eventType: "SALARY_STRUCTURE_CHANGED",
        actorUserId: input.actorUserId,
        fromValue: old ? "EXISTING" : null,
        toValue: "ACTIVE",
        notes: `Currency ${input.currency}; ${input.components.length} components`,
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "SALARY_STRUCTURE_CHANGED",
      entityType: "SalaryStructure",
      entityId: row.id,
      requestId: input.requestId,
    });
    return row;
  });
}
export const listSalary = (organizationId: string) =>
  db.salaryStructure.findMany({
    where: { organizationId },
    include: { employee: { select: { employeeNo: true, firstName: true, lastName: true } } },
    orderBy: { updatedAt: "desc" },
  });
export async function createRun(input: {
  organizationId: string;
  actorUserId: string;
  periodStart: string;
  periodEnd: string;
  currency: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const row = await tx.payrollRun.create({
      data: {
        organizationId: input.organizationId,
        periodStart: day(input.periodStart),
        periodEnd: day(input.periodEnd),
        currency: input.currency,
        createdByUserId: input.actorUserId,
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "PAYROLL_RUN_CREATED",
      entityType: "PayrollRun",
      entityId: row.id,
      requestId: input.requestId,
    });
    return row;
  });
}
export const listRuns = (organizationId: string) =>
  db.payrollRun.findMany({
    where: { organizationId },
    include: {
      results: {
        include: { employee: { select: { employeeNo: true, firstName: true, lastName: true } } },
      },
    },
    orderBy: { periodStart: "desc" },
  });
export async function setRunState(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
  status: "PREPARED" | "REVIEWED" | "APPROVED";
  requestId?: string;
}) {
  return db.$transaction(
    async (tx) => {
      const run = await tx.payrollRun.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
      });
      if (!run) throw notFoundError();
      const allowed: Record<string, string> = {
        DRAFT: "PREPARED",
        PREPARED: "REVIEWED",
        REVIEWED: "APPROVED",
      };
      if (allowed[run.status] !== input.status)
        throw new AppError("CONFLICT", "Invalid payroll transition", 409);
      if (input.status === "PREPARED") {
        const structures = await tx.salaryStructure.findMany({
          where: { organizationId: input.organizationId, active: true, currency: run.currency },
        });
        if (!structures.length)
          throw new AppError("CONFLICT", "No eligible salary structures", 409);
        let gross = 0,
          deductions = 0,
          net = 0;
        for (const structure of structures) {
          const components = structure.components as Component[];
          const amounts = calculateAmounts(Number(structure.basicSalary), components);
          gross += amounts.gross;
          deductions += amounts.deductions;
          net += amounts.net;
          await tx.payrollResult.create({
            data: {
              organizationId: input.organizationId,
              payrollRunId: run.id,
              employeeId: structure.employeeId,
              currency: structure.currency,
              basicSalary: structure.basicSalary,
              components,
              grossAmount: amounts.gross,
              deductionAmount: amounts.deductions,
              netAmount: amounts.net,
            },
          });
        }
        await tx.payrollRun.update({
          where: { id: run.id },
          data: { grossTotal: gross, deductionTotal: deductions, netTotal: net },
        });
      }
      const updated = await tx.payrollRun.update({
        where: { id: run.id },
        data: {
          status: input.status,
          ...(input.status === "REVIEWED"
            ? { reviewedByUserId: input.actorUserId, reviewedAt: new Date() }
            : {}),
          ...(input.status === "APPROVED"
            ? { approvedByUserId: input.actorUserId, approvedAt: new Date() }
            : {}),
        },
      });
      await writeAuditEvent(tx, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: `PAYROLL_${input.status}`,
        entityType: "PayrollRun",
        entityId: run.id,
        requestId: input.requestId,
      });
      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
async function result(organizationId: string, id: string) {
  const row = await db.payrollResult.findFirst({
    where: { id, organizationId },
    include: { payrollRun: true, employee: true },
  });
  if (!row || row.payrollRun.status !== "APPROVED") throw notFoundError();
  return row;
}
export async function generatePayslip(input: {
  organizationId: string;
  actorUserId: string;
  resultId: string;
  requestId?: string;
}) {
  const row = await result(input.organizationId, input.resultId);
  return db.$transaction(async (tx) => {
    const updated = await tx.payrollResult.update({
      where: { id: row.id },
      data: {
        payslipObjectKey: `organizations/${input.organizationId}/payslips/${row.id}.pdf`,
        payslipFileName: `payslip-${row.employee.employeeNo}.pdf`,
        payslipGeneratedAt: new Date(),
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "PAYSLIP_GENERATED",
      entityType: "PayrollResult",
      entityId: row.id,
      requestId: input.requestId,
    });
    return updated;
  });
}
export async function payslipPdf(input: {
  organizationId: string;
  actorUserId: string;
  resultId: string;
  requestId?: string;
  employeeEmail?: string;
}) {
  const row = await result(input.organizationId, input.resultId);
  if (input.employeeEmail && row.employee.email.toLowerCase() !== input.employeeEmail.toLowerCase())
    throw forbiddenError();
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  [
    `HR Portal Payslip`,
    `${row.employee.firstName} ${row.employee.lastName} (${row.employee.employeeNo})`,
    `Period: ${row.payrollRun.periodStart.toISOString().slice(0, 10)} to ${row.payrollRun.periodEnd.toISOString().slice(0, 10)}`,
    `Basic: ${row.currency} ${row.basicSalary}`,
    `Gross: ${row.currency} ${row.grossAmount}`,
    `Deductions: ${row.currency} ${row.deductionAmount}`,
    `Net: ${row.currency} ${row.netAmount}`,
  ].forEach((line, i) => page.drawText(line, { x: 60, y: 780 - i * 34, size: i ? 12 : 20, font }));
  await db.$transaction((tx) =>
    writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "PAYSLIP_DOWNLOADED",
      entityType: "PayrollResult",
      entityId: row.id,
      requestId: input.requestId,
    }),
  );
  return {
    bytes: await pdf.save(),
    fileName: row.payslipFileName || `payslip-${row.employee.employeeNo}.pdf`,
  };
}
export async function myPayslips(organizationId: string, email: string) {
  const mine = await self(organizationId, email);
  return db.payrollResult.findMany({
    where: { organizationId, employeeId: mine.id, payrollRun: { status: "APPROVED" } },
    include: { payrollRun: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function expenseUpload(input: {
  organizationId: string;
  userId: string;
  fileName: string;
  contentType: string;
}) {
  const objectKey = `organizations/${input.organizationId}/expenses/${input.userId}/${randomUUID()}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  return {
    objectKey,
    uploadUrl: await createUploadUrl(objectKey, input.contentType),
    expiresIn: 900,
  };
}
export async function submitExpense(input: {
  organizationId: string;
  actorUserId: string;
  userEmail: string;
  category: string;
  amount: number;
  currency: string;
  expenseDate: string;
  notes: string;
  receiptObjectKey: string;
  receiptFileName: string;
  receiptContentType: string;
  receiptByteSize: number;
  requestId?: string;
}) {
  const mine = await self(input.organizationId, input.userEmail);
  if (
    !input.receiptObjectKey.startsWith(
      `organizations/${input.organizationId}/expenses/${input.actorUserId}/`,
    )
  )
    throw forbiddenError();
  await verifyStoredObject(input.receiptObjectKey, input.receiptContentType, input.receiptByteSize);
  return db.$transaction(async (tx) => {
    const row = await tx.expense.create({
      data: {
        organizationId: input.organizationId,
        employeeId: mine.id,
        category: input.category,
        amount: input.amount,
        currency: input.currency,
        expenseDate: day(input.expenseDate),
        notes: input.notes,
        receiptObjectKey: input.receiptObjectKey,
        receiptFileName: input.receiptFileName,
        receiptContentType: input.receiptContentType,
        receiptByteSize: input.receiptByteSize,
        submittedByUserId: input.actorUserId,
      },
    });
    await tx.expenseHistory.create({
      data: {
        organizationId: input.organizationId,
        expenseId: row.id,
        action: "SUBMITTED",
        toStatus: "PENDING",
        actorUserId: input.actorUserId,
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "EXPENSE_SUBMITTED",
      entityType: "Expense",
      entityId: row.id,
      requestId: input.requestId,
    });
    return row;
  });
}
export const listExpenses = (organizationId: string) =>
  db.expense.findMany({
    where: { organizationId },
    include: {
      employee: { select: { employeeNo: true, firstName: true, lastName: true } },
      history: {
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
export async function myExpenses(organizationId: string, email: string) {
  const mine = await self(organizationId, email);
  return db.expense.findMany({
    where: { organizationId, employeeId: mine.id },
    include: { history: true },
    orderBy: { createdAt: "desc" },
  });
}
export async function decideExpense(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
  status: "APPROVED" | "REJECTED";
  reason?: string;
  requestId?: string;
}) {
  return db.$transaction(
    async (tx) => {
      const row = await tx.expense.findFirst({
        where: { id: input.id, organizationId: input.organizationId },
      });
      if (!row) throw notFoundError();
      if (row.approvalStatus !== "PENDING")
        throw new AppError("CONFLICT", "Expense has already been decided", 409);
      const updated = await tx.expense.update({
        where: { id: row.id },
        data: {
          approvalStatus: input.status,
          decidedByUserId: input.actorUserId,
          decisionReason: input.reason,
          decidedAt: new Date(),
        },
      });
      await tx.expenseHistory.create({
        data: {
          organizationId: input.organizationId,
          expenseId: row.id,
          action: input.status,
          fromStatus: row.approvalStatus,
          toStatus: input.status,
          actorUserId: input.actorUserId,
          reason: input.reason,
        },
      });
      await writeAuditEvent(tx, {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId,
        action: `EXPENSE_${input.status}`,
        entityType: "Expense",
        entityId: row.id,
        requestId: input.requestId,
      });
      return updated;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
export async function payExpense(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
  status: "PROCESSING" | "PAID";
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const row = await tx.expense.findFirst({
      where: { id: input.id, organizationId: input.organizationId },
    });
    if (!row) throw notFoundError();
    if (
      row.approvalStatus !== "APPROVED" ||
      (input.status === "PROCESSING" && row.paymentStatus !== "UNPAID") ||
      (input.status === "PAID" && row.paymentStatus !== "PROCESSING")
    )
      throw new AppError("CONFLICT", "Invalid expense payment transition", 409);
    const updated = await tx.expense.update({
      where: { id: row.id },
      data: {
        paymentStatus: input.status,
        paidByUserId: input.actorUserId,
        ...(input.status === "PAID" ? { paidAt: new Date() } : {}),
      },
    });
    await tx.expenseHistory.create({
      data: {
        organizationId: input.organizationId,
        expenseId: row.id,
        action: `PAYMENT_${input.status}`,
        fromStatus: row.paymentStatus,
        toStatus: input.status,
        actorUserId: input.actorUserId,
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: `EXPENSE_PAYMENT_${input.status}`,
      entityType: "Expense",
      entityId: row.id,
      requestId: input.requestId,
    });
    return updated;
  });
}
export async function receiptDownload(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
  requestId?: string;
  employeeEmail?: string;
}) {
  const row = await db.expense.findFirst({
    where: { id: input.id, organizationId: input.organizationId },
    include: { employee: { select: { email: true } } },
  });
  if (!row) throw notFoundError();
  if (input.employeeEmail && row.employee.email.toLowerCase() !== input.employeeEmail.toLowerCase())
    throw forbiddenError();
  await db.$transaction((tx) =>
    writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "EXPENSE_RECEIPT_DOWNLOADED",
      entityType: "Expense",
      entityId: row.id,
      requestId: input.requestId,
    }),
  );
  return createDownloadUrl(row.receiptObjectKey);
}
export async function payrollReport(organizationId: string) {
  const [runs, expenses, approved, results] = await Promise.all([
    db.payrollRun.aggregate({
      where: { organizationId },
      _sum: { grossTotal: true, deductionTotal: true, netTotal: true },
      _count: true,
    }),
    db.expense.aggregate({ where: { organizationId }, _sum: { amount: true }, _count: true }),
    db.expense.findMany({
      where: { organizationId, decidedAt: { not: null } },
      select: { createdAt: true, decidedAt: true },
    }),
    db.payrollResult.findMany({
      where: { organizationId },
      select: { components: true, overtimeMinutes: true },
    }),
  ]);
  const componentTotals: Record<string, number> = {};
  for (const result of results)
    for (const component of result.components as Component[])
      componentTotals[component.name] = (componentTotals[component.name] || 0) + component.amount;
  return {
    payrollRuns: runs._count,
    grossTotal: runs._sum.grossTotal || 0,
    deductionTotal: runs._sum.deductionTotal || 0,
    netTotal: runs._sum.netTotal || 0,
    componentTotals,
    overtimeMinutes: results.reduce((sum, item) => sum + item.overtimeMinutes, 0),
    expenseCount: expenses._count,
    expenseTotal: expenses._sum.amount || 0,
    averageExpenseApprovalHours: approved.length
      ? approved.reduce(
          (sum, x) => sum + ((x.decidedAt?.getTime() || 0) - x.createdAt.getTime()) / 3_600_000,
          0,
        ) / approved.length
      : 0,
  };
}
