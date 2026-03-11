"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/plan-badge";
import { UsageBar } from "@/components/usage-bar";
import { LimitWarning } from "@/components/upgrade-prompt";
import { formatCurrency, formatDate, providerLabel } from "@/lib/utils";
import Link from "next/link";
import type { DashboardStats, ConnectedEmailAccount } from "@/lib/types";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

interface PlanInfo {
  id: string;
  name: string;
  status: string;
  isActive: boolean;
  isGracePeriod: boolean;
  isReadOnly: boolean;
  isOverSeatLimit: boolean;
  isOverInboxLimit: boolean;
  features: Record<string, boolean>;
}

interface UsageInfo {
  periodStart: string;
  periodEnd: string;
  receiptsUsed: number;
  seatCount: number;
  inboxCount: number;
  receiptsLimit: number;
  seatsLimit: number;
  inboxesLimit: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [accounts, setAccounts] = useState<ConnectedEmailAccount[]>([]);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncMonth, setSyncMonth] = useState<string>("");
  const [syncYear, setSyncYear] = useState<string>("");

  const fetchData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setAccounts(data.emailAccounts);
        setPlan(data.plan || null);
        setUsage(data.usage || null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const body: Record<string, string> = {};
      if (syncMonth) body.month = syncMonth;
      if (syncYear) body.year = syncYear;
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok && data.code) {
        setSyncResult(data.error || "Sync blocked by plan limits");
      } else {
        setSyncResult(data.message || data.error || "Sync complete");
      }
      await fetchData();
    } catch {
      setSyncResult("Sync failed — please try again");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-neutral-400">Loading dashboard...</div>;
  }

  if (!stats) {
    return <div className="flex items-center justify-center py-24 text-neutral-400">No data yet. Connect Gmail and sync to get started.</div>;
  }

  const account = accounts[0];
  const canSync = plan?.features?.gmailSync || plan?.features?.outlookSync;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-neutral-500">Your ride receipt intelligence at a glance.</p>
        </div>
        <div className="flex items-center gap-3">
          {plan && <PlanBadge plan={plan.id} size="md" />}
          <Link href="/exports">
            <Button size="sm" variant="outline">Export</Button>
          </Link>
        </div>
      </div>

      {/* Billing warnings */}
      {plan?.isReadOnly && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800/50 dark:bg-red-900/20">
          <div className="text-sm font-medium text-red-700 dark:text-red-400">
            Your subscription is inactive. Data is read-only. Please update your billing to resume.
          </div>
        </div>
      )}
      {plan?.isGracePeriod && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/20">
          <div className="text-sm font-medium text-amber-700 dark:text-amber-400">
            Your payment is past due. Please update your billing to avoid service interruption.
          </div>
        </div>
      )}

      {/* Usage overview */}
      {usage && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Current Period Usage</span>
              <span className="text-xs text-neutral-400">
                {new Date(usage.periodStart).toLocaleDateString()} — {new Date(usage.periodEnd).toLocaleDateString()}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <UsageBar label="Receipts" current={usage.receiptsUsed} limit={usage.receiptsLimit} />
              <UsageBar label="Seats" current={usage.seatCount} limit={usage.seatsLimit} />
              <UsageBar label="Inboxes" current={usage.inboxCount} limit={usage.inboxesLimit} />
            </div>
            <LimitWarning current={usage.receiptsUsed} limit={usage.receiptsLimit} label="Receipts" />
          </CardContent>
        </Card>
      )}

      {/* Sync controls */}
      {canSync ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Sync period:</span>
              <select
                value={syncMonth}
                onChange={(e) => setSyncMonth(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="">All months</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>{m}</option>
                ))}
              </select>
              <select
                value={syncYear}
                onChange={(e) => setSyncYear(e.target.value)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="">All years</option>
                {YEARS.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
              <Button size="sm" onClick={handleSync} disabled={syncing || plan?.isReadOnly}>
                {syncing ? "Syncing..." : "Sync Emails"}
              </Button>
              {syncResult && (
                <span className="text-xs text-neutral-500">{syncResult}</span>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Email Sync</div>
                <div className="text-xs text-neutral-400">Upgrade to Solo or higher to connect an inbox and auto-sync receipts.</div>
              </div>
              <Button size="sm" variant="outline">Upgrade</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {account && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg dark:bg-blue-900/20">&#x1F4E7;</div>
              <div>
                <div className="text-sm font-medium text-neutral-900 dark:text-white">{account.email}</div>
                <div className="text-xs text-neutral-400">
                  {account.lastSyncAt ? `Last synced: ${formatDate(account.lastSyncAt)}` : "Never synced"}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="success">{account.status}</Badge>
              <span className="text-sm text-neutral-500">{account.totalImported} receipts imported</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-neutral-500">Total Receipts</div>
            <div className="mt-2 text-3xl font-bold text-neutral-900 dark:text-white">{stats.totalReceipts}</div>
            {stats.reviewCount > 0 && (
              <div className="mt-2"><Badge variant="warning">{stats.reviewCount} need review</Badge></div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-neutral-500">Total Spend (PLN)</div>
            <div className="mt-2 text-3xl font-bold text-neutral-900 dark:text-white">{formatCurrency(stats.totalSpend, 'PLN')}</div>
            <div className="mt-2 text-xs text-neutral-400">Converted at FX rates</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-neutral-500">Invoiceable</div>
            <div className="mt-2 text-3xl font-bold text-emerald-600">{formatCurrency(stats.invoiceableTotal, 'PLN')}</div>
            <div className="mt-2 text-xs text-neutral-400">With 5% markup</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-medium text-neutral-500">Currencies</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {stats.byCurrency.map((c) => (
                <Badge key={c.currency} variant="secondary">{c.currency} ({c.count})</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>By Provider</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.byProvider.map((p) => (
                <div key={p.provider} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={p.provider as 'uber' | 'bolt'}>{providerLabel(p.provider)}</Badge>
                    <span className="text-sm text-neutral-500">{p.count} rides</span>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">{formatCurrency(p.total, 'PLN')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>By Country</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.byCountry.map((c) => (
                <div key={c.country} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{c.country}</span>
                    <span className="text-xs text-neutral-400">({c.count})</span>
                  </div>
                  <span className="text-sm font-semibold text-neutral-900 dark:text-white">{formatCurrency(c.total, 'PLN')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.byMonth.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Monthly Spend</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              {stats.byMonth.map((m) => {
                const maxTotal = Math.max(...stats.byMonth.map(x => x.total));
                const height = maxTotal > 0 ? (m.total / maxTotal) * 160 : 0;
                return (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">{formatCurrency(m.total, 'PLN')}</span>
                    <div className="w-full rounded-t-lg bg-neutral-900 dark:bg-white" style={{ height: `${Math.max(height, 8)}px` }} />
                    <span className="text-xs text-neutral-400">{m.month}</span>
                    <span className="text-xs text-neutral-400">{m.count} rides</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {stats.recentReceipts.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Receipts</CardTitle>
            <Link href="/receipts"><Button variant="ghost" size="sm">View all</Button></Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentReceipts.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-neutral-100 p-4 dark:border-neutral-800">
                  <div className="flex items-center gap-4">
                    <Badge variant={r.provider as 'uber' | 'bolt'}>{providerLabel(r.provider)}</Badge>
                    <div>
                      <div className="text-sm font-medium text-neutral-900 dark:text-white">{r.city}, {r.country}</div>
                      <div className="text-xs text-neutral-400">{formatDate(r.tripDate)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-neutral-900 dark:text-white">{formatCurrency(r.amountTotal, r.currency)}</div>
                    {r.convertedCurrency && r.convertedCurrency !== r.currency && (
                      <div className="text-xs text-neutral-400">&asymp; {formatCurrency(r.convertedAmount!, r.convertedCurrency)}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
