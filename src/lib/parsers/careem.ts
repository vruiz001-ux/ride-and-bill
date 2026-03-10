import { ParsedReceipt, EmailMessage } from '@/lib/types';

const CURRENCY_MAP: Record<string, string> = {
  'MAD': 'MAD', 'AED': 'AED', 'SAR': 'SAR', 'EGP': 'EGP',
  'PKR': 'PKR', 'JOD': 'JOD', 'BHD': 'BHD', 'KWD': 'KWD',
  'QAR': 'QAR', 'OMR': 'OMR', 'IQD': 'IQD', 'USD': 'USD',
};

const CURRENCY_COUNTRY_MAP: Record<string, { country: string; code: string }> = {
  'MAD': { country: 'Morocco', code: 'MA' },
  'AED': { country: 'UAE', code: 'AE' },
  'SAR': { country: 'Saudi Arabia', code: 'SA' },
  'EGP': { country: 'Egypt', code: 'EG' },
  'PKR': { country: 'Pakistan', code: 'PK' },
  'JOD': { country: 'Jordan', code: 'JO' },
  'BHD': { country: 'Bahrain', code: 'BH' },
  'KWD': { country: 'Kuwait', code: 'KW' },
  'QAR': { country: 'Qatar', code: 'QA' },
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

export function isCareemReceipt(message: EmailMessage): boolean {
  const fromLower = message.from.toLowerCase();
  if (!fromLower.includes('careem.com')) return false;
  if (/receipt\s*for\s*trip/i.test(message.subject)) return true;
  const body = (message.htmlBody || message.textBody || '').toLowerCase();
  return body.includes('amount charged') || body.includes('ride fare');
}

export function parseCareemReceipt(message: EmailMessage): ParsedReceipt | null {
  const rawHtml = message.htmlBody || message.textBody || '';
  const text = stripHtml(rawHtml);
  const oneLine = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  let confidence = 0.6;

  // Extract amount: "MAD 28" or "AED 45.50" or "Amount charged MAD 28"
  let amountTotal = 0;
  let currency = '';

  const currencyCodes = Object.keys(CURRENCY_MAP).join('|');
  const amountMatch = oneLine.match(new RegExp(`Amount\\s*charged\\s*(${currencyCodes})\\s*([\\d,]+\\.?\\d*)`, 'i'))
    || oneLine.match(new RegExp(`ride\\s*fare\\s*was\\s*(${currencyCodes})\\s*([\\d,]+\\.?\\d*)`, 'i'))
    || oneLine.match(new RegExp(`(${currencyCodes})\\s*([\\d,]+\\.?\\d*)`, 'i'));

  if (amountMatch) {
    currency = CURRENCY_MAP[amountMatch[1].toUpperCase()] || amountMatch[1].toUpperCase();
    amountTotal = parseFloat(amountMatch[2].replace(',', ''));
    confidence += 0.2;
  }

  // Extract locations
  let pickupLocation: string | null = null;
  let dropoffLocation: string | null = null;
  let city = 'Unknown';

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  for (let i = 0; i < lines.length; i++) {
    if (/^Pickup$/i.test(lines[i])) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        if (lines[j].length > 15 && !(/^\d{1,2}:\d{2}/.test(lines[j])) && !(/^Drop/i.test(lines[j]))) {
          pickupLocation = lines[j].substring(0, 80);
          break;
        }
      }
    }
    if (/^Dropoff$/i.test(lines[i])) {
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        if (lines[j].length > 15 && !(/^\d{1,2}:\d{2}/.test(lines[j])) && !(/^Pickup/i.test(lines[j]))) {
          dropoffLocation = lines[j].substring(0, 80);
          break;
        }
      }
    }
  }

  // Extract city from address (e.g., "Casablanca" from "Boulevard Abdelmoumen - Maarif - Casablanca")
  const addrText = pickupLocation || dropoffLocation || '';
  if (addrText) {
    const parts = addrText.split(/\s*-\s*/);
    if (parts.length >= 2) {
      // City is usually one of the last parts
      for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i].trim();
        if (part.length > 3 && part.length < 30 && !/^\d/.test(part) && !/avenue|street|blvd|road/i.test(part)) {
          city = part;
          break;
        }
      }
    }
  }

  // Determine country from currency
  let country = 'Unknown';
  let countryCode = 'XX';
  const ccInfo = CURRENCY_COUNTRY_MAP[currency];
  if (ccInfo) {
    country = ccInfo.country;
    countryCode = ccInfo.code;
  }

  // Also try to detect from subject: "MAR" = Morocco
  if (country === 'Unknown') {
    if (/\bMAR\b/.test(message.subject)) { country = 'Morocco'; countryCode = 'MA'; currency = currency || 'MAD'; }
    else if (/\bUAE\b|\bDXB\b/.test(message.subject)) { country = 'UAE'; countryCode = 'AE'; currency = currency || 'AED'; }
  }

  if (city === 'Unknown' && country !== 'Unknown') city = country;

  // Extract reference ID
  let receiptExternalId: string | null = null;
  const refMatch = oneLine.match(/Reference\s*ID\s*#?(\d+)/i) || message.subject.match(/\[(\d+)\]/);
  if (refMatch) receiptExternalId = refMatch[1];

  const tripDate = message.date || new Date().toISOString();
  if (amountTotal > 0) confidence += 0.2;
  confidence = Math.min(confidence, 1.0);

  return {
    provider: 'careem',
    tripDate,
    amountTotal,
    amountTax: null,
    currency: currency || 'AED',
    country,
    countryCode,
    city,
    pickupLocation,
    dropoffLocation,
    receiptExternalId,
    paymentMethodMasked: null,
    confidence,
    parserVersion: '2.0.0',
  };
}
