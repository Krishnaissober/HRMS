export const EMPLOYEE_STATUSES = ["PROBATION", "ACTIVE", "CONFIRMED", "TRANSFERRED", "PROMOTED", "EXITED", "INACTIVE"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];
export const EMPLOYEE_STATUS_TRANSITIONS: Record<EmployeeStatus, readonly EmployeeStatus[]> = {
  PROBATION: ["ACTIVE", "CONFIRMED"],
  ACTIVE: ["PROBATION", "CONFIRMED", "TRANSFERRED", "PROMOTED"],
  CONFIRMED: ["TRANSFERRED", "PROMOTED"],
  TRANSFERRED: ["PROMOTED", "CONFIRMED"],
  PROMOTED: ["TRANSFERRED", "CONFIRMED"],
  EXITED: ["INACTIVE"],
  INACTIVE: [],
};
export const ONBOARDING_STATUSES = ["PRE_JOINING", "IN_PROGRESS", "COMPLETED", "BLOCKED"] as const;
export const ONBOARDING_TASK_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "OVERDUE"] as const;
export const ONBOARDING_DOCUMENT_STATUSES = ["REQUESTED", "UPLOADED", "VERIFIED", "REJECTED"] as const;
export const EMPLOYEE_PERMISSIONS = {
  read: "employees.read",
  create: "employees.create",
  update: "employees.update",
  status: "employees.status.update",
  historyRead: "employees.history.read",
  onboardingRead: "onboarding.read",
  onboardingManage: "onboarding.manage",
  tasksComplete: "onboarding.tasks.complete",
  documentsRead: "employees.documents.read",
  documentsWrite: "employees.documents.write",
  documentsVerify: "employees.documents.verify",
  assetsManage: "employees.assets.manage",
  accessManage: "employees.access.manage",
  mentorManage: "employees.mentor.manage",
  selfRead: "employees.self.read",
  selfUpdate: "employees.self.update",
  exitRead: "employees.exit.read",
  exitManage: "employees.exit.manage",
  exitSettle: "employees.exit.settle",
  exitTeamManage: "employees.exit.team.manage",
} as const;
