import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const leaveRequestInclude = {
  employee: { select: { id: true, employeeNo: true, firstName: true, lastName: true, email: true, managerEmployeeId: true } },
  leaveType: true,
  approvals: { orderBy: { createdAt: "asc" as const }, include: { actor: { select: { id: true, name: true, email: true } } } },
  balanceTransactions: { orderBy: { createdAt: "asc" as const } },
  notifications: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.LeaveRequestInclude;

export function leaveWhere(organizationId: string, query: { employeeId?: string; status?: string; from?: string; to?: string; leaveTypeId?: string }) {
  return { organizationId, ...(query.employeeId ? { employeeId: query.employeeId } : {}), ...(query.status ? { status: query.status } : {}), ...(query.leaveTypeId ? { leaveTypeId: query.leaveTypeId } : {}), ...(query.from || query.to ? { startDate: { ...(query.to ? { lte: new Date(`${query.to}T00:00:00.000Z`) } : {}) }, endDate: { ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}) } } : {}) } satisfies Prisma.LeaveRequestWhereInput;
}

export async function listLeaveRequests(organizationId: string, query: { employeeId?: string; status?: string; from?: string; to?: string; page: number; pageSize: number }, permittedEmployeeIds?: string[]) {
  const where = { ...leaveWhere(organizationId, query), ...(permittedEmployeeIds ? { employeeId: { in: permittedEmployeeIds } } : {}) };
  const [items, total] = await db.$transaction([db.leaveRequest.findMany({ where, include: leaveRequestInclude, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.pageSize, take: query.pageSize }), db.leaveRequest.count({ where })]);
  return { items, total };
}

export async function listLeaveTypes(organizationId: string, activeOnly = true) { return db.leaveType.findMany({ where: { organizationId, ...(activeOnly ? { active: true } : {}) }, orderBy: { name: "asc" } }); }
export async function listLeaveBalances(organizationId: string, employeeId: string, periodYear?: number) { return db.leaveBalance.findMany({ where: { organizationId, employeeId, ...(periodYear ? { periodYear } : {}) }, include: { leaveType: true, transactions: { orderBy: { createdAt: "desc" }, take: 50 } }, orderBy: [{ periodYear: "desc" }, { leaveType: { name: "asc" } }] }); }
