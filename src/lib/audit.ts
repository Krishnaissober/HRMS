import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

export type AuditInput = {
  action: string;
  entityType: string;
  entityId?: string;
  organizationId?: string;
  actorUserId?: string;
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  outcome?: "SUCCESS" | "FAILURE";
};

export async function writeAuditEvent(client: Prisma.TransactionClient, input: AuditInput) {
  return client.auditLog.create({
    data: { ...input, metadata: input.metadata as Prisma.InputJsonValue | undefined },
  });
}

export async function recordAuditEvent(input: AuditInput) {
  try {
    return await writeAuditEvent(db, input);
  } catch (error) {
    logger.error(
      { error, action: input.action, entityType: input.entityType },
      "audit_event_failed",
    );
    throw error;
  }
}
