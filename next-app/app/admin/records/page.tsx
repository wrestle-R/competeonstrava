import { unstable_noStore as noStore } from "next/cache"

import { saveRecordAction } from "@/app/admin/actions"
import { buttonVariants } from "@/lib/button-styles"
import { formatDuration, formatPacePerKm, getPublicPrBoard } from "@/lib/records"
import { cn } from "@/lib/utils"

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string
  name: string
  defaultValue?: string | null
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-10 border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground"
      />
    </label>
  )
}

export default async function AdminRecordsPage() {
  noStore()
  const board = await getPublicPrBoard()

  return (
    <div className="grid gap-6">
      <section className="panel-shadow border border-border bg-card p-4 sm:p-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Records
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Manually update each runner&apos;s PRs</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Each distance belongs to a runner. Saving here updates that runner&apos;s PR directly.
          Refresh now updates only leaderboard totals, so records are managed here on the
          admin side.
        </p>
      </section>

      <section className="grid gap-4">
        {board.map((participant) => (
          <article
            key={participant.participantId}
            className="panel-shadow border border-border bg-card p-4 sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  {participant.participantSlug}
                </p>
                <h3 className="mt-1 text-xl font-semibold">{participant.participantName}</h3>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {participant.prs.map((pr) => (
                <div key={pr.distanceKey} className="border border-border bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                        {pr.label}
                      </p>
                      <p className="mt-1 text-lg font-semibold">
                        {formatDuration(pr.recordSeconds)}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatPacePerKm(pr.recordSeconds, pr.distanceKm) ?? "Pace pending"}
                      </p>
                    </div>
                    <p className="text-right text-sm text-muted-foreground">
                      {pr.source ?? "manual"}
                    </p>
                  </div>

                  <form action={saveRecordAction} className="mt-4 flex flex-wrap items-end gap-3">
                    <input type="hidden" name="participantId" value={participant.participantId} />
                    <input type="hidden" name="distanceKey" value={pr.distanceKey} />
                    <div className="min-w-[180px] flex-1">
                      <Field
                        label="Time"
                        name="timeText"
                        defaultValue={pr.recordSeconds ? formatDuration(pr.recordSeconds) : ""}
                      />
                    </div>
                    <button type="submit" className={cn(buttonVariants())}>
                      Save manual PR
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
