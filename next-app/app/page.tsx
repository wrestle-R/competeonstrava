import type { ReactNode } from "react"

import Image from "next/image"
import { unstable_noStore as noStore } from "next/cache"
import { Footprints, Flame, TimerReset, Trophy } from "lucide-react"

import { buttonVariants } from "@/lib/button-styles"
import {
  CHALLENGE_END,
  CHALLENGE_GOAL_KM,
  CHALLENGE_NAME,
  CHALLENGE_START,
  formatKm,
  getDaysRemaining,
} from "@/lib/challenge"
import {
  getLeaderboardParticipants,
  type ParticipantRecord,
} from "@/lib/participants"
import { cn } from "@/lib/utils"

export default async function Page() {
  noStore()

  const participants = await getLeaderboardParticipants()
  const hasParticipants = participants.length > 0
  const leaderDistance = participants[0]?.totalKm ?? 0
  const totalDistance = participants.reduce(
    (sum: number, participant: ParticipantRecord) => sum + participant.totalKm,
    0
  )
  const daysRemaining = getDaysRemaining()

  return (
    <main className="noise-overlay min-h-screen">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <section className="panel-shadow overflow-hidden border border-border bg-card">
          <div className="grid gap-0 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="flex flex-col justify-between gap-6 border-b border-border p-5 sm:p-6 lg:border-r lg:border-b-0 lg:p-8">
              <div className="flex flex-wrap items-center gap-4">
                <div className="hero-glow panel-shadow flex items-center gap-4 border border-foreground px-5 py-4">
                  <Image
                    src="/logo.png"
                    alt="Compete on Strava logo"
                    width={54}
                    height={37}
                    className="h-auto w-[54px]"
                    priority
                  />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.35em] text-primary-foreground/80">
                      Compete on Strava
                    </p>
                    <h1 className="mt-1 text-2xl font-semibold leading-none text-primary-foreground sm:text-4xl">
                      Robinsonites
                    </h1>
                  </div>
                </div>
                <div className="border border-border bg-background px-3 py-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  {CHALLENGE_NAME}
                </div>
              </div>

              <div className="max-w-2xl space-y-3">
                <h2 className="max-w-2xl text-3xl font-semibold leading-none text-foreground sm:text-5xl">
                  If it&apos;s not on Strava, it did not HAPPEN
                </h2>
                <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  A highly competitive leaderboard for the Robinsonites crew to prove 
                  who is actually running, from{" "}
                  <span className="font-medium text-foreground">
                    {CHALLENGE_START.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {CHALLENGE_END.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  .
                </p>
                <p className="text-sm text-muted-foreground">
                  Currently featuring the athletic (and perhaps not-so-athletic) attempts of Russel, Joel, Joab, and Joe Israel.
                </p>
              </div>
            </div>

            <div className="grid gap-px bg-border">
              <div className="grid grid-cols-2 gap-px bg-border">
                <MetricTile
                  icon={<Trophy className="size-4" />}
                  label="Leader"
                  value={hasParticipants ? formatKm(leaderDistance) : "Login first"}
                />
                <MetricTile
                  icon={<Footprints className="size-4" />}
                  label="Crew total"
                  value={hasParticipants ? formatKm(totalDistance) : "0 km"}
                />
              </div>
              <div className="grid grid-cols-2 gap-px bg-border">
                <MetricTile
                  icon={<Flame className="size-4" />}
                  label="Goal"
                  value={`${CHALLENGE_GOAL_KM} km`}
                />
                <MetricTile
                  icon={<TimerReset className="size-4" />}
                  label="Days left"
                  value={`${daysRemaining}`}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="panel-shadow border border-border bg-card p-4 sm:p-6">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Live from Postgres cache
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-foreground">
                  Leaderboard
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Sorted by total run distance
              </p>
            </div>

            {hasParticipants ? (
              <div className="grid gap-4">
                {participants.map((participant: ParticipantRecord, index: number) => {
                  const progress = Math.min(
                    100,
                    (participant.totalKm / CHALLENGE_GOAL_KM) * 100
                  )

                  return (
                    <article
                      key={participant.id}
                      className="border border-border bg-background p-4 sm:p-5"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="space-y-2">
                          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                            #{String(index + 1).padStart(2, "0")}
                          </p>
                          <div>
                            <h4 className="text-2xl font-semibold text-foreground">
                              {participant.athleteName ?? participant.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {participant.lastSyncedAt
                                ? `Last synced ${participant.lastSyncedAt.toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "2-digit",
                                  })}`
                                : "Connected but not refreshed yet"}
                            </p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                            Distance
                          </p>
                          <p className="text-3xl font-semibold text-foreground">
                            {formatKm(participant.totalKm)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="mb-2 flex justify-between text-xs uppercase tracking-[0.2em] text-muted-foreground">
                          <span>Progress</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-4 border border-border bg-muted">
                          <div
                            className="hero-glow h-full border-r border-foreground"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="hero-glow panel-shadow border border-foreground p-6 text-primary-foreground sm:p-8">
                <p className="text-xs uppercase tracking-[0.35em] text-primary-foreground/75">
                  No runners connected yet
                </p>
                <h4 className="mt-3 text-3xl font-semibold">
                  The board is ready whenever the Robinsonites data lands.
                </h4>
                <p className="mt-3 max-w-xl text-sm leading-7 text-primary-foreground/85">
                  No dummy data here. Once the four Robinsonites runners are connected
                  and synced, this leaderboard will update from the Postgres cache.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricTile({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="bg-card p-4 sm:p-5">
      <div className="mb-6 flex items-center justify-between text-muted-foreground">
        <span className="text-xs uppercase tracking-[0.25em]">{label}</span>
        {icon}
      </div>
      <p className="text-xl font-semibold text-foreground sm:text-2xl">{value}</p>
    </div>
  )
}
