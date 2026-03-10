import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin role
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [totalUsers, totalReceipts, totalExports, receiptsByProvider, recentUsers] = await Promise.all([
    prisma.user.count(),
    prisma.receipt.count(),
    prisma.exportJob.count(),
    prisma.receipt.groupBy({
      by: ['provider'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, createdAt: true, role: true },
    }),
  ]);

  // Receipts by status
  const receiptsByStatus = await prisma.receipt.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  // Connected email accounts
  const emailAccounts = await prisma.connectedEmailAccount.count();

  return NextResponse.json({
    totalUsers,
    totalReceipts,
    totalExports,
    emailAccounts,
    receiptsByProvider: receiptsByProvider.map(r => ({
      provider: r.provider,
      count: r._count.id,
    })),
    receiptsByStatus: receiptsByStatus.map(r => ({
      status: r.status,
      count: r._count.id,
    })),
    recentUsers: recentUsers.map(u => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}
