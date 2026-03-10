import { ParsedReceipt, EmailMessage } from '@/lib/types';

const UBER_SENDERS = [
  'noreply@uber.com',
  'uber.receipt@uber.com',
  'receipts@uber.com',
  'noreply_at_uber_com',
];

const UBER_SUBJECT_PATTERNS = [
  /your.*trip.*with.*uber/i,
  /uber.*receipt/i,
  /trip.*receipt/i,
  /your.*ride.*on/i,
  /uber.*trip/i,
  /thanks\s*for\s*(riding|your\s*trip)/i,
  /trip\s*with\s*uber/i,
  /your.*uber/i,
];

// Comprehensive currency map
const CURRENCY_MAP: Record<string, string> = {
  '€': 'EUR', '$': 'USD', '£': 'GBP', '¥': 'JPY', '₩': 'KRW',
  '₹': 'INR', '₱': 'PHP', '₫': 'VND', '฿': 'THB', '₴': 'UAH',
  'zł': 'PLN', 'Zł': 'PLN', 'ZŁ': 'PLN', 'PLN': 'PLN',
  'NZ$': 'NZD', 'NZD': 'NZD',
  'A$': 'AUD', 'AU$': 'AUD', 'AUD': 'AUD',
  'CA$': 'CAD', 'C$': 'CAD', 'CAD': 'CAD',
  'S$': 'SGD', 'SGD': 'SGD',
  'HK$': 'HKD', 'HKD': 'HKD',
  'R$': 'BRL', 'BRL': 'BRL',
  'R': 'ZAR', 'ZAR': 'ZAR',
  'USD': 'USD', 'EUR': 'EUR', 'GBP': 'GBP', 'JPY': 'JPY',
  'AED': 'AED', 'KES': 'KES', 'CHF': 'CHF',
  'SEK': 'SEK', 'NOK': 'NOK', 'DKK': 'DKK',
  'CZK': 'CZK', 'HUF': 'HUF', 'RON': 'RON',
  'BGN': 'BGN', 'HRK': 'HRK', 'TRY': 'TRY',
  'MXN': 'MXN', 'COP': 'COP', 'PEN': 'PEN',
  'CLP': 'CLP', 'ARS': 'ARS',
  'NGN': 'NGN', 'GHS': 'GHS', 'UGX': 'UGX', 'TZS': 'TZS',
  'EGP': 'EGP', 'MAD': 'MAD',
  'IDR': 'IDR', 'MYR': 'MYR', 'TWD': 'TWD',
  'SAR': 'SAR', 'QAR': 'QAR', 'BHD': 'BHD', 'KWD': 'KWD',
  'PKR': 'PKR', 'BDT': 'BDT', 'LKR': 'LKR',
  'ILS': 'ILS', '₪': 'ILS',
};

// Country detection from address suffixes
const COUNTRY_SUFFIXES: Record<string, { country: string; code: string }> = {
  'nz': { country: 'New Zealand', code: 'NZ' },
  'new zealand': { country: 'New Zealand', code: 'NZ' },
  'au': { country: 'Australia', code: 'AU' },
  'australia': { country: 'Australia', code: 'AU' },
  'us': { country: 'United States', code: 'US' },
  'usa': { country: 'United States', code: 'US' },
  'united states': { country: 'United States', code: 'US' },
  'uk': { country: 'United Kingdom', code: 'GB' },
  'united kingdom': { country: 'United Kingdom', code: 'GB' },
  'gb': { country: 'United Kingdom', code: 'GB' },
  'pl': { country: 'Poland', code: 'PL' },
  'poland': { country: 'Poland', code: 'PL' },
  'polska': { country: 'Poland', code: 'PL' },
  'fr': { country: 'France', code: 'FR' },
  'france': { country: 'France', code: 'FR' },
  'de': { country: 'Germany', code: 'DE' },
  'germany': { country: 'Germany', code: 'DE' },
  'deutschland': { country: 'Germany', code: 'DE' },
  'es': { country: 'Spain', code: 'ES' },
  'spain': { country: 'Spain', code: 'ES' },
  'it': { country: 'Italy', code: 'IT' },
  'italy': { country: 'Italy', code: 'IT' },
  'pt': { country: 'Portugal', code: 'PT' },
  'portugal': { country: 'Portugal', code: 'PT' },
  'nl': { country: 'Netherlands', code: 'NL' },
  'netherlands': { country: 'Netherlands', code: 'NL' },
  'be': { country: 'Belgium', code: 'BE' },
  'belgium': { country: 'Belgium', code: 'BE' },
  'at': { country: 'Austria', code: 'AT' },
  'austria': { country: 'Austria', code: 'AT' },
  'ch': { country: 'Switzerland', code: 'CH' },
  'switzerland': { country: 'Switzerland', code: 'CH' },
  'ie': { country: 'Ireland', code: 'IE' },
  'ireland': { country: 'Ireland', code: 'IE' },
  'ca': { country: 'Canada', code: 'CA' },
  'canada': { country: 'Canada', code: 'CA' },
  'sg': { country: 'Singapore', code: 'SG' },
  'singapore': { country: 'Singapore', code: 'SG' },
  'ae': { country: 'UAE', code: 'AE' },
  'za': { country: 'South Africa', code: 'ZA' },
  'south africa': { country: 'South Africa', code: 'ZA' },
  'ke': { country: 'Kenya', code: 'KE' },
  'kenya': { country: 'Kenya', code: 'KE' },
  'in': { country: 'India', code: 'IN' },
  'india': { country: 'India', code: 'IN' },
  'jp': { country: 'Japan', code: 'JP' },
  'japan': { country: 'Japan', code: 'JP' },
  'mx': { country: 'Mexico', code: 'MX' },
  'mexico': { country: 'Mexico', code: 'MX' },
  'br': { country: 'Brazil', code: 'BR' },
  'brazil': { country: 'Brazil', code: 'BR' },
};

// Currency to country fallback
const CURRENCY_COUNTRY_MAP: Record<string, { country: string; code: string }> = {
  'NZD': { country: 'New Zealand', code: 'NZ' },
  'AUD': { country: 'Australia', code: 'AU' },
  'USD': { country: 'United States', code: 'US' },
  'GBP': { country: 'United Kingdom', code: 'GB' },
  'EUR': { country: 'EU', code: 'EU' },
  'PLN': { country: 'Poland', code: 'PL' },
  'CAD': { country: 'Canada', code: 'CA' },
  'SGD': { country: 'Singapore', code: 'SG' },
  'ZAR': { country: 'South Africa', code: 'ZA' },
  'INR': { country: 'India', code: 'IN' },
  'AED': { country: 'UAE', code: 'AE' },
  'MXN': { country: 'Mexico', code: 'MX' },
  'BRL': { country: 'Brazil', code: 'BR' },
  'JPY': { country: 'Japan', code: 'JP' },
  'CHF': { country: 'Switzerland', code: 'CH' },
  'SEK': { country: 'Sweden', code: 'SE' },
  'NOK': { country: 'Norway', code: 'NO' },
  'DKK': { country: 'Denmark', code: 'DK' },
  'CZK': { country: 'Czech Republic', code: 'CZ' },
  'HUF': { country: 'Hungary', code: 'HU' },
  'RON': { country: 'Romania', code: 'RO' },
  'TRY': { country: 'Turkey', code: 'TR' },
  'KES': { country: 'Kenya', code: 'KE' },
  'HKD': { country: 'Hong Kong', code: 'HK' },
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

const UBER_REJECT_PATTERNS = [
  /account.*(?:email|password|updated|verified|created)/i,
  /uber\s*eats/i,
  /promo|coupon|discount|off\s*your\s*first/i,
  /security\s*(?:code|alert|notification)/i,
  /verify\s*your/i,
  /welcome\s*to\s*uber/i,
];

export function isUberReceipt(message: EmailMessage): boolean {
  const fromLower = message.from.toLowerCase();
  const fromMatch = UBER_SENDERS.some(s => fromLower.includes(s));
  if (!fromMatch) return false;

  // Reject non-receipt emails
  if (UBER_REJECT_PATTERNS.some(p => p.test(message.subject))) return false;

  const subjectMatch = UBER_SUBJECT_PATTERNS.some(p => p.test(message.subject));
  if (subjectMatch) return true;

  const body = (message.htmlBody || message.textBody || '').toLowerCase();
  return body.includes('total') && (body.includes('trip fare') || body.includes('you paid') || body.includes('amount charged'));
}

export function parseUberReceipt(message: EmailMessage): ParsedReceipt | null {
  const rawHtml = message.htmlBody || message.textBody || '';
  const text = stripHtml(rawHtml);
  // Also create single-line version for regex
  const oneLine = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  let confidence = 0.5;

  // Extract total amount — multi-currency support
  const currencyPattern = 'NZ\\$|AU\\$|A\\$|CA\\$|C\\$|HK\\$|S\\$|R\\$|US\\$|€|\\$|£|¥|₹|₩|₱|₫|฿|₴|₪|PLN|NZD|AUD|CAD|SGD|HKD|USD|EUR|GBP|AED|CHF|SEK|NOK|DKK|CZK|HUF|RON|BGN|TRY|MXN|COP|BRL|ZAR|KES|INR|JPY|[Zz]ł|ZŁ|R(?=[\\d\\s])';

  let amountTotal = 0;
  let currencySymbol = '';

  // Try multi-line: "Total\nNZ$77.80" and single-line: "Total NZ$77.80"
  const amountPatterns = [
    new RegExp(`\\bTotal\\s*[:\\s]*(${currencyPattern})\\s*([\\d][\\d,]*\\.?\\d*)`, 'i'),
    new RegExp(`\\bTotal\\s*[:\\s]*([\\d][\\d,]*[.,]\\d{2})\\s*(${currencyPattern})`, 'i'),
    new RegExp(`Amount\\s*charged\\s*[:\\s]*(${currencyPattern})\\s*([\\d][\\d,]*\\.?\\d*)`, 'i'),
    new RegExp(`You\\s*paid\\s*[:\\s]*(${currencyPattern})\\s*([\\d][\\d,]*\\.?\\d*)`, 'i'),
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

  const currency = CURRENCY_MAP[currencySymbol] || currencySymbol || 'USD';

  // Extract tax
  let amountTax: number | null = null;
  const taxMatch = oneLine.match(/(?:tax|vat|tva|gst)\s*[:\s]*(?:[\w$€£¥₹]*)\s*([\d,]+[.,]\d{2})/i);
  if (taxMatch) {
    amountTax = parseFloat(taxMatch[1].replace(/,/g, '.'));
  }

  // Extract city and country from address lines
  // Uber format: "Street Address, City POSTCODE, Country"
  let city = 'Unknown';
  let country = 'Unknown';
  let countryCode = 'XX';
  let pickupLocation: string | null = null;
  let dropoffLocation: string | null = null;

  // Look for address lines in trip details section
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const tripDetailsIdx = lines.findIndex(l => /trip\s*details/i.test(l));

  if (tripDetailsIdx >= 0) {
    // Find address lines (contain commas and look like addresses)
    const addressLines: string[] = [];
    for (let i = tripDetailsIdx + 1; i < Math.min(tripDetailsIdx + 30, lines.length); i++) {
      const line = lines[i];
      // Skip non-address lines
      if (/kilometer|miles|minute|hour/i.test(line)) continue;
      if (/^\d{1,2}:\d{2}\s*(AM|PM)?$/i.test(line)) continue;
      if (/^Uber/i.test(line)) continue;
      // Address lines typically have commas and postal codes
      if (line.includes(',') && line.length > 15 && /\d/.test(line)) {
        addressLines.push(line);
      }
    }

    if (addressLines.length >= 1) {
      pickupLocation = addressLines[0].substring(0, 80);
    }
    if (addressLines.length >= 2) {
      dropoffLocation = addressLines[1].substring(0, 80);
    }

    // Extract city and country from the first address
    const addr = addressLines[0] || addressLines[1] || '';
    if (addr) {
      const parts = addr.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        // Last part is usually country or country code
        const lastPart = parts[parts.length - 1].toLowerCase().replace(/\d/g, '').trim();
        const countryInfo = COUNTRY_SUFFIXES[lastPart];
        if (countryInfo) {
          country = countryInfo.country;
          countryCode = countryInfo.code;
        }

        // City is usually in the second-to-last part or embedded
        // Format: "Street, Suburb, City POSTCODE, Country" or "Street, POSTCODE City, Country"
        for (let i = parts.length - 2; i >= 0; i--) {
          // Strip postal codes: "02-765 Warszawa" → "Warszawa", "Auckland 0618" → "Auckland"
          const part = parts[i].replace(/\d[\d\-]+/g, '').replace(/\s+/g, ' ').trim();
          if (part.length > 2 && part.length < 40 && !/^\d/.test(part) && !/street|road|ave|blvd|drive|lane|alej|ulica|^al\./i.test(part)) {
            city = part;
            break;
          }
        }
      }
    }
  }

  // Fallback: scan all lines for address-like patterns (for emails without "Trip details")
  if (city === 'Unknown') {
    for (const line of lines) {
      if (/kilometer|miles|minute|hour/i.test(line)) continue;
      if (line.includes(',') && line.length > 20 && /\d/.test(line)) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length >= 3) {
          const lastPart = parts[parts.length - 1].toLowerCase().replace(/\d/g, '').trim();
          const ci = COUNTRY_SUFFIXES[lastPart];
          if (ci) {
            if (country === 'Unknown') { country = ci.country; countryCode = ci.code; }
            for (let k = parts.length - 2; k >= 0; k--) {
              const part = parts[k].replace(/\d{3,}/g, '').trim();
              if (part.length > 2 && part.length < 40 && !/^\d+/.test(part)) {
                city = part;
                break;
              }
            }
            if (city !== 'Unknown') break;
          }
        }
      }
    }
  }

  // Fallback: company footer (e.g., "Rasier New Zealand Limited" or "Uber B.V., Amsterdam")
  if (country === 'Unknown' || city === 'Unknown') {
    const footerMatch = oneLine.match(/Rasier\s+(\w[\w\s]+?)\s+Limited/i);
    if (footerMatch) {
      const name = footerMatch[1].trim().toLowerCase();
      const ci = COUNTRY_SUFFIXES[name];
      if (ci && country === 'Unknown') { country = ci.country; countryCode = ci.code; }
    }
  }

  // Fallback: detect country from currency
  if (country === 'Unknown' && currency !== 'USD') {
    const ccInfo = CURRENCY_COUNTRY_MAP[currency];
    if (ccInfo) {
      country = ccInfo.country;
      countryCode = ccInfo.code;
    }
  }

  // If city is still Unknown, use country as fallback
  if (city === 'Unknown' && country !== 'Unknown') {
    city = country;
  }

  // Extract service type
  let receiptExternalId: string | null = null;
  const idMatch = oneLine.match(/(?:receipt|invoice|trip)\s*(?:#|id|number)\s*[:\s]*([A-Za-z0-9-]+)/i);
  if (idMatch) receiptExternalId = idMatch[1];

  // Extract payment method
  let paymentMethodMasked: string | null = null;
  const payMatch = oneLine.match(/(?:visa|mastercard|amex|card|paypal)\s*[-•*·]*\s*(?:\d{4}|[\w.]+@[\w.]+)/i);
  if (payMatch) paymentMethodMasked = payMatch[0].substring(0, 30);

  const tripDate = message.date || new Date().toISOString();

  if (amountTotal > 0) confidence += 0.2;
  confidence = Math.min(confidence, 1.0);

  return {
    provider: 'uber',
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
