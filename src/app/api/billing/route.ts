import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getBillingEntities, getInvoiceBatches } from '@/lib/services/db';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [entities, invoiceBatches] = await Promise.all([
    getBillingEntities(session.user.id),
    getInvoiceBatches(session.user.id),
  ]);

  return NextResponse.json({ entities, invoiceBatches });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { legalName, billingAddress, vatOrTaxId, contactEmail, preferredInvoiceCurrency, defaultMarkupPercent } = body;

  if (!legalName || !billingAddress) {
    return NextResponse.json({ error: 'legalName and billingAddress are required' }, { status: 400 });
  }

  const entity = await prisma.billingEntity.create({
    data: {
      userId: session.user.id,
      legalName,
      billingAddress,
      vatOrTaxId: vatOrTaxId || null,
      contactEmail: contactEmail || null,
      preferredInvoiceCurrency: preferredInvoiceCurrency || 'EUR',
      defaultMarkupPercent: defaultMarkupPercent ?? 5,
    },
  });

  return NextResponse.json({
    ...entity,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  }, { status: 201 });
}
