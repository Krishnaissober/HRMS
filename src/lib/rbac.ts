import { db } from "@/lib/db";
import { forbiddenError } from "@/lib/errors";
export { FOUNDATION_PERMISSIONS } from "@/lib/rbac-permissions";

export function membershipHasPermission(membership: { status: string; roles: { role: { permissions: { permission: { name: string } }[] } }[] } | null, permission: string) {
  return membership?.status === "ACTIVE" && membership.roles.some((membershipRole) => membershipRole.role.permissions.some((rolePermission) => rolePermission.permission.name === permission));
}

export async function hasPermission(userId: string, organizationId: string, permission: string) {
  const membership = await db.membership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    include: { roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } },
  });
  return membershipHasPermission(membership, permission);
}

export async function requirePermission(userId: string, organizationId: string, permission: string) {
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
      roles: {
        include: {
          role: { include: { permissions: { include: { permission: true } } } },
        },
      },
    },
  });
  if (permissions.some((permission) => !membershipHasPermission(membership, permission)))
    throw forbiddenError();
}
