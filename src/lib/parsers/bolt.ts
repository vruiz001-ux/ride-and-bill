import { ParsedReceipt, EmailMessage } from '@/lib/types';

const BOLT_SENDERS = [
  'noreply@bolt.eu',
  'receipts@bolt.eu',
  'no-reply@bolt.eu',
  'info@bolt.eu',
];

const BOLT_SUBJECT_PATTERNS = [
  /bolt.*receipt/i,
  /your.*bolt.*ride/i,
  /ride.*receipt.*bolt/i,
  /bolt.*trip/i,
  /payment.*receipt.*bolt/i,
];

const CURRENCY_MAP: Record<string, string> = {
  '€': 'EUR', '$': 'USD', '£': 'GBP', 'zł': 'PLN', 'PLN': 'PLN',
  'R': 'ZAR', '₹': 'INR', 'AED': 'AED', 'KES': 'KES', 'CHF': 'CHF',
  'SEK': 'SEK', 'NOK': 'NOK', 'DKK': 'DKK', 'CZK': 'CZK', 'HUF': 'HUF',
  'RON': 'RON', 'BGN': 'BGN', 'TRY': 'TRY', 'EGP': 'EGP',
};

const CITY_COUNTRY_MAP: Record<string, { country: string; code: string }> = {
  'paris': { country: 'France', code: 'FR' },
  'lyon': { country: 'France', code: 'FR' },
  'warsaw': { country: 'Poland', code: 'PL' },
  'krakow': { country: 'Poland', code: 'PL' },
  'wroclaw': { country: 'Poland', code: 'PL' },
  'gdansk': { country: 'Poland', code: 'PL' },
  'poznan': { country: 'Poland', code: 'PL' },
  'london': { country: 'United Kingdom', code: 'GB' },
  'tallinn': { country: 'Estonia', code: 'EE' },
  'riga': { country: 'Latvia', code: 'LV' },
  'vilnius': { country: 'Lithuania', code: 'LT' },
  'bucharest': { country: 'Romania', code: 'RO' },
  'budapest': { country: 'Hungary', code: 'HU' },
  'prague': { country: 'Czech Republic', code: 'CZ' },
  'lisbon': { country: 'Portugal', code: 'PT' },
  'madrid': { country: 'Spain', code: 'ES' },
  'helsinki': { country: 'Finland', code: 'FI' },
  'stockholm': { country: 'Sweden', code: 'SE' },
  'nairobi': { country: 'Kenya', code: 'KE' },
  'lagos': { country: 'Nigeria', code: 'NG' },
  'cape town': { country: 'South Africa', code: 'ZA' },
  'johannesburg': { country: 'South Africa', code: 'ZA' },
  'cairo': { country: 'Egypt', code: 'EG' },
};

export function isBoltReceipt(message: EmailMessage): boolean {
  const fromMatch = BOLT_SENDERS.some(s =>
    message.from.toLowerCase().includes(s)
  );
  if (fromMatch) return true;
  return BOLT_SUBJECT_PATTERNS.some(p => p.test(message.subject));
}

export function parseBoltReceipt(message: EmailMessage): ParsedReceipt | null {
  const html = message.htmlBody || message.textBody || '';
  let confidence = 0.5;

  // Bolt-specific amount patterns
  const amountPatterns = [
    /total\s*[:\s]*([€$£₹]|PLN|zł|RON|HUF|CZK|SEK|NOK|DKK|BGN|EGP|R)\s*([\d,]+\.?\d*)/i,
    /total\s*[:\s]*([\d,]+\.?\d*)\s*([€$£₹]|PLN|zł|RON|HUF|CZK|SEK|NOK|DKK|BGN|EGP)/i,
    /paid\s*[:\s]*([€$£₹]|PLN|zł)\s*([\d,]+\.?\d*)/i,
    /amount\s*[:\s]*([€$£₹]|PLN|zł)\s*([\d,]+\.?\d*)/i,
  ];

  let amountTotal = 0;
  let currencySymbol = '';

  for (const pattern of amountPatterns) {
    const match = html.match(pattern);
    if (match) {
      if (/^\d/.test(match[1])) {
        amountTotal = parseFloat(match[1].replace(',', '.'));
        currencySymbol = match[2];
      } else {
        currencySymbol = match[1];
        amountTotal = parseFloat(match[2].replace(',', '.'));
      }
      confidence += 0.2;
      break;
    }
  }

  const currency = CURRENCY_MAP[currencySymbol] || currencySymbol || 'EUR';

  let amountTax: number | null = null;
  const taxMatch = html.match(/(?:tax|vat|km)\s*[:\s]*([€$£₹]|PLN|zł)?\s*([\d,]+\.?\d*)/i);
  if (taxMatch) {
    amountTax = parseFloat(taxMatch[2].replace(',', '.'));
  }

  // City extraction for Bolt
  let city = 'Unknown';
  const cityPatterns = [
    /ride\s+in\s+(\w[\w\s]*?)(?:\s+on|\s*<|,|\.|$)/i,
    /trip\s+in\s+(\w[\w\s]*?)(?:\s+on|\s*<|,|\.|$)/i,
  ];
  for (const p of cityPatterns) {
    const m = html.match(p);
    if (m) {
      city = m[1].trim();
      confidence += 0.1;
      break;
    }
  }

  const cityLower = city.toLowerCase();
  const countryInfo = CITY_COUNTRY_MAP[cityLower] || { country: 'Unknown', code: 'XX' };

  const tripDate = message.date || new Date().toISOString();

  let pickupLocation: string | null = null;
  let dropoffLocation: string | null = null;
  const pickupMatch = html.match(/(?:from|pickup|pick-up)\s*[:\s]*([^<\n]{5,80})/i);
  const dropoffMatch = html.match(/(?:to|dropoff|drop-off|destination)\s*[:\s]*([^<\n]{5,80})/i);
  if (pickupMatch) pickupLocation = pickupMatch[1].trim().substring(0, 60);
  if (dropoffMatch) dropoffLocation = dropoffMatch[1].trim().substring(0, 60);

  let receiptExternalId: string | null = null;
  const idMatch = html.match(/(?:receipt|invoice|order)\s*(?:#|id|number|nr)\s*[:\s]*([A-Za-z0-9-]+)/i);
  if (idMatch) receiptExternalId = idMatch[1];

  let paymentMethodMasked: string | null = null;
  const payMatch = html.match(/(?:visa|mastercard|card)\s*[•*]+\s*(\d{4})/i);
  if (payMatch) paymentMethodMasked = `•••• ${payMatch[1]}`;

  if (amountTotal > 0) confidence += 0.2;
  confidence = Math.min(confidence, 1.0);

  return {
    provider: 'bolt',
    tripDate,
    amountTotal: amountTotal || 0,
    amountTax,
    currency,
    country: countryInfo.country,
    countryCode: countryInfo.code,
    city,
    pickupLocation,
    dropoffLocation,
    receiptExternalId,
    paymentMethodMasked,
    confidence,
    parserVersion: '1.0.0',
  };
}
