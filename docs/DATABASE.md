# Database

The application uses PostgreSQL through Prisma. The authoritative schema is `prisma/schema.prisma`, and deployable changes are stored under `prisma/migrations`.

## Phase 7 leave management

Migration `20260818233000_phase7_leave_management` adds:

- `LeaveType` for tenant-scoped policy, eligibility, allocation, accrual metadata, carry-forward, and approval configuration;
- `LeaveBalance` for employee/type/year allocations and usage;
- `LeaveBalanceTransaction` for allocation, usage, and carry-forward history with actor attribution;
- `LeaveRequest` for dates, duration, reason, optional stored-object metadata, workflow state, and decision data;
- `LeaveApproval` for ordered manager/HR decisions and reasons;
- `LeaveNotification` for persisted employee and approver workflow notifications.

Organization IDs are stored on all aggregate and transaction records. Employee/type/year balances are unique, and leave type codes are unique within an organization. Request approval, balance usage, attendance impact, notifications, and audit events are committed transactionally.

## Phase 8 documents and notifications

Migration `20260818170000_phase8_documents_notifications` adds:

- `ManagedDocument` and `DocumentVersion` for tenant/owner metadata, ordered versions, expiry, retention, archive, and soft-delete state;
- `AppNotification` for user-scoped in-app state and configured channel intent;
- `Reminder` with an organization/user/source/due-time uniqueness key for idempotent scheduled-event generation;
- `WorkflowTask` for assigned task status, due date, source workflow, priority, and completion actor;
- `WorkflowRule` as the tenant-scoped event/action configuration foundation required by the event-driven workflow architecture.

Document metadata and version audit events are committed with their business mutations. Reminder and notification records are also atomic, so a required notification write cannot silently diverge from its reminder.
