import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
  ({ className, id, label, ...props }, ref) => {
    const generatedId = React.useId();
    const resolvedId = id ?? generatedId;

    return (
      <label
        htmlFor={resolvedId}
        className={cn(
          "inline-flex items-center gap-2",
          props.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
          className,
        )}
      >
        <span className="relative inline-flex h-5 w-9 shrink-0">
          <input
            type="checkbox"
            id={resolvedId}
            ref={ref}
            className="peer sr-only"
            {...props}
          />
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 rounded-full transition-colors",
              "bg-input peer-checked:bg-primary",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background",
            )}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-4"
          />
        </span>
        {label && <span className="text-sm select-none">{label}</span>}
      </label>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
