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

export function getParticipantCredentials(slug: string) {
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
    const credentials = getParticipantCredentials(participant.slug)

    if (!credentials?.ready) {
      continue
    }

    await dbQuery(
      `
        INSERT INTO participants (
          name,
          slug,
          client_id,
          client_secret
        )
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          client_id = EXCLUDED.client_id,
          client_secret = EXCLUDED.client_secret
      `,
      [
        participant.name,
        participant.slug,
        credentials.clientId,
        credentials.clientSecret,
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
      WHERE slug = ANY($1::text[])
        AND refresh_token IS NOT NULL
        AND athlete_id IS NOT NULL
      ORDER BY total_km DESC, name ASC
    `,
    [SUPPORTED_PARTICIPANTS.map((participant) => participant.slug)]
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
      WHERE slug = ANY($1::text[])
      ORDER BY name ASC
    `,
    [SUPPORTED_PARTICIPANTS.map((participant) => participant.slug)]
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
