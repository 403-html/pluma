'use client'

import * as React from "react"

import { cn } from "@/lib/utils"

export interface CheckboxProps extends Omit<React.ComponentPropsWithoutRef<'input'>, 'type'> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      onChange?.(e);
      onCheckedChange?.(e.currentTarget.checked);
    }

    return (
      <input
        type="checkbox"
        className={cn(
          "h-4 w-4 shrink-0 rounded border border-input bg-transparent accent-primary cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onChange={handleChange}
        ref={ref}
        {...props}
      />
    )
  }
)
Checkbox.displayName = 'Checkbox'

export interface CheckboxFieldProps extends CheckboxProps {
  label?: string;
  description?: string;
}

function CheckboxField({ label, description, id, disabled, ...props }: CheckboxFieldProps) {
  const generatedId = React.useId()
  const checkboxId = id ?? generatedId
  const hasLabelContent = label !== undefined || description !== undefined

  return (
    <div className="flex items-center gap-2">
      <Checkbox id={checkboxId} disabled={disabled} {...props} />
      {hasLabelContent && (
        <label
          htmlFor={checkboxId}
          className={cn(
            "flex flex-col gap-0.5 cursor-pointer select-none",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          {label && <span className="text-sm font-medium leading-none">{label}</span>}
          {description && <span className="text-xs text-muted-foreground">{description}</span>}
        </label>
      )}
    </div>
  )
}

CheckboxField.displayName = 'CheckboxField'

export { Checkbox, CheckboxField }
