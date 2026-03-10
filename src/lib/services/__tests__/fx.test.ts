import { describe, it, expect } from 'vitest';
import { getHistoricalRate, convertAmount } from '../fx';

describe('getHistoricalRate', () => {
  it('returns 1.0 for same currency', () => {
    const rate = getHistoricalRate('PLN', 'PLN', '2025-06-15');
    expect(rate).not.toBeNull();
    expect(rate!.rate).toBe(1.0);
    expect(rate!.source).toBe('identity');
  });

  it('returns direct rate for EUR→PLN', () => {
    const rate = getHistoricalRate('EUR', 'PLN', '2025-06-15');
    expect(rate).not.toBeNull();
    expect(rate!.rate).toBeGreaterThan(4);
    expect(rate!.rate).toBeLessThan(5);
    expect(rate!.baseCurrency).toBe('EUR');
    expect(rate!.targetCurrency).toBe('PLN');
  });

  it('returns direct rate for USD→PLN', () => {
    const rate = getHistoricalRate('USD', 'PLN', '2025-06-15');
    expect(rate).not.toBeNull();
    expect(rate!.rate).toBeGreaterThan(3);
    expect(rate!.rate).toBeLessThan(5);
  });

  it('returns direct rate for GBP→PLN', () => {
    const rate = getHistoricalRate('GBP', 'PLN', '2025-06-15');
    expect(rate).not.toBeNull();
    expect(rate!.rate).toBeGreaterThan(4);
    expect(rate!.rate).toBeLessThan(6);
  });

  it('computes cross-rate via EUR for NZD→PLN', () => {
    const rate = getHistoricalRate('NZD', 'PLN', '2025-06-15');
    expect(rate).not.toBeNull();
    expect(rate!.rate).toBeGreaterThan(1.5);
    expect(rate!.rate).toBeLessThan(3.5);
  });

  it('computes inverse rate for PLN→EUR', () => {
    const rate = getHistoricalRate('PLN', 'EUR', '2025-06-15');
    expect(rate).not.toBeNull();
    expect(rate!.rate).toBeGreaterThan(0.15);
    expect(rate!.rate).toBeLessThan(0.35);
  });

  it('returns rate with slight daily variance', () => {
    const rate1 = getHistoricalRate('EUR', 'USD', '2025-06-15');
    const rate2 = getHistoricalRate('EUR', 'USD', '2025-06-16');
    expect(rate1).not.toBeNull();
    expect(rate2).not.toBeNull();
    // Rates should be close but not identical due to variance
    expect(Math.abs(rate1!.rate - rate2!.rate)).toBeLessThan(0.02);
  });
});

describe('convertAmount', () => {
  it('returns identity for same currency', () => {
    const result = convertAmount(100, 'PLN', 'PLN', '2025-06-15', 5);
    expect(result).not.toBeNull();
    expect(result!.convertedAmount).toBe(100);
    expect(result!.fxRate).toBe(1.0);
    expect(result!.markupAmount).toBe(5);
    expect(result!.finalAmount).toBe(105);
    expect(result!.fallbackUsed).toBe(false);
  });

  it('converts EUR to PLN with markup', () => {
    const result = convertAmount(100, 'EUR', 'PLN', '2025-06-15', 5);
    expect(result).not.toBeNull();
    expect(result!.convertedAmount).toBeGreaterThan(400);
    expect(result!.convertedAmount).toBeLessThan(500);
    expect(result!.finalAmount).toBeGreaterThan(result!.convertedAmount);
    expect(result!.fxSource).toBe('sample_rates_v1');
  });

  it('converts NZD to PLN', () => {
    const result = convertAmount(50, 'NZD', 'PLN', '2025-06-15', 5);
    expect(result).not.toBeNull();
    expect(result!.convertedAmount).toBeGreaterThan(50);
  });

  it('applies 0% markup correctly', () => {
    const result = convertAmount(100, 'PLN', 'PLN', '2025-06-15', 0);
    expect(result).not.toBeNull();
    expect(result!.markupAmount).toBe(0);
    expect(result!.finalAmount).toBe(100);
  });

  it('applies custom markup percentage', () => {
    const result = convertAmount(100, 'PLN', 'PLN', '2025-06-15', 10);
    expect(result).not.toBeNull();
    expect(result!.markupAmount).toBe(10);
    expect(result!.finalAmount).toBe(110);
  });

  it('rounds to 2 decimal places', () => {
    const result = convertAmount(33.33, 'EUR', 'PLN', '2025-06-15', 5);
    expect(result).not.toBeNull();
    const decimals = result!.convertedAmount.toString().split('.')[1];
    expect(!decimals || decimals.length <= 2).toBe(true);
  });
});
