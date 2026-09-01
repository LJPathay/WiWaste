import { describe, expect, it } from 'vitest';
import { getCheckoutStatusMessage } from './POSTerminal';

describe('getCheckoutStatusMessage', () => {
  it('shows a short-payment warning when cash tendered is below the total', () => {
    const result = getCheckoutStatusMessage({
      paymentMethod: 'Cash',
      grandTotal: 125.5,
      amountTendered: '50',
      terminalAmount: '',
      terminalRef: '',
    });

    expect(result.tone).toBe('warning');
    expect(result.text).toContain('Short payment');
    expect(result.detail).toContain('₱75.50');
  });

  it('shows a success state when a terminal payment matches the order total', () => {
    const result = getCheckoutStatusMessage({
      paymentMethod: 'Card (Terminal)',
      grandTotal: 125.5,
      amountTendered: '',
      terminalAmount: '125.50',
      terminalRef: 'ABC123',
    });

    expect(result.tone).toBe('success');
    expect(result.text).toContain('verified');
    expect(result.detail).toContain('matches the order total');
  });
});
