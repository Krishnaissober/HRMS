# HR Portal Architecture Documentation

## 1. Overview

This document defines the technical architecture for the HR Management System + ATS Platform. The system follows a **modular monolith** architecture approach, avoiding microservices unless explicitly required.

### 1.1 Architecture Philosophy
- **Modular Monolith**: Single deployable unit with clear internal module boundaries
- **No Microservices**: Unless explicitly approved, all functionality resides in one application
- **Domain-Driven Design**: Modules separated by clear domain boundaries (recruitment, employee, attendance, etc.)
- **Testable**: Clear boundaries enable unit and integration testing
- **Maintainable**: Logical separation enables future extraction to microservices if needed

### 1.2 Technology Stack (as per SRS)
| Layer | Technology | Source (SRS) |
|------|-----------|-------------|
| **Frontend** | Next.js, React, TypeScript | SRS §26.3.1, §79-101 |
| **UI System** | Tailwind CSS, shadcn/ui, Radix UI, Lucide icons | SRS §79-105 |
| **State Management** | TanStack Query, Zustand | SRS §81-109 |
| **Forms & Validation** | React Hook Form + Zod | SRS §82-113 |
| **Backend/API** | Next.js Route Handlers + domain service layer | SRS §83-117 |
| **Database** | PostgreSQL | SRS §84, §119-121 |
| **ORM** | Prisma | SRS §122-125 |
| **Cache/Queue** | Redis + BullMQ | SRS §126-129 |
| **Object Storage** | Amazon S3 / S3-compatible (Cloudflare R2) | SRS §130-133 |
| **Email** | Resend or Amazon SES | SRS §147-149 |
| **Calendar** | Google Calendar API + Microsoft Graph | SRS §150-153 |
| **Testing** | Vitest + Playwright | SRS §154-157 |
| **Observability** | Sentry + OpenTelemetry | SRS §158-161 |
| **DevOps** | GitHub Actions + Docker | SRS §162-165 |
| **Deployment** | Vercel + managed PostgreSQL/Redis; AWS for enterprise | SRS §166-169 |
| **AI** | Isolated AI service/adapter layer; AI SHALL remain human-in-the-loop | SRS §93, §170-173 |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
+----------------------+        +----------------------+        +----------------------+
|   Frontend (Next.js) | <-----> |   API / Route Handlers| <-----> |   Service Layer      |
|  (React + TypeScript)|        |  (Next.js API Routes) |        |  (Business Logic)    |
+----------------------+        +----------------------+        +----------------------+
         |                             |                             |
         |                             |                             v
         |                             | +------------------+ +------------------+
         |                             | |   Repository     | |   Domain Events  |
         |                             | |   Layer (Prisma) | | (Pub/Sub)        |
         |                             | +------------------+ +------------------+
         |                             |                             |
         |                             |                             v
         |                             +------------->  PostgreSQL  |
         |                                       (Transactional)|
         |                                                             |
         v                                                                     v
+----------------------+                                    +--------------+
|   Redis              |                                    | BullMQ       |
|   (Caching/Session)  |                                    | (Background) |
+----------------------+                                    +--------------+

+----------------------+                                    +--------------+
|  S3-Compatible Store   |                                    | Notifications|
|  (Documents, Resumes) |                                    | (SES, In-app)|
+----------------------+                                    +--------------+
```

### 2.2 Layered Architecture (per SRS)

**Presentation Layer (UI)** - SRS §102-113
- Next.js App Router with React 18
- TypeScript throughout
- shadcn/ui components with Tailwind CSS
- Radix UI primitives for accessibility
- Lucide React for icons
- React Hook Form + Zod for form validation
- TanStack Query for data fetching and caching
- Zustand for lightweight client state

**API / Route Handler Layer** - SRS §114-117
- Next.js Route Handlers (app/api/...)
- Versioned under /api/v1/
- Request validation (Zod middleware)
- Authentication (Better Auth / Auth.js)
- RBAC enforcement (granular permissions)
- Tenant isolation scoping
- Error format standardization

**Service Layer** - SRS (domain-driven)
- Domain-driven business logic
- Coordinates between repositories and external services
- Validation orchestration
- Workflow orchestration
- Notification triggering
- Caching decisions

**Repository Layer** - SRS
- Prisma ORM client abstraction
- Type-safe database queries
- Migration management
- Read/write separation where beneficial
- Query optimization

**Database Access Layer** - SRS §118-125
- PostgreSQL as primary datastore
- Prisma Schema Definition
- Raw SQL for complex operations (if needed)
- Connection pooling via Prisma
- Index management

**Infrastructure Layer** - SRS §126-169
- Redis for caching and session storage
- BullMQ for background job processing
- S3-compatible storage for documents/resumes
- Email provider integration (Resend/SES)
- Calendar integrations (Google, Microsoft Graph)
- Monitoring (Sentry, OpenTelemetry)

---

## 3. Backend Architecture (per SRS §3.1)

### 3.1 Request Flow
```
UI
├─► Next.js Route Handler (GET/POST /api/v1/...)
├─► Authentication Middleware (verify JWT, tenant context)
├─► RBAC Middleware (check permission for current user/role)
├─► Validation Middleware (Zod schema validation)
├─► Service Layer (business logic)
│   ├─► Repository Layer (Prisma queries)
│   └─► External Services (Redis, S3, Email, Calendar)
├─► Prisma → PostgreSQL
└─► Response (JSON, 200/4xx/5xx status)
```

### 3.2 Service Layer Contract (per SRS)
**Naming Convention**: `{Domain}Service`
- `candidateService` - candidate lifecycle operations
- `interviewService` - interview scheduling and evaluation
- `employeeService` - employee lifecycle and onboarding
- `attendanceService` - attendance check-in/out and shift management
- `leaveService` - leave request and approval workflow
- `payrollService` - payroll processing and calculations
- `performanceService` - performance reviews and goals
- `trainingService` - course assignment and completion
- `assetService` - asset inventory and tracking
- `documentService` - document management and storage
- `helpdeskService` - ticket management and routing
- `auditService` - audit log generation and retention

**Service Methods** (per SRS domain FR sections):
- `create(...)` - create new record with validation (e.g., FR-6.1.1 to FR-6.21.x)
- `get(...)` - retrieve single record with permissions check
- `list(...)` - list records with filtering/pagination
- `update(...)` - update with versioning and audit
- `delete(...)` - soft-delete with audit logging
- `evaluate(...)` - domain-specific evaluation (interviews, performance)

### 3.3 Repository Layer Contract (per SRS)
**Naming Convention**: `{Domain}Repository`
- `CandidateRepository`, `ApplicationRepository`, `InterviewRepository`
- `EmployeeRepository`, `AttendanceRepository`, `LeaveRepository`
- `PayrollRepository`, `PerformanceRepository`, `TrainingRepository`
- `AssetRepository`, `DocumentRepository`, `AuditLogRepository`

**Repository Methods**:
- `findUnique(...)`, `findFirst(...)`, `findMany(...)` - list records with filters
- `create(...)` - insert new record
- `update(...)` - update existing record
- `delete(...)` - soft delete (if configured)
- `count(...)`, `groupBy(...)` - aggregated queries

---

## 4. Database Architecture (per SRS §4-6)

### 4.1 Access Pattern
- **All database access** goes through Prisma ORM (per SRS §84, §118-125)
- **No direct SQL** in service code (use rawPrisma() for complex cases)
- **Connection pooling** via Prisma's built-in PgBouncer integration
- **Read/write separation** considered for high-load scenarios

### 4.2 Entity Relationship Model (from SRS domains)

Based on the SRS functional requirements (§6.1 to §6.21), the domain model includes:

```
Organization {id, name, subdomain, status, ...}
    1:N User

User {id, organizationId, email, password, role, status, ...}
    1:N Candidate (as applicant)
    1:N Employee
    N:M Role

Role {id, name, ...}
    N:M Permission

Permission {id, name (e.g. "candidates.read"), ...}
    N:M Role

Candidate {id, organizationId, status, ...}
    1:1 Application (FR-6.2.1 to FR-6.2.6)
    1:N Interview (FR-6.3.1 to FR-6.3.8)
    1:1 Employee (on hire, FR-6.5.3 to FR-6.5.5)

Application {id, candidateId, jobId, status, ...}
    N:1 Candidate (FR-6.2.1)
    1:1 Job (optional)
    1:N InterviewEvaluation

Job {id, title, departmentId, status, ...}
    1:N Applications (FR-6.2.1 to FR-6.2.6)
    1:N OpenPositions

Department {id, name, organizationId, ...}
    1:N Jobs
    N:1 Organization

Employee {id, organizationId, designationId, ...}
    1:1 Designation
    1:N Attendance (FR-6.7.1 to FR-6.7.5)
    1:N LeaveRequest (FR-6.8.1 to FR-6.8.7)
    1:N PerformanceReview (FR-6.10.1 to FR-6.10.8)
    1:N AssetAssignment
    1:N Document (FR-6.12.1 to FR-6.12.6)

Designation {id, title, level, ...}
    N:1 Employee

Attendance {id, employeeId, checkIn, checkOut, ...}
    N:1 Employee (FR-6.7.1 to FR-6.7.5)

LeaveRequest {id, employeeId, type, startDate, endDate, status, ...}
    N:1 Employee (FR-6.8.1 to FR-6.8.7)
    1:N Approval (manager)

PerformanceReview {id, employeeId, cycle, rating, feedback, ...}
    N:1 Employee (FR-6.10.1 to FR-6.10.8)

Training {id, title, description, ...}
    N:1 Assignment Employee{Training} (FR-6.10.5 to FR-6.10.7)
        {id, employeeId, trainingId, completed, completionDate, score}

Asset {id, name, type, status, ...}
    N:1 AssetAssignment Asset{id} Employee{id}
        {id, assetId, employeeId, assignedDate, returnedDate, status (FR-6.11.1 to FR-6.11.6)}

Document {id, organizationId, title, type, path, ...}
    N:M Category (optional, FR-6.12.1 to FR-6.12.6)
    N:1 Organization

Notification {id, recipientType, recipientId, type, title, message, status, ...}
    N:1 User (recipient, FR-6.14.1 to FR-6.14.6)

AuditLog {id, organizationId, action, entity, entityId, userId, timestamp, oldValues, newValues}
    N:1 Organization (FR-6.17.1 to FR-6.17.8)

JobRequisition {id, title, departmentId, createdBy, status, ...}
    N:1 Department
    N:1 User (creator, FR-6.2.1 to FR-6.2.6)
    N:1 Application
```

### 4.3 Tenant Ownership (per SRS §6.18)
- Every entity has `organizationId` field (per SRS FR-6.18.1 to FR-6.18.6)
- Queries must scope by `organizationId`
- Row-level security consideration via PostgreSQL policies
- Prisma middleware for automatic tenant scoping

### 4.4 Status/Lifecycle Fields (per SRS)
Most entities include per SRS FR numbering:
- `status`: Enum (active, inactive, archived, etc.)
- `createdAt`: Timestamp with `@default(now())`
- `updatedAt`: Timestamp, auto-updated
- `createdBy`: User ID (who created)
- `updatedBy`: User ID (who last updated)

### 4.5 Indexes and Constraints (per SRS)
Recommended indexes from SRS domain requirements:
- `Organization.subdomain` - unique (for vanity URLs, FR-6.19.1)
- `User.email` - unique (within organization, FR-6.19.2)
- `Candidate.email` - unique (within organization)
- `Employee.email` - unique (within organization)
- `Employee.organizationId + status` - frequent filter (FR-6.8.3, FR-6.7.4)
- `Attendance.employeeId + date` - frequent lookups (FR-6.7.1 to FR-6.7.5)
- `LeaveRequest.employeeId + status` - approval workflow (FR-6.8.1 to FR-6.8.7)
- `AuditLog.organizationId + timestamp` - audit queries (FR-6.17.1 to FR-6.17.8)
- `Interview.interviewerId + date/time` - scheduling conflicts

### 4.6 Prisma Schema Considerations (per SRS §122-125)
- All `String` fields for names, emails have reasonable `String.${max}` limits
- Enums for status fields with migration-safe additions
- `DateTime` fields with `@default(now())`
- Relationships defined with `references: "Model"` syntax
- Compound indexes for frequent query patterns

---

## 5. Authentication & Authorization (per SRS §5, §85-141)

### 5.1 Authentication (per SRS §85-86, §134-137)
- **Provider**: Better Auth or Auth.js
- **Protocol**: JWT + Sessions
- **MFA**: Ready architecture (can be enabled later)
- **SSO**: Upgrade path to enterprise SSO
- **Social Auth**: OAuth/OIDC foundations for later

### 5.2 Authorization (per SRS §138-141)
- **Framework**: RBAC + granular permission matrix
- **Roles**: HR Admin, Recruiter, Interviewer, Manager, Employee, Super Admin
- **Permissions**: Granular (candidates.read, interviews.evaluate, etc.)
- **Tenant Boundary**: All permissions scoped within organization
- **Sensitive Data**: Additional checks for PII, salary, performance data

### 5.3 Permission Naming Convention (per SRS §6.17 to §6.20)
```
resource.action
e.g., candidates.read, candidates.create, candidates.update
e.g., interviews.read, interviews.create, interviews.evaluate
e.g., employees.read, employees.update
e.g., attendance.read, attendance.manage
e.g., leave.create, leave.approve
e.g., documents.read, documents.manage
e.g., payroll.read
e.g., audit.read
```

### 5.4 RBAC Model (per SRS §4.4, §139-141)
- **Roles** are groupings of permissions
- **Permissions** are atomic access control units
- **Role → Permission mapping** defined in configuration
- **User → Role assignment** per organization
- **Dynamic permission checking** at API route level

### 5.5 Tenant Isolation (per SRS §6.18, FR-6.18.1 to FR-6.18.6)
- Every API request includes organization context
- Database queries automatically scoped by organizationId
- RBAC checks include organization scope
- Super Admin can view across tenants (with audit)
- No cross-tenant data leakage possible

---

## 6. File & Document Storage Architecture (per SRS §6.12, §130-133)

### 6.1 Storage Provider
- **Provider**: Amazon S3 or S3-compatible (Cloudflare R2)
- **Access**: Private bucket with signed URLs
- **Lifecycle**: Automatic expiration/transition rules
- **Security**: Server-side encryption, signed access

### 6.2 Stored Objects (per SRS §131-133)
| Object Type | Path Pattern | Access |
|-------------|--------------|--------|
| Resumes | `org_{id}/resumes/{candidateId}/{filename}` | Public via signed URL (application period) |
| Employee Documents | `org_{id}/employees/{employeeId}/documents/{filename}` | Role-based access |
| Pay Slips | `org_{id}/payroll/{employeeId}/{month}/{year}.pdf` | Employee self + manager |
| Asset Images | `org_{id}/assets/{assetId}/{filename}` | Assigned employee + admin |
| Interview Avatars | `org_{id}/users/{userId}/avatar.{ext}` | Organization members |

### 6.3 Workflow (per SRS §133)
1. Upload → Presigned URL generation → Client uploads directly to S3
2. S3 → Lambda/Trigger → Metadata update in PostgreSQL (Prisma)
3. Download → Signed URL generation based on user role
4. Deletion → Prisma update + S3 delete (or mark as archived)

---

## 7. Background Job Architecture (per SRS §6.14, §126-129)

### 7.1 Job Queue System
- **System**: BullMQ + Redis
- **Purpose**: Reliable background processing, durability, retry logic
- **Transport**: Redis (localhost dev, managed cloud prod)

### 7.2 Job Categories (per SRS §147-149)
| Category | Examples | Priority |
|----------|----------|----------|
| **Email** | Interview reminders, offer notifications, leave approvals | High |
| **Notifications** | In-app alerts, system messages | Medium |
| **Scheduled** | Monthly payroll, birthday alerts, review reminders | Medium |
| **Document** | PDF generation, OCR processing, conversions | Low |
| **Cleanup** | Expired tokens, stale data, archive old records | Low |

### 7.3 Job Naming Convention (per SRS)
- `email.interview-reminder-{interviewId}`
- `notification.leave-approved-{leaveId}`
- `payroll.monthly-run-{yyyyMM}`
- `cleanup.expired-tokens`
- `document.pdf-generate-{documentId}`

### 7.4 Retry Policy (per SRS §159)
- **Max attempts**: 3
- **Backoff**: Exponential (1min, 5min, 15min)
- **Dead Letter Queue**: Failed jobs after max attempts
- **Monitoring**: Sentry integration for job failures

---

## 8. Notifications Architecture (per SRS §6.14, FR-6.14.1 to FR-6.14.6)

### 8.1 Notification Types (per SRS §147-149)
| Type | Channel | Trigger (SRS) |
|------|---------|--------------|
| Interview Scheduled | Email + In-app | FR-6.3.1, FR-6.3.2 |
| Interview Reminder | Email + In-app | FR-6.3.2 |
| Offer Sent | Email | FR-6.5.1 to FR-6.5.3 |
| Offer Accepted | In-app | FR-6.5.2 |
| Leave Requested | In-app | FR-6.8.1 |
| Leave Approved/Rejected | Email + In-app | FR-6.8.2 to FR-6.8.3 |
| Payroll Generated | Email | FR-6.9.2 to FR-6.9.8 |
| Performance Review Due | In-app | FR-6.10.1 to FR-6.10.4 |
| Ticket Created | In-app | FR-6.13.1 |
| System Alert | SMS (optional) | Critical errors |

### 8.2 Notification Delivery (per SRS §147)
- **Primary**: In-app notifications (stored in DB, BullMQ queue)
- **Secondary**: Email (Resend/SES, queued via BullMQ)
- **Tertiary**: SMS (optional, approved providers later)
- **Template System**: Handlebars/Edge templates with variables
- **Preferences**: User can opt-out of specific channels

### 8.3 Template Variables (per SRS §148)
- Candidate/employee name
- Organization name
- Specific details (interview time, leave dates, etc.)
- Action buttons (accept/decline links, etc.)
- Personalized signature

---

## 9. API Architecture (per SRS §6.20, FR-6.20.1 to FR-6.20.10)

### 9.1 API Conventions (per SRS FR-6.20.1 to FR-6.20.7)
- **Versioning**: /api/v1/ (semantic versioning)
- **Base URL**: `https://{domain}/api/v1/`
- **Authentication**: Bearer token (JWT) in Authorization header
- **Tenant Context**: organizationId in header or subdomain
- **Validation**: Zod schema in request body/query
- **Pagination**: `page`, `limit` query params (cursor-based later)
- **Filtering**: `filter[field]=value` query params
- **Sorting**: `sort[field]=direction` query params

### 9.2 Response Conventions (per SRS FR-6.20.5 to FR-6.20.7)
| Field | Description |
|-------|-------------|
| `status` | "success" or "error" |
| `data` | Resource or array of resources |
| `meta` | Pagination metadata (if applicable) |
| `error` | Error object (if status is "error") |
| `timestamp` | ISO 8601 datetime |

### 9.3 Error Format (per SRS FR-6.20.5)
```json
{
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR" | "AUTHORIZATION_ERROR" | "NOT_FOUND" | etc.",
    "message": "Human-readable explanation",
    "details": ["field-specific error messages"]
  },
  "timestamp": "2026-01-15T10:30:00Z"
}
```

### 9.4 Important API Endpoints (per SRS §6.20, FR-6.20.1 to FR-6.20.10)

**Auth** - SRS FR-6.20.2
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout

**Organizations** - SRS FR-6.18
- `GET /api/v1/organizations` - List user's organizations
- `POST /api/v1/organizations` - Create new organization
- `GET /api/v1/organizations/{id}` - Get organization
- `PATCH /api/v1/organizations/{id}` - Update organization

**Candidates** - SRS §6.2, FR-6.2.1 to FR-6.2.6
- `GET /api/v1/candidates` - List candidates (filtered)
- `POST /api/v1/candidates` - Create candidate (from forms)
- `GET /api/v1/candidates/{id}` - Get candidate
- `PATCH /api/v1/candidates/{id}` - Update candidate
- `POST /api/v1/candidates/{id}/convert-to-employee` - Convert to employee

**Applications** - SRS §6.2
- `GET /api/v1/applications` - List applications
- `POST /api/v1/applications` - Create application
- `GET /api/v1/applications/{id}` - Get application

**Interviews** - SRS §6.3, FR-6.3.1 to FR-6.3.8
- `GET /api/v1/interviews` - List interviews
- `POST /api/v1/interviews` - Schedule interview
- `GET /api/v1/interviews/{id}` - Get interview
- `PATCH /api/v1/interviews/{id}` - Update interview
- `POST /api/v1/interviews/{id}/evaluate` - Evaluate interview

**Employees** - SRS §6.6, FR-6.6.1 to FR-6.6.8
- `GET /api/v1/employees` - List employees
- `GET /api/v1/employees/{id}` - Get employee
- `PATCH /api/v1/employees/{id}` - Update employee

**Attendance** - SRS §6.7, FR-6.7.1 to FR-6.7.5
- `POST /api/v1/attendance/check-in` - Check in
- `POST /api/v1/attendance/check-out` - Check out
- `GET /api/v1/attendance/records` - Get attendance records

**Leave** - SRS §6.8, FR-6.8.1 to FR-6.8.7
- `POST /api/v1/leave/request` - Request leave
- `GET /api/v1/leave/requests` - List leave requests
- `PATCH /api/v1/leave-requests/{id}/approve` - Approve leave
- `PATCH /api/v1/leave-requests/{id}/reject` - Reject leave

**Payroll** - SRS §6.9, FR-6.9.1 to FR-6.9.8
- `GET /api/v1/payroll/salary-structure` - Get salary structure
- `POST /api/v1/payroll/run` - Run payroll
- `GET /api/v1/payroll/slips/{employeeId}/{month}/{year}` - Get pay slip

**Performance** - SRS §6.10, FR-6.10.1 to FR-6.10.8
- `GET /api/v1/performance/reviews` - List reviews
- `POST /api/v1/performance/reviews` - Create review
- `PATCH /api/v1/performance-reviews/{id}` - Update review

**Documents** - SRS §6.12, FR-6.12.1 to FR-6.12.6
- `POST /api/v1/documents/upload` - Upload document (presigned URL)
- `GET /api/v1/documents/{id}` - Get document metadata
- `DELETE /api/v1/documents/{id}` - Delete document

**Audit** - SRS §6.17, FR-6.17.1 to FR-6.17.8
- `GET /api/v1/audit/logs` - Audit log search (admin only)

---

## 10. Multi-Tenant Strategy (per SRS §6.18, FR-6.18.1 to FR-6.18.6)

### 10.1 Organization Architecture
- **Each organization** is a complete tenant with independent data (FR-6.18.1)
- **Organization model** has `subdomain`, `name`, `settings`, `status`
- **User model** belongs to an organization
- **All entities** have `organizationId` foreign key (FR-6.19.1 to FR-6.19.6)

### 10.2 Data Isolation Strategies
1. **OrganizationId Scoping**: Every query filters by `organizationId` (FR-6.18.2 to FR-6.18.3)
2. **Row-Level Security**: PostgreSQL RLS policies as secondary defense
3. **Configuration Per Tenant**: Email settings, branding, workflows per org (FR-6.18.4 to FR-6.18.6)

### 10.3 Multi-Tenant Operations
- **Onboard New Org**: Create organization, set up default roles, migrate data
- **Cross-Org Super Admin**: View across orgs (with audit trail)
- **Data Export**: Per-organization export capability
- **Tenant-Specific Settings**: Email templates, workflow rules, branding

### 10.4 Tenant Boundary Enforcement (per SRS §6.18)
- **API Level**: All routes verify organization membership
- **Database Level**: Prisma middleware auto-scopes by organizationId
- **UI Level**: Organization switcher, no cross-org navigation
- **Permission Level**: Permissions scoped within organization (Super Admin exception)

---

## 11. Security Boundaries (per SRS §6.17, FR-6.17.1 to FR-6.17.8)

### 11.1 Data Security (per SRS FR-6.17.7)
- **Encryption at Rest**: PostgreSQL pgTDE or application-level encryption for sensitive fields
- **Encryption in Transit**: TLS 1.3 for all connections
- **Password Hashing**: bcrypt or Argon2 (never plain text)
- **Sensitive Fields**: Salary, SSN, PII masked in logs

### 11.2 Access Security (per SRS §4.4, §139-141)
- **RBAC Enforcement**: Every API route checks permissions
- **Tenant Isolation**: No cross-tenant data access (FR-6.18.2 to FR-6.18.3)
- **Input Validation**: Zod schemas prevent injection
- **Rate Limiting**: Redis-backed per-IP and per-organization
- **CSP**: Content Security Policy for frontend

### 11.3 Audit Logging (per SRS FR-6.17.1 to FR-6.17.8)
- **Logged Operations**: All CRUD on sensitive entities
- **Fields Logged**: action, entity, entityId, userId, oldValues, newValues, timestamp
- **Retention**: Configurable (default 1 year, adjustable)
- **Export**: Admin can export audit logs
- **Tamper-Evident**: Log structure prevents silent modification

### 11.4 Dependency Security (per SRS §162-165)
- Regular dependency updates (GitHub Dependabot)
- Vulnerability scanning (Sentry, OpenTelemetry)
- No hardcoded secrets or keys
- Environment variable configuration only

---

## 12. Monitoring & Observability (per SRS §90-92, FR-154 to FR-161)

### 12.1 Sentry (per SRS §158-161)
- **Errors**: All unhandled exceptions, breadcrumbs
- **Performance**: Transaction tracking, latency monitoring
- **Deployments**: Source map mapping for source code
- **Alerts**: Critical error thresholds

### 12.2 OpenTelemetry (per SRS §159-161)
- **Traces**: Request lifecycle, background job spans
- **Metrics**: Request rate, error rate, latency percentiles
- **Custom Instruments**: Business metrics (hires, leaves, etc.)
- **Exporters**: Sentry, Prometheus (if needed)

### 12.3 Health Checks (per SRS)
- `/api/health` - Basic liveness
- `/api/health/db` - Database connectivity
- `/api/health/redis` - Redis connectivity
- `/api/health/queue` - BullMQ queue health

### 12.4 Logging Structure (per SRS §160-161)
- JSON format structured logs
- Correlation IDs per request
- Request duration, path, status, userId
- Component-level logs (service, repository, DB)
- Audit log separate storage

---

## 13. Deployment Architecture (per SRS §166-169)

### 13.1 Initial Deployment
- **Hosting**: Vercel (Next.js frontend + API routes)
- **Database**: managed PostgreSQL (Neon, PlanetScale, etc.)
- **Redis**: managed (Upstash, Vercel KV, etc.)
- **Domain**: Custom domain with SSL

### 13.2 Production Deployment
- **Hosting**: AWS (ECS/Fargate or EKS) for scale
- **Database**: Amazon RDS/Aurora PostgreSQL
- **Redis**: Amazon ElastiCache Redis
- **Storage**: Amazon S3 with lifecycle policies
- **CI/CD**: GitHub Actions → Docker → Deploy

### 13.3 Docker Architecture (per SRS §163)
```dockerfile
# Multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
CMD ["node", "server.js"]
```

### 13.4 Environment Configuration (per SRS §162-165)
- `.env.local` (local development)
- `.env.production` (production)
- No secrets in source code
- All config via environment variables

---

## 14. Testing Strategy (per SRS §90-92, FR-154 to FR-161)

### 14.1 Unit Tests (Vitest, per SRS §154)
- Service layer business logic
- Validation schemas (Zod)
- Utility functions
- Target: >80% coverage on critical paths (FR-6.1 to FR-6.21)

### 14.2 API Tests (Vitest + Supertest, per SRS §154)
- Route handler endpoints
- Authentication & RBAC (FR-6.17 to FR-6.18)
- Validation error cases
- Pagination, filtering, sorting
- Target: All critical API endpoints

### 14.3 End-to-End Tests (Playwright, per SRS §155)
- Complete workflows (hire→onboard per FR-6.5 to FR-6.5.5, leave request per FR-6.8, etc.)
- Cross-browser testing
- Accessibility testing (WCAG 2.1 AA)
- Responsive testing (mobile/ tablet/ desktop)
- Target: Critical business workflows

### 14.4 Test Data Management (per SRS)
- Vitest: `vi.mock()` for dependencies
- Playwright: Test fixtures, database setup/teardown
- Factory pattern for test data (no hardcoded business data, per AI_rules)
- Database transaction rollback per test

### 14.5 Test Coverage Goals (per SRS)
- **Unit**: 80%+ on service layers (FR-6.1 to FR-6.21)
- **API**: 100% on auth, RBAC, critical endpoints (FR-6.17 to FR-6.20)
- **E2E**: All critical workflows covered

---

## 15. Definition of Done (per SRS §8.1, FR-8.1 to FR-8.2)

A feature is complete when (per SRS §8.1):
- [ ] UI implementation completed and responsive (mobile/tablet/desktop)
- [ ] API endpoint developed with documentation
- [ ] Service layer business logic implemented
- [ ] Repository layer Prisma queries written
- [ ] Database migration created and tested (rollback tested)
- [ ] Zod validation implemented for forms/requests
- [ ] RBAC/permissions tested for all role types
- [ ] Tenant isolation verified (no cross-tenant access, FR-6.18)
- [ ] Unit tests written and passing
- [ ] API endpoint tests passing (error cases included)
- [ ] End-to-end workflow test passing (Playwright)
- [ ] Documentation updated (SRS section, API spec, RBAC)
- [ ] Code review completed (at least 1 approver)
- [ ] Lint and typecheck passing (ESLint, TypeScript)
- [ ] Performance benchmarks met
- [ ] Security validation passed
- [ ] Accessibility validated (WCAG 2.1 AA basics)
- [ ] Deployment verified (staging → production)
- [ ] Monitoring/alerting configured (Sentry, OTEL)

**Exit Criteria** (per SRS §8.2):
- All Phase 0 foundation features meet Definition of Done
- Multi-tenant isolation verified with test organizations
- RBAC matrix tested for all defined roles
- Critical e2e workflows passing (hire→onboard, leave request)
- No blocking bugs or security vulnerabilities
- Performance benchmarks met on baseline configuration
- Documentation synchronized and verified

---

## 16. Assumptions & Open Decisions (per SRS §6.21, FR-6.21)

### 16.1 Assumptions (per SRS §6.21)
1. PostgreSQL supports required JSONB operations for flexible fields
2. Redis availability guaranteed for BullMQ operations
3. S3-compatible storage available with API compatibility
4. Email provider (Resend/SES) account will be provisioned
5. Google Cloud/Microsoft Graph accounts available for calendar integration
6. Better Auth or Auth.js licensing/availability confirmed
7. Team familiar with TypeScript-first development
8. Prisma ORM supports required relationship types

### 16.2 Open Architectural Decisions (per SRS §6.21)
1. **Calendar Integration Depth**: Google Calendar vs. Microsoft Graph vs. both
2. **Search Implementation**: PostgreSQL Full-Text Search initially, OpenSearch later
3. **SMS Provider**: Which approved provider for SMS notifications
4. **AI Service Integration**: Timing of dedicated AI service module (Phase 13)
5. **Nested Multi-Tenant**: Per-organization database vs. single DB with organizationId scoping
6. **Payroll Tax Filing**: Architecture-ready only, actual filing later
7. **Performance Review Calibration**: Rating submission vs. full calibration workflow
8. **Asset Tracking Granularity**: Simple check-in/check-out vs. full lifecycle tracking

### 16.3 Future Extraction Points (per SRS)
- NestJS API layer for external clients
- Dedicated microservice for payroll (complex calculations)
- Dedicated AI service module
- Separate analytics database for heavy reporting

---

## 17. Revision History
| Version | Date | Description | Author |
|---------|------|-------------|--------|
| 1.0 | 17 Aug 2026 | Initial architecture documentation based on SRS v1.1 | Lead Software Architect |

---