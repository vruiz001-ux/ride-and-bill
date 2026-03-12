"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { PlanBadge } from "@/components/plan-badge";
import { Logo } from "@/components/logo";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "\uD83D\uDCCA" },
  { href: "/receipts", label: "Receipts", icon: "\uD83E\uDDFE" },
  { href: "/exports", label: "Exports", icon: "\uD83D\uDCE5" },
  { href: "/billing", label: "Billing", icon: "\uD83C\uDFE2" },
  { href: "/settings", label: "Settings", icon: "\u2699\uFE0F" },
];

const adminNavItem = { href: "/admin", label: "Admin", icon: "\uD83D\uDEE1\uFE0F" };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [planId, setPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.plan?.id) setPlanId(data.plan.id);
      })
      .catch(() => {});
  }, []);

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-neutral-200/60 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex h-24 items-center justify-center border-b border-neutral-200/60 px-4 dark:border-neutral-800">
          <Logo height={72} />
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {[...navItems, ...(session?.user?.role === "admin" ? [adminNavItem] : [])].map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-neutral-100 text-neutral-900 dark:bg-neutral-800 dark:text-white"
                    : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-900"
                )}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-200/60 p-4 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                  {userName}
                </div>
                {planId && <PlanBadge plan={planId} />}
              </div>
              <div className="truncate text-xs text-neutral-400">{userEmail}</div>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
              title="Sign out"
            >
              &nearr;
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-64 flex-1">
        <div className="mx-auto max-w-7xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
