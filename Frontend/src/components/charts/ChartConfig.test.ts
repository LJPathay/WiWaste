import { describe, expect, it } from 'vitest';
import { formatPesoAxis, formatShortDate } from './ChartConfig';

describe('formatPesoAxis', () => {
  it('prints exact pesos below a thousand instead of rounding them to ₱0k', () => {
    // ₱325 and ₱180 were the real values on the dashboard; the old "value / 1000, toFixed(0)"
    // formatter printed "₱0k" on every gridline for both.
    expect(formatPesoAxis(325)).toBe('₱325');
    expect(formatPesoAxis(180)).toBe('₱180');
    expect(formatPesoAxis(0)).toBe('₱0');
    expect(formatPesoAxis(999)).toBe('₱999');
  });

  it('compacts thousands without losing the magnitude', () => {
    expect(formatPesoAxis(1000)).toBe('₱1k');
    expect(formatPesoAxis(1500)).toBe('₱1.5k');
    expect(formatPesoAxis(25000)).toBe('₱25k');
  });

  it('degrades to ₱0 for non-finite input', () => {
    expect(formatPesoAxis(Number.NaN)).toBe('₱0');
    expect(formatPesoAxis(Number.POSITIVE_INFINITY)).toBe('₱0');
  });
});

describe('formatShortDate', () => {
  it('shortens API dates without shifting the day in a negative-offset timezone', () => {
    expect(formatShortDate('2026-10-14')).toBe('Oct 14');
    expect(formatShortDate('2026-01-01')).toBe('Jan 1');
  });

  it('passes through labels it cannot parse', () => {
    expect(formatShortDate('Week 3')).toBe('Week 3');
  });
});
