import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDashboardStats, getConnectedAccounts } from '@/lib/services/db';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [stats, emailAccounts] = await Promise.all([
      getDashboardStats(session.user.id),
      getConnectedAccounts(session.user.id),
    ]);
    return NextResponse.json({ stats, emailAccounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load dashboard';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
