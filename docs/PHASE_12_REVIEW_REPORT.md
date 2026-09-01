# Phase 12 Review Report — Offboarding / Exit Management

## Final decision

**PHASE 12 NOT READY FOR PHASE 13**

The implementation has a valid additive database foundation and protected API contracts, but the confirmed Phase 12 scope is not fully complete. Application findings remain in addition to the unresolved persisted Phase 12 Playwright gate.

`docs/SRS.md` was not modified. Phase 13 was not started.

## Requirement-by-requirement review

| SRS reference | Area | Status | Severity | Classification |
|---|---|---|---|---|
| FR-280 / P577 | Exit case/resignation | PARTIAL | HIGH | Application defect |
| FR-281 / P578 | Notice period and expected last working day | IMPLEMENTED at API/data level | MEDIUM | Code verified; UI incomplete |
| FR-282 / P579 | Clearance tasks | PARTIAL | HIGH | Application defect |
| FR-283 / P580 | Exit interview | PARTIAL | MEDIUM | Application defect |
| FR-284 / P581 | Access revocation | PARTIAL | HIGH | Application defect |
| FR-285 / P582 | Exit documents | PARTIAL | HIGH | Application/UI gap |
| FR-286 / P583 | Exited/Inactive status and history | PARTIAL | HIGH | Application defect |
| FR-203 / P535 | Asset return and clearance | PARTIAL | HIGH | Application defect |
| FR-002 / FR-003 | Tenant isolation and RBAC | PARTIAL | HIGH | Application security defect |
| FR-006 / §23 P590 | Audit consistency | PARTIAL | MEDIUM | Missing coverage/edge handling |
| FR-260–FR-263 | Notifications, reminders, task center | NOT IMPLEMENTED for Phase 12 events | MEDIUM | Application defect |
| §31.4 / P250 | Compliance/audit reporting | PARTIAL | MEDIUM | Application/UI gap |

## Findings

### HIGH — Exit initiation does not implement the SRS actor boundary

SRS: FR-280. The only new initiation route is `POST /api/v1/employees/{id}/exit`, protected by `employees.exit.manage`. There is no employee self-service or manager-scoped initiation path, and no manager/team-scope enforcement. The implementation therefore supports an HR-permission path, not “employees/managers/HR shall initiate resignation according to configured policy.”

Remediation: add the permitted self-service/manager initiation path using existing employee identity and team-scope rules, or formally document the approved policy interpretation before changing code. Add negative tests for unrelated employees and out-of-team managers.

### HIGH — Clearance task authorization is organization-wide

SRS: FR-282 and the confirmed scope require departmental/assigned task boundaries. `PATCH /api/v1/exit/tasks/{taskId}/status` checks only `employees.exit.manage`; it does not verify the actor is the assigned user, an authorized department role, or an appropriate HR role. `assignedToUserId` is stored but not enforced.

Remediation: enforce assignment/department or explicit HR override server-side and test unauthorized task completion, reassignment, and cross-tenant access.

### HIGH — Asset return does not bind the asset to the employee in the URL

SRS: FR-203 and tenant/security scope. The route includes `{id}` and `{assetId}`, but the service accepts only `assetId` plus organization and never verifies that the asset belongs to `{id}`. A same-tenant authorized actor could return another employee’s asset by ID.

Remediation: require the employee ID in the asset query and verify the exit case/employee relationship; add wrong-employee and cross-tenant tests.

### HIGH — Access revocation is implicit and lacks a separate auditable action/state contract

SRS: FR-284. Completion bulk-updates existing access records to `REVOKED`, but there is no access-revocation task/event record, no per-access audit event, and no verification that the actor is authorized for access administration beyond general exit management. Integrated deactivation providers are not represented.

Remediation: reuse the existing access foundation to create/track an auditable revocation action or task, preserve affected access IDs/outcomes, and enforce the appropriate access-management permission or explicit HR override.

### HIGH — Exit completion and employee state are not fully guarded

SRS: FR-286. The completion service changes the employee to `EXITED`, but the API has no explicit exit-case transition endpoint/history, and it does not require an exit interview or settlement record to exist; settlement is optional and is only checked when present. There is also no post-exit API regression coverage proving employee updates, document access, onboarding changes, or other sensitive operations are restricted appropriately.

Remediation: define and enforce only the SRS-approved completion prerequisites, expose/retrieve the exit state/history, and add post-termination authorization tests without destroying historical access.

### HIGH — Settlement is an unrestricted upsert, not a guarded workflow

SRS: Phase 12 final settlement scope and security requirements. `PATCH /api/v1/exit/{id}/settlement` can create or overwrite a settlement in any submitted status, including `COMPLETED`, without validating prior state, preventing conflicting/repeated financial changes, or checking that the actor is within the intended finance/HR scope beyond one broad permission. There is no recalculation or link to existing payroll/finance source data.

Remediation: enforce valid settlement transitions, idempotency/concurrency behavior, source-data consistency, and negative tests for duplicate/concurrent/unauthorized settlement actions.

### HIGH — Required Phase 12 UI workflow is incomplete

SRS/scope sections 3–4. `/hr/offboarding` lists exit cases and exposes only “Complete exit.” It does not provide UI controls for initiation, notice, clearance task creation/completion, exit interview, asset return, settlement, access revocation, or exit-document generation/attachment/download. Those API-only capabilities do not satisfy the confirmed UI workflow scope.

Remediation: add the minimum role-aware panels/forms using existing components and APIs, with loading, validation, error, empty, confirmation, and access-denied states.

### HIGH — Exit-document workflow is not integrated

SRS: FR-285. The completion report claims reuse of existing employee document APIs, but there is no Phase 12 route or UI flow tying an exit case to authorized experience/relieving/exit documents, and no Phase 12-specific persisted authorization/audit test for generation, attachment, or download.

Remediation: connect existing document/storage abstractions to the exit case with permitted document types, ownership, secure download, and audit coverage. Keep live storage status separate if S3 is unavailable.

### MEDIUM — Missing exit-case retrieval/history API

Confirmed scope API requirements include retrieve/update/transition/history. Only list, create, task, interview, settlement, complete, and asset-return routes exist. There is no `GET /api/v1/exit/{id}` or exit history endpoint.

Remediation: add tenant-scoped retrieval/history using existing employee history/audit conventions.

### MEDIUM — Notifications/reminders/task-center are not wired to exit events

SRS: FR-260–FR-263 and scope section 10. Exit creation, task assignment, pending clearance, settlement, and completion do not persist or enqueue the applicable in-app/email/reminder/task-center events. External delivery should remain environment-classified, but the application contract is missing.

Remediation: use existing notification/task abstractions and test persisted notification contracts without faking external delivery.

### MEDIUM — Audit edge cases lack complete coverage

The main mutations use transactional audit writes, but bulk access revocation is represented only by the completion event, and settlement updates can overwrite financial data while emitting a generic event. There are no persisted tests for rollback, concurrent updates, per-resource authorization, or post-exit access.

Remediation: add focused transactional and negative tests; preserve outcomes and affected resources where the existing audit schema permits.

### MEDIUM — Compliance/audit reporting is not implemented as a Phase 12 workflow

The scope includes compliance/audit reporting, but no Phase 12 report or export route/page was added. Existing generic audit/report capabilities are not shown to expose exit-case evidence with the required server-side scope and auditability.

Remediation: verify or add the minimum scoped compliance/audit report using existing reporting conventions; do not invent new KPIs.

## Security and tenant review

Positive findings:

- New routes use authenticated context and server-side permission checks.
- New records carry organization IDs and service queries generally include organization scope.
- Exit creation has a unique employee constraint and transactional history/audit writes.
- Clearance task state rejects non-OPEN transitions.

Remaining issues:

- manager/team and employee self-service boundaries are not implemented;
- assigned clearance task scope is not enforced;
- asset route does not verify the parent employee;
- settlement scope is broad and state transitions are not guarded;
- no post-exit access regression tests;
- no Phase 12 persisted tenant/RBAC workflow test.

## Fresh validation

| Check | Result | Evidence |
|---|---|---|
| Unit/API tests | PASS | 26 files, 97 tests |
| Focused Phase 12 API tests | PASS | 3 contract tests; not persisted DB tests |
| Playwright | FAILED / NOT COMPLETE | Fresh run progressed through existing workflows but stalled during persisted employee/onboarding workflow; no completed Phase 12 workflow was produced |
| Lint | PASS | Fresh command completed without errors |
| Typecheck | PASS | Fresh command completed without errors |
| Production build | NOT COMPLETED IN THIS REVIEW RUN | Prior completion report recorded PASS with the existing optional Valkey warning; a fresh chained run did not reach build after Playwright stall |
| Prisma validation | PASS | Schema valid |
| Prisma migration status | PASS | Database up to date; 17 migrations found |
| Prisma migration diff | PASS | Empty migration against configured PostgreSQL |
| Health | PASS | HTTP 200 |
| Readiness | PASS | HTTP 200 |
| PostgreSQL | CODE VERIFIED / status verified | Configured database reachable and migrations current; complete Phase 12 workflow not persisted |
| Redis/BullMQ | ENVIRONMENT BLOCKED | Live availability not established |
| S3 | ENVIRONMENT BLOCKED | Live object storage not established |

The build warning documented previously remains the optional BullMQ `@valkey/valkey-glide` resolution warning; it is informational unless the configured queue path requires that provider.

## Required remediation before Phase 13

1. Complete the role-aware exit initiation, clearance, asset-return, access-revocation, settlement, document, notification, retrieval/history, and compliance-report workflows.
2. Fix asset parent-employee authorization and enforce clearance assignment/team scope.
3. Guard settlement transitions and concurrent updates.
4. Add persisted PostgreSQL API tests and a complete authenticated Playwright workflow covering the required sequence and negative tenant/RBAC cases.
5. Re-run the full fresh validation suite, including production build and available Redis/S3 checks.

## What must not change

- Do not modify `docs/SRS.md`.
- Do not start Phase 13.
- Do not invent additional exit states, settlement formulas, approval chains, notification channels, or external integrations.
- Do not reset/delete PostgreSQL data or replace the existing auth, RBAC, tenant, audit, storage, or notification foundations.
