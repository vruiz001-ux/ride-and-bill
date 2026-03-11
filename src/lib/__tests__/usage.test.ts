import { describe, it, expect } from 'vitest';
import { getBillingPeriod } from '../services/usage';

describe('getBillingPeriod', () => {
  it('computes correct period when anchor is before current date in month', () => {
    const anchor = new Date('2026-01-15');
    const now = new Date('2026-03-20');
    const { start, end } = getBillingPeriod(anchor, now);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(2); // March
    expect(start.getDate()).toBe(15);

    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(3); // April
    expect(end.getDate()).toBe(15);
  });

  it('computes correct period when anchor day is after current date in month', () => {
    const anchor = new Date('2026-01-25');
    const now = new Date('2026-03-10');
    const { start, end } = getBillingPeriod(anchor, now);

    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(1); // February
    expect(start.getDate()).toBe(25);

    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(2); // March
    expect(end.getDate()).toBe(25);
  });

  it('handles anchor on the 1st', () => {
    const anchor = new Date('2026-01-01');
    const now = new Date('2026-03-15');
    const { start, end } = getBillingPeriod(anchor, now);

    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(2); // March
    expect(end.getDate()).toBe(1);
    expect(end.getMonth()).toBe(3); // April
  });

  it('handles same day as anchor', () => {
    const anchor = new Date('2026-01-15');
    const now = new Date('2026-03-15');
    const { start, end } = getBillingPeriod(anchor, now);

    expect(start.getDate()).toBe(15);
    expect(start.getMonth()).toBe(2); // March
  });

  it('handles year boundary', () => {
    const anchor = new Date('2025-06-10');
    const now = new Date('2026-01-05');
    const { start, end } = getBillingPeriod(anchor, now);

    expect(start.getFullYear()).toBe(2025);
    expect(start.getMonth()).toBe(11); // December
    expect(start.getDate()).toBe(10);

    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(0); // January
    expect(end.getDate()).toBe(10);
  });
});
