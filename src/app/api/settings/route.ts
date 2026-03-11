import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getUserEntitlements } from '@/lib/services/entitlements';

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  companyName: z.string().max(200).optional().nullable(),
  companyAddress: z.string().max(500).optional().nullable(),
  vatId: z.string().max(50).optional().nullable(),
  timezone: z.string().max(50).optional(),
  defaultCurrency: z.string().length(3).optional(),
  defaultMarkupPercent: z.number().min(0).max(50).optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      image: true,
      companyName: true,
      companyAddress: true,
      vatId: true,
      timezone: true,
      defaultCurrency: true,
      defaultMarkupPercent: true,
      role: true,
    },
  });

  const entitlements = await getUserEntitlements(session.user.id);

  return NextResponse.json({
    ...user,
    plan: {
      id: entitlements.plan.id,
      name: entitlements.plan.name,
      status: entitlements.subscriptionStatus,
      features: entitlements.features,
    },
  });
}

export async function PATCH(request: Request) {
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

  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // Gate company details behind plan
  if ((parsed.data.companyName || parsed.data.companyAddress || parsed.data.vatId) &&
      !entitlements.features.companyDetailsInReports) {
    return NextResponse.json({
      error: 'Company details in reports require a paid plan.',
      code: 'FEATURE_NOT_AVAILABLE',
    }, { status: 403 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: parsed.data,
  });

  return NextResponse.json({ message: 'Settings saved' });
}

export async function DELETE() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await prisma.user.delete({ where: { id: session.user.id } });

  return NextResponse.json({ message: 'Account deleted' });
}
