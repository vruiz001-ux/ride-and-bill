import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { tagsToArray } from '@/lib/services/db';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getUserEntitlements } from '@/lib/services/entitlements';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const entitlements = await getUserEntitlements(session.user.id);
  const { searchParams } = new URL(request.url);

  // Build query scoped to workspace + retention
  const where: Record<string, unknown> = {
    workspaceId: entitlements.workspaceId,
    tripDate: { gte: entitlements.retentionCutoff },
  };

  if (searchParams.get('provider')) where.provider = searchParams.get('provider');
  if (searchParams.get('country')) where.country = searchParams.get('country');
  if (searchParams.get('currency')) where.currency = searchParams.get('currency');
  if (searchParams.get('status')) where.status = searchParams.get('status');
  if (searchParams.get('billingEntityId')) where.billingEntityId = searchParams.get('billingEntityId');

  const receipts = await prisma.receipt.findMany({
    where,
    orderBy: { tripDate: 'desc' },
  });

  return NextResponse.json({
    receipts: receipts.map(r => ({
      ...r,
      tripDate: r.tripDate.toISOString(),
      importDate: r.importDate.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      tags: tagsToArray(r.tags),
    })),
    total: receipts.length,
  });
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
  const entitlements = await getUserEntitlements(session.user.id);

  // Verify ownership via workspace
  const existing = await prisma.receipt.findFirst({
    where: { id, workspaceId: entitlements.workspaceId },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Receipt not found' }, { status: 404 });
  }

  // Check read-only mode
  if (entitlements.isReadOnly) {
    return NextResponse.json({
      error: 'Your subscription is inactive. Please update your billing to edit receipts.',
      code: 'SUBSCRIPTION_INACTIVE',
    }, { status: 403 });
  }

  // Validate tags feature availability
  if (tags !== undefined && tags.some(t => t === 'business' || t === 'personal')) {
    if (!entitlements.features.businessPersonalTags) {
      return NextResponse.json({
        error: 'Business/personal tags require Pro plan or higher.',
        code: 'FEATURE_NOT_AVAILABLE',
      }, { status: 403 });
    }
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
