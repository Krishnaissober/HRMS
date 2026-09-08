# Phase 5 Remediation Report

Date: 2026-08-18

Authoritative source: `docs/SRS.md` (unchanged)

Reviewed findings: `docs/PHASE_5_REVIEW_REPORT.md`, `docs/PHASE_5_COMPLETION_REPORT.md`

## Final status

**PHASE 5 STATUS: READY FOR PHASE 6**

The two HIGH application findings are resolved and regression verification passes. Redis, S3 and the live application health/readiness process remain explicitly environment-blocked; they were not converted into false application passes. Phase 6 was not started.

## Finding results

| Finding                              | Status                  | Evidence                                                                                                                                                                                                    |
| ------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-106 self-service employee profile | **RESOLVED**            | Dedicated authenticated self-service API, permitted-field allowlist, tenant/RBAC checks, audit/history and persisted PostgreSQL verification.                                                               |
| FR-104 document request workflow     | **RESOLVED**            | HR request creation, employee-owned request listing, upload URL/submission contract, verification/rejection transitions, acknowledgement and audit/history. Live object storage remains blocked separately. |
| Security regression tests            | **RESOLVED**            | Protected-field, authentication, permission, tenant, concurrent conversion and invalid document-transition coverage added.                                                                                  |
| Redis                                | **ENVIRONMENT BLOCKED** | No usable Redis/BullMQ service was available.                                                                                                                                                               |
| S3                                   | **ENVIRONMENT BLOCKED** | No usable S3-compatible provider was available.                                                                                                                                                             |
| Health/readiness                     | **ENVIRONMENT BLOCKED** | No application process was listening on localhost:3000 during the final direct probe.                                                                                                                       |

## FR-106 self-service profile

Status: **RESOLVED**

Implemented:

- `GET /api/v1/me/employee` returns only the authenticated employee’s permitted profile fields.
- `PATCH /api/v1/me/employee` updates only the explicit self-service allowlist:
  - phone
  - address lines
  - city/state/country/postal code
  - profile image URL
- HR-managed fields are excluded and strict Zod parsing rejects protected or unknown fields instead of silently accepting them.
- Existing Better Auth session and organization membership are reused; no separate employee authentication system was added.
- Dedicated RBAC permissions are enforced: `employees.self.read` and `employees.self.update`.
- Employee identity is resolved from the authenticated user email within the selected organization. Ambiguous duplicate email matches are rejected rather than exposing an arbitrary profile.
- Updates use the service layer and transactionally write `EmployeeHistory` and `AuditLog` records with the actor.
- The response excludes HR-only application, offer, compensation, manager, probation and internal onboarding details.

Verified:

- Own profile read.
- Permitted phone update persisted to PostgreSQL.
- Protected department update rejected with 422.
- Invalid input rejected with 422.
- Unauthenticated and unauthorized access rejected.
- Cross-tenant self-service lookup returns not found.
- Self-service audit/history action persisted.

## FR-104 document-request workflow

Status: **RESOLVED** for application workflow and contract; live storage integration remains environment-blocked.

Implemented using the existing `OnboardingDocument` model and status vocabulary:

- `POST /api/v1/employees/{id}/documents/requests` creates an HR-owned, tenant-scoped `REQUESTED` document record with kind/category and creation timestamp.
- `GET /api/v1/me/employee/documents` exposes only the authenticated employee’s own requests and omits storage object keys.
- `POST /api/v1/me/employee/documents/{documentId}/upload-url` generates an owned request upload URL through the storage abstraction.
- `POST /api/v1/me/employee/documents/{documentId}/submit` validates ownership, object-key tenant scope, file type/size and storage metadata before changing `REQUESTED` or `REJECTED` to `UPLOADED`.
- HR verification remains on the existing status API and is now bound to both employee ID and document ID.
- Only `UPLOADED → VERIFIED` or `UPLOADED → REJECTED` are accepted by the verifier; invalid transitions return 409.
- Rejected requests may be resubmitted; no new document business state was invented.
- Request, submission, verification/rejection and download events are auditable.
- Cross-tenant request, submission and verification lookups are rejected.

Verified with real PostgreSQL:

- Request creation persisted as `REQUESTED`.
- Employee sees own request.
- Cross-tenant employee/request access rejected.
- Verification of a still-requested document rejected with 409.
- Audit event for request creation persisted.

Storage boundary:

- S3-compatible upload/download/object verification/deletion was not claimed as passed because S3 is unavailable.
- Contract tests cover the route/auth/validation/service forwarding without faking production storage behavior.

## Security regression coverage

Status: **RESOLVED**

Added or verified coverage for:

- Employee self-service authentication and permission checks.
- Protected-field update rejection.
- Invalid self-service input rejection.
- Cross-tenant employee access.
- Cross-tenant document-request access.
- Unauthorized document verification.
- Invalid document state transition.
- Sequential duplicate conversion.
- Concurrent conversion race with one persisted employee.
- Tenant-scoped document route ownership binding.
- Existing onboarding/task authorization contracts.

The persisted Playwright workflow uses real PostgreSQL and verifies conversion, self-service profile persistence, request persistence, tenant isolation, onboarding progress, status, assets, access, mentor assignment and audit rows. It is not rendering-only.

## Regression verification

| Check             | Status              | Result                                                                                                                                                  |
| ----------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit/API tests    | PASSED              | 52 tests passed across 13 files.                                                                                                                        |
| Playwright        | PASSED              | Full suite: 9 persisted tests passed. Remediation-targeted workflow: 1 passed.                                                                          |
| Lint              | PASSED              | No lint errors.                                                                                                                                         |
| Typecheck         | PASSED              | `tsc --noEmit` passed.                                                                                                                                  |
| Production build  | PASSED WITH WARNING | Build completed successfully; BullMQ reports optional unresolved `@valkey/valkey-glide`.                                                                |
| Prisma validation | PASSED              | Schema valid.                                                                                                                                           |
| Migration status  | PASSED              | 9 migrations found; database up to date.                                                                                                                |
| Migration diff    | PASSED              | No difference detected. No schema migration was required for this remediation because the existing document status model already supported `REQUESTED`. |
| `/api/health`     | ENVIRONMENT BLOCKED | No app process listening on localhost:3000 during final direct probe.                                                                                   |
| `/api/ready`      | ENVIRONMENT BLOCKED | Same process issue; Redis is also unavailable.                                                                                                          |

## Environment blockers

### Redis

Status: **ENVIRONMENT BLOCKED**

No Redis service was available. BullMQ connectivity, worker startup and probation reminder delivery remain unverified. Configure and start Redis at the documented `REDIS_URL` before live queue validation.

### S3

Status: **ENVIRONMENT BLOCKED**

No S3-compatible provider was available. Live upload, download, metadata verification and deletion remain unverified. Configure the documented S3 endpoint, bucket, region and credentials before running the storage-backed workflow.

### Health/readiness process

Status: **ENVIRONMENT BLOCKED**

The final direct probe found no process at `http://localhost:3000`. Start the application and rerun both endpoints for live process evidence.

## Files changed

- `src/modules/employees/constants.ts`
- `src/modules/employees/schemas.ts`
- `src/modules/employees/service.ts`
- Self-service and document-request routes under `src/app/api/v1/me/` and `src/app/api/v1/employees/`
- `src/app/api/v1/employees/[id]/documents/[documentId]/download/route.ts`
- `src/app/api/v1/employees/[id]/documents/[documentId]/status/route.ts`
- `src/lib/rbac-permissions.ts`
- `docs/API_SPEC.md`
- `docs/RBAC.md`
- `tests/employees-self-service-api.test.ts`
- `tests/e2e/employee-onboarding-persisted.spec.ts`
- `tests/e2e/global-setup.ts`

`docs/SRS.md` was not modified.

## Final gate

**PHASE 5 STATUS: READY FOR PHASE 6**

This decision is based on resolution of the HIGH application findings and passing regression verification. Redis, S3 and health/readiness remain separately classified as environment-blocked and must be resolved before claiming complete live infrastructure verification.
