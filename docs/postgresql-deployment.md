# PostgreSQL deployment preparation

Local development still uses `prisma/schema.prisma` and the existing SQLite database.
Vercel uses `prisma/postgresql/schema.prisma`, a generated copy of the same models.
No SQLite records are deleted, moved, or uploaded by these scripts.

## Before deploying

1. Create a hosted PostgreSQL database and approve the provider's terms yourself.
2. Set Vercel's `DATABASE_URL` to its PostgreSQL connection URL (including the provider's TLS settings).
3. Set `APP_URL` and `BETTER_AUTH_URL` to the production HTTPS origin.
4. Configure a strong `BETTER_AUTH_SECRET`, and the original `PII_ENCRYPTION_KEY`
   if existing encrypted records will be transferred. Never replace that key blindly.
5. Configure reachable Redis, S3-compatible storage, and email delivery separately.
   Localhost services on a developer PC are not accessible from Vercel.
6. Apply the PostgreSQL baseline only to a new, empty target with
   `npm run prisma:deploy-postgresql`, using that target's connection environment.
   This creates tables, not candidate, employee, or administrator records.
7. Review and test a separate data transfer before switching real users. Freeze local
   writes and create a consistent SQLite backup first; copy records preserving IDs,
   relations, password hashes, and encrypted values. Compare counts and records and
   test authentication before cutover. S3 document objects require separate transfer.
   Do not seed demo users into production or upload an unreviewed HR data dump.

## Build and local development

`vercel.json` runs `npm run build:vercel`. This requires a PostgreSQL URL, verifies
schema synchronization, and explicitly generates the PostgreSQL Prisma client
before Next.js builds. It does not change the database or bypass env validation.

The ordinary local build remains unchanged. If you generate the PostgreSQL client
locally, run `npm run prisma:generate` before returning to SQLite development.
Stop running app processes before changing the generated client.

After model changes run `npm run prisma:prepare-postgresql` and create a new
PostgreSQL migration. Do not overwrite an already applied migration. The SQLite
migration directory and historical recovery migrations are not PostgreSQL deployment
inputs. Preview deployments need their own database and auth origin; do not reuse
production data for branch previews.

## Current boundary

The provider-compatible schema and initial migration are preparation, not proof of
a working cloud deployment. Hosted provisioning, credentials, real-data transfer,
Redis/storage/email connectivity, and end-to-end production verification remain
required before claiming deployment complete.
