import { dbQuery } from "@/lib/db"

export type SupportedParticipant = {
  slug: "russel" | "joel" | "joab" | "joe-israel"
  name: string
  envPrefix: "RUSSEL" | "JOEL" | "JOAB" | "JOELISRAEL"
}

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

export const SUPPORTED_PARTICIPANTS: SupportedParticipant[] = [
  { slug: "russel", name: "Russel Daniel Paul", envPrefix: "RUSSEL" },
  { slug: "joel", name: "Joel", envPrefix: "JOEL" },
  { slug: "joab", name: "Joab", envPrefix: "JOAB" },
  { slug: "joe-israel", name: "Joe Israel", envPrefix: "JOELISRAEL" },
]

export function getParticipantDefinition(slug: string) {
  return SUPPORTED_PARTICIPANTS.find((participant) => participant.slug === slug)
}

export function isSupportedParticipantSlug(slug: string) {
  return Boolean(getParticipantDefinition(slug))
}

export function getParticipantEnvCredentials(slug: string) {
  const participant = getParticipantDefinition(slug)

  if (!participant) {
    return null
  }

  const clientId = process.env[`${participant.envPrefix}_CLIENT_ID`]
  const clientSecret = process.env[`${participant.envPrefix}_CLIENT_SECRET`]
  const accessToken = process.env[`${participant.envPrefix}_ACCESS_TOKEN`]
  const refreshToken = process.env[`${participant.envPrefix}_REFRESH_TOKEN`]
  const tokenExpiresAt = process.env[`${participant.envPrefix}_TOKEN_EXPIRES_AT`]

  return {
    ...participant,
    clientId: clientId ?? null,
    clientSecret: clientSecret ?? null,
    accessToken: accessToken ?? null,
    refreshToken: refreshToken ?? null,
    tokenExpiresAt: tokenExpiresAt ? new Date(Number(tokenExpiresAt) * 1000) : null,
    ready: Boolean(clientId && clientSecret),
  }
}

export async function bootstrapParticipants() {
  if (!(await canUseParticipantsTable())) {
    return
  }

  for (const participant of SUPPORTED_PARTICIPANTS) {
    const credentials = getParticipantEnvCredentials(participant.slug)

    await dbQuery(
      `
        INSERT INTO participants (
          name,
          slug,
          client_id,
          client_secret,
          access_token,
          refresh_token,
          token_expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          client_id = COALESCE(EXCLUDED.client_id, participants.client_id),
          client_secret = COALESCE(EXCLUDED.client_secret, participants.client_secret),
          access_token = COALESCE(participants.access_token, EXCLUDED.access_token),
          refresh_token = COALESCE(participants.refresh_token, EXCLUDED.refresh_token),
          token_expires_at = COALESCE(participants.token_expires_at, EXCLUDED.token_expires_at)
      `,
      [
        participant.name,
        participant.slug,
        credentials?.clientId ?? null,
        credentials?.clientSecret ?? null,
        credentials?.accessToken ?? null,
        credentials?.refreshToken ?? null,
        credentials?.tokenExpiresAt ?? null,
      ]
    )
  }
}

export async function getLeaderboardParticipants() {
  if (!(await canUseParticipantsTable())) {
    return []
  }

  await bootstrapParticipants()

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

  await bootstrapParticipants()

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
  await bootstrapParticipants()

  const participant = await getParticipantBySlugSafe(slug)
  const envCredentials = getParticipantEnvCredentials(slug)

  const clientId = participant?.clientId ?? envCredentials?.clientId ?? null
  const clientSecret = participant?.clientSecret ?? envCredentials?.clientSecret ?? null

  if (!participant && !envCredentials) {
    return null
  }

  return {
    slug: participant?.slug ?? envCredentials?.slug ?? slug,
    name: participant?.name ?? envCredentials?.name ?? slug,
    clientId,
    clientSecret,
    ready: Boolean(clientId && clientSecret),
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

  if (!normalizedSlug) {
    throw new Error("A valid slug is required.")
  }

  const tokenExpiresAt = parseTokenExpiresAt(input.tokenExpiresAtUnix)

  if (input.id) {
    const existingParticipant = await getParticipantByIdSafe(input.id)

    if (!existingParticipant) {
      throw new Error("Participant not found.")
    }

    const nextSlug = isSupportedParticipantSlug(existingParticipant.slug)
      ? existingParticipant.slug
      : normalizedSlug

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
        input.name.trim(),
        nextSlug,
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
      input.name.trim(),
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
