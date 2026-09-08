/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("better-auth/crypto");
const permissionCatalog = require("../src/lib/rbac-permissions.json");

loadEnvConfig(process.cwd());

if (process.env.NODE_ENV === "production") {
  throw new Error("Local admin bootstrap is disabled in production.");
}

const email = process.env.LOCAL_ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.LOCAL_ADMIN_PASSWORD;
const name = process.env.LOCAL_ADMIN_NAME?.trim() || "Local HR Administrator";
const organizationName = process.env.LOCAL_ADMIN_ORGANIZATION_NAME?.trim() || "Local HR Portal";
const organizationSlug = process.env.LOCAL_ADMIN_ORGANIZATION_SLUG?.trim() || "local-hr-portal";
const resetPassword = process.argv.includes("--reset-password");

if (!email || !password) {
  throw new Error(
    "Set LOCAL_ADMIN_EMAIL and LOCAL_ADMIN_PASSWORD in .env.local before running this command.",
  );
}
if (password.length < 8) {
  throw new Error("LOCAL_ADMIN_PASSWORD must contain at least 8 characters.");
}

const db = new PrismaClient();

async function createUser() {
  const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const origin = process.env.APP_URL || baseUrl;
  const response = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ name, email, password }),
  });
  if (!response.ok) {
    throw new Error(
      `Better Auth sign-up failed with HTTP ${response.status}. Ensure the local app is running.`,
    );
  }
}

async function main() {
  let user = await db.user.findUnique({ where: { email }, include: { accounts: true } });
  if (!user) {
    await createUser();
    user = await db.user.findUniqueOrThrow({ where: { email }, include: { accounts: true } });
  } else if (resetPassword) {
    const credential = user.accounts.find((account) => account.providerId === "credential");
    if (!credential)
      throw new Error("The existing user has no Better Auth credential account to reset.");
    await db.account.update({
      where: { id: credential.id },
      data: { password: await hashPassword(password) },
    });
  } else if (
    !user.accounts.some((account) => account.providerId === "credential" && account.password)
  ) {
    throw new Error(
      "The existing user has no valid Better Auth password record. Re-run with --reset-password after reviewing the account.",
    );
  }

  const result = await db.$transaction(async (tx) => {
    const organization = await tx.organization.upsert({
      where: { slug: organizationSlug },
      update: { name: organizationName, status: "ACTIVE" },
      create: { name: organizationName, slug: organizationSlug, status: "ACTIVE" },
    });
    const role = await tx.role.upsert({
      where: { organizationId_slug: { organizationId: organization.id, slug: "local-admin" } },
      update: { name: "Local Administrator" },
      create: { organizationId: organization.id, name: "Local Administrator", slug: "local-admin" },
    });
    const permissions = await Promise.all(
      permissionCatalog.map((permissionName) =>
        tx.permission.upsert({
          where: { name: permissionName },
          update: {},
          create: { name: permissionName, description: "Declared HR Portal permission" },
          select: { id: true },
        }),
      ),
    );
    await Promise.all(
      permissions.map((permission) =>
        tx.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        }),
      ),
    );
    const membership = await tx.membership.upsert({
      where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
      update: { status: "ACTIVE" },
      create: { organizationId: organization.id, userId: user.id, status: "ACTIVE" },
    });
    await tx.membershipRole.upsert({
      where: { membershipId_roleId: { membershipId: membership.id, roleId: role.id } },
      update: {},
      create: { membershipId: membership.id, roleId: role.id },
    });
    return { organizationId: organization.id, userId: user.id };
  });

  console.log(`Local administrator is ready for organization ${result.organizationId}.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Local admin bootstrap failed.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
