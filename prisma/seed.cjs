/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvConfig } = require("@next/env");
const { PrismaClient } = require("@prisma/client");
const { hashPassword } = require("better-auth/crypto");
const permissionCatalog = require("../src/lib/rbac-permissions.json");

loadEnvConfig(process.cwd());

if (process.env.NODE_ENV === "production") {
  throw new Error("The development seed is disabled in production.");
}

const db = new PrismaClient();
const email = (process.env.SEED_ADMIN_EMAIL || "admin@tripleminds.test").trim().toLowerCase();
const password = process.env.SEED_ADMIN_PASSWORD || "TripleMindsLocal!2026";
const userId = "triple-minds-local-admin";
const organizationSlug = "triple-minds";

async function main() {
  if (password.length < 12)
    throw new Error("SEED_ADMIN_PASSWORD must contain at least 12 characters.");

  const organization = await db.organization.upsert({
    where: { slug: organizationSlug },
    update: { name: "Triple Minds", status: "ACTIVE" },
    create: {
      name: "Triple Minds",
      slug: organizationSlug,
      status: "ACTIVE",
      timezone: "Asia/Kolkata",
    },
  });

  const user = await db.user.upsert({
    where: { email },
    update: { name: "Triple Minds HR Administrator" },
    create: { id: userId, name: "Triple Minds HR Administrator", email, emailVerified: true },
  });

  await db.account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
    update: { password: await hashPassword(password) },
    create: {
      id: `${user.id}-credential`,
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: await hashPassword(password),
    },
  });

  const permissions = await Promise.all(
    permissionCatalog.map((name) =>
      db.permission.upsert({
        where: { name },
        update: {},
        create: { name, description: "Declared HR Portal permission" },
      }),
    ),
  );

  const role = await db.role.upsert({
    where: { organizationId_slug: { organizationId: organization.id, slug: "hr-admin" } },
    update: { name: "HR Administrator" },
    create: { organizationId: organization.id, name: "HR Administrator", slug: "hr-admin" },
  });
  for (const permission of permissions) {
    await db.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
      update: {},
      create: { roleId: role.id, permissionId: permission.id },
    });
  }

  const membership = await db.membership.upsert({
    where: { organizationId_userId: { organizationId: organization.id, userId: user.id } },
    update: { status: "ACTIVE" },
    create: { organizationId: organization.id, userId: user.id, status: "ACTIVE" },
  });
  await db.membershipRole.upsert({
    where: { membershipId_roleId: { membershipId: membership.id, roleId: role.id } },
    update: {},
    create: { membershipId: membership.id, roleId: role.id },
  });

  const requisitions = await Promise.all(
    [
      ["TM-REQ-001", "People Operations Specialist", "PUBLISHED"],
      ["TM-REQ-002", "Senior Frontend Engineer", "PUBLISHED"],
      ["TM-REQ-003", "Customer Success Manager", "PUBLISHED"],
    ].map(async ([referenceNo, title, status]) =>
      db.jobRequisition.upsert({
        where: { referenceNo },
        update: { organizationId: organization.id, title, status },
        create: {
          organizationId: organization.id,
          referenceNo,
          title,
          status,
          approvedAt: new Date(),
          openedAt: new Date(),
        },
      }),
    ),
  );

  const candidates = [
    {
      referenceNo: "TM-CAND-001",
      firstName: "Aarav",
      lastName: "Sharma",
      email: "aarav.sharma@example.test",
      phone: "9000000001",
      roleOfInterest: "People Operations Specialist",
      source: "ONLINE",
      status: "APPLIED",
      requisitionReference: "TM-REQ-001",
    },
    {
      referenceNo: "TM-CAND-002",
      firstName: "Meera",
      lastName: "Nair",
      email: "meera.nair@example.test",
      phone: "9000000002",
      roleOfInterest: "People Operations Specialist",
      source: "REFERRAL",
      status: "SCREENING",
      requisitionReference: "TM-REQ-001",
    },
    {
      referenceNo: "TM-CAND-003",
      firstName: "Rohan",
      lastName: "Kapoor",
      email: "rohan.kapoor@example.test",
      phone: "9000000003",
      roleOfInterest: "Senior Frontend Engineer",
      source: "LINKEDIN",
      status: "SHORTLISTED",
      requisitionReference: "TM-REQ-002",
    },
    {
      referenceNo: "TM-CAND-004",
      firstName: "Ishita",
      lastName: "Rao",
      email: "ishita.rao@example.test",
      phone: "9000000004",
      roleOfInterest: "Senior Frontend Engineer",
      source: "ONLINE",
      status: "INTERVIEW",
      requisitionReference: "TM-REQ-002",
    },
    {
      referenceNo: "TM-CAND-005",
      firstName: "Kabir",
      lastName: "Mehta",
      email: "kabir.mehta@example.test",
      phone: "9000000005",
      roleOfInterest: "Customer Success Manager",
      source: "REFERRAL",
      status: "SELECTED",
      requisitionReference: "TM-REQ-003",
    },
    {
      referenceNo: "TM-CAND-006",
      firstName: "Ananya",
      lastName: "Iyer",
      email: "ananya.iyer@example.test",
      phone: "9000000006",
      roleOfInterest: "Customer Success Manager",
      source: "ONLINE",
      status: "HOLD",
      requisitionReference: "TM-REQ-003",
    },
    {
      referenceNo: "TM-CAND-007",
      firstName: "Vihaan",
      lastName: "Joshi",
      email: "vihaan.joshi@example.test",
      phone: "9000000007",
      roleOfInterest: "Customer Success Manager",
      source: "WALK_IN",
      status: "REJECTED",
      requisitionReference: "TM-REQ-003",
    },
    {
      referenceNo: "TM-CAND-008",
      firstName: "Sara",
      lastName: "Thomas",
      email: "sara.thomas@example.test",
      phone: "9000000008",
      roleOfInterest: "People Operations Specialist",
      source: "ONLINE",
      status: "APPLIED",
      requisitionReference: "TM-REQ-001",
    },
  ];

  for (const candidateData of candidates) {
    const { requisitionReference, ...candidateValues } = candidateData;
    const candidate = await db.candidate.upsert({
      where: { referenceNo: candidateData.referenceNo },
      update: { organizationId: organization.id, ...candidateValues },
      create: {
        organizationId: organization.id,
        declarationAccepted: true,
        consentAccepted: true,
        ...candidateValues,
      },
    });
    const requisition = requisitions.find((item) => item.referenceNo === requisitionReference);
    if (!requisition) throw new Error(`Seed requisition not found: ${requisitionReference}`);
    await db.application.upsert({
      where: {
        candidateId_requisitionId: { candidateId: candidate.id, requisitionId: requisition.id },
      },
      update: { organizationId: organization.id },
      create: {
        organizationId: organization.id,
        referenceNo: `TM-APP-${candidateData.referenceNo.slice(-3)}`,
        candidateId: candidate.id,
        requisitionId: requisition.id,
        status: candidateData.status,
      },
    });
  }

  console.log(`Triple Minds seed complete. Organization: ${organization.slug}. Admin: ${email}.`);
  console.log(
    "Use SEED_ADMIN_PASSWORD from the environment to sign in; the default is intended for local development only.",
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
