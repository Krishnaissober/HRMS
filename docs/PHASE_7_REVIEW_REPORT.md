# Phase 7 Final Review Report

Date: 2026-08-18  
Review type: Final review; no new features or remediation  
Source of truth: `docs/SRS.md`  
Decision: PHASE 7 NOT READY FOR PHASE 8

## 1. Review scope and method

The implementation was reviewed against frozen requirements FR-140 through FR-145 and the claims in `docs/PHASE_7_COMPLETION_REPORT.md`. The review covered the Prisma schema and migration, leave service and repository, versioned API routes, RBAC, employee and manager/HR pages, storage integration, unit/API tests, and the persisted Playwright workflow.

`docs/SRS.md` was not modified. Its SHA-256 remains `ADFCA7D01C87C33884BD0C3F2CA726DBECDCCFE83F249D48F2365415AE104E09`. Phase 8 was not started.

## 2. Requirements coverage

| Area | SRS reference | Classification | Review result |
|---|---|---|---|
| Leave types | FR-140 | PARTIALLY IMPLEMENTED | Model/API accept eligibility, accrual, carry-forward, and approval policy, but HR UI exposes only name/code and hardcodes the rest. Accrual policy is stored but has no balance-accrual behavior. |
| Leave balances | FR-143 | IMPLEMENTED WITH ISSUES | Allocated/carried/used values and transactions persist, but concurrency and carry-forward edge cases lack verification. |
| Leave requests | FR-141 | IMPLEMENTED WITH ISSUE | Authenticated self-service, dates, duration, type, reason, and optional attachment metadata exist; submitted attachment ownership is insufficiently bound to the employee. |
| Approval/rejection | FR-142 | PARTIALLY IMPLEMENTED | States and multi-step persistence exist, but manager-versus-HR authority is not enforced. |
| Invalid transitions | FR-142 | IMPLEMENTED | Non-pending decisions and duplicate final decisions are rejected. |
| Overlap prevention | FR-141/FR-143 | IMPLEMENTED, TEST GAP | Pending/approved overlap is checked in a serializable request transaction; no concurrent request regression test proves the race behavior. |
| Holidays/weekly offs | FR-145 | IMPLEMENTED WITH ISSUE | Phase 6 rules are reused, but approval does not reconcile duration when calendar rules changed after submission. |
| Carry-forward | FR-140/FR-143 | IMPLEMENTED WITH ISSUE | Remaining-balance cap works for the tested case; zero-value duplicate and concurrent execution are not safely covered. |
| Encashment | — | NOT APPLICABLE | The frozen SRS does not require encashment. Correctly not implemented. |
| Attendance integration | FR-145 | IMPLEMENTED WITH HIGH ISSUE | Approval creates `LEAVE` attendance, but duration and affected dates can diverge after holiday/roster changes. No reversal exists; reversal is not a frozen SRS state. |
| Notifications | Phase 7 supporting scope | PARTIALLY IMPLEMENTED | Atomic persistence exists, but request routing can notify the employee instead of HR and external email remains blocked. |
| Employee self-service | FR-141/FR-143 | IMPLEMENTED | Session-derived employee identity, balances, requests, and approval history are available. |
| Manager/HR workflow | FR-140/FR-142/FR-144 | PARTIALLY IMPLEMENTED | Queue and decisions exist; policy configuration, balance management, and manager/team boundaries are incomplete in UI/authorization. |
| Reports/history | FR-143/FR-144 | PARTIALLY IMPLEMENTED | Request, approval, balance transaction history, and calendars exist; no dedicated report is required by the frozen SRS. The UI does not expose balance transaction history. |
| PostgreSQL persistence | FR-143 | IMPLEMENTED | Migration and persisted workflow evidence are present. |

## 3. Findings

### HIGH-01 — Approval policy does not enforce manager and HR authority

- SRS reference: FR-142.
- Current behavior: every decision route requires only `leave.approve`. The service reads `approvalStep`, but it does not verify that a `MANAGER` step is performed by the employee's manager or that an `HR` step is performed by an HR-authorized role. The same user with `leave.approve` can complete both steps of `MANAGER_THEN_HR`.
- Expected behavior: manager, HR, and multi-level workflows must preserve the configured actor class/relationship for each step.
- Risk: configured approval policy can be bypassed, and multi-level approval can collapse into repeated action by one generic approver.
- Recommendation: enforce step-specific authorization in the service using the existing membership/RBAC and employee manager relationship; add manager-only, HR-only, same-actor multi-level, unauthorized-step, and cross-tenant tests.

### HIGH-02 — Calendar changes can make balance debit and attendance impact inconsistent

- SRS reference: FR-143 and FR-145.
- Current behavior: request duration is calculated at submission. Approval recalculates chargeable dates but still debits the original `durationDays`. If a holiday or weekly-off/roster rule changes while the request is pending, the number of `LEAVE` attendance rows can differ from the balance debit. An all-non-chargeable request can still be approved and debited after such a change.
- Expected behavior: approved leave balance usage and attendance processing must represent the same policy-evaluated dates/duration.
- Risk: incorrect leave balances and attendance reports.
- Recommendation: at approval, atomically reconcile and persist the policy-approved duration or reject a request whose chargeable duration changed; test holiday addition/removal and roster/weekly-off changes between request and approval.

### HIGH-03 — FR-140 HR configuration is not complete in the product UI

- SRS reference: FR-140.
- Current behavior: the leave-type API/schema can store eligibility, accrual metadata, carry-forward, and approval policy, but the HR page exposes only name and code and hardcodes `allocationDays: 0` and `approvalPolicy: HR`. It has no controls for eligibility, accrual, carry-forward, active state, or approval policy. The same page has no balance allocation or carry-forward controls despite claiming manager/HR balance management.
- Expected behavior: HR must be able to configure the FR-140 policy through the implemented system, not only by crafting API requests.
- Risk: required policy behavior is inaccessible to normal HR users, and stored accrual frequency does not produce or schedule balance accrual.
- Recommendation: expose only the frozen FR-140 policy fields in the HR UI and define/enforce the supported accrual effect on persisted balances; add persisted UI coverage.

### MEDIUM-01 — Leave attachment ownership is only organization-scoped

- SRS reference: FR-141 and Phase 7 security requirements.
- Current behavior: upload keys are generated under `employees/{organizationId}/{employeeId}/leave/...`, but request submission accepts any key beginning with `employees/{organizationId}/`. It does not require the authenticated employee's exact key prefix.
- Expected behavior: an employee may attach only an object owned by that employee and organization.
- Risk: a user who learns another employee's object key could associate that object with their own leave request.
- Recommendation: validate the exact employee prefix after resolving self identity and add wrong-employee/same-tenant attachment tests.

### MEDIUM-02 — Manager access is organization-wide rather than team-scoped

- SRS reference: FR-144.
- Current behavior: `leave.read` allows an unqualified organization-wide request list and calendar. No manager-to-direct-report filter is enforced. The UI labels the same organization-wide surface “Manager / HR.”
- Expected behavior: managers see their team calendar; HR may see the company calendar.
- Risk: managers can read leave reasons and history for employees outside their team.
- Recommendation: distinguish manager team scope from HR company scope at the service boundary and add manager/non-report negative tests.

### MEDIUM-03 — Request notification recipient is incorrect for some policies

- SRS reference: notification persistence/contracts supporting Phase 7 and FR-142 workflow consistency.
- Current behavior: request notification goes to the employee's manager when present, otherwise back to the requesting employee. For an `HR` approval policy, no HR recipient is selected. For a manager-then-HR workflow, the manager approval notification also goes to the employee rather than an HR approver.
- Expected behavior: persisted notification state should target the actor responsible for the current approval step, while employee decision notifications target the employee.
- Risk: requests can remain pending without notifying an eligible approver even though notification rows exist.
- Recommendation: resolve step-eligible recipients from organization membership/RBAC and verify recipient, state, and transaction rollback behavior.

### MEDIUM-04 — Carry-forward permits repeat zero-value processing

- SRS reference: FR-140 and FR-143.
- Current behavior: duplicate detection checks whether an existing target has `carriedDays > 0`. A valid zero-day carry-forward leaves `carriedDays` at zero, so the same operation can be repeated, creating duplicate transaction and audit history. No unique source-year/target-year carry-forward key exists.
- Expected behavior: carry-forward is idempotent for an employee/type/year pair regardless of amount.
- Risk: misleading transaction and audit history.
- Recommendation: persist a unique carry-forward operation identity or detect the existing carry-forward transaction, including zero values; test repeated and concurrent execution.

### MEDIUM-05 — Critical leave concurrency and rollback cases are not tested

- SRS reference: FR-143 and audit consistency requirements.
- Current behavior: service transactions use PostgreSQL `Serializable` for request and decision paths, which is appropriate, but tests do not race two balance-consuming requests, two final approvals, or approval against a simultaneous balance update. The E2E “concurrent” assertion belongs to employee conversion, not leave.
- Expected behavior: one competing mutation succeeds and the other safely conflicts, with one balance debit, one final state, one attendance effect, one required notification, and one audit event.
- Risk: the completion report overstates race-condition verification.
- Recommendation: add real PostgreSQL concurrent request/approval tests and assert final row counts and rollback atomicity.

### LOW-01 — Self-service year query bypasses shared validation

- SRS reference: API validation/security.
- Current behavior: `/api/v1/me/leave?year=` converts the value with `Number()` without Zod range/integer validation. Invalid values can reach Prisma rather than returning the standard 4xx validation response.
- Expected behavior: versioned API query inputs use shared validation and safe errors.
- Recommendation: add a validated self-dashboard query schema and negative tests.

### ENVIRONMENT BLOCKED-01 — Live external email delivery

- Current behavior: notification rows are persisted, but the environment uses the console email provider.
- Classification: ENVIRONMENT BLOCKED.
- Prerequisite: configure supported external provider credentials and verify delivery without changing persistence semantics.

## 4. Specific risk conclusions

| Risk reviewed | Conclusion |
|---|---|
| Balance race/concurrent requests | Serializable implementation exists; persisted race proof is missing. MEDIUM test gap. |
| Approval beyond balance | Single approval rechecks remaining balance; concurrent approval behavior is not tested. |
| Duplicate approvals | Sequential duplicate final approval is rejected and E2E-tested. |
| Invalid rejection/approval | Rejection reason and non-pending transitions are enforced; approval-step actor type is not. HIGH. |
| Cross-tenant access | Organization filters and cross-tenant decision E2E are present; broader request/balance/type/calendar cross-tenant negative coverage is incomplete. |
| Employee self-approval | Same-email self-approval is rejected in service; no direct persisted negative assertion proves it. |
| Approval/reversal attendance | Approval exists; no reversal state is required by the frozen SRS. Calendar-policy drift on approval is HIGH. |
| Carry-forward | Tested positive cap path passes; zero duplicate and concurrent paths are missing. MEDIUM. |
| Encashment | Not required by the frozen SRS; correctly absent. |
| Audit consistency | Main mutations are transactional; concurrent/rollback event cardinality is not tested. |
| Notification consistency | Transactional persistence is sound; recipient routing is incomplete. MEDIUM. |

## 5. Test assessment

Focused `tests/leave-api.test.ts` execution passed 4/4 tests. These are route-contract tests with mocked service functions; they cover authentication forwarding, date/half-day validation, basic administration validation, rejection reason, and permission rejection.

The persisted Playwright workflow provides valuable real PostgreSQL coverage for one leave type, allocation, request, overlap, holiday exclusion, final HR approval, duplicate approval, carry-forward cap, rejection reason, persisted notification types, calendar display, balance debit, attendance creation, audit actions, and one cross-tenant decision.

Missing persisted/negative coverage includes:

- two concurrent leave requests consuming the same balance;
- two concurrent approvals and exact debit/audit/notification cardinality;
- approval after balance reduction;
- manager-versus-HR step enforcement and same-actor multi-level bypass;
- employee self-approval;
- same-tenant wrong-employee attachment ownership;
- manager access to a non-report employee;
- holiday/weekly-off changes between request and approval;
- zero and concurrent carry-forward;
- notification recipient correctness and transaction rollback;
- cross-tenant list, balance, type, calendar, and attachment paths;
- invalid self-service year query.

## 6. Pass items

- Organization-owned leave models and PostgreSQL migration.
- Authenticated employee identity derivation.
- Basic leave type, eligibility check, balance, request, and transaction persistence.
- Date, half-day, reason, file metadata, and list-query schemas.
- Pending/approved overlap check.
- Sequential invalid transition and duplicate approval rejection.
- Mandatory rejection reason.
- Positive carry-forward cap calculation.
- Holiday and weekly-off reuse for the stable-calendar case.
- Atomic business mutation, balance transaction, notification, attendance, and audit writes on the principal paths.
- Employee request/history UI, manager queue, and day/week/month calendar surfaces.
- Tenant predicates on leave repositories and service lookups.
- Real PostgreSQL persisted happy-path workflow.
- Encashment correctly excluded because it is not in the frozen SRS.

## 7. Recommended remediation before Phase 8

1. Enforce manager/HR/multi-level actor authority and prevent one actor from satisfying incompatible approval steps.
2. Reconcile chargeable dates and duration atomically at approval so attendance and balance cannot diverge.
3. Complete the FR-140 HR configuration and balance-management surfaces without adding fields beyond the frozen SRS.
4. Bind attachment object keys to the authenticated employee, not only the organization.
5. Enforce manager team scope separately from HR company scope.
6. Correct notification recipient routing for each approval step.
7. Make carry-forward idempotent for zero and concurrent cases.
8. Add real PostgreSQL concurrency, rollback, negative authorization, and policy-drift tests.
9. Validate self-service query parameters through the shared Zod conventions.

## 8. Final decision

Phase 7 has a substantial implemented foundation and its principal persisted happy path passes. It is not ready for Phase 8 because three HIGH application findings remain: configured approval authority can be bypassed, attendance and balance can diverge when calendar policy changes, and required HR policy configuration is not complete in the normal product workflow.

PHASE 7 NOT READY FOR PHASE 8
