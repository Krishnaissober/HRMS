# Phase 4 Final Review Report

Date: 2026-08-18

## Review scope

This review compares the implemented Phase 4 system with the frozen requirements in `docs/SRS.md` and the evidence in `docs/PHASE_4_COMPLETION_REPORT.md`. `docs/SRS.md` was not modified. Its SHA-256 remains:

`ADFCA7D01C87C33884BD0C3F2CA726DBECDCCFE83F249D48F2365415AE104E09`

No Phase 5 work was started.

## Executive decision

**PHASE 4 NOT READY FOR PHASE 5**

The main workflow is present and PostgreSQL persistence, RBAC, tenant filtering, PDF authorization and audit writes are substantially implemented. However, core business integrity defects remain:

1. Hiring decisions do not validate legal transitions. Any application can receive repeated or contradictory Hire, Hold or Reject decisions regardless of its current status.
2. Multiple offers can be created for the same hiring decision/application because there is no duplicate-offer service check or database uniqueness constraint.
3. Offer send calls the notification provider before the offer status and audit transaction. A provider success followed by database failure can leave a delivered offer without `SENT` state or `OFFER_SENT` audit evidence.

These are HIGH findings affecting the core hiring workflow and prevent readiness for Phase 5.

## Requirements reviewed and findings

| Area                               | Classification      | Finding                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ---------------------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hire decision                      | HIGH                | The API and service record Hire and map it to `SELECTED`, but do not validate the current application/candidate state before recording it. Contradictory/repeated decisions are accepted.                                                                                                                                                                                                                                          |
| Hold decision                      | HIGH                | Hold is supported and requires a reason, but its transition is not checked against the current state. A previously rejected or selected application can be moved to Hold.                                                                                                                                                                                                                                                          |
| Reject decision                    | HIGH                | Reject is supported and requires a reason, but its transition is not checked against the current state. Terminal-state behavior is not enforced.                                                                                                                                                                                                                                                                                   |
| Mandatory reasons                  | PASS                | Zod and service validation require non-blank reasons for Hold and Reject. This is enforced outside the UI.                                                                                                                                                                                                                                                                                                                         |
| Decision history                   | PASS                | `HiringDecision`, `CandidateActivity` and audit records retain actor, decision, reason and notes within the organization scope.                                                                                                                                                                                                                                                                                                    |
| Offer templates                    | PASS                | Templates are organization-scoped, validated, persisted and support configured approval-step labels.                                                                                                                                                                                                                                                                                                                               |
| Offer creation                     | HIGH                | Offers require a tenant-matched Hire decision, application and template, but duplicate offers for the same hiring decision are permitted.                                                                                                                                                                                                                                                                                          |
| Offer approval                     | PASS                | Approval requires `offers.approve`, is tenant-scoped, processes configured steps sequentially and writes an audit event transactionally. No unsupported role model was inferred beyond the SRS permission boundary.                                                                                                                                                                                                                |
| Offer PDF generation               | PASS                | Approved/sent/viewed/accepted/declined offers can produce an authenticated private PDF. Draft and pending-approval downloads are rejected.                                                                                                                                                                                                                                                                                         |
| Offer sending                      | HIGH                | Notification delivery occurs before the database update/audit transaction. A later persistence failure can produce an externally sent offer with no matching sent state or audit event.                                                                                                                                                                                                                                            |
| Accept/decline                     | PASS                | One-time hashed response tokens support both responses; response status and response time persist, candidate activity is written, and replay is rejected.                                                                                                                                                                                                                                                                          |
| Offer status transitions           | HIGH                | The offer state guards are generally present, but the decision state defects allow invalid upstream hiring states. There is also no explicit withdrawal operation; this is acceptable only where “as appropriate” applies, but should be confirmed before release.                                                                                                                                                                 |
| RBAC                               | PASS                | Protected decision, offer, approval, send and download endpoints use authenticated membership and explicit Phase 4 permissions.                                                                                                                                                                                                                                                                                                    |
| Tenant isolation                   | PASS                | Queries and mutations scope organization IDs; the persisted E2E test rejects cross-tenant offer download and isolates decision reads.                                                                                                                                                                                                                                                                                              |
| Audit logging                      | HIGH                | Decision, creation, approval, download and response mutations use transaction-scoped audit writes. Send is not atomic with notification and persistence, creating an audit consistency gap.                                                                                                                                                                                                                                        |
| Document security                  | PASS                | Offer PDF download is authenticated, tenant-scoped, permission-protected, private/no-store and audited. No public offer PDF route exists.                                                                                                                                                                                                                                                                                          |
| API validation                     | MEDIUM              | Core fields and reason requirements are validated. Date relationships such as expiry after issue/start are not validated, leaving inconsistent offer dates possible.                                                                                                                                                                                                                                                               |
| Error handling                     | PASS                | Routes use the standard error envelope and avoid returning provider internals. The send ordering issue remains a consistency risk rather than an error-envelope defect.                                                                                                                                                                                                                                                            |
| PostgreSQL persistence             | PASS                | The reported migration and live persisted workflow passed; current unit/API verification also passed.                                                                                                                                                                                                                                                                                                                              |
| Unit/API tests                     | MEDIUM              | 43 unit/API tests pass, but they do not cover valid Hold, valid Reject, invalid decision transitions, duplicate offers, unauthorized approval/download, send rollback, or decline persistence.                                                                                                                                                                                                                                     |
| Playwright workflow                | MEDIUM              | The persisted offer E2E covers Hire, missing Hold reason, creation, approval, send, PDF, acceptance, replay rejection and cross-tenant download. It does not cover Hold/Reject success, decline, duplicate offers, invalid transitions or unauthorized approval. A full-suite rerun had 6/7 pass because the offer test hit the 30-second timeout; the same test passed in isolation, indicating suite flakiness/reliability risk. |
| Sensitive compensation/data access | PASS                | Compensation is returned only through protected offer APIs/PDF paths requiring `offers.read`; public response view exposes only the persisted candidate-facing summary.                                                                                                                                                                                                                                                            |
| Environment blockers               | ENVIRONMENT BLOCKED | Redis/BullMQ, S3-compatible storage and external email remain unavailable or console-only as documented. No external delivery success is claimed.                                                                                                                                                                                                                                                                                  |

## Detailed security and integrity review

### Decision transitions — HIGH

`createHiringDecision` checks only that the application belongs to the tenant and maps the requested decision to a status. It does not consult an allowed-transition table or reject terminal/repeated states. This permits invalid workflow histories and can overwrite candidate/application status without a valid business transition.

### Duplicate offers — HIGH

`createOffer` verifies the supplied Hire decision, application and template, but does not check for an existing offer for that decision/application. `Offer` has no uniqueness constraint for the decision/application relationship. Repeated requests can create multiple simultaneous offers and approval paths.

### Send/audit atomicity — HIGH

`sendOffer` calls `emailProvider().send(...)` before the transaction that sets `SENT`, stores the response-token hash and writes `OFFER_SENT`. A database error after provider success creates a state/audit mismatch. The implementation does not currently provide an outbox or compensating retry contract.

### Response-token security — MEDIUM

Tokens are generated with cryptographically secure random bytes, stored as SHA-256 hashes and cleared after response. However, the public view/respond endpoints have no visible rate limit or abuse throttling, and the authenticated send response returns the raw response URL. This is not an immediate cross-tenant authorization bypass, but it should be addressed before production external exposure.

## Verification evidence

- Unit/API suite: **PASS — 43 tests**.
- Lint: **PASS**.
- Typecheck: **PASS**.
- SRS hash: **unchanged**.
- Full Playwright rerun: **6 passed, 1 timed out** at 30 seconds on the Phase 4 offer workflow.
- Isolated Phase 4 Playwright rerun: **1 passed** in 20.2 seconds.
- Completion report historical result: **7 passed**.

The timeout is classified as a MEDIUM test reliability issue because the workflow passes in isolation but the full-suite result is not deterministic within the configured timeout.

## Environment blockers

The following remain explicitly environment blocked rather than passed:

- Redis/BullMQ connectivity.
- S3-compatible storage.
- External email delivery; the configured console provider is not real delivery.
- Prisma shadow-database creation through `prisma migrate dev` because the local user lacks `CREATEDB`; deployed migration status is current.

## Recommended fixes before Phase 5

1. Add an SRS-aligned decision transition table and reject invalid/repeated Hire, Hold and Reject transitions at service level.
2. Enforce one offer per hiring decision/application according to the existing policy, in both service logic and PostgreSQL uniqueness constraints.
3. Replace send-before-persist behavior with a transactionally consistent notification/outbox approach, or explicitly make send persistence and retry semantics atomic.
4. Add API and persisted E2E coverage for valid Hold/Reject, invalid transitions, duplicate offers, decline, unauthorized approval/download, and send failure behavior.
5. Stabilize the full Playwright suite so the persisted Phase 4 test does not depend on isolated execution or exceed its configured timeout.
6. Add public response endpoint rate limiting before real external offer links are enabled.

## Files reviewed

- `docs/SRS.md`
- `docs/PHASE_4_COMPLETION_REPORT.md`
- `src/modules/hiring/service.ts`
- `src/modules/hiring/schemas.ts`
- `src/modules/hiring/constants.ts`
- `src/modules/hiring/repository.ts`
- Phase 4 API routes under `src/app/api/v1/`
- `prisma/schema.prisma`
- Phase 4 migration
- `tests/hiring-api.test.ts`
- `tests/e2e/hiring-offers-persisted.spec.ts`
- `src/lib/rbac.ts`
- `src/lib/audit.ts`
- `src/lib/notifications.ts`
- `src/lib/storage.ts`

## Final decision

**PHASE 4 NOT READY FOR PHASE 5**
