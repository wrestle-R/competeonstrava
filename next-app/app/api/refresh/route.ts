import { NextRequest, NextResponse } from "next/server"

import { syncAllParticipants } from "@/lib/strava"

export const dynamic = "force-dynamic"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "russelruns"
const ADMIN_COOKIE = "admin-pass"

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(ADMIN_COOKIE)?.value

  if (cookie !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const results = await syncAllParticipants()
  const synced = results.filter((result) => result.status === "synced").length
  const skipped = results.filter((result) => result.status === "skipped").length
  const failed = results.filter((result) => result.status === "error").length
  const status = failed > 0 ? "partial" : "ok"

  const redirectUrl = new URL("/admin/refresh", request.url)
  redirectUrl.searchParams.set("status", status)
  redirectUrl.searchParams.set("synced", String(synced))
  redirectUrl.searchParams.set("skipped", String(skipped))
  redirectUrl.searchParams.set("failed", String(failed))

  return NextResponse.redirect(redirectUrl, { status: 303 })
}
