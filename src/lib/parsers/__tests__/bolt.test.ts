import { describe, it, expect } from 'vitest';
import { isBoltReceipt, parseBoltReceipt } from '../bolt';
import type { EmailMessage } from '@/lib/types';

function makeEmail(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    id: 'test-bolt-1',
    from: 'receipts-poland@bolt.eu',
    subject: 'Your Bolt trip receipt',
    date: '2025-11-20T08:15:00Z',
    htmlBody: '',
    textBody: '',
    ...overrides,
  };
}

describe('isBoltReceipt', () => {
  it('detects Bolt receipt from sender and subject', () => {
    expect(isBoltReceipt(makeEmail())).toBe(true);
  });

  it('detects various Bolt country senders', () => {
    expect(isBoltReceipt(makeEmail({ from: 'receipts-uk@bolt.eu' }))).toBe(true);
    expect(isBoltReceipt(makeEmail({ from: 'receipts-czech@bolt.eu' }))).toBe(true);
  });

  it('rejects non-Bolt senders', () => {
    expect(isBoltReceipt(makeEmail({ from: 'noreply@uber.com' }))).toBe(false);
  });

  it('rejects Bolt marketing emails', () => {
    expect(isBoltReceipt(makeEmail({ from: 'business-email.bolt.eu' }))).toBe(false);
    expect(isBoltReceipt(makeEmail({ from: 'rides-promotions.bolt.eu' }))).toBe(false);
    expect(isBoltReceipt(makeEmail({ from: 'marketing.bolt.eu' }))).toBe(false);
  });

  it('detects from body content', () => {
    expect(isBoltReceipt(makeEmail({
      from: 'noreply@bolt.eu',
      subject: 'Bolt notification',
      htmlBody: '<p>Your ride receipt</p>',
    }))).toBe(true);
  });
});

describe('parseBoltReceipt', () => {
  it('extracts PLN amount from Polish receipt', () => {
    const result = parseBoltReceipt(makeEmail({
      htmlBody: '<div><p>Pickup: ul. Marszałkowska 1, Warszawa</p><p>Dropoff: ul. Puławska 50, Warszawa</p><p>Total 30.28 Zł</p></div>',
    }));
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('bolt');
    expect(result!.amountTotal).toBe(30.28);
    expect(result!.currency).toBe('PLN');
    expect(result!.country).toBe('Poland');
    expect(result!.countryCode).toBe('PL');
  });

  it('extracts GBP from UK receipt', () => {
    const result = parseBoltReceipt(makeEmail({
      from: 'receipts-uk@bolt.eu',
      htmlBody: '<p>Total £12.50</p>',
    }));
    expect(result).not.toBeNull();
    expect(result!.amountTotal).toBe(12.50);
    expect(result!.currency).toBe('GBP');
    expect(result!.country).toBe('United Kingdom');
  });

  it('extracts CZK from Czech receipt', () => {
    const result = parseBoltReceipt(makeEmail({
      from: 'receipts-czech@bolt.eu',
      htmlBody: '<p>Total 115 Kč</p>',
    }));
    expect(result).not.toBeNull();
    expect(result!.amountTotal).toBe(115);
    expect(result!.currency).toBe('CZK');
  });

  it('extracts pickup and dropoff locations', () => {
    const result = parseBoltReceipt(makeEmail({
      htmlBody: '<div><p>Pickup: Krakowskie Przedmieście 5, Warszawa</p><p>Dropoff: Plac Defilad 1, Warszawa</p><p>Total 25.00 Zł</p></div>',
    }));
    expect(result).not.toBeNull();
    expect(result!.pickupLocation).toContain('Krakowskie');
    expect(result!.dropoffLocation).toContain('Plac Defilad');
  });

  it('extracts VAT', () => {
    const result = parseBoltReceipt(makeEmail({
      htmlBody: '<p>Total 30.00 Zł</p><p>VAT (23%) 5.61</p>',
    }));
    expect(result).not.toBeNull();
    expect(result!.amountTax).toBe(5.61);
  });

  it('returns correct parser version', () => {
    const result = parseBoltReceipt(makeEmail({ htmlBody: '<p>Total 10.00 Zł</p>' }));
    expect(result!.parserVersion).toBe('2.0.0');
  });
});
