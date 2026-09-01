# Triple Minds Local Seed

The project includes an idempotent development seed at `prisma/seed.cjs`.

Run:

```text
npm run db:seed
```

The seed creates or updates:

- Triple Minds organization (`triple-minds`)
- Local HR administrator membership with the declared permission catalog
- Three published requisitions across People Operations, Engineering, and Customer Success
- Eight sample candidates across applied, screening, shortlisted, interview, selected, hold, and rejected states
- Linked applications with online, referral, LinkedIn, and walk-in sources

Defaults are intended for local development only:

- Email: `admin@tripleminds.test`
- Password: `TripleMindsLocal!2026`

Override them with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `.env.local`. The seed refuses to run when `NODE_ENV=production` and never deletes or resets existing records.
