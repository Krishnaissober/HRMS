import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

export default async function globalSetup() {
  loadEnvConfig(process.cwd());
  const db = new PrismaClient();
  const baseUrl = process.env.E2E_BASE_URL || "http://127.0.0.1:3000";
  const trustedOrigin = process.env.APP_URL || "http://localhost:3000";
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = process.env.E2E_EMAIL || `phase3-e2e-${runId}@example.test`;
  const password = process.env.E2E_PASSWORD || `Phase3-E2E-${runId}-local!`;
  const signUpResponse = await fetch(`${baseUrl}/api/auth/sign-up/email`, { method: "POST", headers: { "content-type": "application/json", origin: trustedOrigin }, body: JSON.stringify({ name: "Phase 3 E2E User", email, password }) });
  if (!signUpResponse.ok && ![400, 409, 422].includes(signUpResponse.status)) throw new Error(`Could not create E2E auth user: ${signUpResponse.status} ${await signUpResponse.text()}`);
  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error(`E2E auth user was not created for ${email}`);
  const e2eUser = user;
  const approverEmail = `phase7-approver-${runId}@example.test`;
  const approverPassword = `Phase7-Approver-${runId}-local!`;
  const approverSignUp = await fetch(`${baseUrl}/api/auth/sign-up/email`, { method: "POST", headers: { "content-type": "application/json", origin: trustedOrigin }, body: JSON.stringify({ name: "Phase 7 Leave Approver", email: approverEmail, password: approverPassword }) });
  if (!approverSignUp.ok) throw new Error(`Could not create Phase 7 approver: ${approverSignUp.status} ${await approverSignUp.text()}`);
  const approverUser = await db.user.findUniqueOrThrow({ where: { email: approverEmail } });
  const organization = await db.organization.create({ data: { name: `Phase 3 E2E ${runId}`, slug: `phase3-e2e-${runId}` } });
  const otherOrganization = await db.organization.create({ data: { name: `Phase 3 E2E Other ${runId}`, slug: `phase3-e2e-other-${runId}` } });
  const permissionNames = ["dashboard.hr.read", "dashboard.recruitment.read", "candidates.read", "interviews.read", "interviews.create", "interviews.update", "interviews.evaluate", "interviews.attendance", "interviews.schedule", "candidate-attendance.read", "candidate-attendance.check-in", "candidate-attendance.check-out", "candidate-attendance.manage", "candidate-attendance.exceptions", "hiring-decisions.read", "hiring-decisions.write", "offers.read", "offers.create", "offers.approve", "offers.send", "employees.read", "employees.create", "employees.update", "employees.status.update", "employees.history.read", "employees.self.read", "employees.self.update", "onboarding.read", "onboarding.manage", "onboarding.tasks.complete", "employees.documents.read", "employees.documents.write", "employees.documents.verify", "employees.assets.manage", "employees.access.manage", "employees.mentor.manage", "attendance.read", "attendance.check-in", "attendance.check-out", "attendance.manage", "attendance.corrections.request", "attendance.corrections.approve", "shifts.manage", "rosters.manage", "holidays.manage", "leave.read", "leave.request", "leave.approve", "leave.types.manage", "leave.balances.manage", "leave.carry-forward"];
  const permissions = await Promise.all(permissionNames.map((name) => db.permission.upsert({ where: { name }, update: {}, create: { name, description: "Phase 3 E2E permission" } })));
  const phase8Permissions = await Promise.all(["documents.read", "documents.manage", "notifications.read", "tasks.read", "tasks.manage", "salary.read", "salary.manage", "payroll.read", "payroll.manage", "payroll.review", "payroll.approve", "payslips.generate", "payslips.download", "expenses.submit", "expenses.read", "expenses.approve", "expenses.pay", "payroll.reports", "reports.export", "audit.read", "employees.exit.read", "employees.exit.manage", "employees.exit.settle"].map((name) => db.permission.upsert({ where: { name }, update: {}, create: { name, description: "Phase 8/9/11/12 E2E permission" } })));
  permissions.push(...phase8Permissions);
  async function addMembership(organizationId: string) {
    const role = await db.role.create({ data: { organizationId, name: "Phase 3 E2E HR", slug: `phase3-e2e-hr-${runId}` } });
    await db.rolePermission.createMany({ data: permissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })) });
    const membership = await db.membership.create({ data: { organizationId, userId: e2eUser.id, status: "ACTIVE" } });
    await db.membershipRole.create({ data: { membershipId: membership.id, roleId: role.id } });
  }
  await addMembership(organization.id);
  await addMembership(otherOrganization.id);
  async function addApproverMembership(organizationId: string) {
    const role = await db.role.create({ data: { organizationId, name: "Phase 7 E2E Leave Approver", slug: `phase7-e2e-approver-${runId}` } });
    const approverPermissions = permissions.filter((permission) => ["leave.read", "leave.approve"].includes(permission.name));
    await db.rolePermission.createMany({ data: approverPermissions.map((permission) => ({ roleId: role.id, permissionId: permission.id })) });
    const membership = await db.membership.create({ data: { organizationId, userId: approverUser.id, status: "ACTIVE" } });
    await db.membershipRole.create({ data: { membershipId: membership.id, roleId: role.id } });
  }
  await addApproverMembership(organization.id);
  await addApproverMembership(otherOrganization.id);
  const requisition = await db.jobRequisition.create({ data: { organizationId: organization.id, referenceNo: `REQ-E2E-${runId}`, title: "Phase 3 E2E Role", status: "PUBLISHED", approvedAt: new Date(), openedAt: new Date() } });
  const candidate = await db.candidate.create({ data: { organizationId: organization.id, referenceNo: `CAND-E2E-${runId}`, firstName: "Phase", lastName: "Candidate", email: `candidate-${runId}@example.test`, phone: `900${String(Date.now()).slice(-7)}`, roleOfInterest: requisition.title, source: "WALK_IN", declarationAccepted: true, consentAccepted: true, status: "INTERVIEW" } });
  const application = await db.application.create({ data: { organizationId: organization.id, referenceNo: `APP-E2E-${runId}`, candidateId: candidate.id, requisitionId: requisition.id, status: "INTERVIEW" } });
  process.env.E2E_EMAIL = email;
  process.env.E2E_PASSWORD = password;
  process.env.E2E_ORGANIZATION_ID = organization.id;
  process.env.E2E_OTHER_ORGANIZATION_ID = otherOrganization.id;
  process.env.E2E_CANDIDATE_ID = candidate.id;
  process.env.E2E_APPLICATION_ID = application.id;
  process.env.E2E_INTERVIEWER_ID = e2eUser.id;
  process.env.E2E_FIXTURE_ORGANIZATION_ID = organization.id;
  process.env.E2E_FIXTURE_USER_ID = e2eUser.id;
  process.env.E2E_LEAVE_APPROVER_EMAIL = approverEmail;
  process.env.E2E_LEAVE_APPROVER_PASSWORD = approverPassword;
  process.env.E2E_LEAVE_APPROVER_ID = approverUser.id;
  return async () => {
    await db.organization.deleteMany({ where: { id: { in: [organization.id, otherOrganization.id] } } });
    if (email.startsWith("phase3-e2e-") && email.endsWith("@example.test")) await db.user.delete({ where: { id: e2eUser.id } }).catch(() => undefined);
    await db.user.delete({ where: { id: approverUser.id } }).catch(() => undefined);
    await db.$disconnect();
  };
}
