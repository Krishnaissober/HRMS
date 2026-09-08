import { db } from "@/lib/db";
import { forbiddenError } from "@/lib/errors";
import { recruitmentDashboard } from "@/modules/dashboards/service";
import type { AnalyticsDomain, AnalyticsQuery } from "@/modules/analytics/schemas";

const DAY = 86_400_000;
const inactiveEmployeeStatuses = ["EXITED", "INACTIVE"];

export type AnalyticsActor = { userId: string; email: string };
export type AnalyticsScope = { employeeIds?: string[]; recruiterRestricted?: boolean };

function percent(numerator: number, denominator: number) {
  return denominator ? Number(((numerator / denominator) * 100).toFixed(1)) : 0;
}

function average(values: number[]) {
  return values.length
    ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
    : null;
}

function zonedInstant(date: string, endExclusive: boolean, timezone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day + (endExclusive ? 1 : 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(target));
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]),
  );
  const represented = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );
  return new Date(target - (represented - target));
}

export function analyticsDateRange(
  query: Pick<AnalyticsQuery, "from" | "to">,
  timezone: string,
  fallbackToNow = false,
): { gte?: Date; lt?: Date; lte?: Date } {
  new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  return {
    ...(query.from ? { gte: zonedInstant(query.from, false, timezone) } : {}),
    ...(query.to
      ? { lt: zonedInstant(query.to, true, timezone) }
      : fallbackToNow
        ? { lte: new Date() }
        : {}),
  };
}

function dateFilter(query: AnalyticsQuery, field: string, timezone: string) {
  const value = analyticsDateRange(query, timezone);
  return Object.keys(value).length ? { [field]: value } : {};
}

function dateKey(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day}`;
}

export function temporalGroups(rows: Array<{ date: Date; status: string }>, timezone: string) {
  const grouped = new Map<string, number>();
  for (const row of rows) {
    const key = `${dateKey(row.date, timezone)}\u0000${row.status}`;
    grouped.set(key, (grouped.get(key) ?? 0) + 1);
  }
  return [...grouped.entries()]
    .map(([key, count]) => {
      const [date, status] = key.split("\u0000");
      return { date, status, count };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.status.localeCompare(b.status));
}

export function employeeStatusAtEnd(
  employee: { status: string; history: Array<{ fromValue: string | null; effectiveDate: Date }> },
  endExclusive?: Date,
) {
  if (!endExclusive) return employee.status;
  return (
    employee.history.find((event) => event.effectiveDate >= endExclusive)?.fromValue ??
    employee.status
  );
}

export function aggregateSalaryComponents(rows: Array<{ components: unknown }>) {
  const components = new Map<string, number>();
  for (const result of rows) {
    if (Array.isArray(result.components)) {
      for (const component of result.components) {
        if (component && typeof component === "object" && !Array.isArray(component)) {
          const value = component as Record<string, unknown>;
          if (typeof value.name === "string" && typeof value.amount === "number")
            components.set(value.name, (components.get(value.name) ?? 0) + value.amount);
        }
      }
    }
  }
  return [...components.entries()].map(([label, total]) => ({ label, total }));
}

export async function resolveAnalyticsScope(
  organizationId: string,
  actor?: AnalyticsActor,
): Promise<AnalyticsScope> {
  if (!actor) return {};
  const membership = await db.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId: actor.userId } },
    include: { roles: { include: { role: true } } },
  });
  const roleKeys =
    membership?.roles.flatMap(({ role }) => [role.slug.toLowerCase(), role.name.toLowerCase()]) ??
    [];
  const isHr = roleKeys.some(
    (value) =>
      value === "hr-administrator" ||
      value === "hr-admin" ||
      value === "hr-manager" ||
      value === "local-admin" ||
      value.includes("e2e hr"),
  );
  if (!isHr && roleKeys.some((value) => value === "manager")) {
    const manager = await db.employee.findFirst({
      where: { organizationId, email: { equals: actor.email } },
      select: { id: true },
    });
    if (!manager) return { employeeIds: [] };
    const reports = await db.employee.findMany({
      where: { organizationId, managerEmployeeId: manager.id },
      select: { id: true },
    });
    return { employeeIds: reports.map((item) => item.id) };
  }
  if (!isHr && roleKeys.some((value) => value === "recruiter"))
    return { recruiterRestricted: true };
  return {};
}

export function scopedEmployeeWhere(query: AnalyticsQuery, scope: AnalyticsScope) {
  if (query.employeeId && scope.employeeIds && !scope.employeeIds.includes(query.employeeId))
    throw forbiddenError();
  if (query.employeeId) return { id: query.employeeId };
  if (scope.employeeIds) return { id: { in: scope.employeeIds } };
  return {};
}

function countGroups(rows: Array<Record<string, unknown>>, key: string) {
  const groups = new Map<string, number>();
  for (const row of rows) {
    const value = String(row[key] ?? "Unspecified");
    groups.set(value, (groups.get(value) ?? 0) + 1);
  }
  return [...groups.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function sumNumbers(values: Array<number | null | undefined>) {
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

export function calculateAttendanceRates(input: {
  total: number;
  present: number;
  absent: number;
  late: number;
}) {
  return {
    attendanceRate: percent(input.present, input.total),
    absenteeismRate: percent(input.absent, input.total),
    lateArrivalRate: percent(input.late, input.total),
  };
}

export function calculateCompletion(input: { total: number; completed: number }) {
  return percent(input.completed, input.total);
}

async function recruitment(organizationId: string, query: AnalyticsQuery, scope: AnalyticsScope) {
  if (scope.recruiterRestricted) throw forbiddenError();
  const data = await recruitmentDashboard(organizationId, query);
  return {
    domain: "recruitment",
    ...data,
    candidateConversionRateByStage: Object.entries(data.pipelineCounts).map(([stage, count]) => ({
      stage,
      count,
      rate: percent(count, data.applications),
    })),
    drilldowns: {
      applications: "/hr/candidates",
      interviews: "/hr/interviews",
      offers: "/hr/offers",
      openPositions: "/hr/recruitment/dashboard#open-positions",
    },
  };
}

async function workforce(
  organizationId: string,
  query: AnalyticsQuery,
  timezone: string,
  scope: AnalyticsScope,
) {
  const employeeScope = scopedEmployeeWhere(query, scope);
  const where = {
    organizationId,
    ...(query.department ? { department: query.department } : {}),
    ...employeeScope,
    ...(query.to ? { joiningDate: { lt: analyticsDateRange(query, timezone).lt } } : {}),
  };
  const employees = await db.employee.findMany({
    where,
    select: {
      id: true,
      department: true,
      location: true,
      employmentType: true,
      joiningDate: true,
      confirmationDate: true,
      status: true,
      history: {
        where: { eventType: "STATUS_CHANGED" },
        select: { fromValue: true, toValue: true, effectiveDate: true },
        orderBy: { effectiveDate: "asc" },
      },
    },
  });
  const period = analyticsDateRange(query, timezone);
  const inPeriod = (date: Date | null) =>
    Boolean(date && (!period.gte || date >= period.gte) && (!period.lt || date < period.lt));
  const joiners = employees.filter((employee) => inPeriod(employee.joiningDate)).length;
  const leavers = employees.filter(
    (employee) =>
      employee.history.some(
        (event) =>
          inPeriod(event.effectiveDate) && inactiveEmployeeStatuses.includes(event.toValue ?? ""),
      ) ||
      (!query.from && !query.to && inactiveEmployeeStatuses.includes(employee.status)),
  ).length;
  const confirmed = employees.filter(
    (employee) => employee.status === "CONFIRMED" || Boolean(employee.confirmationDate),
  ).length;
  const tenureDays = employees.map((employee) =>
    Math.max(
      0,
      ((period.lt ? new Date(period.lt.getTime() - 1) : new Date()).getTime() -
        employee.joiningDate.getTime()) /
        DAY,
    ),
  );
  return {
    domain: "workforce",
    filters: query,
    headcount: employees.filter(
      (employee) => !inactiveEmployeeStatuses.includes(employeeStatusAtEnd(employee, period.lt)),
    ).length,
    totalEmployeeRecords: employees.length,
    departmentDistribution: countGroups(employees, "department"),
    locationDistribution: countGroups(employees, "location"),
    employmentTypeDistribution: countGroups(employees, "employmentType"),
    averageTenureDays: average(tenureDays),
    joiners,
    leavers,
    turnoverRate: percent(leavers, employees.length),
    probationCompletionRate: percent(confirmed, employees.length),
    definitions: {
      turnoverRate: "Exited or inactive employee records divided by employee records in scope",
      probationCompletionRate: "Confirmed employee records divided by employee records in scope",
      tenure: "Days from joining date to the selected period end, or current date",
    },
    drilldowns: { employees: "/hr/employees" },
  };
}

async function attendance(
  organizationId: string,
  query: AnalyticsQuery,
  timezone: string,
  scope: AnalyticsScope,
) {
  const employeeScope = scopedEmployeeWhere(query, scope);
  const employeeWhere = {
    organizationId,
    ...(employeeScope.id ? { employeeId: employeeScope.id } : {}),
    ...(query.department ? { employee: { department: query.department } } : {}),
    ...dateFilter(query, "workDate", timezone),
  };
  if (scope.employeeIds && !query.employeeId)
    Object.assign(employeeWhere, { employeeId: { in: scope.employeeIds } });
  const candidateVisitWhere = { organizationId, ...dateFilter(query, "visitDate", timezone) };
  const interviewWhere = { organizationId, ...dateFilter(query, "scheduledStart", timezone) };
  const [
    records,
    corrections,
    interviewAttendance,
    candidateNoShows,
    checkInVolumes,
    visitHistoryCount,
  ] = await db.$transaction([
    db.attendanceRecord.findMany({
      where: employeeWhere,
      select: {
        status: true,
        overtimeMinutes: true,
        approvedOvertimeMinutes: true,
        workDate: true,
        employee: { select: { department: true } },
      },
    }),
    db.attendanceCorrection.count({
      where: {
        organizationId,
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        ...dateFilter(query, "createdAt", timezone),
      },
    }),
    db.candidateVisit.count({
      where: { ...candidateVisitWhere, interviewId: { not: null }, checkedInAt: { not: null } },
    }),
    db.interview.count({ where: { ...interviewWhere, status: "NO_SHOW" } }),
    db.candidateVisit.count({ where: { ...candidateVisitWhere, checkedInAt: { not: null } } }),
    db.candidateVisit.count({ where: candidateVisitWhere }),
  ]);
  const present = records.filter((row) => ["PRESENT", "LATE", "WFH"].includes(row.status)).length;
  const absent = records.filter((row) => row.status === "ABSENT").length;
  const late = records.filter((row) => row.status === "LATE").length;
  const rates = calculateAttendanceRates({ total: records.length, present, absent, late });
  return {
    domain: "attendance",
    filters: query,
    employee: {
      totalRecords: records.length,
      statusTrends: temporalGroups(
        records.map((row) => ({ date: row.workDate, status: row.status })),
        timezone,
      ),
      departmentComparisons: countGroups(
        records.map((row) => ({ department: row.employee.department })),
        "department",
      ),
      correctionVolumes: corrections,
      overtimeMinutes: sumNumbers(
        records.map((row) => row.approvedOvertimeMinutes ?? row.overtimeMinutes),
      ),
      ...rates,
    },
    candidate: {
      interviewAttendance,
      noShows: candidateNoShows,
      checkInVolumes,
      visitHistoryCount,
    },
    drilldowns: {
      employeeAttendance: "/hr/employee-attendance",
      corrections: "/hr/employee-attendance/manage",
      candidateAttendance: "/hr/visitors",
    },
  };
}

async function leave(
  organizationId: string,
  query: AnalyticsQuery,
  timezone: string,
  scope: AnalyticsScope,
) {
  const employeeScope = scopedEmployeeWhere(query, scope);
  const requestEmployeeWhere = employeeScope.id
    ? { employeeId: employeeScope.id }
    : scope.employeeIds
      ? { employeeId: { in: scope.employeeIds } }
      : {};
  const selectedRange = analyticsDateRange(query, timezone);
  const requests = await db.leaveRequest.findMany({
    where: {
      organizationId,
      ...requestEmployeeWhere,
      ...(query.department ? { employee: { department: query.department } } : {}),
      ...(query.from || query.to
        ? {
            startDate: { ...(selectedRange.lt ? { lt: selectedRange.lt } : {}) },
            endDate: { ...(selectedRange.gte ? { gte: selectedRange.gte } : {}) },
          }
        : {}),
    },
    select: { status: true, durationDays: true, startDate: true, createdAt: true, decidedAt: true },
  });
  const approvalRequests = await db.leaveRequest.findMany({
    where: {
      organizationId,
      ...requestEmployeeWhere,
      decidedAt: analyticsDateRange(query, timezone),
    },
    select: { createdAt: true, decidedAt: true },
  });
  const balanceYear = query.to
    ? Number(query.to.slice(0, 4))
    : query.from
      ? Number(query.from.slice(0, 4))
      : undefined;
  const balances = await db.leaveBalance.findMany({
    where: {
      organizationId,
      ...requestEmployeeWhere,
      ...(query.department ? { employee: { department: query.department } } : {}),
      ...(balanceYear ? { periodYear: balanceYear } : {}),
    },
    select: { allocatedDays: true, carriedDays: true, usedDays: true },
  });
  const allocated = balances.reduce((sum, row) => sum + Number(row.allocatedDays), 0);
  const carried = balances.reduce((sum, row) => sum + Number(row.carriedDays), 0);
  const used = balances.reduce((sum, row) => sum + Number(row.usedDays), 0);
  const approvalDays = approvalRequests.flatMap((request) =>
    request.decidedAt
      ? [Math.max(0, (request.decidedAt.getTime() - request.createdAt.getTime()) / DAY)]
      : [],
  );
  return {
    domain: "leave",
    filters: query,
    requestTrends: temporalGroups(
      requests.map((request) => ({ date: request.startDate, status: request.status })),
      timezone,
    ),
    utilizationDays: used,
    utilizationRate: percent(used, allocated + carried),
    balances: {
      allocatedDays: allocated,
      carriedDays: carried,
      usedDays: used,
      availableDays: allocated + carried - used,
    },
    approvalCycleDays: average(approvalDays),
    drilldowns: { requests: "/hr/leave/manage", balances: "/hr/leave" },
  };
}

async function hr(organizationId: string, query: AnalyticsQuery, timezone: string) {
  const now = new Date();
  const [instances, tasks, documents, workflowTasks, expiryRiskCount] = await db.$transaction([
    db.onboardingInstance.findMany({
      where: { organizationId, ...dateFilter(query, "createdAt", timezone) },
      select: { status: true, startedAt: true, completedAt: true },
    }),
    db.onboardingTask.findMany({
      where: { organizationId, ...dateFilter(query, "createdAt", timezone) },
      select: { status: true, dueDate: true },
    }),
    db.onboardingDocument.findMany({
      where: { organizationId, ...dateFilter(query, "createdAt", timezone) },
      select: { status: true },
    }),
    db.workflowTask.findMany({
      where: { organizationId, ...dateFilter(query, "completedAt", timezone) },
      select: { createdAt: true, completedAt: true, status: true },
    }),
    db.managedDocument.count({
      where: {
        organizationId,
        status: "ACTIVE",
        deletedAt: null,
        expiresAt: analyticsDateRange(query, timezone, true),
      },
    }),
  ]);
  const completedInstances = instances.filter((item) => item.status === "COMPLETED");
  const readinessDays = completedInstances.flatMap((item) =>
    item.completedAt
      ? [
          Math.max(
            0,
            (item.completedAt.getTime() - (item.startedAt ?? item.completedAt).getTime()) / DAY,
          ),
        ]
      : [],
  );
  const completedTasks = tasks.filter((task) => task.status === "COMPLETED").length;
  const overdueTasks = tasks.filter(
    (task) => task.status !== "COMPLETED" && task.dueDate && task.dueDate < now,
  ).length;
  const completedDocuments = documents.filter((doc) => doc.status === "VERIFIED").length;
  const resolutionDays = workflowTasks.flatMap((task) =>
    task.completedAt
      ? [Math.max(0, (task.completedAt.getTime() - task.createdAt.getTime()) / DAY)]
      : [],
  );
  return {
    domain: "hr",
    filters: query,
    onboarding: {
      instanceCount: instances.length,
      completionRate: calculateCompletion({
        total: instances.length,
        completed: completedInstances.length,
      }),
      averageCompletionDays: average(readinessDays),
      timeToReadinessDays: average(readinessDays),
      taskCompletionRate: calculateCompletion({ total: tasks.length, completed: completedTasks }),
      overdueTasks,
      documentCompletionRate: calculateCompletion({
        total: documents.length,
        completed: completedDocuments,
      }),
    },
    hrRequests: {
      total: workflowTasks.length,
      resolutionTimeDays: average(resolutionDays),
      definition: "Workflow task creation to completion for completed tasks",
    },
    documentExpiryRiskCount: expiryRiskCount,
    definitions: {
      documentExpiryRisk:
        "Active documents expiring within the selected date range, or by now when no end date is selected",
    },
    drilldowns: {
      onboarding: "/hr/onboarding",
      documents: "/hr/documents",
      tasks: "/hr/notifications",
    },
  };
}

async function payroll(organizationId: string, query: AnalyticsQuery, timezone: string) {
  const [runs, results, expenses] = await db.$transaction([
    db.payrollRun.findMany({
      where: { organizationId, ...dateFilter(query, "periodStart", timezone) },
      select: {
        status: true,
        currency: true,
        grossTotal: true,
        deductionTotal: true,
        netTotal: true,
        createdAt: true,
        approvedAt: true,
      },
    }),
    db.payrollResult.findMany({
      where: {
        organizationId,
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        payrollRun: dateFilter(query, "periodStart", timezone),
      },
      select: {
        currency: true,
        basicSalary: true,
        grossAmount: true,
        deductionAmount: true,
        netAmount: true,
        overtimeMinutes: true,
        components: true,
      },
    }),
    db.expense.findMany({
      where: {
        organizationId,
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        ...dateFilter(query, "expenseDate", timezone),
      },
      select: {
        amount: true,
        currency: true,
        category: true,
        approvalStatus: true,
        createdAt: true,
        decidedAt: true,
      },
    }),
  ]);
  const approvalDays = expenses.flatMap((item) =>
    item.decidedAt
      ? [Math.max(0, (item.decidedAt.getTime() - item.createdAt.getTime()) / DAY)]
      : [],
  );
  const components = aggregateSalaryComponents(results);
  return {
    domain: "payroll",
    filters: query,
    payrollTotals: runs.map((run) => ({
      currency: run.currency,
      gross: Number(run.grossTotal),
      deductions: Number(run.deductionTotal),
      net: Number(run.netTotal),
      status: run.status,
    })),
    salaryComponents: components,
    overtimeMinutes: sumNumbers(results.map((result) => result.overtimeMinutes)),
    expenseTotals: expenses.reduce<Record<string, number>>((totals, item) => {
      totals[item.currency] = (totals[item.currency] ?? 0) + Number(item.amount);
      return totals;
    }, {}),
    expensesByCategory: countGroups(expenses, "category"),
    expenseApprovalCycleDays: average(approvalDays),
    drilldowns: { payroll: "/hr/payroll", expenses: "/hr/payroll#expenses" },
  };
}

async function audit(organizationId: string, query: AnalyticsQuery, timezone: string) {
  const rows = await db.auditLog.findMany({
    where: { organizationId, ...dateFilter(query, "createdAt", timezone) },
    select: { action: true, outcome: true },
  });
  const category = (action: string) => {
    const value = action.toUpperCase();
    if (value.includes("LOGIN") || value.includes("SIGN_IN")) return "Logins";
    if (value.includes("PERMISSION") || value.includes("ROLE")) return "Permission changes";
    if (value.includes("EXPORT")) return "Exports";
    if (value.includes("DOWNLOAD")) return "Downloads";
    if (value.includes("SENSITIVE")) return "Sensitive-field changes";
    return "Administrative events";
  };
  return {
    domain: "audit",
    filters: query,
    totalEvents: rows.length,
    eventCategories: countGroups(
      rows.map((row) => ({ category: category(row.action) })),
      "category",
    ),
    outcomes: countGroups(rows, "outcome"),
    drilldowns: { audit: "/hr/reports?view=audit" },
  };
}

export async function analyticsForDomain(
  domain: AnalyticsDomain,
  organizationId: string,
  query: AnalyticsQuery,
  actor?: AnalyticsActor,
) {
  const [organization, scope] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { timezone: true },
    }),
    resolveAnalyticsScope(organizationId, actor),
  ]);
  const timezone = organization.timezone;
  switch (domain) {
    case "recruitment":
      return recruitment(organizationId, query, scope);
    case "workforce":
      return workforce(organizationId, query, timezone, scope);
    case "attendance":
      return attendance(organizationId, query, timezone, scope);
    case "leave":
      return leave(organizationId, query, timezone, scope);
    case "hr":
      return hr(organizationId, query, timezone);
    case "payroll":
      return payroll(organizationId, query, timezone);
    case "audit":
      return audit(organizationId, query, timezone);
  }
}

function scalarRows(value: unknown, prefix = ""): Array<[string, string]> {
  if (value == null || typeof value !== "object")
    return [[prefix, value == null ? "" : String(value)]];
  if (Array.isArray(value))
    return value.flatMap((item, index) => scalarRows(item, `${prefix}[${index}]`));
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return scalarRows(child, path);
  });
}

export function analyticsCsv(data: unknown) {
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  return [
    "metric,value",
    ...scalarRows(data).map(([key, value]) => `${escape(key)},${escape(value)}`),
  ].join("\r\n");
}
