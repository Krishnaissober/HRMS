# Phase 1 Final Environment Validation Report

Date: 2026-08-17  
Authority: `docs/SRS.md` (unchanged)  
Inputs: `docs/PHASE_1_REMEDIATION_REPORT.md`, `docs/PHASE_1_REVIEW_REPORT.md`, `docs/PHASE_0_LOCAL_SETUP.md`

## Final decision

**PHASE 1 NOT READY FOR PHASE 2**

The code and local browser checks pass, but the required real persistence and infrastructure workflow cannot be completed in this environment. Phase 2 was not started and `docs/SRS.md` was not modified.

## Validation matrix

| Area | STATUS | Evidence |
|---|---|---|
| PostgreSQL running | PASSED | PostgreSQL 14 and 18 Windows services are running; port 5432 accepts TCP connections. |
| PostgreSQL credentials/database/DATABASE_URL | PASS | The running app loads `.env.local`; Prisma connects to `hr_portal` on localhost:5433 with the configured credentials. |
| Prisma connection/migrations | PASS | `prisma validate` passes and `prisma migrate status` reports 3 migrations with the database schema up to date. |
| Candidate/application persistence/read-back | PASS | Live public and authenticated HR API calls inserted and read back candidate/application data in PostgreSQL. |
| Redis running | ENVIRONMENT BLOCKED | No Redis Windows service, `redis-server`, or listener was found on localhost:6379. |
| REDIS_URL/BullMQ/queue/worker | ENVIRONMENT BLOCKED | Configuration is `redis://localhost:6379`, but Redis is unavailable; queue creation and worker initialization were not falsely marked successful. |
| Readiness detection | PASSED | With services unavailable, `GET /api/ready` correctly returned HTTP 503 and reported database/Redis unavailable. |
| S3-compatible storage | ENVIRONMENT BLOCKED | No configured usable provider or local substitute was available. Upload, object metadata verification, download, authorization, tenant isolation and deletion were not faked. |
| Docker availability | ENVIRONMENT BLOCKED | Docker CLI and Compose are installed, but Docker Desktop’s Linux engine is stopped; Docker API connection fails. |
| Docker image build | ENVIRONMENT BLOCKED | Not attempted as a successful build because the Linux engine is unavailable. |
| Public hiring form | PASSED | Playwright smoke test passed; form renders required intake controls. Live submission remains database-blocked. |
| Application/job linkage | ENVIRONMENT BLOCKED | Code and migration define organization-scoped requisition/application linkage and required requisition input; real insert/read-back requires PostgreSQL. |
| HR candidate view | PASSED | Playwright shell/rendering test passed. Live candidate retrieval remains database-blocked. |
| Status transitions | PASSED | Service/API code and unit transition tests pass; live persisted transition remains database-blocked. |
| Hold/Reject reasons | PASSED | Service-level validation requires a reason for `HOLD` and `REJECTED`; live audit/history persistence remains database-blocked. |
| Walk-in flow | ENVIRONMENT BLOCKED | Code includes visit persistence and check-in/check-out APIs/UI; real walk-in persistence requires PostgreSQL. |
| PDF/print flow | ENVIRONMENT BLOCKED | PDF code/build verification passes, but authenticated candidate retrieval and required audit persistence require PostgreSQL; document-backed flow also requires storage. |
| Upload flow | ENVIRONMENT BLOCKED | Validation and storage integration code are present, but no S3-compatible service is configured for upload/object verification/download/deletion. |
| Audit logging | ENVIRONMENT BLOCKED | Transactional audit code is present; transaction commit/rollback and read-back require PostgreSQL. |
| Actor history | PASSED | Code includes tenant-scoped actor selection and the UI renders actor name/email where available. Live data verification requires PostgreSQL. |
| Authentication | PASSED | Protected routes retain authentication/RBAC checks; public/health smoke checks pass. Full authenticated workflow is database-blocked. |
| RBAC | PASSED | Unit RBAC tests pass and protected route checks are present. Live multi-user authorization requires PostgreSQL/auth data. |
| Tenant isolation | ENVIRONMENT BLOCKED | Organization-scoped queries and tenant-safe links are implemented; cross-tenant live requests require real organizations/memberships in PostgreSQL. |
| Lint | PASSED | `npm run lint` passed. |
| Typecheck | PASSED | `npm run typecheck` passed. |
| Unit/API tests | PASSED | 14 Vitest tests passed. |
| Playwright | PASSED | 3 browser smoke tests passed. These are not persisted workflow tests. |
| Production build | PASSED | `npm run build` completed. It emits the known optional BullMQ `@valkey/valkey-glide` warning. |

## Environment blockers and exact prerequisites

1. PostgreSQL: provide valid local credentials for an existing `hr_portal` database, set `DATABASE_URL` in `.env.local`, then run `npx prisma migrate deploy`, `npx prisma migrate status`, and real persistence/read-back tests.
2. Redis: start Redis on `localhost:6379` or set `REDIS_URL` to an approved reachable instance, then verify BullMQ queue and worker initialization.
3. S3: configure the project’s private S3-compatible endpoint, bucket, access key and secret, then verify upload, metadata, download, authorization, tenant isolation and deletion.
4. Docker: start Docker Desktop with the Linux engine enabled, then run the documented Compose setup and build the application image.

Until all required live workflow checks pass, the final gate remains **PHASE 1 NOT READY FOR PHASE 2**.

## Environment recovery attempt

The local setup was rechecked against `docs/PHASE_0_LOCAL_SETUP.md` without resetting or deleting database data.

### PostgreSQL

- PostgreSQL 18 is listening on port 5432 and PostgreSQL 14 is listening on port 5433.
- The repository’s Prisma datasource reads `DATABASE_URL` from the environment.
- No `.env.local` or PostgreSQL password file was present.
- The documented local account `hr_portal` with password `hr_portal_local` failed authentication on both local PostgreSQL listeners. The previous sample `change-me` credentials also fail.
- The project `.env.example` currently uses port 5432 and `change-me`, while the setup document specifies `hr_portal_local`; neither credential set is usable in this environment.
- Because the administrator password is unknown and the active PostgreSQL data directories are protected by the service account, no credentials or database roles were guessed or altered.

**STATUS: ENVIRONMENT BLOCKED**

Required recovery action: an administrator must provide or create a local role/database matching the documented configuration, or provide the actual existing credentials. Then set `.env.local`, run `npx prisma migrate deploy`, `npx prisma migrate status`, and execute real candidate/application persistence tests.

### Redis

- No Redis Windows service, `redis-server`, or `redis-cli` is installed.
- Port 6379 is not listening.
- WSL has only the stopped `docker-desktop` distribution.

**STATUS: ENVIRONMENT BLOCKED**

Required recovery action: start an approved Redis runtime on `localhost:6379` or provide a reachable `REDIS_URL`, then verify BullMQ queue and worker initialization.

### S3-compatible storage

- The storage abstraction expects `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`.
- `.env.example` points to `http://localhost:9000`, but no MinIO binary, local S3 service, or configured provider is available.

**STATUS: ENVIRONMENT BLOCKED**

Required recovery action: configure a private S3-compatible provider or approved MinIO runtime with those variables, then run real upload, metadata, download, deletion, authorization and tenant-isolation tests.

### Docker

- Docker CLI and Compose are installed.
- Docker Desktop service is stopped; starting it did not make the Linux engine available.
- `docker info` and `docker compose up -d postgres redis` fail because the Docker Linux engine named pipe is unavailable.

**STATUS: ENVIRONMENT BLOCKED**

Required recovery action: start Docker Desktop with the Linux container engine enabled, then use the documented Compose setup. No image build success is claimed.

## Recovery conclusion

No fake services, fake credentials, database resets, mock persistence, or fabricated upload/download results were introduced. PostgreSQL is now live-verified; Redis and S3 remain unavailable for the dependent portions of the workflow.

## Final live validation run

The app was restarted on the verified local port after its stale development middleware artifact was found. The generated `.next` cache was moved aside; source, migrations and database data were not reset.

| Check | STATUS | Live evidence |
|---|---|---|
| `/api/health` | PASS | HTTP 200 from the running app. |
| `/api/ready` | ENVIRONMENT BLOCKED | HTTP 503; database reports `ok`, Redis reports `unavailable`. |
| Prisma migration status | PASS | With `.env.local` loaded, Prisma reports 3 migrations and database schema up to date on PostgreSQL port 5433. |
| Redis connectivity | ENVIRONMENT BLOCKED | No listener on port 6379; readiness confirms unavailable. |
| Storage connectivity | ENVIRONMENT BLOCKED | Presigned URL generation succeeds, but the real PUT to localhost:9000 is refused. |
| Public hiring form | PASS | Public API submission through the running app returned HTTP 201. |
| Candidate persistence | PASS | Candidate was retrieved from PostgreSQL through the protected HR API after public submission. |
| Application/job linkage | PASS | Read-back profile contained the persisted application and `REQ-VALIDATION-001` requisition relation in the same organization. |
| HR candidate retrieval | PASS | Tenant-scoped list and profile requests returned the persisted candidate. |
| Search/filter/pagination | PASS | Live `q=Live&page=1&pageSize=10` request returned the matching item with total/page metadata. |
| Status transition | PASS | Live `APPLIED` → `HOLD` transition returned HTTP 200 and persisted status. |
| Hold/Reject reason enforcement | PASS | Live `HOLD` without reason returned HTTP 422; the same transition with reason returned HTTP 200 and persisted reason/notes. |
| Walk-in intake | PASS | Authenticated walk-in submission returned HTTP 201 and read-back contained the persisted visit/application. |
| Walk-in check-in/out | PASS | Real check-in returned HTTP 201 and check-out returned HTTP 200 with persisted timestamps/statuses. |
| Activity history with actor | PASS | Read-back activity included `Validation HR` and its email for the authenticated walk-in/status actions. |
| Audit event persistence | PASS | PostgreSQL read-back contained public intake, status, walk-in, check-in/out and PDF audit events. |
| Authentication | PASS | Authenticated session was required and used for HR operations; unauthenticated candidate list returned HTTP 401. |
| RBAC | PASS | Protected route permission checks were exercised through the authenticated HR role; an unscoped organization request returned HTTP 403. |
| Tenant isolation | PASS | Request for the persisted candidate under a different organization context returned HTTP 403. |
| Printable/PDF flow | PASS | Authenticated tenant-scoped print request returned HTTP 200 with `application/pdf` and non-empty PDF bytes; audit row was read back. |
| Public upload URL | PASS | Real public upload preparation returned a tenant-scoped presigned URL. |
| Actual document upload/download/deletion | ENVIRONMENT BLOCKED | The configured S3 endpoint refused the real upload connection, so no document metadata, download or deletion result was fabricated. |
| Authenticated upload endpoint contract | PASS | The endpoint now accepts the pre-upload metadata contract without requiring a pre-existing `objectKey`, preserves authentication/tenant/RBAC checks, validates metadata, and returns the standard upload response. |

### Final live-gate classification

The database-backed candidate, application, job-linkage, HR, status, reason, walk-in, actor, audit, PDF, RBAC and tenant checks are **PASS**. The authenticated upload endpoint contract is now **PASS** in code and live API validation. Redis and actual S3 upload/download checks remain **ENVIRONMENT BLOCKED**, so the complete Phase 1 workflow is not fully verified.

## Upload endpoint remediation

The failure was caused by using `documentInputSchema` for the upload-URL request. That schema represents a completed candidate document and requires `objectKey`; the frontend requests an upload URL before an object key exists. The route now uses `uploadUrlRequestSchema`, which validates `kind`, filename, content type and size, then generates the organization-prefixed object key and delegates signing to the existing storage abstraction.

### Upload contract tests

- Unauthenticated request: PASS, HTTP 401.
- Authenticated user without permission: PASS, HTTP 403.
- Authenticated authorized request: PASS, HTTP 200 with tenant-prefixed object key and standard response.
- Invalid type/oversized file: PASS, HTTP 422.
- Wrong tenant context: PASS, rejected by tenant/authentication context.
- Storage signing failure: PASS, safe HTTP 503 response in unit coverage.
- Actual S3 PUT/object metadata/download/deletion: ENVIRONMENT BLOCKED because the configured localhost:9000 service refuses connections.

The endpoint does not persist `CandidateDocument` metadata at URL creation time; metadata is persisted atomically with the candidate submission after the uploaded object is verified. That persistence path remains dependent on a working S3 service for live document tests.

## Post-remediation verification

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm test -- --run`: PASS, 20 tests including 6 upload endpoint contract tests.
- `npm run test:e2e`: PASS, 3 Playwright smoke tests.
- `npm run build`: PASS, with the existing optional BullMQ `@valkey/valkey-glide` warning.
- Redis: ENVIRONMENT BLOCKED.
- S3 integration: ENVIRONMENT BLOCKED.
