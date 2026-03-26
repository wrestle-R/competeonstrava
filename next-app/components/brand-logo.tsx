import Image from "next/image"

import { cn } from "@/lib/utils"

export function BrandLogo({
  className,
  priority = false,
  alt = "Runny logo",
}: {
  className?: string
  priority?: boolean
  alt?: string
}) {
  return (
    <div className={cn("relative", className)}>
      <Image
        src="/runny-black-nobg.png"
        alt={alt}
        width={320}
        height={320}
        priority={priority}
        className="h-full w-full object-contain scale-[1.15] dark:hidden"
      />
      <Image
        src="/runny-white-nobg.png"
        alt={alt}
        width={320}
        height={320}
        priority={priority}
        className="hidden h-full w-full object-contain dark:block"
      />
    </div>
  )
}
