"use client";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SUPPORTED_CURRENCIES, convertAmount } from "@/lib/services/fx";
import type { Receipt, BillingEntity } from "@/lib/types";

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

interface PlanFeatures {
  fullPdfExport: boolean;
  summaryPdfExport: boolean;
  csvExport: boolean;
  companyDetailsInReports: boolean;
  brandedReports: boolean;
  [key: string]: boolean;
}

export default function ExportsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [entities, setEntities] = useState<BillingEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [format, setFormat] = useState<"pdf" | "csv">("pdf");
  const [outputCurrency, setOutputCurrency] = useState("PLN");
  const [applyMarkup, setApplyMarkup] = useState(true);
  const [billingEntity, setBillingEntity] = useState("all");
  const [exporting, setExporting] = useState(false);
  const [exportMonth, setExportMonth] = useState<string>("all");
  const [exportYear, setExportYear] = useState<string>("all");
  const [exportHistory, setExportHistory] = useState<{ id: string; format: string; status: string; createdAt: string }[]>([]);
  const [features, setFeatures] = useState<PlanFeatures | null>(null);
  const [planName, setPlanName] = useState<string>("");
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/receipts").then(r => r.json()),
      fetch("/api/billing").then(r => r.json()),
      fetch("/api/exports").then(r => r.json()),
      fetch("/api/dashboard").then(r => r.json()),
    ]).then(([rData, bData, eData, dData]) => {
      setReceipts(rData.receipts || []);
      setEntities(bData.entities || []);
      setExportHistory(eData.jobs || []);
      if (dData.plan) {
        setFeatures(dData.plan.features);
        setPlanName(dData.plan.name);
      }
      setLoading(false);
    });
  }, []);

  const eligibleReceipts = useMemo(() => {
    let filtered = receipts.filter(r => r.status === "parsed");
    if (exportYear !== "all") {
      filtered = filtered.filter(r => r.tripDate.startsWith(exportYear));
    }
    if (exportMonth !== "all" && exportYear !== "all") {
      const ym = `${exportYear}-${exportMonth.padStart(2, "0")}`;
      filtered = filtered.filter(r => r.tripDate.startsWith(ym));
    }
    if (billingEntity !== "all") {
      filtered = filtered.filter(r => r.billingEntityId === billingEntity);
    }
    return filtered;
  }, [receipts, exportMonth, exportYear, billingEntity]);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          filters: {
            billingEntityId: billingEntity !== "all" ? billingEntity : undefined,
            month: exportMonth !== "all" ? exportMonth : undefined,
            year: exportYear !== "all" ? exportYear : undefined,
          },
          outputCurrency,
          applyMarkup,
          markupPercent: 5,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setExportError(data.error || "Export failed");
        return;
      }

      if (format === "pdf") {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ridereceipt-${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (format === "csv") {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ridereceipt-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      const historyRes = await fetch("/api/exports");
      const historyData = await historyRes.json();
      setExportHistory(historyData.jobs || []);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-neutral-400">Loading exports...</div>;
  }

  const canFullPdf = features?.fullPdfExport ?? false;
  const canCsv = features?.csvExport ?? false;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Exports</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Generate PDF bundles or CSV reports with multi-currency conversion.
        </p>
      </div>

      {exportError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
          {exportError}
        </div>
      )}

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
                  <div className="text-2xl">&#x1F4C4;</div>
                  <div className="mt-1 text-sm font-medium">
                    {canFullPdf ? "PDF Bundle" : "Summary PDF"}
                  </div>
                  <div className="text-xs text-neutral-400">
                    {canFullPdf ? "Summary + receipt details" : "Summary only (upgrade for full)"}
                  </div>
                </button>
                <button
                  onClick={() => canCsv && setFormat("csv")}
                  className={`flex-1 rounded-xl border-2 p-4 text-center transition-all ${!canCsv ? "opacity-50 cursor-not-allowed" : ""} ${format === "csv" ? "border-neutral-900 bg-neutral-50 dark:border-white dark:bg-neutral-800" : "border-neutral-200 dark:border-neutral-700"}`}
                >
                  <div className="text-2xl">&#x1F4CA;</div>
                  <div className="mt-1 text-sm font-medium">CSV Report</div>
                  <div className="text-xs text-neutral-400">
                    {canCsv ? "Full data with FX breakdown" : "Requires Solo plan or higher"}
                  </div>
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Month</label>
                <select value={exportMonth} onChange={e => setExportMonth(e.target.value)} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                  <option value="all">All Months</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={String(i + 1)}>{MONTH_NAMES[i + 1]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Year</label>
                <select value={exportYear} onChange={e => setExportYear(e.target.value)} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                  <option value="all">All Years</option>
                  {YEARS.map(y => <option key={y} value={String(y)}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Output Currency</label>
                <select value={outputCurrency} onChange={e => setOutputCurrency(e.target.value)} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                  {SUPPORTED_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} &mdash; {c.name}</option>)}
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
                  {formatCurrency(eligibleReceipts.reduce((s, r) => {
                    const date = r.tripDate.split('T')[0];
                    const fx = convertAmount(r.amountTotal, r.originalCurrency || r.currency, outputCurrency, date, 0);
                    return s + (fx?.convertedAmount || r.amountTotal);
                  }, 0), outputCurrency)}
                </span>
              </div>
              {applyMarkup && (
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-neutral-500">With 5% markup</span>
                  <span className="font-semibold text-emerald-600">
                    {formatCurrency(eligibleReceipts.reduce((s, r) => {
                      const date = r.tripDate.split('T')[0];
                      const fx = convertAmount(r.amountTotal, r.originalCurrency || r.currency, outputCurrency, date, 5);
                      return s + (fx?.finalAmount || r.amountTotal * 1.05);
                    }, 0), outputCurrency)}
                  </span>
                </div>
              )}
            </div>

            {!canFullPdf && format === "pdf" && (
              <UpgradePrompt
                message="Free plan exports include summary only."
                feature="Full PDF with receipt details"
                currentPlan={planName}
              />
            )}

            <Button className="w-full" size="lg" onClick={handleExport} disabled={exporting || eligibleReceipts.length === 0}>
              {exporting ? "Generating..." : `Generate ${format === "pdf" ? (canFullPdf ? "PDF Bundle" : "Summary PDF") : "CSV Report"}`}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Export History</h2>
          {exportHistory.length > 0 ? (
            <div className="space-y-2">
              {exportHistory.map(job => (
                <div key={job.id} className="flex items-center justify-between rounded-xl border border-neutral-100 p-3 dark:border-neutral-800">
                  <div>
                    <div className="text-sm font-medium text-neutral-900 dark:text-white">{job.format.toUpperCase()}</div>
                    <div className="text-xs text-neutral-400">{formatDate(job.createdAt)}</div>
                  </div>
                  <Badge variant={job.status === "completed" ? "success" : job.status === "failed" ? "destructive" : "warning"}>
                    {job.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-neutral-400 text-sm">No exports yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
