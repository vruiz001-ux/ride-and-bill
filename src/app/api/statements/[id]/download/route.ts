import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getUserEntitlements, checkCanExport } from '@/lib/services/entitlements';
import { generatePdfFromReceipts } from '@/lib/services/pdf';
import { generateXlsxExport } from '@/lib/services/xlsx';
import { generateZipBundle } from '@/lib/services/zip';

// ─── GET /api/statements/[id]/download?format=pdf|csv|xlsx|zip ───────────────

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') || 'pdf') as 'pdf' | 'csv' | 'xlsx' | 'zip';

    if (!['pdf', 'csv', 'xlsx', 'zip'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format. Use pdf, csv, xlsx, or zip.' }, { status: 400 });
    }

    // Auth + ownership check
    const statement = await prisma.statement.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!statement) {
      return NextResponse.json({ error: 'Statement not found' }, { status: 404 });
    }

    // Entitlement check
    const entitlements = await getUserEntitlements(session.user.id);
    const exportError = checkCanExport(entitlements, format);
    if (exportError) {
      return NextResponse.json(
        { error: exportError.message, code: exportError.code },
        { status: 403 },
      );
    }

    // Fetch linked receipts
    const statementReceipts = await prisma.statementReceipt.findMany({
      where: { statementId: id },
      include: { receipt: true },
    });
    const receipts = statementReceipts.map((sr) => sr.receipt);

    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `statement-${id}-${dateStr}.${format}`;

    const periodLabel = `${statement.periodStart.toISOString().slice(0, 10)} to ${statement.periodEnd.toISOString().slice(0, 10)}`;

    // Fetch user info for PDF header
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, companyName: true, companyAddress: true, vatId: true },
    });

    const receiptData = receipts.map(r => ({
      ...r,
      tripDate: r.tripDate.toISOString(),
      tags: r.tags || '',
    }));

    // ─── PDF ───────────────────────────────────────────────────────────────
    if (format === 'pdf') {
      const pdfBuffer = generatePdfFromReceipts({
        receipts: receiptData,
        outputCurrency: statement.outputCurrency,
        applyMarkup: statement.applyMarkup,
        markupPercent: statement.markupPercent,
        title: statement.title,
        periodLabel,
        user: user ?? undefined,
      });

      return new Response(new Uint8Array(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // ─── CSV ───────────────────────────────────────────────────────────────
    if (format === 'csv') {
      const headers = ['Date', 'Provider', 'City', 'Country', 'Amount', 'Currency', 'Tax', 'Pickup', 'Dropoff', 'Status', 'Trip ID', 'Purpose'];

      const escCsv = (val: string | null | undefined) => {
        const s = val ?? '';
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };

      const rows = receipts.map(r =>
        [
          r.tripDate.toISOString().slice(0, 10),
          r.provider,
          r.city,
          r.country,
          r.amountTotal.toFixed(2),
          r.currency,
          r.amountTax?.toFixed(2) ?? '',
          r.pickupLocation ?? '',
          r.dropoffLocation ?? '',
          r.status,
          r.receiptExternalId ?? '',
          r.businessPurpose ?? '',
        ].map(escCsv).join(','),
      );

      const csv = [headers.join(','), ...rows].join('\n');

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // ─── XLSX ──────────────────────────────────────────────────────────────
    if (format === 'xlsx') {
      const xlsxBuffer = generateXlsxExport({
        receipts: receiptData,
        outputCurrency: statement.outputCurrency,
        applyMarkup: statement.applyMarkup,
        markupPercent: statement.markupPercent,
        title: statement.title,
        periodLabel,
      });

      return new Response(new Uint8Array(xlsxBuffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // ─── ZIP ───────────────────────────────────────────────────────────────
    if (format === 'zip') {
      // Fetch any associated receipt files
      const receiptIds = receipts.map(r => r.id);
      const receiptFiles = await prisma.receiptFile.findMany({
        where: { receiptId: { in: receiptIds } },
        select: { filename: true, mimeType: true, data: true },
      });

      const zipBuffer = await generateZipBundle({
        receipts: receiptData,
        receiptFiles,
        outputCurrency: statement.outputCurrency,
        applyMarkup: statement.applyMarkup,
        markupPercent: statement.markupPercent,
        title: statement.title,
        periodLabel,
        user: user ?? undefined,
      });

      return new Response(new Uint8Array(zipBuffer), {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });
  } catch (error) {
    console.error('[statements/[id]/download/GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
