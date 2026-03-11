"use client";

interface UsageBarProps {
  label: string;
  current: number;
  limit: number;
  unit?: string;
}

export function UsageBar({ label, current, limit, unit = "" }: UsageBarProps) {
  const percent = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const isNearLimit = percent >= 80;
  const isAtLimit = percent >= 100;

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-neutral-500">{label}</span>
        <span className={`font-medium ${isAtLimit ? "text-red-500" : isNearLimit ? "text-amber-500" : "text-neutral-700 dark:text-neutral-300"}`}>
          {current}{unit} / {limit}{unit}
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
        <div
          className={`h-full rounded-full transition-all ${isAtLimit ? "bg-red-500" : isNearLimit ? "bg-amber-500" : "bg-neutral-900 dark:bg-white"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
