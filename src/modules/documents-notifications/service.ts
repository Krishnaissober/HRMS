import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { writeAuditEvent } from "@/lib/audit";
import { AppError, forbiddenError, notFoundError } from "@/lib/errors";
import { createDownloadUrl, createUploadUrl, verifyStoredObject } from "@/lib/storage";
const d = (v: string) => new Date(`${v}T00:00:00.000Z`);
async function assertOwner(
  tx: Prisma.TransactionClient | typeof db,
  organizationId: string,
  ownerType: string,
  ownerId: string,
) {
  const owner =
    ownerType === "EMPLOYEE"
      ? await tx.employee.findFirst({ where: { id: ownerId, organizationId } })
      : await tx.candidate.findFirst({ where: { id: ownerId, organizationId } });
  if (!owner) throw notFoundError();
  return owner;
}
export async function managedDocumentUpload(input: {
  organizationId: string;
  ownerType: string;
  ownerId: string;
  fileName: string;
  contentType: string;
  byteSize: number;
}) {
  await assertOwner(db, input.organizationId, input.ownerType, input.ownerId);
  const objectKey = `documents/${input.organizationId}/${input.ownerType.toLowerCase()}/${input.ownerId}/${crypto.randomUUID()}-${input.fileName}`;
  return {
    objectKey,
    uploadUrl: await createUploadUrl(objectKey, input.contentType),
    fileName: input.fileName,
    contentType: input.contentType,
    byteSize: input.byteSize,
  };
}
export async function createManagedDocument(input: {
  organizationId: string;
  actorUserId: string;
  ownerType: "CANDIDATE" | "EMPLOYEE";
  ownerId: string;
  documentType: string;
  title: string;
  expiresAt?: string | null;
  retentionUntil?: string | null;
  objectKey: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  checksum?: string;
  requestId?: string;
}) {
  if (
    !input.objectKey.startsWith(
      `documents/${input.organizationId}/${input.ownerType.toLowerCase()}/${input.ownerId}/`,
    )
  )
    throw forbiddenError();
  await verifyStoredObject(input.objectKey, input.contentType, input.byteSize);
  return db.$transaction(async (tx) => {
    await assertOwner(tx, input.organizationId, input.ownerType, input.ownerId);
    const doc = await tx.managedDocument.create({
      data: {
        organizationId: input.organizationId,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        documentType: input.documentType,
        title: input.title,
        expiresAt: input.expiresAt ? d(input.expiresAt) : null,
        retentionUntil: input.retentionUntil ? d(input.retentionUntil) : null,
        createdByUserId: input.actorUserId,
        versions: {
          create: {
            organizationId: input.organizationId,
            versionNumber: 1,
            objectKey: input.objectKey,
            fileName: input.fileName,
            contentType: input.contentType,
            byteSize: input.byteSize,
            checksum: input.checksum,
            createdByUserId: input.actorUserId,
          },
        },
      },
      include: { versions: true },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "DOCUMENT_CREATED",
      entityType: "ManagedDocument",
      entityId: doc.id,
      requestId: input.requestId,
    });
    return doc;
  });
}
export async function addDocumentVersion(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
  objectKey: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  checksum?: string;
  requestId?: string;
}) {
  const current = await db.managedDocument.findFirst({
    where: { id: input.id, organizationId: input.organizationId, status: "ACTIVE" },
  });
  if (!current) throw notFoundError();
  if (
    !input.objectKey.startsWith(
      `documents/${input.organizationId}/${current.ownerType.toLowerCase()}/${current.ownerId}/`,
    )
  )
    throw forbiddenError();
  await verifyStoredObject(input.objectKey, input.contentType, input.byteSize);
  try {
    return await db.$transaction(
      async (tx) => {
        const latest = await tx.managedDocument.findFirstOrThrow({
          where: { id: current.id, organizationId: input.organizationId },
        });
        const n = latest.currentVersionNumber + 1;
        const version = await tx.documentVersion.create({
          data: {
            organizationId: input.organizationId,
            documentId: latest.id,
            versionNumber: n,
            objectKey: input.objectKey,
            fileName: input.fileName,
            contentType: input.contentType,
            byteSize: input.byteSize,
            checksum: input.checksum,
            createdByUserId: input.actorUserId,
          },
        });
        await tx.managedDocument.update({
          where: { id: latest.id },
          data: { currentVersionNumber: n },
        });
        await writeAuditEvent(tx, {
          organizationId: input.organizationId,
          actorUserId: input.actorUserId,
          action: "DOCUMENT_VERSION_CREATED",
          entityType: "ManagedDocument",
          entityId: latest.id,
          requestId: input.requestId,
          metadata: { versionNumber: n },
        });
        return version;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2034"].includes(e.code))
      throw new AppError("CONFLICT", "Document changed concurrently", 409);
    throw e;
  }
}
export async function listDocuments(
  organizationId: string,
  q: {
    ownerType?: string;
    ownerId?: string;
    status?: string;
    expiringWithinDays?: number;
    page: number;
    pageSize: number;
  },
  actorEmail?: string,
  companyScope = false,
) {
  const actorEmployee =
    !companyScope && actorEmail
      ? await db.employee.findFirst({
          where: { organizationId, email: { equals: actorEmail } },
          select: { id: true },
        })
      : null;
  const where = {
    organizationId,
    ...(!companyScope ? { ownerType: "EMPLOYEE", ownerId: actorEmployee?.id ?? "__none__" } : {}),
    ...(q.ownerType ? { ownerType: q.ownerType } : {}),
    ...(q.ownerId ? { ownerId: q.ownerId } : {}),
    ...(q.status ? { status: q.status } : { deletedAt: null }),
    ...(q.expiringWithinDays != null
      ? {
          expiresAt: {
            lte: new Date(Date.now() + q.expiringWithinDays * 86400000),
            gte: new Date(),
          },
        }
      : {}),
  } satisfies Prisma.ManagedDocumentWhereInput;
  const [items, total] = await db.$transaction([
    db.managedDocument.findMany({
      where,
      include: { versions: { orderBy: { versionNumber: "desc" } } },
      orderBy: { updatedAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    db.managedDocument.count({ where }),
  ]);
  return { items, total };
}
export async function downloadDocument(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
  version?: number;
  requestId?: string;
  actorEmail?: string;
  companyScope?: boolean;
}) {
  const doc = await db.managedDocument.findFirst({
    where: { id: input.id, organizationId: input.organizationId, deletedAt: null },
    include: { versions: true },
  });
  if (!doc) throw notFoundError();
  if (!input.companyScope) {
    const employee = input.actorEmail
      ? await db.employee.findFirst({
          where: {
            organizationId: input.organizationId,
            email: { equals: input.actorEmail },
          },
          select: { id: true },
        })
      : null;
    if (!employee || doc.ownerType !== "EMPLOYEE" || doc.ownerId !== employee.id)
      throw forbiddenError();
  }
  const version = doc.versions.find(
    (v) => v.versionNumber === (input.version ?? doc.currentVersionNumber),
  );
  if (!version) throw notFoundError();
  const url = await createDownloadUrl(version.objectKey);
  await db.$transaction((tx) =>
    writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "DOCUMENT_DOWNLOADED",
      entityType: "ManagedDocument",
      entityId: doc.id,
      requestId: input.requestId,
      metadata: { versionNumber: version.versionNumber },
    }),
  );
  return {
    downloadUrl: url,
    fileName: version.fileName,
    contentType: version.contentType,
    versionNumber: version.versionNumber,
  };
}
export async function setDocumentState(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
  status: "ACTIVE" | "ARCHIVED" | "DELETED";
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const doc = await tx.managedDocument.findFirst({
      where: { id: input.id, organizationId: input.organizationId },
    });
    if (!doc) throw notFoundError();
    if (input.status === "DELETED" && doc.retentionUntil && doc.retentionUntil > new Date())
      throw new AppError("CONFLICT", "Document is protected by its retention policy", 409);
    const updated = await tx.managedDocument.update({
      where: { id: doc.id },
      data: {
        status: input.status,
        archivedAt:
          input.status === "ARCHIVED"
            ? new Date()
            : input.status === "ACTIVE"
              ? null
              : doc.archivedAt,
        deletedAt: input.status === "DELETED" ? new Date() : null,
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: `DOCUMENT_${input.status}`,
      entityType: "ManagedDocument",
      entityId: doc.id,
      requestId: input.requestId,
    });
    return updated;
  });
}
export async function createNotification(
  tx: Prisma.TransactionClient,
  input: {
    organizationId: string;
    userId: string;
    eventType: string;
    title: string;
    body: string;
    actionableUrl?: string;
    email?: boolean;
  },
) {
  return tx.appNotification.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      eventType: input.eventType,
      title: input.title,
      body: input.body,
      actionableUrl: input.actionableUrl,
      channels: ["IN_APP", ...(input.email ? ["EMAIL"] : [])],
    },
  });
}
export async function listNotifications(
  organizationId: string,
  userId: string,
  q: { unreadOnly: boolean; page: number; pageSize: number },
) {
  const where = { organizationId, userId, ...(q.unreadOnly ? { readAt: null } : {}) };
  const [items, total] = await db.$transaction([
    db.appNotification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    db.appNotification.count({ where }),
  ]);
  return { items, total };
}
export async function markNotification(input: {
  organizationId: string;
  userId: string;
  id: string;
  read: boolean;
}) {
  const n = await db.appNotification.findFirst({
    where: { id: input.id, organizationId: input.organizationId, userId: input.userId },
  });
  if (!n) throw notFoundError();
  return db.appNotification.update({
    where: { id: n.id },
    data: { readAt: input.read ? new Date() : null },
  });
}
export async function generateWorkflowReminders(input: {
  organizationId: string;
  actorUserId: string;
  withinDays: number;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const now = new Date();
    const through = new Date(Date.now() + input.withinDays * 86400000);
    const docs = await tx.managedDocument.findMany({
      where: {
        organizationId: input.organizationId,
        status: "ACTIVE",
        deletedAt: null,
        expiresAt: { gte: now, lte: through },
      },
    });
    const documentRecipients = await tx.membership.findMany({
      where: {
        organizationId: input.organizationId,
        status: "ACTIVE",
        roles: {
          some: { role: { permissions: { some: { permission: { name: "documents.manage" } } } } },
        },
      },
    });
    const approvalRecipients = await tx.membership.findMany({
      where: {
        organizationId: input.organizationId,
        status: "ACTIVE",
        roles: {
          some: { role: { permissions: { some: { permission: { name: "leave.approve" } } } } },
        },
      },
    });
    const employeeRecipients = await tx.membership.findMany({
      where: {
        organizationId: input.organizationId,
        status: "ACTIVE",
        roles: {
          some: { role: { permissions: { some: { permission: { name: "employees.update" } } } } },
        },
      },
    });
    const interviews = await tx.interview.findMany({
      where: {
        organizationId: input.organizationId,
        status: "SCHEDULED",
        scheduledStart: { gte: now, lte: through },
      },
      include: { participants: true },
    });
    const approvals = await tx.leaveRequest.findMany({
      where: { organizationId: input.organizationId, status: "PENDING" },
    });
    const probationDates = await tx.employee.findMany({
      where: {
        organizationId: input.organizationId,
        status: "PROBATION",
        probationEndDate: { gte: now, lte: through },
      },
    });
    let created = 0;
    async function persistReminder(reminderInput: {
      userId: string;
      sourceType: string;
      sourceId: string;
      title: string;
      body: string;
      dueAt: Date;
      actionableUrl: string;
    }) {
      const reminder = await tx.reminder.upsert({
        where: {
          organizationId_userId_sourceType_sourceId_dueAt: {
            organizationId: input.organizationId,
            userId: reminderInput.userId,
            sourceType: reminderInput.sourceType,
            sourceId: reminderInput.sourceId,
            dueAt: reminderInput.dueAt,
          },
        },
        update: {},
        create: {
          organizationId: input.organizationId,
          userId: reminderInput.userId,
          sourceType: reminderInput.sourceType,
          sourceId: reminderInput.sourceId,
          title: reminderInput.title,
          dueAt: reminderInput.dueAt,
        },
      });
      await tx.appNotification.upsert({
        where: { id: reminder.id },
        update: {},
        create: {
          id: reminder.id,
          organizationId: input.organizationId,
          userId: reminderInput.userId,
          eventType: reminderInput.sourceType,
          title: reminderInput.title,
          body: reminderInput.body,
          actionableUrl: reminderInput.actionableUrl,
          channels: ["IN_APP", "EMAIL"],
        },
      });
      created++;
    }
    for (const doc of docs)
      for (const recipient of documentRecipients) {
        const due = doc.expiresAt!;
        await persistReminder({
          userId: recipient.userId,
          sourceType: "DOCUMENT_EXPIRY",
          sourceId: doc.id,
          title: `Document expiring: ${doc.title}`,
          body: `Expires on ${due.toISOString().slice(0, 10)}`,
          dueAt: due,
          actionableUrl: `/hr/documents?documentId=${doc.id}`,
        });
      }
    for (const interview of interviews)
      for (const participant of interview.participants)
        await persistReminder({
          userId: participant.userId,
          sourceType: "INTERVIEW_REMINDER",
          sourceId: interview.id,
          title: `Interview ${interview.referenceNo}`,
          body: `Scheduled for ${interview.scheduledStart.toISOString()}`,
          dueAt: interview.scheduledStart,
          actionableUrl: `/hr/interviews/${interview.id}`,
        });
    for (const approval of approvals)
      for (const recipient of approvalRecipients)
        await persistReminder({
          userId: recipient.userId,
          sourceType: "LEAVE_APPROVAL",
          sourceId: approval.id,
          title: "Pending leave approval",
          body: "A leave request is awaiting a decision.",
          dueAt: approval.createdAt,
          actionableUrl: "/hr/leave",
        });
    for (const employee of probationDates)
      for (const recipient of employeeRecipients)
        await persistReminder({
          userId: recipient.userId,
          sourceType: "PROBATION_END",
          sourceId: employee.id,
          title: `Probation ending: ${employee.firstName} ${employee.lastName}`,
          body: `Probation ends on ${employee.probationEndDate!.toISOString().slice(0, 10)}`,
          dueAt: employee.probationEndDate!,
          actionableUrl: `/hr/employees/${employee.id}`,
        });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "WORKFLOW_REMINDERS_GENERATED",
      entityType: "Reminder",
      requestId: input.requestId,
      metadata: { created },
    });
    return { created };
  });
}
export async function listTasks(organizationId: string, userId: string) {
  return db.workflowTask.findMany({
    where: { organizationId, assignedToUserId: userId },
    orderBy: [{ status: "asc" }, { dueAt: "asc" }],
  });
}
export async function createTask(input: {
  organizationId: string;
  actorUserId: string;
  assignedToUserId: string;
  sourceType: string;
  sourceId: string;
  title: string;
  dueAt?: string | null;
  priority: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const member = await tx.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.assignedToUserId,
        },
      },
    });
    if (!member || member.status !== "ACTIVE") throw notFoundError();
    const task = await tx.workflowTask.create({
      data: {
        organizationId: input.organizationId,
        assignedToUserId: input.assignedToUserId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        title: input.title,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        priority: input.priority,
      },
    });
    await createNotification(tx, {
      organizationId: input.organizationId,
      userId: input.assignedToUserId,
      eventType: "TASK_ASSIGNED",
      title: "Task assigned",
      body: task.title,
      actionableUrl: "/hr/notifications",
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "WORKFLOW_TASK_CREATED",
      entityType: "WorkflowTask",
      entityId: task.id,
      requestId: input.requestId,
    });
    return task;
  });
}
export async function setTaskState(input: {
  organizationId: string;
  actorUserId: string;
  id: string;
  status: string;
  requestId?: string;
}) {
  return db.$transaction(async (tx) => {
    const task = await tx.workflowTask.findFirst({
      where: {
        id: input.id,
        organizationId: input.organizationId,
        assignedToUserId: input.actorUserId,
      },
    });
    if (!task) throw notFoundError();
    const updated = await tx.workflowTask.update({
      where: { id: task.id },
      data: {
        status: input.status,
        completedAt: input.status === "COMPLETED" ? new Date() : null,
        completedByUserId: input.status === "COMPLETED" ? input.actorUserId : null,
      },
    });
    await writeAuditEvent(tx, {
      organizationId: input.organizationId,
      actorUserId: input.actorUserId,
      action: "WORKFLOW_TASK_STATUS_CHANGED",
      entityType: "WorkflowTask",
      entityId: task.id,
      requestId: input.requestId,
      metadata: { from: task.status, to: input.status },
    });
    return updated;
  });
}
