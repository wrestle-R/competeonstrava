import { NextRequest, NextResponse } from "next/server"

import { exchangeCodeForParticipant } from "@/lib/strava"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const error = request.nextUrl.searchParams.get("error")

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth?status=error&message=${encodeURIComponent(error)}`, request.url)
    )
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/auth?status=error&message=Missing%20code%20or%20state", request.url)
    )
  }

  try {
    await exchangeCodeForParticipant(state, code)

    return NextResponse.redirect(
      new URL(`/auth?status=connected&user=${encodeURIComponent(state)}`, request.url)
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not finish Strava auth."

    return NextResponse.redirect(
      new URL(`/auth?status=error&message=${encodeURIComponent(message)}`, request.url)
    )
  }
}
