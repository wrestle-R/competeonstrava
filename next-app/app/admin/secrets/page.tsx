import { unstable_noStore as noStore } from "next/cache"
import Link from "next/link"
import { CircleCheckBig, CircleDashed } from "lucide-react"

import { saveParticipantSecretAction } from "@/app/admin/actions"
import { buttonVariants } from "@/lib/button-styles"
import { getParticipantRowsSafe } from "@/lib/participants"
import { cn } from "@/lib/utils"

function formatExpiry(date: Date | null) {
  if (!date) {
    return "Not set"
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatExpiryUnix(date: Date | null) {
  if (!date) {
    return "Not set"
  }

  return String(Math.floor(date.getTime() / 1000))
}

function formatExpiryUnixInput(date: Date | null) {
  if (!date) {
    return ""
  }

  return String(Math.floor(date.getTime() / 1000))
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  readOnly = false,
  type = "text",
  inputMode,
}: {
  label: string
  name: string
  defaultValue?: string | null
  placeholder?: string
  readOnly?: boolean
  type?: React.HTMLInputTypeAttribute
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </span>
      <input
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        readOnly={readOnly}
        type={type}
        inputMode={inputMode}
        className="h-10 border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground"
      />
    </label>
  )
}

export default async function AdminSecretsPage() {
  noStore()

  const participants = await getParticipantRowsSafe()

  return (
    <div className="grid gap-6">
      <section className="panel-shadow border border-border bg-card p-4 sm:p-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Secrets
        </p>
        <h2 className="mt-2 text-2xl font-semibold">Manage Strava client credentials</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Add runners here, store each person&apos;s Strava client ID and client secret,
          and use the same page to update them later. Once a runner has valid credentials,
          you can send them through the connect flow from the auth desk.
        </p>
      </section>

      <section className="grid gap-4">
        {participants.map((participant) => {
          const connected = Boolean(participant.refreshToken && participant.athleteId)
          const ready = Boolean(participant.clientId && participant.clientSecret)

          return (
            <form
              key={participant.id}
              action={saveParticipantSecretAction}
              className="panel-shadow grid gap-4 border border-border bg-card p-4 sm:p-5"
            >
              <input type="hidden" name="id" value={participant.id} />

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    {participant.slug}
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">{participant.name}</h3>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  {connected ? (
                    <>
                      <CircleCheckBig className="size-4 text-accent-foreground" />
                      <span>Connected</span>
                    </>
                  ) : (
                    <>
                      <CircleDashed className="size-4 text-muted-foreground" />
                      <span>{ready ? "Ready to connect" : "Needs secrets"}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name" name="name" defaultValue={participant.name} />
                <Field
                  label="Slug"
                  name="slug"
                  defaultValue={participant.slug}
                />
                <Field
                  label="Client ID"
                  name="clientId"
                  defaultValue={participant.clientId}
                  placeholder="123456"
                />
                <Field
                  label="Client Secret"
                  name="clientSecret"
                  defaultValue={participant.clientSecret}
                  placeholder="Paste Strava client secret"
                />
                <Field
                  label="Token expiry unix"
                  name="tokenExpiresAtUnix"
                  defaultValue={formatExpiryUnixInput(participant.tokenExpiresAt)}
                  placeholder="1774459496"
                  type="number"
                  inputMode="numeric"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="border border-border bg-background px-3 py-3 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    Athlete
                  </p>
                  <p className="mt-1 font-medium">
                    {participant.athleteName ?? "Not connected"}
                  </p>
                </div>
                <div className="border border-border bg-background px-3 py-3 text-sm">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    Token expiry
                  </p>
                  <p className="mt-1 font-medium">{formatExpiry(participant.tokenExpiresAt)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Unix: {formatExpiryUnix(participant.tokenExpiresAt)}
                  </p>
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Notes
                </span>
                <textarea
                  name="notes"
                  defaultValue={participant.notes ?? ""}
                  rows={3}
                  className="border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button type="submit" className={cn(buttonVariants())}>
                  Save secrets
                </button>
                {ready ? (
                  <Link
                    href={`/api/strava/start?user=${participant.slug}`}
                    className={cn(buttonVariants({ variant: "outline" }))}
                  >
                    Connect Strava
                  </Link>
                ) : null}
              </div>
            </form>
          )
        })}
      </section>

      <section className="panel-shadow border border-border bg-card p-4 sm:p-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          Add user
        </p>
        <h3 className="mt-2 text-xl font-semibold">Create a new runner entry</h3>
        <form action={saveParticipantSecretAction} className="mt-4 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name" name="name" placeholder="Runner name" />
            <Field label="Slug" name="slug" placeholder="runner-slug" />
            <Field label="Client ID" name="clientId" placeholder="123456" />
            <Field
              label="Client Secret"
              name="clientSecret"
              placeholder="Paste Strava client secret"
            />
            <Field
              label="Token expiry unix"
              name="tokenExpiresAtUnix"
              placeholder="1774459496"
              type="number"
              inputMode="numeric"
            />
          </div>

          <label className="grid gap-2">
            <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Notes
            </span>
            <textarea
              name="notes"
              rows={3}
              className="border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-foreground"
            />
          </label>

          <div>
            <button type="submit" className={cn(buttonVariants())}>
              Add user
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
