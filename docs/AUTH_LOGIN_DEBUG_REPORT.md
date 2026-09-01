# Authentication Login Debug Report

Date: 2026-08-18  
Scope: Better Auth local login diagnosis and safe local administrator bootstrap only

## Root cause

The running Next.js application used `.env.local` and connected successfully to PostgreSQL at `localhost:5433`, database `hr_portal`, schema `public`, as user `hr_portal`. The Better Auth request reached `POST /api/auth/sign-in/email`, but PostgreSQL contained no `User` row for `admin@onlyadmin.app`. Consequently there was no credential `Account`, active organization membership, or role assignment for that email. The server logged `User not found` and returned HTTP 401.

This was not caused by a disabled authentication provider, password bypass, middleware, or a connection to a different database.

## Authentication configuration

- Better Auth uses the Prisma PostgreSQL adapter from `src/lib/auth.ts`.
- Email/password authentication is enabled and email verification is not required for local sign-in.
- The auth base URL and trusted origin come from validated environment configuration.
- Secure cookies are required only in production; local HTTP sessions use development-compatible cookies.
- The route handler is the standard Better Auth Next.js handler at `src/app/api/auth/[...all]/route.ts`.
- The root route resolves the authenticated session server-side and requires an `ACTIVE` organization membership before redirecting into the HR workspace.

## Database and user state

Before remediation:

- database connection: PASS;
- `admin@onlyadmin.app` user: MISSING;
- Better Auth credential record: MISSING;
- organization membership: MISSING;
- active role assignment: MISSING.

After remediation:

- user record: PRESENT;
- Better Auth `credential` account with a password hash: PRESENT;
- organization: ACTIVE;
- membership: ACTIVE;
- role: `local-admin`;
- assigned existing permissions: 53.

No password or password hash was printed in validation output or this report.

## Fix applied

Added `scripts/bootstrap-local-admin.cjs` and the package commands:

- `npm run auth:bootstrap-local` creates a missing local user through Better Auth's real sign-up endpoint, then idempotently provisions the local organization, membership, role, and existing RBAC permissions.
- `npm run auth:reset-local` explicitly replaces the existing Better Auth credential hash when local credentials are unknown.

The utility:

- requires credentials through ignored `.env.local` variables;
- refuses to run when `NODE_ENV=production`;
- does not print passwords;
- does not disable or bypass password verification;
- does not hardcode tenant IDs;
- does not silently modify existing passwords without the explicit reset command.

The local-only variables and procedure are documented in `.env.example` and `docs/PHASE_0_LOCAL_SETUP.md`. The current `.env.local` remains excluded by `.gitignore`.

## Verification results

| Check | Result | Evidence |
|---|---|---|
| Better Auth configuration | PASS | Prisma PostgreSQL adapter and email/password provider enabled |
| Running server database | PASS | `.env.local` resolves to the reachable `hr_portal` database on port 5433 |
| Local administrator bootstrap | PASS | User, credential account, active organization, membership, role, and permissions persisted |
| Unauthenticated `/` | PASS | HTTP 200 sign-in entry |
| Valid local credentials | PASS | Sign-in HTTP 200 and Better Auth session cookie issued |
| Authenticated `/` | PASS | HTTP 307 to `/hr/candidates?organizationId={active membership organization}` |
| Candidate workspace | PASS | Redirect target returned HTTP 200 |
| Inactive/no membership behavior | PASS | Disposable authenticated user received `Organization access required`; fixture was removed afterward |
| Invalid credentials | PASS | HTTP 401; server logged `Invalid password` without exposing credential data |
| Unit/API tests | PASS | 18 files, 68 tests passed |
| Playwright auth smoke | PASS | 1 persisted authenticated root/tenant redirect test passed |
| Lint | PASS WITH WARNINGS | Exit 0; six pre-existing warnings in incomplete Phase 9 payroll code |
| Typecheck | FAIL — unrelated existing defect | Incomplete Phase 9 payroll draft references Prisma models absent from the generated client and invalid employee-history metadata |
| Production build | FAIL — unrelated existing defect | Compilation reaches type validation, then fails on the same incomplete Phase 9 payroll service |
| Frozen SRS | PASS | `docs/SRS.md` was not modified |

## Environment limitations

Authentication, PostgreSQL persistence, tenant membership, RBAC, and the root redirect are live-verified. Repository-wide typecheck and production build cannot be marked successful because of the separately documented Phase 9 draft failure in `src/modules/payroll/service.ts`. That code was not changed because this task is limited to authentication and explicitly prohibits speculative Phase 9 remediation.

Phase 10 was not started.
