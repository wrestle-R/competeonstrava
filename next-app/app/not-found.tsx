import Image from "next/image"
import Link from "next/link"

import { buttonVariants } from "@/lib/button-styles"
import { cn } from "@/lib/utils"

const quotes = [
  { text: "This page is just like her. Doesn't exist.", author: "Romeiro" },
  { text: "I'm going back to 505 (minus 101).", author: "Romeiro" },
  { text: "Well, this is awkward, page not found.", author: "Someone Probably" },
  { text: "Everyone deserves a vacation even this page.", author: "Unknown" },
  { text: "This page went out to buy milk and never came back.", author: "Dark Mode probably" },
  { text: "404: Like your hopes and dreams, gone.", author: "The Dreamers" },
]

function getQuoteOfTheVisit() {
  const index = Math.abs(new Date().getUTCDate()) % quotes.length
  return quotes[index]
}

export default function NotFound() {
  const quote = getQuoteOfTheVisit()

  return (
    <main className="noise-overlay min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center">
        <section className="panel-shadow grid w-full gap-0 overflow-hidden border border-border bg-card lg:grid-cols-[0.95fr_1.05fr]">
          <div className="hero-glow flex flex-col justify-between gap-10 border-b border-foreground p-8 text-primary-foreground lg:border-r lg:border-b-0 lg:p-10">
            <div className="flex items-center gap-4">
              <Image
                src="/logo.png"
                alt="Compete on Strava logo"
                width={72}
                height={50}
                className="h-auto w-[72px]"
                priority
              />
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-primary-foreground/70">
                  Robinsonites
                </p>
                <h1 className="mt-2 text-5xl font-semibold leading-none">404</h1>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-primary-foreground/70">
                Missing route
              </p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
                If it&apos;s not on Strava, it didn&apos;t happen. If it&apos;s not here, it really didn&apos;t happen.
              </h2>
            </div>
          </div>

          <div className="flex flex-col justify-between gap-8 p-8 lg:p-10">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Quote of the error
              </p>
              <blockquote className="mt-4 border-l-4 border-primary pl-4 text-2xl leading-tight text-foreground sm:text-3xl">
                {quote.text}
              </blockquote>
              <p className="mt-4 text-sm uppercase tracking-[0.25em] text-muted-foreground">
                {quote.author}
              </p>
            </div>

            <div className="space-y-4">
              <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                The page you wanted is missing, but the challenge is still on. Head
                back home, connect runners, or refresh the leaderboard.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/"
                  className={cn(buttonVariants({ size: "lg" }), "panel-shadow border border-foreground")}
                >
                  Back home
                </Link>
                <Link
                  href="/auth"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "panel-shadow border-foreground bg-background"
                  )}
                >
                  Go to auth
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
