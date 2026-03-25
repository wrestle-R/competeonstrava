import { NextRequest, NextResponse } from "next/server"

import { getParticipantCredentials } from "@/lib/participants"
import { getStravaCallbackUrl } from "@/lib/strava"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const user = request.nextUrl.searchParams.get("user")

  if (!user) {
    return NextResponse.redirect(new URL("/auth?status=error&message=Missing%20user", request.url))
  }

  const participant = getParticipantCredentials(user)

  if (!participant?.ready) {
    return NextResponse.redirect(
      new URL("/auth?status=error&message=Missing%20participant%20credentials", request.url)
    )
  }

  const stravaUrl = new URL("https://www.strava.com/oauth/authorize")
  stravaUrl.searchParams.set("client_id", participant.clientId!)
  stravaUrl.searchParams.set("response_type", "code")
  stravaUrl.searchParams.set("redirect_uri", getStravaCallbackUrl())
  stravaUrl.searchParams.set("approval_prompt", "auto")
  stravaUrl.searchParams.set("scope", "read,activity:read_all")
  stravaUrl.searchParams.set("state", participant.slug)

  return NextResponse.redirect(stravaUrl)
}
