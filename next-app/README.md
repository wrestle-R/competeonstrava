# Compete on Strava

Next.js app for the Robinsonites Strava challenge.

## Environment

Use `.env` or `.env.local` with:

```bash
DATABASE_URL=...
POSTGRES_URL=...
NEXT_PUBLIC_APP_URL=http://localhost:3000

RUSSEL_CLIENT_ID=...
RUSSEL_CLIENT_SECRET=...
CHRISO_CLIENT_ID=...
CHRISO_CLIENT_SECRET=...
```

## Database

This app uses direct Postgres via `pg`, not Prisma.

```bash
npm install
npm run db:migrate
```

## Routes

- `/` leaderboard from Postgres
- `/auth` Strava connect/reconnect page
- `/refresh` manual sync page
