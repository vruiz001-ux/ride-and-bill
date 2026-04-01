import * as XLSX from 'xlsx';
import { formatDate, providerLabel } from '@/lib/utils';
import { convertAmount } from '@/lib/services/fx';

interface XlsxReceiptRow {
  tripDate: string | Date;
  provider: string;
  city: string;
  country: string;
  countryCode: string;
  amountTotal: number;
  amountTax: number | null;
  currency: string;
  originalCurrency: string;
  pickupLocation?: string | null;
  dropoffLocation?: string | null;
  status: string;
  businessPurpose?: string | null;
  tags?: string;
  receiptExternalId?: string | null;
  paymentMethodMasked?: string | null;
}

export interface XlsxOptions {
  receipts: XlsxReceiptRow[];
  outputCurrency: string;
  applyMarkup: boolean;
  markupPercent: number;
  title?: string;
  periodLabel?: string;
}

export function generateXlsxExport(options: XlsxOptions): Buffer {
  const {
    receipts,
    outputCurrency,
    applyMarkup,
    markupPercent,
    title = 'Ride & Bill Report',
    periodLabel = 'All Time',
  } = options;

  const wb = XLSX.utils.book_new();

  // Build header rows
  const headerRows: (string | number)[][] = [
    [title],
    [`Period: ${periodLabel}`],
    [`Generated: ${new Date().toISOString().split('T')[0]}`],
    [`Output Currency: ${outputCurrency}`],
    [], // blank row
  ];

  // Column headers
  const columns = [
    'Date', 'Provider', 'City', 'Country', 'Trip ID',
    'Original Amount', 'Original Currency', 'FX Rate',
    'Converted Amount', 'Output Currency',
  ];
  if (applyMarkup) {
    columns.push('Markup %', 'Invoice Amount');
  }
  columns.push('Tax/VAT', 'Pickup', 'Dropoff', 'Status', 'Purpose', 'Card', 'Tags');
  headerRows.push(columns);

  // Data rows
  const dataRows = receipts.map(r => {
    const dateStr = typeof r.tripDate === 'string' ? r.tripDate : r.tripDate.toISOString();
    const dateOnly = dateStr.split('T')[0];
    const fx = convertAmount(r.amountTotal, r.originalCurrency || r.currency, outputCurrency, dateOnly, markupPercent);
    const convertedAmount = fx?.convertedAmount ?? r.amountTotal;
    const fxRate = fx?.fxRate ?? 1;
    const invoiceAmount = fx?.finalAmount ?? r.amountTotal * (1 + markupPercent / 100);

    const row: (string | number)[] = [
      formatDate(dateStr),
      providerLabel(r.provider),
      r.city,
      r.country,
      r.receiptExternalId || '',
      r.amountTotal,
      r.currency,
      Math.round(fxRate * 1000000) / 1000000,
      Math.round(convertedAmount * 100) / 100,
      outputCurrency,
    ];
    if (applyMarkup) {
      row.push(markupPercent, Math.round(invoiceAmount * 100) / 100);
    }
    row.push(
      r.amountTax ?? '',
      r.pickupLocation || '',
      r.dropoffLocation || '',
      r.status,
      r.businessPurpose || '',
      r.paymentMethodMasked || '',
      r.tags || '',
    );
    return row;
  });

  // Totals row
  const totalsRow: (string | number)[] = ['TOTAL', '', '', '', '', receipts.reduce((s, r) => s + r.amountTotal, 0), '', '', '', ''];
  if (applyMarkup) {
    totalsRow.push('', '');
  }
  totalsRow.push('', '', '', '', '', '', '');

  const allRows = [...headerRows, ...dataRows, [], totalsRow];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Set column widths
  ws['!cols'] = [
    { wch: 12 }, // Date
    { wch: 10 }, // Provider
    { wch: 18 }, // City
    { wch: 14 }, // Country
    { wch: 16 }, // Trip ID
    { wch: 14 }, // Amount
    { wch: 10 }, // Currency
    { wch: 12 }, // FX Rate
    { wch: 14 }, // Converted
    { wch: 10 }, // Output Cur
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Receipts');

  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(xlsxBuffer);
}
