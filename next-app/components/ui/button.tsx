"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"

import { buttonVariants, type ButtonVariantProps } from "@/lib/button-styles"
import { cn } from "@/lib/utils"

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & ButtonVariantProps) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
