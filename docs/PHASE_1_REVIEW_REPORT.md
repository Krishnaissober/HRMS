# Phase 1 Final Review Report — Recruitment Intake & Candidate Forms

Review date: 2026-08-17  
Reviewed authority: `docs/SRS.md` (frozen)  
Compared with: `docs/PHASE_1_COMPLETION_REPORT.md`  
Review scope: read-only review; no application fixes were made.

## Final decision

**PHASE 1 NOT READY FOR PHASE 2**

The code compiles and the implementation has a coherent Phase 1 modular boundary, but the SRS-critical workflow is not actually complete. Several requirements are either missing, only represented by a foundation stub, or not verifiable because PostgreSQL and private storage are unavailable. There are also implementation defects that would affect production behavior even after the environment is configured.

## Review method

The review covered:

- the frozen SRS candidate-intake, recruitment, data-quality and API requirements;
- the Phase 1 completion report;
- Prisma schema and migration;
- candidate schemas, repository, service, routes and UI;
- RBAC, tenant context, storage, audit and error helpers;
- unit/API/browser tests;
- hardcoded/mock/dead-code searches;
- the existing validation/build/test evidence.

## Requirements reviewed

The review mapped implementation against:

- online hiring fields, consent, document upload, public access and anti-abuse;
- walk-in identity/contact/role/experience/source/resume/visit details;
- candidate creation or matching and unique references;
- candidate profiles, documents, skills, activity history and status;
- supported pipeline statuses and hold/rejection reasons;
- candidate search/filtering and pagination;
- printable/downloadable sensitive forms and audit events;
- organization scoping, RBAC, validation, consistent errors and audit logging;
- responsive/accessibility expectations and test coverage;
- explicit Phase 1 exclusions and absence of Phase 2 functionality.

## PASS items

These items are present in code and are not the primary reason for the readiness decision:

| Area                       | Review result                                                                                                                                                                                             |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Modular boundary           | Candidate code is separated into constants, schemas, repository and service layers.                                                                                                                       |
| Versioned APIs             | Candidate APIs are under `/api/v1/`; response/error envelopes reuse Phase 0 helpers.                                                                                                                      |
| Candidate schema scope     | Candidate fields are explicit and broadly traceable to the SRS; no arbitrary production candidate fields were found.                                                                                      |
| Organization query scoping | Protected list, profile, status and document paths resolve membership and query with `organizationId`.                                                                                                    |
| RBAC enforcement           | Protected candidate routes call reusable permission checks; no parallel candidate authorization system was introduced.                                                                                    |
| Validation foundation      | Zod validates candidate input, status updates, filters and document metadata.                                                                                                                             |
| Status vocabulary          | The implemented status values match the SRS pipeline vocabulary.                                                                                                                                          |
| Candidate timeline storage | `CandidateActivity` stores actions, transitions, notes, timestamps and actor IDs.                                                                                                                         |
| Candidate collision intent | Online and walk-in submissions share one intake service and attempt organization-scoped email/phone matching.                                                                                             |
| Audit integration points   | Intake, status changes and document downloads call the Phase 0 audit service.                                                                                                                             |
| Search/pagination shape    | Query supports text, status, source, date, page, page size and direction, with tenant-scoped repository queries.                                                                                          |
| Responsive baseline        | CSS includes mobile breakpoints and the forms use responsive grids.                                                                                                                                       |
| Hardcoded/mock data        | No hardcoded candidate records, fake production responses or seeded candidate data were found.                                                                                                            |
| Phase 2 containment        | No offer, employee, onboarding, leave, payroll, performance, asset, helpdesk or offboarding source files were found. The `INTERVIEW` status is an SRS-supported candidate stage, not an interview module. |

## Issues found

### HIGH — SRS job/application linkage is absent

The SRS requires a job-linked public application and says a submission must create or match a candidate and create an application against the selected job/requisition. There is no job context in the public form beyond `organizationSlug`, and no `Job`, `JobPosting`, `Application` or application reference model/API exists.

Evidence: `src/modules/candidates/schemas.ts`, `prisma/schema.prisma`, `src/app/apply/[organizationSlug]/page.tsx`.

Impact: the public workflow cannot satisfy the SRS candidate-to-job relationship or preserve the application lifecycle needed by later ATS phases.

Classification: **HIGH — missing requirement / phase dependency**. The user’s Phase 1 scope excluded job/requisition implementation, so this is a scope conflict that must be resolved explicitly before Phase 2 rather than silently treated as complete.

### HIGH — PDF download requirement is not implemented

The SRS requires authorized PDF copies of online and walk-in submissions containing metadata, submission time and a unique reference number, with sensitive downloads audited. The implementation returns print-friendly HTML from `/api/v1/candidates/{id}/print`; it does not generate a PDF, does not render the submitted form snapshot, and does not audit print/download access.

Evidence: `src/app/api/v1/candidates/[id]/print/route.ts` returns `text/html` and `content-disposition: inline`.

Impact: the documented printable route is not equivalent to the required downloadable PDF workflow.

Classification: **HIGH — SRS requirement missing**.

### HIGH — Walk-in visit data and candidate visit/check-in are incomplete

The schema accepts `visitDate` and `visitPurpose`, but the walk-in UI only renders `visitPurpose`. The repository does not map visit fields into dedicated persisted records; they are only included in the generic submission JSON snapshot. There is no candidate visit/check-in/check-out model or API.

The Phase 1 instructions explicitly excluded candidate attendance, so check-in/out should not be invented in this review. However, the current completion report should not describe the walk-in form as fully complete against the frozen SRS while those requirements remain outside the implemented boundary.

Evidence: `src/modules/candidates/schemas.ts`, `src/components/candidates/CandidateForm.tsx`, `prisma/schema.prisma`.

Classification: **HIGH — incomplete SRS behavior / explicit later-scope dependency**.

### HIGH — Hold/rejection reasons are not required

The SRS requires every hold/rejection to capture a reason and optionally notes. `statusUpdateSchema` makes both fields optional for every status, and `changeCandidateStatus` does not enforce a reason for `HOLD` or `REJECTED`.

Evidence: `src/modules/candidates/schemas.ts`, `src/modules/candidates/service.ts`.

Impact: status history can contain a hold/rejection without the required business explanation.

Classification: **HIGH — incorrect business validation**.

### HIGH — Print and document links cannot supply tenant context

Protected APIs require `x-organization-id`. The profile page’s document and printable links are ordinary browser anchors and do not send that header. The print link also omits the organization query parameter used by the profile fetch.

Evidence: `src/app/hr/candidates/[id]/page.tsx`, `src/lib/tenant.ts`, protected print/download routes.

Impact: a correctly authenticated HR user can load the profile through the fetch path but cannot use the UI’s print or document links successfully because the required tenant context is absent.

Classification: **HIGH — broken Phase 1 UI workflow**.

### HIGH — Public anti-abuse and upload controls are not production-safe

The public submission limiter is process-local and keys directly on the client-controlled `x-forwarded-for` value. A caller can spoof unique values to bypass it, and the public upload-url route has no equivalent rate limit. Document metadata and content type/size are supplied by the client; there is no server-side object inspection, malware scan, upload-token binding or completion verification before a document key can be attached to a candidate.

Evidence: `src/app/api/v1/public/candidates/route.ts`, `src/app/api/v1/public/candidates/upload-url/route.ts`, `src/modules/candidates/schemas.ts`.

Impact: public intake can be abused for upload/resource exhaustion, and an object key from the same organization could be reused if it becomes known.

Classification: **HIGH — security/control gap**.

### HIGH — Audit persistence is not atomic with business mutations

Candidate creation and status mutation commit through one Prisma transaction, then call `recordAuditEvent` in a separate database operation. If audit persistence fails after the candidate/status transaction succeeds, the endpoint returns an error while the business change remains without its required audit event.

Evidence: `src/modules/candidates/service.ts`, `src/lib/audit.ts`.

Impact: sensitive lifecycle changes can become non-auditable and callers may retry, creating confusing outcomes.

Classification: **HIGH — audit integrity defect**.

### MEDIUM — Activity history does not expose actor/detail in the profile

The SRS requires the candidate timeline to show actor, timestamp and relevant detail. The repository includes activities but not the related actor record, and the profile UI renders action/status/time only. Actor identity is not displayed.

Evidence: `src/modules/candidates/repository.ts` includes `activities` without `actor`; `src/app/hr/candidates/[id]/page.tsx` does not render actor/detail fields.

Classification: **MEDIUM — incomplete profile requirement**.

### MEDIUM — Duplicate matching is hardcoded, duplicated and race-prone

The SRS calls for configurable likely-duplicate rules and says email/phone uniqueness must be configurable by organization/use case. The implementation always matches exact organization-scoped email or phone, duplicates the query in `findPossibleDuplicate` and `createCandidateIntake`, leaves `findPossibleDuplicate` unused, and has no organization configuration or concurrency protection.

Evidence: `src/modules/candidates/repository.ts`, `prisma/schema.prisma`.

Classification: **MEDIUM — technical debt and data-integrity risk**.

### MEDIUM — Candidate profile is narrower than the SRS profile

The SRS candidate database includes applications, documents, skills, notes, tags and activity history. Documents, skills and activity history exist, but applications, notes and tags do not. Applications also depend on the missing job/application foundation described above.

Classification: **MEDIUM — incomplete SRS profile capability / phase dependency**.

### MEDIUM — Search/filter coverage is partial

The API supports name fragments, email, phone, skills, source, status, date and pagination. It cannot filter by job, interviewer or rating because those later-domain entities are not implemented. That is understandable within the stated Phase 1 boundary, but the completion report should label this as partial SRS coverage rather than complete search/filter support.

Classification: **MEDIUM — partial requirement coverage**.

### MEDIUM — Status control is API-only and the UI has no HR status workflow

The status API and service exist, but the candidate profile UI has no status selector, reason/notes form, transition feedback or status mutation action. The visible HR workflow is therefore read-only.

Classification: **MEDIUM — incomplete UX/workflow implementation**.

### MEDIUM — Live workflow tests are not present

The 12 automated tests cover validation, status transition logic, an invalid public API request, unit tenant policy and unit RBAC. The 3 Playwright tests render the public form, render the HR list shell and check health. They do not submit a valid candidate to PostgreSQL, retrieve a persisted profile, perform a real status change, download a document, or verify cross-tenant data through a live database.

The completion report does disclose the environment limitation, but its “Playwright workflow” label overstates what the browser tests prove.

Classification: **MEDIUM — verification gap, currently environment-blocked for live flows**.

### MEDIUM — Authenticated HR pages are not themselves protected

The candidate APIs are protected, but `/hr/candidates`, `/hr/candidates/new` and `/hr/candidates/[id]` render their shells without a server-side session/page guard. The walk-in page is visible to unauthenticated users, even though its mutation API rejects unauthenticated requests.

Classification: **MEDIUM — defense-in-depth and UX access-control gap**.

### LOW — UI loading and upload feedback is incomplete

The candidate list has no loading state while searching, file uploads have no per-file progress or removal control, and the profile has no retry action. Error text is presented through a single status message rather than field-associated error messages.

Classification: **LOW — UX/accessibility debt**, rising to MEDIUM if the workflow is used on slow networks.

### LOW — Build warning and generated-file hygiene

The build succeeds but emits a non-fatal optional BullMQ warning for `@valkey/valkey-glide`. Next.js also reintroduces incremental TypeScript configuration/generated state during builds. Neither currently fails the build, but both should be cleaned up before production hardening.

Classification: **LOW — technical debt**.

## Security review

### Positive findings

- Protected API paths perform authentication, membership and permission checks.
- Candidate repository queries include organization scope.
- Document object keys are prefixed by organization before persistence.
- Private download URLs are generated through the storage abstraction.
- Public intake does not return internal HR records.
- API validation and consistent error envelopes are present.

### Security concerns

- Client-controlled forwarded IP for public throttling.
- No public upload-url throttling.
- Client-supplied file metadata without content verification.
- Separate audit transaction from sensitive mutation transaction.
- Browser print/download links cannot carry tenant context correctly.
- HR page shells are accessible without a server-side auth guard.

## Hardcoded/mock/dead-code review

- No hardcoded candidate records or fake candidate API responses were found.
- The UI uses a development-oriented organization ID text field and URL query parameter as tenant context; the server still validates membership, but this is not a finished organization-context UX.
- `findPossibleDuplicate` is unused while equivalent duplicate logic is embedded in `createCandidateIntake`; this is duplicated/dead repository logic.
- `candidates.update` is declared but not used by any Phase 1 route.
- No unexpected Phase 2 business models or routes were found.

## Environment blockers

These are separate from code defects:

1. PostgreSQL port 5432 is reachable, but the repository has no configured `.env.local`; the documented sample credentials fail authentication. Prisma migration apply/status and database-backed workflow tests remain unverified.
2. Redis is not available locally. This affects Phase 0 readiness/queue verification but not the direct candidate CRUD path.
3. S3-compatible storage is not configured. Resume/supporting-document upload and download cannot be end-to-end verified.
4. Docker Desktop’s Linux engine is unavailable, so container verification remains pending.

## Recommended fixes before Phase 2

Do not begin Phase 2 until the following are addressed or explicitly re-scoped in an approved phase decision:

1. Resolve the job-linked application dependency or document an authoritative phase boundary for it.
2. Implement compliant PDF generation/download and audit the sensitive download event.
3. Enforce hold/rejection reasons and preserve/display actor-rich activity history.
4. Fix tenant context propagation for browser print/document links and add a real protected-page boundary.
5. Replace spoofable process-local public throttling and bind uploaded objects to an intake transaction; add server-side file verification.
6. Make business mutation plus audit event atomic or provide a durable outbox/invariant that cannot lose audit records.
7. Decide how walk-in visit/check-in/out is phased, since the frozen SRS requires it but the Phase 1 instructions excluded candidate attendance.
8. Add live PostgreSQL/S3-backed API and Playwright workflow tests after local services are configured.
9. Remove duplicate/dead duplicate-matching logic and define configurable organization matching rules.

## Readiness decision

**PHASE 1 NOT READY FOR PHASE 2**

The phase is not ready because there are multiple HIGH implementation/SRS gaps in addition to the unresolved environment blockers. No Phase 2 work was started, and `docs/SRS.md` was not modified.
