import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100",
        success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
        warning: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
        destructive: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
        secondary: "bg-neutral-50 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
        uber: "bg-black text-white",
        bolt: "bg-emerald-600 text-white",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
