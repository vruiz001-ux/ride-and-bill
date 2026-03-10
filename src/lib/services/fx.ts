import { FxRate } from '@/lib/types';

// FX Rate Service — abstraction for historical exchange rate lookups
// MVP uses bundled sample rates; production would use ECB, Open Exchange Rates, etc.

// Sample historical rates (base: EUR)
const SAMPLE_RATES: Record<string, Record<string, number>> = {
  EUR: { USD: 1.08, GBP: 0.86, PLN: 4.32, CHF: 0.96, SEK: 11.2, NOK: 11.6, DKK: 7.46, CZK: 25.1, HUF: 395, RON: 4.97, BGN: 1.96, TRY: 35.2, ZAR: 20.1, INR: 90.5, AED: 3.97, KES: 175, EGP: 52.1, SGD: 1.45, EUR: 1.0 },
  USD: { EUR: 0.926, GBP: 0.796, PLN: 4.0, CHF: 0.889, SEK: 10.37, NOK: 10.74, DKK: 6.91, CZK: 23.24, HUF: 365.7, RON: 4.6, ZAR: 18.6, INR: 83.8, AED: 3.67, KES: 162, USD: 1.0 },
  GBP: { EUR: 1.163, USD: 1.257, PLN: 5.02, CHF: 1.116, GBP: 1.0 },
  PLN: { EUR: 0.231, USD: 0.25, GBP: 0.199, PLN: 1.0 },
};

// Cross-rate calculation via EUR as intermediary
function getCrossRate(from: string, to: string): number | null {
  if (from === to) return 1.0;

  // Direct rate available?
  if (SAMPLE_RATES[from]?.[to]) return SAMPLE_RATES[from][to];

  // Try via EUR
  const fromToEur = SAMPLE_RATES[from]?.EUR ?? (from === 'EUR' ? 1.0 : null);
  const eurToTarget = SAMPLE_RATES.EUR?.[to];

  if (fromToEur != null && eurToTarget != null) {
    return fromToEur * eurToTarget;
  }

  // Try via USD
  const fromToUsd = SAMPLE_RATES[from]?.USD ?? (from === 'USD' ? 1.0 : null);
  const usdToTarget = SAMPLE_RATES.USD?.[to];

  if (fromToUsd != null && usdToTarget != null) {
    return fromToUsd * usdToTarget;
  }

  return null;
}

// In-memory FX rate cache
const rateCache = new Map<string, FxRate>();

function cacheKey(base: string, target: string, date: string): string {
  return `${base}_${target}_${date}`;
}

export function getHistoricalRate(
  baseCurrency: string,
  targetCurrency: string,
  date: string
): FxRate | null {
  if (baseCurrency === targetCurrency) {
    return {
      baseCurrency,
      targetCurrency,
      rate: 1.0,
      date,
      source: 'identity',
    };
  }

  const key = cacheKey(baseCurrency, targetCurrency, date);
  const cached = rateCache.get(key);
  if (cached) return cached;

  const rate = getCrossRate(baseCurrency, targetCurrency);
  if (rate == null) return null;

  // Add slight daily variance for realism (±0.5%)
  const dayHash = date.split('-').reduce((a, b) => a + parseInt(b), 0);
  const variance = 1 + ((dayHash % 100) - 50) * 0.0001;
  const adjustedRate = rate * variance;

  const fxRate: FxRate = {
    baseCurrency,
    targetCurrency,
    rate: Math.round(adjustedRate * 10000) / 10000,
    date,
    source: 'sample_rates_v1', // TODO: Replace with real provider (ECB, OpenExchangeRates)
  };

  rateCache.set(key, fxRate);
  return fxRate;
}

// Convert amount with optional markup
export function convertAmount(
  originalAmount: number,
  originalCurrency: string,
  targetCurrency: string,
  receiptDate: string,
  markupPercent: number = 5
): {
  convertedAmount: number;
  fxRate: number;
  fxRateDate: string;
  fxSource: string;
  markupAmount: number;
  finalAmount: number;
  fallbackUsed: boolean;
} | null {
  if (originalCurrency === targetCurrency) {
    const markupAmount = originalAmount * (markupPercent / 100);
    return {
      convertedAmount: originalAmount,
      fxRate: 1.0,
      fxRateDate: receiptDate,
      fxSource: 'identity',
      markupAmount,
      finalAmount: originalAmount + markupAmount,
      fallbackUsed: false,
    };
  }

  // Try exact date first
  let rate = getHistoricalRate(originalCurrency, targetCurrency, receiptDate);
  let fallbackUsed = false;

  // Fallback: try previous business days
  if (!rate) {
    const d = new Date(receiptDate);
    for (let i = 1; i <= 5; i++) {
      d.setDate(d.getDate() - 1);
      const fallbackDate = d.toISOString().split('T')[0];
      rate = getHistoricalRate(originalCurrency, targetCurrency, fallbackDate);
      if (rate) {
        fallbackUsed = true;
        break;
      }
    }
  }

  if (!rate) return null;

  const convertedAmount = Math.round(originalAmount * rate.rate * 100) / 100;
  const markupAmount = Math.round(convertedAmount * (markupPercent / 100) * 100) / 100;
  const finalAmount = Math.round((convertedAmount + markupAmount) * 100) / 100;

  return {
    convertedAmount,
    fxRate: rate.rate,
    fxRateDate: rate.date,
    fxSource: rate.source,
    markupAmount,
    finalAmount,
    fallbackUsed,
  };
}

export const SUPPORTED_CURRENCIES = [
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
];
