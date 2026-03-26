import { unstable_noStore as noStore } from "next/cache"
import Link from "next/link"
import { Crown } from "lucide-react"

import { BrandLogo } from "@/components/brand-logo"
import { buttonVariants } from "@/lib/button-styles"
import { formatDuration, formatPacePerKm, getPublicPrBoard } from "@/lib/records"
import { cn } from "@/lib/utils"

export default async function RecordsPage() {
  noStore()

  const rawBoard = await getPublicPrBoard()
  const fastestByDistance = new Map<string, number>()

  for (const participant of rawBoard) {
    for (const pr of participant.prs) {
      if (pr.distanceKey === "21k" || pr.recordSeconds === null) {
        continue
      }

      const currentBest = fastestByDistance.get(pr.distanceKey)

      if (currentBest === undefined || pr.recordSeconds < currentBest) {
        fastestByDistance.set(pr.distanceKey, pr.recordSeconds)
      }
    }
  }

  const board = rawBoard
    .map((participant) => {
      const completedCount = participant.prs.filter((pr) => pr.recordSeconds !== null).length
      const totalSeconds = participant.prs.reduce(
        (sum, pr) => sum + (pr.recordSeconds ?? 0),
        0
      )

      return {
        ...participant,
        completedCount,
        totalSeconds,
      }
    })
    .sort((left, right) => {
      if (right.completedCount !== left.completedCount) {
        return right.completedCount - left.completedCount
      }

      if (left.totalSeconds !== right.totalSeconds) {
        return left.totalSeconds - right.totalSeconds
      }

      return left.participantName.localeCompare(right.participantName)
    })

  return (
    <main className="noise-overlay min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="panel-shadow overflow-hidden border border-border bg-card">
          <div className="bg-card p-4 sm:p-6 lg:p-8">
            <div className="flex flex-wrap items-center gap-4">
              <div className="hero-glow panel-shadow flex items-center gap-3 border border-foreground px-3 py-3 sm:px-5 sm:py-4">
                <BrandLogo className="h-12 w-12 sm:h-14 sm:w-14" priority />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.32em] text-primary-foreground/80">
                    Public board
                  </p>
                  <h1 className="mt-1 text-xl font-semibold leading-none text-primary-foreground sm:text-4xl">
                    Robinsonites records
                  </h1>
                </div>
              </div>
            </div>

            <p className="mt-5 max-w-2xl text-[13px] leading-relaxed text-muted-foreground sm:text-sm sm:leading-7">
              A PR leaderboard for the whole crew. Each card shows that runner&apos;s best
              times for `3.2 km / 2 mile`, `5k`, `10k`, and `15k`, ranked by how
              complete their board is and then by total time across the filled slots.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
                Back home
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {board.map((participant, index) => (
            <article
              key={participant.participantId}
              className="panel-shadow overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
            >
              <div className="grid gap-px bg-border lg:grid-cols-[0.6fr_1.4fr]">
                <div className="bg-card p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-primary/70">
                        Rank #{String(index + 1).padStart(2, "0")}
                      </p>
                      <h2 className="mt-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        {participant.participantName}
                      </h2>
                      <p className="mt-1 text-[13px] text-muted-foreground/80 sm:text-sm">
                        @{participant.participantSlug}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card p-3 sm:p-4 lg:border-l lg:border-border">
                  <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                    {participant.prs
                      .filter((pr) => pr.distanceKey !== "21k")
                      .map((pr) => (
                      <div
                        key={pr.distanceKey}
                        className="rounded-lg border border-border bg-background p-2.5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md sm:p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                                {pr.label}
                              </p>
                              {pr.recordSeconds !== null &&
                              fastestByDistance.get(pr.distanceKey) === pr.recordSeconds ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-foreground/20 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-primary">
                                  <Crown className="size-3" />
                                </span>
                              ) : null}
                            </div>
                            {pr.recordSeconds === null ? (
                              <p className="mt-1 text-lg font-semibold sm:text-xl">Not yet</p>
                            ) : (
                              <>
                                <p className="mt-1 text-lg font-semibold sm:text-xl">
                                  {formatDuration(pr.recordSeconds)}
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground sm:text-xs">
                                  {formatPacePerKm(pr.recordSeconds, pr.distanceKm)}
                                </p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  )
}
