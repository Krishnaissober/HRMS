export const LEAVE_PERMISSIONS = {
  read: "leave.read",
  request: "leave.request",
  approve: "leave.approve",
  typesManage: "leave.types.manage",
  balancesManage: "leave.balances.manage",
  carryForward: "leave.carry-forward",
} as const;

export const LEAVE_APPROVAL_POLICIES = ["MANAGER", "HR", "MANAGER_THEN_HR"] as const;
export const LEAVE_REQUEST_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

