# Phase 3 Completion Report — Candidate Attendance & Visitor Management

Date: 2026-08-18  
Authority: `docs/SRS.md` (frozen and unchanged)  
Phase scope: Candidate attendance and visitor management only

## Final status

**PHASE 3 STATUS:**
**READY FOR PHASE 4**

The Phase 3 application code, database migration, API validation, RBAC, tenant scoping, audit events, UI, unit/API tests and authenticated persisted E2E coverage are implemented and verified against real PostgreSQL persistence. The local Playwright fixture is generated from safe development values and cleaned up after each run. No fake persistence or external-service success was claimed.

Phase 4 was not started. Hiring decisions, offers, employee conversion, onboarding, employee attendance, leave, payroll, performance, assets and offboarding were not implemented.

`docs/SRS.md` was not modified.

## Implementation summary

The existing tenant-owned `CandidateVisit` model was extended into the candidate attendance record rather than creating a duplicate candidate or employee-attendance system. Attendance records can now be linked to an existing candidate, interview and host, with check-in/check-out actors, timestamps, duration, late-arrival minutes, early-departure minutes and exception details.

Existing interview check-in/check-out transactions now create/update the linked candidate attendance record. Existing walk-in flows continue to use the same visit table and now persist attendance actor and duration data.

## Pages and routes

- `/hr/attendance` — tenant-scoped attendance list with check-in, check-out and exception controls.
- `/hr/visitors` — visitor registration using an existing candidate and optional host assignment.
- `/hr/candidates/{id}` — existing candidate visit history remains available.
- `/hr/interviews/{id}` — existing interview attendance controls now produce linked candidate attendance records.

## APIs

- `GET /api/v1/attendance` — paginated, filtered attendance list.
- `GET /api/v1/attendance/{id}` — protected visit detail and attendance history record.
- `POST /api/v1/attendance/check-in` — check in by visit, candidate or interview context.
- `POST /api/v1/attendance/check-out` — check out a checked-in visit.
- `POST /api/v1/attendance/{id}/exception` — record an authorized attendance exception.
- `GET|POST /api/v1/visitors` — list and register tenant-scoped visitor records.
- Existing `POST /api/v1/interviews/{id}/check-in` and `/check-out` now also persist the linked candidate attendance record.
- Existing candidate visit endpoints remain available for the Phase 1 walk-in flow.

All new routes reuse Better Auth sessions, organization context, RBAC permission checks, Zod parsing, standard responses and standard errors.

## Database changes

Migration: `prisma/migrations/20260818140000_phase3_candidate_attendance/migration.sql`

Extended `CandidateVisit` with:

- `interviewId` and `hostUserId`;
- `checkInActorUserId` and `checkOutActorUserId`;
- `lateArrivalMinutes`, `earlyDepartureMinutes` and `durationMinutes`;
- `exceptionType` and `exceptionNotes`;
- tenant-scoped indexes and foreign keys.

The existing candidate identity and interview relationships are reused. Employee attendance records are not touched.

## RBAC changes

Added organization-scoped permissions:

- `candidate-attendance.read`
- `candidate-attendance.check-in`
- `candidate-attendance.check-out`
- `candidate-attendance.manage`
- `candidate-attendance.exceptions`

The permissions are enforced at route level and all repository queries/mutations include `organizationId`. Host assignment validates active organization membership.

## Attendance behavior

- Duplicate active check-in is rejected.
- Checkout without a checked-in visit is rejected.
- Duplicate checkout is rejected.
- Interview-linked check-in calculates late minutes from the stored interview start time.
- Interview-linked checkout calculates early-departure minutes from the stored interview end time.
- Checkout stores duration from the persisted check-in timestamp.
- Walk-in visits without scheduled interview times do not receive invented late/early rules.
- Exceptions require an approved exception type and non-empty notes.
- Check-in, check-out, visitor registration and exception recording write candidate activity and audit events in the same transaction as the mutation.

## Test results

| Check | Status | Evidence |
|---|---|---|
| Unit tests | PASS | 39 total tests passed across 10 test files |
| Attendance validation tests | PASS | Check-in context, checkout identifier, visitor host and exception-note validation |
| Attendance API tests | PASS | Authentication, RBAC rejection and organization context propagation |
| Attendance repository tests | PASS | Duplicate check-in, invalid checkout, late/early/duration persistence |
| Existing Phase 0–2 tests | PASS | Included in the 39-test suite |
| Playwright smoke/UI tests | PASS | 4 existing browser tests passed |
| Persisted attendance Playwright test | PASS | Authenticated generated local fixture; real PostgreSQL interview/attendance check-in/out, timing, exception, audit, history and cross-tenant checks passed |
| Persisted interview Playwright test | PASS | Authenticated generated local fixture; real PostgreSQL interview creation, linkage, check-in/out, evaluation, scorecard persistence and history checks passed |
| Complete Playwright suite | PASS | 6 tests passed |
| Lint | PASS | `npm run lint` |
| Typecheck | PASS | `npm run typecheck` |
| Production build | PASS | Build completed; existing optional BullMQ `@valkey/valkey-glide` warning remains |
| Prisma validation | PASS | Schema valid |
| Prisma migration application | PASS | Phase 3 migration applied to local PostgreSQL |
| Prisma migration status | PASS | Six migrations found; database schema up to date |
| Prisma schema diff | PASS | No difference detected |
| SRS integrity | PASS | Frozen SRS hash remains `ADFCA7D01C87C33884BD0C3F2CA726DBECDCCFE83F249D48F2365415AE104E09` |

## Environment blockers

- Authenticated persisted Playwright fixture: **RESOLVED**. `tests/e2e/global-setup.ts` creates isolated local credentials and PostgreSQL data per run and cleans it up afterward.
- Redis/BullMQ remains unavailable from the existing project environment. Phase 3 does not claim notification or worker delivery success.
- External email and calendar services remain outside this phase’s required attendance persistence and are not faked.

## Known limitations

- The UI uses the project’s existing organization-ID entry pattern; API authentication, RBAC and tenant isolation remain the security boundary.
- Visitor registration currently uses an existing candidate ID, as required to avoid duplicate candidate identity records. Public anonymous visitor creation was not added.
- Exception resolution is represented by an auditable exception record; no additional business state was introduced beyond the existing visit status model.
- The persisted browser workflow requires an authenticated seeded fixture before it can run against real PostgreSQL.

## Definition of Done

| Requirement | Status |
|---|---|
| Candidate check-in | PASS — authenticated persisted E2E verified |
| Candidate check-out | PASS — authenticated persisted E2E verified |
| Visitor management | PASS |
| Host assignment | PASS |
| Late tracking | PASS |
| Early-departure tracking | PASS |
| Exception handling | PASS |
| Attendance history | PASS |
| RBAC | PASS |
| Tenant isolation | PASS — organization-scoped routes/repositories and API tests |
| Audit logging | PASS — transactional candidate activity and audit events |
| APIs | PASS |
| Validation | PASS |
| Unit/API tests | PASS |
| Playwright | PASS — 6 tests passed, including authenticated persisted workflows |
| Lint | PASS |
| Typecheck | PASS |
| Build | PASS |
| Prisma validation/migration | PASS |
| SRS unchanged | PASS |

## Phase 4 prerequisites

Before Phase 4:

1. Preserve `CandidateVisit` as the source for candidate interview/visitor attendance and keep it separate from employee attendance.
2. Preserve organization-scoped RBAC, transactional audit events and actor/timing metadata in future phases.
3. Do not convert candidate attendance into employee attendance during hiring or employee conversion work.

**PHASE 3 STATUS:**
**READY FOR PHASE 4**
