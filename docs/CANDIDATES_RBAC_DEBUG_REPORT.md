# Candidates RBAC Debug Report

Date: 2026-08-18  
Scope: Candidates-page authorization mismatch only

## Failing request

- UI: `/hr/candidates?organizationId=cmsymx7ay0000v30g6q7q4y9u`
- Endpoint: `GET /api/v1/candidates?q=...`
- Original response: HTTP 403 `FORBIDDEN`
- Displayed message: `You do not have permission to perform this action`

The request was authenticated and carried the correct `x-organization-id`. It passed session and active-membership resolution, then failed the RBAC permission check before the candidate repository was called.

## Permission contract

The existing Phase 1 contract is consistent across the project:

- required permission: `candidates.read`;
- resource/action: read and list candidates in the active organization;
- API check: `src/app/api/v1/candidates/route.ts` calls `requirePermission` with `CANDIDATE_PERMISSIONS.read`;
- permission constant: `src/modules/candidates/constants.ts` maps `read` to `candidates.read`;
- documentation: `docs/RBAC.md` and `docs/API_SPEC.md` both specify `candidates.read`.

There was no singular/plural naming mismatch and the UI did not call the wrong endpoint.

## Authenticated context

The failed request resolved to:

- correct local administrator user;
- organization `cmsymx7ay0000v30g6q7q4y9u` (`local-hr-portal`);
- active organization and active membership;
- role `local-admin`;
- 53 assigned permission rows before remediation.

However, the database contained no `Permission` row whose name began with `candidates.`. Therefore the role had none of the six declared Phase 1 candidate permissions, including the required `candidates.read`.

## Root cause

The local bootstrap previously queried and assigned only permission rows that already existed in PostgreSQL. It did not populate the canonical permission catalog first. The database's 53 rows had been accumulated by later-phase test fixtures, while the Phase 1 candidate permissions had never been inserted. The reported count of 53 was therefore not evidence that the role contained every declared permission.

RBAC itself behaved correctly by returning HTTP 403.

## Fix

- Added `src/lib/rbac-permissions.json` as the shared canonical permission catalog.
- Updated `src/lib/rbac-permissions.ts` to export that catalog for application and test code.
- Updated `scripts/bootstrap-local-admin.cjs` to upsert every declared permission before assigning them to the local administrator role.
- Re-ran the idempotent local bootstrap to repair the existing database role.
- Added `candidates.read` to the authenticated Playwright HR fixture because its root workflow now actively loads the Candidates API.
- Extended the root smoke test to load persisted candidates and reject the former permission error.
- Added focused candidate API authorization tests.

No API authorization check, tenant check, password verification, or repository scope was weakened. No wildcard permission was introduced.

## Post-fix database state

The local administrator role now contains the existing candidate permissions:

- `candidates.read`
- `candidates.create`
- `candidates.update`
- `candidates.status.update`
- `candidates.documents.read`
- `candidates.documents.write`

## Verification

| Check | Result | Evidence |
|---|---|---|
| Admin can read candidates | PASS | Real authenticated `GET /api/v1/candidates` returned HTTP 200 and the standard response |
| Required permission resolved | PASS | API check and persisted role both resolve `candidates.read` |
| Unauthorized role | PASS | Focused API test returns HTTP 403 when `requirePermission` rejects |
| Cross-tenant request | PASS | Real request using an organization without membership returned HTTP 403 `FORBIDDEN`; temporary organization was removed |
| Active organization respected | PASS | Permission lookup and repository receive the authenticated active organization ID |
| Unit/API regression | PASS | 19 files, 72 tests passed |
| Playwright regression | PASS | 9/9 tests passed, including authenticated candidate loading |
| Lint | PASS WITH WARNINGS | Exit 0; six existing incomplete Phase 9 payroll warnings |
| Typecheck | FAIL — known Phase 9 defect | Only `src/modules/payroll/service.ts` errors remain |
| Production build | FAIL — known Phase 9 defect | Compilation reaches type validation and fails on the same incomplete payroll service |
| Frozen SRS | PASS | `docs/SRS.md` was not modified |

## Files changed

- `src/lib/rbac-permissions.json`
- `src/lib/rbac-permissions.ts`
- `scripts/bootstrap-local-admin.cjs`
- `tests/candidates-api.test.ts`
- `tests/e2e/global-setup.ts`
- `tests/e2e/smoke.spec.ts`
- `docs/CANDIDATES_RBAC_DEBUG_REPORT.md`

## Final result

The Candidates RBAC defect is resolved. Authentication, explicit permissions, active membership checks, organization scoping, and cross-tenant rejection remain enforced. Phase 10 was not started.
