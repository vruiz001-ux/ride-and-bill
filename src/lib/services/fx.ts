import { FxRate } from '@/lib/types';

// Sample historical rates (base: EUR) — covers all major currencies
const SAMPLE_RATES: Record<string, Record<string, number>> = {
  EUR: {
    USD: 1.08, GBP: 0.86, PLN: 4.32, CHF: 0.96, SEK: 11.2, NOK: 11.6,
    DKK: 7.46, CZK: 25.1, HUF: 395, RON: 4.97, BGN: 1.96, TRY: 35.2,
    ZAR: 20.1, INR: 90.5, AED: 3.97, KES: 175, EGP: 52.1, SGD: 1.45,
    NZD: 1.82, AUD: 1.67, CAD: 1.48, HKD: 8.44, JPY: 162, MXN: 18.5,
    BRL: 5.4, COP: 4250, GHS: 15.6, NGN: 1650, IDR: 16800, MYR: 5.08,
    TWD: 34.5, SAR: 4.05, QAR: 3.93, PKR: 300, BDT: 118, LKR: 340,
    ILS: 3.98, KRW: 1440, PHP: 60.5, VND: 26800, THB: 38.5, UAH: 42,
    MAD: 10.8, JOD: 0.77, OMR: 0.42, IQD: 1420,
    EUR: 1.0,
  },
  USD: {
    EUR: 0.926, GBP: 0.796, PLN: 4.0, CHF: 0.889, NZD: 1.685, AUD: 1.546,
    CAD: 1.37, JPY: 150, SGD: 1.343, HKD: 7.815, ZAR: 18.6, INR: 83.8,
    AED: 3.67, KES: 162, MXN: 17.1, BRL: 5.0, USD: 1.0,
  },
  GBP: {
    EUR: 1.163, USD: 1.257, PLN: 5.02, CHF: 1.116, NZD: 2.116, AUD: 1.941,
    CAD: 1.72, GBP: 1.0,
  },
  PLN: {
    EUR: 0.231, USD: 0.25, GBP: 0.199, NZD: 0.421, AUD: 0.387, CAD: 0.343,
    CHF: 0.222, CZK: 5.81, HUF: 91.4, PLN: 1.0,
  },
  NZD: {
    EUR: 0.549, USD: 0.594, GBP: 0.473, PLN: 2.374, AUD: 0.918, CAD: 0.813,
    CHF: 0.527, NZD: 1.0,
  },
  AUD: {
    EUR: 0.599, USD: 0.647, GBP: 0.515, PLN: 2.587, NZD: 1.09, CAD: 0.886,
    CHF: 0.575, AUD: 1.0,
  },
  CAD: {
    EUR: 0.676, USD: 0.73, GBP: 0.581, PLN: 2.92, NZD: 1.23, AUD: 1.129,
    CHF: 0.649, CAD: 1.0,
  },
};

function getCrossRate(from: string, to: string): number | null {
  if (from === to) return 1.0;
  if (SAMPLE_RATES[from]?.[to]) return SAMPLE_RATES[from][to];
  // Try inverse: if EUR→MAD exists, MAD→EUR = 1/rate
  if (SAMPLE_RATES[to]?.[from]) return 1 / SAMPLE_RATES[to][from];

  // Try via EUR
  const fromToEur = SAMPLE_RATES[from]?.EUR ?? (from === 'EUR' ? 1.0 : null)
    ?? (SAMPLE_RATES.EUR?.[from] ? 1 / SAMPLE_RATES.EUR[from] : null);
  const eurToTarget = SAMPLE_RATES.EUR?.[to] ?? (to === 'EUR' ? 1.0 : null);
  if (fromToEur != null && eurToTarget != null) return fromToEur * eurToTarget;

  // Try via USD
  const fromToUsd = SAMPLE_RATES[from]?.USD ?? (from === 'USD' ? 1.0 : null)
    ?? (SAMPLE_RATES.USD?.[from] ? 1 / SAMPLE_RATES.USD[from] : null);
  const usdToTarget = SAMPLE_RATES.USD?.[to] ?? (to === 'USD' ? 1.0 : null);
  if (fromToUsd != null && usdToTarget != null) return fromToUsd * usdToTarget;

  return null;
}

const rateCache = new Map<string, FxRate>();

export function getHistoricalRate(
  baseCurrency: string,
  targetCurrency: string,
  date: string
): FxRate | null {
  if (baseCurrency === targetCurrency) {
    return { baseCurrency, targetCurrency, rate: 1.0, date, source: 'identity' };
  }

  const key = `${baseCurrency}_${targetCurrency}_${date}`;
  const cached = rateCache.get(key);
  if (cached) return cached;

  const rate = getCrossRate(baseCurrency, targetCurrency);
  if (rate == null) return null;

  const dayHash = date.split('-').reduce((a, b) => a + parseInt(b), 0);
  const variance = 1 + ((dayHash % 100) - 50) * 0.0001;
  const adjustedRate = rate * variance;

  const fxRate: FxRate = {
    baseCurrency,
    targetCurrency,
    rate: Math.round(adjustedRate * 10000) / 10000,
    date,
    source: 'sample_rates_v1',
  };

  rateCache.set(key, fxRate);
  return fxRate;
}

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

  let rate = getHistoricalRate(originalCurrency, targetCurrency, receiptDate);
  let fallbackUsed = false;

  if (!rate) {
    const d = new Date(receiptDate);
    for (let i = 1; i <= 5; i++) {
      d.setDate(d.getDate() - 1);
      rate = getHistoricalRate(originalCurrency, targetCurrency, d.toISOString().split('T')[0]);
      if (rate) { fallbackUsed = true; break; }
    }
  }

  if (!rate) return null;

  const convertedAmount = Math.round(originalAmount * rate.rate * 100) / 100;
  const markupAmount = Math.round(convertedAmount * (markupPercent / 100) * 100) / 100;
  const finalAmount = Math.round((convertedAmount + markupAmount) * 100) / 100;

  return { convertedAmount, fxRate: rate.rate, fxRateDate: rate.date, fxSource: rate.source, markupAmount, finalAmount, fallbackUsed };
}

export const SUPPORTED_CURRENCIES = [
  { code: 'PLN', name: 'Polish Zloty', symbol: 'zł' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč' },
  { code: 'HUF', name: 'Hungarian Forint', symbol: 'Ft' },
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
];
