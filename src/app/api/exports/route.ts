import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generatePdfExport } from '@/lib/services/pdf';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const jobs = await prisma.exportJob.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return NextResponse.json({
    jobs: jobs.map(j => ({
      ...j,
      filters: JSON.parse(j.filters),
      createdAt: j.createdAt.toISOString(),
      completedAt: j.completedAt?.toISOString() ?? null,
    })),
  });
}

export async function POST(request: Request) {
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

  const { format, filters, outputCurrency, applyMarkup, markupPercent } = body;

  // Create export job record
  const exportJob = await prisma.exportJob.create({
    data: {
      userId: session.user.id,
      format: format || 'pdf',
      status: 'processing',
      filters: JSON.stringify(filters || {}),
    },
  });

  try {
    if (format === 'pdf' || !format) {
      const pdfBuffer = await generatePdfExport({
        userId: session.user.id,
        month: filters?.month ? parseInt(filters.month) : undefined,
        year: filters?.year ? parseInt(filters.year) : undefined,
        provider: filters?.provider,
        currency: filters?.currency,
        outputCurrency: outputCurrency || 'EUR',
        applyMarkup: applyMarkup ?? true,
        markupPercent: markupPercent ?? 5,
      });

      // Update job as completed
      await prisma.exportJob.update({
        where: { id: exportJob.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      const dateStr = new Date().toISOString().split('T')[0];
      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ridereceipt-${dateStr}.pdf"`,
        },
      });
    }

    // For other formats, mark as completed (placeholder)
    await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: { status: 'completed', completedAt: new Date() },
    });

    return NextResponse.json({
      ...exportJob,
      status: 'completed',
      filters: JSON.parse(exportJob.filters),
      createdAt: exportJob.createdAt.toISOString(),
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: { status: 'failed' },
    });
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
