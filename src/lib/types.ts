// ─── Core Types ─────────────────────────────────────────────────────────────

export type Provider = 'uber' | 'bolt';
export type ReceiptStatus = 'parsed' | 'review' | 'failed' | 'duplicate';
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'completed';
export type ExportFormat = 'pdf' | 'excel' | 'zip';
export type ConversionStatus = 'converted' | 'pending' | 'fallback' | 'failed';

export interface User {
  id: string;
  email: string;
  name: string;
  defaultCurrency: string;
  defaultMarkupPercent: number;
  createdAt: string;
}

export interface ConnectedEmailAccount {
  id: string;
  userId: string;
  provider: 'gmail' | 'outlook' | 'imap';
  email: string;
  status: 'active' | 'expired' | 'disconnected';
  lastSyncAt: string | null;
  syncStatus: SyncStatus;
  totalImported: number;
  connectedAt: string;
}

export interface Receipt {
  id: string;
  userId: string;
  provider: Provider;
  sourceEmailAccountId: string;
  sourceMessageId: string;
  receiptExternalId: string | null;
  tripDate: string;
  importDate: string;
  country: string;
  countryCode: string;
  city: string;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  amountTotal: number;
  amountTax: number | null;
  currency: string;
  paymentMethodMasked: string | null;
  businessPurpose: string | null;
  notes: string | null;
  tags: string[];
  rawEmailSubject: string;
  rawEmailSender: string;
  originalFileUrl: string | null;
  normalizedPdfUrl: string | null;
  parserVersion: string;
  parsingConfidence: number;
  status: ReceiptStatus;
  // Currency conversion
  originalAmount: number;
  originalCurrency: string;
  fxRate: number | null;
  fxRateDate: string | null;
  fxSource: string | null;
  markupPercent: number;
  convertedAmount: number | null;
  convertedCurrency: string | null;
  invoiceAmount: number | null;
  invoiceCurrency: string | null;
  billingEntityId: string | null;
  conversionStatus: ConversionStatus;
  fallbackRateUsed: boolean;
  isRefunded: boolean;
  refundAmount: number | null;
  netInvoiceAmount: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BillingEntity {
  id: string;
  userId: string;
  legalName: string;
  billingAddress: string;
  vatOrTaxId: string | null;
  contactEmail: string | null;
  preferredInvoiceCurrency: string;
  defaultMarkupPercent: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceBatch {
  id: string;
  userId: string;
  billingEntityId: string;
  billingEntityName: string;
  invoiceCurrency: string;
  markupPercent: number;
  subtotalOriginal: number;
  subtotalConverted: number;
  markupAmount: number;
  totalInvoice: number;
  receiptCount: number;
  status: 'draft' | 'finalized' | 'exported';
  exportFileUrl: string | null;
  createdAt: string;
}

export interface FxRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  date: string;
  source: string;
}

export interface ExportJob {
  id: string;
  userId: string;
  format: ExportFormat;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filters: ExportFilters;
  fileUrl: string | null;
  receiptCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface ExportFilters {
  provider?: Provider;
  country?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  month?: string;
  year?: string;
  currency?: string;
  billingEntityId?: string;
  outputCurrency?: string;
  includeOriginalCurrencies?: boolean;
  includeConvertedValues?: boolean;
  applyMarkup?: boolean;
  markupPercent?: number;
  receiptIds?: string[];
}

export interface DashboardStats {
  totalReceipts: number;
  totalSpend: number;
  totalSpendCurrency: string;
  byProvider: { provider: Provider; count: number; total: number }[];
  byMonth: { month: string; count: number; total: number }[];
  byCountry: { country: string; countryCode: string; count: number; total: number }[];
  byCurrency: { currency: string; count: number; total: number }[];
  invoiceableTotal: number;
  invoiceableCurrency: string;
  recentReceipts: Receipt[];
  reviewCount: number;
}

// Parser types
export interface ParsedReceipt {
  provider: Provider;
  tripDate: string;
  amountTotal: number;
  amountTax: number | null;
  currency: string;
  country: string;
  countryCode: string;
  city: string;
  pickupLocation: string | null;
  dropoffLocation: string | null;
  receiptExternalId: string | null;
  paymentMethodMasked: string | null;
  confidence: number;
  parserVersion: string;
}

export interface EmailMessage {
  messageId: string;
  from: string;
  subject: string;
  date: string;
  htmlBody: string;
  textBody: string;
  attachments: EmailAttachment[];
}

export interface EmailAttachment {
  filename: string;
  mimeType: string;
  data: string; // base64
  size: number;
}
