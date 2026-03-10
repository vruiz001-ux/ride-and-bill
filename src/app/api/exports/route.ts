import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { format, filters, outputCurrency, applyMarkup, markupPercent } = body;

  const exportJob = await prisma.exportJob.create({
    data: {
      userId: session.user.id,
      format: format || 'pdf',
      status: 'processing',
      filters: JSON.stringify({
        ...filters,
        outputCurrency: outputCurrency || 'EUR',
        applyMarkup: applyMarkup ?? true,
        markupPercent: markupPercent ?? 5,
      }),
    },
  });

  return NextResponse.json({
    ...exportJob,
    filters: JSON.parse(exportJob.filters),
    createdAt: exportJob.createdAt.toISOString(),
    completedAt: exportJob.completedAt?.toISOString() ?? null,
  }, { status: 201 });
}
