import type { PoolClient } from "pg"

import { CHALLENGE_START_UNIX } from "@/lib/challenge"
import { dbQuery, withDbClient } from "@/lib/db"
import {
  getParticipantRowsSafe,
  getParticipantByIdSafe,
  getParticipantBySlugSafe,
  getParticipantCredentials,
  type ParticipantRecord,
} from "@/lib/participants"

type StravaTokenResponse = {
  access_token: string
  refresh_token: string
  expires_at: number
  athlete?: {
    id: number
    firstname?: string
    lastname?: string
  }
}

type StravaActivity = {
  id: number
  name?: string
  distance: number
  type?: string
  sport_type?: string
  moving_time?: number
  elapsed_time?: number
  start_date?: string
  start_date_local?: string
}

export function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return "http://localhost:3000"
}

export function getStravaCallbackUrl() {
  return `${getBaseUrl()}/api/strava/callback`
}

function athleteDisplayName(
  athlete: StravaTokenResponse["athlete"] | undefined,
  fallbackName: string
) {
  const combined = [athlete?.firstname?.trim(), athlete?.lastname?.trim()]
    .filter(Boolean)
    .join(" ")
    .trim()

  return combined || fallbackName
}

function isRunActivity(activity: StravaActivity) {
  const kind = activity.sport_type ?? activity.type
  return kind === "Run"
}

async function exchangeToken(payload: URLSearchParams): Promise<StravaTokenResponse> {
  const response = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload.toString(),
    cache: "no-store",
  })

  if (!response.ok) {
    const details = await response.text()
    throw new Error(`Strava token exchange failed: ${response.status} ${details}`)
  }

  return response.json()
}

export async function exchangeCodeForParticipant(slug: string, code: string) {
  const participant = await getParticipantBySlugSafe(slug)
  const credentials = await getParticipantCredentials(slug)

  if (!participant || !credentials?.ready) {
    throw new Error("Participant is not configured for Strava login.")
  }

  const token = await exchangeToken(
    new URLSearchParams({
      client_id: credentials.clientId!,
      client_secret: credentials.clientSecret!,
      code,
      grant_type: "authorization_code",
    })
  )

  await dbQuery(
    `
      INSERT INTO participants (
        name,
        slug,
        client_id,
        client_secret,
        athlete_id,
        athlete_name,
        access_token,
        refresh_token,
        token_expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        client_id = EXCLUDED.client_id,
        client_secret = EXCLUDED.client_secret,
        athlete_id = EXCLUDED.athlete_id,
        athlete_name = EXCLUDED.athlete_name,
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_expires_at = EXCLUDED.token_expires_at
    `,
    [
      participant.name,
      slug,
      credentials.clientId,
      credentials.clientSecret,
      token.athlete?.id ? String(token.athlete.id) : null,
      athleteDisplayName(token.athlete, participant.name),
      token.access_token,
      token.refresh_token,
      new Date(token.expires_at * 1000),
    ]
  )
}

async function refreshParticipantToken(participantId: number) {
  const participant = await getParticipantByIdSafe(participantId)

  if (!participant?.refreshToken || !participant.clientId || !participant.clientSecret) {
    throw new Error("Participant is missing refresh credentials.")
  }

  const token = await exchangeToken(
    new URLSearchParams({
      client_id: participant.clientId,
      client_secret: participant.clientSecret,
      refresh_token: participant.refreshToken,
      grant_type: "refresh_token",
    })
  )

  await dbQuery(
    `
      UPDATE participants
      SET access_token = $2,
          refresh_token = $3,
          token_expires_at = $4,
          athlete_id = COALESCE($5, athlete_id),
          athlete_name = COALESCE($6, athlete_name),
          updated_at = NOW()
      WHERE id = $1
    `,
    [
      participant.id,
      token.access_token,
      token.refresh_token,
      new Date(token.expires_at * 1000),
      token.athlete?.id ? String(token.athlete.id) : null,
      token.athlete
        ? athleteDisplayName(token.athlete, participant.name)
        : null,
    ]
  )

  return getParticipantByIdSafe(participant.id)
}

async function ensureValidAccessToken(participantId: number) {
  const participant = await getParticipantByIdSafe(participantId)

  if (!participant) {
    throw new Error("Participant not found.")
  }

  const expired =
    !participant.accessToken ||
    !participant.tokenExpiresAt ||
    participant.tokenExpiresAt.getTime() <= Date.now() + 60_000

  if (!expired) {
    return participant
  }

  return refreshParticipantToken(participant.id)
}

async function fetchChallengeActivities(accessToken: string) {
  let page = 1
  const runActivities: StravaActivity[] = []

  while (true) {
    const url = new URL("https://www.strava.com/api/v3/athlete/activities")
    url.searchParams.set("after", String(CHALLENGE_START_UNIX))
    url.searchParams.set("per_page", "100")
    url.searchParams.set("page", String(page))

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })

    if (!response.ok) {
      const details = await response.text()
      throw new Error(`Failed to fetch activities: ${response.status} ${details}`)
    }

    const activities = (await response.json()) as StravaActivity[]
    runActivities.push(...activities.filter(isRunActivity))

    if (activities.length < 100) {
      break
    }

    page += 1
  }

  return runActivities
}

async function replaceParticipantActivities(
  client: PoolClient,
  participant: ParticipantRecord,
  activities: StravaActivity[],
  totalKm: number
) {
  const latestFiftyActivities = activities
    .slice()
    .sort((a, b) => {
      const left = a.start_date ? new Date(a.start_date).getTime() : 0
      const right = b.start_date ? new Date(b.start_date).getTime() : 0
      return right - left
    })
    .slice(0, 50)

  await client.query(`DELETE FROM activities WHERE participant_id = $1`, [
    participant.id,
  ])

  for (const activity of latestFiftyActivities) {
    await client.query(
      `
        INSERT INTO activities (
          strava_id,
          participant_id,
          name,
          activity_type,
          sport_type,
          distance_meters,
          distance_km,
          moving_time,
          elapsed_time,
          start_date,
          start_date_local
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `,
      [
        String(activity.id),
        participant.id,
        activity.name ?? null,
        activity.type ?? null,
        activity.sport_type ?? null,
        activity.distance,
        activity.distance / 1000,
        activity.moving_time ?? null,
        activity.elapsed_time ?? null,
        activity.start_date ? new Date(activity.start_date) : null,
        activity.start_date_local ? new Date(activity.start_date_local) : null,
      ]
    )
  }

  await client.query(
    `
      UPDATE participants
      SET total_km = $2,
          last_synced_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
    `,
    [participant.id, totalKm]
  )
}

export async function syncParticipantBySlug(slug: string) {
  const participant = await getParticipantBySlugSafe(slug)

  if (!participant) {
    return {
      slug,
      status: "skipped" as const,
      reason: "Participant is not configured in the database yet.",
    }
  }

  if (!participant.refreshToken) {
    return {
      slug,
      status: "skipped" as const,
      reason: "Participant has not logged in on /auth yet.",
    }
  }

  if (!participant.athleteId) {
    return {
      slug,
      status: "skipped" as const,
      reason: "Participant needs to complete the in-app Strava connect flow first.",
    }
  }

  const readyParticipant = await ensureValidAccessToken(participant.id)

  if (!readyParticipant?.accessToken) {
    throw new Error("Participant is missing an access token.")
  }

  const activities = await fetchChallengeActivities(readyParticipant.accessToken)
  const totalKm = activities.reduce((sum, activity) => sum + activity.distance, 0) / 1000

  await withDbClient(async (client) => {
    await replaceParticipantActivities(client, readyParticipant, activities, totalKm)
  })

  const updated = await getParticipantByIdSafe(participant.id)

  return {
    slug,
    status: "synced" as const,
    totalKm: updated?.totalKm ?? totalKm,
    athleteName: updated?.athleteName ?? updated?.name ?? participant.name,
  }
}

export async function syncAllParticipants() {
  const participants = await getParticipantRowsSafe()

  const results: Array<
    | { slug: string; status: "synced"; totalKm: number; athleteName: string }
    | { slug: string; status: "skipped" | "error"; reason: string }
  > = []

  for (const participant of participants) {
    try {
      const credentials = await getParticipantCredentials(participant.slug)

      if (!credentials?.ready) {
        results.push({
          slug: participant.slug,
          status: "skipped",
          reason: "Missing client credentials in the database.",
        })
        continue
      }

      results.push(await syncParticipantBySlug(participant.slug))
    } catch (error) {
      results.push({
        slug: participant.slug,
        status: "error",
        reason: error instanceof Error ? error.message : "Unknown sync error",
      })
    }
  }

  return results
}
