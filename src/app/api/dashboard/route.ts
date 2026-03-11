import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getConnectedAccounts } from '@/lib/services/db';
import { getUserEntitlements } from '@/lib/services/entitlements';
import { getWorkspaceUsageSummary } from '@/lib/services/usage';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const entitlements = await getUserEntitlements(session.user.id);
    const workspaceId = entitlements.workspaceId;

    const [emailAccounts, usage, receipts] = await Promise.all([
      getConnectedAccounts(session.user.id),
      getWorkspaceUsageSummary(workspaceId),
      prisma.receipt.findMany({
        where: {
          workspaceId,
          tripDate: { gte: entitlements.retentionCutoff },
          status: { not: 'failed' },
        },
        orderBy: { tripDate: 'desc' },
      }),
    ]);

    // Build stats from retained receipts only
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

      const month = r.tripDate.toISOString().substring(0, 7);
      if (!byMonthMap[month]) byMonthMap[month] = { month, count: 0, total: 0 };
      byMonthMap[month].count++;
      byMonthMap[month].total += r.convertedAmount || 0;
    }

    const invoiceableTotal = receipts
      .filter(r => r.invoiceAmount != null)
      .reduce((s, r) => s + (r.invoiceAmount || 0), 0);

    const allReceipts = await prisma.receipt.findMany({
      where: { workspaceId, tripDate: { gte: entitlements.retentionCutoff } },
    });
    const reviewCount = allReceipts.filter(r => r.status === 'review').length;

    const stats = {
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
      recentReceipts: receipts.slice(0, 5).map(r => ({
        ...r,
        tripDate: r.tripDate.toISOString(),
        importDate: r.importDate.toISOString(),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        tags: r.tags ? r.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      })),
      reviewCount,
    };

    return NextResponse.json({
      stats,
      emailAccounts,
      usage: {
        ...usage,
        receiptsLimit: entitlements.maxReceiptsPerMonth,
        seatsLimit: entitlements.maxSeats,
        inboxesLimit: entitlements.maxInboxes,
      },
      plan: {
        id: entitlements.plan.id,
        name: entitlements.plan.name,
        status: entitlements.subscriptionStatus,
        isActive: entitlements.isActive,
        isGracePeriod: entitlements.isGracePeriod,
        isReadOnly: entitlements.isReadOnly,
        isOverSeatLimit: entitlements.isOverSeatLimit,
        isOverInboxLimit: entitlements.isOverInboxLimit,
        features: entitlements.features,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
