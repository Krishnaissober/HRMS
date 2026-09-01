# Root Route Fix Report

Date: 2026-08-18  
Scope: `/` entry and authentication routing only

## Root route before

`src/app/page.tsx` directly rendered the original Phase 0 static placeholder:

- eyebrow: `HR Portal · Phase 0`;
- heading: `Foundation ready`;
- foundation-only explanatory copy;
- link to `/api/health`.

There was no conditional session handling or redirect from `/`. `src/middleware.ts` only matches `/api/:path*` to attach request/cache headers and does not control page authentication. No Pages Router `pages/index.tsx`, route group, layout redirect, environment variable, or Next.js configuration overrode the App Router root.

## Root cause

The Phase 0 root component was never replaced when later HR workflows were added. Phases 1–8 added working pages under `/hr/*`, but no dashboard or authenticated application entry route was created. There was also no login page, even though Better Auth email/password endpoints and session handling already existed.

The intended implemented HR landing surface closest to a portal home is the tenant-scoped recruitment candidate workspace at `/hr/candidates`. A separate dashboard does not currently exist, so none was fabricated.

## Root route after

`/` is now session-aware:

1. An unauthenticated user sees an email/password sign-in entry backed by the existing Better Auth `/api/auth/sign-in/email` endpoint.
2. An authenticated user with an active membership is redirected to `/hr/candidates?organizationId={membership organization}`.
3. An authenticated user without an active organization membership sees a clear access-required state and can sign out; the application does not guess or hardcode tenant access.

The candidate workspace now reads the organization ID supplied by the root redirect into its existing tenant field. Existing candidate APIs and page behavior remain unchanged.

## Files changed

- `src/app/page.tsx` — replaced the Phase 0 placeholder with server-side session/membership routing.
- `src/components/login-entry.tsx` — added the minimal Better Auth sign-in/access-required entry component.
- `src/app/hr/candidates/page.tsx` — initializes the existing organization field from the redirect query.
- `src/app/layout.tsx` — replaced the stale foundation metadata description.
- `tests/e2e/smoke.spec.ts` — verifies unauthenticated entry and authenticated tenant redirect.
- `docs/ROOT_ROUTE_FIX_REPORT.md` — this report.

`docs/SRS.md` was not modified. Middleware and API routing were not changed. No Phase 10 work was started.

## Authentication behavior

- Session lookup uses the existing Better Auth server API and request cookies.
- Tenant selection uses the first active membership ordered by creation time; it does not accept a client-supplied tenant for the root redirect.
- Protected APIs continue to enforce active membership and `x-organization-id`/query tenant context through the existing tenant abstraction.
- Invalid credentials produce a safe generic sign-in error.
- Accounts without active membership are not redirected into an HR route.

## Verification results

| Check                      | Result                             | Evidence                                                                                                                                                                                                            |
| -------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unauthenticated `/`        | PASS                               | Playwright sees the `Sign in` heading and existing Better Auth form.                                                                                                                                                |
| Authenticated `/` redirect | PASS                               | Playwright signs in with the approved fixture and reaches the tenant-scoped `/hr/candidates` route.                                                                                                                 |
| Redirected tenant context  | PASS                               | Candidate workspace organization field equals the authenticated membership organization.                                                                                                                            |
| Root smoke test            | PASS                               | 1/1 targeted Playwright test.                                                                                                                                                                                       |
| Existing Phase 1–8 routes  | PASS                               | Full Playwright suite: 9/9 passed.                                                                                                                                                                                  |
| API regression             | PASS                               | Existing unit/API suite: 18 files, 68 tests passed; health assertion passed.                                                                                                                                        |
| Middleware regression      | PASS                               | Middleware was unchanged; API and full browser regression passed.                                                                                                                                                   |
| Lint                       | PASS WITH EXISTING WARNINGS        | Exit 0. Six warnings are confined to the previously failed, unfinished Phase 9 payroll service. Root-route files have no lint findings.                                                                             |
| Typecheck                  | BLOCKED BY EXISTING PHASE 9 DEFECT | Root-route changes typecheck, but repository typecheck fails in `src/modules/payroll/service.ts` because the unfinished Phase 9 Prisma client/service is inconsistent. Documented in `PHASE_9_FAILURE_ANALYSIS.md`. |
| Production build           | BLOCKED BY EXISTING PHASE 9 DEFECT | Compilation reaches type validation and fails on the same unrelated Phase 9 payroll error. The root route is not the failing module.                                                                                |
| SRS integrity              | PASS                               | Frozen SRS remains unchanged.                                                                                                                                                                                       |

## Result

The incorrect Phase 0 entry experience is resolved and verified in the running application. Repository-wide typecheck/build cannot honestly be marked PASS until the separately documented Phase 9 failure is remediated under explicit authorization.
