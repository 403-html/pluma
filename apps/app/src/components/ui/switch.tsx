'use client'

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const switchVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input",
  {
    variants: {
      size: {
        default: "h-6 w-11",
        sm: "h-5 w-9",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

const thumbVariants = cva(
  "pointer-events-none block rounded-full bg-primary-foreground shadow-lg ring-0 transition-transform",
  {
    variants: {
      size: {
        default:
          "h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        sm: "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
    VariantProps<typeof switchVariants> {}

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, size, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(switchVariants({ size, className }))}
    ref={ref}
    {...props}
  >
    <SwitchPrimitive.Thumb className={cn(thumbVariants({ size }))} />
  </SwitchPrimitive.Root>
))
Switch.displayName = SwitchPrimitive.Root.displayName

export interface SwitchFieldProps
  extends React.ComponentPropsWithoutRef<typeof Switch> {
  label?: string
  description?: string
  labelPosition?: "left" | "right"
}

function SwitchField({
  label,
  description,
  labelPosition = "right",
  id,
  ...props
}: SwitchFieldProps) {
  const generatedId = React.useId()
  const switchId = id ?? generatedId

  const hasLabel = label !== undefined || description !== undefined

  const labelElement = hasLabel ? (
    <label htmlFor={switchId} className="flex flex-col gap-0.5 cursor-pointer">
      {label && (
        <span className="text-sm font-medium leading-none">{label}</span>
      )}
      {description && (
        <span className="text-xs text-muted-foreground">{description}</span>
      )}
    </label>
  ) : null

  return (
    <div className="flex items-center gap-3">
      {labelPosition === "left" && labelElement}
      <Switch id={switchId} {...props} />
      {labelPosition === "right" && labelElement}
    </div>
  )
}

SwitchField.displayName = "SwitchField"

export { Switch, SwitchField }
