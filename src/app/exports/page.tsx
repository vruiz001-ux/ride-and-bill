"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SUPPORTED_CURRENCIES } from "@/lib/services/fx";
import type { Receipt, BillingEntity } from "@/lib/types";

export default function ExportsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [entities, setEntities] = useState<BillingEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState<"pdf" | "excel">("pdf");
  const [outputCurrency, setOutputCurrency] = useState("EUR");
  const [applyMarkup, setApplyMarkup] = useState(true);
  const [billingEntity, setBillingEntity] = useState("all");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/receipts").then(r => r.json()),
      fetch("/api/billing").then(r => r.json()),
    ]).then(([rData, bData]) => {
      setReceipts(rData.receipts || []);
      setEntities(bData.entities || []);
      setLoading(false);
    });
  }, []);

  const eligibleReceipts = receipts.filter(r => r.status === "parsed");

  const handleExport = async () => {
    setExporting(true);
    try {
      await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          filters: { billingEntityId: billingEntity !== "all" ? billingEntity : undefined },
          outputCurrency,
          applyMarkup,
          markupPercent: 5,
        }),
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-neutral-400">Loading exports...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Exports</h1>
        <p className="mt-1 text-sm text-neutral-500">Generate PDF bundles or Excel reports with multi-currency conversion.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New Export</CardTitle>
            <CardDescription>Configure your export settings and generate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Format</label>
              <div className="flex gap-3">
                <button onClick={() => setFormat("pdf")} className={`flex-1 rounded-xl border-2 p-4 text-center transition-all ${format === "pdf" ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800" : "border-neutral-200 dark:border-neutral-700"}`}>
                  <div className="text-2xl">📄</div>
                  <div className="mt-1 text-sm font-medium">PDF Bundle</div>
                  <div className="text-xs text-neutral-400">Summary + original receipts</div>
                </button>
                <button onClick={() => setFormat("excel")} className={`flex-1 rounded-xl border-2 p-4 text-center transition-all ${format === "excel" ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800" : "border-neutral-200 dark:border-neutral-700"}`}>
                  <div className="text-2xl">📊</div>
                  <div className="mt-1 text-sm font-medium">Excel Report</div>
                  <div className="text-xs text-neutral-400">Full data with FX breakdown</div>
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Output Currency</label>
                <select value={outputCurrency} onChange={e => setOutputCurrency(e.target.value)} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                  {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Billing Entity</label>
                <select value={billingEntity} onChange={e => setBillingEntity(e.target.value)} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                  <option value="all">All receipts</option>
                  {entities.map(e => <option key={e.id} value={e.id}>{e.legalName}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setApplyMarkup(!applyMarkup)}
                className={`relative h-6 w-11 rounded-full transition-colors ${applyMarkup ? "bg-neutral-900 dark:bg-white" : "bg-neutral-300 dark:bg-neutral-700"}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform dark:bg-neutral-900 ${applyMarkup ? "translate-x-5" : ""}`} />
              </button>
              <span className="text-sm text-neutral-700 dark:text-neutral-300">Apply 5% markup for re-invoicing</span>
            </div>

            <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-800/50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">Eligible receipts</span>
                <span className="font-medium text-neutral-900 dark:text-white">{eligibleReceipts.length}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-neutral-500">Total (converted to {outputCurrency})</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {formatCurrency(eligibleReceipts.reduce((s, r) => s + (r.convertedAmount || r.amountTotal), 0), outputCurrency)}
                </span>
              </div>
              {applyMarkup && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-neutral-500">With 5% markup</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(eligibleReceipts.reduce((s, r) => s + (r.invoiceAmount || r.amountTotal * 1.05), 0), outputCurrency)}
                  </span>
                </div>
              )}
            </div>

            <Button className="w-full" size="lg" onClick={handleExport} disabled={exporting || eligibleReceipts.length === 0}>
              {exporting ? "Generating..." : `Generate ${format === "pdf" ? "PDF Bundle" : "Excel Report"}`}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Export History</h2>
          <div className="py-8 text-center text-neutral-400 text-sm">No exports yet.</div>
        </div>
      </div>
    </div>
  );
}
