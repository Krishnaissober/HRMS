# Continuous Audit Changelog

## Iteration 1 — Baseline audit

- Found legacy organization-ID entry in hiring pages despite single-company UX direction.
- Found walk-in intake requiring internal requisition/organization values.
- Found no authenticated duplicate-match endpoint or persisted HR intake notification.
- Found 8 lint warnings and stale Playwright expectations for the clean single-company routes.
- Recorded Redis, MinIO/S3, email, and Windows process execution as environment-dependent areas.

## Iteration 2 — Hiring workflow remediation

- Added organization-scoped candidate matching API.
- Normalized email/mobile lookup and persistence.
- Added real published-position selection to walk-in intake.
- Added existing-candidate prefill without exposing internal IDs.
- Added transactionally persisted in-app notifications for eligible HR members.
- Expanded candidate search to reference and position fields.
- Added candidate-match API regression coverage.

## Iteration 3 — Route and code cleanup

- Removed organization-ID UI from candidate detail and offer management.
- Removed organization-ID UI and query propagation from interview list/create routes.
- Removed unused shared table/form code and stale lint suppressions.
- Updated clean-route Playwright expectations and corrected the dashboard test to validate tenant isolation at the API boundary.

## Iteration 4 — Fresh verification

- Unit/API: 100/100 passed in a fresh run.
- Focused persisted dashboard workflow: 1/1 passed.
- Full Playwright: 11/13 passed; MinIO upload and payroll dependency failures remain environment-blocked.
- Production build: a clean pre-final-route-edit build passed with optional Valkey warnings; the fresh post-edit build was blocked by Windows `spawn EPERM`.
- Prisma validation/status/diff: passed with `.env.local` database configuration; schema current, empty diff.
- Health: 200. Readiness: 503 because Redis is unavailable.
- A later Vitest invocation encountered Windows `spawn EPERM`; it is recorded as an environment limitation rather than a false pass.
