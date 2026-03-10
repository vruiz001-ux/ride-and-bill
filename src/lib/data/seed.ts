import { Receipt, BillingEntity, ConnectedEmailAccount, InvoiceBatch, User, DashboardStats } from '@/lib/types';

export const demoUser: User = {
  id: 'usr_1',
  email: 'marie.dubois@company.com',
  name: 'Marie Dubois',
  defaultCurrency: 'EUR',
  defaultMarkupPercent: 5,
  createdAt: '2025-09-01T00:00:00Z',
};

export const demoEmailAccounts: ConnectedEmailAccount[] = [
  {
    id: 'ea_1', userId: 'usr_1', provider: 'gmail',
    email: 'marie.dubois@company.com', status: 'active',
    lastSyncAt: '2026-03-10T08:15:00Z', syncStatus: 'completed',
    totalImported: 47, connectedAt: '2025-09-15T10:00:00Z',
  },
];

export const demoReceipts: Receipt[] = [
  {
    id: 'rct_001', userId: 'usr_1', provider: 'uber', sourceEmailAccountId: 'ea_1',
    sourceMessageId: 'msg_001', receiptExternalId: 'UBER-FR-2026-0301',
    tripDate: '2026-03-01T08:30:00Z', importDate: '2026-03-01T12:00:00Z',
    country: 'France', countryCode: 'FR', city: 'Paris',
    pickupLocation: '14 Rue de Rivoli, Paris', dropoffLocation: 'La Défense, Paris',
    amountTotal: 34.50, amountTax: 5.75, currency: 'EUR',
    paymentMethodMasked: '•••• 4242', businessPurpose: 'Client meeting',
    notes: null, tags: ['business', 'client-a'],
    rawEmailSubject: 'Your trip with Uber', rawEmailSender: 'noreply@uber.com',
    originalFileUrl: null, normalizedPdfUrl: null,
    parserVersion: '1.0.0', parsingConfidence: 0.95, status: 'parsed',
    originalAmount: 34.50, originalCurrency: 'EUR',
    fxRate: 1.0, fxRateDate: '2026-03-01', fxSource: 'identity',
    markupPercent: 5, convertedAmount: 34.50, convertedCurrency: 'EUR',
    invoiceAmount: 36.23, invoiceCurrency: 'EUR', billingEntityId: 'be_1',
    conversionStatus: 'converted', fallbackRateUsed: false,
    isRefunded: false, refundAmount: null, netInvoiceAmount: 36.23,
    createdAt: '2026-03-01T12:00:00Z', updatedAt: '2026-03-01T12:00:00Z',
  },
  {
    id: 'rct_002', userId: 'usr_1', provider: 'bolt', sourceEmailAccountId: 'ea_1',
    sourceMessageId: 'msg_002', receiptExternalId: 'BOLT-PL-2026-0228',
    tripDate: '2026-02-28T17:45:00Z', importDate: '2026-02-28T20:00:00Z',
    country: 'Poland', countryCode: 'PL', city: 'Warsaw',
    pickupLocation: 'Chopin Airport, Warsaw', dropoffLocation: 'Marriott Hotel, Warsaw',
    amountTotal: 89.00, amountTax: 16.70, currency: 'PLN',
    paymentMethodMasked: '•••• 4242', businessPurpose: 'Airport transfer',
    notes: null, tags: ['business', 'travel'],
    rawEmailSubject: 'Your Bolt ride receipt', rawEmailSender: 'noreply@bolt.eu',
    originalFileUrl: null, normalizedPdfUrl: null,
    parserVersion: '1.0.0', parsingConfidence: 0.92, status: 'parsed',
    originalAmount: 89.00, originalCurrency: 'PLN',
    fxRate: 0.2315, fxRateDate: '2026-02-28', fxSource: 'sample_rates_v1',
    markupPercent: 5, convertedAmount: 20.60, convertedCurrency: 'EUR',
    invoiceAmount: 21.63, invoiceCurrency: 'EUR', billingEntityId: 'be_1',
    conversionStatus: 'converted', fallbackRateUsed: false,
    isRefunded: false, refundAmount: null, netInvoiceAmount: 21.63,
    createdAt: '2026-02-28T20:00:00Z', updatedAt: '2026-02-28T20:00:00Z',
  },
  {
    id: 'rct_003', userId: 'usr_1', provider: 'uber', sourceEmailAccountId: 'ea_1',
    sourceMessageId: 'msg_003', receiptExternalId: 'UBER-PL-2026-0227',
    tripDate: '2026-02-27T09:15:00Z', importDate: '2026-02-27T14:00:00Z',
    country: 'Poland', countryCode: 'PL', city: 'Warsaw',
    pickupLocation: 'Marriott Hotel, Warsaw', dropoffLocation: 'Zlote Tarasy, Warsaw',
    amountTotal: 32.00, amountTax: 6.00, currency: 'PLN',
    paymentMethodMasked: '•••• 4242', businessPurpose: null,
    notes: 'Morning commute', tags: ['personal'],
    rawEmailSubject: 'Your Uber receipt', rawEmailSender: 'noreply@uber.com',
    originalFileUrl: null, normalizedPdfUrl: null,
    parserVersion: '1.0.0', parsingConfidence: 0.88, status: 'parsed',
    originalAmount: 32.00, originalCurrency: 'PLN',
    fxRate: 0.2315, fxRateDate: '2026-02-27', fxSource: 'sample_rates_v1',
    markupPercent: 5, convertedAmount: 7.41, convertedCurrency: 'EUR',
    invoiceAmount: null, invoiceCurrency: null, billingEntityId: null,
    conversionStatus: 'converted', fallbackRateUsed: false,
    isRefunded: false, refundAmount: null, netInvoiceAmount: null,
    createdAt: '2026-02-27T14:00:00Z', updatedAt: '2026-02-27T14:00:00Z',
  },
  {
    id: 'rct_004', userId: 'usr_1', provider: 'uber', sourceEmailAccountId: 'ea_1',
    sourceMessageId: 'msg_004', receiptExternalId: 'UBER-FR-2026-0225',
    tripDate: '2026-02-25T19:00:00Z', importDate: '2026-02-25T22:00:00Z',
    country: 'France', countryCode: 'FR', city: 'Paris',
    pickupLocation: 'Gare du Nord, Paris', dropoffLocation: '8 Rue du Faubourg, Paris',
    amountTotal: 18.90, amountTax: 3.15, currency: 'EUR',
    paymentMethodMasked: '•••• 4242', businessPurpose: 'Dinner with client',
    notes: null, tags: ['business', 'client-b'],
    rawEmailSubject: 'Your trip with Uber', rawEmailSender: 'noreply@uber.com',
    originalFileUrl: null, normalizedPdfUrl: null,
    parserVersion: '1.0.0', parsingConfidence: 0.93, status: 'parsed',
    originalAmount: 18.90, originalCurrency: 'EUR',
    fxRate: 1.0, fxRateDate: '2026-02-25', fxSource: 'identity',
    markupPercent: 5, convertedAmount: 18.90, convertedCurrency: 'EUR',
    invoiceAmount: 19.85, invoiceCurrency: 'EUR', billingEntityId: 'be_2',
    conversionStatus: 'converted', fallbackRateUsed: false,
    isRefunded: false, refundAmount: null, netInvoiceAmount: 19.85,
    createdAt: '2026-02-25T22:00:00Z', updatedAt: '2026-02-25T22:00:00Z',
  },
  {
    id: 'rct_005', userId: 'usr_1', provider: 'bolt', sourceEmailAccountId: 'ea_1',
    sourceMessageId: 'msg_005', receiptExternalId: 'BOLT-DE-2026-0220',
    tripDate: '2026-02-20T14:30:00Z', importDate: '2026-02-20T18:00:00Z',
    country: 'Germany', countryCode: 'DE', city: 'Berlin',
    pickupLocation: 'Alexanderplatz, Berlin', dropoffLocation: 'Potsdamer Platz, Berlin',
    amountTotal: 22.40, amountTax: 3.58, currency: 'EUR',
    paymentMethodMasked: '•••• 8901', businessPurpose: 'Team offsite',
    notes: null, tags: ['business'],
    rawEmailSubject: 'Your Bolt ride', rawEmailSender: 'noreply@bolt.eu',
    originalFileUrl: null, normalizedPdfUrl: null,
    parserVersion: '1.0.0', parsingConfidence: 0.91, status: 'parsed',
    originalAmount: 22.40, originalCurrency: 'EUR',
    fxRate: 1.0, fxRateDate: '2026-02-20', fxSource: 'identity',
    markupPercent: 5, convertedAmount: 22.40, convertedCurrency: 'EUR',
    invoiceAmount: 23.52, invoiceCurrency: 'EUR', billingEntityId: null,
    conversionStatus: 'converted', fallbackRateUsed: false,
    isRefunded: false, refundAmount: null, netInvoiceAmount: null,
    createdAt: '2026-02-20T18:00:00Z', updatedAt: '2026-02-20T18:00:00Z',
  },
  {
    id: 'rct_006', userId: 'usr_1', provider: 'uber', sourceEmailAccountId: 'ea_1',
    sourceMessageId: 'msg_006', receiptExternalId: 'UBER-GB-2026-0215',
    tripDate: '2026-02-15T10:00:00Z', importDate: '2026-02-15T14:00:00Z',
    country: 'United Kingdom', countryCode: 'GB', city: 'London',
    pickupLocation: 'Heathrow Airport T5', dropoffLocation: 'The Shard, London',
    amountTotal: 68.50, amountTax: 11.42, currency: 'GBP',
    paymentMethodMasked: '•••• 4242', businessPurpose: 'Conference',
    notes: 'Long ride from Heathrow', tags: ['business', 'conference'],
    rawEmailSubject: 'Your trip with Uber', rawEmailSender: 'noreply@uber.com',
    originalFileUrl: null, normalizedPdfUrl: null,
    parserVersion: '1.0.0', parsingConfidence: 0.96, status: 'parsed',
    originalAmount: 68.50, originalCurrency: 'GBP',
    fxRate: 1.163, fxRateDate: '2026-02-15', fxSource: 'sample_rates_v1',
    markupPercent: 5, convertedAmount: 79.66, convertedCurrency: 'EUR',
    invoiceAmount: 83.64, invoiceCurrency: 'EUR', billingEntityId: 'be_1',
    conversionStatus: 'converted', fallbackRateUsed: false,
    isRefunded: false, refundAmount: null, netInvoiceAmount: 83.64,
    createdAt: '2026-02-15T14:00:00Z', updatedAt: '2026-02-15T14:00:00Z',
  },
  {
    id: 'rct_007', userId: 'usr_1', provider: 'bolt', sourceEmailAccountId: 'ea_1',
    sourceMessageId: 'msg_007', receiptExternalId: 'BOLT-PL-2026-0210',
    tripDate: '2026-02-10T07:30:00Z', importDate: '2026-02-10T10:00:00Z',
    country: 'Poland', countryCode: 'PL', city: 'Krakow',
    pickupLocation: 'Krakow Glowny Station', dropoffLocation: 'Rynek Glowny, Krakow',
    amountTotal: 25.00, amountTax: 4.69, currency: 'PLN',
    paymentMethodMasked: '•••• 4242', businessPurpose: null,
    notes: null, tags: ['personal'],
    rawEmailSubject: 'Your Bolt receipt', rawEmailSender: 'noreply@bolt.eu',
    originalFileUrl: null, normalizedPdfUrl: null,
    parserVersion: '1.0.0', parsingConfidence: 0.87, status: 'parsed',
    originalAmount: 25.00, originalCurrency: 'PLN',
    fxRate: 0.2315, fxRateDate: '2026-02-10', fxSource: 'sample_rates_v1',
    markupPercent: 5, convertedAmount: 5.79, convertedCurrency: 'EUR',
    invoiceAmount: null, invoiceCurrency: null, billingEntityId: null,
    conversionStatus: 'converted', fallbackRateUsed: false,
    isRefunded: false, refundAmount: null, netInvoiceAmount: null,
    createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 'rct_008', userId: 'usr_1', provider: 'uber', sourceEmailAccountId: 'ea_1',
    sourceMessageId: 'msg_008', receiptExternalId: 'UBER-FR-2026-0305',
    tripDate: '2026-03-05T11:00:00Z', importDate: '2026-03-05T14:00:00Z',
    country: 'France', countryCode: 'FR', city: 'Lyon',
    pickupLocation: 'Part-Dieu Station, Lyon', dropoffLocation: 'Vieux Lyon',
    amountTotal: 15.20, amountTax: 2.53, currency: 'EUR',
    paymentMethodMasked: '•••• 4242', businessPurpose: 'Site visit',
    notes: null, tags: ['business'],
    rawEmailSubject: 'Your trip with Uber', rawEmailSender: 'noreply@uber.com',
    originalFileUrl: null, normalizedPdfUrl: null,
    parserVersion: '1.0.0', parsingConfidence: 0.94, status: 'parsed',
    originalAmount: 15.20, originalCurrency: 'EUR',
    fxRate: 1.0, fxRateDate: '2026-03-05', fxSource: 'identity',
    markupPercent: 5, convertedAmount: 15.20, convertedCurrency: 'EUR',
    invoiceAmount: 15.96, invoiceCurrency: 'EUR', billingEntityId: 'be_1',
    conversionStatus: 'converted', fallbackRateUsed: false,
    isRefunded: false, refundAmount: null, netInvoiceAmount: 15.96,
    createdAt: '2026-03-05T14:00:00Z', updatedAt: '2026-03-05T14:00:00Z',
  },
  {
    id: 'rct_009', userId: 'usr_1', provider: 'uber', sourceEmailAccountId: 'ea_1',
    sourceMessageId: 'msg_009', receiptExternalId: null,
    tripDate: '2026-03-08T16:20:00Z', importDate: '2026-03-08T19:00:00Z',
    country: 'Unknown', countryCode: 'XX', city: 'Unknown',
    pickupLocation: null, dropoffLocation: null,
    amountTotal: 0, amountTax: null, currency: 'EUR',
    paymentMethodMasked: null, businessPurpose: null,
    notes: null, tags: [],
    rawEmailSubject: 'Your trip receipt', rawEmailSender: 'noreply@uber.com',
    originalFileUrl: null, normalizedPdfUrl: null,
    parserVersion: '1.0.0', parsingConfidence: 0.35, status: 'review',
    originalAmount: 0, originalCurrency: 'EUR',
    fxRate: null, fxRateDate: null, fxSource: null,
    markupPercent: 5, convertedAmount: null, convertedCurrency: null,
    invoiceAmount: null, invoiceCurrency: null, billingEntityId: null,
    conversionStatus: 'failed', fallbackRateUsed: false,
    isRefunded: false, refundAmount: null, netInvoiceAmount: null,
    createdAt: '2026-03-08T19:00:00Z', updatedAt: '2026-03-08T19:00:00Z',
  },
];

export const demoBillingEntities: BillingEntity[] = [
  {
    id: 'be_1', userId: 'usr_1',
    legalName: 'Meridian Global Operations SAS',
    billingAddress: '45 Avenue des Champs-Élysées, 75008 Paris, France',
    vatOrTaxId: 'FR12345678901', contactEmail: 'finance@meridian-global.com',
    preferredInvoiceCurrency: 'EUR', defaultMarkupPercent: 5,
    notes: 'Primary client — monthly invoicing',
    createdAt: '2025-10-01T00:00:00Z', updatedAt: '2025-10-01T00:00:00Z',
  },
  {
    id: 'be_2', userId: 'usr_1',
    legalName: 'Nordic Ventures AB',
    billingAddress: 'Birger Jarlsgatan 12, 114 34 Stockholm, Sweden',
    vatOrTaxId: 'SE556012345601', contactEmail: 'ap@nordicventures.se',
    preferredInvoiceCurrency: 'EUR', defaultMarkupPercent: 5,
    notes: 'Quarterly invoicing',
    createdAt: '2025-11-15T00:00:00Z', updatedAt: '2025-11-15T00:00:00Z',
  },
];

export const demoInvoiceBatches: InvoiceBatch[] = [
  {
    id: 'inv_001', userId: 'usr_1', billingEntityId: 'be_1',
    billingEntityName: 'Meridian Global Operations SAS',
    invoiceCurrency: 'EUR', markupPercent: 5,
    subtotalOriginal: 148.36, subtotalConverted: 155.78,
    markupAmount: 7.79, totalInvoice: 163.57,
    receiptCount: 4, status: 'finalized', exportFileUrl: null,
    createdAt: '2026-03-09T10:00:00Z',
  },
];

// Dashboard stats computed from seed data
export function getDashboardStats(): DashboardStats {
  const receipts = demoReceipts.filter(r => r.status !== 'failed');
  const totalSpend = receipts.reduce((s, r) => s + (r.convertedAmount || 0), 0);

  const uberReceipts = receipts.filter(r => r.provider === 'uber');
  const boltReceipts = receipts.filter(r => r.provider === 'bolt');

  const byCountry = Object.entries(
    receipts.reduce((acc, r) => {
      const key = r.country;
      if (!acc[key]) acc[key] = { country: r.country, countryCode: r.countryCode, count: 0, total: 0 };
      acc[key].count++;
      acc[key].total += r.convertedAmount || 0;
      return acc;
    }, {} as Record<string, { country: string; countryCode: string; count: number; total: number }>)
  ).map(([, v]) => v).sort((a, b) => b.total - a.total);

  const byCurrency = Object.entries(
    receipts.reduce((acc, r) => {
      if (!acc[r.originalCurrency]) acc[r.originalCurrency] = { currency: r.originalCurrency, count: 0, total: 0 };
      acc[r.originalCurrency].count++;
      acc[r.originalCurrency].total += r.originalAmount;
      return acc;
    }, {} as Record<string, { currency: string; count: number; total: number }>)
  ).map(([, v]) => v);

  const byMonth = Object.entries(
    receipts.reduce((acc, r) => {
      const month = r.tripDate.substring(0, 7);
      if (!acc[month]) acc[month] = { month, count: 0, total: 0 };
      acc[month].count++;
      acc[month].total += r.convertedAmount || 0;
      return acc;
    }, {} as Record<string, { month: string; count: number; total: number }>)
  ).map(([, v]) => v).sort((a, b) => a.month.localeCompare(b.month));

  const invoiceableTotal = receipts
    .filter(r => r.invoiceAmount != null)
    .reduce((s, r) => s + (r.invoiceAmount || 0), 0);

  return {
    totalReceipts: receipts.length,
    totalSpend: Math.round(totalSpend * 100) / 100,
    totalSpendCurrency: 'EUR',
    byProvider: [
      { provider: 'uber', count: uberReceipts.length, total: Math.round(uberReceipts.reduce((s, r) => s + (r.convertedAmount || 0), 0) * 100) / 100 },
      { provider: 'bolt', count: boltReceipts.length, total: Math.round(boltReceipts.reduce((s, r) => s + (r.convertedAmount || 0), 0) * 100) / 100 },
    ],
    byMonth,
    byCountry,
    byCurrency,
    invoiceableTotal: Math.round(invoiceableTotal * 100) / 100,
    invoiceableCurrency: 'EUR',
    recentReceipts: receipts.slice(0, 5),
    reviewCount: demoReceipts.filter(r => r.status === 'review').length,
  };
}
