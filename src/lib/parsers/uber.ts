import { ParsedReceipt, EmailMessage } from '@/lib/types';

const UBER_SENDERS = [
  'noreply@uber.com',
  'uber.receipt@uber.com',
  'receipts@uber.com',
];

const UBER_SUBJECT_PATTERNS = [
  /your.*trip.*with.*uber/i,
  /uber.*receipt/i,
  /trip.*receipt/i,
  /your.*ride.*on/i,
  /uber.*trip/i,
];

// Currency symbols and codes mapping
const CURRENCY_MAP: Record<string, string> = {
  '€': 'EUR', '$': 'USD', '£': 'GBP', 'zł': 'PLN', 'PLN': 'PLN',
  'R': 'ZAR', '₹': 'INR', 'AED': 'AED', 'KES': 'KES', 'CHF': 'CHF',
  'SEK': 'SEK', 'NOK': 'NOK', 'DKK': 'DKK', 'CZK': 'CZK', 'HUF': 'HUF',
  'RON': 'RON', 'BGN': 'BGN', 'HRK': 'HRK', 'TRY': 'TRY',
};

// Country detection from city/currency
const CITY_COUNTRY_MAP: Record<string, { country: string; code: string }> = {
  'paris': { country: 'France', code: 'FR' },
  'lyon': { country: 'France', code: 'FR' },
  'berlin': { country: 'Germany', code: 'DE' },
  'munich': { country: 'Germany', code: 'DE' },
  'warsaw': { country: 'Poland', code: 'PL' },
  'krakow': { country: 'Poland', code: 'PL' },
  'wroclaw': { country: 'Poland', code: 'PL' },
  'london': { country: 'United Kingdom', code: 'GB' },
  'amsterdam': { country: 'Netherlands', code: 'NL' },
  'brussels': { country: 'Belgium', code: 'BE' },
  'lisbon': { country: 'Portugal', code: 'PT' },
  'madrid': { country: 'Spain', code: 'ES' },
  'barcelona': { country: 'Spain', code: 'ES' },
  'rome': { country: 'Italy', code: 'IT' },
  'milan': { country: 'Italy', code: 'IT' },
  'vienna': { country: 'Austria', code: 'AT' },
  'zurich': { country: 'Switzerland', code: 'CH' },
  'dubai': { country: 'UAE', code: 'AE' },
  'nairobi': { country: 'Kenya', code: 'KE' },
  'johannesburg': { country: 'South Africa', code: 'ZA' },
  'cape town': { country: 'South Africa', code: 'ZA' },
  'mumbai': { country: 'India', code: 'IN' },
  'new york': { country: 'United States', code: 'US' },
  'san francisco': { country: 'United States', code: 'US' },
  'los angeles': { country: 'United States', code: 'US' },
  'chicago': { country: 'United States', code: 'US' },
  'singapore': { country: 'Singapore', code: 'SG' },
  'prague': { country: 'Czech Republic', code: 'CZ' },
  'budapest': { country: 'Hungary', code: 'HU' },
  'bucharest': { country: 'Romania', code: 'RO' },
  'stockholm': { country: 'Sweden', code: 'SE' },
  'copenhagen': { country: 'Denmark', code: 'DK' },
  'oslo': { country: 'Norway', code: 'NO' },
  'helsinki': { country: 'Finland', code: 'FI' },
};

export function isUberReceipt(message: EmailMessage): boolean {
  const fromMatch = UBER_SENDERS.some(s =>
    message.from.toLowerCase().includes(s)
  );
  if (fromMatch) return true;

  return UBER_SUBJECT_PATTERNS.some(p => p.test(message.subject));
}

export function parseUberReceipt(message: EmailMessage): ParsedReceipt | null {
  const html = message.htmlBody || message.textBody || '';
  let confidence = 0.5;

  // Extract total amount
  const amountPatterns = [
    /total\s*[:\s]*([€$£₹]|PLN|AED|CHF|SEK|NOK|DKK|CZK|HUF|RON|zł|R)\s*([\d,]+\.?\d*)/i,
    /total\s*[:\s]*([\d,]+\.?\d*)\s*([€$£₹]|PLN|AED|CHF|SEK|NOK|DKK|CZK|HUF|RON|zł)/i,
    /amount\s*charged\s*[:\s]*([€$£₹]|PLN|AED|CHF)\s*([\d,]+\.?\d*)/i,
    /you\s*paid\s*[:\s]*([€$£₹]|PLN|AED|CHF)\s*([\d,]+\.?\d*)/i,
  ];

  let amountTotal = 0;
  let currencySymbol = '';

  for (const pattern of amountPatterns) {
    const match = html.match(pattern);
    if (match) {
      // Determine which group is currency and which is amount
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

  // Resolve currency code
  const currency = CURRENCY_MAP[currencySymbol] || currencySymbol || 'EUR';

  // Extract tax/VAT
  let amountTax: number | null = null;
  const taxMatch = html.match(/(?:tax|vat|tva)\s*[:\s]*([€$£₹]|PLN|zł)?\s*([\d,]+\.?\d*)/i);
  if (taxMatch) {
    amountTax = parseFloat(taxMatch[2].replace(',', '.'));
  }

  // Extract city
  let city = 'Unknown';
  const cityPatterns = [
    /trip\s+(?:in|to)\s+(\w[\w\s]*?)(?:\s+on|\s*<|,)/i,
    /your\s+(?:ride|trip)\s+(?:in|to)\s+(\w[\w\s]*?)(?:\s+on|\s*<|,)/i,
  ];
  for (const p of cityPatterns) {
    const m = html.match(p);
    if (m) {
      city = m[1].trim();
      confidence += 0.1;
      break;
    }
  }

  // Resolve country from city
  const cityLower = city.toLowerCase();
  const countryInfo = CITY_COUNTRY_MAP[cityLower] || { country: 'Unknown', code: 'XX' };

  // Extract date from email
  const tripDate = message.date || new Date().toISOString();

  // Extract pickup/dropoff
  let pickupLocation: string | null = null;
  let dropoffLocation: string | null = null;
  const pickupMatch = html.match(/pick[- ]?up\s*[:\s]*([^<\n]{5,60})/i);
  const dropoffMatch = html.match(/drop[- ]?off\s*[:\s]*([^<\n]{5,60})/i);
  if (pickupMatch) pickupLocation = pickupMatch[1].trim();
  if (dropoffMatch) dropoffLocation = dropoffMatch[1].trim();

  // Extract receipt ID
  let receiptExternalId: string | null = null;
  const idMatch = html.match(/(?:receipt|invoice|trip)\s*(?:#|id|number)\s*[:\s]*([A-Za-z0-9-]+)/i);
  if (idMatch) receiptExternalId = idMatch[1];

  // Extract payment method
  let paymentMethodMasked: string | null = null;
  const payMatch = html.match(/(?:visa|mastercard|amex|card)\s*[•*]+\s*(\d{4})/i);
  if (payMatch) paymentMethodMasked = `•••• ${payMatch[1]}`;

  if (amountTotal > 0) confidence += 0.2;
  confidence = Math.min(confidence, 1.0);

  return {
    provider: 'uber',
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
