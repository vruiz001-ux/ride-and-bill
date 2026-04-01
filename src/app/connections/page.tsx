"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession, signIn } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { ConnectedEmailAccount } from "@/lib/types";

export default function ConnectionsPage() {
  const { data: session } = useSession();
  const [emailAccounts, setEmailAccounts] = useState<ConnectedEmailAccount[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [plan, setPlan] = useState<{ id: string; name: string; features: Record<string, boolean> } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(data => {
        setEmailAccounts(data.emailAccounts || []);
        if (data.plan) setPlan(data.plan);
      })
      .catch(() => {});
  }, []);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        showMessage("error", data.error || "Sync failed");
      } else {
        const data = await res.json();
        showMessage("success", `Sync complete: ${data.newReceipts || 0} new receipts imported`);
        const dashData = await fetch("/api/dashboard").then(r => r.json());
        setEmailAccounts(dashData.emailAccounts || []);
      }
    } catch {
      showMessage("error", "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of fileArray) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/receipts/upload", { method: "POST", body: formData });
        if (res.ok) {
          successCount++;
        } else {
          errorCount++;
          const data = await res.json();
          console.error(`Upload failed for ${file.name}:`, data.error);
        }
      } catch {
        errorCount++;
      }
    }

    setUploading(false);
    if (successCount > 0 && errorCount === 0) {
      showMessage("success", `${successCount} receipt(s) uploaded successfully. Review them in the Receipts page.`);
    } else if (successCount > 0) {
      showMessage("success", `${successCount} uploaded, ${errorCount} failed. Check Receipts page for details.`);
    } else {
      showMessage("error", `Upload failed for all ${errorCount} file(s).`);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload]);

  const canConnectGmail = plan?.features?.gmailSync ?? false;
  const canConnectOutlook = plan?.features?.outlookSync ?? false;
  const canUpload = plan?.features?.manualUpload ?? true;

  return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Connections</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage email integrations and upload receipts manually.</p>
        </div>

        {message && (
          <div className={`rounded-lg p-3 text-sm ${message.type === "success" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
            {message.text}
          </div>
        )}

        {/* Connected Email Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>Connected Email Accounts</CardTitle>
            <CardDescription>Email accounts scanned for Uber and Bolt ride receipts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {emailAccounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between rounded-xl border border-neutral-200/60 p-4 dark:border-neutral-800">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg dark:bg-blue-900/20">
                    {acc.provider === "gmail" ? "\uD83D\uDCE7" : acc.provider === "outlook" ? "\uD83D\uDCE8" : "\uD83D\uDCEC"}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-neutral-900 dark:text-white">{acc.email}</div>
                    <div className="text-xs text-neutral-400">
                      {acc.provider.charAt(0).toUpperCase() + acc.provider.slice(1)} &middot; {acc.totalImported} imported
                      {acc.lastSyncAt ? ` \u00B7 Last sync ${formatDate(acc.lastSyncAt)}` : " \u00B7 Never synced"}
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
              <div className="rounded-xl border-2 border-dashed border-neutral-200 p-8 text-center dark:border-neutral-800">
                <div className="text-3xl mb-3">📬</div>
                <p className="text-sm text-neutral-500 mb-1">No email accounts connected yet.</p>
                <p className="text-xs text-neutral-400">Connect Gmail or Outlook to automatically import ride receipts.</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => signIn("google", { callbackUrl: "/connections" })}
                disabled={!canConnectGmail}
              >
                Connect Gmail
                {!canConnectGmail && <span className="ml-1 text-xs opacity-60">(upgrade)</span>}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => signIn("azure-ad", { callbackUrl: "/connections" })}
                disabled={!canConnectOutlook}
              >
                Connect Outlook
                {!canConnectOutlook && <span className="ml-1 text-xs opacity-60">(Pro+)</span>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Manual Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Manual Upload</CardTitle>
            <CardDescription>Upload receipt PDFs or images from Uber or Bolt. Files will be parsed and added to your receipts.</CardDescription>
          </CardHeader>
          <CardContent>
            {canUpload ? (
              <div
                className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
                  dragOver
                    ? "border-blue-400 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-900/20"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  multiple
                  className="hidden"
                  onChange={e => e.target.files && handleUpload(e.target.files)}
                />
                <div className="text-4xl mb-3">{uploading ? "⏳" : "📄"}</div>
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  {uploading ? "Uploading..." : "Drop receipt files here"}
                </p>
                <p className="text-xs text-neutral-400 mb-4">PDF, PNG, or JPG — max 5MB per file</p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border-2 border-dashed border-neutral-200 p-8 text-center dark:border-neutral-800">
                <div className="text-3xl mb-3">🔒</div>
                <p className="text-sm text-neutral-500">Manual upload is not available on your current plan.</p>
              </div>
            )}
            <p className="mt-4 text-xs text-neutral-400">
              Uploaded receipts are added with &quot;Needs Review&quot; status. Edit trip details in the Receipts page after uploading.
            </p>
          </CardContent>
        </Card>

        {/* Forward-to-Inbox Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Forward Receipts by Email</CardTitle>
            <CardDescription>An alternative way to import receipts.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
              <p>You can forward ride receipt emails directly to your connected inbox and then sync to import them.</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Open a ride receipt email from Uber or Bolt in your email client</li>
                <li>Forward it to your connected Gmail or Outlook account</li>
                <li>Come back here and click <strong>&quot;Sync Now&quot;</strong> on the connected account</li>
                <li>The receipt will be automatically detected and parsed</li>
              </ol>
              <p className="text-xs text-neutral-400">
                Tip: Set up an email filter to auto-forward receipts from noreply@uber.com and receipts@bolt.eu to your connected account.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
