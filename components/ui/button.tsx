import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-[15px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-offset-2 focus-visible:ring-offset-dark-950 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Primary - Orange brand color with lift effect
        default:
          "bg-brand-orange text-black " +
          "[box-shadow:inset_0_1px_0_color-mix(in_srgb,var(--accent-white)_25%,transparent),0_1px_2px_color-mix(in_srgb,var(--brand-orange)_30%,transparent),0_4px_12px_color-mix(in_srgb,var(--brand-orange)_20%,transparent)] " +
          "hover:bg-brand-orange-hover hover:translate-y-[-2px] " +
          "hover:[box-shadow:inset_0_1px_0_color-mix(in_srgb,var(--accent-white)_30%,transparent),0_4px_12px_color-mix(in_srgb,var(--brand-orange)_40%,transparent),0_8px_24px_color-mix(in_srgb,var(--brand-orange)_25%,transparent)] " +
          "active:translate-y-0 active:scale-[0.98]",

        // Secondary - Dark with subtle border
        secondary:
          "bg-white/[0.08] text-white border border-white/[0.12] " +
          "hover:bg-white/[0.12] hover:border-white/[0.2] hover:translate-y-[-2px] " +
          "active:translate-y-0 active:scale-[0.98]",

        // Ghost - Minimal, for less important actions
        ghost:
          "bg-transparent text-white/70 " +
          "hover:bg-white/[0.05] hover:text-white hover:translate-y-[-1px] " +
          "active:translate-y-0",

        // Outline - Bordered with transparent background
        outline:
          "bg-transparent text-white border border-white/[0.2] " +
          "hover:bg-white/[0.05] hover:border-white/[0.3] hover:translate-y-[-2px] " +
          "active:translate-y-0 active:scale-[0.98]",

        // Destructive - Red for dangerous actions
        destructive:
          "bg-red-500 text-white " +
          "[box-shadow:inset_0_1px_0_color-mix(in_srgb,var(--accent-white)_20%,transparent),0_4px_12px_color-mix(in_srgb,var(--accent-crimson)_30%,transparent)] " +
          "hover:bg-red-600 hover:translate-y-[-2px] " +
          "hover:[box-shadow:inset_0_1px_0_color-mix(in_srgb,var(--accent-white)_20%,transparent),0_4px_16px_color-mix(in_srgb,var(--accent-crimson)_40%,transparent)] " +
          "active:translate-y-0 active:scale-[0.98]",

        // Code - For code-related actions
        code:
          "bg-accent-black text-white " +
          "hover:bg-warm-850 hover:translate-y-[-1px] " +
          "active:translate-y-0",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 px-3 py-1.5 text-sm",
        lg: "h-12 px-6 py-3 text-base",
        icon: "h-10 w-10 p-2",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? "span" : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
