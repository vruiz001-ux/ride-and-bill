"use client";
import { useState, useRef, useEffect } from "react";

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(s => s !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const displayLabel = selected.length === 0
    ? `All ${label}`
    : selected.length === 1
    ? selected[0]
    : `${selected.length} ${label.toLowerCase()}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors ${
          selected.length > 0
            ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
            : "border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
        }`}
      >
        {displayLabel}
        <svg className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && options.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-60 w-48 overflow-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
          <button
            onClick={() => onChange([])}
            className="w-full rounded-lg px-3 py-1.5 text-left text-xs font-medium text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-700"
          >
            Clear all
          </button>
          <button
            onClick={() => onChange([...options])}
            className="w-full rounded-lg px-3 py-1.5 text-left text-xs font-medium text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-700"
          >
            Select all
          </button>
          <div className="my-1 border-t border-neutral-100 dark:border-neutral-700" />
          {options.map(opt => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="h-3.5 w-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-neutral-700 dark:text-neutral-300">{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
