# HR Portal Repository Audit

Audit date: 2026-08-17  
Repository: `C:\Users\Jeswin\Downloads\HRMS`  
Authority: `docs/SRS.md` is treated as frozen and was not modified. The original source document is `docs/HR_Portal_SRS_v1.1_Vibe_Coding.docx`.

## Executive conclusion

This checkout is a documentation and SRS-preparation scaffold, not an implemented HR Portal. It contains no application package, frontend, backend, database schema, ORM configuration, authentication implementation, API implementation, tests, CI/CD workflow, Docker configuration, or deployable runtime.

The repository should be classified as **NEW**. The SRS coverage is therefore **NOT IMPLEMENTED** for every functional product area. `docs/ARCHITECTURE.md` describes the intended modular-monolith design and technology choices, but it is not evidence that those components exist. The first implementation milestone is Phase 0 foundation work, before any Phase 1+ HR workflow is built.

## 1. Current architecture

### Observed architecture

- No runtime architecture is currently present.
- No `package.json`, lockfile, TypeScript configuration, Next.js configuration, source directory, route directory, server directory, database directory, or test directory exists.
- No Git commit exists on the current `master` branch; all repository contents are untracked.
- The repository root contains documentation-conversion/audit scripts and generated audit artifacts.

### Intended architecture documented in the repository

`docs/ARCHITECTURE.md` proposes a TypeScript-first Next.js modular monolith:

`UI -> Next.js Route Handler -> authentication -> RBAC -> Zod validation -> domain service -> repository/Prisma -> PostgreSQL`, with Redis/BullMQ for asynchronous work, S3-compatible private storage, email/calendar providers, Vitest/Playwright, Sentry/OpenTelemetry, GitHub Actions and Docker.

This is a target architecture only. None of these runtime layers can be verified in the checkout.

## 2. Current tech stack

| Concern          | Observed implementation | SRS/architecture target                     | Status      |
| ---------------- | ----------------------- | ------------------------------------------- | ----------- |
| Frontend         | None                    | Next.js, React, TypeScript                  | Not present |
| UI               | None                    | Tailwind, shadcn/ui, Radix, Lucide          | Not present |
| Client state     | None                    | TanStack Query, Zustand                     | Not present |
| Forms/validation | None                    | React Hook Form, Zod                        | Not present |
| Backend/API      | None                    | Next.js Route Handlers and domain services  | Not present |
| Database         | None                    | PostgreSQL                                  | Not present |
| ORM              | None                    | Prisma                                      | Not present |
| Authentication   | None                    | Better Auth or Auth.js                      | Not present |
| Cache/jobs       | None                    | Redis and BullMQ                            | Not present |
| Storage          | None                    | S3-compatible private object storage        | Not present |
| Email/calendar   | None                    | Resend/SES; Google/Microsoft integrations   | Not present |
| Testing          | None                    | Vitest and Playwright                       | Not present |
| Observability    | None                    | Sentry and OpenTelemetry                    | Not present |
| Delivery         | None                    | GitHub Actions, Docker, managed hosting/AWS | Not present |
| AI               | None                    | Isolated, human-in-the-loop AI module       | Not present |

## 3. Existing modules

No application modules exist. The intended module list in `docs/ARCHITECTURE.md` is not implemented:

- Identity and access management
- Organizations/multi-tenancy
- Recruitment/ATS
- Candidate/application management
- Interview management
- Offers/hiring
- Employee management
- Onboarding
- Candidate attendance/visitor management
- Employee attendance/shifts/timesheets
- Leave management
- Payroll/compensation
- Expenses/reimbursements
- Performance management
- Learning/certifications
- Assets
- Documents/forms
- Helpdesk/HR requests
- Notifications/workflow automation
- Reports/analytics
- Offboarding/exit management
- Compliance/audit

## 4. Existing routes

None. No `app/`, `pages/`, route-handler, controller, server, or API route files exist. There is no public hiring route, authenticated portal route, health endpoint, file endpoint, webhook endpoint, or versioned API route.

## 5. Existing APIs

None. `docs/API_SPEC.md` exists but is empty. There are no handlers, controllers, services, OpenAPI documents, API clients, request schemas, response types, or integration adapters.

## 6. Existing database models

None. No `prisma/` directory, `schema.prisma`, SQL schema, migration, seed, database client, connection configuration, or repository implementation exists. `docs/DATABASE.md` exists but is empty.

The conceptual models described by the SRS and architecture document—organization, user, roles, permissions, candidates, applications, jobs, interviews, offers, employees, onboarding, attendance, leave, documents, audit logs and related domains—must be designed and reviewed before migrations are created.

## 7. Existing authentication

None. There is no sign-in/sign-out flow, session store, password reset, MFA structure, credential hashing, auth middleware, protected route boundary, or user identity context.

## 8. Existing RBAC

None. `docs/RBAC.md` exists but is empty. No roles, permissions, role inheritance, custom-role model, permission guard, organization-scoped authorization check, field-level access rule, or authorization test exists.

The SRS defines HR Admin, Recruiter, Interviewer, Hiring Manager, Manager, Employee, Visitor/Candidate, Finance/Payroll, Auditor/Compliance and platform/tenant administration concerns. These remain requirements, not implementation.

## 9. Existing tests

None. No test runner, test configuration, unit tests, API tests, integration tests, browser tests, fixtures, factories, coverage configuration, or accessibility tests exists. No package scripts are available to run type checking, linting, tests, or a production build.

The root and `temp/` Python scripts are document-extraction and SRS-fidelity tooling, not application tests.

## 10. Existing integrations

None. There are no configured providers, adapters, webhooks, credentials, environment templates, or integration tests for email, calendar, storage, Redis, observability, biometric devices, accounting/payroll, SMS/WhatsApp, or AI.

## 11. SRS coverage matrix

Status meanings: `IMPLEMENTED`, `PARTIALLY IMPLEMENTED`, `NOT IMPLEMENTED`, `CONFLICTING WITH SRS`, and `UNKNOWN`. A planned description in documentation does not count as implementation.

| SRS area                    | Status          | Evidence/assessment                                                                                                        |
| --------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Forms / candidate intake    | NOT IMPLEMENTED | No form UI, schemas, upload flow, public route, form builder, or submission persistence.                                   |
| Recruitment / ATS           | NOT IMPLEMENTED | No jobs, requisitions, candidates, applications, pipeline, search, notes, tags, or status history.                         |
| Interviews                  | NOT IMPLEMENTED | No scheduling, rounds, interviewers, scorecards, recommendations, reminders, or rescheduling.                              |
| Candidate attendance        | NOT IMPLEMENTED | No visitor/check-in/out or candidate no-show records.                                                                      |
| Offer / hiring              | NOT IMPLEMENTED | No offer templates, approvals, delivery, statuses, or conversion flow.                                                     |
| Employee lifecycle          | NOT IMPLEMENTED | No employee master, employment history, departments, managers, or status lifecycle.                                        |
| Onboarding                  | NOT IMPLEMENTED | No templates, instances, tasks, due dates, document requests, or acknowledgements.                                         |
| Employee attendance         | NOT IMPLEMENTED | No check-in/out, shifts, holidays, overtime, corrections, timesheets, or reports.                                          |
| Leave                       | NOT IMPLEMENTED | No leave types, policies, balances, requests, approvals, calendars, or attendance linkage.                                 |
| Payroll / expenses          | NOT IMPLEMENTED | No payroll implementation; no compensation, runs, payslips, expenses, reimbursements, or approvals.                        |
| Performance / learning      | NOT IMPLEMENTED | No goals, reviews, ratings, training, completion, or certifications.                                                       |
| Assets                      | NOT IMPLEMENTED | No inventory, assignments, returns, maintenance, or retirement tracking.                                                   |
| Documents                   | NOT IMPLEMENTED | No repository, metadata, versions, access control, previews, downloads, or expiry alerts.                                  |
| Helpdesk                    | NOT IMPLEMENTED | No ticket/request intake, assignment, comments, statuses, SLA, or history.                                                 |
| Notifications               | NOT IMPLEMENTED | No in-app notification model, templates, delivery, reminders, or task center.                                              |
| Analytics                   | NOT IMPLEMENTED | No dashboards, KPIs, exports, drill-downs, or reporting queries.                                                           |
| Offboarding                 | NOT IMPLEMENTED | No resignation, notice, clearance, asset return, access revocation, settlement, or exit documents.                         |
| Compliance / audit          | NOT IMPLEMENTED | No audit event model, actor context, retention, export, tamper evidence, or compliance reports.                            |
| Multi-tenancy               | NOT IMPLEMENTED | No organization model, tenant context, membership, scoping middleware, or isolation tests.                                 |
| RBAC                        | NOT IMPLEMENTED | No roles, permissions, inheritance, custom roles, guards, or permission matrix implementation.                             |
| APIs                        | NOT IMPLEMENTED | No API routes, schemas, versioning, pagination, error envelope, or API documentation.                                      |
| Integrations                | NOT IMPLEMENTED | No provider adapters, credentials, webhooks, queues, or integration contracts.                                             |
| AI                          | NOT IMPLEMENTED | No isolated AI module, privacy controls, human review workflow, or model adapter.                                          |
| Non-functional requirements | NOT IMPLEMENTED | No runtime exists to verify security, performance, accessibility, availability, logging, backup, or recovery requirements. |
| UX/UI                       | NOT IMPLEMENTED | No frontend, design system, responsive layouts, loading/error/empty states, or accessibility implementation.               |
| Testing                     | NOT IMPLEMENTED | No test infrastructure or automated workflow coverage.                                                                     |
| Deployment                  | NOT IMPLEMENTED | No Dockerfile, CI workflow, deployment config, environment template, health checks, or release process.                    |

No area is currently `IMPLEMENTED` or `PARTIALLY IMPLEMENTED`. `CONFLICTING WITH SRS` is not assigned to a runtime feature because no runtime exists; any future implementation must avoid introducing conflicts such as SQLite production storage, unscoped APIs, fake workflows, hardcoded business data, or unaudited sensitive downloads.

## 12. Technical debt

- There is no executable project foundation, so all implementation debt is still a delivery blocker rather than a refactoring backlog.
- The repository has no package manifest or lockfile, making the actual dependency set and reproducible build unknown.
- `docs/API_SPEC.md`, `docs/DATABASE.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/PHASE_STATUS.md`, `docs/QA_CHECKLIST.md`, and `docs/RBAC.md` are empty.
- `docs/ARCHITECTURE.md` is detailed but aspirational and currently has no code or schema to validate it.
- Root scripts and `temp/` contain multiple overlapping SRS extraction/audit utilities, generated reports, and debug artifacts; they are not organized as a maintained tooling package.
- `fix_script.py` is empty.
- Empty root files named `'` and `959'` are unexplained artifacts.
- There is no source-to-document traceability for implementation because there is no implementation.
- There is no formal migration, seed-data, branching, review, release, or rollback workflow.
- The repository is entirely untracked and has no commit baseline.

## 13. Security issues

No live security vulnerability can be tested because no application executes. The security posture is nevertheless incomplete and unsafe for HR data until Phase 0 establishes:

- authentication, secure sessions, password reset, MFA-ready design, credential hashing, session expiry and account protections;
- server-side organization isolation on every protected read/write;
- permission checks independent of UI visibility;
- schema validation, safe error responses, rate limiting, CSRF/origin strategy where applicable, secure headers and CSP;
- private object storage with signed, time-limited access rather than public document URLs;
- audit logging for sensitive create/update/delete/approve/export/download operations;
- secret management and a checked-in `.env.example` containing names only;
- dependency, secret, container, and static security scanning;
- sensitive-data minimization in logs, prompts, fixtures, exports and error payloads;
- backup, restore, retention and incident-response procedures.

No secret was found in the inspected repository, but there is also no environment configuration system to prove secure runtime handling.

## 14. Performance issues

There is no runtime to benchmark. The main performance risks to address in foundation design are:

- unbounded list endpoints and exports;
- missing pagination, filtering, sorting and database indexes;
- synchronous email, file processing, PDF generation, imports, notifications, analytics and AI work in web requests;
- absent Redis/BullMQ worker strategy and retry/idempotency rules;
- absent connection pooling and transaction boundaries;
- absent query observability and slow-query thresholds;
- absent caching strategy for tenant settings, permissions and dashboard aggregates;
- absent load, concurrency and workflow performance baselines.

## 15. Missing infrastructure

- Node/TypeScript application scaffold and package manager lockfile
- Next.js application, route handlers, UI system and shared component conventions
- PostgreSQL environment, Prisma schema/client and migration workflow
- Redis and BullMQ configuration
- Authentication/session provider
- Organization, membership, role and permission foundation
- API versioning, validation and error contract
- Structured application and audit logging
- S3-compatible private storage and upload/download pipeline
- Notification templates, delivery abstraction and worker jobs
- Vitest, API integration testing, Playwright and test data factories
- `.env.example`, local environment documentation and secret handling
- Dockerfile, compose/local dependency setup, GitHub Actions and release pipeline
- Health/readiness endpoints, metrics, tracing and error monitoring
- Backup/restore, retention, disaster recovery and operational runbooks
- Maintained API, database, RBAC, implementation-plan and QA documentation

## 16. Recommended Phase 0

Phase 0 must establish a secure, testable, deployable foundation. It must not implement Phase 1+ HR workflows until the foundation Definition of Done is met.

### 16.1 Project foundation

- **Objective:** Create the Next.js/React/TypeScript modular-monolith skeleton with agreed folders, scripts, UI baseline and strict quality gates.
- **Files/modules affected:** `package.json`, lockfile, `tsconfig.json`, `next.config.*`, `src/app/`, `src/components/`, `src/lib/`, `src/server/`, `src/modules/`, `src/styles/`, lint/format configs.
- **Dependencies:** Node LTS, chosen package manager, Next.js, TypeScript, Tailwind, shadcn/Radix/Lucide, TanStack Query, Zustand, React Hook Form, Zod.
- **API impact:** Establish `/api/v1` route convention and health endpoints only; no business endpoint yet.
- **Database impact:** None beyond placeholder connection contract; no production migration until the reviewed foundation schema is ready.
- **Security impact:** Strict TypeScript, secure defaults, dependency audit, no client-side database access.
- **Tests required:** Build, typecheck, lint, smoke render, API health smoke test.
- **Definition of Done:** Clean install is reproducible; app starts/builds; documented folder boundaries and scripts pass in CI.

### 16.2 Environment configuration

- **Objective:** Define typed, environment-specific configuration without committing secrets.
- **Files/modules affected:** `.env.example`, `src/config/`, environment validation, local/staging/production docs, secret-scanning configuration.
- **Dependencies:** Zod or equivalent config validator; deployment secret store decision.
- **API impact:** Invalid configuration prevents startup; health output must not expose secrets.
- **Database impact:** Connection URLs and pool settings become validated configuration.
- **Security impact:** Fail closed on missing production secrets; redact credentials and tokens.
- **Tests required:** Config validation for valid/invalid environments and secret redaction checks.
- **Definition of Done:** Every required variable is documented by name/type/purpose; no secret values are committed; startup failure is clear and safe.

### 16.3 Authentication foundation

- **Objective:** Implement secure identity, sessions, sign-in/out, expiry, reset-ready flows and MFA-ready extension points.
- **Files/modules affected:** `src/modules/iam/`, auth provider configuration, session middleware, auth route handlers, user schemas.
- **Dependencies:** Better Auth or Auth.js decision; PostgreSQL foundation; email adapter contract.
- **API impact:** Versioned auth endpoints and `401` response contract.
- **Database impact:** User, credential/session, verification and recovery records with indexes and lifecycle fields.
- **Security impact:** Secure cookies/tokens, password hashing, brute-force protection, session revocation, no password logging.
- **Tests required:** Sign-in/out, invalid credentials, expiry, reset token handling, session revocation and unauthorized API tests.
- **Definition of Done:** Protected route and session tests pass; credentials are never returned or logged; provider choice is documented.

### 16.4 Organization/tenant foundation

- **Objective:** Establish organization context and enforce tenant ownership server-side.
- **Files/modules affected:** `src/modules/organizations/`, tenant context middleware, request context, organization service/repository.
- **Dependencies:** Auth identity; Prisma/PostgreSQL; authorization contract.
- **API impact:** Every protected API receives a resolved organization context; cross-tenant access returns a consistent denial.
- **Database impact:** Organization, membership and organization-settings models; foreign keys and indexes.
- **Security impact:** Mandatory server-side scoping; no tenant selection trusted from a raw client field.
- **Tests required:** Same-user multi-tenant isolation, missing-context rejection, membership checks and cross-tenant mutation tests.
- **Definition of Done:** A protected test resource cannot be read or changed across organizations, including through IDs, filters and exports.

### 16.5 RBAC foundation

- **Objective:** Implement roles, permissions, inheritance/custom-role capability and reusable authorization checks.
- **Files/modules affected:** `src/modules/iam/permissions/`, role/permission policy code, authorization middleware, `docs/RBAC.md`.
- **Dependencies:** Auth and organization membership models.
- **API impact:** Protected routes declare permissions and return consistent `403` responses.
- **Database impact:** Role, permission, role-permission and membership-role relations, scoped where required.
- **Security impact:** Deny by default; authorization is enforced at service/API boundaries, not only in UI.
- **Tests required:** Role matrix tests for defined SRS roles, inheritance/custom-role tests, tenant-scoped permission tests.
- **Definition of Done:** Each future endpoint has a permission declaration; allow/deny matrix is reviewed and automated.

### 16.6 Database foundation

- **Objective:** Establish PostgreSQL/Prisma conventions, reviewed migrations, transactions, timestamps, IDs, soft-delete/versioning policy and seed separation.
- **Files/modules affected:** `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.*`, `src/lib/db/`, `docs/DATABASE.md`.
- **Dependencies:** Database provider and environment contract; organization/auth/RBAC model decisions.
- **API impact:** Repositories expose tenant-scoped access only; no direct Prisma access from UI or route handlers.
- **Database impact:** Initial identity/organization/audit foundation migration with constraints, indexes and rollback strategy.
- **Security impact:** Least-privilege database credentials, TLS, no production SQLite, sensitive-field handling.
- **Tests required:** Migration apply/reset, repository tenant isolation, transaction rollback and constraint tests.
- **Definition of Done:** Fresh database setup is repeatable; migrations are reviewed; repository boundaries and data conventions are documented.

### 16.7 API conventions

- **Objective:** Standardize versioning, request context, pagination, filtering, correlation IDs and response/error envelopes.
- **Files/modules affected:** `src/server/http/`, route-handler helpers, schemas, `docs/API_SPEC.md`.
- **Dependencies:** Project, auth, tenant and RBAC foundations.
- **API impact:** Defines the contract for every future endpoint.
- **Database impact:** Pagination/index requirements are captured for repositories.
- **Security impact:** Authentication, authorization, tenant scope and validation become mandatory route concerns.
- **Tests required:** Success/error envelope, validation, auth, authorization, pagination and correlation-ID tests.
- **Definition of Done:** A sample protected foundation endpoint demonstrates the full request flow and is documented.

### 16.8 Validation

- **Objective:** Create shared Zod schemas and safe parsing conventions for params, query, body, files and environment values.
- **Files/modules affected:** `src/lib/validation/`, module schemas, request helpers.
- **Dependencies:** API conventions and selected file-upload approach.
- **API impact:** Invalid input consistently returns field-level `400`/`422` errors without stack traces.
- **Database impact:** Validation must align with database constraints; no implicit coercion that bypasses business rules.
- **Security impact:** Limits injection, oversized payloads, unsafe file metadata and malformed identifiers.
- **Tests required:** Boundary, unknown-field, length, type, file-size/type and localization-safe error tests.
- **Definition of Done:** Every foundation endpoint validates all external input and has negative tests.

### 16.9 Error handling

- **Objective:** Define typed domain errors, safe HTTP mapping, correlation IDs and user-safe versus operator-safe messages.
- **Files/modules affected:** `src/lib/errors/`, middleware, logging adapters, API helpers.
- **Dependencies:** API conventions and observability.
- **API impact:** Stable status/code/message/details envelope; no accidental internal error leakage.
- **Database impact:** Transaction and constraint errors map predictably.
- **Security impact:** Prevents data leakage through stack traces, SQL messages and authorization distinctions.
- **Tests required:** Domain-to-HTTP mapping, malformed request, forbidden/not-found behavior and unexpected-error tests.
- **Definition of Done:** All route handlers use the common error path and production responses are sanitized.

### 16.10 Logging

- **Objective:** Establish structured, correlated application logs with privacy-aware redaction and useful severity levels.
- **Files/modules affected:** `src/lib/logging/`, request middleware, worker logging adapter, operational docs.
- **Dependencies:** Environment configuration and error handling.
- **API impact:** Correlation/request IDs appear in responses or support headers where appropriate.
- **Database impact:** None for application logs; audit logs remain separate durable records.
- **Security impact:** PII, credentials, tokens, resumes and payroll data are redacted/minimized.
- **Tests required:** Redaction, correlation propagation and error serialization tests.
- **Definition of Done:** Logs are structured, searchable, redacted and documented for local/staging/production.

### 16.11 Audit logging

- **Objective:** Record sensitive business actions with actor, organization, target, timestamp, request context and outcome.
- **Files/modules affected:** `src/modules/audit/`, audit repository/service, authorization and mutation helpers, `docs/DATABASE.md`.
- **Dependencies:** Auth, organization, RBAC, database and logging foundations.
- **API impact:** Sensitive endpoints emit audit events; audit querying is permission-protected.
- **Database impact:** Append-oriented audit event model, indexes, retention metadata and tamper-evidence strategy.
- **Security impact:** Supports accountability and compliance without storing unnecessary sensitive payloads.
- **Tests required:** Create/update/delete/approve/export/download event tests, actor/tenant attribution, denied-action behavior and retention tests.
- **Definition of Done:** A protected sample mutation creates a complete, tenant-scoped audit record and cannot silently bypass the audit service.

### 16.12 Testing foundation

- **Objective:** Establish unit, API/integration and browser workflow testing with isolated data and no production business fixtures.
- **Files/modules affected:** Vitest/Playwright configs, `tests/`, factories/fixtures, test database setup, coverage config.
- **Dependencies:** Project, database, auth, tenant, RBAC and API foundations.
- **API impact:** Tests become acceptance gates for all future endpoints.
- **Database impact:** Isolated test database/schema and deterministic migrations/cleanup.
- **Security impact:** Auth, tenant isolation and authorization regressions become blocking failures.
- **Tests required:** Foundation unit/API/E2E smoke suite plus accessibility and responsive smoke checks.
- **Definition of Done:** CI can run tests from a clean checkout; test data is generated through factories and critical security tests pass.

### 16.13 CI/CD

- **Objective:** Make quality checks and deployable artifacts repeatable from Git.
- **Files/modules affected:** `.github/workflows/`, Dockerfile, optional compose/local services, package scripts, release documentation.
- **Dependencies:** Project foundation, environment contract, test suite and deployment target decisions.
- **API impact:** CI validates API contracts and health endpoints before deployment.
- **Database impact:** Migration check/deploy step is explicit, reviewed and never destructive by default.
- **Security impact:** Secret scanning, dependency audit, least-privilege CI tokens and protected environments.
- **Tests required:** Clean install, lint, typecheck, unit/API/E2E smoke, build and container startup checks.
- **Definition of Done:** A pull request runs all required gates and a controlled staging deployment can be repeated.

### 16.14 Security baseline

- **Objective:** Establish secure headers, rate limiting, dependency/secret scanning, input/file limits, privacy rules and threat-model checkpoints.
- **Files/modules affected:** middleware, security config, upload policy, CI scanning, security documentation.
- **Dependencies:** Auth, API, environment, storage and logging foundations.
- **API impact:** Rate-limit and security headers apply consistently; sensitive endpoints have stricter policy.
- **Database impact:** Least-privilege roles, encryption/TLS configuration and sensitive-field conventions.
- **Security impact:** This is the baseline for protecting candidate and employee data.
- **Tests required:** Header, rate-limit, authorization bypass, upload abuse, secret scan and dependency vulnerability checks.
- **Definition of Done:** Baseline threat model is reviewed; high/critical findings are absent or explicitly accepted; security tests pass.

### 16.15 Observability

- **Objective:** Add health/readiness, error tracking, traces/metrics and operational alerts.
- **Files/modules affected:** health routes, telemetry bootstrap, Sentry/OpenTelemetry adapters, dashboards/runbooks.
- **Dependencies:** Logging, environment, CI/CD and database/Redis/storage connectivity contracts.
- **API impact:** Liveness/readiness endpoints have safe public/private boundaries and stable output.
- **Database impact:** Dependency checks cover database, Redis, queue and storage without leaking credentials.
- **Security impact:** Telemetry scrubs sensitive payloads and restricts operational endpoints.
- **Tests required:** Health state tests, telemetry initialization, trace correlation and redaction tests.
- **Definition of Done:** Operators can distinguish live, ready and degraded states; errors and latency are observable in staging.

### 16.16 File storage foundation

- **Objective:** Provide private, validated, metadata-backed uploads and authorized signed downloads.
- **Files/modules affected:** `src/modules/files/`, storage adapter, upload/download routes, document metadata model and policy docs.
- **Dependencies:** Database, auth/RBAC, tenant context, environment configuration and chosen S3-compatible provider.
- **API impact:** Upload/download contract enforces tenant, owner/record authorization, size/type limits and audit events.
- **Database impact:** File/document metadata, ownership, organization, version and retention fields; no binary blobs in transactional tables unless justified.
- **Security impact:** Private buckets, signed URLs, malware/content validation strategy, safe filenames and no public sensitive documents.
- **Tests required:** Authorization, cross-tenant access, expiry, size/type limits, versioning and download audit tests.
- **Definition of Done:** An authorized test upload can be stored and downloaded through a time-limited URL; unauthorized access is denied and audited.

### 16.17 Notification foundation

- **Objective:** Establish durable in-app notifications and provider-neutral email templates/delivery status.
- **Files/modules affected:** `src/modules/notifications/`, templates, provider adapter, notification model, user preference model.
- **Dependencies:** Auth, organization, database, email provider decision and job foundation.
- **API impact:** Authenticated notification list/read endpoints with pagination and permission rules.
- **Database impact:** Notification, delivery-attempt, template and preference models with idempotency keys.
- **Security impact:** Tenant-scoped recipients, safe template variables, unsubscribe/preference controls and no sensitive content leakage.
- **Tests required:** In-app creation/read state, template rendering, provider failure/retry, idempotency and tenant isolation.
- **Definition of Done:** A foundation event creates one durable notification and provider delivery is asynchronous, retryable and observable.

### 16.18 Background-job foundation

- **Objective:** Establish Redis/BullMQ workers for retryable work with idempotency, backoff, dead-letter handling and audit/status tracking.
- **Files/modules affected:** `src/lib/queue/`, worker entrypoint, job modules, local services, deployment/worker configuration.
- **Dependencies:** Redis, environment configuration, logging, observability, notifications and storage contracts.
- **API impact:** Long-running operations return accepted/status semantics where needed rather than blocking requests.
- **Database impact:** Job status/idempotency records where durable business state requires them.
- **Security impact:** Authenticated enqueue boundaries, tenant context propagation, payload minimization and secret-safe logs.
- **Tests required:** Enqueue/process, retry/backoff, duplicate delivery, failure/dead-letter, shutdown and tenant-context propagation.
- **Definition of Done:** A representative notification or file-processing job runs locally and in staging with retries, metrics and safe failure behavior.

## 17. Risks

- Building feature modules before tenant isolation and authorization creates expensive and dangerous rework.
- The SRS contains a broad product scope; payroll, compliance, AI and external integrations need explicit legal, privacy and provider decisions.
- The choice between Better Auth and Auth.js, storage provider, email provider, calendar depth, search strategy and tenancy strategy remains open in the SRS.
- HR data is highly sensitive; insecure demo shortcuts can become production assumptions.
- Lack of a committed baseline makes ownership, review history and change provenance unclear.
- The intended architecture may need adjustment after validating the actual deployment target, team skills and operational constraints; changes must be documented and justified against the frozen SRS.

## 18. Blockers

1. No application source exists to extend or validate.
2. No package/dependency/runtime choice has been instantiated.
3. No database, migrations or local service dependencies exist.
4. No authentication, tenant, RBAC or API security boundary exists.
5. No test or CI gate exists.
6. No deployment target, secret store, storage provider, email provider or observability account is configured.
7. Empty API/database/RBAC/phase/QA documents leave operational contracts undocumented, although the SRS and architecture target provide a starting point.

## 19. Files that should be changed in Phase 0

The exact paths should be finalized during the project scaffold, but Phase 0 should be limited to the following categories:

- `package.json` and lockfile
- `tsconfig.json`, Next.js/UI/lint/format/test configuration
- `src/app/`, `src/components/`, `src/lib/`, `src/server/`, `src/modules/`
- `prisma/schema.prisma`, reviewed `prisma/migrations/`, and isolated test seed/factory files
- `.env.example` and environment/configuration documentation
- `.github/workflows/*`, Dockerfile and local dependency orchestration
- `tests/*` and test configuration
- `docs/API_SPEC.md`, `docs/DATABASE.md`, `docs/RBAC.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/PHASE_STATUS.md`, and `docs/QA_CHECKLIST.md` as implementation contracts/status records
- New Phase 0 operational/security documentation as needed

`docs/SRS.md` must remain unchanged.

## 20. Files that must NOT be changed

- `docs/SRS.md` — frozen functional source of truth.
- `docs/HR_Portal_SRS_v1.1_Vibe_Coding.docx` — original source document.
- Existing SRS extraction evidence (`docs/extracted_srs_full.txt`, `docs/extraction_report.txt`) unless a separate, explicitly authorized document-fidelity task is requested.
- Application code outside the authorized Phase 0 scope.
- Any generated or temporary audit artifact unless it is explicitly part of the documentation/tooling cleanup task.

## Recommended first implementation task

Create and commit the Phase 0 project foundation: initialize the Next.js/TypeScript modular-monolith skeleton, add reproducible package scripts and lockfile, add strict environment validation, and establish the initial CI quality gate (install, lint, typecheck, test placeholder and production build). Do not add business workflows or migrations until this baseline is reviewed and the authentication/organization/RBAC/database design is approved.
