import JSZip from 'jszip';
import { generatePdfFromReceipts, type PdfFromReceiptsOptions } from '@/lib/services/pdf';
import { generateXlsxExport, type XlsxOptions } from '@/lib/services/xlsx';

interface ZipReceiptRow {
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

interface ReceiptFileData {
  filename: string;
  mimeType: string;
  data: string; // base64
}

export interface ZipBundleOptions {
  receipts: ZipReceiptRow[];
  receiptFiles?: ReceiptFileData[];
  outputCurrency: string;
  applyMarkup: boolean;
  markupPercent: number;
  title?: string;
  periodLabel?: string;
  user?: PdfFromReceiptsOptions['user'];
}

export async function generateZipBundle(options: ZipBundleOptions): Promise<Buffer> {
  const {
    receipts,
    receiptFiles = [],
    outputCurrency,
    applyMarkup,
    markupPercent,
    title = 'Ride & Bill Statement',
    periodLabel = 'All Time',
    user,
  } = options;

  const zip = new JSZip();
  const folderName = `statement-${new Date().toISOString().split('T')[0]}`;
  const folder = zip.folder(folderName)!;

  // Generate and add PDF statement
  const pdfBuffer = generatePdfFromReceipts({
    receipts,
    outputCurrency,
    applyMarkup,
    markupPercent,
    title,
    periodLabel,
    user,
  });
  folder.file('statement-summary.pdf', pdfBuffer);

  // Generate and add XLSX
  const xlsxOpts: XlsxOptions = {
    receipts,
    outputCurrency,
    applyMarkup,
    markupPercent,
    title,
    periodLabel,
  };
  const xlsxBuffer = generateXlsxExport(xlsxOpts);
  folder.file('statement-data.xlsx', xlsxBuffer);

  // Add receipt files if any exist
  if (receiptFiles.length > 0) {
    const receiptsFolder = folder.folder('receipts')!;
    for (const file of receiptFiles) {
      const binaryData = Buffer.from(file.data, 'base64');
      receiptsFolder.file(file.filename, binaryData);
    }
  }

  const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return Buffer.from(zipBuffer);
}
