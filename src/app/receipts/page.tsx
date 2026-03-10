"use client";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatCurrency, formatDate, providerLabel, confidenceColor } from "@/lib/utils";
import type { Receipt, BillingEntity } from "@/lib/types";

function statusBadge(status: string) {
  switch (status) {
    case "parsed": return <Badge variant="success">Parsed</Badge>;
    case "review": return <Badge variant="warning">Review</Badge>;
    case "failed": return <Badge variant="destructive">Failed</Badge>;
    case "duplicate": return <Badge variant="secondary">Duplicate</Badge>;
    default: return <Badge>{status}</Badge>;
  }
}

export default function ReceiptsPage() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [entities, setEntities] = useState<BillingEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [countryFilter, setCountryFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Receipt | null>(null);

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

  const countries = useMemo(() => [...new Set(receipts.map(r => r.country))].sort(), [receipts]);
  const currencies = useMemo(() => [...new Set(receipts.map(r => r.currency))].sort(), [receipts]);

  const filtered = useMemo(() => {
    return receipts.filter(r => {
      if (providerFilter !== "all" && r.provider !== providerFilter) return false;
      if (countryFilter !== "all" && r.country !== countryFilter) return false;
      if (currencyFilter !== "all" && r.currency !== currencyFilter) return false;
      return true;
    }).sort((a, b) => new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime());
  }, [receipts, providerFilter, countryFilter, currencyFilter]);

  const billingEntityName = (id: string | null) => {
    if (!id) return null;
    return entities.find(e => e.id === id)?.legalName || null;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-neutral-400">Loading receipts...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Receipts</h1>
          <p className="mt-1 text-sm text-neutral-500">{receipts.length} receipts across {countries.length} countries</p>
        </div>
        <Button size="sm"><span className="mr-2">📥</span> Export Selected</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)} className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-800">
          <option value="all">All Providers</option>
          <option value="uber">Uber</option>
          <option value="bolt">Bolt</option>
        </select>
        <select value={countryFilter} onChange={e => setCountryFilter(e.target.value)} className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-800">
          <option value="all">All Countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={currencyFilter} onChange={e => setCurrencyFilter(e.target.value)} className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-800">
          <option value="all">All Currencies</option>
          {currencies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(providerFilter !== "all" || countryFilter !== "all" || currencyFilter !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setProviderFilter("all"); setCountryFilter("all"); setCurrencyFilter("all"); }}>
            Clear filters
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-2 lg:col-span-3">
          {filtered.map(r => (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className={`w-full rounded-2xl border p-4 text-left transition-all hover:shadow-sm ${
                selected?.id === r.id
                  ? "border-neutral-400 bg-neutral-50 dark:border-neutral-600 dark:bg-neutral-800/50"
                  : "border-neutral-200/60 bg-white dark:border-neutral-800 dark:bg-neutral-900"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={r.provider as 'uber' | 'bolt'}>{providerLabel(r.provider)}</Badge>
                  <div>
                    <div className="text-sm font-medium text-neutral-900 dark:text-white">{r.city}, {r.country}</div>
                    <div className="text-xs text-neutral-400">{formatDate(r.tripDate)}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-neutral-900 dark:text-white">{formatCurrency(r.amountTotal, r.currency)}</div>
                  {r.convertedCurrency && r.convertedCurrency !== r.currency && (
                    <div className="text-xs text-neutral-400">≈ {formatCurrency(r.convertedAmount!, r.convertedCurrency)}</div>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                {statusBadge(r.status)}
                {r.billingEntityId && <Badge variant="secondary">{billingEntityName(r.billingEntityId)?.substring(0, 20)}</Badge>}
                {r.businessPurpose && <span className="text-xs text-neutral-400">{r.businessPurpose}</span>}
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="py-12 text-center text-neutral-400">
              {receipts.length === 0 ? "No receipts yet. Sync your Gmail to import." : "No receipts match your filters."}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          {selected ? (
            <Card className="sticky top-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Receipt Detail</CardTitle>
                  <button onClick={() => setSelected(null)} className="text-neutral-400 hover:text-neutral-600">✕</button>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="details">
                  <TabsList className="mb-4 w-full">
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="fx">FX & Billing</TabsTrigger>
                    <TabsTrigger value="raw">Raw Data</TabsTrigger>
                  </TabsList>

                  <TabsContent value="details" className="space-y-4">
                    <Row label="Provider"><Badge variant={selected.provider as 'uber' | 'bolt'}>{providerLabel(selected.provider)}</Badge></Row>
                    <Row label="Status">{statusBadge(selected.status)}</Row>
                    <Row label="Date">{formatDate(selected.tripDate)}</Row>
                    <Row label="City">{selected.city}, {selected.country}</Row>
                    <Row label="Amount">{formatCurrency(selected.amountTotal, selected.currency)}</Row>
                    {selected.amountTax != null && <Row label="Tax">{formatCurrency(selected.amountTax, selected.currency)}</Row>}
                    {selected.pickupLocation && <Row label="From">{selected.pickupLocation}</Row>}
                    {selected.dropoffLocation && <Row label="To">{selected.dropoffLocation}</Row>}
                    {selected.paymentMethodMasked && <Row label="Card">{selected.paymentMethodMasked}</Row>}
                    {selected.businessPurpose && <Row label="Purpose">{selected.businessPurpose}</Row>}
                    <Row label="Confidence">
                      <span className={confidenceColor(selected.parsingConfidence)}>
                        {Math.round(selected.parsingConfidence * 100)}%
                      </span>
                    </Row>
                    {selected.tags.length > 0 && (
                      <Row label="Tags">
                        <div className="flex flex-wrap gap-1">{selected.tags.map(t => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
                      </Row>
                    )}
                  </TabsContent>

                  <TabsContent value="fx" className="space-y-4">
                    <Row label="Original">{formatCurrency(selected.originalAmount, selected.originalCurrency)}</Row>
                    {selected.fxRate && <Row label="FX Rate">{selected.fxRate} ({selected.fxSource})</Row>}
                    {selected.fxRateDate && <Row label="Rate Date">{selected.fxRateDate}</Row>}
                    {selected.convertedAmount != null && (
                      <Row label="Converted">{formatCurrency(selected.convertedAmount, selected.convertedCurrency!)}</Row>
                    )}
                    <Row label="Markup">{selected.markupPercent}%</Row>
                    {selected.invoiceAmount != null && (
                      <Row label="Invoice Amount">
                        <span className="font-semibold text-emerald-600">{formatCurrency(selected.invoiceAmount, selected.invoiceCurrency!)}</span>
                      </Row>
                    )}
                    {selected.billingEntityId && (
                      <Row label="Billing Entity">{billingEntityName(selected.billingEntityId)}</Row>
                    )}
                    <Row label="Conversion">{statusBadge(selected.conversionStatus)}</Row>
                    {selected.fallbackRateUsed && <Row label="Fallback"><Badge variant="warning">Fallback rate used</Badge></Row>}
                  </TabsContent>

                  <TabsContent value="raw" className="space-y-3">
                    <Row label="Receipt ID">{selected.receiptExternalId || "—"}</Row>
                    <Row label="Email Subject">{selected.rawEmailSubject}</Row>
                    <Row label="Email From">{selected.rawEmailSender}</Row>
                    <Row label="Parser">{selected.parserVersion}</Row>
                    <Row label="Imported">{formatDate(selected.importDate)}</Row>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-16 text-center text-neutral-400">
                <div className="text-4xl">🧾</div>
                <div className="mt-3 text-sm">Select a receipt to view details</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs font-medium text-neutral-400">{label}</span>
      <div className="text-right text-sm text-neutral-900 dark:text-white">{children}</div>
    </div>
  );
}
