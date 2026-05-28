"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  "aria-label": ariaLabel,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  // axe `aria-progressbar-name` rule needs SOME accessible name. Default to a
  // value-derived label so callers don't have to label every progress bar.
  const label = ariaLabel ?? (value != null ? `Progress: ${value}%` : "Progress");
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      aria-label={label}
      className={cn(
        "bg-secondary relative h-2 w-full overflow-hidden rounded-full",
        className
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
