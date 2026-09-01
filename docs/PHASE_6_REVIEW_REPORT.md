# Phase 6 Review Report

Date: 2026-08-18  
Reviewed: `docs/SRS.md`, `docs/PHASE_6_COMPLETION_REPORT.md`, and the Phase 6 implementation  
SRS status: FROZEN and unchanged

## Final decision

PHASE 6 NOT READY FOR PHASE 7

The persisted check-in/check-out workflow is functional and regression-tested, but FR-126 is not complete. The implementation also has material gaps in period aggregation, weekly-off/rotation behavior, and attendance state-control validation.

## Verification performed

| Verification | Result | Evidence |
|---|---|---|
| Unit/API tests | PASS | 56 tests passed across 14 files |
| Playwright | PASS | 9 persisted workflows passed |
| Persisted PostgreSQL workflow | PASS | Real authenticated attendance workflow passed |
| Lint | PASS | No lint errors |
| Typecheck | PASS | TypeScript check passed |
| Production build | PASS WITH WARNING | Build passed; optional BullMQ Valkey module warning |
| Prisma validation | PASS | Schema valid with configured local environment |
| Prisma migration status | PASS | 10 migrations found; database up to date |
| Prisma migration diff | PASS | No difference detected |
| Redis/BullMQ | ENVIRONMENT BLOCKED | Redis is unavailable |
| S3 | ENVIRONMENT BLOCKED | Existing storage provider is unavailable |
| Live health/readiness probe | ENVIRONMENT BLOCKED | No application process was listening on port 3000 during probe |

The Playwright suite verifies PostgreSQL persistence rather than rendering alone. It covers the main employee attendance workflow, duplicate check-in/check-out rejection, correction approval, holiday creation, reporting, and audit assertions. It does not cover every negative/security boundary listed below.

## Requirement review matrix

| Area | SRS reference | Current implementation | Classification | Severity |
|---|---|---|---|---|
| Employee check-in | FR-120 | Authenticated session identity is used; duplicate daily records are rejected and records persist. | IMPLEMENTED | LOW |
| Employee check-out | FR-120 | Active record is located for the tenant-scoped employee; checkout and duration persist; duplicate checkout is rejected. | IMPLEMENTED | LOW |
| Attendance history | FR-123, FR-124 | `AttendanceHistory` records check-in/out, correction, exception, and status events with actor IDs. | IMPLEMENTED | LOW |
| Attendance corrections | FR-124 | Employee requests and authorized HR review are persisted and audited. | PARTIALLY IMPLEMENTED | MEDIUM |
| Shifts | FR-122 | Shift start/end, timezone, grace period, weekly-off metadata, and rotation metadata are stored and editable. | PARTIALLY IMPLEMENTED | MEDIUM |
| Shift assignment | FR-122 | Tenant-safe employee/shift assignment and overlapping assignment rejection are implemented. | IMPLEMENTED | LOW |
| Rosters/rotation | FR-122 | Assignment foundation exists, but rotation and weekly-off metadata are not used to generate or enforce a roster. | PARTIALLY IMPLEMENTED | MEDIUM |
| Holidays | FR-122, FR-121 | Holidays persist per organization and affect check-in status. | PARTIALLY IMPLEMENTED | LOW |
| Overtime | FR-125 | Calculated and approved overtime fields are separate and audited. | PARTIALLY IMPLEMENTED | MEDIUM |
| Exceptions | FR-123, FR-124 | Exception types and notes persist with history and audit events. | IMPLEMENTED | LOW |
| Attendance calculations | FR-123 | Duration, late, early-departure, and overtime values are calculated. | PARTIALLY IMPLEMENTED | MEDIUM |
| Attendance reports | FR-123, FR-126 | Filtered, paginated report API exists with a summary. | PARTIALLY IMPLEMENTED | HIGH |
| Calendar views | FR-126 | No dedicated day, week, or month attendance view exists. | MISSING | HIGH |
| Future attendance integrations | FR-127 | Source field and API/service boundary provide a foundation; no import/device/biometric adapter exists. | PARTIALLY IMPLEMENTED | LOW |
| RBAC | General security requirements, FR-126 | Phase 6 permissions are checked at route boundaries and service operations. | IMPLEMENTED | LOW |
| Tenant isolation | General multi-tenancy requirements | Reads and mutations include organization scope; cross-tenant entity lookup is rejected. | IMPLEMENTED | LOW |
| Audit logging | General audit requirements | Mutations use transactional audit writes and actor IDs. | IMPLEMENTED | LOW |
| API validation | Non-functional/security requirements | Zod schemas validate dates, times, status, correction, exception, overtime, and pagination inputs. | IMPLEMENTED | LOW |
| Persisted E2E workflows | Quality requirements | Main workflow is database-backed and passes. | PARTIALLY IMPLEMENTED | MEDIUM |

## Detailed findings

### Finding F6-01 — Attendance calendar views are missing

- Severity: HIGH
- SRS reference: FR-126 — “HR and authorized managers shall have day/week/month attendance views with filters.”
- Current behavior: The application provides a paginated attendance list and report API with employee, status, and date filters. The employee dashboard and HR management page render lists. There is no day calendar view, week calendar view, month calendar view, or view selector backed by calendar-specific queries.
- Expected behavior: HR and authorized managers must be able to inspect attendance in day, week, and month views, with filters, using tenant-scoped persisted attendance data.
- Classification: MISSING
- Recommendation: Add a dedicated attendance calendar surface and API query contract for `day`, `week`, and `month` ranges, preserving existing RBAC, tenant scope, pagination/filter conventions, and audit/security behavior.

This is an application defect, not an environment blocker, and prevents Phase 6 closure.

### Finding F6-02 — Period report totals are page-scoped

- Severity: MEDIUM
- SRS reference: FR-123 — daily and period-based attendance totals and timesheets.
- Current behavior: `attendanceReport` computes totals by reducing `result.items`, which is the current paginated page. A period containing more than one page therefore produces incomplete totals.
- Expected behavior: Period totals must aggregate the complete filtered period independently of the display page.
- Classification: PARTIALLY IMPLEMENTED
- Recommendation: Move summary calculation to database-side aggregation or a separate unpaginated aggregation query using the same tenant, date, employee, and status filters.

### Finding F6-03 — Weekly offs and rotational schedules are metadata only

- Severity: MEDIUM
- SRS reference: FR-122 — HR defines weekly offs and rotational schedules.
- Current behavior: Weekly offs and rotation patterns/codes are stored on shifts and assignments, but check-in processing does not evaluate them. No attendance record is generated or classified as `WEEKLY_OFF`; rotation does not select or change an applicable shift.
- Expected behavior: Configured roster rules should influence which shift and workday rules apply to an employee, including weekly-off and rotational scheduling behavior.
- Classification: PARTIALLY IMPLEMENTED
- Recommendation: Implement the minimum SRS-supported roster evaluation needed to resolve the applicable shift and weekly-off state for a work date. Do not add broader scheduling features.

### Finding F6-04 — Manual status changes have no transition policy

- Severity: MEDIUM
- SRS reference: FR-121 and general data-integrity requirements.
- Current behavior: The HR status endpoint accepts any supported attendance status for any existing record. It does not validate whether a transition is valid for the record’s timestamps, current status, holiday/weekly-off context, or correction state.
- Expected behavior: Attendance state changes must preserve consistent state and reject invalid transitions or incompatible combinations.
- Classification: PARTIALLY IMPLEMENTED
- Recommendation: Define and enforce the supported transition rules from the existing attendance model, including validation of timestamp/status consistency and audit/history for accepted changes.

### Finding F6-05 — Overtime approval is not bounded by calculated overtime

- Severity: MEDIUM
- SRS reference: FR-125 — approved overtime recorded separately from normal hours.
- Current behavior: `approvedOvertimeMinutes` is separately stored and permission-protected, but the API only validates a non-negative maximum value. It does not ensure approved overtime is supported by calculated overtime or an explicitly recorded exception/authorization basis.
- Expected behavior: Approved overtime should remain a controlled, auditable subset of overtime that is supported by the attendance record and approval policy.
- Classification: PARTIALLY IMPLEMENTED
- Recommendation: Validate approved overtime against the record’s calculated overtime and the project’s existing approval convention, while preserving the separate approved field.

### Finding F6-06 — Correction approval does not fully recalculate derived fields

- Severity: MEDIUM
- SRS reference: FR-124 and FR-123.
- Current behavior: Correction approval updates check-in/check-out and duration, but does not fully recompute late arrival, early departure, overtime, or approved overtime consequences from the corrected timestamps.
- Expected behavior: Approved corrections must update all derived attendance calculations consistently and preserve the correction history.
- Classification: PARTIALLY IMPLEMENTED
- Recommendation: Reuse the same shift/timezone calculation path for correction approval and persist a complete before/after history record.

### Finding F6-07 — Negative and cross-tenant Phase 6 coverage is incomplete

- Severity: MEDIUM
- SRS reference: General security, RBAC, multi-tenancy, and quality requirements.
- Current behavior: Unit/API tests cover authentication/permission forwarding and the persisted E2E covers the main workflow. The Phase 6 persisted E2E does not explicitly exercise cross-tenant employee attendance reads/mutations, unauthorized correction review, invalid status transitions, roster overlap rejection, holiday/weekly-off behavior, or overtime authorization boundaries.
- Expected behavior: Security-sensitive attendance boundaries should have regression coverage using persisted data where possible.
- Classification: PARTIALLY IMPLEMENTED
- Recommendation: Add persisted negative tests for cross-tenant reads/mutations, unauthorized correction approval, invalid status transitions, overlapping roster assignments, and overtime limits before Phase 7.

### Finding F6-08 — Self-service UI requires manually supplied organization context

- Severity: LOW
- SRS reference: General tenant/RBAC and employee self-service requirements.
- Current behavior: Phase 6 pages read an organization ID from the query string or an editable input and send it as `x-organization-id`. The server still validates the authenticated user and tenant, so this is not a demonstrated authorization bypass, but it is an inconsistent production UX and creates unnecessary tenant-context handling in the UI.
- Expected behavior: Authenticated tenant context should be supplied by the established application context/session pattern rather than an editable organization ID field.
- Classification: PARTIALLY IMPLEMENTED
- Recommendation: Reuse the existing authenticated organization selector/context in the UI without changing server-side tenant enforcement.

## Passing areas

The following areas were verified as implemented for the exercised paths:

- authenticated employee check-in and check-out;
- duplicate daily attendance protection;
- PostgreSQL persistence and migration integrity;
- tenant-scoped employee, shift, assignment, holiday, attendance, and correction lookups;
- route-level permission checks;
- actor-bearing history and transactional audit events;
- Zod validation for Phase 6 request contracts;
- persisted main workflow through check-in, check-out, correction approval, holiday creation, reporting, and audit assertions;
- build, lint, typecheck, unit/API tests, and Playwright regression.

## Environment-blocked items

These are kept separate from application defects:

| Item | Severity | Classification | Detail |
|---|---|---|---|
| Redis/BullMQ | ENVIRONMENT BLOCKED | ENVIRONMENT BLOCKED | Redis is unavailable; no fake queue or Redis implementation was used. |
| S3 | ENVIRONMENT BLOCKED | ENVIRONMENT BLOCKED | Existing S3-compatible storage is unavailable; Phase 6 does not claim live object-storage verification. |
| Live health/readiness probe | ENVIRONMENT BLOCKED | ENVIRONMENT BLOCKED | The endpoints build successfully, but no app process was listening on port 3000 during the live probe. |
| Optional Valkey dependency warning | LOW | PARTIALLY IMPLEMENTED | Production build succeeds, but BullMQ reports an optional `@valkey/valkey-glide` resolution warning. |

## Phase 7 readiness

Phase 6 is not ready to close. The blocking application finding is the missing FR-126 day/week/month attendance calendar functionality. The report aggregation, roster-rule evaluation, status transition, overtime/correction calculation, and negative-test gaps should also be remediated or formally accepted before advancing.

PHASE 6 NOT READY FOR PHASE 7
