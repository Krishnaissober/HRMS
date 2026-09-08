import { db } from "@/lib/db";

export const employeeInclude = {
  candidate: { select: { id: true, referenceNo: true } },
  application: {
    select: {
      id: true,
      referenceNo: true,
      requisition: { select: { referenceNo: true, title: true } },
    },
  },
  manager: { select: { id: true, employeeNo: true, firstName: true, lastName: true } },
  history: {
    orderBy: { effectiveDate: "desc" as const },
    include: { actor: { select: { id: true, name: true, email: true } } },
  },
  onboardingInstances: {
    orderBy: { createdAt: "desc" as const },
    include: {
      template: true,
      tasks: {
        include: { definition: true, assignee: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "asc" as const },
      },
    },
  },
  documents: { orderBy: { createdAt: "desc" as const } },
  assets: { orderBy: { assignedAt: "desc" as const } },
  accessProvisioning: { orderBy: { requestedAt: "desc" as const } },
  mentorAssignments: {
    orderBy: { assignedAt: "desc" as const },
    include: {
      mentor: { select: { id: true, employeeNo: true, firstName: true, lastName: true } },
    },
  },
} as const;

export async function getEmployee(organizationId: string, id: string) {
  return db.employee.findFirst({ where: { id, organizationId }, include: employeeInclude });
}
export async function listEmployees(
  organizationId: string,
  query: { q?: string; status?: string; page: number; pageSize: number },
) {
  const where = {
    organizationId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.q
      ? {
          OR: [
            { employeeNo: { contains: query.q } },
            { firstName: { contains: query.q } },
            { lastName: { contains: query.q } },
            { email: { contains: query.q } },
            { jobTitle: { contains: query.q } },
          ],
        }
      : {}),
  };
  const [items, total] = await db.$transaction([
    db.employee.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      select: {
        id: true,
        candidateId: true,
        employeeNo: true,
        firstName: true,
        lastName: true,
        email: true,
        jobTitle: true,
        department: true,
        status: true,
        joiningDate: true,
      },
    }),
    db.employee.count({ where }),
  ]);
  return { items, total };
}
export async function listTemplates(organizationId: string) {
  return db.onboardingTemplate.findMany({
    where: { organizationId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: { definitions: { orderBy: { sortOrder: "asc" } } },
  });
}
export async function listOnboarding(
  organizationId: string,
  query: { status?: string; page: number; pageSize: number },
) {
  const where = { organizationId, ...(query.status ? { status: query.status } : {}) };
  const [items, total] = await db.$transaction([
    db.onboardingInstance.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        employee: {
          select: { id: true, employeeNo: true, firstName: true, lastName: true, status: true },
        },
        template: { include: { definitions: true } },
        tasks: {
          include: {
            definition: true,
            assignee: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "asc" },
        },
        documents: true,
      },
    }),
    db.onboardingInstance.count({ where }),
  ]);
  return { items, total };
}
export async function getOnboarding(organizationId: string, id: string) {
  return db.onboardingInstance.findFirst({
    where: { id, organizationId },
    include: {
      employee: true,
      template: { include: { definitions: true } },
      tasks: {
        include: {
          definition: true,
          assignee: { select: { id: true, name: true, email: true } },
          completedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      documents: true,
    },
  });
}
