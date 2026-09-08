import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/errors";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requestId, successResponse } from "@/lib/request";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    const [user, membership, unreadNotifications] = await Promise.all([
      db.user.findUniqueOrThrow({
        where: { id: context.session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          emailVerified: true,
          createdAt: true,
        },
      }),
      db.membership.findUniqueOrThrow({
        where: {
          organizationId_userId: {
            organizationId: context.organizationId,
            userId: context.session.user.id,
          },
        },
        include: { roles: { include: { role: { select: { name: true, slug: true } } } } },
      }),
      db.appNotification.count({
        where: {
          organizationId: context.organizationId,
          userId: context.session.user.id,
          readAt: null,
        },
      }),
    ]);
    const roles = membership.roles.map((membershipRole) => ({
      name: membershipRole.role.name,
      slug: membershipRole.role.slug,
    }));
    return successResponse(
      {
        user,
        organization: { name: "Triple Minds", membershipStatus: membership.status },
        roles,
        unreadNotifications,
      },
      id,
    );
  } catch (error) {
    return errorResponse(error, id);
  }
}
