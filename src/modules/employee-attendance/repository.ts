import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type AttendanceQuery = {
  employeeId?: string;
  status?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
  direction: "asc" | "desc";
};

const attendanceInclude = {
  employee: { select: { id: true, employeeNo: true, firstName: true, lastName: true, email: true } },
  shift: true,
  assignment: true,
  history: {
    orderBy: { createdAt: "desc" as const },
    include: { actor: { select: { id: true, name: true, email: true } } },
  },
  corrections: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.AttendanceRecordInclude;

export function attendanceWhere(organizationId: string, query: Pick<AttendanceQuery, "employeeId" | "status" | "from" | "to">) {
  return {
    organizationId,
    ...(query.employeeId ? { employeeId: query.employeeId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.from || query.to ? {
      workDate: {
        ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
        ...(query.to ? { lte: new Date(`${query.to}T00:00:00.000Z`) } : {}),
      },
    } : {}),
  } satisfies Prisma.AttendanceRecordWhereInput;
}

export async function getAttendance(organizationId: string, id: string) {
  return db.attendanceRecord.findFirst({ where: { id, organizationId }, include: attendanceInclude });
}

export async function listAttendance(organizationId: string, query: AttendanceQuery) {
  const where = attendanceWhere(organizationId, query);
  const [items, total] = await db.$transaction([
    db.attendanceRecord.findMany({
      where,
      include: attendanceInclude,
      orderBy: [{ workDate: query.direction }, { createdAt: query.direction }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    db.attendanceRecord.count({ where }),
  ]);
  return { items, total };
}

export async function summarizeAttendance(organizationId: string, query: Pick<AttendanceQuery, "employeeId" | "status" | "from" | "to">) {
  const records = await db.attendanceRecord.findMany({
    where: attendanceWhere(organizationId, query),
    select: { durationMinutes: true, overtimeMinutes: true, approvedOvertimeMinutes: true, status: true },
  });
  return records.reduce((summary, record) => ({
    durationMinutes: summary.durationMinutes + (record.durationMinutes ?? 0),
    overtimeMinutes: summary.overtimeMinutes + (record.approvedOvertimeMinutes ?? record.overtimeMinutes ?? 0),
    lateCount: summary.lateCount + (record.status === "LATE" ? 1 : 0),
    holidayCount: summary.holidayCount + (record.status === "HOLIDAY" ? 1 : 0),
  }), { durationMinutes: 0, overtimeMinutes: 0, lateCount: 0, holidayCount: 0 });
}

export async function calendarAttendance(organizationId: string, query: { from: string; to: string; employeeId?: string; status?: string }) {
  return db.attendanceRecord.findMany({
    where: attendanceWhere(organizationId, query),
    include: attendanceInclude,
    orderBy: [{ workDate: "asc" }, { employee: { employeeNo: "asc" } }],
  });
}

export async function listShifts(organizationId: string) {
  return db.shift.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
    include: { assignments: { where: { active: true }, include: { employee: { select: { id: true, employeeNo: true, firstName: true, lastName: true } } } } },
  });
}

export async function listHolidays(organizationId: string, from?: string, to?: string) {
  return db.holiday.findMany({
    where: {
      organizationId,
      active: true,
      ...(from || to ? { holidayDate: { ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}), ...(to ? { lte: new Date(`${to}T00:00:00.000Z`) } : {}) } } : {}),
    },
    orderBy: { holidayDate: "asc" },
  });
}

export async function listCorrections(organizationId: string, employeeId?: string) {
  return db.attendanceCorrection.findMany({
    where: { organizationId, ...(employeeId ? { employeeId } : {}) },
    orderBy: { createdAt: "desc" },
    include: { employee: { select: { employeeNo: true, firstName: true, lastName: true } }, attendanceRecord: true },
  });
}
