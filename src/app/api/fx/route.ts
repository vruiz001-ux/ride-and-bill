import { NextResponse } from 'next/server';
import { getHistoricalRate, convertAmount, SUPPORTED_CURRENCIES } from '@/lib/services/fx';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const amount = searchParams.get('amount');

  if (!from || !to) {
    return NextResponse.json({ error: 'Missing from/to currency parameters' }, { status: 400 });
  }

  if (amount) {
    const result = convertAmount(parseFloat(amount), from, to, date);
    if (!result) {
      return NextResponse.json({ error: `No rate available for ${from}→${to}` }, { status: 404 });
    }
    return NextResponse.json(result);
  }

  const rate = getHistoricalRate(from, to, date);
  if (!rate) {
    return NextResponse.json({ error: `No rate available for ${from}→${to}` }, { status: 404 });
  }

  return NextResponse.json(rate);
}

export async function OPTIONS() {
  return NextResponse.json({ currencies: SUPPORTED_CURRENCIES });
}
