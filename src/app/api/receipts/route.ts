import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getReceipts } from '@/lib/services/db';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const receipts = await getReceipts(session.user.id, {
    provider: searchParams.get('provider') || undefined,
    country: searchParams.get('country') || undefined,
    currency: searchParams.get('currency') || undefined,
    status: searchParams.get('status') || undefined,
    billingEntityId: searchParams.get('billingEntityId') || undefined,
  });

  return NextResponse.json({ receipts, total: receipts.length });
}
