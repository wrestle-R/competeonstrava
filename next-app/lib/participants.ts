import { dbQuery } from "@/lib/db"

export type ParticipantRecord = {
  id: number
  name: string
  slug: string
  clientId: string | null
  clientSecret: string | null
  athleteId: string | null
  athleteName: string | null
  accessToken: string | null
  refreshToken: string | null
  tokenExpiresAt: Date | null
  totalKm: number
  lastSyncedAt: Date | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

type ParticipantRow = {
  id: number
  name: string
  slug: string
  client_id: string | null
  client_secret: string | null
  athlete_id: string | null
  athlete_name: string | null
  access_token: string | null
  refresh_token: string | null
  token_expires_at: Date | null
  total_km: number | string
  last_synced_at: Date | null
  notes: string | null
  created_at: Date
  updated_at: Date
}

export async function getLeaderboardParticipants() {
  if (!(await canUseParticipantsTable())) {
    return []
  }

  const { rows } = await dbQuery<ParticipantRow>(
    `
      SELECT *
      FROM participants
      WHERE refresh_token IS NOT NULL
        AND athlete_id IS NOT NULL
      ORDER BY total_km DESC, name ASC
    `
  )

  return rows.map(mapParticipant)
}

export async function getParticipantRowsSafe(): Promise<ParticipantRecord[]> {
  if (!(await canUseParticipantsTable())) {
    return []
  }

  const { rows } = await dbQuery<ParticipantRow>(
    `
      SELECT *
      FROM participants
      ORDER BY name ASC
    `
  )

  return rows.map(mapParticipant)
}

export async function getParticipantBySlugSafe(
  slug: string
): Promise<ParticipantRecord | null> {
  if (!(await canUseParticipantsTable())) {
    return null
  }

  const { rows } = await dbQuery<ParticipantRow>(
    `SELECT * FROM participants WHERE slug = $1 LIMIT 1`,
    [slug]
  )

  return rows[0] ? mapParticipant(rows[0]) : null
}

export async function getParticipantByIdSafe(
  id: number
): Promise<ParticipantRecord | null> {
  if (!(await canUseParticipantsTable())) {
    return null
  }

  const { rows } = await dbQuery<ParticipantRow>(
    `SELECT * FROM participants WHERE id = $1 LIMIT 1`,
    [id]
  )

  return rows[0] ? mapParticipant(rows[0]) : null
}

export async function getParticipantCredentials(slug: string) {
  const participant = await getParticipantBySlugSafe(slug)

  if (!participant) {
    return null
  }

  return {
    slug: participant.slug,
    name: participant.name,
    clientId: participant.clientId,
    clientSecret: participant.clientSecret,
    ready: Boolean(participant.clientId && participant.clientSecret),
  }
}

export async function upsertParticipantSecret(input: {
  id?: number | null
  name: string
  slug: string
  clientId?: string | null
  clientSecret?: string | null
  tokenExpiresAtUnix?: string | null
  notes?: string | null
}) {
  if (!(await canUseParticipantsTable())) {
    throw new Error("Participants table is not available yet.")
  }

  const normalizedSlug = slugify(input.slug || input.name)
  const trimmedName = input.name.trim()

  if (!normalizedSlug) {
    throw new Error("A valid slug is required.")
  }

  if (!trimmedName) {
    throw new Error("Name is required.")
  }

  const tokenExpiresAt = parseTokenExpiresAt(input.tokenExpiresAtUnix)

  if (input.id) {
    const existingParticipant = await getParticipantByIdSafe(input.id)

    if (!existingParticipant) {
      throw new Error("Participant not found.")
    }

    await dbQuery(
      `
        UPDATE participants
        SET name = $2,
            slug = $3,
            client_id = NULLIF($4, ''),
            client_secret = NULLIF($5, ''),
            token_expires_at = $6,
            notes = NULLIF($7, ''),
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        input.id,
        trimmedName,
        normalizedSlug,
        input.clientId ?? "",
        input.clientSecret ?? "",
        tokenExpiresAt,
        input.notes ?? "",
      ]
    )

    return
  }

  await dbQuery(
    `
      INSERT INTO participants (
        name,
        slug,
        client_id,
        client_secret,
        token_expires_at,
        notes
      )
      VALUES ($1, $2, NULLIF($3, ''), NULLIF($4, ''), $5, NULLIF($6, ''))
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        client_id = COALESCE(EXCLUDED.client_id, participants.client_id),
        client_secret = COALESCE(EXCLUDED.client_secret, participants.client_secret),
        token_expires_at = COALESCE(EXCLUDED.token_expires_at, participants.token_expires_at),
        notes = COALESCE(EXCLUDED.notes, participants.notes),
        updated_at = NOW()
    `,
    [
      trimmedName,
      normalizedSlug,
      input.clientId ?? "",
      input.clientSecret ?? "",
      tokenExpiresAt,
      input.notes ?? "",
    ]
  )
}

export async function canUseParticipantsTable() {
  try {
    const { rows } = await dbQuery<{ regclass: string | null }>(
      `SELECT to_regclass('public.participants') AS regclass`
    )
    return Boolean(rows[0]?.regclass)
  } catch {
    return false
  }
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function parseTokenExpiresAt(value?: string | null) {
  const trimmed = value?.trim()

  if (!trimmed) {
    return null
  }

  const seconds = Number(trimmed)

  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error("Token expiry must be a valid Unix timestamp in seconds.")
  }

  return new Date(seconds * 1000)
}

function mapParticipant(row: ParticipantRow): ParticipantRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    clientId: row.client_id,
    clientSecret: row.client_secret,
    athleteId: row.athlete_id,
    athleteName: row.athlete_name,
    accessToken: row.access_token,
    refreshToken: row.refresh_token,
    tokenExpiresAt: row.token_expires_at,
    totalKm: Number(row.total_km ?? 0),
    lastSyncedAt: row.last_synced_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
