# Phase 7 Remediation Report

Date: 2026-08-18  
Scope: Phase 7 leave-management review findings only  
Final decision: PHASE 7 READY FOR PHASE 8

## Scope control

The remediation used frozen `docs/SRS.md` and the findings in `docs/PHASE_7_REVIEW_REPORT.md`. The SRS was not modified, no Phase 8 functionality was started, and no payroll behavior was introduced.

## Finding results

### HIGH approval authority: RESOLVED

- Decision authorization remains protected by `leave.approve` and is now also validated against the persisted approval step.
- A manager step requires the authenticated actor to be the employee's assigned manager in the same organization.
- HR steps require an authorized leave approver. A prior manager-step actor cannot also complete the subsequent HR step.
- Self-approval, wrong-team manager action, cross-tenant IDs, non-pending transitions, and repeated final decisions are rejected at service/API level.
- Actor, timestamp, reason, approval history, notification, and audit records remain transactional.
- Manager request lists and calendars are limited to direct reports; non-employee HR approvers retain organization scope through RBAC.

### HIGH holiday/roster/balance consistency: RESOLVED

- Final approval recalculates chargeable dates from the shared Phase 6 holiday/weekly-off rules and persists the approved duration used for both balance debit and attendance.
- If the pending request no longer contains a chargeable day, approval is rejected.
- Approved leave is deterministically reconciled when holidays, shifts, roster assignments, or weekly-off configuration changes.
- Reconciliation updates the request duration, balance usage, balance transaction history, `LEAVE` attendance rows, and audit event in the same transaction.
- A policy change that would exceed remaining balance is rejected atomically.
- Persisted testing verifies approved leave, weekly-off/roster changes, restoration, holiday creation, balance recalculation, attendance deletion/recreation, and audit-compatible persistence.
- No payroll calculations were added. Reversal/cancellation remains not applicable because the frozen SRS defines only pending, approved, and rejected leave states.

### HIGH FR-140 policy configuration: RESOLVED

- The HR leave-management page now exposes the existing frozen-policy fields: name/code, default allocation, eligibility by employment type/department, accrual frequency, carry-forward enablement/limit, and manager/HR/multi-level approval policy.
- The same page provides employee/type/year balance allocation and carry-forward controls.
- All writes use the existing protected versioned APIs, organization context, Zod validation, RBAC, transactional persistence, and audit events.
- No additional policy categories or approval hierarchy were invented.
- Persisted UI validation confirms the policy and balance management surfaces are available.

### MEDIUM attachment ownership: RESOLVED

- Submission now requires the exact authenticated employee prefix: `employees/{organizationId}/{employeeId}/leave/`.
- Object metadata remains verified through the storage abstraction.
- Added a protected attachment download contract that allows only the owning employee, assigned manager, or organization-authorized non-employee HR actor.
- Cross-tenant, same-tenant wrong-employee, missing, and malformed ownership paths are rejected; successful download intent is audited.

### MEDIUM manager team scope: RESOLVED

- Manager request lists and leave calendars resolve the authenticated employee and restrict results to employees whose `managerEmployeeId` matches that manager.
- Explicit employee filters outside the manager's team are rejected.
- Tenant predicates remain mandatory. HR actors who are not employee-manager identities retain company scope under `leave.read`.

### MEDIUM notification routing: RESOLVED

- Manager-step requests are routed to the assigned manager.
- HR-step requests resolve an active organization member with `leave.approve`, excluding the requester.
- Manager-to-HR progression resolves a different eligible HR approver.
- Final approval/rejection notifications target the employee.
- Notification intent is persisted within the corresponding business transaction; tests assert the persisted requested/approved/rejected types and request recipient.
- Live third-party delivery was not faked.

### MEDIUM carry-forward idempotency: RESOLVED

- Carry-forward runs under PostgreSQL serializable isolation.
- Existing carry-forward transaction identity is checked, including zero-value carry-forward; repeated execution cannot add duplicate history.
- Serialization conflicts return a safe 409.
- Persisted concurrent execution verifies exactly one 201 and one 409, followed by repeated-execution rejection.

### MEDIUM concurrency: RESOLVED

- Leave requests, decisions, balance updates, and carry-forward use serializable transaction patterns with conflict handling.
- Persisted coverage includes two requests competing for one day of balance, concurrent final decisions, concurrent carry-forward, and concurrent balance writes.
- Assertions verify one request/decision/carry-forward wins where exclusivity is required, invalid retries conflict, and balances do not become negative or duplicate final state.

### External email: ENVIRONMENT BLOCKED

The application is configured with the development console provider. Notification intent and persistence are verified, but no live external provider credentials were supplied. External delivery remains `ENVIRONMENT BLOCKED` and is not represented as passed.

## API and UI changes

- Hardened `GET /api/v1/leave-requests` with manager team scope.
- Hardened `GET /api/v1/leave-calendar` with approved-only calendar data and manager team scope.
- Hardened leave decision service with approval-step authority.
- Hardened request attachment ownership and added protected `GET /api/v1/leave-requests/{id}/attachment`.
- Expanded `/hr/leave/manage` with complete FR-140 policy and balance configuration controls.
- Reused existing leave-type, balance, carry-forward, employee-directory, approval, tenant, RBAC, audit, and storage APIs.

## Verification

| Check | Result |
|---|---|
| Unit/API tests | PASS — 17 files, 65 tests |
| Focused persisted Phase 7 workflow | PASS |
| Full Playwright run 1 | PASS — 9/9 |
| Full Playwright run 2 | PASS — 9/9 |
| Final enhanced persisted workflow | PASS |
| Lint | PASS |
| Typecheck | PASS |
| Production build | PASS WITH EXISTING WARNING |
| Prisma validation | PASS |
| Migration status | PASS — 11 migrations, database current |
| Migration diff | PASS — no difference |
| PostgreSQL persistence | PASS |
| Frozen SRS integrity | PASS — SHA-256 `ADFCA7D01C87C33884BD0C3F2CA726DBECDCCFE83F249D48F2365415AE104E09` |

The production build still reports BullMQ's optional `@valkey/valkey-glide` resolution warning. The configured ioredis path builds and operates; this is not a Phase 7 application blocker.

## Final gate

HIGH approval authority: RESOLVED  
HIGH holiday/roster/balance consistency: RESOLVED  
HIGH FR-140 policy configuration: RESOLVED  
MEDIUM attachment ownership: RESOLVED  
MEDIUM manager team scope: RESOLVED  
MEDIUM notification routing: RESOLVED  
MEDIUM carry-forward idempotency: RESOLVED  
MEDIUM concurrency: RESOLVED  
External email: ENVIRONMENT BLOCKED

PHASE 7 READY FOR PHASE 8
