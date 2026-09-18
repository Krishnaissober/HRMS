import { NextRequest } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-access";
import { recordAuditEvent } from "@/lib/audit";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { AppError, errorResponse } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";

const statusSchema = z.object({ status: z.enum(["ACTIVE", "INACTIVE"]) });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request);
  try {
    const context = await getAdminContext(request);
    const membershipId = (await params).id;
    const parsed = statusSchema.parse(await request.json());
    const membership = await db.membership.findFirst({
      where: {
        id: membershipId,
        organizationId: context.organizationId,
        roles: { some: { role: { slug: "hr-admin" } } },
      },
      select: { id: true, userId: true, status: true, user: { select: { email: true } } },
    });
    if (!membership)
      return errorResponse(new AppError("NOT_FOUND", "HR Administrator account not found.", 404), id);
    const protectedAdminEmail = (env.ADMIN_EMAIL || env.LOCAL_ADMIN_EMAIL || context.session.user.email)
      .trim()
      .toLowerCase();
    if (
      membership.userId === context.session.user.id ||
      membership.user.email.trim().toLowerCase() === protectedAdminEmail
    )
      return errorResponse(
        new AppError("CONFLICT", "The current administrator cannot remove their own access.", 409),
        id,
      );
    const updated = await db.membership.update({
      where: { id: membership.id },
      data: { status: parsed.status },
      select: { id: true, status: true },
    });
    await recordAuditEvent({
      action: parsed.status === "INACTIVE" ? "HR_ADMIN_ACCESS_REMOVED" : "HR_ADMIN_ACCESS_RESTORED",
      entityType: "MEMBERSHIP",
      entityId: membership.id,
      organizationId: context.organizationId,
      actorUserId: context.session.user.id,
      requestId: id,
      metadata: { userEmail: membership.user.email },
      outcome: "SUCCESS",
    });
    return successResponse(updated, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
