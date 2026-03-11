import { prisma } from '@/lib/prisma';
import type { DashboardStats } from '@/lib/types';

// ─── Tag CSV helpers ──────────────────────────────────────────────────────────

export function tagsToArray(csv: string): string[] {
  return csv ? csv.split(',').map((t) => t.trim()).filter(Boolean) : [];
}

export function tagsToCSV(tags: string[]): string {
  return tags.join(',');
}

// ─── Receipts ─────────────────────────────────────────────────────────────────

export async function getReceipts(
  userId: string,
  filters: {
    provider?: string;
    country?: string;
    currency?: string;
    status?: string;
    billingEntityId?: string;
    workspaceId?: string;
    retentionCutoff?: Date;
  } = {}
) {
  const where: Record<string, unknown> = {};

  // Prefer workspace scoping, fall back to userId
  if (filters.workspaceId) {
    where.workspaceId = filters.workspaceId;
  } else {
    where.userId = userId;
  }

  if (filters.provider) where.provider = filters.provider;
  if (filters.country) where.country = filters.country;
  if (filters.currency) where.currency = filters.currency;
  if (filters.status) where.status = filters.status;
  if (filters.billingEntityId) where.billingEntityId = filters.billingEntityId;
  if (filters.retentionCutoff) {
    where.tripDate = { gte: filters.retentionCutoff };
  }

  const receipts = await prisma.receipt.findMany({
    where,
    orderBy: { tripDate: 'desc' },
  });

  return receipts.map((r) => ({
    ...r,
    tripDate: r.tripDate.toISOString(),
    importDate: r.importDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    tags: tagsToArray(r.tags),
  }));
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function getDashboardStats(
  userId: string,
  options: { workspaceId?: string; retentionCutoff?: Date } = {}
): Promise<DashboardStats> {
  const allReceipts = await getReceipts(userId, {
    workspaceId: options.workspaceId,
    retentionCutoff: options.retentionCutoff,
  });
  const receipts = allReceipts.filter((r) => r.status !== 'failed');

  const totalSpend = receipts.reduce((s, r) => s + (r.convertedAmount || 0), 0);

  const providers = ['uber', 'bolt', 'waymo', 'careem', 'freenow'] as const;
  const byProviderMap = new Map(providers.map(p => [p, receipts.filter(r => r.provider === p)]));

  const byCountryMap: Record<string, { country: string; countryCode: string; count: number; total: number }> = {};
  const byCurrencyMap: Record<string, { currency: string; count: number; total: number }> = {};
  const byMonthMap: Record<string, { month: string; count: number; total: number }> = {};

  for (const r of receipts) {
    if (!byCountryMap[r.country]) byCountryMap[r.country] = { country: r.country, countryCode: r.countryCode, count: 0, total: 0 };
    byCountryMap[r.country].count++;
    byCountryMap[r.country].total += r.convertedAmount || 0;

    if (!byCurrencyMap[r.originalCurrency]) byCurrencyMap[r.originalCurrency] = { currency: r.originalCurrency, count: 0, total: 0 };
    byCurrencyMap[r.originalCurrency].count++;
    byCurrencyMap[r.originalCurrency].total += r.originalAmount;

    const month = r.tripDate.substring(0, 7);
    if (!byMonthMap[month]) byMonthMap[month] = { month, count: 0, total: 0 };
    byMonthMap[month].count++;
    byMonthMap[month].total += r.convertedAmount || 0;
  }

  const invoiceableTotal = receipts
    .filter((r) => r.invoiceAmount != null)
    .reduce((s, r) => s + (r.invoiceAmount || 0), 0);

  return {
    totalReceipts: receipts.length,
    totalSpend: Math.round(totalSpend * 100) / 100,
    totalSpendCurrency: 'PLN',
    byProvider: providers
      .map(p => {
        const pr = byProviderMap.get(p) || [];
        return { provider: p, count: pr.length, total: Math.round(pr.reduce((s, r) => s + (r.convertedAmount || 0), 0) * 100) / 100 };
      })
      .filter(p => p.count > 0),
    byMonth: Object.values(byMonthMap).sort((a, b) => a.month.localeCompare(b.month)),
    byCountry: Object.values(byCountryMap).sort((a, b) => b.total - a.total),
    byCurrency: Object.values(byCurrencyMap),
    invoiceableTotal: Math.round(invoiceableTotal * 100) / 100,
    invoiceableCurrency: 'PLN',
    recentReceipts: receipts.slice(0, 5) as DashboardStats['recentReceipts'],
    reviewCount: allReceipts.filter((r) => r.status === 'review').length,
  };
}

// ─── Connected Accounts ───────────────────────────────────────────────────────

export async function getConnectedAccounts(userId: string) {
  const accounts = await prisma.connectedEmailAccount.findMany({
    where: { userId },
  });
  return accounts.map((a) => ({
    ...a,
    lastSyncAt: a.lastSyncAt?.toISOString() ?? null,
    connectedAt: a.connectedAt.toISOString(),
  }));
}

// ─── Billing Entities ─────────────────────────────────────────────────────────

export async function getBillingEntities(userId: string) {
  const entities = await prisma.billingEntity.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return entities.map((e) => ({
    ...e,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));
}

// ─── Invoice Batches ──────────────────────────────────────────────────────────

export async function getInvoiceBatches(userId: string) {
  const batches = await prisma.invoiceBatch.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return batches.map((b) => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
  }));
}
