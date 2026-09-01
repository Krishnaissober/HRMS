# Phase 9 Scope — Payroll and Expenses

Date: 2026-08-18  
Status: PRE-IMPLEMENTATION SCOPE CONFIRMED  
Authoritative source: `docs/SRS.md` (frozen)

## 1. Phase 9 objective

Implement the SRS Phase 9 payroll scope: salary structures, periodic payroll runs, payslips, employee expenses/reimbursements, and payroll/expense approval workflows, subject to the applicable organization and country statutory requirements.

The module must extend the existing employee, attendance, leave, document, notification, RBAC, tenant, audit, storage, and workflow foundations without restructuring core employee identity records. No Phase 9 application implementation is authorized by this document.

## 2. Exact SRS requirements belonging to Phase 9

### Phase statement

The SRS phase-based delivery plan defines Phase 9 as:

> Payroll: salary structures, payroll runs, payslips, reimbursements and payroll approvals, subject to applicable statutory requirements.

### Functional requirements

| SRS ID | Priority | Frozen requirement                                                                          |
| ------ | -------- | ------------------------------------------------------------------------------------------- |
| FR-160 | Should   | Support basic salary, allowances, deductions, incentives and other configurable components. |
| FR-161 | Should   | Support monthly/periodic payroll runs with review and approval status.                      |
| FR-162 | Should   | Authorized users shall generate/download payslips.                                          |
| FR-163 | Should   | Employees shall submit expenses with category, amount, date, receipt and notes.             |
| FR-164 | Should   | Expenses shall support configurable approval and payment statuses.                          |

### Directly applicable cross-cutting frozen requirements

- FR-001: secure authentication/session foundation.
- FR-002: every business record belongs to an organization and protected APIs enforce server-side isolation.
- FR-003: configurable role/permission authorization.
- FR-006: sensitive create, update, delete, approve, export, and download actions generate audit events.
- FR-101: employment history retains salary-related changes where applicable.
- FR-220 through FR-225: secure document storage/access/versioning/retention applies to payslips and expense receipts where used.
- FR-260 through FR-264: notifications, reminders, tasks, and event-driven workflow foundations apply to payroll and expense approvals where configured.

The SRS API and integration requirements separately require versioned, documented protected APIs with authentication, authorization, validation, organization scoping, consistent errors, and audit logging where applicable. The SRS non-functional reliability requirement calls for transactional consistency in critical workflows.

The SRS also requires payroll/expense reporting for payroll totals, salary components, overtime, expense totals, and approval cycle time when the modules are enabled.

## 3. Functional requirements to implement

### Salary structures

- Organization-scoped employee compensation structure.
- Basic salary.
- Configurable allowances.
- Configurable deductions.
- Configurable incentives.
- Other configurable compensation components.
- Salary-related changes linked to employee history where applicable.
- Sensitive salary values protected by field-level authorization.

The SRS does not define component formulas, currencies, effective-dating rules, proration rules, tax formulas, or statutory component catalogs. Those details cannot be invented and require approved policy/statutory configuration before production processing.

### Payroll runs

- Monthly and/or other configured periodic payroll runs.
- Organization and payroll-period scope.
- Review status.
- Approval status.
- Payroll totals and salary-component summaries.
- Attendance, leave, and overtime inputs may be consumed from the existing persisted modules, but calculation policy must follow approved payroll rules.
- Review and approval must be distinguishable from edit rights.
- Critical state changes must be transactionally consistent and idempotent where background work is used.

The frozen SRS does not prescribe a complete payroll state machine or exact calculation engine. Supported statuses and transitions must be limited to those approved during implementation design and must not claim statutory correctness before prerequisites are supplied.

### Payslips

- Generate a payslip from an authorized payroll record.
- Store payslips in private S3-compatible storage or generate them securely through the existing document abstraction.
- Authorized preview/download using controlled access.
- Employee access only to their own permitted payslips.
- Independent payslip download permission for administrative users.
- Audited generation and download.
- Retention and lifecycle behavior aligned with organization/legal policy.

### Expenses and reimbursements

- Employee self-service expense submission.
- Category.
- Amount.
- Date.
- Receipt.
- Notes.
- Configurable approval status.
- Configurable payment/reimbursement status.
- Authorized manager/Finance/Payroll review according to organization policy.
- Expense totals and approval-cycle reporting.
- Receipt access through the existing secure document/storage foundation.

The SRS does not define mileage, travel advances, per-diem, corporate cards, multi-currency conversion, tax treatment, or accounting entries.

## 4. Applicable non-functional requirements

- Availability: graceful degradation and recoverability appropriate to the deployment tier.
- Performance: interactive pages/APIs under expected load; exact SLA remains a capacity-planning decision.
- Scalability: support growth in organizations, employees, payroll records, documents, and audit records without core redesign.
- Reliability: payroll approval, expense approval/payment changes, payslip generation, and required audit records must remain transactionally consistent.
- Security: TLS, secure sessions/cookies, deny-by-default RBAC, rate limiting, Zod/server validation, secure file handling, audit logging, and secret management.
- Accessibility: WCAG 2.1 AA principles for keyboard operation, contrast, labels, and error feedback.
- Responsive UX: core workflows usable on desktop, tablet, and mobile.
- Observability: centralized safe logs, health/readiness, metrics, and correlation/request IDs.
- Maintainability: typed modular domain/service/repository boundaries, automated tests, migration discipline, and documented APIs.
- Backup/recovery: deployment-appropriate backup retention and recovery testing.
- Localization: dates, periods, currencies, amounts, number formats, and timezones must not use hardcoded presentation formats.
- Browser support: current major Chromium, Firefox, and Safari releases under deployment policy.
- Integration safety: secrets outside source control, timeouts, bounded retries, signature validation where applicable, durable/idempotent jobs, and visible failures that do not corrupt payroll records.

## 5. Database and domain changes required

The SRS explicitly identifies `Expense` and `Payroll Run / Payslip` as core entities when enabled. Phase 9 therefore requires organization-scoped persistence for:

- salary structure and configurable salary components associated with employees;
- salary-related employment-history events where applicable;
- payroll run and payroll period;
- employee payroll result/line items needed to generate a payslip;
- payroll review and approval history;
- payslip metadata and secure stored-object/document linkage;
- expense/reimbursement record and required submission fields;
- expense receipt metadata/document linkage;
- expense approval history and payment status history;
- actor, timestamps, organization, state, and audit correlation;
- appropriate uniqueness/idempotency constraints to prevent duplicate payroll results, approvals, payslips, or expense decisions.

Exact Prisma model names, component formulas, status values, precision/rounding policy, currency model, and statutory fields are not specified by the SRS. They must be defined from approved organization/country requirements before migration implementation.

No destructive changes or restructuring of `Employee`, attendance, leave, or other completed lifecycle identities is in scope.

## 6. APIs required

The SRS requires versioned, documented APIs with authentication, authorization, validation, organization scoping, consistent errors, and audit logging. It does not prescribe exact Phase 9 paths. Required API capabilities are:

- create/read/update authorized salary structures and components;
- retrieve authorized employee compensation data;
- create/list/retrieve periodic payroll runs;
- calculate or prepare a payroll run from approved inputs under configured policy;
- submit/review/approve a payroll run;
- generate and securely download an authorized payslip;
- employee self-service list/download of own payslips;
- submit/list/retrieve expenses with receipt metadata;
- create receipt upload URLs through the existing storage abstraction;
- review/approve/reject an expense according to configured policy;
- update authorized expense payment/reimbursement status;
- employee self-service expense history;
- payroll/expense reports for the metrics explicitly listed in the SRS.

Endpoint names and payload/state contracts must be fixed during implementation design from the approved policy. Public payroll, salary, payslip, and expense endpoints are not required.

## 7. UI and pages required

The SRS navigation defines Payroll submodules as Salary, Runs, Payslips, and Expenses when enabled. Required UI capabilities are:

- authorized salary-structure administration;
- payroll-run list, detail, totals, review, and approval surfaces;
- authorized payslip generation and download;
- employee self-service own-payslip list/download;
- employee expense submission with category, amount, date, receipt, and notes;
- employee own-expense status/history;
- authorized expense approval and payment-status work queue;
- payroll/expense reporting for required totals and approval cycle time.

UI must show clear status and approval indicators, field-level validation, confirmation feedback, useful empty states, responsive tables/rows, visually identifiable sensitive fields, and clear download format/access level. No visual redesign beyond the existing design system is part of this gate.

## 8. RBAC requirements

The permission model must remain action- and resource-based, deny by default, and separate:

- salary view from salary create/update;
- payroll-run view/create/update from review/approval;
- payslip generation from payslip download;
- administrative payslip access from employee own-payslip access;
- expense submission/self-read from team or organization review;
- expense approval from expense payment-status administration;
- report/export access from ordinary record viewing.

Finance/Payroll is the SRS role for payroll-supporting data, expenses, reimbursements, and salary information according to policy. HR Manager/HR Administrator access to sensitive fields must remain configurable. Employees may access only authorized self-service data. Auditor/Compliance access is read-only and scoped.

Exact permission identifiers and default role assignments are implementation details to document before coding; they must not broaden existing roles implicitly.

## 9. Tenant-isolation requirements

- Every salary structure, component, payroll run, payroll result, payslip, expense, receipt, approval, payment status, and report query must carry organization scope.
- Tenant context must be derived from the authenticated session and active membership, never trusted from an unverified client identifier.
- Repository/service queries and mutations must include organization scope.
- Employee self-service identity must be derived server-side.
- Cross-tenant IDs, object keys, downloads, approvals, exports, and background jobs must be rejected.
- Storage object keys and signed URLs must preserve tenant/owner boundaries.
- Idempotency and uniqueness constraints must include organization where applicable.

## 10. Audit requirements

Audit events are required for sensitive administrative, approval, export, download, and salary-field changes, including:

- salary structure/component create and change;
- payroll run creation, preparation, review, approval, and material status changes;
- payslip generation and download;
- expense submission and material edits;
- expense approval/rejection and payment-status changes;
- payroll/expense report exports;
- permission or administrative actions affecting access to compensation data.

Audit records must include actor, action, resource, timestamp, organization, request correlation ID where available, and outcome. Required success audit events must be atomic with their business mutation. Logs and audit metadata must avoid unnecessary salary, bank, receipt, personal, or secret values.

## 11. Integrations and external dependencies

- PostgreSQL and Prisma for transactional records and migrations.
- Existing authentication, tenant context, RBAC, validation, API error, logging, and audit foundations.
- Existing attendance, leave, overtime, employee, manager, and employment-history data as approved payroll inputs.
- Private S3-compatible storage for payslips and expense receipts.
- Redis/BullMQ for durable/idempotent payroll generation, document generation, notifications, or other asynchronous work where used.
- Existing notification/task/workflow foundation for review and approval events.
- Configured PDF/document generation foundation for payslips.
- Accounting/payroll system integration only where an approved provider and contract exist.
- External email delivery only where a live provider is configured; no delivery success may be fabricated.

Banking/payment rails, tax authority filing, accounting posting, and country payroll engines are not automatically included by the generic “accounting/payroll systems” integration capability.

## 12. Testing requirements

### Unit and service tests

- salary component and total calculations under approved rules;
- monetary precision/rounding once policy is approved;
- payroll state-transition validation;
- payroll review/approval authority;
- duplicate and concurrent payroll-run/result prevention;
- expense field, amount, date, receipt, and status validation;
- expense approval/payment transition validation;
- duplicate/concurrent approval prevention;
- payslip access and generation contract;
- audit/notification atomicity.

### API and security tests

- unauthenticated and unauthorized access rejection;
- protected salary-field updates rejected;
- approval permission distinct from edit permission;
- employee limited to own salary/payslip/expense records;
- manager/Finance/Payroll scope enforcement;
- cross-tenant reads, writes, approvals, downloads, object keys, and reports rejected;
- invalid file type/size/metadata rejected;
- safe storage/integration failure responses;
- validation and consistent API error contracts;
- export/download permission and audit enforcement.

### Persisted Playwright workflows

- configure/assign an approved salary structure;
- create and prepare a periodic payroll run from real persisted employee inputs;
- review and approve the run;
- persist payroll result;
- generate and authorize payslip download;
- employee sees only own payslip;
- employee submits an expense with a real stored receipt;
- authorized approver decides it;
- authorized payment status changes persist;
- history, notifications/tasks, audit events, RBAC, and tenant isolation are verified.

Rendering-only assertions cannot replace persisted PostgreSQL/storage workflows. Blocked external integrations must be classified honestly.

### Regression and operational verification

- lint;
- typecheck;
- unit and API tests;
- full Playwright suite;
- production build;
- Prisma validation, migration status, and migration diff;
- PostgreSQL persisted workflow;
- Redis connectivity/readiness where jobs are used;
- S3 upload/download and authorization;
- health and readiness endpoints;
- frozen SRS integrity hash.

## 13. Definition of Done

Phase 9 is complete only when:

- FR-160 through FR-164 are implemented without invented statutory rules;
- approved salary components and salary structures persist correctly;
- monthly/periodic payroll runs support validated review and approval;
- payroll totals and component summaries derive from persisted authorized data;
- authorized payslip generation/download and employee own-payslip access work;
- employee expense submission contains every SRS-required field;
- configurable expense approval and payment statuses work under approved policy;
- required payroll/expense reports work;
- RBAC, sensitive-field access, tenant isolation, and self-service ownership pass negative tests;
- required business mutations, history, notifications, and audit events are consistent and atomic;
- real PostgreSQL persistence and real configured storage behavior pass;
- migrations are deployable and schema drift is absent;
- lint, typecheck, unit/API tests, persisted Playwright, production build, health, and readiness pass;
- all HIGH/MEDIUM review findings are remediated;
- remaining external blockers are explicitly classified and no mock is used to claim live integration success;
- `docs/SRS.md` remains unchanged;
- completion, review, and remediation reports conclude `PHASE 9 READY FOR PHASE 10`.

## 14. Explicitly out of scope for Phase 9

- Phase 10 goals, reviews, feedback, performance cycles, assets, training, certifications, skills, and employee-development features.
- Phase 11 advanced analytics beyond the Phase 9 payroll/expense metrics explicitly required by the SRS.
- Offboarding, resignation, final settlement, exit payroll, clearance, and exit interviews.
- Helpdesk/service requests unrelated to expense/reimbursement records.
- AI payroll, autonomous compensation decisions, predictive pay, or AI expense decisions.
- New authentication system, new tenant architecture, or redesign of employee identity.
- Native mobile applications.
- Biometric, calendar, SMS, WhatsApp, or unrelated external integration work.
- Country-specific tax calculations, statutory filings/forms, employer contributions, compliance certification, banking/payment execution, accounting journal posting, or government submissions until approved requirements/provider contracts exist.
- Multi-currency conversion, travel advances, mileage, per-diem, corporate-card reconciliation, loans, bonuses outside configured incentives, and any compensation/expense feature not stated by FR-160 through FR-164.
- Hardcoded salary components, tax rates, statutory forms, approval policies, tenant IDs, employee IDs, or mock payroll persistence.

## 15. Environment prerequisites

- Reachable PostgreSQL with valid `DATABASE_URL` and migration privileges appropriate to the approved migration workflow.
- Redis/BullMQ connectivity if payroll/document/notification processing uses queued jobs.
- Reachable private S3-compatible storage with bucket, endpoint, region, and credentials for payslips and receipts.
- Running application health/readiness process.
- Secure Better Auth secret/session configuration and Phase 9 test identities/roles.
- Approved organization payroll period, salary-component, approval, expense, and retention policies.
- Confirmed first-release country/countries and applicable statutory requirements before production payroll processing.
- Approved currency, amount precision, rounding, proration, attendance/leave/overtime treatment, and effective-date rules before calculation code is accepted.
- Live external email credentials only if delivery verification is required; otherwise it remains environment blocked.
- Accounting/payroll provider credentials and API contract only if an external integration is explicitly approved.
- Safe database-backed and storage-backed E2E fixtures with no production credentials or data.

## 16. Phase 10 prerequisites

The SRS defines Phase 10 as Performance, Assets and Learning: goals, reviews, assets, training, certifications, and employee development. Phase 10 must not start until:

- Phase 9 implementation, testing, review, and HIGH/MEDIUM remediation conclude `PHASE 9 READY FOR PHASE 10`;
- Phase 9 introduces no unresolved security, tenant-isolation, migration, or employee-identity defect;
- employee identity, organizational hierarchy, and manager relationships remain stable for reuse by performance and learning modules;
- Phase 9 changes preserve existing asset-assignment foundations without expanding into Phase 10 asset lifecycle scope;
- frozen SRS integrity and all prior-phase regressions remain verified.

## Gate decision

The Phase 9 scope is confirmed. Implementation has not started.

**PHASE 9 SCOPE CONFIRMED**
