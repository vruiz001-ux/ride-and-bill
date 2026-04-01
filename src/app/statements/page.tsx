"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select";
import { formatCurrency, formatDate, providerLabel } from "@/lib/utils";
import type { Receipt } from "@/lib/types";

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);
const OUTPUT_CURRENCIES = ["EUR", "PLN", "GBP", "USD", "CHF", "SEK", "NOK", "DKK", "CZK", "HUF"];

interface GeneratedStatement {
  id: string;
  totalReceipts: number;
  totalAmount: number;
}

export default function StatementsPage() {
  /* ── Filter state ──────────────────────────────────────────── */
  const [filterMode, setFilterMode] = useState<"month" | "range">("month");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [outputCurrency, setOutputCurrency] = useState("EUR");
  const [applyMarkup, setApplyMarkup] = useState(false);
  const [markupPercent, setMarkupPercent] = useState(5);
  const [title, setTitle] = useState("");

  /* ── Data state ────────────────────────────────────────────── */
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedStatement, setGeneratedStatement] = useState<GeneratedStatement | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/receipts")
      .then(r => r.json())
      .then(data => {
        setReceipts(data.receipts || []);
        setLoading(false);
      });
  }, []);

  /* ── Derived data ──────────────────────────────────────────── */
  const countries = useMemo(() => [...new Set(receipts.map(r => r.country))].sort(), [receipts]);
  const currencies = useMemo(() => [...new Set(receipts.map(r => r.currency))].sort(), [receipts]);
  const availableYears = useMemo(() => {
    const years = new Set(receipts.map(r => r.tripDate.substring(0, 4)));
    return [...years].sort().reverse();
  }, [receipts]);

  const filtered = useMemo(() => {
    return receipts.filter(r => {
      if (r.status === "failed") return false;
      if (providerFilter !== "all" && r.provider !== providerFilter) return false;
      if (selectedCountries.length > 0 && !selectedCountries.includes(r.country)) return false;
      if (selectedCurrencies.length > 0 && !selectedCurrencies.includes(r.currency)) return false;

      if (filterMode === "range") {
        if (dateFrom && r.tripDate < dateFrom) return false;
        if (dateTo && r.tripDate > dateTo + "T23:59:59") return false;
      } else {
        if (filterYear !== "all" && !r.tripDate.startsWith(filterYear)) return false;
        if (filterMonth !== "all" && filterYear !== "all") {
          const ym = `${filterYear}-${filterMonth.padStart(2, "0")}`;
          if (!r.tripDate.startsWith(ym)) return false;
        } else if (filterMonth !== "all") {
          const m = parseInt(filterMonth);
          const rMonth = new Date(r.tripDate).getMonth() + 1;
          if (rMonth !== m) return false;
        }
      }

      return true;
    });
  }, [receipts, providerFilter, selectedCountries, selectedCurrencies, filterMonth, filterYear, filterMode, dateFrom, dateTo]);

  /* ── Preview breakdown ─────────────────────────────────────── */
  const preview = useMemo(() => {
    if (filtered.length === 0) return null;

    const byProvider: Record<string, { count: number; total: number }> = {};
    const byCountry: Record<string, { count: number; total: number }> = {};
    const byCurrency: Record<string, { count: number; total: number }> = {};

    for (const r of filtered) {
      if (!byProvider[r.provider]) byProvider[r.provider] = { count: 0, total: 0 };
      byProvider[r.provider].count++;
      byProvider[r.provider].total += r.amountTotal;

      if (!byCountry[r.country]) byCountry[r.country] = { count: 0, total: 0 };
      byCountry[r.country].count++;
      byCountry[r.country].total += r.amountTotal;

      if (!byCurrency[r.currency]) byCurrency[r.currency] = { count: 0, total: 0 };
      byCurrency[r.currency].count++;
      byCurrency[r.currency].total += r.amountTotal;
    }

    return {
      count: filtered.length,
      byProvider: Object.entries(byProvider)
        .map(([p, d]) => ({ provider: p, count: d.count, total: Math.round(d.total * 100) / 100 }))
        .sort((a, b) => b.total - a.total),
      byCountry: Object.entries(byCountry)
        .map(([c, d]) => ({ country: c, count: d.count, total: Math.round(d.total * 100) / 100 }))
        .sort((a, b) => b.total - a.total),
      byCurrency: Object.entries(byCurrency)
        .map(([c, d]) => ({ currency: c, count: d.count, total: Math.round(d.total * 100) / 100 }))
        .sort((a, b) => b.total - a.total),
    };
  }, [filtered]);

  /* ── Generate statement ────────────────────────────────────── */
  const handleGenerate = async () => {
    setGenerating(true);
    setMessage(null);
    setGeneratedStatement(null);

    try {
      const body: Record<string, unknown> = {
        filterMode,
        providerFilter: providerFilter !== "all" ? providerFilter : undefined,
        countries: selectedCountries.length > 0 ? selectedCountries : undefined,
        currencies: selectedCurrencies.length > 0 ? selectedCurrencies : undefined,
        outputCurrency,
        applyMarkup,
        markupPercent: applyMarkup ? markupPercent : 0,
        title: title || undefined,
      };

      if (filterMode === "month") {
        body.month = filterMonth !== "all" ? filterMonth : undefined;
        body.year = filterYear !== "all" ? filterYear : undefined;
      } else {
        body.dateFrom = dateFrom || undefined;
        body.dateTo = dateTo || undefined;
      }

      const res = await fetch("/api/statements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "Failed to generate statement." });
        return;
      }

      const data = await res.json();
      setGeneratedStatement({ id: data.id, totalReceipts: data.totalReceipts, totalAmount: data.totalAmount });
      setMessage({ type: "success", text: `Statement generated with ${data.totalReceipts} receipts.` });
    } catch {
      setMessage({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setGenerating(false);
    }
  };

  /* ── Download helper ───────────────────────────────────────── */
  const handleDownload = async (format: string) => {
    if (!generatedStatement) return;
    try {
      const res = await fetch(`/api/statements/${generatedStatement.id}/download?format=${format}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `statement-${generatedStatement.id}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-neutral-400">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Statements</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Generate consolidated statements from your ride receipts.
        </p>
      </div>

      {/* Message banner */}
      {message && (
        <div
          className={`rounded-xl p-3 text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Download buttons after successful generation */}
      {generatedStatement && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Download:</span>
            {["pdf", "csv", "xlsx", "zip"].map(fmt => (
              <Button key={fmt} variant="outline" size="sm" onClick={() => handleDownload(fmt)}>
                {fmt.toUpperCase()}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT — Filter controls */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Filter &amp; Configure</CardTitle>
            <CardDescription>Select which receipts to include in the statement.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Date mode toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterMode("month")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterMode === "month"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setFilterMode("range")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filterMode === "range"
                    ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                }`}
              >
                Date Range
              </button>
            </div>

            {/* Date fields */}
            {filterMode === "month" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Month</label>
                  <select
                    value={filterMonth}
                    onChange={e => setFilterMonth(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    <option value="all">All Months</option>
                    {Array.from({ length: 12 }, (_, i) => (
                      <option key={i + 1} value={String(i + 1)}>{MONTH_NAMES[i + 1]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Year</label>
                  <select
                    value={filterYear}
                    onChange={e => setFilterYear(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  >
                    <option value="all">All Years</option>
                    {(availableYears.length > 0 ? availableYears : YEARS).map(y => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  />
                </div>
              </div>
            )}

            {/* Provider */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Provider</label>
              <select
                value={providerFilter}
                onChange={e => setProviderFilter(e.target.value)}
                className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                <option value="all">All Providers</option>
                <option value="uber">Uber</option>
                <option value="bolt">Bolt</option>
                <option value="waymo">Waymo</option>
                <option value="careem">Careem</option>
                <option value="freenow">FREE NOW</option>
              </select>
            </div>

            {/* Multi-selects */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Countries</label>
                <MultiSelect label="Countries" options={countries} selected={selectedCountries} onChange={setSelectedCountries} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Currencies</label>
                <MultiSelect label="Currencies" options={currencies} selected={selectedCurrencies} onChange={setSelectedCurrencies} />
              </div>
            </div>

            {/* Output currency */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Output Currency</label>
              <select
                value={outputCurrency}
                onChange={e => setOutputCurrency(e.target.value)}
                className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              >
                {OUTPUT_CURRENCIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Markup */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={applyMarkup}
                  onChange={e => setApplyMarkup(e.target.checked)}
                  className="h-4 w-4 rounded border-neutral-300 dark:border-neutral-600"
                />
                Apply markup
              </label>
              {applyMarkup && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={markupPercent}
                    onChange={e => setMarkupPercent(Number(e.target.value))}
                    className="h-9 w-20 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-800"
                  />
                  <span className="text-sm text-neutral-500">%</span>
                </div>
              )}
            </div>

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Title (optional)</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. March 2026 Business Rides"
                className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800"
              />
            </div>

            {/* Generate button */}
            <Button className="w-full" size="lg" onClick={handleGenerate} disabled={generating || filtered.length === 0}>
              {generating ? "Generating..." : "Generate Statement"}
            </Button>

            {/* Link to history */}
            <div className="text-center">
              <Link href="/statements/history" className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors">
                View statement history &rarr;
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* RIGHT — Live preview */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Live Preview</CardTitle>
            <CardDescription>Receipts matching your filters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {preview ? (
              <>
                {/* Total rides */}
                <div>
                  <div className="text-xs text-neutral-400">Total Rides</div>
                  <div className="text-2xl font-bold text-neutral-900 dark:text-white">{preview.count}</div>
                </div>

                {/* Total spend by currency */}
                <div>
                  <div className="text-xs text-neutral-400">Total Spend</div>
                  <div className="space-y-1 mt-1">
                    {preview.byCurrency.map(c => (
                      <div key={c.currency} className="text-lg font-semibold text-neutral-900 dark:text-white">
                        {formatCurrency(c.total, c.currency)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Provider */}
                <div className="border-t border-neutral-100 pt-4 dark:border-neutral-800">
                  <div className="text-xs font-medium text-neutral-400 mb-2">By Provider</div>
                  <div className="space-y-1.5">
                    {preview.byProvider.map(p => (
                      <div key={p.provider} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant={p.provider as "uber" | "bolt"}>{providerLabel(p.provider)}</Badge>
                          <span className="text-neutral-400">{p.count} rides</span>
                        </div>
                        <span className="font-medium text-neutral-900 dark:text-white">{p.total.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Country */}
                <div className="border-t border-neutral-100 pt-4 dark:border-neutral-800">
                  <div className="text-xs font-medium text-neutral-400 mb-2">By Country</div>
                  <div className="space-y-1.5">
                    {preview.byCountry.map(c => (
                      <div key={c.country} className="flex items-center justify-between text-sm">
                        <span className="text-neutral-500">{c.country}</span>
                        <span className="font-medium text-neutral-900 dark:text-white">
                          {c.count} <span className="text-neutral-400">rides</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* By Currency */}
                {preview.byCurrency.length > 1 && (
                  <div className="border-t border-neutral-100 pt-4 dark:border-neutral-800">
                    <div className="text-xs font-medium text-neutral-400 mb-2">By Currency</div>
                    <div className="space-y-1.5">
                      {preview.byCurrency.map(c => (
                        <div key={c.currency} className="flex items-center justify-between text-sm">
                          <span className="text-neutral-500">{c.currency}</span>
                          <span className="font-medium text-neutral-900 dark:text-white">
                            {formatCurrency(c.total, c.currency)} <span className="text-neutral-400">({c.count})</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-12 text-center text-neutral-400 text-sm">
                No receipts match your filters.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
