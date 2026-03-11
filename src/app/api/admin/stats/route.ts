import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [
    totalUsers,
    totalReceipts,
    totalExports,
    totalWorkspaces,
    receiptsByProvider,
    receiptsByStatus,
    emailAccounts,
    recentUsers,
    subscriptionsByPlan,
    subscriptionsByStatus,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.receipt.count(),
    prisma.exportJob.count(),
    prisma.workspace.count(),
    prisma.receipt.groupBy({
      by: ['provider'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.receipt.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
    prisma.connectedEmailAccount.count(),
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, createdAt: true, role: true },
    }),
    prisma.subscription.groupBy({
      by: ['plan'],
      _count: { id: true },
    }),
    prisma.subscription.groupBy({
      by: ['status'],
      _count: { id: true },
    }),
  ]);

  // Workspaces over limits
  const workspaces = await prisma.workspace.findMany({
    include: {
      subscription: true,
      _count: {
        select: {
          members: true,
          emailAccounts: true,
        },
      },
    },
  });

  const overLimitWorkspaces = workspaces.filter(w => {
    if (!w.subscription) return false;
    const plan = w.subscription.plan;
    const seatLimit = w.subscription.customSeats ?? (plan === 'free' ? 1 : plan === 'solo' ? 1 : plan === 'pro' ? 3 : plan === 'team' ? 10 : 999);
    const inboxLimit = w.subscription.customInboxes ?? (plan === 'free' ? 0 : plan === 'solo' ? 1 : plan === 'pro' ? 3 : plan === 'team' ? 10 : 999);
    return w._count.members > seatLimit || w._count.emailAccounts > inboxLimit;
  }).length;

  // Failed sync runs in last 24 hours
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);
  const failedSyncs = await prisma.syncRun.count({
    where: { status: 'failed', startedAt: { gte: oneDayAgo } },
  });

  const failedExports = await prisma.exportJob.count({
    where: { status: 'failed', createdAt: { gte: oneDayAgo } },
  });

  return NextResponse.json({
    totalUsers,
    totalReceipts,
    totalExports,
    totalWorkspaces,
    emailAccounts,
    overLimitWorkspaces,
    failedSyncs24h: failedSyncs,
    failedExports24h: failedExports,
    receiptsByProvider: receiptsByProvider.map(r => ({
      provider: r.provider,
      count: r._count.id,
    })),
    receiptsByStatus: receiptsByStatus.map(r => ({
      status: r.status,
      count: r._count.id,
    })),
    subscriptionsByPlan: subscriptionsByPlan.map(s => ({
      plan: s.plan,
      count: s._count.id,
    })),
    subscriptionsByStatus: subscriptionsByStatus.map(s => ({
      status: s.status,
      count: s._count.id,
    })),
    recentUsers: recentUsers.map(u => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
