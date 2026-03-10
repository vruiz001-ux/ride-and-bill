import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ className, value = 0, max = 100, ...props }, ref) => (
    <div ref={ref} className={cn("relative h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800", className)} {...props}>
      <div
        className="h-full rounded-full bg-neutral-900 transition-all duration-300 dark:bg-white"
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
  )
);
Progress.displayName = "Progress";
export { Progress };
