import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"
import { DatabaseZap, RotateCcw } from "lucide-react"

import { buttonVariants } from "@/lib/button-styles"
import { cn } from "@/lib/utils"

function readParam(value: string | string[] | undefined, fallback: string) {
  return typeof value === "string" ? value : fallback
}

export default async function RefreshPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  noStore()

  const params = await searchParams
  const status = readParam(params.status, "")
  const synced = readParam(params.synced, "0")
  const skipped = readParam(params.skipped, "0")
  const failed = readParam(params.failed, "0")

  return (
    <main className="noise-overlay min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <section className="panel-shadow border border-border bg-card p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <DatabaseZap className="size-6 text-primary" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Hidden control room
              </p>
              <h1 className="mt-1 text-3xl font-semibold text-foreground">
                Refresh all runners
              </h1>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">
            This page pulls every connected Robinsonites account from Strava,
            updates cached totals in Postgres, and keeps the home page focused on
            the cached leaderboard for the current four-runner lineup.
          </p>

          {status ? (
            <div className="mt-6 border border-border bg-background p-4 text-sm text-foreground">
              <p className="font-medium">
                {status === "ok" ? "Refresh finished." : "Refresh finished with issues."}
              </p>
              <p className="mt-2 text-muted-foreground">
                Synced: {synced} | Skipped: {skipped} | Failed: {failed}
              </p>
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <form action="/api/refresh" method="post">
              <button
                type="submit"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "panel-shadow border border-foreground"
                )}
              >
                <RotateCcw className="size-4" />
                Refresh now
              </button>
            </form>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Back home
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
