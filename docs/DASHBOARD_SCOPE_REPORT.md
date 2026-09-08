# Dashboard Scope Report

Date: 2026-08-19  
Decision type: pre-Phase 10 documentation-only scope check  
Authoritative source: `docs/SRS.md` (frozen)

## Scope decision

The frozen SRS explicitly identifies three dashboard capabilities:

1. an **HR dashboard and action center**;
2. **recruitment dashboards** for recruitment users, including Recruiters; and
3. a cross-domain **Reports & Analytics / operational dashboard** capability, scheduled by the SRS roadmap for Phase 11.

The SRS does **not** explicitly require a separate dedicated Employee dashboard, Manager dashboard, or standalone Organization/Super Administrator dashboard. It requires role-specific employee, manager, and administrator web experiences and workflow access, but that wording does not authorize inventing dedicated dashboard products or widgets.

## Summary matrix

| Requested dashboard |                                        Explicit dedicated dashboard requirement? | Current status                                      |
| ------------------- | -------------------------------------------------------------------------------: | --------------------------------------------------- |
| HR/Admin dashboard  | **Yes for HR dashboard/action center; no separate Admin dashboard is specified** | PARTIAL                                             |
| Employee dashboard  |                                 No; employee self-service experience is required | Not applicable as a dedicated-dashboard requirement |
| Recruiter dashboard |                      Yes, through the SRS requirement for recruitment dashboards | MISSING                                             |
| Manager dashboard   |                                       No; team-management workflows are required | Not applicable as a dedicated-dashboard requirement |
| Analytics dashboard |                         Yes; cross-domain operational dashboards with drill-down | PARTIAL and roadmap-deferred to Phase 11            |

## 1. HR dashboard and action center

**SRS references**

- Scope §3.1, source P306, `docs/SRS.md:917`: “HR dashboard and action center.”
- Product objective, source P300, `docs/SRS.md:899`: timely dashboards, alerts, approvals, reports, and audit history for HR.
- UX §28.1, sources P779-P780, `docs/SRS.md:2336-2339`: Dashboard navigation with “Overview, alerts, tasks, KPIs.”
- Notifications §20, FR-260 and FR-263, `docs/SRS.md:1646-1655`: in-app notification center and an HR task center with status, due date, and source workflow.
- UX §28, source P767, `docs/SRS.md:2300`: dashboard widgets must drill down to underlying records.

**Required purpose**

Provide HR with an organization-scoped operational overview and action center for alerts, assigned work, approvals, reports, and traceable navigation into the source records.

**Required widgets/metrics**

Only the following dashboard categories are explicitly stated:

- overview;
- alerts;
- tasks;
- KPIs.

The KPI values may be drawn only from the SRS Reporting KPI list and enabled modules. The SRS does not prescribe an exact card count, layout, chart type, or ordering.

**Required actions**

- open actionable notifications;
- view assigned tasks with status, due date, and source workflow;
- reach pending approvals and relevant reports;
- drill down from dashboard widgets to the underlying authorized records.

**Required RBAC**

- Deny-by-default, resource/action RBAC applies.
- HR Administrator access covers full HR workflows, employee records, recruitment, attendance, leave, documents, and reports (`docs/SRS.md:1037-1043`).
- HR Manager access covers approvals, reporting, workforce/recruitment oversight, with configurable sensitive-field access (`docs/SRS.md:1046-1052`).
- Organization/Super Administrators receive only their separately authorized administration/system access; the SRS does not grant every HR metric or sensitive field merely because a user is an administrator.
- Each alert, task, approval, KPI, and drill-down target must enforce its own underlying permission.

**Required tenant scope**

All dashboard queries, counts, tasks, alerts, and drill-down links must be scoped to the authenticated user's active organization membership. Platform-level Super Administrator access must remain distinct from tenant HR data access.

**Current implementation status: PARTIAL**

- Implemented foundations include `/hr/notifications`, `/api/v1/notifications`, `/api/v1/tasks`, authenticated tenant context, RBAC, and source workflow pages.
- `/hr/notifications` is presented as an “Action center.”
- There is no dedicated HR overview/dashboard route combining overview, alerts, tasks, and permitted KPIs.
- The authenticated root currently routes to the candidate workspace, not an HR dashboard.
- Therefore the action-center foundation exists, but the explicit HR dashboard is not complete.

**Admin clarification**

The SRS defines Super Administrator and Organization Administrator responsibilities (`docs/SRS.md:1019-1034`) but does not explicitly define a separate Admin dashboard or its widgets. A future HR dashboard may be accessible to authorized administrators, but a standalone Admin dashboard must not be inferred from the frozen SRS.

## 2. Employee dashboard

**Explicit SRS requirement: NO dedicated dashboard**

**Relevant SRS references**

- Frontend web experiences, source P100, `docs/SRS.md:299`: employee web experience.
- Employee role, sources P364-P366, `docs/SRS.md:1091-1097`: self-service access to own profile, attendance, leave, documents, requests, and authorized self-service functions.

**Required purpose, widgets, metrics, and actions**

The SRS requires employee self-service workflows, not a dedicated Employee dashboard. It does not state employee dashboard widgets or dashboard metrics. Required self-service actions remain governed by their individual functional requirements, including own-profile, attendance, leave, document, request, payslip, and expense functions when enabled.

**Required RBAC and tenant scope**

- Employee access is limited to the authenticated employee's own permitted records.
- HR-managed and sensitive fields remain protected.
- Active organization membership and server-derived employee identity are required.
- Cross-employee and cross-tenant access must be rejected.

**Current implementation status**

Not applicable as a dedicated-dashboard requirement. Employee self-service is distributed across implemented workflow pages/APIs such as leave and payroll. Those pages do not establish an SRS requirement for a consolidated Employee dashboard.

## 3. Recruiter / recruitment dashboard

**SRS references**

- Roadmap, source P240, `docs/SRS.md:719`: Phase 2 includes “recruitment dashboards.”
- Recruiter role, sources P352-P354, `docs/SRS.md:1055-1061`: jobs, candidates, applications, interview scheduling, candidate notes, and offers within permission scope.
- Reports & Analytics, sources P557-P558, `docs/SRS.md:1670-1673`: recruitment metrics.
- Reporting KPIs, `docs/SRS.md:2426-2438` and `docs/SRS.md:2468`: time to hire, time to fill, stage conversion, interview no-show rate, offer acceptance rate, and recruitment source effectiveness.
- UX drill-down, `docs/SRS.md:2300`.

**Required purpose**

Give authorized recruitment users an organization-scoped view of recruitment pipeline health and allow drill-down into the corresponding requisitions, jobs, candidates, applications, interviews, and offers.

**Required widgets/metrics**

The SRS explicitly lists:

- applications;
- pipeline counts;
- source effectiveness;
- time to hire;
- time to fill;
- candidate conversion rate by stage;
- interview pass rate;
- interview no-show rate;
- offer acceptance rate;
- open positions.

No additional recruiter widgets, targets, forecasting, chart styles, or rankings are authorized by this report.

**Required actions**

- drill down from a metric to its underlying authorized recruitment records;
- navigate to jobs/requisitions, candidates/applications, interviews, and offers within the user's scope;
- use existing recruitment workflow actions only where separately permitted.

The dashboard requirement does not itself grant create, edit, stage-transition, interview, offer, or export permissions.

**Required RBAC**

- Recruiter access is limited to recruitment records and actions within permission scope.
- Hiring Manager, Interviewer, HR Manager, and HR Administrator views/actions remain separately permissioned.
- Sensitive candidate fields, exports, hiring decisions, offers, and compensation data require their corresponding permissions.

**Required tenant scope**

All recruitment aggregates and drill-down records must be limited to the active organization. Assigned-record or position scope must be applied where configured. Cross-tenant identifiers and counts must be rejected and must not influence totals.

**Current implementation status: MISSING**

- Recruitment workflows and source data routes exist for candidates, interviews, hiring decisions, and offers.
- No dedicated recruitment dashboard route or recruitment aggregate/dashboard API was found.
- The candidate-list workspace is a workflow page, not the SRS-required recruitment dashboard.

## 4. Manager dashboard

**Explicit SRS requirement: NO dedicated dashboard**

**Relevant SRS references**

- Frontend web experiences, source P100, `docs/SRS.md:299`: manager web experience.
- Manager role, sources P361-P363, `docs/SRS.md:1082-1088`: team attendance, leave approvals, performance, and limited employee information.
- Hiring Manager role, sources P358-P360, `docs/SRS.md:1073-1079`: assigned-position requisitions, shortlist review, interview feedback, and approvals.

**Required purpose, widgets, metrics, and actions**

The SRS requires manager and hiring-manager workflows but does not specify a dedicated Manager dashboard or dashboard widgets. Team attendance, leave approvals, performance, limited employee information, assigned-position hiring work, and approvals must be provided through authorized workflow surfaces; they must not be expanded into invented dashboard metrics.

**Required RBAC and tenant scope**

- Managers are restricted to their authorized team/organizational hierarchy.
- Hiring Managers are restricted to assigned positions and associated records.
- Self-approval and unauthorized team, employee, candidate, compensation, or cross-tenant access must be rejected.

**Current implementation status**

Not applicable as a dedicated-dashboard requirement. Manager-relevant workflow pages and APIs exist in parts, but the frozen SRS does not require them to be consolidated into a Manager dashboard.

## 5. Reports & Analytics dashboard

**SRS references**

- Roadmap, source P249, `docs/SRS.md:746`: Phase 11 includes recruitment, workforce, attendance, leave, payroll, and HR operational dashboards with drill-down.
- Reports & Analytics §21, `docs/SRS.md:1661-1715`: required metric domains and values.
- Recommended navigation, sources P797-P800, `docs/SRS.md:2396-2399`: Reports & Analytics navigation for Recruitment, Workforce, Attendance, Leave, and HR KPIs.
- Reporting KPIs §29, `docs/SRS.md:2423-2468`.
- UX drill-down, `docs/SRS.md:2300`.
- Phase 9 scope exclusion, `docs/PHASE_9_SCOPE.md:305-306`: Phase 11 advanced analytics is outside Phase 9 except the explicitly required Phase 9 payroll/expense metrics.

**Required purpose**

Provide authorized HR/management users with organization-scoped operational reporting across enabled HR domains and permit drill-down from dashboard values to the source records.

**Required widgets/metrics**

Only the SRS-listed metrics are in scope:

- Recruitment: applications, pipeline counts, source effectiveness, time to hire, interview pass rate, offer acceptance rate, open positions, time to fill, stage conversion, and no-show rate.
- Candidate attendance: interview attendance, no-shows, check-in volumes, visit history.
- Workforce: headcount, department distribution, employment type, tenure, joiners/leavers, turnover/attrition, and probation completion/confirmation.
- Attendance: present/absent/late/WFH/overtime trends, department comparisons, correction volumes, attendance rate, and absenteeism.
- Leave: utilization, balances, trends, approval cycle/turnaround time.
- Onboarding: task completion, overdue tasks, document completion, time to readiness, completion rate, and average completion time.
- Payroll/expenses when enabled: payroll totals, salary components, overtime, expense totals, and approval cycle time.
- Performance when enabled: review completion, goal status, and rating trends.
- HR operations: HR request resolution time and document expiry risk count.

No predictive analytics, extra executive metrics, benchmark comparisons, AI insights, chart styles, or custom dashboard builder are inferred.

**Required actions**

- filter/query reports within authorized scope;
- drill down from each dashboard widget to the underlying records;
- export only where a separate export permission permits it;
- retain traceability to source records and audit sensitive exports/downloads.

**Required RBAC**

- Reports and dashboards must be permissioned by domain and action.
- HR Administrator and HR Manager reporting access follows their configured role scope.
- Recruiters, Managers, Finance/Payroll, Auditor/Compliance, and Employees may see only their expressly authorized domains and records.
- Sensitive compensation, employee, candidate, document, and audit data cannot be exposed merely through aggregation or drill-down.

**Required tenant scope**

All aggregate queries, filters, exports, and drill-down targets must be organization-scoped and derived from authenticated tenant context. Aggregates must not count inaccessible or cross-tenant records. Team, assigned-position, self-service, and field-level restrictions continue to apply after drill-down.

**Current implementation status: PARTIAL (roadmap-deferred to Phase 11)**

- Domain reporting foundations exist, including employee-attendance reporting and Phase 9 payroll/expense reports.
- Persisted operational records needed by several future metrics exist across recruitment, attendance, leave, onboarding, and payroll modules.
- No dedicated cross-domain Reports & Analytics dashboard route was found.
- The complete SRS metric set, unified dashboard widgets, and drill-down experience are not implemented.
- This is not a Phase 9 readiness defect: `docs/PHASE_9_SCOPE.md` explicitly places advanced analytics outside Phase 9, and the SRS roadmap assigns operational dashboards to Phase 11.

## Phase boundary conclusion

- The missing HR dashboard/action-center consolidation and recruitment dashboard are existing SRS scope gaps, but this report does not assign them to Phase 10 or authorize implementation.
- The cross-domain analytics dashboard belongs to Phase 11 under the frozen roadmap, except for domain reports already required by earlier phases.
- Phase 10 is defined as Performance, Assets and Learning. A dashboard implementation must not be silently added to Phase 10 without a separate source-grounded phase-scope decision.
- Separate Employee, Manager, and Admin dashboards must not be invented from role/workflow requirements alone.

No application code, database schema, migration, route, or frozen SRS content was changed during this check.

**DASHBOARD SCOPE CONFIRMED**
