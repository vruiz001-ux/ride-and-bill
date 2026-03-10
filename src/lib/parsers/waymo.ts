import { ParsedReceipt, EmailMessage } from '@/lib/types';

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

export function isWaymoReceipt(message: EmailMessage): boolean {
  const fromLower = message.from.toLowerCase();
  if (!fromLower.includes('waymo.com')) return false;
  if (/thanks\s*for\s*riding|receipt/i.test(message.subject)) return true;
  const body = (message.htmlBody || message.textBody || '').toLowerCase();
  return body.includes('trip total') || body.includes('waymo receipt');
}

export function parseWaymoReceipt(message: EmailMessage): ParsedReceipt | null {
  const rawHtml = message.htmlBody || message.textBody || '';
  const text = stripHtml(rawHtml);
  const oneLine = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
  let confidence = 0.6;

  // Extract total: "Trip total $26.72" or "Subtotal $26.72"
  let amountTotal = 0;
  const totalMatch = oneLine.match(/Trip\s*total\s*\$\s*([\d,]+\.?\d*)/i)
    || oneLine.match(/Subtotal\s*\$\s*([\d,]+\.?\d*)/i)
    || oneLine.match(/Amount\s*charged\s*\$\s*([\d,]+\.?\d*)/i);
  if (totalMatch) {
    amountTotal = parseFloat(totalMatch[1].replace(/,/g, ''));
    confidence += 0.2;
  }

  // Waymo operates in USD in the US
  const currency = 'USD';
  const country = 'United States';
  const countryCode = 'US';

  // Extract city from pickup address
  let city = 'Los Angeles'; // Waymo's primary market
  let pickupLocation: string | null = null;
  let dropoffLocation: string | null = null;

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  for (let i = 0; i < lines.length; i++) {
    if (/^Pickup$/i.test(lines[i])) {
      // Look for address lines after "Pickup"
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].length > 10 && !(/^\d{1,2}:\d{2}/.test(lines[j])) && !(/^Drop/i.test(lines[j]))) {
          pickupLocation = lines[j].substring(0, 80);
          break;
        }
      }
    }
    if (/^Drop-?off|^Final\s*stop/i.test(lines[i])) {
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].length > 10 && !(/^\d{1,2}:\d{2}/.test(lines[j])) && !(/^Pickup/i.test(lines[j]))) {
          dropoffLocation = lines[j].substring(0, 80);
          break;
        }
      }
    }
  }

  // Try to detect city from addresses (San Francisco, Los Angeles, Phoenix, Austin)
  const addrText = (pickupLocation || '') + ' ' + (dropoffLocation || '') + ' ' + oneLine;
  if (/san\s*francisco|sf\s*ca/i.test(addrText)) city = 'San Francisco';
  else if (/phoenix|scottsdale|tempe|chandler/i.test(addrText)) city = 'Phoenix';
  else if (/austin|tx\s*78/i.test(addrText)) city = 'Austin';
  else if (/los\s*angeles|hollywood|melrose|beverly|santa\s*monica|dtla/i.test(addrText)) city = 'Los Angeles';

  // Extract payment method
  let paymentMethodMasked: string | null = null;
  const payMatch = oneLine.match(/\*{4}\s*\*{4}\s*\*{4}\s*(\d{4})/);
  if (payMatch) paymentMethodMasked = `Card ****${payMatch[1]}`;

  // Extract distance/duration for notes
  let receiptExternalId: string | null = null;
  const distMatch = oneLine.match(/Distance:\s*([\d.]+\s*miles)/i);
  const durMatch = oneLine.match(/Duration:\s*([\d]+\s*minutes)/i);
  if (distMatch && durMatch) {
    receiptExternalId = `${distMatch[1]}, ${durMatch[1]}`;
  }

  const tripDate = message.date || new Date().toISOString();
  if (amountTotal > 0) confidence += 0.2;
  confidence = Math.min(confidence, 1.0);

  return {
    provider: 'waymo',
    tripDate,
    amountTotal,
    amountTax: null,
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
