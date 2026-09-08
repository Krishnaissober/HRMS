import { db } from "@/lib/db";
import { forbiddenError } from "@/lib/errors";
import { membershipHasAdminAccess } from "@/lib/admin-access";
export { FOUNDATION_PERMISSIONS } from "@/lib/rbac-permissions";

export function membershipHasPermission(
  membership: {
    status: string;
    roles: { role: { permissions: { permission: { name: string } }[] } }[];
  } | null,
  permission: string,
) {
  return (
    membership?.status === "ACTIVE" &&
    membership.roles.some((membershipRole) =>
      membershipRole.role.permissions.some(
        (rolePermission) => rolePermission.permission.name === permission,
      ),
    )
  );
}

export async function hasPermission(userId: string, organizationId: string, permission: string) {
  const membership = await db.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    include: {
      user: { select: { email: true } },
      roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
    },
  });
  // Administrators oversee the complete HR portal. Keep this bypass here so
  // every page and API that uses the shared permission guard behaves the same.
  if (membershipHasAdminAccess(membership, membership?.user.email)) return true;
  return membershipHasPermission(membership, permission);
}

export async function requirePermission(
  userId: string,
  organizationId: string,
  permission: string,
) {
  if (!(await hasPermission(userId, organizationId, permission))) throw forbiddenError();
}

export async function requirePermissions(
  userId: string,
  organizationId: string,
  permissions: readonly string[],
) {
  const membership = await db.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    include: {
      user: { select: { email: true } },
      roles: {
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
        },
      },
    },
  });
  if (membershipHasAdminAccess(membership, membership?.user.email)) return;
  if (permissions.some((permission) => !membershipHasPermission(membership, permission)))
    throw forbiddenError();
}
