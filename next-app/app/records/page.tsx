import { unstable_noStore as noStore } from "next/cache"
import Link from "next/link"
import { Medal, TimerReset, Users } from "lucide-react"

import { BrandLogo } from "@/components/brand-logo"
import { buttonVariants } from "@/lib/button-styles"
import { formatDuration, getPublicPrBoard } from "@/lib/records"
import { cn } from "@/lib/utils"

export default async function RecordsPage() {
  noStore()

  const board = (await getPublicPrBoard())
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

  const completedPrs = board.reduce((sum, participant) => sum + participant.completedCount, 0)

  return (
    <main className="noise-overlay min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="panel-shadow overflow-hidden border border-border bg-card">
          <div className="grid gap-px bg-border lg:grid-cols-[1.25fr_0.75fr]">
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
                times for `5k`, `10k`, `15k`, and `21k`, ranked by how complete their board is
                and then by total time across the filled slots.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
                  Back home
                </Link>
              </div>
            </div>

            <div className="grid gap-px bg-border">
              <MetricTile
                icon={<Users className="size-4" />}
                label="Runners"
                value={String(board.length)}
              />
              <MetricTile
                icon={<TimerReset className="size-4" />}
                label="PRs logged"
                value={`${completedPrs}/${board.length * 4}`}
              />
              <MetricTile
                icon={<Medal className="size-4" />}
                label="Current leader"
                value={board[0]?.participantName ?? "Nobody yet"}
                fullWidth
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {board.map((participant, index) => (
            <article
              key={participant.participantId}
              className="panel-shadow overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
            >
              <div className="grid gap-px bg-border lg:grid-cols-[0.7fr_1.3fr]">
                <div className="bg-card p-4 sm:p-6">
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

                  <div className="mt-5 grid grid-cols-2 gap-3 sm:mt-6">
                    <div className="rounded-lg border border-border bg-muted/30 p-3 sm:p-4">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                        PRs filled
                      </p>
                      <p className="mt-1.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        {participant.completedCount}/4
                      </p>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-3 sm:p-4">
                      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                        Board score
                      </p>
                      <p className="mt-1.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                        {participant.completedCount > 0 ? formatDuration(participant.totalSeconds) : "--"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card p-3.5 sm:p-6 lg:border-l lg:border-border">
                  <div className="grid gap-3 md:grid-cols-2">
                    {participant.prs.map((pr) => (
                      <div
                        key={pr.distanceKey}
                        className="rounded-lg border border-border bg-background p-3.5 shadow-sm transition-all hover:border-primary/50 hover:shadow-md sm:p-4"
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:text-xs">
                              {pr.label}
                            </p>
                            <p className="mt-1.5 text-xl font-semibold sm:mt-2 sm:text-2xl">
                              {pr.recordSeconds === null ? "--" : formatDuration(pr.recordSeconds)}
                            </p>
                          </div>
                          <div className="rounded-md border border-border px-2 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
                            {pr.recordSeconds === null ? "Open" : "Logged"}
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

function MetricTile({
  icon,
  label,
  value,
  fullWidth = false,
}: {
  icon: React.ReactNode
  label: string
  value: string
  fullWidth?: boolean
}) {
  return (
    <div className={cn("bg-card p-3.5 sm:p-5", fullWidth && "sm:col-span-2")}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <p className="text-[10px] uppercase tracking-[0.24em] sm:text-[11px]">{label}</p>
      </div>
      <p className="mt-2 text-xl font-semibold sm:mt-3 sm:text-2xl">{value}</p>
    </div>
  )
}
