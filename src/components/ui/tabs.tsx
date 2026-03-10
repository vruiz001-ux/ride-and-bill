"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  active: string;
  setActive: (v: string) => void;
}
const TabsContext = React.createContext<TabsContextValue>({ active: "", setActive: () => {} });

function Tabs({ defaultValue, children, className }: { defaultValue: string; children: React.ReactNode; className?: string }) {
  const [active, setActive] = React.useState(defaultValue);
  return (
    <TabsContext.Provider value={{ active, setActive }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-1 rounded-xl bg-neutral-100 p-1 dark:bg-neutral-800", className)}>
      {children}
    </div>
  );
}

function TabsTrigger({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { active, setActive } = React.useContext(TabsContext);
  return (
    <button
      onClick={() => setActive(value)}
      className={cn(
        "rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all",
        active === value
          ? "bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white"
          : "text-neutral-500 hover:text-neutral-700 dark:text-neutral-400",
        className
      )}
    >
      {children}
    </button>
  );
}

function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const { active } = React.useContext(TabsContext);
  if (active !== value) return null;
  return <div className={className}>{children}</div>;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
