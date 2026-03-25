import Image from "next/image"
import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"
import { CircleCheckBig, CircleDashed, TriangleAlert } from "lucide-react"

import { buttonVariants } from "@/lib/button-styles"
import {
  bootstrapParticipants,
  type ParticipantRecord,
  getParticipantCredentials,
  getParticipantRowsSafe,
  SUPPORTED_PARTICIPANTS,
} from "@/lib/participants"
import { cn } from "@/lib/utils"

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  noStore()

  await bootstrapParticipants()

  const params = await searchParams
  const status = typeof params.status === "string" ? params.status : null
  const user = typeof params.user === "string" ? params.user : null
  const message = typeof params.message === "string" ? params.message : null

  const rows = await getParticipantRowsSafe()

  const participantMap = new Map<string, ParticipantRecord>(
    rows.map((row: ParticipantRecord) => [row.slug, row])
  )

  return (
    <main className="noise-overlay min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <section className="panel-shadow border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <Image
              src="/logo.png"
              alt="Compete on Strava logo"
              width={80}
              height={55}
              className="h-auto w-20"
              priority
            />
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
                Robinsonites connect desk
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-foreground sm:text-4xl">
                One-time Strava auth
              </h1>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">
            Connect each runner once, then the home page can read cached totals
            from Postgres. For now this flow is set up for Russel and Chriso only.
          </p>

          {status ? (
            <div
              className={cn(
                "mt-6 border p-4 text-sm",
                status === "connected"
                  ? "border-accent bg-accent/20 text-accent-foreground"
                  : "border-destructive bg-destructive/10 text-foreground"
              )}
            >
              {status === "connected"
                ? `${user ?? "Runner"} connected successfully.`
                : message ?? "Strava auth failed."}
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {SUPPORTED_PARTICIPANTS.map((participant) => {
            const credentials = getParticipantCredentials(participant.slug)
            const row = participantMap.get(participant.slug)
            const connected = Boolean(row?.refreshToken && row?.athleteId)
            const awaitingRealConnect = Boolean(row?.refreshToken && !row?.athleteId)
            const missingConfig = !credentials?.ready
            const envPrefix = credentials?.envPrefix ?? participant.envPrefix

            return (
              <article
                key={participant.slug}
                className={cn(
                  "panel-shadow border p-5 transition-colors",
                  connected
                    ? "border-accent bg-accent/10"
                    : "border-border bg-card"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                      {participant.slug}
                    </p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground">
                      {participant.name}
                    </h2>
                  </div>
                  {connected ? (
                    <CircleCheckBig className="size-5 text-accent-foreground" />
                  ) : missingConfig ? (
                    <TriangleAlert className="size-5 text-destructive" />
                  ) : (
                    <CircleDashed className="size-5 text-muted-foreground" />
                  )}
                </div>

                <div className="mt-5 space-y-2 text-sm leading-7 text-muted-foreground">
                  <p>
                    Status:{" "}
                    <span className="font-medium text-foreground">
                      {connected
                        ? "Connected"
                        : awaitingRealConnect
                          ? "Needs first connect"
                        : missingConfig
                          ? "Missing env credentials"
                          : "Ready to connect"}
                    </span>
                  </p>
                  <p>
                    Athlete:{" "}
                    <span className="font-medium text-foreground">
                      {connected
                        ? (row?.athleteName ?? participant.name)
                        : "Not linked yet"}
                    </span>
                  </p>
                </div>

                {!missingConfig && !connected ? (
                  <div className="mt-5 border border-border bg-background/80 p-3 text-sm text-muted-foreground">
                    {awaitingRealConnect
                      ? "Stored data exists, but this runner has not completed the real in-app Strava connect flow yet."
                      : "Click connect once to authorize this runner properly and unlock refresh."}
                  </div>
                ) : null}

                {missingConfig ? (
                  <p className="mt-5 border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
                    Add `{envPrefix}_CLIENT_ID` and `{envPrefix}_CLIENT_SECRET`
                    before using this login button.
                  </p>
                ) : (
                  <div className="mt-5 flex flex-wrap gap-3">
                    <a
                      href={`/api/strava/start?user=${participant.slug}`}
                      className={cn(
                        buttonVariants({ size: "lg" }),
                        "hero-glow border border-foreground text-primary-foreground"
                      )}
                    >
                      {connected ? "Reconnect Strava" : "Connect Strava"}
                    </a>
                    <Link
                      href="/"
                      className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
                    >
                      Back home
                    </Link>
                  </div>
                )}
              </article>
            )
          })}
        </section>
      </div>
    </main>
  )
}
