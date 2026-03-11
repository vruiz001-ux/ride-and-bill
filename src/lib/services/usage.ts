// ─── Usage Metering Service ───────────────────────────────────────────────────
// Tracks receipt consumption per billing period per workspace.
// All usage is computed server-side. UI counters must reflect backend truth.

import { prisma } from '@/lib/prisma';

export type UsageMetric = 'receipts_imported';

// ─── Get current period usage ────────────────────────────────────────────────

export async function getCurrentUsage(
  workspaceId: string,
  metric: UsageMetric,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  const counter = await prisma.usageCounter.findUnique({
    where: {
      workspaceId_metric_periodStart: {
        workspaceId,
        metric,
        periodStart,
      },
    },
  });

  return counter?.count ?? 0;
}

// ─── Increment usage (idempotent per receiptId) ─────────────────────────────

export async function incrementUsage(
  workspaceId: string,
  metric: UsageMetric,
  periodStart: Date,
  periodEnd: Date,
  receiptId?: string
): Promise<number> {
  // If receiptId provided, check for idempotency (don't double-count)
  if (receiptId) {
    const existing = await prisma.usageEvent.findFirst({
      where: { workspaceId, metric, receiptId },
    });
    if (existing) {
      // Already counted — return current count without incrementing
      return getCurrentUsage(workspaceId, metric, periodStart, periodEnd);
    }
  }

  // Record the usage event for audit trail
  await prisma.usageEvent.create({
    data: {
      workspaceId,
      metric,
      delta: 1,
      receiptId,
    },
  });

  // Upsert the counter
  const counter = await prisma.usageCounter.upsert({
    where: {
      workspaceId_metric_periodStart: {
        workspaceId,
        metric,
        periodStart,
      },
    },
    create: {
      workspaceId,
      metric,
      periodStart,
      periodEnd,
      count: 1,
    },
    update: {
      count: { increment: 1 },
    },
  });

  return counter.count;
}

// ─── Check if usage is within limits ─────────────────────────────────────────

export async function checkReceiptQuota(
  workspaceId: string,
  maxReceiptsPerMonth: number,
  periodStart: Date,
  periodEnd: Date
): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
  const current = await getCurrentUsage(workspaceId, 'receipts_imported', periodStart, periodEnd);
  const remaining = Math.max(0, maxReceiptsPerMonth - current);

  return {
    allowed: current < maxReceiptsPerMonth,
    current,
    limit: maxReceiptsPerMonth,
    remaining,
  };
}

// ─── Reconcile usage counter from actual receipt count ───────────────────────
// Use this if counters drift or after data corrections.

export async function reconcileUsage(
  workspaceId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<{ previous: number; reconciled: number }> {
  const actualCount = await prisma.receipt.count({
    where: {
      workspaceId,
      importDate: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
  });

  const counter = await prisma.usageCounter.findUnique({
    where: {
      workspaceId_metric_periodStart: {
        workspaceId,
        metric: 'receipts_imported',
        periodStart,
      },
    },
  });

  const previous = counter?.count ?? 0;

  await prisma.usageCounter.upsert({
    where: {
      workspaceId_metric_periodStart: {
        workspaceId,
        metric: 'receipts_imported',
        periodStart,
      },
    },
    create: {
      workspaceId,
      metric: 'receipts_imported',
      periodStart,
      periodEnd,
      count: actualCount,
    },
    update: {
      count: actualCount,
    },
  });

  return { previous, reconciled: actualCount };
}

// ─── Get billing period boundaries ──────────────────────────────────────────

export function getBillingPeriod(anchor: Date, now: Date = new Date()): { start: Date; end: Date } {
  // Calendar-month billing aligned to anchor day
  const anchorDay = anchor.getDate();

  const start = new Date(now.getFullYear(), now.getMonth(), anchorDay);
  if (start > now) {
    start.setMonth(start.getMonth() - 1);
  }

  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  return { start, end };
}

// ─── Get workspace usage summary ─────────────────────────────────────────────

export async function getWorkspaceUsageSummary(workspaceId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { workspaceId },
  });

  const anchor = subscription?.billingCycleAnchor ?? new Date();
  const { start, end } = getBillingPeriod(anchor);

  const [receiptsUsed, seatCount, inboxCount] = await Promise.all([
    getCurrentUsage(workspaceId, 'receipts_imported', start, end),
    prisma.workspaceMember.count({ where: { workspaceId } }),
    prisma.connectedEmailAccount.count({ where: { workspaceId, status: 'active' } }),
  ]);

  return {
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    receiptsUsed,
    seatCount,
    inboxCount,
  };
}
