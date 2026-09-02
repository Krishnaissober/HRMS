# HRMS frontend

The current Next.js application remains at the repository root during the
phased migration so existing routes and recruitment workflows stay stable.

Frontend-specific code will move here incrementally by module. Frontend calls
to the standalone backend should use `src/lib/backend.ts`.
