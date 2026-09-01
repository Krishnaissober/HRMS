# Triple Minds Single-Company Report

## Summary

The authenticated HRMS entry experience now presents the deployment as **Triple Minds HR**. Organization identifiers are no longer used by the root redirect, shared HR shell navigation, header branding, sidebar branding, primary dashboard links, or the main candidate/employee/attendance screens.

## Changes

- Root redirects now use clean routes such as `/hr/dashboard`.
- Shared sidebar and header navigation no longer append `organizationId` query parameters.
- Visible branding changed from generic HR Portal/PeopleOS labels to Triple Minds HR.
- Login access messaging refers to Triple Minds membership rather than generic organization access.
- HR dashboard and recruitment dashboard links use clean routes.
- Organization ID input fields were removed from the primary candidate, employee, and attendance workflows.
- Application metadata now uses `Triple Minds HR`.

## Internal tenant behavior

The organization and membership database model remains intact. `getAuthenticatedContext` now resolves the authenticated user’s first active membership when no internal organization header is supplied. Explicit `x-organization-id` headers remain supported for server-side tests and controlled internal calls, and membership authorization is still required.

No organization tables, migrations, API authorization rules, RBAC permissions, audit context, or tenant-scoped repositories were removed.

## API and security

- API routes continue to enforce authentication, active membership, RBAC, and organization-scoped queries.
- The browser no longer needs to provide an organization ID for the updated primary workflows.
- Arbitrary organization query parameters are no longer used by the root redirect or shared navigation.

## Affected files

- `src/lib/tenant.ts`
- `src/app/page.tsx`
- `src/app/layout.tsx`
- `src/app/hr/dashboard/page.tsx`
- `src/app/hr/recruitment/dashboard/page.tsx`
- `src/app/hr/candidates/page.tsx`
- `src/app/hr/employees/page.tsx`
- `src/app/hr/attendance/page.tsx`
- `src/components/login-entry.tsx`
- `src/components/layout/hr-frame.tsx`
- `src/components/layout/app-shell.tsx`
- `src/components/layout/header.tsx`
- `src/components/layout/sidebar.tsx`

## Validation

- `npm test -- --run`: 26 files, 98 tests passed.
- `npm run lint`: passed with existing unused-code warnings.
- `npm run typecheck`: passed.
- `npm run build`: passed with the existing optional Valkey native-module warning.
- `docs/SRS.md`: unchanged.

## Known limitation

Several older HR module pages still contain legacy organization-ID form controls or query-derived client state and require a follow-up UI-only pass to reach complete single-company cleanup. The shared shell, root routing, primary dashboard, candidate, employee, and attendance entry surfaces are already clean, while internal tenant enforcement remains active.
