import { ParsedReceipt, EmailMessage } from '@/lib/types';

const CURRENCY_MAP: Record<string, string> = {
  '€': 'EUR', '$': 'USD', '£': 'GBP', 'zł': 'PLN', 'Zł': 'PLN',
  'PLN': 'PLN', 'EUR': 'EUR', 'USD': 'USD', 'GBP': 'GBP',
  'CHF': 'CHF', 'SEK': 'SEK', 'NOK': 'NOK', 'DKK': 'DKK',
  'CZK': 'CZK', 'HUF': 'HUF', 'RON': 'RON',
  'Kč': 'CZK', 'Ft': 'HUF', 'kr': 'SEK',
};

const CURRENCY_COUNTRY_MAP: Record<string, { country: string; code: string }> = {
  'EUR': { country: 'EU', code: 'EU' },
  'GBP': { country: 'United Kingdom', code: 'GB' },
  'PLN': { country: 'Poland', code: 'PL' },
  'CHF': { country: 'Switzerland', code: 'CH' },
  'SEK': { country: 'Sweden', code: 'SE' },
  'RON': { country: 'Romania', code: 'RO' },
  'HUF': { country: 'Hungary', code: 'HU' },
  'CZK': { country: 'Czech Republic', code: 'CZ' },
};

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]*>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/&\w+;/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

export function isFreeNowReceipt(message: EmailMessage): boolean {
  const fromLower = message.from.toLowerCase();
  if (!fromLower.includes('freenow.com') && !fromLower.includes('free-now.com') && !fromLower.includes('mytaxi.com')) {
    return false;
  }

  // Filter marketing
  if (fromLower.includes('marketing') || fromLower.includes('promo')) return false;

  // Check subject for ride/receipt/trip keywords (multiple languages)
  if (/receipt|ride|trip|fahrt|podr|trajet|viaje|corsa/i.test(message.subject)) return true;

  const body = (message.htmlBody || message.textBody || '').toLowerCase();
  if (body.includes('ride total') || body.includes('trip total') || body.includes('fahrtkosten') || body.includes('gesamtbetrag')) {
    return true;
  }

  return false;
}

export function parseFreeNowReceipt(message: EmailMessage): ParsedReceipt | null {
  const rawHtml = message.htmlBody || message.textBody || '';
  const text = stripHtml(rawHtml);
  const oneLine = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  let confidence = 0.5;

  // Extract total amount
  const currencyPattern = '€|\\$|£|PLN|EUR|USD|GBP|CHF|SEK|CZK|HUF|RON|[Zz]ł|Kč|Ft|kr';

  let amountTotal = 0;
  let currencySymbol = '';

  const amountPatterns = [
    // "Total: €12.50" or "Gesamtbetrag: €12,50"
    new RegExp(`(?:Total|Gesamtbetrag|Suma|Totale|Importe)\\s*:?\\s*(${currencyPattern})\\s*([\\d][\\d,]*[.,]?\\d*)`, 'i'),
    // "Total: 12.50 EUR"
    new RegExp(`(?:Total|Gesamtbetrag|Suma|Totale|Importe)\\s*:?\\s*([\\d][\\d,]*[.,]?\\d*)\\s*(${currencyPattern})`, 'i'),
    // "Ride total €12.50"
    new RegExp(`(?:Ride|Trip|Fahrt)\\s*(?:total|kosten)?\\s*:?\\s*(${currencyPattern})\\s*([\\d][\\d,]*[.,]?\\d*)`, 'i'),
    new RegExp(`(?:Ride|Trip|Fahrt)\\s*(?:total|kosten)?\\s*:?\\s*([\\d][\\d,]*[.,]?\\d*)\\s*(${currencyPattern})`, 'i'),
  ];

  for (const pattern of amountPatterns) {
    const match = oneLine.match(pattern);
    if (match) {
      if (/^\d/.test(match[1])) {
        amountTotal = parseFloat(match[1].replace(/,/g, '.'));
        currencySymbol = match[2];
      } else {
        currencySymbol = match[1];
        amountTotal = parseFloat(match[2].replace(/,/g, '.'));
      }
      confidence += 0.2;
      break;
    }
  }

  let currency = CURRENCY_MAP[currencySymbol] || currencySymbol || 'EUR';

  // Extract VAT
  let amountTax: number | null = null;
  const taxMatch = oneLine.match(/(?:VAT|MwSt|Steuer|TVA|IVA)\s*(?:\(\d+%\))?\s*:?\s*([\d,]+[.,]\d{2})/i);
  if (taxMatch) {
    amountTax = parseFloat(taxMatch[1].replace(/,/g, '.'));
  }

  // Extract locations
  let pickupLocation: string | null = null;
  let dropoffLocation: string | null = null;
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (const line of lines) {
    const pickupMatch = line.match(/(?:Pickup|Pick-up|Start|Abholung|Von)\s*:\s*(.+)/i);
    if (pickupMatch && !pickupLocation) {
      pickupLocation = pickupMatch[1].trim().substring(0, 80);
    }
    const dropoffMatch = line.match(/(?:Dropoff|Drop-off|End|Ziel|Bis|Nach)\s*:\s*(.+)/i);
    if (dropoffMatch && !dropoffLocation) {
      dropoffLocation = dropoffMatch[1].trim().substring(0, 80);
    }
  }

  // Extract city from address
  let city = 'Unknown';
  const addressForCity = pickupLocation || dropoffLocation || '';
  if (addressForCity) {
    const parts = addressForCity.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const candidatePart = parts[parts.length - 1].replace(/\d{2,}/g, '').trim();
      if (candidatePart.length > 2 && candidatePart.length < 40) {
        city = candidatePart;
        confidence += 0.1;
      }
    }
  }

  // Detect country from currency
  let country = 'Unknown';
  let countryCode = 'XX';
  const ccInfo = CURRENCY_COUNTRY_MAP[currency];
  if (ccInfo) {
    country = ccInfo.country;
    countryCode = ccInfo.code;
  }

  if (city === 'Unknown' && country !== 'Unknown') {
    city = country;
  }

  // Receipt ID
  let receiptExternalId: string | null = null;
  const idMatch = oneLine.match(/(?:receipt|invoice|booking|order)\s*(?:#|id|number|nr)\s*[:\s]*([A-Za-z0-9-]+)/i);
  if (idMatch) receiptExternalId = idMatch[1];

  // Payment method
  let paymentMethodMasked: string | null = null;
  const payMatch = oneLine.match(/(?:visa|mastercard|card|apple\s*pay|google\s*pay|paypal)\s*[-•*·]*\s*(?:\d{4})?/i);
  if (payMatch) paymentMethodMasked = payMatch[0].trim().substring(0, 30);

  const tripDate = message.date || new Date().toISOString();

  if (amountTotal > 0) confidence += 0.2;
  confidence = Math.min(confidence, 1.0);

  return {
    provider: 'freenow',
    tripDate,
    amountTotal: amountTotal || 0,
    amountTax,
    currency,
    country,
    countryCode,
    city,
    pickupLocation,
    dropoffLocation,
    receiptExternalId,
    paymentMethodMasked,
    confidence,
    parserVersion: '1.0.0',
  };
}
