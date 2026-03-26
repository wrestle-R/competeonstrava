"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"

import {
  saveManualParticipantPr,
  setParticipantPrManualOverride,
  type RecordKey,
} from "@/lib/records"
import { upsertParticipantSecret } from "@/lib/participants"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD 
const ADMIN_COOKIE = "admin-pass"

export async function loginAdminAction(formData: FormData) {
  const password = String(formData.get("password") ?? "")

  if (password !== ADMIN_PASSWORD) {
    return
  }

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, ADMIN_PASSWORD, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  })

}

export async function logoutAdminAction() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
}

export async function saveParticipantSecretAction(formData: FormData) {
  const idValue = formData.get("id")
  const id = typeof idValue === "string" && idValue ? Number(idValue) : null

  await upsertParticipantSecret({
    id,
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    clientId: String(formData.get("clientId") ?? ""),
    clientSecret: String(formData.get("clientSecret") ?? ""),
    tokenExpiresAtUnix: String(formData.get("tokenExpiresAtUnix") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  })

  revalidatePath("/admin/secrets")
  revalidatePath("/auth")
}

export async function saveRecordAction(formData: FormData) {
  const distanceKey = String(formData.get("distanceKey") ?? "") as RecordKey
  const participantId = Number(formData.get("participantId") ?? "0")

  await saveManualParticipantPr({
    participantId,
    distanceKey,
    timeText: String(formData.get("timeText") ?? ""),
  })

  revalidatePath("/records")
  revalidatePath("/admin/records")
}

export async function unlockRecordAction(formData: FormData) {
  const distanceKey = String(formData.get("distanceKey") ?? "") as RecordKey
  const participantId = Number(formData.get("participantId") ?? "0")

  await setParticipantPrManualOverride({
    participantId,
    distanceKey,
    manualOverride: false,
  })

  revalidatePath("/records")
  revalidatePath("/admin/records")
}
