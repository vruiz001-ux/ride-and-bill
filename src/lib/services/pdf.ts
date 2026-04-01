import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate, providerLabel } from '@/lib/utils';
import { convertAmount } from '@/lib/services/fx';
import { prisma } from '@/lib/prisma';

interface PdfOptions {
  userId: string;
  workspaceId: string;
  month?: number;
  year?: number;
  provider?: string;
  currency?: string;
  outputCurrency: string;
  applyMarkup: boolean;
  markupPercent: number;
  summaryOnly?: boolean;
  includeCompanyDetails?: boolean;
  includeBranding?: boolean;
  retentionCutoff?: Date;
}

export interface PdfFromReceiptsOptions {
  receipts: { tripDate: string | Date; provider: string; city: string; countryCode: string; country: string; amountTotal: number; amountTax: number | null; currency: string; originalCurrency: string; convertedAmount?: number | null; pickupLocation?: string | null; dropoffLocation?: string | null; status: string; tags?: string; businessPurpose?: string | null }[];
  outputCurrency: string;
  applyMarkup: boolean;
  markupPercent: number;
  summaryOnly?: boolean;
  title?: string;
  periodLabel?: string;
  user?: { name?: string | null; companyName?: string | null; companyAddress?: string | null; vatId?: string | null };
}

/** Generate PDF from a pre-fetched array of receipts (no DB access) */
export function generatePdfFromReceipts(options: PdfFromReceiptsOptions): Buffer {
  const {
    receipts,
    outputCurrency,
    applyMarkup,
    markupPercent,
    summaryOnly = false,
    title = 'Ride & Bill Report',
    periodLabel = 'All Time',
    user,
  } = options;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 30);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);

  let headerY = 42;
  if (user?.companyName) { doc.text(user.companyName, 20, headerY); headerY += 5; }
  if (user?.companyAddress) { doc.text(user.companyAddress, 20, headerY); headerY += 5; }
  if (user?.vatId) { doc.text(`VAT/Tax ID: ${user.vatId}`, 20, headerY); headerY += 5; }
  if (user?.name) { doc.text(`Prepared by: ${user.name}`, 20, headerY); headerY += 5; }

  headerY += 3;
  doc.text(`Period: ${periodLabel}`, 20, headerY); headerY += 5;
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 20, headerY); headerY += 5;
  doc.text(`Output Currency: ${outputCurrency}`, 20, headerY);

  if (summaryOnly) {
    headerY += 5;
    doc.setTextColor(150);
    doc.text('Summary report — upgrade for full receipt details', 20, headerY);
    doc.setTextColor(100);
  }

  // Convert receipts
  const converted = receipts.map(r => {
    const dateStr = typeof r.tripDate === 'string' ? r.tripDate : r.tripDate.toISOString();
    const dateOnly = dateStr.split('T')[0];
    const fx = convertAmount(r.amountTotal, r.originalCurrency || r.currency, outputCurrency, dateOnly, markupPercent);
    return {
      ...r,
      tripDateStr: dateStr,
      outConverted: fx?.convertedAmount ?? r.amountTotal,
      outInvoice: fx?.finalAmount ?? r.amountTotal * (1 + markupPercent / 100),
    };
  });

  const totalConverted = converted.reduce((s, r) => s + r.outConverted, 0);
  const totalInvoice = converted.reduce((s, r) => s + r.outInvoice, 0);
  const totalTax = receipts.reduce((s, r) => s + (r.amountTax || 0), 0);
  const hasTax = receipts.some(r => r.amountTax != null && r.amountTax > 0);

  const byProvider: Record<string, { count: number; total: number }> = {};
  for (const r of converted) {
    if (!byProvider[r.provider]) byProvider[r.provider] = { count: 0, total: 0 };
    byProvider[r.provider].count++;
    byProvider[r.provider].total += r.outConverted;
  }

  const byCurrency: Record<string, { count: number; total: number }> = {};
  for (const r of receipts) {
    if (!byCurrency[r.currency]) byCurrency[r.currency] = { count: 0, total: 0 };
    byCurrency[r.currency].count++;
    byCurrency[r.currency].total += r.amountTotal;
  }

  headerY += 12;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Summary', 20, headerY);
  headerY += 8;

  const summaryData = [
    ['Total Receipts', String(receipts.length)],
    ['Total (converted)', formatCurrency(totalConverted, outputCurrency)],
  ];
  if (applyMarkup) {
    summaryData.push(['Total with markup (' + markupPercent + '%)', formatCurrency(totalInvoice, outputCurrency)]);
  }
  if (hasTax) {
    summaryData.push(['Tax / VAT Total', totalTax.toFixed(2)]);
  }

  autoTable(doc, {
    startY: headerY,
    head: [['Metric', 'Value']],
    body: summaryData,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fontStyle: 'bold', fillColor: [245, 245, 245], textColor: [0, 0, 0] },
    margin: { left: 20, right: 20 },
  });

  const afterSummary = (doc as unknown as Record<string, unknown>).lastAutoTable as { finalY: number } | undefined;
  let nextY = (afterSummary?.finalY || headerY + 30) + 8;

  if (Object.keys(byProvider).length > 0) {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('By Provider', 20, nextY);
    nextY += 6;
    autoTable(doc, {
      startY: nextY,
      head: [['Provider', 'Rides', 'Total']],
      body: Object.entries(byProvider).map(([p, d]) => [providerLabel(p), String(d.count), formatCurrency(d.total, outputCurrency)]),
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fontStyle: 'bold', fillColor: [245, 245, 245], textColor: [0, 0, 0] },
      margin: { left: 20, right: 20 },
    });
  }

  if (Object.keys(byCurrency).length > 1) {
    const afterProvider = (doc as unknown as Record<string, unknown>).lastAutoTable as { finalY: number } | undefined;
    nextY = (afterProvider?.finalY || nextY + 20) + 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('By Currency', 20, nextY);
    nextY += 6;
    autoTable(doc, {
      startY: nextY,
      head: [['Currency', 'Receipts', 'Subtotal']],
      body: Object.entries(byCurrency).map(([c, d]) => [c, String(d.count), formatCurrency(d.total, c)]),
      theme: 'plain',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fontStyle: 'bold', fillColor: [245, 245, 245], textColor: [0, 0, 0] },
      margin: { left: 20, right: 20 },
    });
  }

  if (!summaryOnly) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('Receipt Details', 20, 20);

    autoTable(doc, {
      startY: 28,
      head: [['Date', 'Provider', 'Location', 'Original', 'Converted', applyMarkup ? 'Invoice' : '']],
      body: converted.map(r => [
        formatDate(r.tripDateStr),
        providerLabel(r.provider),
        `${r.city}, ${r.countryCode}`,
        formatCurrency(r.amountTotal, r.currency),
        formatCurrency(r.outConverted, outputCurrency),
        applyMarkup ? formatCurrency(r.outInvoice, outputCurrency) : '\u2014',
      ]),
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [23, 23, 23], textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 24 }, 1: { cellWidth: 22 }, 2: { cellWidth: 'auto' },
        3: { halign: 'right', cellWidth: 28 }, 4: { halign: 'right', cellWidth: 28 }, 5: { halign: 'right', cellWidth: 28 },
      },
    });
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Ride & Bill \u2014 Page ${i} of ${pageCount}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
  }

  return Buffer.from(doc.output('arraybuffer'));
}

export async function generatePdfExport(options: PdfOptions): Promise<Buffer> {
  const {
    userId, workspaceId, month, year, provider, currency,
    outputCurrency, applyMarkup, markupPercent,
    summaryOnly = false,
    includeCompanyDetails = true,
    retentionCutoff,
  } = options;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, companyName: true, companyAddress: true, vatId: true },
  });

  const where: Record<string, unknown> = { workspaceId, status: { not: 'failed' } };
  if (provider) where.provider = provider;
  if (currency) where.currency = currency;
  if (retentionCutoff) {
    where.tripDate = { gte: retentionCutoff };
  }

  let receipts = await prisma.receipt.findMany({
    where,
    orderBy: { tripDate: 'asc' },
  });

  if (year) {
    receipts = receipts.filter(r => r.tripDate.getFullYear() === year);
  }
  if (month && year) {
    receipts = receipts.filter(r => r.tripDate.getFullYear() === year && r.tripDate.getMonth() + 1 === month);
  }

  const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const periodLabel = month && year ? `${MONTH_NAMES[month]} ${year}` : year ? `Year ${year}` : 'All Time';

  return generatePdfFromReceipts({
    receipts: receipts.map(r => ({
      ...r,
      tripDate: r.tripDate.toISOString(),
      tags: r.tags || '',
    })),
    outputCurrency,
    applyMarkup,
    markupPercent,
    summaryOnly,
    periodLabel,
    user: includeCompanyDetails ? user ?? undefined : undefined,
  });
}
