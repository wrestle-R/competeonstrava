import Link from "next/link"
import { unstable_noStore as noStore } from "next/cache"
import { DatabaseZap, RotateCcw } from "lucide-react"

import { buttonVariants } from "@/lib/button-styles"
import { cn } from "@/lib/utils"

function readParam(value: string | string[] | undefined, fallback: string) {
  return typeof value === "string" ? value : fallback
}

export default async function AdminRefreshPage({
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
    <div className="grid gap-6">
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
          This refresh pulls every connected runner from Strava and updates cached
          leaderboard totals in Postgres. PR records do not get updated here anymore;
          those stay manual on the admin records page.
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
            href="/admin/records"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            View records
          </Link>
        </div>
      </section>

      <section className="panel-shadow border border-border bg-card p-6 sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Curl
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Manual refresh request</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          If you want to trigger the same refresh outside the browser, use this `curl`
          command while sending the admin cookie.
        </p>
        <pre className="mt-4 overflow-x-auto border border-border bg-background p-4 text-sm text-foreground">
          <code>{`curl -X POST "${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/refresh" \\
  -H "Cookie: admin-pass=YOUR_ADMIN_PASSWORD" \\
  -i`}</code>
        </pre>
      </section>
    </div>
  )
}
