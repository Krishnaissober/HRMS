# Phase 11 Completion Report — Analytics and Reporting

## Final status

**PHASE 11 STATUS: PASS WITH ISSUES**

Phase 11's confirmed application scope is implemented and verified. All required application gates passed. The status retains “with issues” because the production build emits the existing BullMQ optional Valkey client resolution warning, although compilation and the build complete successfully. Performance analytics remains correctly disabled because no performance module/data model is enabled; no data was fabricated.

## Authority and scope control

- Frozen source: `docs/SRS.md`.
- Confirmed scope: `docs/PHASE_11_SCOPE.md`.
- Prior baseline: `docs/PHASE_10_COMPLETION_REPORT.md`.
- Phase 12 was not started.
- No unrelated business workflow was changed.
- No analytics/source-of-truth table was introduced.

## Requirements implemented and SRS traceability

| SRS reference | Implementation |
|---|---|
| §31.4, line 746 | Cross-domain recruitment, workforce, attendance, leave, payroll, and HR operational analytics with drill-down |
| §21, lines 1661–1721 | Enabled-domain metric catalogue implemented from persisted records |
| §28, line 2300 | Metric groups expose tenant-preserving links to source record pages |
| §28, lines 2303, 2318, 2324 | Server-side filters, responsive result tables, labeled restricted CSV exports, and loading/error/empty states |
| §28.1, lines 2396–2399 | Recruitment, Workforce, Attendance, Leave, and HR KPIs navigation |
| §29, lines 2423–2468 | Required reporting KPIs and documented formula definitions |
| AC-12, lines 2582–2588 | Persisted recruitment and attendance results reconcile to PostgreSQL source records |
| FR-002 / FR-003 / FR-006 | Server-side tenant scope, RBAC, and audited exports |

## Metrics and KPIs

### Recruitment

Reuses the Phase 10 recruitment aggregation to preserve one definition for:

- Applications and pipeline counts.
- Candidate conversion rate by pipeline stage.
- Open positions.
- Source effectiveness.
- Interview pass and no-show rates.
- Offer acceptance rate.
- Average time to hire: requisition approval to accepted-offer response.
- Average time to fill: requisition opening to accepted-offer response.

### Candidate and employee attendance

- Interview attendance, candidate no-shows, check-in volumes, and visit-history count.
- Employee status trends for present/absent/late/WFH/overtime source data.
- Attendance, absenteeism, and late-arrival rates.
- Department comparisons.
- Correction volumes.
- Persisted approved overtime minutes, falling back to calculated overtime where approval is absent.

### Workforce

- Active headcount and total employee records.
- Department, location, and employment-type distributions.
- Average tenure in days.
- Joiners and leavers.
- Turnover/attrition rate.
- Probation completion/confirmation rate.

The response documents the project interpretation where the SRS does not prescribe a denominator: exited/inactive records divided by employee records in scope for turnover, and confirmed records divided by employee records in scope for probation completion.

### Leave

- Request trends by persisted status.
- Leave utilization days and rate.
- Allocated, carried, used, and available balances.
- Approval cycle time from request creation to decision.

### Onboarding and HR operations

- Onboarding instance completion rate and average completion/time-to-readiness days.
- Task completion rate and overdue task count.
- Document verification completion rate.
- HR request resolution time using persisted workflow-task creation/completion.
- Active document expiry-risk count for the selected range, or expired-by-now records when no end date is selected.

### Payroll and expenses

- Payroll gross, deduction, and net totals by persisted run/currency.
- Persisted salary-component totals where numeric components exist.
- Payroll overtime minutes.
- Expense totals by currency and category.
- Expense approval cycle time.

### Audit

- Login events.
- Permission/role changes.
- Exports.
- Downloads.
- Sensitive-field changes.
- Other administrative events.
- Outcome grouping.

### Conditional performance analytics

Review completion, goal status, and rating trends are not emitted because the current schema has no enabled performance/goal/review module. This follows the SRS's “when enabled” condition and avoids mock metrics.

## Data sources and aggregation

All aggregation runs server-side in `src/modules/analytics/service.ts` and uses existing Prisma/PostgreSQL entities:

- `JobRequisition`, `Application`, `Candidate`, `Interview`, `InterviewEvaluation`, `CandidateVisit`, `Offer`.
- `Employee`, `OnboardingInstance`, `OnboardingTask`, `OnboardingDocument`, `WorkflowTask`, `ManagedDocument`.
- `AttendanceRecord`, `AttendanceCorrection`, `LeaveRequest`, `LeaveBalance`.
- `PayrollRun`, `PayrollResult`, `Expense`, `AuditLog`.

Queries include `organizationId` server-side. Aggregates execute in bounded grouped queries/transactions; source detail is not downloaded to the browser for calculation. No reporting warehouse, cache, snapshot, or duplicate source table was added.

## Filters and date semantics

- Supported query filters: `from`, `to`, `department`, and `employeeId` where applicable.
- Date inputs use inclusive UTC day boundaries at API/query level.
- Invalid/reversed dates, unknown filters, and oversized filter values return validation errors.
- Overlapping leave requests use start/end overlap semantics.
- Recruitment retains the frozen time-to-hire and time-to-fill event boundaries.
- UI rendering uses browser/user locale behavior; no fixed presentation locale was added.

## Pages, routes, tables, and drill-downs

### UI

- `/hr/reports` — Reports & Analytics workspace.
- Navigation: Recruitment, Workforce, Attendance, Leave, HR KPIs.
- Responsive metric cards and result tables.
- Loading, permission-denied, network-error, empty, and populated states.
- Date and department controls.
- Restricted CSV export links.
- Tenant-preserving drill-down links to existing candidate, interview, offer, employee, attendance, visitor, leave, onboarding, document, notification, and payroll pages.

Existing `/hr/dashboard` and `/hr/recruitment/dashboard` now link to Reports & Analytics.

### APIs

- `GET /api/v1/analytics/[domain]`
- `GET /api/v1/reports/[domain]/export`

Domains are restricted to `recruitment`, `workforce`, `attendance`, `leave`, `hr`, `payroll`, and `audit`. Responses use existing success/error conventions. CSV is the only export format because it is the confirmed implementation format; no extra export provider was added.

## RBAC

Domain access reuses existing resource permissions:

| Domain | Required permissions |
|---|---|
| Recruitment | `dashboard.recruitment.read`, `candidates.read`, `interviews.read`, `offers.read` |
| Workforce | `employees.read` |
| Attendance | `attendance.read`, `candidate-attendance.read` |
| Leave | `leave.read` |
| HR operations | `dashboard.hr.read`, `onboarding.read`, `employees.documents.read`, `tasks.read` |
| Payroll/expenses | `payroll.reports` |
| Audit | `audit.read` |
| Any export | Domain permissions plus `reports.export` |

No broad administrative bypass was added. A restricted leave approver was verified unable to access workforce analytics or export leave analytics without export permission.

## Tenant isolation

- Tenant context is derived and membership-validated through the existing authenticated context.
- Every aggregate, filter, report, export, and drill-down query uses the authenticated organization.
- Cross-tenant memberships return only that tenant's data.
- A tenant without matching records returns zero/empty metrics.
- An organization without active membership is rejected with HTTP 403.
- Persisted browser tests verify aggregate isolation, not only record-detail isolation.

## Audit

Successful exports record `REPORT_EXPORTED` with actor, organization, analytics domain, filters, CSV format, request ID, and outcome through the existing audit infrastructure. Authorization is checked before aggregation/export generation, and denied exports create no false success audit event.

## Database and query changes

No domain/schema model changed. Migration `20260819143000_phase11_report_export_permission`:

- Adds the independent `reports.export` permission idempotently.
- Grants it to existing roles already entrusted with HR dashboard, payroll report, or audit report access.

Migration state after deployment:

- Prisma schema validation: PASS.
- Migrations applied: 15/15.
- Migration status: database up to date.
- Migration diff: no difference detected.

## Automated tests

### Unit/API

- 24 files passed.
- 88 tests passed.
- Added metric formula, zero-denominator, date validation, unknown-filter, CSV serialization, authentication, RBAC, tenant, and export-audit tests.

### Persisted Playwright

- 12/12 tests passed in the full serial Phase 0–11 suite (approximately 4.7 minutes).
- New workflow verifies PostgreSQL-backed workforce, attendance, and leave metrics; filter changes; UI tables; tenant-safe drill-down; audited CSV export; restricted-role denial; empty other-tenant aggregation; and outside-membership rejection.
- Existing authentication, candidate intake, dashboards, attendance, onboarding, hiring/offers, interviews, payroll, and root-routing workflows all passed.

## Validation and regression results

| Check | Result |
|---|---|
| Lint | PASS |
| Typecheck | PASS |
| Unit/API tests | PASS — 88/88 |
| Full Playwright | PASS — 12/12 |
| Production build | PASS WITH WARNING |
| Prisma validation | PASS |
| Prisma migration deploy/status | PASS — 15/15 |
| Prisma migration diff | PASS — no difference |
| PostgreSQL readiness | PASS |
| Redis readiness | PASS |
| `/api/health` | PASS — HTTP 200 |
| `/api/ready` | PASS — HTTP 200, database and Redis OK |
| `/` | PASS — HTTP 200 |
| `/hr/reports` | PASS — HTTP 200 |
| S3 | NOT USED — no retained Phase 11 export objects |
| Frozen SRS integrity | PASS — SHA-256 unchanged |

## Environment blockers

None for the implemented Phase 11 path. PostgreSQL and Redis are available. S3 is not a dependency of streamed CSV exports and was not used to claim storage integration success.

## Known limitations and issues

1. The successful production build emits a warning that BullMQ's optional `@valkey/valkey-glide` module cannot be resolved through its Valkey client import path. The project uses the existing Redis/ioredis readiness path; Phase 11 does not introduce or use Valkey Glide. This warning is non-blocking but should be reviewed during infrastructure dependency maintenance.
2. Performance analytics is omitted while the performance module is disabled, as required by the SRS's conditional wording.
3. The SRS does not prescribe turnover, probation, HR-request, or document-expiry denominator/horizon details. The API returns explicit definitions for the conservative persisted-data interpretations instead of presenting them as newly frozen policy.
4. A recoverable pre-build `.next.phase11-*` artifact backup may remain locally if endpoint security policy prevents automated recursive cleanup. It contains generated build output only and is not an application/source artifact.

## Files changed

- `src/modules/analytics/constants.ts`
- `src/modules/analytics/schemas.ts`
- `src/modules/analytics/service.ts`
- `src/app/api/v1/analytics/[domain]/route.ts`
- `src/app/api/v1/reports/[domain]/export/route.ts`
- `src/app/hr/reports/page.tsx`
- `src/app/hr/dashboard/page.tsx`
- `src/app/hr/recruitment/dashboard/page.tsx`
- `src/app/globals.css`
- `src/lib/rbac-permissions.json`
- `prisma/migrations/20260819143000_phase11_report_export_permission/migration.sql`
- `tests/analytics.test.ts`
- `tests/analytics-api.test.ts`
- `tests/e2e/analytics-persisted.spec.ts`
- `tests/e2e/global-setup.ts`
- `docs/PHASE_11_COMPLETION_REPORT.md`

## Final gate

All confirmed Phase 11 application requirements are implemented and the full required regression suite passes. No Phase 12 functionality was started.
