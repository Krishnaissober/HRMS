# Phase 4 Completion Report — Hiring Decision and Offer Management

Date: 2026-08-18

## Final status

**PASS WITH ISSUES**

Phase 4 application behavior is implemented and verified against the frozen SRS. The remaining issues are environment or external-service limitations and are not represented as successful external delivery.

## Scope implemented

- Application-linked Hire, Hold and Reject decisions.
- Mandatory API/service reasons for Hold and Reject, with optional notes.
- Organization-scoped decision history with actor details.
- Candidate/application status updates and candidate activity/audit events in the same transaction as the decision.
- Organization-scoped offer templates with configurable approval-step configuration.
- Offer creation only from a Hire decision, with candidate/application/requisition linkage.
- SRS offer statuses: Draft, Pending Approval, Approved, Sent, Viewed, Accepted, Declined, Expired and Withdrawn as applicable.
- Approval-step persistence and sequential approval.
- Private authenticated offer PDF generation/download with audit logging.
- Configured notification abstraction for offer sending.
- One-time hashed candidate response tokens for acceptance/decline.
- Candidate-facing response page and HR decision/offer pages.
- Versioned APIs under `/api/v1/` with standard response/error envelopes.
- Existing tenant context, RBAC, validation, audit and database abstractions reused.

Employee conversion and all later-phase employee lifecycle modules were intentionally not implemented.

## Database and migration

Added migration `20260818160000_phase4_hiring_offers` with:

- `HiringDecision`
- `OfferTemplate`
- `Offer`
- `OfferApproval`

The migration was applied successfully to the configured local PostgreSQL database. `prisma validate`, migration status and schema diff passed when run with the documented `DATABASE_URL`. `prisma migrate dev` could not create a shadow database because the local database user lacks `CREATEDB`; the migration was generated from the schema diff and applied with `prisma migrate deploy` without resetting or deleting data.

## API surface

- `GET|POST /api/v1/hiring-decisions`
- `GET|POST /api/v1/offer-templates`
- `GET|POST /api/v1/offers`
- `GET /api/v1/offers/{id}`
- `POST /api/v1/offers/{id}/approve`
- `POST /api/v1/offers/{id}/send`
- `GET /api/v1/offers/{id}/download`
- `GET /api/v1/public/offers/view`
- `POST /api/v1/public/offers/respond`

Protected endpoints derive organization scope from the authenticated membership and `x-organization-id`; public response endpoints derive ownership from the one-time token record and accept no tenant identifier.

## Security and authorization

Added permissions:

- `hiring-decisions.read`
- `hiring-decisions.write`
- `offers.read`
- `offers.create`
- `offers.approve`
- `offers.send`

Verified behavior includes unauthenticated/unauthorized route protection, organization-scoped queries and writes, cross-tenant offer reads/downloads being rejected, mandatory decision reasons at the API boundary, and hashed one-time response tokens. Offer PDF downloads are private authenticated responses with `no-store` cache control and audit events.

## Tests and verification

| Check                                           | Result                                                    |
| ----------------------------------------------- | --------------------------------------------------------- |
| Unit tests                                      | PASS — 43 tests                                           |
| API contract tests                              | PASS — includes Phase 4 authorization and validation      |
| Playwright                                      | PASS — 7 tests, including persisted Phase 4 workflow      |
| Phase 4 persisted PostgreSQL workflow           | PASS                                                      |
| Candidate/application decision persistence      | PASS                                                      |
| Approval-step persistence                       | PASS                                                      |
| Offer PDF generation/download                   | PASS                                                      |
| Candidate acceptance and decline token contract | PASS — acceptance and replay rejection verified           |
| Audit persistence                               | PASS                                                      |
| Tenant isolation                                | PASS                                                      |
| RBAC                                            | PASS                                                      |
| Lint                                            | PASS                                                      |
| Typecheck                                       | PASS                                                      |
| Production build                                | PASS, with existing optional BullMQ Valkey module warning |
| Prisma validation                               | PASS with configured environment                          |
| Prisma migration status                         | PASS — database up to date                                |
| Prisma migration diff                           | PASS — no difference detected                             |

The persisted Playwright test covers missing Hold reason, Hire decision, cross-tenant decision read isolation, template creation, offer creation, approval, configured send adapter, private PDF download, cross-tenant PDF rejection, acceptance, response-token replay rejection, and persisted audit records.

## Environment and integration limitations

**PASS WITH ISSUES — Redis/BullMQ:** Redis remains unavailable in the local environment. Phase 4 does not claim queue-backed delivery. The existing readiness path and build retain the known optional BullMQ Valkey module warning.

**PASS WITH ISSUES — external email:** The project is configured with the existing `console` notification provider. Offer send behavior is verified through that configured abstraction, but no external email delivery is claimed. A real provider and credentials are required for live delivery.

**PASS WITH ISSUES — S3-compatible storage:** No S3-compatible service is configured in the current environment. Offer PDFs are generated as private authenticated responses from persisted offer/template data; no S3 upload/download success is claimed. Candidate document storage remains subject to the existing S3 prerequisite.

**Environment setup:** Local Prisma validation commands require `DATABASE_URL` to be loaded from `.env.local` because Prisma CLI does not automatically load that file in this repository. The local database user also needs `CREATEDB` if future `prisma migrate dev` shadow-database workflows are required.

## Files changed

- `prisma/schema.prisma`
- `prisma/migrations/20260818160000_phase4_hiring_offers/migration.sql`
- `src/modules/hiring/*`
- Phase 4 API routes under `src/app/api/v1/`
- `src/app/hr/candidates/[id]/page.tsx`
- `src/app/hr/offers/*`
- `src/app/offer-response/page.tsx`
- `src/lib/rbac-permissions.ts`
- `tests/hiring-api.test.ts`
- `tests/e2e/hiring-offers-persisted.spec.ts`
- `tests/e2e/global-setup.ts`
- `docs/API_SPEC.md`
- `docs/RBAC.md`
- `docs/PHASE_0_LOCAL_SETUP.md`

`docs/SRS.md` was not modified.

## Phase 5 gate

Phase 5 was not started. Before moving forward, configure and verify the required external integrations according to the project deployment policy, especially Redis/BullMQ and a real notification provider. Employee conversion remains the explicit next-phase boundary and is not included in this Phase 4 implementation.
