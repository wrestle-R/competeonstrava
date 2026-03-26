"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { KeyRound, RotateCcw, Trophy } from "lucide-react"

import { BrandLogo } from "@/components/brand-logo"
import { cn } from "@/lib/utils"

const navItems = [
  {
    section: "Admin",
    items: [
      { title: "Secrets", href: "/admin/secrets", icon: KeyRound },
      { title: "Records", href: "/admin/records", icon: Trophy },
      { title: "Refresh", href: "/admin/refresh", icon: RotateCcw },
    ],
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground lg:min-h-screen lg:w-72 lg:border-r lg:border-b-0">
      <div className="border-b border-sidebar-border px-4 py-4 sm:px-5 lg:px-6">
        <Link href="/admin/secrets" className="flex items-center gap-3">
          <BrandLogo className="h-11 w-11 shrink-0" priority />
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
              Control room
            </p>
            <p className="mt-1 text-lg font-semibold">Admin</p>
          </div>
        </Link>
      </div>

      <div className="px-3 py-4 sm:px-4">
        {navItems.map((group) => (
          <div key={group.section}>
            <p className="px-2 text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              {group.section}
            </p>
            <nav className="mt-3 grid gap-1">
              {group.items.map((item) => {
                const active = pathname === item.href

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 border px-3 py-3 text-sm transition-colors",
                      active
                        ? "border-foreground bg-sidebar-primary text-sidebar-primary-foreground"
                        : "border-sidebar-border bg-background hover:bg-sidebar-accent"
                    )}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  )
}
