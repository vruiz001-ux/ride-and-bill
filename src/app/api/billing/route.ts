import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getBillingEntities, getInvoiceBatches } from '@/lib/services/db';
import { z } from 'zod';
import { getUserEntitlements } from '@/lib/services/entitlements';

const createEntitySchema = z.object({
  legalName: z.string().min(1).max(200),
  billingAddress: z.string().min(1).max(500),
  vatOrTaxId: z.string().max(50).optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  preferredInvoiceCurrency: z.string().length(3).optional(),
  defaultMarkupPercent: z.number().min(0).max(100).optional(),
});

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

  const entitlements = await getUserEntitlements(session.user.id);

  if (entitlements.isReadOnly) {
    return NextResponse.json({
      error: 'Your subscription is inactive. Please update your billing.',
      code: 'SUBSCRIPTION_INACTIVE',
    }, { status: 403 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const parsed = createEntitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }

  const { legalName, billingAddress, vatOrTaxId, contactEmail, preferredInvoiceCurrency, defaultMarkupPercent } = parsed.data;

  const entity = await prisma.billingEntity.create({
    data: {
      userId: session.user.id,
      workspaceId: entitlements.workspaceId,
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
