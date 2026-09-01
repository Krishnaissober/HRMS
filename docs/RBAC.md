# Phase 1 Candidate Permissions

Candidate permissions are organization-scoped and enforced in route/service code. UI visibility is not an authorization boundary.

| Permission                   | Purpose                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| `candidates.read`            | List and view candidate profiles within the current organization |
| `candidates.create`          | Create an authenticated walk-in candidate                        |
| `candidates.update`          | Reserved for candidate profile updates in this phase boundary    |
| `candidates.status.update`   | Change a candidate through validated supported statuses          |
| `candidates.documents.read`  | Generate an authorized private document download                 |
| `candidates.documents.write` | Generate an authorized private upload URL                        |

Public online intake is intentionally unauthenticated but still requires a valid active organization slug, validates all input, rate-limits submissions, scopes uploaded keys to that organization, and records an audit event after persistence.

Candidate query paths always include the authenticated organization ID. Cross-tenant IDs, documents, status updates and downloads must be rejected by the server.

## Phase 2 Interview Permissions

| Permission              | Purpose                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| `interviews.read`       | View organization-scoped interviews, panels, evaluations and history |
| `interviews.create`     | Create interviews and evaluation templates                           |
| `interviews.update`     | Update interview scheduling, status and panel assignment             |
| `interviews.evaluate`   | Submit an evaluation as an assigned interviewer                      |
| `interviews.attendance` | Record interview candidate check-in/out                              |
| `interviews.schedule`   | Manage interviewer availability windows                              |

## Phase 3 Candidate Attendance Permissions

| Permission                        | Purpose                                                    |
| --------------------------------- | ---------------------------------------------------------- |
| `candidate-attendance.read`       | View tenant-scoped candidate visits and attendance history |
| `candidate-attendance.check-in`   | Check in a candidate or visitor                            |
| `candidate-attendance.check-out`  | Check out a checked-in candidate or visitor                |
| `candidate-attendance.manage`     | Register visitors and assign hosts                         |
| `candidate-attendance.exceptions` | Record attendance exceptions                               |

## Phase 4 Hiring and Offer Permissions

| Permission               | Purpose                                                           |
| ------------------------ | ----------------------------------------------------------------- |
| `hiring-decisions.read`  | View tenant-scoped hiring decisions and actor history             |
| `hiring-decisions.write` | Record Hire, Hold or Reject decisions with required reasons       |
| `offers.read`            | View offers, templates, approvals and private offer downloads     |
| `offers.create`          | Create offer templates and offers from approved hiring decisions  |
| `offers.approve`         | Complete configured offer approval steps                          |
| `offers.send`            | Send approved offers through the configured notification provider |

## Phase 5 Employee and Onboarding Permissions

| Permission                   | Purpose                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| `employees.read`             | View organization-scoped employee profiles and directory                  |
| `employees.create`           | Convert an accepted candidate/application into an employee                |
| `employees.update`           | Update permitted employee profile fields                                  |
| `employees.status.update`    | Change validated employee lifecycle status                                |
| `employees.history.read`     | View employee employment history                                          |
| `onboarding.read`            | View onboarding instances, tasks and progress                             |
| `onboarding.manage`          | Create templates and onboarding instances                                 |
| `onboarding.tasks.complete`  | Complete assigned onboarding tasks                                        |
| `employees.documents.read`   | Download authorized employee onboarding documents                         |
| `employees.documents.write`  | Register validated onboarding document uploads                            |
| `employees.documents.verify` | Verify or reject employee onboarding documents                            |
| `employees.assets.manage`    | Assign onboarding assets                                                  |
| `employees.access.manage`    | Request and update system-access provisioning state                       |
| `employees.mentor.manage`    | Assign same-organization mentors/buddies                                  |
| `employees.self.read`        | View the authenticated employee's permitted profile and document requests |
| `employees.self.update`      | Update permitted self-service fields and submit owned document requests   |

## Phase 6 Employee Attendance Permissions

| Permission                       | Purpose                                                           |
| -------------------------------- | ----------------------------------------------------------------- |
| `attendance.read`                | View tenant-scoped employee attendance and reports                |
| `attendance.check-in`            | Record authenticated employee check-in                            |
| `attendance.check-out`           | Record authenticated employee check-out                           |
| `attendance.manage`              | Manage attendance exceptions, overtime and administrative records |
| `attendance.corrections.request` | Request an attendance correction for the authenticated employee   |
| `attendance.corrections.approve` | Approve or reject tenant-scoped corrections                       |
| `shifts.manage`                  | Create and update organization shifts                             |
| `rosters.manage`                 | Assign shifts and roster periods to employees                     |
| `holidays.manage`                | Create organization holidays                                      |

## Phase 7 Leave Management Permissions

| Permission              | Purpose                                                                   |
| ----------------------- | ------------------------------------------------------------------------- |
| `leave.read`            | View organization-scoped leave requests, balances, history, and calendars |
| `leave.request`         | Submit leave for the authenticated employee identity                      |
| `leave.approve`         | Approve or reject eligible tenant-scoped leave requests                   |
| `leave.types.manage`    | Configure organization leave types and policies                           |
| `leave.balances.manage` | Allocate and adjust employee leave balances                               |
| `leave.carry-forward`   | Execute policy-controlled annual leave carry-forward                      |

Employee self-service routes derive the employee from the authenticated session. Approvers cannot approve their own requests, and every administrative operation verifies organization ownership in the service layer.

## Phase 8 Documents and Notifications Permissions

| Permission           | Purpose                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `documents.read`     | View/download documents permitted by record ownership; without manage permission employees are limited to their own employee record |
| `documents.manage`   | Upload, version, archive, retain, and administer organization-scoped candidate/employee documents                                   |
| `notifications.read` | Read and acknowledge only the authenticated user's notifications                                                                    |
| `tasks.read`         | View only workflow tasks assigned to the authenticated user                                                                         |
| `tasks.manage`       | Assign organization-scoped workflow tasks to active members                                                                         |

Tenant checks are repeated in service queries. A tenant-valid identifier is insufficient by itself: employee document readers must own the employee record unless they hold `documents.manage`.
