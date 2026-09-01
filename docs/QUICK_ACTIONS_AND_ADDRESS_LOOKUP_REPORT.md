# Quick Actions and Address Lookup Report

Date: 2026-08-20
Source: the attached Triple Minds HR quick-actions/address-lookup brief. `docs/SRS.md` was not modified.

## Quick actions

| Action | Route wired | Workflow |
|---|---|---|
| Add Candidate | `/hr/candidates/new` | Opens the HR chooser for the two real intake links below. |
| Schedule Interview | `/hr/interviews/new` | Existing interview scheduling form and API validation. |
| Create Offer | `/hr/offers` | Existing offer template/creation/approval/send workflow. |
| Add Employee | `/hr/candidates?status=SELECTED` | Existing selected-candidate conversion path; no duplicate employee model or fake page. |
| Start Onboarding | `/hr/onboarding` | Existing persisted onboarding workflow. |
| Run Payroll | `/hr/payroll` | Existing controlled payroll workspace; navigation does not execute payroll. |

All cards remain real keyboard-accessible links with existing icon, title, description, hover/focus styling, and arrow affordance. No organization or tenant identifier is included in quick-action URLs.

## Candidate intake links

The Add Candidate chooser now exposes two hiring-first forms:

| Form | Shareable route | Workflow |
|---|---|---|
| Social media hiring form | `/apply` | Redirects to the Triple Minds public application form, which loads published positions server-side and accepts resume/supporting documents. |
| Walk-in form | `/walk-in` | Public QR/link form with the walk-in field set, published-position selection, and email/mobile matching for prefill when an earlier submission exists. |

The authenticated HR-only walk-in form remains available at `/hr/candidates/new/walk-in`. Public submissions use the existing candidate intake service, validation, rate limiting, notifications, audit behavior, and tenant ownership checks. No organization ID is required in the user-facing links.

The chooser now includes a working share panel: HR can choose either form, optionally lock it to a published position, copy the generated URL, use the browser share action, open it in a new tab, or display a QR code for the walk-in flow. The selected requisition is preserved in the URL and preselected on the public form.

## Address lookup

Added `POST /api/v1/address/postal-code` and wired a `Use my current location` control into both candidate forms.

The endpoint:

- validates either a postal code or browser-provided GPS coordinates with Zod;
- reads `GOOGLE_MAPS_API_KEY` only from server environment configuration;
- calls Google Geocoding server-side with an 8-second timeout for postal or reverse-GPS lookup;
- returns only application fields: city, state, country, formatted address, coordinates, postal code, and locations;
- reports multiple results without silently choosing a locality;
- returns a safe not-found message for zero results;
- returns 422 for invalid input and 503 for missing configuration/provider failure;
- never returns the provider key or raw provider error.

The candidate form asks for explicit confirmation before requesting GPS permission, populates only currently blank address fields, preserves manual corrections, shows loading feedback, and permits manual entry when lookup is unavailable.

## Configuration

Set `GOOGLE_MAPS_API_KEY` in the local environment to enable live lookup. The key is not committed and is not exposed to browser code. Without it, the endpoint intentionally returns a controlled 503; no fake location is shown.

## Validation

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm test -- --run`: 27 test files, 103 tests passed; focused tests cover Google success, missing configuration, invalid input, and existing hiring workflows.
- `npm run build`: PASS with the existing optional Valkey native-module warnings after a clean `.next` build.
- Live Google lookup: not claimed because `GOOGLE_MAPS_API_KEY` is not configured in the local environment.

## Files changed

- `src/app/hr/dashboard/page.tsx`
- `src/app/hr/candidates/new/page.tsx`
- `src/app/hr/candidates/new/walk-in/page.tsx`
- `src/app/apply/page.tsx`
- `src/app/apply/[organizationSlug]/page.tsx`
- `src/app/walk-in/page.tsx`
- `src/app/api/v1/public/walk-in-candidates/route.ts`
- `src/app/api/v1/public/candidates/match/route.ts`
- `src/components/candidates/CandidateForm.tsx`
- `src/modules/candidates/schemas.ts`
- `src/modules/candidates/service.ts`
- `src/app/api/v1/address/postal-code/route.ts`
- hiring detail/list routes cleaned to use authenticated tenant context without user-facing organization IDs
- supporting tests and audit reports

## Known limitations

Google live behavior requires a valid restricted API key and provider access. Places Autocomplete was not added because postal-code lookup is the smallest integration needed by the existing form.
