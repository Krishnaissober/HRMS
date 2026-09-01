# Phase 11 Surgical High-Severity Remediation Report

## Final gate

**PHASE 11 READY FOR PHASE 12**

All HIGH findings from `docs/PHASE_11_REVIEW_REPORT.md` were remediated with focused changes. No Phase 12 work was started, no new KPI was introduced, and `docs/SRS.md` was not modified. MEDIUM/LOW review findings remain outside this explicitly constrained remediation and should be tracked separately.

## HIGH #1 — Metric accuracy

**Status: RESOLVED**

### Root causes

- Candidate no-shows were counted from `CandidateVisit.status`, although the no-show workflow persists `Interview.status = NO_SHOW`.
- Candidate visit analytics loaded only 100 rows and derived totals from that truncated array.
- Attendance and leave “trends” were status totals without a date dimension.
- Payroll components were ignored because persisted components are arrays while analytics expected an object.
- Workforce headcount/leaver calculations used current employee status without the selected period.
- Leave balances summed all years regardless of the selected period.
- Leave approval cycle selection used leave occurrence dates instead of decision dates.
- Payroll results used result creation time instead of payroll period.

### Exact fixes

- Candidate no-shows now aggregate tenant/date-scoped `Interview` records.
- Interview attendance, check-ins, and visit-history totals use exact database counts with no 100-row cap.
- Attendance and leave trends now return date/status/count series in organization-local dates.
- Salary components aggregate the existing `{name, type, amount}` arrays.
- Workforce headcount uses employees joined by the selected period end and reconstructs status at that boundary from `EmployeeHistory`; leavers use status-change events within the period.
- Leave balances are scoped to the selected reporting year.
- Leave approval duration selects decisions within the date range.
- Payroll results are scoped through their payroll run period.

### SRS trace

- §21 lines 1676–1715.
- §29 lines 2432–2459.
- AC-12 lines 2582–2588.
- Phase 11 scope §§3–5 and §14.

### Tests added

- Payroll component-array aggregation.
- Temporal trend grouping.
- Historical employee status reconstruction.
- Persisted interview no-show analytics.
- Persisted 101-visit aggregate proving totals are not capped.
- Persisted attendance/leave dated trends.
- Persisted prior-year leave balance proving exclusion.
- Persisted payroll component totals.

### Verification

- Focused unit/API: PASS.
- Persisted Phase 11 Playwright: PASS.
- Full unit/API regression: PASS, 93/93.
- Full Playwright regression: PASS, 12/12.

## HIGH #2 — Date and timezone semantics

**Status: RESOLVED**

### Root cause

Date filters constructed UTC midnight boundaries regardless of organization timezone, and some domain metrics used inconsistent event dates.

### Exact fix

- Added an organization timezone policy field with a safe `UTC` default.
- Added migration `20260819163000_phase11_organization_timezone`.
- Centralized local calendar-day conversion to an inclusive start and exclusive next-day boundary.
- The utility uses IANA timezone rules, including offset changes.
- Temporal labels use the same organization timezone.
- Corrected event-date selection for leave decisions, workflow completion, payroll periods, and workforce period-end status.

### Consistent interpretation

An entered date represents a calendar date in the authenticated organization’s configured IANA timezone. `from` starts at local 00:00; `to` ends at the next local 00:00 exclusively. Date-only business records and timestamp metrics use the same calculated range.

### Tests added

- Start-of-day boundary.
- Exclusive end-of-day boundary.
- Month boundary.
- Asia/Kolkata offset boundary.
- America/New_York daylight-offset boundary.
- Organization-local temporal bucket assertion.

### Verification

- Prisma migration applied successfully.
- Focused boundary tests: PASS.
- Typecheck/build: PASS.

## HIGH #3 — Authorization scope

**Status: RESOLVED**

### Root cause

Analytics APIs checked static permissions and tenant membership but did not pass the authenticated actor to aggregation, so manager and recruiter roles could receive organization-wide aggregates.

### Exact fix

- Analytics and export routes now pass authenticated user ID/email into the analytics service.
- HR administrator/HR manager/local administrator roles retain their existing authorized organization scope.
- A role explicitly identified as `manager` is limited server-side to employee direct reports through `managerEmployeeId`.
- An explicit out-of-scope employee filter is rejected.
- A recruiter-only role fails closed because the current data model has no persisted requisition-to-recruiter assignment relation. No broad access or invented assignment model was added.
- Exports reuse the same actor-derived scope as on-screen analytics.

### Tests added

- Manager direct-report scope.
- Manager out-of-scope employee rejection.
- Recruiter-only fail-closed behavior.
- HR role non-restriction.
- Existing unauthorized role and cross-tenant API/export tests retained.

### Verification

- Focused authorization tests: PASS.
- Persisted cross-tenant analytics and drill-down rejection: PASS.
- Full regression: PASS.

## HIGH #4 — Drill-down tenant context

**Status: RESOLVED**

### Root cause

The UI appended `organizationId` after a URL fragment for open-position and payroll-expense links. Fragment content is not transmitted as query context. Active analytics filters were also omitted.

### Exact fix

- Drill-down URLs now split pathname/query/fragment safely.
- Tenant and active date/department filters are inserted before the fragment.
- The fragment is reattached last.
- Existing server-side membership and record-tenant checks remain authoritative.

### Traces fixed

- Open positions → `/hr/recruitment/dashboard?organizationId=...&...#open-positions`.
- Payroll expenses → `/hr/payroll?organizationId=...&...#expenses`.
- All non-fragment drill-downs now retain tenant and active supported filters as well.

### Tests added

- Persisted UI assertion for filter-preserving employee drill-down.
- Persisted fragment-order assertion for open positions.
- Persisted negative request proving an outside-tenant employee drill-down API is rejected.

### Verification

- Focused Phase 11 Playwright: PASS.
- Full Playwright: PASS, 12/12.

## HIGH #5 — Test coverage

**Status: RESOLVED**

### Root cause

The original Phase 11 suite exercised generic rate helpers and a small persisted happy path but did not cover the incorrect source, high-volume boundary, component shape, timezone boundary, historical scope, or actor scope.

### Exact fix

Added only regression coverage tied to corrected HIGH findings:

- `tests/analytics.test.ts`: metric structures, timezone boundaries, temporal buckets, period-end status.
- `tests/analytics-scope.test.ts`: manager/recruiter/HR scope behavior.
- `tests/analytics-api.test.ts`: authenticated actor propagation and existing API/export security.
- `tests/e2e/analytics-persisted.spec.ts`: real PostgreSQL no-show, 101 visits, dated trends, year-scoped balances, payroll components, drill-down context, and cross-tenant denial.

### Verification

| Check | Result |
|---|---|
| Focused Phase 11 unit/API | PASS — 13/13 |
| Focused Phase 11 Playwright | PASS — 1/1 |
| Full unit/API regression | PASS — 25 files, 93/93 tests |
| Full Playwright regression | PASS — 12/12 workflows |
| Lint | PASS |
| Typecheck | PASS |
| Production build | PASS WITH INFORMATIONAL WARNING |
| Prisma migration deploy | PASS — 16 migrations applied |

## Build warning

The existing BullMQ optional Valkey Glide resolution warning remains informational/non-blocking. Compilation, type validation, page generation, Redis-backed readiness in the prior final review, and all tests pass. This surgical remediation did not add an unused dependency merely to suppress the warning.

## Files changed in this remediation

- `prisma/schema.prisma`
- `prisma/migrations/20260819163000_phase11_organization_timezone/migration.sql`
- `src/modules/analytics/service.ts`
- `src/app/api/v1/analytics/[domain]/route.ts`
- `src/app/api/v1/reports/[domain]/export/route.ts`
- `src/app/hr/reports/page.tsx`
- `tests/analytics.test.ts`
- `tests/analytics-scope.test.ts`
- `tests/analytics-api.test.ts`
- `tests/e2e/analytics-persisted.spec.ts`
- `docs/PHASE_11_REMEDIATION_REPORT.md`

## Remaining non-HIGH review items

The review's MEDIUM/LOW items—such as stage-conversion definition, domain-specific filter contracts, broader database aggregation optimization, export-control UX, and the optional BullMQ warning—were deliberately not expanded during this budget-constrained HIGH-only remediation. None reintroduces the remediated HIGH data-leak or incorrect required-metric paths.

## Final decision

All HIGH Phase 11 findings are resolved and freshly verified.

**PHASE 11 READY FOR PHASE 12**
