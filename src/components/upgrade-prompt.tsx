"use client";

import { Button } from "@/components/ui/button";

interface UpgradePromptProps {
  message: string;
  feature?: string;
  currentPlan?: string;
}

export function UpgradePrompt({ message, feature, currentPlan }: UpgradePromptProps) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/20">
      <div className="flex items-start gap-3">
        <div className="text-lg">&#x26A0;&#xFE0F;</div>
        <div className="flex-1">
          <div className="text-sm font-medium text-amber-800 dark:text-amber-300">{message}</div>
          {feature && (
            <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {feature} is not available on the {currentPlan || "current"} plan.
            </div>
          )}
          <Button size="sm" className="mt-3" variant="outline">
            View Plans
          </Button>
        </div>
      </div>
    </div>
  );
}

interface LimitWarningProps {
  current: number;
  limit: number;
  label: string;
}

export function LimitWarning({ current, limit, label }: LimitWarningProps) {
  if (current < limit * 0.8) return null;

  const isOver = current >= limit;

  return (
    <div className={`rounded-lg px-3 py-2 text-xs font-medium ${isOver ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400" : "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400"}`}>
      {isOver
        ? `${label} limit reached (${current}/${limit}). Upgrade to continue.`
        : `${label}: ${current}/${limit} used (${Math.round((current / limit) * 100)}%).`}
    </div>
  );
}
