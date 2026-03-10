"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { BillingEntity, InvoiceBatch, Receipt } from "@/lib/types";

export default function BillingPage() {
  const [entities, setEntities] = useState<BillingEntity[]>([]);
  const [batches, setBatches] = useState<InvoiceBatch[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState<BillingEntity | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ legalName: "", billingAddress: "", vatOrTaxId: "", contactEmail: "", preferredInvoiceCurrency: "EUR" });

  useEffect(() => {
    Promise.all([
      fetch("/api/billing").then(r => r.json()),
      fetch("/api/receipts").then(r => r.json()),
    ]).then(([bData, rData]) => {
      setEntities(bData.entities || []);
      setBatches(bData.invoiceBatches || []);
      setReceipts(rData.receipts || []);
      setLoading(false);
    });
  }, []);

  const getEntityReceipts = (entityId: string) => receipts.filter(r => r.billingEntityId === entityId);
  const getEntityBatches = (entityId: string) => batches.filter(b => b.billingEntityId === entityId);

  const handleCreateEntity = async () => {
    if (!formData.legalName || !formData.billingAddress) return;
    const res = await fetch("/api/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    if (res.ok) {
      const entity = await res.json();
      setEntities(prev => [entity, ...prev]);
      setShowForm(false);
      setFormData({ legalName: "", billingAddress: "", vatOrTaxId: "", contactEmail: "", preferredInvoiceCurrency: "EUR" });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-neutral-400">Loading billing...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Billing Entities</h1>
          <p className="mt-1 text-sm text-neutral-500">Manage clients and generate re-invoices with markup.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <span className="mr-2">+</span> Add Entity
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Billing Entity</CardTitle>
            <CardDescription>Add a client or company for re-invoicing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Legal Name</label>
                <input type="text" placeholder="Acme Corp Ltd" value={formData.legalName} onChange={e => setFormData(p => ({ ...p, legalName: e.target.value }))} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">VAT / Tax ID</label>
                <input type="text" placeholder="FR12345678901" value={formData.vatOrTaxId} onChange={e => setFormData(p => ({ ...p, vatOrTaxId: e.target.value }))} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Billing Address</label>
                <input type="text" placeholder="123 Business St, City, Country" value={formData.billingAddress} onChange={e => setFormData(p => ({ ...p, billingAddress: e.target.value }))} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Contact Email</label>
                <input type="email" placeholder="finance@acme.com" value={formData.contactEmail} onChange={e => setFormData(p => ({ ...p, contactEmail: e.target.value }))} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">Invoice Currency</label>
                <select value={formData.preferredInvoiceCurrency} onChange={e => setFormData(p => ({ ...p, preferredInvoiceCurrency: e.target.value }))} className="h-11 w-full rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-800">
                  <option>EUR</option><option>USD</option><option>GBP</option><option>PLN</option><option>CHF</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleCreateEntity}>Save Entity</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {entities.map(entity => {
          const entityReceipts = getEntityReceipts(entity.id);
          const entityBatches = getEntityBatches(entity.id);
          const totalInvoiced = entityBatches.reduce((s, b) => s + b.totalInvoice, 0);
          const isSelected = selectedEntity?.id === entity.id;

          return (
            <Card key={entity.id} className={isSelected ? "ring-2 ring-neutral-900 dark:ring-white" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{entity.legalName}</CardTitle>
                    <CardDescription className="mt-1">{entity.billingAddress}</CardDescription>
                  </div>
                  <Badge variant="secondary">{entity.preferredInvoiceCurrency}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-neutral-900 dark:text-white">{entityReceipts.length}</div>
                    <div className="text-xs text-neutral-400">Receipts</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-neutral-900 dark:text-white">{entityBatches.length}</div>
                    <div className="text-xs text-neutral-400">Invoices</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-emerald-600">{formatCurrency(totalInvoiced, entity.preferredInvoiceCurrency)}</div>
                    <div className="text-xs text-neutral-400">Invoiced</div>
                  </div>
                </div>

                {entity.vatOrTaxId && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400">VAT ID</span>
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">{entity.vatOrTaxId}</span>
                  </div>
                )}
                {entity.contactEmail && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400">Contact</span>
                    <span className="text-neutral-700 dark:text-neutral-300">{entity.contactEmail}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400">Markup</span>
                  <span className="text-neutral-700 dark:text-neutral-300">{entity.defaultMarkupPercent}%</span>
                </div>

                {entityBatches.length > 0 && (
                  <div className="space-y-2 border-t pt-4 dark:border-neutral-800">
                    <div className="text-xs font-medium text-neutral-400 uppercase">Invoice Batches</div>
                    {entityBatches.map(batch => (
                      <div key={batch.id} className="flex items-center justify-between rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
                        <div>
                          <div className="text-sm font-medium text-neutral-900 dark:text-white">{formatCurrency(batch.totalInvoice, batch.invoiceCurrency)}</div>
                          <div className="text-xs text-neutral-400">{batch.receiptCount} receipts · {formatDate(batch.createdAt)}</div>
                        </div>
                        <Badge variant={batch.status === "finalized" ? "success" : batch.status === "draft" ? "warning" : "secondary"}>
                          {batch.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setSelectedEntity(isSelected ? null : entity)}>
                    {isSelected ? "Deselect" : "View Receipts"}
                  </Button>
                  <Button size="sm" className="flex-1">Create Invoice</Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unassigned Receipts</CardTitle>
          <CardDescription>These receipts haven&apos;t been assigned to a billing entity yet.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {receipts.filter(r => !r.billingEntityId && r.status === "parsed").map(r => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-neutral-100 p-3 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <Badge variant={r.provider as 'uber' | 'bolt'}>{r.provider}</Badge>
                  <div>
                    <div className="text-sm text-neutral-900 dark:text-white">{r.city} · {formatDate(r.tripDate)}</div>
                    <div className="text-xs text-neutral-400">{formatCurrency(r.amountTotal, r.currency)}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm">Assign</Button>
              </div>
            ))}
            {receipts.filter(r => !r.billingEntityId && r.status === "parsed").length === 0 && (
              <div className="py-8 text-center text-neutral-400 text-sm">No unassigned receipts.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
