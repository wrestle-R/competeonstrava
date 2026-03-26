import { dbQuery } from "@/lib/db"
import { bootstrapParticipants, getParticipantRowsSafe } from "@/lib/participants"

export const RECORD_DEFINITIONS = [
  { key: "2mi", label: "3.2 km / 2 mile", distanceKm: 3.218688 },
  { key: "5k", label: "5 km", distanceKm: 5 },
  { key: "10k", label: "10 km", distanceKm: 10 },
  { key: "15k", label: "15 km", distanceKm: 15 },
  { key: "21k", label: "21 km", distanceKm: 21.0975 },
] as const

export type RecordKey = (typeof RECORD_DEFINITIONS)[number]["key"]

export type ParticipantPrEntry = {
  id: number
  participantId: number
  participantName: string
  participantSlug: string
  distanceKey: RecordKey
  distanceKm: number
  label: string
  recordSeconds: number | null
  activityId: string | null
  source: string | null
  manualOverride: boolean
  updatedAt: Date
}

export type ParticipantPrBoard = {
  participantId: number
  participantName: string
  participantSlug: string
  prs: ParticipantPrEntry[]
}

type ParticipantPrRow = {
  id: number
  participant_id: number
  participant_name: string
  participant_slug: string
  distance_key: RecordKey
  distance_km: number | string
  label: string
  record_seconds: number | null
  activity_id: string | null
  source: string | null
  manual_override: boolean
  updated_at: Date
}

const RUSSEL_SEED_SECONDS: Record<RecordKey, number> = {
  "2mi": 1007,
  "5k": 1590,
  "10k": 3367,
  "15k": 5401,
  "21k": 7761,
}

export async function canUseParticipantPrsTable() {
  try {
    const { rows } = await dbQuery<{ regclass: string | null }>(
      `SELECT to_regclass('public.participant_prs') AS regclass`
    )

    return Boolean(rows[0]?.regclass)
  } catch {
    return false
  }
}

export async function bootstrapParticipantPrs() {
  if (!(await canUseParticipantPrsTable())) {
    return
  }

  await bootstrapParticipants()
  const participants = await getParticipantRowsSafe()

  for (const participant of participants) {
    for (const record of RECORD_DEFINITIONS) {
      const seededSeconds =
        participant.slug === "russel" ? RUSSEL_SEED_SECONDS[record.key] : null

      await dbQuery(
        `
          INSERT INTO participant_prs (
            participant_id,
            distance_key,
            distance_km,
            label,
            record_seconds,
            source,
            manual_override
          )
          VALUES ($1, $2, $3, $4, $5, $6, FALSE)
          ON CONFLICT (participant_id, distance_key) DO NOTHING
        `,
        [
          participant.id,
          record.key,
          record.distanceKm,
          record.label,
          seededSeconds,
          seededSeconds ? "seed" : null,
        ]
      )
    }
  }
}

export async function getPublicPrBoard() {
  if (!(await canUseParticipantPrsTable())) {
    return []
  }

  await bootstrapParticipantPrs()

  const { rows } = await dbQuery<ParticipantPrRow>(
    `
      SELECT
        pr.*,
        p.id AS participant_id,
        p.name AS participant_name,
        p.slug AS participant_slug
      FROM participant_prs pr
      INNER JOIN participants p ON p.id = pr.participant_id
      ORDER BY p.name ASC, pr.distance_km ASC
    `
  )

  return groupBoard(rows.map(mapParticipantPr))
}

export async function saveManualParticipantPr(input: {
  participantId: number
  distanceKey: RecordKey
  timeText: string
}) {
  const recordSeconds = parseDurationToSeconds(input.timeText)

  await bootstrapParticipantPrs()

  await dbQuery(
    `
      UPDATE participant_prs
      SET record_seconds = $3,
          source = 'manual',
          manual_override = TRUE,
          updated_at = NOW()
      WHERE participant_id = $1
        AND distance_key = $2
    `,
    [input.participantId, input.distanceKey, recordSeconds]
  )
}

export async function setParticipantPrManualOverride(input: {
  participantId: number
  distanceKey: RecordKey
  manualOverride: boolean
}) {
  await bootstrapParticipantPrs()

  await dbQuery(
    `
      UPDATE participant_prs
      SET manual_override = $3,
          updated_at = NOW()
      WHERE participant_id = $1
        AND distance_key = $2
    `,
    [input.participantId, input.distanceKey, input.manualOverride]
  )
}

export async function syncParticipantPrCandidate(input: {
  participantId: number
  distanceKey: RecordKey
  recordSeconds: number
  activityId?: string | null
}) {
  await bootstrapParticipantPrs()

  await dbQuery(
    `
      UPDATE participant_prs
      SET record_seconds = $3,
          activity_id = $4,
          source = 'strava',
          updated_at = NOW()
      WHERE participant_id = $1
        AND distance_key = $2
        AND manual_override = FALSE
        AND (
          record_seconds IS NULL
          OR record_seconds > $3
        )
    `,
    [input.participantId, input.distanceKey, input.recordSeconds, input.activityId ?? null]
  )
}

export function formatDuration(totalSeconds: number | null) {
  if (totalSeconds === null) {
    return "Not set"
  }

  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

export function formatPacePerKm(totalSeconds: number | null, distanceKm: number) {
  if (totalSeconds === null || distanceKm <= 0) {
    return null
  }

  const paceSeconds = Math.round(totalSeconds / distanceKm)
  const minutes = Math.floor(paceSeconds / 60)
  const seconds = paceSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, "0")}/km`
}

export function parseDurationToSeconds(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error("Time is required.")
  }

  const parts = trimmed.split(":").map((part) => part.trim())

  if (parts.length !== 2 && parts.length !== 3) {
    throw new Error("Time must be in mm:ss or h:mm:ss format.")
  }

  const numbers = parts.map((part) => Number(part))

  if (numbers.some((part) => Number.isNaN(part) || part < 0)) {
    throw new Error("Time must contain only positive numbers.")
  }

  if (parts.length === 2) {
    const [minutes, seconds] = numbers

    if (seconds >= 60) {
      throw new Error("Seconds must be below 60.")
    }

    return minutes * 60 + seconds
  }

  const [hours, minutes, seconds] = numbers

  if (minutes >= 60 || seconds >= 60) {
    throw new Error("Minutes and seconds must be below 60.")
  }

  return hours * 3600 + minutes * 60 + seconds
}

export function normalizeBestEffortRecordKey(bestEffort: {
  name?: string
  distance?: number
}) {
  const normalizedName = bestEffort.name?.toLowerCase().replace(/\s+/g, " ").trim() ?? ""
  const distance = bestEffort.distance ?? 0

  if (
    normalizedName.includes("2 mile") ||
    normalizedName.includes("2-mile") ||
    normalizedName.includes("two mile") ||
    normalizedName.includes("3.2k") ||
    normalizedName.includes("3.2 km") ||
    withinMeters(distance, 3218.688, 200)
  ) {
    return "2mi"
  }

  if (
    normalizedName.includes("5k") ||
    normalizedName.includes("5 km") ||
    withinMeters(distance, 5000)
  ) {
    return "5k"
  }

  if (
    normalizedName.includes("10k") ||
    normalizedName.includes("10 km") ||
    withinMeters(distance, 10000)
  ) {
    return "10k"
  }

  if (
    normalizedName.includes("15k") ||
    normalizedName.includes("15 km") ||
    withinMeters(distance, 15000)
  ) {
    return "15k"
  }

  if (
    normalizedName.includes("half marathon") ||
    normalizedName.includes("half-marathon") ||
    normalizedName.includes("21k") ||
    normalizedName.includes("21 km") ||
    withinMeters(distance, 21097.5, 300)
  ) {
    return "21k"
  }

  return null
}

function withinMeters(actual: number, expected: number, tolerance = 150) {
  return Math.abs(actual - expected) <= tolerance
}

function groupBoard(entries: ParticipantPrEntry[]) {
  const map = new Map<number, ParticipantPrBoard>()

  for (const entry of entries) {
    const existing = map.get(entry.participantId)

    if (existing) {
      existing.prs.push(entry)
      continue
    }

    map.set(entry.participantId, {
      participantId: entry.participantId,
      participantName: entry.participantName,
      participantSlug: entry.participantSlug,
      prs: [entry],
    })
  }

  return Array.from(map.values())
}

function mapParticipantPr(row: ParticipantPrRow): ParticipantPrEntry {
  return {
    id: row.id,
    participantId: row.participant_id,
    participantName: row.participant_name,
    participantSlug: row.participant_slug,
    distanceKey: row.distance_key,
    distanceKm: Number(row.distance_km),
    label: row.label,
    recordSeconds: row.record_seconds,
    activityId: row.activity_id,
    source: row.source,
    manualOverride: row.manual_override,
    updatedAt: row.updated_at,
  }
}
