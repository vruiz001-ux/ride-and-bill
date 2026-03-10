import { describe, it, expect } from 'vitest';
import { isFreeNowReceipt, parseFreeNowReceipt } from '../freenow';
import type { EmailMessage } from '@/lib/types';

function makeEmail(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    id: 'test-fn-1',
    from: 'noreply@freenow.com',
    subject: 'Your ride receipt',
    date: '2025-10-05T18:00:00Z',
    htmlBody: '',
    textBody: '',
    ...overrides,
  };
}

describe('isFreeNowReceipt', () => {
  it('detects FreeNow receipt from sender and subject', () => {
    expect(isFreeNowReceipt(makeEmail())).toBe(true);
  });

  it('detects from free-now.com and mytaxi.com', () => {
    expect(isFreeNowReceipt(makeEmail({ from: 'receipts@free-now.com' }))).toBe(true);
    expect(isFreeNowReceipt(makeEmail({ from: 'noreply@mytaxi.com' }))).toBe(true);
  });

  it('detects German subject keywords', () => {
    expect(isFreeNowReceipt(makeEmail({ subject: 'Ihre Fahrt' }))).toBe(true);
  });

  it('rejects marketing emails', () => {
    expect(isFreeNowReceipt(makeEmail({ from: 'marketing@freenow.com', subject: 'Special offer!' }))).toBe(false);
  });

  it('rejects non-FreeNow senders', () => {
    expect(isFreeNowReceipt(makeEmail({ from: 'noreply@uber.com' }))).toBe(false);
  });

  it('detects from body keywords', () => {
    expect(isFreeNowReceipt(makeEmail({
      subject: 'FreeNow notification',
      htmlBody: '<p>Your ride total was €15.00</p>',
    }))).toBe(true);
  });
});

describe('parseFreeNowReceipt', () => {
  it('extracts EUR amount', () => {
    const result = parseFreeNowReceipt(makeEmail({
      htmlBody: '<p>Total: €15.50</p>',
    }));
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('freenow');
    expect(result!.amountTotal).toBe(15.50);
    expect(result!.currency).toBe('EUR');
  });

  it('extracts GBP amount', () => {
    const result = parseFreeNowReceipt(makeEmail({
      htmlBody: '<p>Total: £22.00</p>',
    }));
    expect(result).not.toBeNull();
    expect(result!.amountTotal).toBe(22.00);
    expect(result!.currency).toBe('GBP');
  });

  it('extracts German format amount (Gesamtbetrag)', () => {
    const result = parseFreeNowReceipt(makeEmail({
      htmlBody: '<p>Gesamtbetrag: €18,90</p>',
    }));
    expect(result).not.toBeNull();
    expect(result!.amountTotal).toBe(18.90);
  });

  it('extracts PLN amount', () => {
    const result = parseFreeNowReceipt(makeEmail({
      htmlBody: '<p>Suma: 35.00 PLN</p>',
    }));
    expect(result).not.toBeNull();
    expect(result!.amountTotal).toBe(35.00);
    expect(result!.currency).toBe('PLN');
  });

  it('extracts pickup and dropoff locations', () => {
    const result = parseFreeNowReceipt(makeEmail({
      htmlBody: '<div><p>Pickup: Alexanderplatz, Berlin</p><p>Dropoff: Potsdamer Platz, Berlin</p><p>Total: €12.00</p></div>',
    }));
    expect(result).not.toBeNull();
    expect(result!.pickupLocation).toContain('Alexanderplatz');
    expect(result!.dropoffLocation).toContain('Potsdamer Platz');
  });

  it('extracts German pickup/dropoff (Abholung/Ziel)', () => {
    const result = parseFreeNowReceipt(makeEmail({
      htmlBody: '<div><p>Abholung: Hauptbahnhof, München</p><p>Ziel: Marienplatz, München</p><p>Gesamtbetrag: €9,50</p></div>',
    }));
    expect(result).not.toBeNull();
    expect(result!.pickupLocation).toContain('Hauptbahnhof');
    expect(result!.dropoffLocation).toContain('Marienplatz');
  });

  it('extracts VAT/MwSt', () => {
    const result = parseFreeNowReceipt(makeEmail({
      htmlBody: '<p>Total: €15.00</p><p>MwSt (19%): 2.39</p>',
    }));
    expect(result).not.toBeNull();
    expect(result!.amountTax).toBe(2.39);
  });

  it('returns correct parser version', () => {
    const result = parseFreeNowReceipt(makeEmail({ htmlBody: '<p>Total: €10.00</p>' }));
    expect(result!.parserVersion).toBe('1.0.0');
  });
});
