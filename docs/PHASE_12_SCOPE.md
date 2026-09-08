# Phase 12 Scope — Exit and Compliance

Status: scope confirmation only. Phase 12 implementation has not started.

## 1. Objective

Implement the frozen SRS's employee exit/offboarding and compliance capabilities while preserving the employee's historical record. The phase covers resignation through clearance, final settlement, exit evidence, and compliance/audit reporting.

Authoritative sources: `docs/SRS.md`, `docs/PHASE_11_COMPLETION_REPORT.md`, and `docs/PHASE_11_REMEDIATION_REPORT.md`. `docs/SRS.md` remains unchanged.

## 2. Exact SRS requirements assigned to Phase 12

| SRS reference                          | Requirement                                                                                                                                                   | Priority          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| §31.4, P250                            | Exit and Compliance phase: resignation, notice, clearance, asset return, access revocation, final settlement, exit documents, and compliance/audit reporting. | Roadmap scope     |
| FR-280, P577                           | Employees, managers, or HR can initiate resignation according to configured policy.                                                                           | Must              |
| FR-281, P578                           | HR tracks notice period and expected last working day.                                                                                                        | Must              |
| FR-282, P579                           | Configurable clearance tasks for HR, IT, Finance, Assets, and other departments.                                                                              | Must              |
| FR-283, P580                           | HR records structured exit feedback and optional ratings through an exit interview.                                                                           | Must              |
| FR-284, P581                           | Offboarding triggers tasks/events for system-access deactivation where integrated.                                                                            | Must              |
| FR-285, P582                           | Authorized HR users generate or attach experience, relieving, and other exit documents.                                                                       | Must              |
| FR-286, P583                           | Employee transitions to Exited/Inactive without destroying compliance/reporting history.                                                                      | Must              |
| FR-203, P535                           | Offboarding supports asset return and clearance state.                                                                                                        | Should            |
| FR-002/FR-003/FR-006, security section | Enforce organization isolation, RBAC, and audit sensitive/admin actions.                                                                                      | Security baseline |
| FR-260–FR-263, P549–P552               | Use the existing notification center, configurable email events, reminders, and task center for applicable exit workflow events.                              | Must              |

The SRS does not prescribe additional exit states, approval levels, fields, settlement formulas, document templates, or provider-specific behavior. Those details must be resolved from existing project conventions or explicitly documented as implementation decisions before coding.

## 3. Functional requirements

- Initiate and track a resignation using the configured policy.
- Track notice period and expected last working day.
- Create and manage configurable departmental clearance tasks, including task status, assignment, and due information where supported by the existing task model.
- Support asset return and its relationship to clearance.
- Record a structured HR exit interview with optional ratings.
- Trigger access-deactivation tasks/events where an access integration exists; do not claim external deactivation without an available integration.
- Generate or attach authorized exit documents.
- Perform final settlement using the existing payroll/finance data and approved project conventions; no new payroll rules are implied by this scope.
- Transition the employee to Exited/Inactive while retaining historical records needed for reporting and compliance.
- Produce compliance/audit reporting from persisted exit and audit records.
- Preserve workflow history, actor identity, outcomes, and tenant context.

## 4. UI/pages required

Implement only the pages or sections needed to operate the requirements above, using existing employee, document, asset, task, notification, and audit UI patterns:

- Employee/HR exit initiation and exit-case view.
- Notice-period and last-working-day tracking.
- Clearance task list/workspace with departmental ownership.
- Asset-return/clearance view.
- HR exit-interview form and recorded history.
- Final-settlement view for authorized users.
- Exit-document generation/attachment and secure download controls.
- Employee exit-status/history view according to role permissions.
- Compliance/audit report view or export where required by the existing reporting conventions.

All pages need loading, validation, error, empty, confirmation, and responsive/accessibility states consistent with the application. No dashboard or widget redesign is included.

## 5. APIs required

Use the project's versioned API conventions and existing auth/tenant context. The minimum resource surface is:

- exit cases/resignation: create, retrieve, update/transition, and history;
- notice period and expected last working day;
- clearance configuration/tasks: create, assign, retrieve, update, complete, reject/return where the approved state model requires it;
- exit interview: create/retrieve/update for authorized HR users;
- asset return and clearance linkage;
- access-revocation task/event creation and status where an integration is available;
- final-settlement retrieval and completion for authorized roles;
- exit documents: attach/generate, list, version, download, and audit;
- employee Exited/Inactive transition;
- compliance/audit reporting and appropriately scoped export.

Exact routes, payload fields, and state names must follow existing API conventions and the SRS; this scope does not authorize invented endpoints or states.

## 6. Database/domain changes

Add or extend persisted domain records only where needed to represent the SRS requirements, likely around:

- exit case/resignation and notice data;
- clearance task configuration and task instances;
- exit interview feedback and ratings;
- asset return/clearance evidence;
- access-revocation task/event status;
- final-settlement records or links to existing payroll/expense data;
- exit-document metadata, versions, and ownership;
- employee status/history and compliance/audit references.

All writes must be transactional where multiple records form one business mutation. Existing employee, asset, document, task, notification, payroll, and audit records must be reused where they already model the requirement. Migrations must be additive, reviewed, and preserve existing data; no reset or destructive migration is in scope.

## 7. RBAC requirements

- Employees may initiate/view their own permitted exit information and documents only.
- Managers may act only within their configured team scope and only for actions permitted by the SRS/policy.
- HR Administrator/HR Manager roles may manage exit workflows, clearance, exit interviews, documents, and reports according to existing permission granularity.
- Finance/Payroll may access only settlement or clearance information required by their permission scope.
- IT/Assets/other clearance departments may access and complete only their assigned clearance tasks.
- Auditor/Compliance has read-only access to permitted audit/compliance evidence.
- Sensitive settlement data, exit documents, exports, downloads, approvals, and status transitions require explicit server-side permission checks.
- Deny by default; UI hiding is not a substitute for API/service authorization.

## 8. Tenant isolation

- Every exit case, resignation, notice record, clearance task, asset-return record, settlement record, document, notification, and audit event is organization-scoped.
- Organization context must come from the authenticated session/token and be verified server-side against every requested record.
- Managers' team scope must not broaden organization scope.
- Cross-tenant retrieval, mutation, download, export, task completion, or status transition must be rejected.
- Background jobs and integrations must carry and validate tenant context.

## 9. Audit requirements

Audit at minimum the initiation and material transitions of resignation/exit, notice changes, clearance actions, asset return, access-revocation events, settlement actions, exit-document generation/attachment/download, employee status transition, exports, and administrative configuration changes.

Each event must preserve actor, action, resource, timestamp, organization, request correlation ID where available, and outcome, without logging secrets or unnecessary personal data. Audit persistence must be consistent with the associated business mutation and retained for compliance/reporting.

## 10. Notifications and integrations

- Use the existing in-app notification center, configurable email-provider contract, reminder mechanism, and task center for applicable resignation, notice, clearance, pending-action, document, and exit events.
- Notification delivery must preserve tenant and recipient scope and must not be treated as proof that an external message was delivered unless the provider confirms it.
- Access deactivation is a task/event trigger “where integrated” (FR-284). Provider-specific access systems are not required unless already configured.
- No new calendar, biometric, accounting, payroll-provider, AI, or workflow-automation integration is Phase 12 scope; those are explicitly Phase 13 roadmap items.
- Redis/BullMQ or email availability remains an environment concern and must be reported honestly during implementation validation.

## 11. Testing requirements

Add persisted unit/API and Playwright coverage for:

- employee/manager/HR resignation initiation and invalid authorization;
- notice period and last-working-day boundaries;
- clearance task creation, assignment, completion, rejection/return, and invalid transitions;
- asset return and clearance consistency;
- structured exit interview and optional ratings;
- access-revocation task/event contract;
- final settlement authorization and persistence;
- exit document generation/attachment/download authorization;
- Exited/Inactive transition with preserved history;
- audit actor/outcome/tenant assertions;
- notification/task contracts without faking external delivery;
- duplicate/concurrent exit actions where the existing state model requires idempotency;
- cross-tenant and out-of-team access rejection;
- regression coverage for Phase 0–11 workflows.

Tests must distinguish code/contract verification, PostgreSQL integration verification, and unavailable external services.

## 12. Definition of Done

- All FR-280 through FR-286 behaviors are implemented according to the frozen SRS.
- FR-203 asset return/clearance support is implemented or its existing supported behavior is verified.
- Exit status preserves historical employee, document, asset, task, and audit records.
- APIs enforce authentication, RBAC, tenant isolation, validation, safe errors, and versioning.
- Sensitive actions and compliance evidence are auditable.
- Required notifications, reminders, and task-center behavior use existing contracts.
- PostgreSQL migrations apply without data reset and persisted workflows pass.
- Unit/API and persisted Playwright tests pass, with negative security tests included.
- Lint, typecheck, production build, Prisma validation/status/diff, health/readiness, and applicable dependency checks are recorded.
- External-service blockers are classified as blocked, never as successful.
- `docs/SRS.md` is unchanged and no Phase 13 functionality is started.

## 13. Explicitly out of scope

- Phase 13 AI and advanced integrations: resume parsing, candidate matching, HR assistant, calendar integrations, biometric providers, accounting/payroll integrations, and workflow automation.
- New analytics/KPIs or dashboard redesign beyond compliance/audit reporting required by this phase.
- New recruitment, interview, attendance, leave, onboarding, performance, learning, or payroll features unrelated to exit processing/final settlement.
- Unspecified exit states, policy rules, settlement formulas, approval chains, document templates, notification channels, or external provider behavior.
- Destructive deletion/reset of employee history, migrations, or production data.
- Replacing existing authentication, RBAC, tenant, storage, audit, notification, or API foundations.

## 14. Phase 13 prerequisites

Before Phase 13 begins:

- Phase 12 must be reviewed and accepted with no unresolved HIGH/BLOCKER application findings.
- Resignation, notice, clearance, asset return, access-revocation task/event, settlement, exit-document, status-history, and compliance/audit contracts must be stable and documented.
- RBAC, tenant isolation, secure document access, audit consistency, notification/task contracts, and API versioning must have persisted regression coverage.
- Integration extension points and environment prerequisites must be documented so Phase 13 providers can be added without bypassing tenant, authorization, audit, or validation controls.
- PostgreSQL migration and rollback/recovery procedures must be verified; unavailable Redis, storage, email, or other providers must be explicitly classified before any Phase 13 integration work.

Phase 13 remains governed by the separate SRS roadmap entry and requires a new scope confirmation before implementation.
