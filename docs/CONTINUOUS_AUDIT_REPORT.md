# Continuous Audit Report

Date: 2026-08-20
Scope: Triple Minds single-company, HR-only, hiring-first portal audit. `docs/SRS.md` was not modified.

## Status

**AUDIT COMPLETE WITH ENVIRONMENT BLOCKERS**

The main controllable hiring defects found in this audit were remediated. The application typechecks and lints, and its focused persisted hiring/dashboard workflows pass. The full browser suite is 11/13; the two failures are external-service dependent. A later unit-test and build invocation was blocked by Windows `spawn EPERM`, after a fresh 100/100 unit/API run and clean build had passed.

## Findings and fixes

| Area                          | Result    | Evidence                                                                                                                               |
| ----------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Public hiring form            | Resolved  | Existing public form retained; Triple Minds branding and real intake API verified by Playwright.                                       |
| Walk-in intake                | Resolved  | Real published-position selector; no user-facing organization ID or raw requisition entry.                                             |
| Duplicate candidate matching  | Resolved  | Organization-scoped `/api/v1/candidates/match`; normalized email/phone lookup and prefill; API regression tests.                       |
| Candidate search              | Resolved  | Search includes reference number and role of interest in addition to identity and skills.                                              |
| Candidate notifications       | Resolved  | In-app HR notifications are persisted inside the intake transaction for active members with candidate-read permission.                 |
| Offers list route             | Resolved  | Removed organization-ID control; authenticated tenant context is used for list/create/action/download flows.                           |
| Interviews list/create routes | Resolved  | Removed organization-ID controls and query propagation; routes use authenticated tenant context.                                       |
| Shared dead code              | Resolved  | Removed unused table/form imports and dead selection props; lint is clean.                                                             |
| Tenant/RBAC boundaries        | Preserved | Existing server-side context and permission checks remain in API/service paths; dashboard persisted test verifies cross-tenant denial. |

## Validation evidence

- `npm run lint`: PASS (clean after final route edits).
- `npm run typecheck`: PASS.
- `npm test -- --run`: PASS on fresh run immediately before the later EPERM occurrence — 26 files, 100 tests.
- Focused dashboard Playwright: PASS — 1/1 persisted workflow.
- Full Playwright: 11/13 passed. Failures:
  - employee onboarding document upload: `ECONNREFUSED ::1:9000` because the configured MinIO/S3-compatible service is unavailable.
  - payroll persisted workflow: `TypeError: fetch failed`; external/dependency path remains unavailable and was not converted to a pass.
- `npm run build`: A clean build passed before the final interview-route cleanup, with informational Valkey warnings; the fresh post-cleanup rerun was blocked immediately by Windows `spawn EPERM`.
- Prisma validation: PASS when `DATABASE_URL` is loaded from `.env.local`.
- Prisma migration status: PASS; database schema is up to date with 17 migrations.
- Prisma migration diff: PASS; empty migration diff.
- `/api/health`: HTTP 200, database-independent health response successful.
- `/api/ready`: HTTP 503; database is OK and Redis is unavailable.

## Environment blockers

1. Redis/BullMQ is not running locally, so readiness correctly remains 503.
2. MinIO/S3 is not running at `localhost:9000`; live object upload cannot be verified.
3. Payroll persisted browser validation has an unavailable dependency path and remains failed/environment-blocked.
4. Windows child-process creation intermittently returns `spawn EPERM` for esbuild/Vitest after repeated server/test process churn. This is not treated as an application pass.
5. External email delivery remains provider-dependent; local in-app notification persistence is verified.

## Remaining product follow-up

Offer detail and interview detail still contain legacy organization-header plumbing, although their APIs remain server-side tenant/RBAC protected. Older non-hiring pages also contain legacy organization-ID controls/links. These remain controllable UI cleanup items and mean the audit is not a zero-defect closeout.

## Frozen source confirmation

`docs/SRS.md` was not modified.

## Subsequent quick-action/address pass

- Dashboard quick actions were verified against existing routes; Add Employee now opens the selected-candidate conversion path rather than only the directory.
- Add Candidate now opens a real chooser at `/hr/candidates/new` with `/apply` for the social-media hiring form and `/walk-in` for the shareable/QR-ready walk-in form. The authenticated HR-only walk-in form remains at `/hr/candidates/new/walk-in`.
- Public walk-in submissions use the existing intake service and can match a prior candidate by email or mobile for prefill; public submissions remain validated, rate-limited, organization-owned, notified, and audited through existing server-side flows.
- Added server-side `POST /api/v1/address/postal-code` using `GOOGLE_MAPS_API_KEY`, with validation, safe provider errors, zero-result handling, and multi-location handling.
- Wired postal-code lookup into the existing candidate form while preserving manual edits.
- Build remains passing with the existing optional Valkey warnings.
- Live Google lookup remains environment-blocked until `GOOGLE_MAPS_API_KEY` is configured.
