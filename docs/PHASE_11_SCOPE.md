# Phase 11 Scope — Reports and Analytics

## Status and authority

- **Phase:** 11 — Analytics
- **Scope status:** Confirmed for implementation planning; implementation has not started.
- **Authoritative source:** `docs/SRS.md` (frozen).
- **Prior-phase baseline:** `docs/PHASE_10_COMPLETION_REPORT.md`.
- **Constraint:** This document interprets and organizes the frozen requirements. It does not add analytics, KPIs, reports, dashboards, or business rules.

## 1. Phase 11 objective

Implement the organization-scoped **Reports & Analytics** capability required by SRS §31.4 (line 746): recruitment, workforce, attendance, leave, payroll, and HR operational dashboards with drill-down to the underlying records.

The capability must consolidate the explicitly required metrics from SRS §21 and §29, reuse existing persisted domain data and Phase 10 dashboard services where applicable, and apply server-side authentication, RBAC, tenant isolation, validation, and export auditing. It must not duplicate or change the source business workflows.

## 2. SRS requirements assigned to Phase 11

### Direct Phase 11 requirements

| SRS reference | Requirement | Phase 11 interpretation |
|---|---|---|
| §31.4, line 746 | Analytics for recruitment, workforce, attendance, leave, payroll, and HR operational dashboards with drill-down | Primary Phase 11 deliverable |
| §21, lines 1661–1721 | Reports and Analytics metric catalogue | Implement the enabled-domain metrics listed in section 3 |
| §28, line 2300 | Dashboard widgets drill down to underlying records | Every summary widget/metric must link to a permission-filtered source-record view |
| §28, line 2303 | Data-heavy pages support search, filters, sorting, pagination, and saved views where useful | Apply appropriate controls to report detail/result pages; saved views are required only where useful, not universally |
| §28, line 2318 | Export actions identify format and access level | Clearly label supported report exports and their access level |
| §28, line 2324 | Useful empty states | Reports and dashboards must not render blank screens |
| §28.1, lines 2396–2399 | Reports & Analytics navigation: Recruitment, Workforce, Attendance, Leave, HR KPIs | Required navigation taxonomy |
| §29, lines 2423–2468 | Reporting KPI definitions | Implement only the listed KPI set and definitions |
| AC-12, lines 2582–2588 | Authorized HR users obtain recruitment and attendance reports matching source records | Required acceptance gate using persisted source data |

### Cross-cutting requirements applicable to Phase 11

| SRS reference | Requirement |
|---|---|
| FR-002, line 1256 | Every business record and protected API is organization-scoped server-side |
| FR-003, line 1259 | Role-based permissions and custom/inherited roles |
| FR-006, line 1268 | Sensitive export/download actions generate audit events |
| §4 and §4.1, lines 1037–1145 | Role scopes, deny-by-default access, field-level protection, independent export/download permission |
| §23, lines 1754–1787 | Server-side auth/authz, session-derived tenant context, audit contents, export control, safe logs, consistent security controls |
| §25.2, lines 2063–2066 | Consistent date/time storage/rendering and preserved history |
| §26, lines 2072–2075 and 2144–2153 | Versioned APIs with validation, scoping, consistent errors, applicable audit; `/reports/*`, `/analytics/*`, and `/audit-events` capabilities |
| §27, lines 2219–2288 | Availability, performance, scalability, reliability, security, accessibility, responsiveness, observability, maintainability, backup/recovery, localization, browser support |
| §31.5, lines 755–782 | Common phase Definition of Done |

## 3. Analytics and reports required

### Recruitment

- Applications.
- Pipeline counts.
- Candidate conversion rate by stage.
- Recruitment source effectiveness.
- Time to hire: requisition approval to accepted offer, subject to the SRS's configurable definition.
- Time to fill: requisition opening to accepted offer.
- Interview pass rate.
- Interview no-show rate.
- Offer acceptance rate.
- Open positions.

Phase 10 already supplies recruitment dashboard aggregates and drill-down links. Phase 11 must reuse or extend those persisted queries rather than create a second conflicting definition.

### Candidate attendance

- Interview attendance.
- No-shows.
- Check-in volumes.
- Visit history.

### Workforce

- Headcount.
- Department distribution.
- Employment type.
- Tenure.
- Joiners and leavers.
- Headcount by department, location, and employment type.
- Employee turnover/attrition rate.
- Probation completion/confirmation rate.

### Employee attendance

- Present, absent, late, work-from-home, and overtime trends.
- Department comparisons.
- Correction volumes.
- Attendance rate.
- Absenteeism.
- Late-arrival rate.

### Leave

- Leave utilization.
- Leave balances.
- Leave trends.
- Leave approval cycle/turnaround time.

### Onboarding and HR operations

- Onboarding task completion.
- Overdue onboarding tasks.
- Onboarding document completion.
- Time to readiness.
- New-joiner onboarding completion rate.
- Average onboarding completion time.
- HR request resolution time, using an enabled persisted request/workflow source only.
- Document expiry risk count.

### Payroll and expenses

Required when the applicable modules are enabled:

- Payroll totals.
- Salary components.
- Overtime.
- Expense totals.
- Expense/payroll approval cycle time where represented by the enabled workflow.

### Performance

SRS §21 makes performance analytics conditional: review completion, goal status, and rating trends are required **when the performance module is enabled**. The current Prisma schema inspected at this gate has no performance/goal/review entities. These metrics are therefore not implementable from real persisted data in Phase 11 unless that module is enabled by an authorized scope decision; they must not be faked or inferred from unrelated records.

### Audit analytics

- Logins.
- Permission changes.
- Exports.
- Downloads.
- Sensitive-field changes.
- Administrative events.

Audit analytics is read-only reporting over persisted audit events. Phase 12's broader compliance workflows and compliance reporting are not part of Phase 11.

## 4. Explicit metrics and dimensions

Only the following dimensions are explicitly established by the SRS metric names:

| Metric family | Explicit dimensions/groupings |
|---|---|
| Recruitment | Pipeline stage; recruitment source; open-position state |
| Candidate attendance | Attendance/no-show outcome; check-in volume; visit history |
| Workforce | Department; location; employment type; tenure; joiner/leaver state |
| Employee attendance | Present/absent/late/WFH/overtime state; department; correction volume; time trend |
| Leave | Utilization; balance; time trend; approval duration |
| Onboarding | Task completion/overdue state; document completion; readiness duration |
| Payroll/expenses | Payroll total; salary component; overtime; expense total; approval duration |
| Performance, when enabled | Review completion; goal status; rating trend |
| Audit | Event category: login, permission change, export, download, sensitive-field change, administrative event |

The SRS does not define additional segmentation such as age, gender, ethnicity, cost center, recruiter ranking, predictive risk, industry benchmarks, or custom formulas. These must not be added as Phase 11 requirements.

## 5. Date and filter behavior

- Calculations must use consistently stored persisted timestamps and render them according to user/organization timezone policy (§25.2 and §27).
- Time-based metrics and trends must accept an organization-scoped date range appropriate to their source records.
- Recruitment KPI boundaries must follow §29 exactly: requisition approval to accepted offer for time to hire (with the supported configurable definition), and requisition opening to accepted offer for time to fill.
- Drill-down results must retain the dashboard/report's tenant, date, metric, and explicit dimension scope so that displayed records reconcile with the aggregate.
- Report detail pages must support appropriate search, filtering, sorting, and pagination; saved views are included only where useful under §28, not as a blanket feature.
- Invalid date ranges and unsupported filters must receive a standard validation response.
- Presentation must not hardcode date, time, number, or timezone formats.

The SRS does **not** prescribe a default reporting period, fiscal calendar, comparison period, chart interval, week start day, or arbitrary report-builder filters. Those are implementation/configuration decisions requiring no new business metric and must not be presented as frozen requirements.

## 6. Required APIs

The SRS requires versioned report and analytics capabilities under `/reports/*` and `/analytics/*`; it does not prescribe exact endpoint names or response payloads. Phase 11 must provide the minimum versioned API surface needed for:

- Recruitment analytics and report drill-down.
- Candidate-attendance analytics and visit-history drill-down.
- Workforce analytics and source employee drill-down.
- Employee-attendance analytics and correction drill-down.
- Leave analytics and request/balance drill-down.
- Onboarding/HR operational analytics and underlying task/document/request drill-down.
- Payroll/expense analytics when enabled, with independent sensitive-data permissions.
- Audit analytics for authorized read-only oversight.
- Permission-controlled exports for required reports.

Every endpoint must enforce authentication, action/resource permission, session-derived organization context, Zod/request validation, consistent error envelopes, pagination/limits for record sets, and applicable audit events. Existing `/api/v1/dashboards/hr`, `/api/v1/dashboards/recruitment`, attendance-report, and payroll-report capabilities should be reused or extended when their contracts match the requirement.

## 7. Database and query changes

No new database entity is explicitly required by Phase 11. The required metrics should be calculated from the existing persisted sources, including requisitions, applications, candidates, interviews, candidate visits, offers, employees, onboarding records, attendance records/corrections, leave requests/balances, payroll results, expenses, workflow tasks/notifications where they represent HR requests, managed documents, and audit logs.

Implementation requirements:

- Use organization predicates in every aggregate and drill-down query.
- Keep metric formulas in a shared server-side analytics service so dashboard, report, export, and tests use the same definitions.
- Avoid N+1 access; use bounded aggregate/grouped queries and paginated detail queries.
- Add indexes only when query plans or measured report queries demonstrate a need.
- Add a schema migration only if a reviewed, SRS-required data gap cannot be represented by existing models. A reporting cache, snapshot table, warehouse, or materialized view is not mandated by the SRS.
- Do not duplicate source-of-truth business records or persist fabricated summary data.
- Preserve historical records used by reporting.

## 8. Required UI and pages

Provide a Reports & Analytics navigation area with these SRS-defined entries:

- Recruitment.
- Workforce.
- Attendance.
- Leave.
- HR KPIs.

The pages may compose candidate-attendance, onboarding, payroll/expenses, performance-when-enabled, and audit metrics under the closest SRS-defined area without inventing a new product taxonomy. Each implemented view must include:

- Real persisted metrics.
- The explicit filters needed by its metrics.
- Drill-down actions to existing permission-protected source pages or report-detail pages.
- Loading, error, empty, and populated states.
- Accessible labels, keyboard operation, responsive layouts/tables, and clearly identified export format/access.

Phase 11 does not require separate standalone dashboards for every role. The same report surfaces must adapt to the authenticated user's permissions.

## 9. RBAC requirements

- **HR Administrator:** reports within the organization's full HR permission scope.
- **HR Manager:** reporting, workforce, and recruitment oversight, with configurable limits on sensitive fields.
- **Recruiter:** recruitment analytics only within assigned recruitment permissions; no automatic workforce, salary, or confidential HR access.
- **Manager:** team-scoped attendance, leave, performance, and limited employee analytics only where the assigned permissions allow.
- **Finance/Payroll:** payroll, expense, reimbursement, and salary analytics according to policy.
- **Auditor/Compliance:** read-only audit logs, reports, policy/compliance evidence according to assigned scope.
- **Other roles, including Employee:** no broad analytics access unless explicitly granted by action/resource permissions.

Access is deny-by-default. View, export, and download permissions must remain distinct, and field/document-level protection must apply to salary, banking, government identifiers, and confidential documents.

## 10. Tenant-isolation requirements

- Derive organization context from the authenticated session/token and active membership; do not trust a query parameter or client header by itself.
- Apply organization scope server-side to every aggregate, count, denominator, trend, export, and drill-down query.
- Reject cross-tenant record IDs and filters without revealing record existence.
- Ensure cached/background/generated report results, if introduced, include and validate tenant ownership.
- Verify aggregate isolation as well as detail-record isolation; a cross-tenant count is a data leak even if no row details are returned.

## 11. Audit requirements

- Record report exports and downloads with actor, action, resource, timestamp, organization, request correlation ID where available, and outcome.
- Enforce independent export/download permission and audit failed as well as successful attempts where the existing audit policy requires it.
- Preserve audit records for sensitive administrative actions that feed audit analytics.
- Do not log unnecessary personal data, secrets, raw report content, or sensitive filters.
- Ordinary read-only dashboard viewing is not explicitly identified by the SRS as a mandatory audit event; it must not be made a new business requirement without an approved policy decision.

## 12. Integrations and external dependencies

Required project dependencies are the existing authentication/session service, RBAC and tenant context, Prisma/PostgreSQL persistence, audit logging, API conventions, and observability foundation.

Conditional dependencies:

- Redis/BullMQ only if existing background-job infrastructure is used for long-running exports or scheduled calculations.
- Existing storage abstraction only if generated report files must be retained/downloaded.
- Existing notification infrastructure only if an already-approved asynchronous export flow uses it.

The SRS does not require an external BI platform, data warehouse, spreadsheet provider, predictive service, or AI integration for Phase 11.

## 13. Performance requirements

- Use server-side grouped/aggregate queries and avoid N+1 request or query patterns.
- Bound and paginate drill-down result sets and exports according to existing platform conventions.
- Verify tenant-filtering indexes and query plans for the largest report paths; add justified indexes through reviewed migrations only when needed.
- Support growth in organizations, employees, candidates, documents, and audit events without redesigning core entities.
- Provide graceful error handling and observability, including correlation IDs and health/readiness compatibility.
- Meet the SRS's acceptable interactive target under expected load. The frozen SRS leaves the numerical SLA to capacity planning, so Phase 11 must not invent one.

## 14. Testing requirements

### Unit and service tests

- Formula tests for every required KPI, including zero-denominator and boundary cases.
- Exact time-to-hire/time-to-fill boundaries.
- Stage conversion, pass/no-show, offer acceptance, onboarding completion, attendance, leave turnaround, headcount, turnover, probation, request resolution, expiry-risk, payroll/expense, and enabled performance calculations.
- Organization/timezone/date-range behavior.

### API and security tests

- Authentication and per-resource view permission.
- Independent export/download permission.
- Tenant isolation for aggregates, dimensions, drill-downs, and exports.
- Manager/team and recruiter/recruitment scope.
- Sensitive payroll/employee field protection.
- Invalid date/filter/pagination handling and safe error responses.
- Export/download audit persistence.

### Persisted workflow and Playwright tests

- Seed or create real PostgreSQL source records through approved test fixtures.
- Verify each enabled dashboard/report against the underlying source records.
- Verify aggregate-to-drill-down reconciliation.
- Verify authorized and denied role experiences, cross-tenant denial, responsive navigation, empty/loading/error states, and export labeling.
- Satisfy AC-12 with persisted recruitment and attendance reports, not rendering-only assertions.
- Verify no hardcoded/mock business metrics appear in production paths.

### Regression gate

- Lint.
- Typecheck.
- Unit/API tests.
- Full Playwright suite.
- Production build.
- Prisma validation, migration status, and migration diff.
- Health and readiness.
- Existing Phase 0–10 regression suite.
- Confirm `docs/SRS.md` remains unchanged.

External-service checks must be reported honestly as passed, failed, or environment-blocked; mocks may validate contracts but cannot establish live integration success.

## 15. Definition of Done

Phase 11 is complete only when:

- [ ] All required enabled-domain metrics in SRS §21 and KPIs in §29 are implemented from persisted source records.
- [ ] Recruitment, Workforce, Attendance, Leave, and HR KPI report navigation exists.
- [ ] Required versioned report/analytics APIs are validated and permission-protected.
- [ ] Each dashboard widget supports tenant-safe drill-down to reconciling source records.
- [ ] Date ranges, explicit dimensions, sorting/pagination, timezone rendering, and appropriate filters work consistently.
- [ ] RBAC, team/recruitment scope, field-level sensitive access, and deny-by-default behavior are verified.
- [ ] Cross-tenant aggregates, details, and exports are rejected.
- [ ] Export/download permissions and audit events are verified.
- [ ] Loading, empty, error, populated, and responsive states are implemented.
- [ ] Recruitment and attendance reports satisfy AC-12 against real PostgreSQL records.
- [ ] Critical formulas and security boundaries have unit, API, and persisted Playwright coverage.
- [ ] Performance/query behavior is reviewed and no N+1 pattern is present.
- [ ] Lint, typecheck, tests, production build, Prisma checks, health/readiness, and Phase 0–10 regression pass or are truthfully classified.
- [ ] No hardcoded dummy business data exists in production paths.
- [ ] Changes, APIs, migrations, limitations, and environment blockers are documented.
- [ ] `docs/SRS.md` remains unchanged.

## 16. Explicitly out of scope

- Phase 12 exit workflows, clearance, asset return, access revocation, final settlement, exit documents, and broader compliance reporting. Phase 11 still includes only the explicitly required workforce joiner/leaver and turnover metrics.
- Phase 13 AI, predictive analytics, candidate matching, HR assistant, advanced integrations, workflow automation, biometric providers, and accounting/payroll integrations.
- New recruitment, attendance, leave, onboarding, payroll, expense, document, or performance business workflows.
- A custom report builder, arbitrary user-defined formulas, user-designed dashboard layouts, forecasting, benchmarking, anomaly detection, or metrics not listed in the SRS.
- External BI/data-warehouse implementation unless separately authorized.
- Separate dashboards for every role; Phase 11 requires permission-aware analytics, not newly invented role-specific products.
- Reimplementation of Phase 10 HR/recruitment dashboard metrics where existing queries and APIs already satisfy the frozen definition.
- Performance analytics while the performance module remains disabled; fake or inferred performance data is prohibited.
- New numeric performance SLA, default date period, fiscal-calendar rule, chart granularity, or comparison-period business rule not defined by the SRS.

## Gate decision

The Phase 11 scope is confirmed as an analytics and reporting implementation over existing persisted HR domains. No Phase 11 application code, database migration, API, or UI has been created by this scope-confirmation step.
