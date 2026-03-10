"use client";
import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SUPPORTED_CURRENCIES } from "@/lib/services/fx";
import { formatDate } from "@/lib/utils";
import type { ConnectedEmailAccount } from "@/lib/types";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [emailAccounts, setEmailAccounts] = useState<ConnectedEmailAccount[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState("EUR");
  const [markupPercent, setMarkupPercent] = useState(5);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(data => {
        setEmailAccounts(data.emailAccounts || []);
      });
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/sync", { method: "POST" });
      const data = await fetch("/api/dashboard").then(r => r.json());
      setEmailAccounts(data.emailAccounts || []);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Manage your account, email connections, and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Name</label>
              <input type="text" defaultValue={session?.user?.name || ""} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</label>
              <input type="email" defaultValue={session?.user?.email || ""} disabled className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800" />
            </div>
          </div>
          <Button>Save Profile</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Currency & Conversion</CardTitle>
          <CardDescription>Default currency for consolidated views and invoice generation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Default Currency</label>
              <select value={defaultCurrency} onChange={e => setDefaultCurrency(e.target.value)} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Default Markup (%)</label>
              <input type="number" value={markupPercent} onChange={e => setMarkupPercent(Number(e.target.value))} min={0} max={50} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
            </div>
          </div>
          <div className="rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500 dark:bg-neutral-800/50">
            FX rates are sourced from bundled sample rates (MVP). Production will use ECB or Open Exchange Rates API for real-time historical rates.
          </div>
          <Button>Save Preferences</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connected Email Accounts</CardTitle>
          <CardDescription>Email accounts scanned for ride receipts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailAccounts.map(acc => (
            <div key={acc.id} className="flex items-center justify-between rounded-xl border border-neutral-200/60 p-4 dark:border-neutral-800">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg dark:bg-blue-900/20">
                  {acc.provider === "gmail" ? "📧" : acc.provider === "outlook" ? "📨" : "📬"}
                </div>
                <div>
                  <div className="text-sm font-medium text-neutral-900 dark:text-white">{acc.email}</div>
                  <div className="text-xs text-neutral-400">
                    {acc.provider.charAt(0).toUpperCase() + acc.provider.slice(1)} · {acc.totalImported} imported
                    {acc.lastSyncAt ? ` · Last sync ${formatDate(acc.lastSyncAt)}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={acc.status === "active" ? "success" : "warning"}>{acc.status}</Badge>
                <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
                  {syncing ? "Syncing..." : "Sync Now"}
                </Button>
              </div>
            </div>
          ))}
          {emailAccounts.length === 0 && (
            <div className="py-6 text-center text-neutral-400 text-sm">No email accounts connected.</div>
          )}
          <Button variant="outline" className="w-full" onClick={() => signIn("google", { callbackUrl: "/settings" })}>
            <span className="mr-2">+</span> Connect Gmail Account
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data & Privacy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-neutral-900 dark:text-white">Export All Data</div>
              <div className="text-xs text-neutral-400">Download a full export of your receipts and settings.</div>
            </div>
            <Button variant="outline" size="sm">Export</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-red-600">Delete Account</div>
              <div className="text-xs text-neutral-400">Permanently delete your account and all data.</div>
            </div>
            <Button variant="destructive" size="sm">Delete</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
