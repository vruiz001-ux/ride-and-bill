import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generatePdfExport } from '@/lib/services/pdf';
import { getUserEntitlements, checkCanExport, resolveUserWorkspace } from '@/lib/services/entitlements';

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspaceId = await resolveUserWorkspace(session.user.id);

  const jobs = await prisma.exportJob.findMany({
    where: { workspaceId },
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
  const exportFormat = format || 'pdf';

  // ─── Entitlement checks ──────────────────────────────────────────────────
  const entitlements = await getUserEntitlements(session.user.id);
  const workspaceId = entitlements.workspaceId;

  // Determine export type: free users get summary-only
  const exportType = entitlements.features.fullPdfExport ? 'full' : 'summary';

  const exportError = checkCanExport(
    entitlements,
    exportFormat as 'pdf' | 'csv',
    exportType
  );
  if (exportError) {
    return NextResponse.json({ error: exportError.message, code: exportError.code }, { status: 403 });
  }

  // Create export job record
  const exportJob = await prisma.exportJob.create({
    data: {
      userId: session.user.id,
      workspaceId,
      format: exportFormat,
      status: 'processing',
      filters: JSON.stringify(filters || {}),
    },
  });

  try {
    if (exportFormat === 'pdf') {
      const pdfBuffer = await generatePdfExport({
        userId: session.user.id,
        workspaceId,
        month: filters?.month ? parseInt(filters.month) : undefined,
        year: filters?.year ? parseInt(filters.year) : undefined,
        provider: filters?.provider,
        currency: filters?.currency,
        outputCurrency: outputCurrency || 'EUR',
        applyMarkup: applyMarkup ?? true,
        markupPercent: markupPercent ?? 5,
        summaryOnly: !entitlements.features.fullPdfExport,
        includeCompanyDetails: entitlements.features.companyDetailsInReports,
        includeBranding: entitlements.features.brandedReports,
        retentionCutoff: entitlements.retentionCutoff,
      });

      await prisma.exportJob.update({
        where: { id: exportJob.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      const dateStr = new Date().toISOString().split('T')[0];
      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="ride-and-bill-${dateStr}.pdf"`,
        },
      });
    }

    if (exportFormat === 'csv') {
      const csvContent = await generateCsvExport({
        userId: session.user.id,
        workspaceId,
        filters,
        retentionCutoff: entitlements.retentionCutoff,
      });

      await prisma.exportJob.update({
        where: { id: exportJob.id },
        data: { status: 'completed', completedAt: new Date() },
      });

      const dateStr = new Date().toISOString().split('T')[0];
      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="ride-and-bill-${dateStr}.csv"`,
        },
      });
    }

    // Unknown format
    await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: { status: 'failed' },
    });
    return NextResponse.json({ error: 'Unsupported export format' }, { status: 400 });
  } catch (error) {
    await prisma.exportJob.update({
      where: { id: exportJob.id },
      data: { status: 'failed' },
    });
    const message = error instanceof Error ? error.message : 'Export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── CSV Export Generator ────────────────────────────────────────────────────

async function generateCsvExport(options: {
  userId: string;
  workspaceId: string;
  filters?: Record<string, string>;
  retentionCutoff: Date;
}): Promise<string> {
  const { workspaceId, filters, retentionCutoff } = options;

  const where: Record<string, unknown> = {
    workspaceId,
    tripDate: { gte: retentionCutoff },
    status: { not: 'failed' },
  };
  if (filters?.provider) where.provider = filters.provider;
  if (filters?.currency) where.currency = filters.currency;

  if (filters?.month && filters?.year) {
    const ym = `${filters.year}-${String(parseInt(filters.month)).padStart(2, '0')}`;
    const startDate = new Date(`${ym}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    where.tripDate = { gte: startDate > retentionCutoff ? startDate : retentionCutoff, lt: endDate };
  }

  const receipts = await prisma.receipt.findMany({
    where,
    orderBy: { tripDate: 'desc' },
  });

  const headers = [
    'Date', 'Provider', 'City', 'Country', 'Amount', 'Currency',
    'Converted Amount', 'Converted Currency', 'FX Rate',
    'Pickup', 'Dropoff', 'Status', 'Tags', 'Business Purpose',
  ];

  const rows = receipts.map(r => [
    r.tripDate.toISOString().split('T')[0],
    r.provider,
    r.city,
    r.country,
    r.amountTotal.toFixed(2),
    r.currency,
    r.convertedAmount?.toFixed(2) ?? '',
    r.convertedCurrency ?? '',
    r.fxRate?.toFixed(6) ?? '',
    r.pickupLocation ?? '',
    r.dropoffLocation ?? '',
    r.status,
    r.tags,
    r.businessPurpose ?? '',
  ]);

  const escape = (val: string) => {
    if (val.includes(',') || val.includes('"') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  return [
    headers.map(escape).join(','),
    ...rows.map(row => row.map(escape).join(',')),
  ].join('\n');
}
