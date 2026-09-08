import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { forbiddenError } from "@/lib/errors";
import { getAuthenticatedContext } from "@/lib/tenant";

type AdminMembership = {
  status: string;
  roles: Array<{ role: { slug: string } }>;
};

export function membershipHasAdminAccess(
  membership: AdminMembership | null,
  email: string | null | undefined,
) {
  if (!membership || membership.status !== "ACTIVE") return false;

  const allowedRole = membership.roles.some(({ role }) => {
    if (role.slug === env.ADMIN_ROLE_SLUG) return true;
    return env.NODE_ENV !== "production" && role.slug === "local-admin";
  });
  if (!allowedRole) return false;

  const configuredAdminEmail =
    env.ADMIN_EMAIL || (env.NODE_ENV !== "production" ? env.LOCAL_ADMIN_EMAIL : undefined);
  return (
    !configuredAdminEmail || email?.trim().toLowerCase() === configuredAdminEmail.toLowerCase()
  );
}

export async function getAdminContext(request?: Request) {
  const context = await getAuthenticatedContext(request);
  const membership = await db.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: context.organizationId,
        userId: context.session.user.id,
      },
    },
    include: { roles: { include: { role: { select: { slug: true } } } } },
  });
  if (!membershipHasAdminAccess(membership, context.session.user.email)) throw forbiddenError();
  return { ...context, membership };
}
