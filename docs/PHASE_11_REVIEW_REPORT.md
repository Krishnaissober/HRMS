# Phase 11 Final Review — Analytics and Reporting

## Final decision

**PHASE 11 NOT READY FOR PHASE 12**

The implementation compiles and all existing automated checks pass, but source review found multiple HIGH application defects in required metrics, date semantics, scoped authorization, drill-down tenant context, and test completeness. These defects can return incomplete or incorrect analytics despite the green suite. Phase 12 must not start until the HIGH and MEDIUM findings are remediated and freshly revalidated.

## Review basis

- Frozen authority: `docs/SRS.md`.
- Confirmed scope: `docs/PHASE_11_SCOPE.md`.
- Claimed implementation: `docs/PHASE_11_COMPLETION_REPORT.md`.
- Reviewed implementation: analytics service, schemas, domain permissions, API routes, export route, reports UI, export-permission migration, and Phase 11 tests.
- Review-only constraint observed: no application feature or frozen SRS change was made.

## Requirement-by-requirement assessment

| Area                          | Status                     | Review result                                                                                                                                                                                                           |
| ----------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Analytics metrics/KPIs        | PARTIAL / DEFECTIVE        | Recruitment reuse is generally coherent, but candidate no-shows, stage conversion, historical workforce values, leave balances, salary components, and temporal trends have material defects or incomplete definitions. |
| Cross-domain aggregation      | PARTIAL                    | All required enabled domains have an API path, but several domain calculations do not faithfully aggregate their persisted source.                                                                                      |
| Date filtering                | DEFECTIVE                  | UTC boundaries are hardcoded; several metrics use the wrong event date or ignore the selected period.                                                                                                                   |
| Required filters/dimensions   | PARTIAL                    | Date and department controls exist; `employeeId` is API-only, and accepted filters are silently ignored by several domains.                                                                                             |
| Server-side aggregation       | PARTIAL                    | Security filtering is server-side, but large datasets are loaded with unbounded `findMany` calls and grouped in application memory.                                                                                     |
| Tables/charts                 | IMPLEMENTED TO SRS MINIMUM | Responsive tables/cards exist. The SRS does not explicitly require a chart library or a particular chart type.                                                                                                          |
| Drill-downs                   | PARTIAL / DEFECTIVE        | Links exist, but hash-fragment links lose tenant context and drill-downs do not preserve active date/dimension filters.                                                                                                 |
| Exports                       | PARTIAL                    | CSV is authorized, tenant-scoped, filtered through the same service, and audited; incorrect source metrics are exported unchanged, and UI exposes export links before checking export permission.                       |
| RBAC                          | DEFECTIVE                  | Resource permissions are checked, but manager team scope and recruiter assignment scope are not enforced in analytics queries.                                                                                          |
| Tenant isolation              | PARTIAL                    | Organization predicates and active membership checks are present and tested; some drill-down URLs omit the tenant query due to fragment handling.                                                                       |
| Audit logging                 | IMPLEMENTED WITH LOW GAP   | Successful exports are audited. Denied export attempts are not recorded as failed outcomes.                                                                                                                             |
| API contracts                 | PARTIAL                    | Versioned routes, validation, standard envelopes, and permissions exist; filter applicability is not domain-specific.                                                                                                   |
| Empty/loading/error states    | IMPLEMENTED                | Loading, permission/error, empty, and populated states exist.                                                                                                                                                           |
| Performance/query efficiency  | DEFECTIVE                  | No N+1 loop was found, but several full-table reads and in-memory groupings violate the intended scalable aggregate-query approach.                                                                                     |
| PostgreSQL persistence        | VERIFIED                   | Metrics use real Prisma/PostgreSQL records; fresh connectivity and persisted E2E passed.                                                                                                                                |
| Security                      | PARTIAL / DEFECTIVE        | Authentication and tenant predicates pass, but actor-specific manager/recruiter scope is absent.                                                                                                                        |
| Unit/API coverage             | INSUFFICIENT               | Only two generic rate helpers and route mocks are directly tested; most required formulas and data semantics have no service-level tests.                                                                               |
| Persisted Playwright coverage | PARTIAL                    | One persisted test covers workforce, attendance, leave, export, basic RBAC, and tenant isolation; required HR/payroll/audit and affected edge cases are not covered.                                                    |
| Full Phase 0–10 regression    | VERIFIED                   | Fresh 12/12 Playwright suite passed.                                                                                                                                                                                    |

## Findings

### F-11-01 — Candidate no-show metric reads the wrong source and candidate metrics are capped

- **SRS reference:** §21, lines 1676–1679; §29, line 2435; AC-12, lines 2582–2588.
- **Severity:** HIGH.
- **Classification:** APPLICATION DEFECT.
- **Current implementation:** `src/modules/analytics/service.ts:159-164` loads at most 100 `CandidateVisit` rows. Lines 186–190 derive every candidate-attendance metric from that truncated array, and line 188 counts `CandidateVisit.status === "NO_SHOW"`.
- **Evidence:** The implemented no-show workflow writes `Interview.status = "NO_SHOW"`; no production path writes `CandidateVisit.status = "NO_SHOW"`. The existing Phase 10 recruitment dashboard correctly counts no-shows from `Interview`.
- **Expected behavior:** Candidate attendance and no-show totals must use the authoritative persisted sources and include all records in the selected tenant/date scope. Pagination may limit displayed history, but it must not truncate aggregate totals.
- **Recommended remediation:** Aggregate no-shows from tenant/date-scoped interviews, aggregate visit counts in the database, and paginate only separate visit-history detail rows. Add tests with no-show interviews and more than 100 visits.

### F-11-02 — Payroll salary-component analytics always omit the persisted component structure

- **SRS reference:** §21, lines 1706–1709.
- **Severity:** HIGH.
- **Classification:** APPLICATION DEFECT.
- **Current implementation:** `src/modules/analytics/service.ts:324-330` processes components only when the JSON value is an object and explicitly excludes arrays.
- **Evidence:** Payroll persists `components` as an array of `{name, type, amount}` entries; the existing payroll report correctly iterates that array in `src/modules/payroll/service.ts:521-524`.
- **Expected behavior:** Salary-component totals must aggregate persisted component arrays consistently with the payroll module.
- **Recommended remediation:** Reuse the existing payroll component aggregation or a shared typed helper. Add persisted and unit assertions for addition and deduction components.

### F-11-03 — Required attendance and leave trends are not temporal trends

- **SRS reference:** §21, lines 1688–1697; §29, lines 2447–2450.
- **Severity:** HIGH.
- **Classification:** MISSING / APPLICATION DEFECT.
- **Current implementation:** Attendance `statusTrends` (`service.ts:175`) and leave `requestTrends` (`service.ts:234`) are single status-frequency tables across the whole period. No date bucket is returned.
- **Expected behavior:** “Trends” must represent change over time within the selected period, using the required attendance states and leave utilization/request data. The SRS does not prescribe daily/weekly/monthly granularity, so the remediation must document a conservative project interpretation rather than invent business policy.
- **Recommended remediation:** Define and document a period-appropriate, deterministic date bucket; aggregate in PostgreSQL/server-side; test empty buckets and period boundaries.

### F-11-04 — Date filtering hardcodes UTC and uses inconsistent business event dates

- **SRS reference:** §25.2, line 2063; §27 Localization, lines 2279–2282; Phase 11 scope §5.
- **Severity:** HIGH.
- **Classification:** APPLICATION DEFECT.
- **Current implementation:** `service.ts:18-26` always converts date filters to UTC midnight/23:59:59.999 without organization timezone. Workforce current headcount and leaver count do not honor the selected period; onboarding metrics filter `createdAt` rather than completion/readiness events (`service.ts:246-260`); payroll results filter `createdAt` while runs filter `periodStart` (`service.ts:310-320`); leave approval cycle selection is based on leave occurrence dates rather than decision dates (`service.ts:200-230`).
- **Expected behavior:** Date boundaries must follow organization/user timezone policy and each KPI must consistently use its documented source event across API, UI, and export.
- **Recommended remediation:** Introduce one organization-timezone-aware range utility, document each metric's event date, and test boundary records around local midnight and daylight-offset changes where applicable.

### F-11-05 — Historical workforce and leave-balance metrics ignore the selected period

- **SRS reference:** §21, lines 1682–1697; §29, lines 2450–2459; Phase 11 scope §§3–5.
- **Severity:** HIGH.
- **Classification:** APPLICATION DEFECT.
- **Current implementation:** Workforce loads all employee records without an as-of filter (`service.ts:83-100`), counts every currently inactive/exited record as a leaver (`105`), and computes current-state headcount (`115`). Leave balances load and sum every balance period regardless of selected dates/year (`215-237`).
- **Expected behavior:** Time-based workforce and leave metrics must correspond to the selected reporting period. Headcount/as-of behavior and turnover denominator are acknowledged SRS ambiguities, but the implementation must select and document a consistent interpretation backed by employee history, not silently ignore the period.
- **Recommended remediation:** Use employee status/history timestamps for as-of/joiner/leaver calculations and scope balances by the selected year/period. Add historical-period and multi-year balance tests.

### F-11-06 — Candidate “conversion rate by stage” is a current-status distribution

- **SRS reference:** §29, line 2432.
- **Severity:** MEDIUM.
- **Classification:** SCOPE MISINTERPRETATION / APPLICATION DEFECT.
- **Current implementation:** `service.ts:71-73` divides the number currently in each stage by all applications. This is a pipeline distribution, not necessarily conversion through/to a stage.
- **Expected behavior:** The SRS requires candidate conversion rate by stage but does not define the denominator/event history. The project must explicitly define the supported interpretation and ensure it represents conversion rather than relabeling a status distribution.
- **Recommended remediation:** Establish a documented SRS-compatible definition using available application history, or formally flag the source-data limitation. Do not invent a funnel formula silently.

### F-11-07 — Manager team scope and recruiter assignment scope are not enforced

- **SRS reference:** Role model lines 1055–1061 and 1082–1088; §4.1 lines 1133–1139; Phase 11 scope §§9–10.
- **Severity:** HIGH.
- **Classification:** SECURITY / AUTHORIZATION DEFECT.
- **Current implementation:** APIs check static resource permissions, then analytics services receive only `organizationId` and filters. They do not receive the actor or derive team/assigned-position scope. A manager with `attendance.read`/`leave.read` can receive organization-wide analytics; a recruiter with recruitment permissions receives all organization recruitment aggregates.
- **Expected behavior:** Managers must be limited to their team and recruiters to records within their assigned permission scope, while HR roles may have organization-wide scope according to assigned permissions.
- **Recommended remediation:** Resolve actor-specific data scope server-side and pass an enforced scope object into every query/export. Add manager non-report and recruiter unassigned-position negative tests.

### F-11-08 — Hash-fragment drill-downs omit tenant context and active filters are not preserved

- **SRS reference:** §28, line 2300; FR-002, line 1256; Phase 11 scope §§5, 8, and 10.
- **Severity:** HIGH.
- **Classification:** APPLICATION / TENANT-CONTEXT DEFECT.
- **Current implementation:** `src/app/hr/reports/page.tsx:19` appends `?organizationId=...` after the complete path. For `/hr/recruitment/dashboard#open-positions` and `/hr/payroll#expenses`, the query is placed after `#`, so it is a fragment and is not sent to the server/page query parser. Lines 29 and 58 also do not carry active date/department filters into source drill-downs.
- **Expected behavior:** Tenant query/context must precede any fragment, and drill-downs must retain the active tenant, date, metric, and explicit dimension scope so source records reconcile with the metric.
- **Recommended remediation:** Build URLs with the URL/URLSearchParams API, preserve fragments separately, map active supported filters into target routes, and test both fragment links.

### F-11-09 — Filter contract is global but several domains silently ignore accepted filters

- **SRS reference:** §28, line 2303; Phase 11 scope §§4–6.
- **Severity:** MEDIUM.
- **Classification:** API CONTRACT DEFECT.
- **Current implementation:** One schema accepts `department` and `employeeId` for every domain. Recruitment, HR, and audit ignore both; payroll ignores department; candidate-attendance portions ignore employee/department. The UI sends department to every selected domain and does not expose the supported employee filter.
- **Expected behavior:** A domain must apply an accepted filter consistently or reject it as unsupported. UI, API, export, and aggregation semantics must match.
- **Recommended remediation:** Define domain-specific query schemas/capabilities, show only applicable controls, expose required employee filtering where applicable, and add API tests proving each filter changes or is rejected by each domain.

### F-11-10 — Analytics queries do not meet the confirmed scalability approach

- **SRS reference:** §27 Performance/Scalability, lines 2225–2234; Phase 11 scope §§7 and 13.
- **Severity:** MEDIUM.
- **Classification:** PERFORMANCE DEFECT.
- **Current implementation:** Workforce, attendance, leave, HR, payroll, and audit load potentially all matching rows with unbounded `findMany` and group/sum in Node memory. Candidate visits are instead capped, causing wrong totals. No N+1 query loop was found, but neither approach satisfies scalable, exact aggregation.
- **Expected behavior:** Exact metrics should use database aggregate/group queries; detail/history rows should be independently paginated and bounded.
- **Recommended remediation:** Move counts/sums/grouping to Prisma/PostgreSQL aggregate queries, inspect query plans and tenant/date indexes, and load detail records only for paginated drill-downs.

### F-11-11 — Test coverage does not exercise most required formulas or discovered edge cases

- **SRS reference:** §31.5, line 773; Phase 11 scope §14.
- **Severity:** HIGH.
- **Classification:** TEST COVERAGE DEFECT.
- **Current implementation:** Unit tests cover only generic attendance/completion percentages, query validation, and CSV flattening. API tests mock the analytics service. The persisted E2E verifies one workforce employee, one attendance row, one leave balance/request, and workforce export; it does not verify candidate no-show, >100 visits, temporal trends, salary components, onboarding/HR KPIs, payroll analytics, audit analytics, local-time boundaries, historical headcount, multi-year balances, manager team scope, or recruiter assignment scope.
- **Expected behavior:** Critical formulas, date boundaries, filtering, empty periods, RBAC scopes, tenant isolation, drill-down authorization, and enabled-domain persisted outputs must be tested.
- **Recommended remediation:** Add service-level repository fixtures for every required KPI and persisted browser/API coverage for the HIGH defects before relying on the green gate.

### F-11-12 — Export control is secure server-side but UI permission awareness and failed-attempt audit are incomplete

- **SRS reference:** §4.1, line 1145; §23, lines 1769–1778; Phase 11 scope §11.
- **Severity:** LOW.
- **Classification:** UX / AUDIT CONSISTENCY GAP.
- **Current implementation:** The UI shows an export link whenever analytics read succeeds, even when the user lacks `reports.export`; the server correctly returns 403. Denied export attempts are not persisted as failure audit outcomes.
- **Expected behavior:** Export availability should reflect authorization where permitted by the existing session capability model, and audit policy should consistently decide whether denied sensitive export attempts are retained.
- **Recommended remediation:** Return/export capability metadata or expose a permission-aware control; record failed attempts if required by the existing security audit policy, without logging report content.

### F-11-13 — BullMQ/Valkey optional dependency warning

- **SRS reference:** §27 Maintainability/Observability, lines 2261–2270.
- **Severity:** LOW.
- **Classification:** INFORMATIONAL / NON-BLOCKING.
- **Current implementation:** Production build warns that BullMQ's optional `@valkey/valkey-glide` module cannot be resolved through `valkey-glide-client.js`. Compilation, type validation, route generation, Redis readiness, and the full test suite pass. The application uses the existing Redis/ioredis path.
- **Expected behavior:** A warning alone is not a Phase 11 failure when the selected Redis client path is operational.
- **Recommended remediation:** Track during dependency maintenance; confirm tree-shaking/optional-peer behavior and install Valkey Glide only if the project intentionally selects that client. Do not add it solely to silence an unused optional-path warning.

## Positive security and implementation findings

- Authenticated tenant context is membership-validated before analytics access.
- Every inspected analytics query includes `organizationId`.
- Static domain permissions are enforced before aggregation.
- Export adds independent `reports.export` authorization.
- Export uses the same tenant/query service and records a successful audit event.
- Unknown query keys and reversed date ranges are rejected.
- Cross-tenant and unauthorized route tests pass.
- No client-side dataset aggregation or client-side tenant filtering was found.
- No new analytics source-of-truth table or mock production metric was introduced.
- No N+1 query loop was found.

## Fresh validation results

All checks below were run fresh during this review on 2026-08-19.

| Check                   | Result            | Evidence                                                                            |
| ----------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| Lint                    | PASS              | `npm run lint` exited 0                                                             |
| Typecheck               | PASS              | `npm run typecheck` exited 0                                                        |
| Unit/API tests          | PASS              | 24 files, 88 tests                                                                  |
| Full Playwright         | PASS              | 12/12 persisted/browser tests in approximately 4.5 minutes                          |
| Production build        | PASS WITH WARNING | 84 pages generated; BullMQ optional Valkey warning                                  |
| Prisma validation       | PASS              | Schema valid                                                                        |
| Migration status        | PASS              | 15 migrations; database up to date                                                  |
| Migration diff          | PASS              | No difference detected                                                              |
| Health                  | PASS              | `/api/health` HTTP 200                                                              |
| Readiness               | PASS              | `/api/ready` HTTP 200; database OK; Redis OK                                        |
| PostgreSQL verification | PASS              | Connected to `hr_portal` at localhost:5433; live organization and audit counts read |
| Redis verification      | PASS              | Readiness reports Redis OK                                                          |
| SRS integrity           | PASS              | Frozen SRS was not modified by this review                                          |

Fresh test warnings also included Next.js development cross-origin guidance, `NO_COLOR` notices, and one development-process listener warning. They did not fail tests and are not Phase 11 application blockers.

## Required remediation before Phase 12

1. Correct candidate-attendance/no-show sources and remove aggregate truncation.
2. Correct payroll component aggregation.
3. Implement actual time-based attendance and leave trends.
4. Make date boundaries timezone-aware and align every KPI with its correct event date.
5. Correct historical workforce and period-scoped leave-balance calculations.
6. Define and correctly implement stage conversion semantics.
7. Enforce manager team and recruiter assignment scope server-side in analytics and exports.
8. Fix fragment drill-down tenant context and preserve active filters.
9. Make filter contracts domain-specific and consistent across UI/API/export.
10. Replace unbounded in-memory aggregation with exact database aggregation where feasible.
11. Add formula, boundary, high-volume, RBAC-scope, and enabled-domain persisted regression tests.

## Phase 11 exit criteria

Phase 11 can be declared ready only when all HIGH and MEDIUM findings above are resolved, metric definitions are documented without inventing SRS policy, affected persisted tests pass, the full Phase 0–11 regression remains green, and the frozen SRS remains unchanged.

**Final decision: PHASE 11 NOT READY FOR PHASE 12**
