import { NextRequest } from "next/server";
import { errorResponse, unauthenticatedError } from "@/lib/errors";
import { requestId, successResponse } from "@/lib/request";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { auth } from "@/lib/auth";
import { FOUNDATION_PERMISSIONS } from "@/lib/rbac";

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    if (env.NODE_ENV === "production")
      return Response.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Local account activation is disabled in production",
          },
          requestId: id,
        },
        { status: 403 },
      );
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) throw unauthenticatedError();
    await db.$transaction(async (tx) => {
      const organization = await tx.organization.upsert({
        where: { slug: env.LOCAL_ADMIN_ORGANIZATION_SLUG },
        update: { name: "Triple Minds", status: "ACTIVE" },
        create: {
          name: "Triple Minds",
          slug: env.LOCAL_ADMIN_ORGANIZATION_SLUG,
          status: "ACTIVE",
          timezone: "Asia/Kolkata",
        },
      });
      const permissions = await Promise.all(
        FOUNDATION_PERMISSIONS.map((name) =>
          tx.permission.upsert({
            where: { name },
            update: {},
            create: { name, description: "Declared HR Portal permission" },
          }),
        ),
      );
      const role = await tx.role.upsert({
        where: { organizationId_slug: { organizationId: organization.id, slug: "hr-admin" } },
        update: { name: "HR Administrator" },
        create: { organizationId: organization.id, name: "HR Administrator", slug: "hr-admin" },
      });
      for (const permission of permissions) {
        await tx.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }
      const membership = await tx.membership.upsert({
        where: {
          organizationId_userId: { organizationId: organization.id, userId: session.user.id },
        },
        update: { status: "ACTIVE" },
        create: { organizationId: organization.id, userId: session.user.id, status: "ACTIVE" },
      });
      await tx.membershipRole.upsert({
        where: { membershipId_roleId: { membershipId: membership.id, roleId: role.id } },
        update: {},
        create: { membershipId: membership.id, roleId: role.id },
      });
    });
    return successResponse({ activated: true }, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
