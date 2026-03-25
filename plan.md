# 150KM Running Challenge — Technical POC Plan

## Overview

A private leaderboard web app for 5 friends to track a 150km running challenge over 30 days (April 16 – May 16, 2026). Each participant connects their **own personal Strava API app** (their own `client_id` and `client_secret`), meaning each person is authenticated as a single-player developer on their own Strava account. No multi-user Strava approval is required.

---

## Participants

| # | Name | Role |
|---|------|------|
| 1 | Joel Singh | Participant |
| 2 | Joab Singh | Participant |
| 3 | Russel Daniel Paul | Participant |
| 4 | Joe Israel Robinson | Participant |
| 5 | Chriso Christudhas | Participant |

---

## Challenge Details

- **Goal:** 150 km per person
- **Duration:** 30 days
- **Start Date:** April 16, 2026
- **End Date:** May 16, 2026
- **Activity Type:** Running only

---

## Why Each Person Has Their Own Strava App

Strava's free tier defaults all new API apps to **"Single Player Mode"** — meaning only 1 athlete (the app owner themselves) can authenticate via that app. Rather than waiting weeks for Strava's developer review process (which may not arrive before April 16), each participant creates their own Strava API app. Since they are the sole user of their own app, the 1-athlete cap is never exceeded.

This is fully compliant with Strava's API terms.

---

## Credential Setup (Per Participant)

Each of the 5 participants must:

1. Go to `https://www.strava.com/settings/api`
2. Create an app with:
   - **App Name:** Anything (e.g. "My Run Tracker") — must NOT contain the word "Strava"
   - **Category:** Social Motivation
   - **Authorization Callback Domain:** `competeonstrava.vercel.app`
3. Note down their:
   - `client_id`
   - `client_secret`
4. Share these with the app owner (privately/securely)

The app owner stores these in **5 separate sets of environment variables** on the server:

```
JOEL_CLIENT_ID=...
JOEL_CLIENT_SECRET=...

JOAB_CLIENT_ID=...
JOAB_CLIENT_SECRET=...

RUSSEL_CLIENT_ID=...
RUSSEL_CLIENT_SECRET=...

JOE_CLIENT_ID=...
JOE_CLIENT_SECRET=...

CHRISO_CLIENT_ID=...
CHRISO_CLIENT_SECRET=...
```

---

## Architecture

### Phase 1 — One-Time Login (Per Participant)

Each participant visits a dedicated login page on the app. The flow is:

```
Participant visits /login?user=joel
    → Redirected to Strava OAuth using Joel's client_id
    → Participant logs in with their own Strava account
    → Strava redirects back with an auth code
    → Backend exchanges auth code for tokens using Joel's client_id + client_secret
    → Backend stores Joel's refresh_token in Postgres
    → Done — Joel never has to log in again
```

This is a **one-time step**. After this, the refresh token is stored permanently and the participant does not need to interact with the login again.

### Phase 2 — Token Management

- Strava access tokens expire every **6 hours**
- Refresh tokens do **not** have a hard expiry, but Strava **may rotate** them on each use
- Every time the backend uses a refresh token to get a new access token, it must **save the new refresh token** returned in the response back to Postgres, overwriting the old one

```
Postgres row (per participant):
- user_name
- client_id
- client_secret
- refresh_token        ← always update this after every use
- access_token         ← cached, expires in 6 hours
- token_expires_at     ← timestamp to check if access token is still valid
```

### Phase 3 — Data Fetching Strategy

The app does **not** hit Strava's API every time the leaderboard is loaded. Instead:

- A **Cloudflare Worker Cron Job** runs once every 24 hours
- On each cron run, for each participant:
  1. Check if access token is still valid (compare `token_expires_at` with current time)
  2. If expired: use refresh token + client credentials to get a new access token, save new refresh token to DB
  3. Use access token to fetch recent activities from Strava API
  4. Filter for runs only, sum up km since April 16
  5. Write the result to the `participants` table in Postgres
- The leaderboard UI reads from this table — **never directly from Strava**
- A **manual "Refresh" button** on the UI can trigger this same flow on-demand outside of the cron schedule

### Phase 4 — Leaderboard Display

- Simple leaderboard page showing each participant's name and total km run
- Progress bar toward the 150km goal
- Days remaining in the challenge
- Data sourced entirely from the cached Postgres table
- No live Strava API calls on page load

---

## Data Flow Diagram

```
[Strava API]
     ↑  (fetch runs, once per day via cron or manual refresh)
     |
[Cloudflare Worker Cron]
     |  (writes aggregated km totals)
     ↓
[Postgres DB]  ←→  [Leaderboard Web App]
     - participants table (credentials + tokens + km totals)   ↑
                                                               |
                                                    [User visits site]
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js / React (hosted on Vercel) |
| Backend / API Routes | Next.js API routes |
| Cron Job | Cloudflare Workers Cron Trigger |
| Database | PostgreSQL (e.g. Supabase or Neon) |
| Auth (one-time) | Strava OAuth 2.0 per participant |
| Hosting | Vercel (`competeonstrava.vercel.app`) |

---

## Postgres Schema

### `participants` table

```sql
id                SERIAL PRIMARY KEY
name              TEXT
slug              TEXT UNIQUE        -- e.g. 'joel', 'joab', 'russel', 'joe', 'chriso'
client_id         TEXT
client_secret     TEXT
refresh_token     TEXT
access_token      TEXT
token_expires_at  TIMESTAMP
total_km          FLOAT DEFAULT 0
last_synced_at    TIMESTAMP
```

---

## Cron Job Logic (Pseudocode)

```
for each participant in participants table:

  if token_expires_at < now:
    call POST https://www.strava.com/oauth/token
      with grant_type = refresh_token
      with client_id    = participant.client_id
      with client_secret = participant.client_secret
      with refresh_token = participant.refresh_token

    save new access_token to DB
    save new refresh_token to DB  ← critical, always overwrite even if unchanged
    save new token_expires_at to DB

  call GET https://www.strava.com/api/v3/athlete/activities
    with Authorization: Bearer {access_token}
    with after = {unix_timestamp_of_2026_04_16}

  filter activities where type == "Run"
  sum all distance values (Strava returns meters → divide by 1000 for km)

  update participants set total_km = sum, last_synced_at = now
```

---

## Strava API Endpoints Used

| Purpose | Endpoint |
|---------|----------|
| Exchange auth code for tokens (one-time login) | `POST /oauth/token` with `grant_type=authorization_code` |
| Refresh access token | `POST /oauth/token` with `grant_type=refresh_token` |
| Fetch activities | `GET /api/v3/athlete/activities?after={unix_timestamp}` |

---

## Important Notes

- The `after` query param on the activities endpoint takes a **Unix timestamp** — April 16, 2026 00:00:00 UTC = `1776211200`
- Strava returns `distance` in **meters** — divide by 1000 to get km
- Only count activities where `type === "Run"`
- Each participant's `client_id` and `client_secret` must be used when refreshing **their own** token — credentials are not interchangeable between participants
- Strava rate limits: 100 requests per 15 minutes, 1000 per day — with 5 users syncing once daily this is well within limits
- If a participant disconnects your app from their Strava account, their refresh token is invalidated and they must complete the one-time login again

---

## One-Time Setup Checklist

- [ ] All 5 participants create their own Strava API app and share `client_id` + `client_secret`
- [ ] App owner stores all 5 sets of credentials in ENV variables on Vercel
- [ ] Postgres DB provisioned with `participants` table and seeded with participant rows
- [ ] Login page built at `/login?user={slug}` for each participant's one-time OAuth
- [ ] All 5 participants complete the one-time login (refresh tokens stored in DB)
- [ ] Cloudflare Worker cron job deployed (`0 0 * * *` for daily midnight sync)
- [ ] Manual refresh button wired to the same sync logic
- [ ] Leaderboard UI live on `competeonstrava.vercel.app`
- [ ] Full end-to-end test: cron → token refresh → activity fetch → DB write → UI display