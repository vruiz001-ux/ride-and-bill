import { ParsedReceipt, EmailMessage } from '@/lib/types';

// Comprehensive currency map
const CURRENCY_MAP: Record<string, string> = {
  '€': 'EUR', '$': 'USD', '£': 'GBP', '¥': 'JPY', '₩': 'KRW',
  '₹': 'INR', '₱': 'PHP', '₫': 'VND', '฿': 'THB', '₴': 'UAH',
  'zł': 'PLN', 'Zł': 'PLN', 'ZŁ': 'PLN', 'PLN': 'PLN', 'Kč': 'CZK', 'Ft': 'HUF', 'lei': 'RON', 'kr': 'SEK',
  'NZ$': 'NZD', 'NZD': 'NZD',
  'A$': 'AUD', 'AU$': 'AUD', 'AUD': 'AUD',
  'CA$': 'CAD', 'C$': 'CAD', 'CAD': 'CAD',
  'S$': 'SGD', 'SGD': 'SGD',
  'HK$': 'HKD', 'HKD': 'HKD',
  'R$': 'BRL', 'BRL': 'BRL',
  'R': 'ZAR', 'ZAR': 'ZAR',
  'USD': 'USD', 'EUR': 'EUR', 'GBP': 'GBP',
  'AED': 'AED', 'KES': 'KES', 'CHF': 'CHF',
  'SEK': 'SEK', 'NOK': 'NOK', 'DKK': 'DKK',
  'CZK': 'CZK', 'HUF': 'HUF', 'RON': 'RON',
  'BGN': 'BGN', 'TRY': 'TRY', 'EGP': 'EGP',
  'NGN': 'NGN', 'GHS': 'GHS',
  'MXN': 'MXN', 'COP': 'COP',
};

// Detect country from sender email (receipts-poland@bolt.eu → Poland)
const SENDER_COUNTRY_MAP: Record<string, { country: string; code: string; currency: string }> = {
  'poland': { country: 'Poland', code: 'PL', currency: 'PLN' },
  'france': { country: 'France', code: 'FR', currency: 'EUR' },
  'germany': { country: 'Germany', code: 'DE', currency: 'EUR' },
  'spain': { country: 'Spain', code: 'ES', currency: 'EUR' },
  'portugal': { country: 'Portugal', code: 'PT', currency: 'EUR' },
  'romania': { country: 'Romania', code: 'RO', currency: 'RON' },
  'hungary': { country: 'Hungary', code: 'HU', currency: 'HUF' },
  'czech': { country: 'Czech Republic', code: 'CZ', currency: 'CZK' },
  'prague': { country: 'Czech Republic', code: 'CZ', currency: 'CZK' },
  'estonia': { country: 'Estonia', code: 'EE', currency: 'EUR' },
  'latvia': { country: 'Latvia', code: 'LV', currency: 'EUR' },
  'lithuania': { country: 'Lithuania', code: 'LT', currency: 'EUR' },
  'sweden': { country: 'Sweden', code: 'SE', currency: 'SEK' },
  'finland': { country: 'Finland', code: 'FI', currency: 'EUR' },
  'uk': { country: 'United Kingdom', code: 'GB', currency: 'GBP' },
  'malta': { country: 'Malta', code: 'MT', currency: 'EUR' },
  'croatia': { country: 'Croatia', code: 'HR', currency: 'EUR' },
  'slovakia': { country: 'Slovakia', code: 'SK', currency: 'EUR' },
  'nigeria': { country: 'Nigeria', code: 'NG', currency: 'NGN' },
  'ghana': { country: 'Ghana', code: 'GH', currency: 'GHS' },
  'kenya': { country: 'Kenya', code: 'KE', currency: 'KES' },
  'southafrica': { country: 'South Africa', code: 'ZA', currency: 'ZAR' },
};

const CURRENCY_COUNTRY_MAP: Record<string, { country: string; code: string }> = {
  'PLN': { country: 'Poland', code: 'PL' },
  'EUR': { country: 'EU', code: 'EU' },
  'GBP': { country: 'United Kingdom', code: 'GB' },
  'RON': { country: 'Romania', code: 'RO' },
  'HUF': { country: 'Hungary', code: 'HU' },
  'CZK': { country: 'Czech Republic', code: 'CZ' },
  'SEK': { country: 'Sweden', code: 'SE' },
  'NOK': { country: 'Norway', code: 'NO' },
  'NGN': { country: 'Nigeria', code: 'NG' },
  'GHS': { country: 'Ghana', code: 'GH' },
  'KES': { country: 'Kenya', code: 'KE' },
  'ZAR': { country: 'South Africa', code: 'ZA' },
  'EGP': { country: 'Egypt', code: 'EG' },
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

export function isBoltReceipt(message: EmailMessage): boolean {
  const fromLower = message.from.toLowerCase();
  if (!fromLower.includes('bolt.eu')) return false;

  // Filter out marketing
  if (fromLower.includes('business-email.bolt.eu')) return false;
  if (fromLower.includes('delivery-marketing.bolt.eu')) return false;
  if (fromLower.includes('marketing.bolt.eu')) return false;
  if (fromLower.includes('rides-promotions.bolt.eu')) return false;

  // Check subject for trip/ride keywords
  if (/your.*bolt.*trip|bolt.*trip|ride.*receipt/i.test(message.subject)) return true;

  // Check body
  const body = (message.htmlBody || message.textBody || '').toLowerCase();
  if (body.includes('ride receipt') || (body.includes('trip') && body.includes('total'))) return true;

  return false;
}

export function parseBoltReceipt(message: EmailMessage): ParsedReceipt | null {
  const rawHtml = message.htmlBody || message.textBody || '';
  const text = stripHtml(rawHtml);
  const oneLine = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  let confidence = 0.5;

  // Detect country from sender
  const senderCountryMatch = message.from.toLowerCase().match(/receipts-(\w+)@/);
  let senderCountryInfo = null;
  if (senderCountryMatch) {
    senderCountryInfo = SENDER_COUNTRY_MAP[senderCountryMatch[1]];
  }

  // Extract total amount
  const currencyPattern = 'NZ\\$|AU\\$|A\\$|CA\\$|HK\\$|S\\$|R\\$|€|\\$|£|¥|₹|PLN|USD|EUR|GBP|AED|CHF|SEK|NOK|DKK|CZK|HUF|RON|BGN|TRY|EGP|NGN|GHS|KES|ZAR|[Zz]ł|ZŁ|Kč|Ft|lei|kr|R(?=[\\d\\s])';

  let amountTotal = 0;
  let currencySymbol = '';

  const amountPatterns = [
    // "Total: 30.28 ZŁ" or "Total 30.28 ZŁ" — currency before amount
    new RegExp(`\\bTotal\\s*:?\\s*(${currencyPattern})\\s*([\\d][\\d,]*[.,]?\\d*)`, 'i'),
    // "Total 30.28 ZŁ" or "Total 115 Kč" — amount before currency (with or without decimals)
    new RegExp(`\\bTotal\\s*:?\\s*([\\d][\\d,]*[.,]?\\d*)\\s*(${currencyPattern})`, 'i'),
    // "Total charged ..."
    new RegExp(`Total\\s*charged\\s*:?\\s*(${currencyPattern})\\s*([\\d][\\d,]*[.,]?\\d*)`, 'i'),
    new RegExp(`Total\\s*charged\\s*:?\\s*([\\d][\\d,]*[.,]?\\d*)\\s*(${currencyPattern})`, 'i'),
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

  let currency = CURRENCY_MAP[currencySymbol] || currencySymbol || '';
  if (!currency && senderCountryInfo) currency = senderCountryInfo.currency;
  currency = currency || 'EUR';

  // Extract VAT
  let amountTax: number | null = null;
  const taxMatch = oneLine.match(/VAT\s*\(\d+%\)\s*([\d,]+[.,]\d{2})/i);
  if (taxMatch) {
    amountTax = parseFloat(taxMatch[1].replace(/,/g, '.'));
  }

  // Extract city from pickup/dropoff address
  let city = 'Unknown';
  let pickupLocation: string | null = null;
  let dropoffLocation: string | null = null;

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Bolt format: "Pickup: ADDRESS" and "Dropoff: ADDRESS"
  for (const line of lines) {
    const pickupMatch = line.match(/(?:Pickup|Pick-up|Start)\s*:\s*(.+)/i);
    if (pickupMatch && !pickupLocation) {
      pickupLocation = pickupMatch[1].trim().substring(0, 80);
    }
    const dropoffMatch = line.match(/(?:Dropoff|Drop-off|End)\s*:\s*(.+)/i);
    if (dropoffMatch && !dropoffLocation) {
      dropoffLocation = dropoffMatch[1].trim().substring(0, 80);
    }
  }

  // Extract city from pickup address (format: "Street, City POSTCODE")
  const addressForCity = pickupLocation || dropoffLocation || '';
  if (addressForCity) {
    const parts = addressForCity.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      // City is usually the last or second-to-last part (with postal code stripped)
      const candidatePart = parts[parts.length - 1].replace(/\d{2,}/g, '').trim();
      if (candidatePart.length > 2 && candidatePart.length < 40) {
        city = candidatePart;
        confidence += 0.1;
      }
    }
  }

  // Resolve country: sender first, then currency
  let country = 'Unknown';
  let countryCode = 'XX';
  if (senderCountryInfo) {
    country = senderCountryInfo.country;
    countryCode = senderCountryInfo.code;
  } else {
    const ccInfo = CURRENCY_COUNTRY_MAP[currency];
    if (ccInfo) {
      country = ccInfo.country;
      countryCode = ccInfo.code;
    }
  }

  // Bolt emails rarely include addresses — if city is still Unknown, use country as fallback
  if (city === 'Unknown' && country !== 'Unknown') {
    city = country;
  }

  // Extract receipt ID
  let receiptExternalId: string | null = null;
  const idMatch = oneLine.match(/(?:receipt|invoice|order)\s*(?:#|id|number|nr)\s*[:\s]*([A-Za-z0-9-]+)/i);
  if (idMatch) receiptExternalId = idMatch[1];

  // Extract payment method
  let paymentMethodMasked: string | null = null;
  const payMatch = oneLine.match(/(?:visa|mastercard|card|apple\s*pay|google\s*pay|paypal)\s*[-•*·]*\s*(?:\d{4})?/i);
  if (payMatch) paymentMethodMasked = payMatch[0].trim().substring(0, 30);

  const tripDate = message.date || new Date().toISOString();

  if (amountTotal > 0) confidence += 0.2;
  confidence = Math.min(confidence, 1.0);

  return {
    provider: 'bolt',
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
    parserVersion: '2.0.0',
  };
}
