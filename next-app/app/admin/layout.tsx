import type { ReactNode } from "react"

import Link from "next/link"
import { cookies } from "next/headers"

import { loginAdminAction, logoutAdminAction } from "@/app/admin/actions"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { buttonVariants } from "@/lib/button-styles"
import { cn } from "@/lib/utils"

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "russelruns"
const ADMIN_COOKIE = "admin-pass"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const authenticated = cookieStore.get(ADMIN_COOKIE)?.value === ADMIN_PASSWORD

  if (!authenticated) {
    return (
      <main className="noise-overlay flex min-h-screen items-center justify-center bg-background px-4 py-6">
        <section className="panel-shadow w-full max-w-md border border-border bg-card p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            Admin locked
          </p>
          <h1 className="mt-2 text-2xl font-semibold">Enter admin password</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            This entire admin area is password protected.
          </p>
          <form action={loginAdminAction} className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                Password
              </span>
              <input
                type="password"
                name="password"
                className="h-10 border border-border bg-background px-3 text-sm outline-none transition focus:border-foreground"
              />
            </label>
            <button type="submit" className={cn(buttonVariants())}>
              Enter admin
            </button>
          </form>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="lg:flex">
        <AdminSidebar />
        <div className="min-w-0 flex-1">
          <header className="border-b border-border bg-card/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                  Manage Strava data
                </p>
                <h1 className="mt-1 text-2xl font-semibold">Admin</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/records" className={cn(buttonVariants({ variant: "outline" }))}>
                  Public records
                </Link>
                <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
                  Home
                </Link>
                <form action={logoutAdminAction}>
                  <button type="submit" className={cn(buttonVariants({ variant: "outline" }))}>
                    Logout
                  </button>
                </form>
              </div>
            </div>
          </header>
          <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</div>
        </div>
      </div>
    </main>
  )
}
