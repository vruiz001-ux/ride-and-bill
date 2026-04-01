"use client";
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MultiSelect } from "@/components/ui/multi-select";
import { formatCurrency, formatDate, providerLabel, confidenceColor } from "@/lib/utils";
import type { Receipt, BillingEntity } from "@/lib/types";

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

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
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>([]);
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [filterMode, setFilterMode] = useState<"month" | "range">("month");
  const [selected, setSelected] = useState<Receipt | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, string | number | null>>({});
  const [saving, setSaving] = useState(false);

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
  const availableYears = useMemo(() => {
    const years = new Set(receipts.map(r => r.tripDate.substring(0, 4)));
    return [...years].sort().reverse();
  }, [receipts]);
  const availableMonths = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => i + 1);
  }, []);

  const filtered = useMemo(() => {
    return receipts.filter(r => {
      if (providerFilter !== "all" && r.provider !== providerFilter) return false;
      if (selectedCountries.length > 0 && !selectedCountries.includes(r.country)) return false;
      if (selectedCurrencies.length > 0 && !selectedCurrencies.includes(r.currency)) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      // Date filtering
      if (filterMode === "range") {
        if (dateFrom && r.tripDate < dateFrom) return false;
        if (dateTo && r.tripDate > dateTo + "T23:59:59") return false;
      } else {
        if (filterYear !== "all" && !r.tripDate.startsWith(filterYear)) return false;
        if (filterMonth !== "all" && filterYear !== "all") {
          const ym = `${filterYear}-${filterMonth.padStart(2, '0')}`;
          if (!r.tripDate.startsWith(ym)) return false;
        } else if (filterMonth !== "all") {
          const m = parseInt(filterMonth);
          const rMonth = new Date(r.tripDate).getMonth() + 1;
          if (rMonth !== m) return false;
        }
      }

      return true;
    }).sort((a, b) => new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime());
  }, [receipts, providerFilter, selectedCountries, selectedCurrencies, filterMonth, filterYear, statusFilter, filterMode, dateFrom, dateTo]);

  // Monthly summary — computed from filtered receipts
  const summary = useMemo(() => {
    const valid = filtered.filter(r => r.status !== 'failed');
    if (valid.length === 0) return null;

    const byProvider: Record<string, { count: number; total: number; pln: number }> = {};
    const byCurrency: Record<string, { count: number; total: number }> = {};
    let totalTax = 0;
    let hasTax = false;

    for (const r of valid) {
      // By provider
      if (!byProvider[r.provider]) byProvider[r.provider] = { count: 0, total: 0, pln: 0 };
      byProvider[r.provider].count++;
      byProvider[r.provider].total += r.amountTotal;
      byProvider[r.provider].pln += r.convertedAmount || 0;

      // By currency
      if (!byCurrency[r.currency]) byCurrency[r.currency] = { count: 0, total: 0 };
      byCurrency[r.currency].count++;
      byCurrency[r.currency].total += r.amountTotal;

      // Tax
      if (r.amountTax != null && r.amountTax > 0) {
        totalTax += r.amountTax;
        hasTax = true;
      }
    }

    const totalPLN = valid.reduce((s, r) => s + (r.convertedAmount || 0), 0);
    const totalInvoice = valid.reduce((s, r) => s + (r.invoiceAmount || 0), 0);

    return {
      count: valid.length,
      totalPLN: Math.round(totalPLN * 100) / 100,
      totalInvoice: Math.round(totalInvoice * 100) / 100,
      byProvider: Object.entries(byProvider).map(([p, d]) => ({
        provider: p, count: d.count, total: Math.round(d.total * 100) / 100, pln: Math.round(d.pln * 100) / 100,
      })).sort((a, b) => b.pln - a.pln),
      byCurrency: Object.entries(byCurrency).map(([c, d]) => ({
        currency: c, count: d.count, total: Math.round(d.total * 100) / 100,
      })),
      totalTax: hasTax ? Math.round(totalTax * 100) / 100 : null,
      multiCurrency: Object.keys(byCurrency).length > 1,
    };
  }, [filtered]);

  const startEdit = () => {
    if (!selected) return;
    setEditForm({
      businessPurpose: selected.businessPurpose || "",
      notes: selected.notes || "",
      city: selected.city,
      country: selected.country,
      amountTotal: selected.amountTotal,
      pickupLocation: selected.pickupLocation || "",
      dropoffLocation: selected.dropoffLocation || "",
      billingEntityId: selected.billingEntityId || "",
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditForm({});
  };

  const saveEdit = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = { id: selected.id };
      if (editForm.businessPurpose !== (selected.businessPurpose || "")) body.businessPurpose = editForm.businessPurpose || null;
      if (editForm.notes !== (selected.notes || "")) body.notes = editForm.notes || null;
      if (editForm.city !== selected.city) body.city = editForm.city;
      if (editForm.country !== selected.country) body.country = editForm.country;
      if (Number(editForm.amountTotal) !== selected.amountTotal) body.amountTotal = Number(editForm.amountTotal);
      if (editForm.pickupLocation !== (selected.pickupLocation || "")) body.pickupLocation = editForm.pickupLocation || null;
      if (editForm.dropoffLocation !== (selected.dropoffLocation || "")) body.dropoffLocation = editForm.dropoffLocation || null;
      if (editForm.billingEntityId !== (selected.billingEntityId || "")) body.billingEntityId = editForm.billingEntityId || null;

      const res = await fetch("/api/receipts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const updated = await res.json();
        setReceipts(prev => prev.map(r => r.id === updated.id ? { ...r, ...updated } : r));
        setSelected(prev => prev ? { ...prev, ...updated } : prev);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

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

      <div className="space-y-3">
        {/* Date filter mode toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterMode("month")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterMode === "month" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"}`}
          >
            Month
          </button>
          <button
            onClick={() => setFilterMode("range")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${filterMode === "range" ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"}`}
          >
            Date Range
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          {filterMode === "month" ? (
            <>
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                <option value="all">All Months</option>
                {availableMonths.map(m => <option key={m} value={String(m)}>{MONTH_NAMES[m]}</option>)}
              </select>
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                <option value="all">All Years</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <label className="text-xs text-neutral-500">From</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-neutral-500">To</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
              </div>
            </>
          )}
          <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)} className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="all">All Providers</option>
            <option value="uber">Uber</option>
            <option value="bolt">Bolt</option>
            <option value="waymo">Waymo</option>
            <option value="careem">Careem</option>
            <option value="freenow">FREE NOW</option>
          </select>
          <MultiSelect label="Countries" options={countries} selected={selectedCountries} onChange={setSelectedCountries} />
          <MultiSelect label="Currencies" options={currencies} selected={selectedCurrencies} onChange={setSelectedCurrencies} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-800">
            <option value="all">All Statuses</option>
            <option value="parsed">Parsed</option>
            <option value="review">Needs Review</option>
            <option value="failed">Failed</option>
          </select>
          {(providerFilter !== "all" || selectedCountries.length > 0 || selectedCurrencies.length > 0 || filterMonth !== "all" || filterYear !== "all" || statusFilter !== "all" || dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={() => { setProviderFilter("all"); setSelectedCountries([]); setSelectedCurrencies([]); setFilterMonth("all"); setFilterYear("all"); setStatusFilter("all"); setDateFrom(""); setDateTo(""); }}>
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {summary && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {filterMonth !== "all" && filterYear !== "all"
                ? `${MONTH_NAMES[parseInt(filterMonth)]} ${filterYear} Summary`
                : filterYear !== "all"
                ? `${filterYear} Summary`
                : filterMonth !== "all"
                ? `${MONTH_NAMES[parseInt(filterMonth)]} Summary`
                : "All Receipts Summary"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="text-xs text-neutral-400">Receipts</div>
                <div className="text-xl font-bold text-neutral-900 dark:text-white">{summary.count}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-400">Total (PLN)</div>
                <div className="text-xl font-bold text-emerald-600">{formatCurrency(summary.totalPLN, "PLN")}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-400">Invoice Total</div>
                <div className="text-xl font-bold text-neutral-900 dark:text-white">{formatCurrency(summary.totalInvoice, "PLN")}</div>
              </div>
              {summary.totalTax !== null && (
                <div>
                  <div className="text-xs text-neutral-400">Tax / VAT</div>
                  <div className="text-xl font-bold text-neutral-900 dark:text-white">{summary.totalTax.toFixed(2)}</div>
                </div>
              )}
            </div>

            <div className="border-t border-neutral-100 pt-3 dark:border-neutral-800">
              <div className="text-xs font-medium text-neutral-400 mb-2">By Provider</div>
              <div className="space-y-1.5">
                {summary.byProvider.map(p => (
                  <div key={p.provider} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant={p.provider as 'uber' | 'bolt'}>{providerLabel(p.provider)}</Badge>
                      <span className="text-neutral-400">{p.count} rides</span>
                    </div>
                    <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(p.pln, "PLN")}</span>
                  </div>
                ))}
              </div>
            </div>

            {summary.multiCurrency && (
              <div className="border-t border-neutral-100 pt-3 dark:border-neutral-800">
                <div className="text-xs font-medium text-neutral-400 mb-2">By Currency</div>
                <div className="space-y-1.5">
                  {summary.byCurrency.map(c => (
                    <div key={c.currency} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-500">{c.currency}</span>
                      <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(c.total, c.currency)} <span className="text-neutral-400">({c.count})</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                  <div className="flex items-center gap-2">
                    {!editing && (
                      <button onClick={startEdit} className="text-xs text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300">Edit</button>
                    )}
                    <button onClick={() => { setSelected(null); cancelEdit(); }} className="text-neutral-400 hover:text-neutral-600">✕</button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-3">
                    <EditField label="City" value={String(editForm.city || "")} onChange={v => setEditForm(f => ({ ...f, city: v }))} />
                    <EditField label="Country" value={String(editForm.country || "")} onChange={v => setEditForm(f => ({ ...f, country: v }))} />
                    <EditField label="Amount" value={String(editForm.amountTotal || "")} onChange={v => setEditForm(f => ({ ...f, amountTotal: v }))} type="number" />
                    <EditField label="Pickup" value={String(editForm.pickupLocation || "")} onChange={v => setEditForm(f => ({ ...f, pickupLocation: v }))} />
                    <EditField label="Dropoff" value={String(editForm.dropoffLocation || "")} onChange={v => setEditForm(f => ({ ...f, dropoffLocation: v }))} />
                    <EditField label="Purpose" value={String(editForm.businessPurpose || "")} onChange={v => setEditForm(f => ({ ...f, businessPurpose: v }))} />
                    <EditField label="Notes" value={String(editForm.notes || "")} onChange={v => setEditForm(f => ({ ...f, notes: v }))} />
                    <div>
                      <label className="mb-1 block text-xs font-medium text-neutral-400">Billing Entity</label>
                      <select value={String(editForm.billingEntityId || "")} onChange={e => setEditForm(f => ({ ...f, billingEntityId: e.target.value }))} className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                        <option value="">None</option>
                        {entities.map(e => <option key={e.id} value={e.id}>{e.legalName}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button size="sm" onClick={saveEdit} disabled={saving} className="flex-1">
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit} className="flex-1">Cancel</Button>
                    </div>
                  </div>
                ) : (
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
                    {selected.notes && <Row label="Notes">{selected.notes}</Row>}
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
                )}
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

function EditField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-neutral-400">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
    </div>
  );
}
