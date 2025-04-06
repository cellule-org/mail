import * as React from "react"

import { cn } from "@/lib/utils"

interface InputProps {
  prefixIcon?: React.ReactNode
  suffixIcon?: React.ReactNode
}

function Input({ className, type, prefixIcon, suffixIcon, ...props }: React.ComponentProps<"input"> & InputProps) {
  return (
    <div className="relative flex items-center">
      {prefixIcon && <span className="absolute left-3">{prefixIcon}</span>}
      <input
        type={type}
        data-slot="input"
        className={cn(
          "border-input file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          prefixIcon ? "pl-10" : "",
          suffixIcon ? "pr-10" : "",
          className
        )}
        {...props}
      />
      {suffixIcon && <span className="absolute right-3">{suffixIcon}</span>}
    </div>
  )
}

export { Input }
