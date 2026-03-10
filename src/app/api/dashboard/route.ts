import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDashboardStats, getConnectedAccounts } from '@/lib/services/db';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [stats, emailAccounts] = await Promise.all([
    getDashboardStats(session.user.id),
    getConnectedAccounts(session.user.id),
  ]);

  return NextResponse.json({ stats, emailAccounts });
}
