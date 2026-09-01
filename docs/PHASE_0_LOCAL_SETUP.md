# Phase 0 Local Setup

This setup is for local development only. Never use these sample credentials in production.

## Local services

The application uses a local SQLite database file, so no PostgreSQL server or
Docker installation is required. Set this value in `.env.local`:

```dotenv
DATABASE_URL=file:./dev.db
REDIS_URL=redis://localhost:6379
BETTER_AUTH_SECRET=replace-with-at-least-32-random-characters
```

Then run:

```powershell
npm install
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status
npm run dev
```

Verify:

```powershell
Invoke-WebRequest http://localhost:3000/api/health
Invoke-WebRequest http://localhost:3000/api/ready
```

Readiness is successful when the local database is available and Redis reports `ok`.

Redis must listen on the configured `REDIS_URL`, normally `redis://localhost:6379`. Windows users can use a native Redis service, WSL2, or another approved Redis-compatible local runtime.

## Troubleshooting

- `P1001` or connection refused: the database service is not reachable at the configured host/port.
- database errors: remove the local `prisma/dev.db` file only if you intentionally want to recreate the local database, then run the baseline migration again.
- readiness reports `redis: unavailable`: start Redis and confirm port 6379 is listening.

## Authenticated Playwright fixture

The Playwright global setup at `tests/e2e/global-setup.ts` creates a disposable local-only Better Auth user and isolated SQLite organizations, memberships, permissions, candidate, requisition and application for each run. It uses an `example.test` email and generated password; no production credentials are stored in the repository.

Run the authenticated persisted workflow with:

```powershell
npm run test:e2e
```

The setup loads `.env.local`, signs up the generated user through `/api/auth/sign-up/email`, assigns the required permissions, and removes the generated organizations and user after the run. SQLite migrations must be applied. Redis, S3, calendar and external email are not required for this persisted attendance check.

Optional overrides for an approved local test fixture are supported through `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_BASE_URL`, `E2E_ORGANIZATION_ID`, `E2E_OTHER_ORGANIZATION_ID`, `E2E_CANDIDATE_ID`, `E2E_APPLICATION_ID` and `E2E_INTERVIEWER_ID`. The generated fixture also grants the tenant-scoped Phase 4 hiring-decision and offer permissions. Do not set these to production credentials or production data.

## Persistent local administrator

For interactive local development, set `LOCAL_ADMIN_EMAIL`, `LOCAL_ADMIN_PASSWORD`, `LOCAL_ADMIN_NAME`, `LOCAL_ADMIN_ORGANIZATION_NAME` and `LOCAL_ADMIN_ORGANIZATION_SLUG` in the ignored `.env.local` file. Never put real or production credentials in these variables.

With SQLite migrated and the local application running, create the account, active organization membership and local administrator role with:

```powershell
npm run auth:bootstrap-local
```

The command is disabled when `NODE_ENV=production`, does not print the password, and is idempotent for organization membership and role assignment. It uses Better Auth's sign-up endpoint for a missing user. If the local user already exists but its password is unknown, set a new `LOCAL_ADMIN_PASSWORD` and explicitly run:

```powershell
npm run auth:reset-local
```

The reset command updates only the existing Better Auth credential record. It does not bypass authentication, disable password verification, or change production accounts.

## Phase 5 local verification

The Phase 5 employee and onboarding APIs use the same generated authenticated fixture. The fixture grants the Phase 5 permissions needed by the persisted workflow, including employee read/create/update/status/history access, onboarding read/manage/task completion, document read/write/verify, asset management, access provisioning and mentor management.

SQLite is used for employee conversion, onboarding task persistence, history and audit verification. Redis is required only for future background processing such as probation reminders; no fake queue is used. S3-compatible storage is required for live document upload/download verification. When S3 is unavailable, document API contract tests may run, but live storage checks remain environment blocked.
