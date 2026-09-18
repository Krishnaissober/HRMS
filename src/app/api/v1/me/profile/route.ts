import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { errorResponse } from "@/lib/errors";
import { getAuthenticatedContext } from "@/lib/tenant";
import { requestId, successResponse } from "@/lib/request";
import { parseBody } from "@/lib/validate";
import { z } from "zod";

const profileImageSchema = z.object({
  image: z
    .string()
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Use a PNG, JPEG, or WebP image")
    .max(2_000_000, "Profile pictures must be smaller than 1.5 MB")
    .nullable(),
});

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

export async function PUT(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthenticatedContext(request);
    const parsed = parseBody(profileImageSchema, await request.json());
    const user = await db.user.update({
      where: { id: context.session.user.id },
      data: { image: parsed.image },
      select: { image: true },
    });
    return successResponse(user, id);
  } catch (error) {
    return errorResponse(error, id);
  }
}
