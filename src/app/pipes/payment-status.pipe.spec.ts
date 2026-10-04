import { PaymentStatusPipe, paymentStatusLabel } from './payment-status.pipe';

describe('paymentStatusLabel (spec 003)', () => {
  it('names statuses the way people see them', () => {
    expect(paymentStatusLabel('confirmed')).toBe('Verified');
    expect(paymentStatusLabel('pending')).toBe('Awaiting Verification');
    expect(paymentStatusLabel('rejected')).toBe('Rejected');
  });

  it('has a mid-sentence form', () => {
    expect(paymentStatusLabel('confirmed', 'lower')).toBe('verified');
    expect(paymentStatusLabel('pending', 'lower')).toBe('awaiting verification');
    expect(paymentStatusLabel('rejected', 'lower')).toBe('rejected');
  });

  it('passes unknown values through unchanged', () => {
    expect(paymentStatusLabel('refunded' as any)).toBe('refunded');
    expect(paymentStatusLabel(undefined as any)).toBe('');
  });
});

describe('PaymentStatusPipe', () => {
  it('formats a status for templates', () => {
    const pipe = new PaymentStatusPipe();
    expect(pipe.transform('pending')).toBe('Awaiting Verification');
    expect(pipe.transform('confirmed', 'lower')).toBe('verified');
  });
});
