import { describe, it, expect } from 'vitest';
import { isUberReceipt, parseUberReceipt } from '../uber';
import type { EmailMessage } from '@/lib/types';

function makeEmail(overrides: Partial<EmailMessage> = {}): EmailMessage {
  return {
    id: 'test-1',
    from: 'noreply@uber.com',
    subject: 'Your trip with Uber',
    date: '2025-12-15T10:30:00Z',
    htmlBody: '',
    textBody: '',
    ...overrides,
  };
}

describe('isUberReceipt', () => {
  it('detects Uber receipt from sender and subject', () => {
    expect(isUberReceipt(makeEmail())).toBe(true);
  });

  it('detects various Uber senders', () => {
    expect(isUberReceipt(makeEmail({ from: 'Uber Receipts <receipts@uber.com>' }))).toBe(true);
    expect(isUberReceipt(makeEmail({ from: 'uber.receipt@uber.com' }))).toBe(true);
  });

  it('rejects non-Uber senders', () => {
    expect(isUberReceipt(makeEmail({ from: 'noreply@bolt.eu' }))).toBe(false);
    expect(isUberReceipt(makeEmail({ from: 'someone@gmail.com' }))).toBe(false);
  });

  it('rejects Uber marketing/account emails', () => {
    expect(isUberReceipt(makeEmail({ subject: 'Uber Eats: your order' }))).toBe(false);
    expect(isUberReceipt(makeEmail({ subject: 'Your account email has been updated' }))).toBe(false);
    expect(isUberReceipt(makeEmail({ subject: 'Welcome to Uber' }))).toBe(false);
    expect(isUberReceipt(makeEmail({ subject: 'Security code for your account' }))).toBe(false);
  });

  it('detects from body when subject is generic', () => {
    expect(isUberReceipt(makeEmail({
      subject: 'Uber notification',
      htmlBody: '<p>Total trip fare: $25.00. Amount charged to your card.</p>',
    }))).toBe(true);
  });
});

describe('parseUberReceipt', () => {
  it('extracts USD amount', () => {
    const result = parseUberReceipt(makeEmail({
      htmlBody: '<div>Trip details<br/><p>123 Main St, San Francisco, CA 94105, US</p><p>456 Market St, San Francisco, CA 94105, US</p></div><p>Total $25.50</p>',
    }));
    expect(result).not.toBeNull();
    expect(result!.provider).toBe('uber');
    expect(result!.amountTotal).toBe(25.50);
    expect(result!.currency).toBe('USD');
  });

  it('extracts NZD amount', () => {
    const result = parseUberReceipt(makeEmail({
      htmlBody: '<div>Trip details<br/><p>10 Queen St, Auckland 1010, NZ</p><p>20 Victoria St, Auckland 1010, NZ</p></div><p>Total NZ$77.80</p>',
    }));
    expect(result).not.toBeNull();
    expect(result!.amountTotal).toBe(77.80);
    expect(result!.currency).toBe('NZD');
  });

  it('extracts PLN amount', () => {
    const result = parseUberReceipt(makeEmail({
      htmlBody: '<div>Total 45.20 PLN</div>',
    }));
    expect(result).not.toBeNull();
    expect(result!.amountTotal).toBe(45.20);
    expect(result!.currency).toBe('PLN');
  });

  it('extracts EUR amount', () => {
    const result = parseUberReceipt(makeEmail({
      htmlBody: '<p>Total €18.90</p>',
    }));
    expect(result).not.toBeNull();
    expect(result!.amountTotal).toBe(18.90);
    expect(result!.currency).toBe('EUR');
  });

  it('extracts tax when present', () => {
    const result = parseUberReceipt(makeEmail({
      htmlBody: '<p>Total $30.00</p><p>Tax $2.50</p>',
    }));
    expect(result).not.toBeNull();
    expect(result!.amountTax).toBe(2.50);
  });

  it('returns correct provider and parser version', () => {
    const result = parseUberReceipt(makeEmail({ htmlBody: '<p>Total $10.00</p>' }));
    expect(result!.provider).toBe('uber');
    expect(result!.parserVersion).toBe('2.0.0');
  });

  it('uses email date as trip date', () => {
    const result = parseUberReceipt(makeEmail({
      date: '2025-06-15T14:00:00Z',
      htmlBody: '<p>Total $10.00</p>',
    }));
    expect(result!.tripDate).toBe('2025-06-15T14:00:00Z');
  });

  it('has higher confidence when amount is found', () => {
    const withAmount = parseUberReceipt(makeEmail({ htmlBody: '<p>Total $25.00</p>' }));
    const withoutAmount = parseUberReceipt(makeEmail({ htmlBody: '<p>No amount here</p>' }));
    expect(withAmount!.confidence).toBeGreaterThan(withoutAmount!.confidence);
  });
});
