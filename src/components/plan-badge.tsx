"use client";

const PLAN_COLORS: Record<string, string> = {
  free: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
  solo: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  pro: "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  team: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  custom: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

interface PlanBadgeProps {
  plan: string;
  size?: "sm" | "md";
}

export function PlanBadge({ plan, size = "sm" }: PlanBadgeProps) {
  const colors = PLAN_COLORS[plan] || PLAN_COLORS.free;
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs";

  return (
    <span className={`inline-flex items-center rounded-full font-semibold uppercase tracking-wide ${colors} ${sizeClasses}`}>
      {plan}
    </span>
  );
}
