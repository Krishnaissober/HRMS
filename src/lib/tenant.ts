import { headers } from "next/headers";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { forbiddenError, unauthenticatedError } from "@/lib/errors";

export async function getAuthenticatedContext(request?: Request) {
  const requestHeaders = request?.headers ?? (await headers());
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) throw unauthenticatedError();
  const requestedOrganizationId = requestHeaders.get("x-organization-id");
  const membership = requestedOrganizationId
    ? await db.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: requestedOrganizationId,
            userId: session.user.id,
          },
        },
      })
    : await db.membership.findFirst({
        where: { userId: session.user.id, status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
      });
  if (!membership || membership.status !== "ACTIVE") throw forbiddenError();
  return { session, organizationId: membership.organizationId, membership };
}

export async function assertMembership(userId: string, organizationId: string) {
  const membership = await db.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
  if (!membership || membership.status !== "ACTIVE") throw forbiddenError();
  return membership;
}
