import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Compete on Strava",
  description: "Robinsonites running leaderboard powered by Strava.",
  icons: {
    icon: [
      { url: "/runny-black-nobg.png", media: "(prefers-color-scheme: light)" },
      { url: "/runny-white-nobg.png", media: "(prefers-color-scheme: dark)" },
    ],
    shortcut: ["/runny-white-nobg.png"],
    apple: ["/runny-black-nobg.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased")}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
