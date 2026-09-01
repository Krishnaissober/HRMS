# Phase 1 Candidate Intake APIs

All protected endpoints use the Phase 0 response envelope:

```json
{ "success": true, "data": {}, "requestId": "uuid" }
```

Errors use:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} },
  "requestId": "uuid"
}
```

## Public APIs

### `POST /api/v1/public/candidates`

Creates or matches an organization-scoped candidate from an online submission. Requires `organizationSlug`, supported candidate fields, declaration/consent, and optional uploaded document metadata. No authentication is required. The endpoint is rate limited and never returns internal organization data.

### `POST /api/v1/public/candidates/upload-url`

Generates a short-lived private-storage upload URL for a validated resume/supporting document. Requires `organizationSlug`, document kind, filename, supported content type and size.

## Protected APIs

Protected routes require a Better Auth session and `x-organization-id`. Membership and permission checks happen server-side.

### `GET /api/v1/candidates`

Lists tenant-scoped candidates with `q`, `status`, `source`, `from`, `to`, `page`, `pageSize`, and `direction` filters. Requires `candidates.read`.

### `POST /api/v1/candidates`

Creates a walk-in candidate using the same candidate service as online intake. Requires `candidates.create`.

### `POST /api/v1/candidates/upload-url`

Generates a short-lived private-storage upload URL for an authenticated HR intake. Requires `candidates.documents.write`.

### `GET /api/v1/candidates/{id}`

Returns a tenant-scoped candidate profile with documents and activity history. Requires `candidates.read`.

### `PATCH /api/v1/candidates/{id}/status`

Validates an SRS-supported status transition, persists the status history, and writes an audit event. Requires `candidates.status.update`.

### `GET /api/v1/candidates/{id}/documents/{documentId}/download`

Returns a redirect to a short-lived private-storage URL after tenant, candidate, document and permission checks. The download is audited. Requires `candidates.documents.read`.

### `GET /api/v1/candidates/{id}/print`

Returns a tenant-scoped print-friendly HTML representation of the candidate profile. Requires `candidates.read`.

## Phase 2 Interview APIs

All interview endpoints require Better Auth, `x-organization-id`, organization membership and the permission listed below.

### `GET|POST /api/v1/interviews`

Lists interviews with `q`, `status`, date range and pagination, or creates a scheduled interview linked to an existing candidate/application with a panel. Requires `interviews.read` for GET and `interviews.create` for POST.

### `GET|PATCH /api/v1/interviews/{id}`

Returns or updates a tenant-scoped interview, schedule, status or panel. Requires `interviews.read` or `interviews.update`.

### `POST /api/v1/interviews/{id}/check-in` and `/check-out`

Records candidate interview attendance through validated status transitions. Requires `interviews.attendance`.

### `POST /api/v1/interviews/{id}/evaluations`

Submits one structured evaluation per assigned interviewer. Requires `interviews.evaluate`.

### `GET /api/v1/interviews/{id}/history`

Returns tenant-scoped interview activity with permitted actor details. Requires `interviews.read`.

### `GET|POST /api/v1/interview-templates`

Lists or creates reusable structured interview evaluation templates. Requires `interviews.read` or `interviews.create`.

### `GET|POST /api/v1/interview-availability`

Lists or creates tenant-scoped interviewer availability windows. Requires `interviews.read` or `interviews.schedule`.

## Phase 4 Hiring and Offer APIs

All Phase 4 protected endpoints require Better Auth, `x-organization-id`, active membership and the permission listed below.

### `GET|POST /api/v1/hiring-decisions`

Lists or records application-scoped Hire, Hold or Reject decisions. Hold and Reject require a reason. Requires `hiring-decisions.read` or `hiring-decisions.write`.

### `GET|POST /api/v1/offer-templates`

Lists or creates organization-scoped offer templates and their configured approval steps. Requires `offers.read` or `offers.create`.

### `GET|POST /api/v1/offers`

Lists or creates offers linked to a Hire decision, application and offer template. Offers requiring approval begin in `PENDING_APPROVAL`; otherwise they begin in `APPROVED`. Requires `offers.read` or `offers.create`.

### `GET /api/v1/offers/{id}`

Returns a tenant-scoped offer and approval history. Requires `offers.read`.

### `POST /api/v1/offers/{id}/approve` and `/send`

Completes the next configured approval step or sends an approved offer through the configured notification adapter. Requires `offers.approve` or `offers.send`.

### `GET /api/v1/offers/{id}/download`

Generates a private, authenticated PDF offer and records the download audit event. Requires `offers.read`.

### `POST /api/v1/public/offers/respond`

Accepts or declines an offer using a one-time hashed response token. No organization identifier is accepted from the client; tenant ownership is derived from the token record.

## Phase 5 Employee and Onboarding APIs

All protected Phase 5 endpoints require Better Auth, an active organization membership, `x-organization-id`, and the listed permission.

- `POST /api/v1/candidates/{id}/convert-to-employee` — convert an accepted-offer candidate transactionally; requires `employees.create`.
- `GET /api/v1/employees` and `GET|PATCH /api/v1/employees/{id}` — tenant-scoped directory/profile operations; requires `employees.read` or `employees.update`.
- `PATCH /api/v1/employees/{id}/status` and `GET /api/v1/employees/{id}/history` — validated lifecycle status and history; requires `employees.status.update` or `employees.history.read`.
- `GET|POST /api/v1/onboarding-templates` — reusable task-definition templates; requires `onboarding.read` or `onboarding.manage`.
- `GET|POST /api/v1/onboarding` and `GET /api/v1/onboarding/{id}` — onboarding instances and persisted progress; requires `onboarding.read` or `onboarding.manage`.
- `POST /api/v1/onboarding/{id}/tasks/{taskId}/complete` — completes a persisted task and updates instance progress; requires `onboarding.tasks.complete`.
- `POST /api/v1/employees/{id}/documents`, `PATCH /api/v1/employees/{id}/documents/{documentId}/status`, and download — validated storage-backed document metadata, verification and access; requires the corresponding document permission.
- `POST /api/v1/employees/{id}/assets` — onboarding asset assignment foundation; requires `employees.assets.manage`.
- `POST /api/v1/employees/{id}/access` — system-access provisioning request/state foundation; requires `employees.access.manage`.
- `POST /api/v1/employees/{id}/mentor` — same-organization mentor assignment; requires `employees.mentor.manage`.

### Phase 5 remediation self-service and document requests

- `GET/PATCH /api/v1/me/employee` — authenticated employee permitted-profile read/update.
- `GET /api/v1/me/employee/documents` — authenticated employee's organization-scoped document requests.
- `POST /api/v1/me/employee/documents/{documentId}/upload-url` — upload URL for an owned request.
- `POST /api/v1/me/employee/documents/{documentId}/submit` — submit an uploaded object for HR review.
- `POST /api/v1/employees/{id}/documents/requests` — HR creates an organization-scoped document request.

## Phase 6 Employee Attendance APIs

- `GET /api/v1/me/attendance` — authenticated employee's own attendance history.
- `POST /api/v1/attendance/employee/check-in` and `/check-out` — authenticated employee attendance events; employee identity is derived from the session.
- `GET /api/v1/attendance/employee` and `/report` — authorized HR attendance records and persisted summaries.
- `POST /api/v1/attendance/employee/corrections` — employee correction request; `PATCH /corrections/{id}` reviews it.
- `PATCH /api/v1/attendance/employee/{id}/exception` and `/overtime` — authorized exception and approved-overtime administration.
- `GET|POST /api/v1/shifts`, `PATCH /api/v1/shifts/{id}` — organization shift management.
- `POST /api/v1/rosters/assignments` — effective employee shift/roster assignment.
- `GET|POST /api/v1/holidays` — organization holiday calendar.

### Phase 6 attendance calendar and reporting

- `GET /api/v1/attendance/employee/calendar?view=day|week|month&date=YYYY-MM-DD` returns organization-scoped persisted attendance grouped by calendar date. Optional `employeeId` and `status` filters are supported. Requires `attendance.read`.
- `GET /api/v1/attendance/employee/report` returns paginated attendance records plus totals calculated across the complete filtered date range, independent of the current page.
- Attendance status, correction, overtime, and roster mutations enforce organization ownership and service-level consistency rules before persisting history and audit events.

## Phase 7 Leave Management APIs

All protected endpoints require Better Auth, an active membership for `x-organization-id`, and the applicable Phase 7 permission.

- `GET|POST /api/v1/leave-types` — list or configure organization leave types, eligibility, accrual metadata, carry-forward limits, and approval policy.
- `GET|POST /api/v1/leave-balances` — list or allocate tenant-scoped employee balances.
- `POST /api/v1/leave-balances/carry-forward` — create the next-year balance from eligible remaining leave under the configured cap.
- `GET|POST /api/v1/leave-requests` — authorized request queue or authenticated employee leave submission.
- `PATCH /api/v1/leave-requests/{id}/decision` — manager/HR approval or rejection with mandatory rejection reason and policy-driven approval steps.
- `POST /api/v1/leave-requests/attachment-upload-url` — create a tenant-prefixed storage upload URL after file metadata validation.
- `GET /api/v1/me/leave` — authenticated employee balances, requests, approvals, notifications, and transaction history.
- `GET /api/v1/leave-calendar?view=day|week|month&date=YYYY-MM-DD` — organization-scoped team/company leave calendar.

Final approval updates the leave balance and creates attendance records for chargeable leave dates in the same database transaction. Holidays and configured weekly off-days are excluded.

## Phase 8 Documents and Notifications APIs

All protected endpoints require Better Auth, an active membership for `x-organization-id`, and the applicable Phase 8 permission.

- `GET|POST /api/v1/documents` — list authorized record-scoped documents or register validated metadata after an object-storage upload.
- `POST /api/v1/documents/upload-url` — create a tenant/owner-prefixed upload URL for PDF, JPEG, or PNG content up to 25 MB.
- `POST /api/v1/documents/{id}/versions` — append and atomically activate a stored document version.
- `GET /api/v1/documents/{id}/download` — return a short-lived authorized URL for the current or requested version and audit the download.
- `PATCH /api/v1/documents/{id}` — activate, archive, or soft-delete a document subject to retention policy.
- `GET /api/v1/notifications` and `PATCH /api/v1/notifications/{id}` — list and update only the authenticated user's notifications.
- `GET|POST /api/v1/tasks` and `PATCH /api/v1/tasks/{id}` — list assigned tasks, create authorized workflow tasks, and update an owned task state.
- `POST /api/v1/reminders/generate` — idempotently persist in-app/email notification intent for upcoming interviews, pending leave approvals, probation dates, and expiring documents.

Document, version, task, reminder, notification, and required audit writes use database transactions. Email channels record delivery intent for the configured pluggable provider; they do not assert third-party delivery.
