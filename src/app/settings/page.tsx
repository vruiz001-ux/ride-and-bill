"use client";
import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlanBadge } from "@/components/plan-badge";
import { UsageBar } from "@/components/usage-bar";
import { SUPPORTED_CURRENCIES } from "@/lib/services/fx";
import type { ConnectedEmailAccount } from "@/lib/types";

const TIMEZONES = [
  "UTC", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Warsaw",
  "Europe/Prague", "Europe/Budapest", "Europe/Bucharest", "Europe/Stockholm",
  "America/New_York", "America/Chicago", "America/Los_Angeles",
  "Asia/Dubai", "Asia/Singapore", "Asia/Tokyo",
  "Pacific/Auckland", "Australia/Sydney",
];

interface PlanInfo {
  id: string;
  name: string;
  status: string;
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

export default function SettingsPage() {
  const { data: session } = useSession();
  const [emailAccounts, setEmailAccounts] = useState<ConnectedEmailAccount[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);

  // Profile fields
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [vatId, setVatId] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [defaultCurrency, setDefaultCurrency] = useState("EUR");
  const [markupPercent, setMarkupPercent] = useState(5);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      if (data) {
        setName(data.name || "");
        setCompanyName(data.companyName || "");
        setCompanyAddress(data.companyAddress || "");
        setVatId(data.vatId || "");
        setTimezone(data.timezone || "UTC");
        setDefaultCurrency(data.defaultCurrency || "EUR");
        setMarkupPercent(data.defaultMarkupPercent ?? 5);
        if (data.plan) setPlan(data.plan);
      }
    });
    fetch("/api/dashboard").then(r => r.json()).then(data => {
      setEmailAccounts(data.emailAccounts || []);
      if (data.usage) setUsage(data.usage);
      if (data.plan) setPlan(data.plan);
    });
  }, []);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const saveProfile = async () => {
    setSaving("profile");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, companyName: companyName || null, companyAddress: companyAddress || null, vatId: vatId || null, timezone }),
      });
      if (res.ok) showMessage("success", "Profile saved");
      else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to save profile");
      }
    } finally {
      setSaving(null);
    }
  };

  const savePreferences = async () => {
    setSaving("prefs");
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultCurrency, defaultMarkupPercent: markupPercent }),
      });
      if (res.ok) showMessage("success", "Preferences saved");
      else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to save preferences");
      }
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you sure? This will permanently delete your account and all data.")) return;
    if (!confirm("This cannot be undone. Are you absolutely sure?")) return;

    const res = await fetch("/api/settings", { method: "DELETE" });
    if (res.ok) {
      signOut({ callbackUrl: "/" });
    } else {
      showMessage("error", "Failed to delete account");
    }
  };

  const companyDetailsAllowed = plan?.features?.companyDetailsInReports ?? false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">Manage your account, email connections, and preferences.</p>
      </div>

      {message && (
        <div className={`rounded-lg p-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
          {message.text}
        </div>
      )}

      {/* Plan & Usage Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Plan & Usage</CardTitle>
            {plan && <PlanBadge plan={plan.id} size="md" />}
          </div>
          <CardDescription>
            {plan ? `You are on the ${plan.name} plan.` : "Loading plan info..."}
            {plan?.status && plan.status !== "active" && (
              <span className="ml-2 text-amber-600">Status: {plan.status}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {usage && (
            <div className="grid gap-4 sm:grid-cols-3">
              <UsageBar label="Receipts this period" current={usage.receiptsUsed} limit={usage.receiptsLimit} />
              <UsageBar label="Seats" current={usage.seatCount} limit={usage.seatsLimit} />
              <UsageBar label="Connected inboxes" current={usage.inboxCount} limit={usage.inboxesLimit} />
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="outline" size="sm">View Plans</Button>
            {plan?.id === "free" && (
              <Button size="sm">Upgrade</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your account and company information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Email</label>
              <input type="email" defaultValue={session?.user?.email || ""} disabled className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Company Name
                {!companyDetailsAllowed && <span className="ml-1 text-xs text-neutral-400">(paid plans)</span>}
              </label>
              <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp" disabled={!companyDetailsAllowed} className={`h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800 ${!companyDetailsAllowed ? "opacity-60" : ""}`} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                VAT / Tax ID
                {!companyDetailsAllowed && <span className="ml-1 text-xs text-neutral-400">(paid plans)</span>}
              </label>
              <input type="text" value={vatId} onChange={e => setVatId(e.target.value)} placeholder="PL1234567890" disabled={!companyDetailsAllowed} className={`h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800 ${!companyDetailsAllowed ? "opacity-60" : ""}`} />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Company Address
                {!companyDetailsAllowed && <span className="ml-1 text-xs text-neutral-400">(paid plans)</span>}
              </label>
              <input type="text" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="123 Business St, Warsaw, Poland" disabled={!companyDetailsAllowed} className={`h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800 ${!companyDetailsAllowed ? "opacity-60" : ""}`} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={saveProfile} disabled={saving === "profile"}>
            {saving === "profile" ? "Saving..." : "Save Profile"}
          </Button>
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
                {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.code} &mdash; {c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Default Markup (%)</label>
              <input type="number" value={markupPercent} onChange={e => setMarkupPercent(Number(e.target.value))} min={0} max={50} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
            </div>
          </div>
          <Button onClick={savePreferences} disabled={saving === "prefs"}>
            {saving === "prefs" ? "Saving..." : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Connections</CardTitle>
          <CardDescription>
            {emailAccounts.length > 0
              ? `${emailAccounts.length} email account(s) connected.`
              : "No email accounts connected yet."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <a href="/connections">
            <Button variant="outline">Manage Connections &rarr;</Button>
          </a>
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
            <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>Delete</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
