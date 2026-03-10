"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, providerLabel } from "@/lib/utils";

interface AdminStats {
  totalUsers: number;
  totalReceipts: number;
  totalExports: number;
  emailAccounts: number;
  receiptsByProvider: { provider: string; count: number }[];
  receiptsByStatus: { status: string; count: number }[];
  recentUsers: { id: string; name: string | null; email: string; createdAt: string; role: string }[];
}

export default function AdminPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then(r => {
        if (!r.ok) throw new Error(r.status === 403 ? "Access denied" : "Failed to load");
        return r.json();
      })
      .then(setStats)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-neutral-400">Loading admin stats...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="text-4xl mb-4">🔒</div>
        <div className="text-neutral-500">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-neutral-500">System overview and user management.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Total Receipts" value={stats.totalReceipts} />
        <StatCard label="Total Exports" value={stats.totalExports} />
        <StatCard label="Email Accounts" value={stats.emailAccounts} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receipts by Provider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.receiptsByProvider.map(r => (
              <div key={r.provider} className="flex items-center justify-between">
                <Badge variant={r.provider as 'uber' | 'bolt'}>{providerLabel(r.provider)}</Badge>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">{r.count}</span>
              </div>
            ))}
            {stats.receiptsByProvider.length === 0 && (
              <div className="text-sm text-neutral-400">No receipts yet.</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receipts by Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {stats.receiptsByStatus.map(r => (
              <div key={r.status} className="flex items-center justify-between">
                <Badge variant={r.status === "parsed" ? "success" : r.status === "failed" ? "destructive" : "warning"}>{r.status}</Badge>
                <span className="text-sm font-medium text-neutral-900 dark:text-white">{r.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="pb-2 text-left font-medium text-neutral-400">Name</th>
                  <th className="pb-2 text-left font-medium text-neutral-400">Email</th>
                  <th className="pb-2 text-left font-medium text-neutral-400">Role</th>
                  <th className="pb-2 text-left font-medium text-neutral-400">Joined</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.map(u => (
                  <tr key={u.id} className="border-b border-neutral-100 dark:border-neutral-800/50">
                    <td className="py-2.5 text-neutral-900 dark:text-white">{u.name || "—"}</td>
                    <td className="py-2.5 text-neutral-500">{u.email}</td>
                    <td className="py-2.5"><Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge></td>
                    <td className="py-2.5 text-neutral-400">{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs font-medium text-neutral-400">{label}</div>
        <div className="mt-1 text-2xl font-bold text-neutral-900 dark:text-white">{value}</div>
      </CardContent>
    </Card>
  );
}
