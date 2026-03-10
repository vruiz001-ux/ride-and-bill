import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getReceipts, tagsToArray } from '@/lib/services/db';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

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

const receiptUpdateSchema = z.object({
  id: z.string(),
  businessPurpose: z.string().max(200).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  tags: z.array(z.string()).optional(),
  billingEntityId: z.string().optional().nullable(),
  amountTotal: z.number().positive().optional(),
  amountTax: z.number().optional().nullable(),
  city: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  countryCode: z.string().max(5).optional(),
  pickupLocation: z.string().max(200).optional().nullable(),
  dropoffLocation: z.string().max(200).optional().nullable(),
  status: z.enum(['parsed', 'review', 'failed']).optional(),
});

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const parsed = receiptUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  const { id, tags, ...updateData } = parsed.data;

  // Verify ownership
  const existing = await prisma.receipt.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
  }

  const data: Record<string, unknown> = { ...updateData };
  if (tags !== undefined) {
    data.tags = tags.join(',');
  }

  const updated = await prisma.receipt.update({ where: { id }, data });

  return NextResponse.json({
    ...updated,
    tripDate: updated.tripDate.toISOString(),
    importDate: updated.importDate.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    tags: tagsToArray(updated.tags),
  });
}
