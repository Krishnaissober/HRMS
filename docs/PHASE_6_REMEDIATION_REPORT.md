# Phase 6 Remediation Report

Date: 2026-08-18  
Source of truth: `docs/SRS.md`  
SRS SHA-256: `ADFCA7D01C87C33884BD0C3F2CA726DBECDCCFE83F249D48F2365415AE104E09`  
Phase 7 started: No

## Final decision

PHASE 6 READY FOR PHASE 7

All HIGH and MEDIUM application findings from `docs/PHASE_6_REVIEW_REPORT.md` are resolved. Redis, S3, and the standalone live health/readiness process remain separately classified as environment blockers and were not replaced with fake integrations.

## Finding status

| Finding                           | Status              | Verification                                                                                                                         |
| --------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| FR-126 calendar views             | RESOLVED            | Persisted day/week/month API and UI views; RBAC, tenant, filter, navigation, API, and Playwright coverage                            |
| Report aggregation                | RESOLVED            | Summary is calculated from the complete persisted filtered set, independently of pagination                                          |
| Roster rules                      | RESOLVED            | Tenant-safe entity checks, active employee/shift validation, overlap rejection, rotation-code validation, and weekly-off enforcement |
| Status transitions                | RESOLVED            | Service-level consistency rules reject invalid/no-op transitions and persist history/audit for accepted changes                      |
| Overtime/correction recalculation | RESOLVED            | Shared calculations recompute duration, late, early, overtime, status, and approved-overtime bounds                                  |
| Negative/security tests           | RESOLVED            | Unit/API and PostgreSQL-backed tests cover unauthorized, cross-tenant, invalid range, roster conflict, correction, and status cases  |
| Redis                             | ENVIRONMENT BLOCKED | No reachable Redis service; no fake queue implementation used                                                                        |
| S3                                | ENVIRONMENT BLOCKED | No reachable configured S3-compatible service; no fake object-storage success claimed                                                |
| Health/readiness                  | ENVIRONMENT BLOCKED | Application starts during Playwright, but no standalone app process was listening during the final direct probe                      |

## FR-126 attendance calendar views

Implemented `GET /api/v1/attendance/employee/calendar` with:

- required `view=day|week|month`;
- required `date=YYYY-MM-DD`;
- optional employee and attendance-status filters;
- organization context from the authenticated tenant boundary;
- `attendance.read` authorization;
- exact day range, Monday-to-Sunday week range, and calendar-month range;
- persisted attendance, employee, shift, assignment, history, and holiday data grouped by work date.

The HR attendance page now provides:

- Day, Week, and Month controls;
- previous/next period navigation;
- date selection;
- employee and status filtering;
- persisted employee, attendance status, duration, shift, timezone, exception, and holiday display;
- responsive layouts for desktop and narrow screens.

The UI contains no hardcoded attendance records. Playwright signs in, creates real PostgreSQL-backed attendance, opens the calendar page, and verifies the employee in all three views.

During persisted UI validation, the existing CSP was found to block Next.js client hydration. The policy now explicitly permits framework inline scripts, permits development-only evaluation for React refresh, and keeps `unsafe-eval` disabled in production. Existing frame, object, base, form, image, font, and connection restrictions remain explicit.

## Report aggregation

The report endpoint still returns paginated display items, but its summary is now generated from all persisted records matching the same:

- organization;
- employee;
- status;
- from date;
- to date.

The existing metrics remain unchanged: duration minutes, overtime minutes, late count, and holiday count. No payroll metrics were introduced.

Regression coverage creates two persisted attendance records, requests a one-item page, and verifies that the summary includes the complete two-record period.

## Roster and shift enforcement

Service-level enforcement now includes:

- employee and shift must belong to the authenticated organization;
- shift must be active;
- terminated employees cannot receive assignments;
- end date cannot precede start date;
- overlapping active assignments are rejected;
- rotational shifts require an assignment rotation code;
- duplicate weekly-off values are normalized;
- assignment weekly offs override shift defaults;
- configured weekly offs affect persisted check-in and recalculation status.

Persisted tests verify overlapping-assignment rejection, cross-tenant assignment rejection, and weekly-off attendance status.

## Attendance status integrity

The service rejects:

- no-op status changes;
- Absent or Leave on records containing attendance timestamps;
- Late without calculated lateness;
- Overtime without calculated overtime;
- Holiday on a non-holiday date;
- Weekly Off on a date not covered by the assigned roster rules.

Accepted status changes retain tenant context and write actor-bearing history and transactional audit events.

## Overtime and correction recalculation

Checkout and correction approval now share the same persisted calculation rules for:

- duration;
- late arrival;
- early departure;
- overtime;
- Holiday and Weekly Off state;
- resulting attendance status.

Approved overtime cannot exceed calculated overtime. If a correction reduces calculated overtime, existing approved overtime is reduced to the valid bound. Correction history records original and corrected timestamps, and audit metadata records recalculated duration and overtime.

## Security and negative coverage

Added or extended tests for:

- unauthenticated calendar access returning 401;
- permission-protected calendar access returning 403;
- cross-tenant calendar data exclusion;
- cross-tenant correction rejection;
- cross-tenant roster assignment rejection;
- overlapping roster assignment rejection;
- invalid report date range rejection;
- invalid calendar view rejection;
- invalid attendance status transition rejection;
- weekly-off precedence and enforcement;
- complete-period report aggregation;
- persisted correction recalculation;
- real day/week/month UI rendering.

## Verification results

| Check                         | Result                                    |
| ----------------------------- | ----------------------------------------- |
| Unit/API tests                | PASS — 61 tests across 16 files           |
| Targeted persisted Playwright | PASS — 1 test                             |
| Full Playwright run 1         | PASS — 9 tests                            |
| Full Playwright run 2         | PASS — 9 tests                            |
| Lint                          | PASS                                      |
| Typecheck                     | PASS                                      |
| Production build              | PASS WITH WARNING                         |
| Prisma validation             | PASS                                      |
| Prisma migration status       | PASS — 10 migrations, database up to date |
| Prisma migration diff         | PASS — no difference detected             |
| PostgreSQL persisted workflow | PASS                                      |
| SRS integrity                 | PASS — hash unchanged                     |

The production build retains the existing BullMQ optional `@valkey/valkey-glide` warning. The warning does not fail compilation, but live queue readiness remains blocked until Redis is available.

One preliminary full Playwright run exceeded the old 90-second timeout after the persisted Phase 6 workflow was expanded. No assertion failed before the timeout. The test timeout was adjusted to 180 seconds for the real database workflow, after which two complete consecutive runs passed.

## Environment prerequisites still outstanding

### Redis/BullMQ

A reachable Redis instance matching the configured `REDIS_URL` is required to verify queue and worker readiness. Production behavior was not replaced with an in-memory queue.

### S3-compatible storage

A reachable provider with the project’s documented endpoint, region, bucket, access key, secret key, and path-style settings is required for live object-storage verification. Phase 6 attendance does not depend on fake storage behavior.

### Standalone health/readiness

The Next.js process must be running on the configured local port for direct `/api/health` and `/api/ready` probes. Playwright verified that the application starts, but the process is intentionally stopped after the suite.

## Final gate

FR-126 calendar views: RESOLVED  
Report aggregation: RESOLVED  
Roster rules: RESOLVED  
Status transitions: RESOLVED  
Overtime/correction recalculation: RESOLVED  
Negative/security tests: RESOLVED  
Redis: ENVIRONMENT BLOCKED  
S3: ENVIRONMENT BLOCKED  
Health/readiness: ENVIRONMENT BLOCKED

PHASE 6 READY FOR PHASE 7
