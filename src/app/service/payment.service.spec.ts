import { HttpErrorResponse } from '@angular/common/http';
import { RECEIPT_ERROR_MESSAGES } from '../models/payment.model';
import { receiptErrorCode, receiptErrorMessage } from './payment.service';

// Spec 008 FR-005: each receipt failure names its cause (contracts/README.md).
describe('receiptErrorMessage', () => {
  const httpError = (status: number, error: unknown) => new HttpErrorResponse({ status, error });

  it('maps every API code to its message', () => {
    for (const code of ['FILE_TOO_LARGE', 'UNSUPPORTED_FORMAT', 'READER_UNAVAILABLE', 'UNREADABLE'] as const) {
      const err = httpError(400, { code, message: 'server text' });
      expect(receiptErrorCode(err)).toBe(code);
      expect(receiptErrorMessage(err)).toBe(RECEIPT_ERROR_MESSAGES[code]);
    }
  });

  it('treats status 0 as no connection', () => {
    const err = httpError(0, new ProgressEvent('error'));
    expect(receiptErrorCode(err)).toBe('NO_CONNECTION');
    expect(receiptErrorMessage(err)).toBe(RECEIPT_ERROR_MESSAGES.NO_CONNECTION);
  });

  it('uses the server message for an uncoded error', () => {
    const err = httpError(500, { message: 'Failed to read receipt. Please fill in the fields manually.' });
    expect(receiptErrorCode(err)).toBe('UNKNOWN');
    expect(receiptErrorMessage(err)).toBe('Failed to read receipt. Please fill in the fields manually.');
  });

  it('ignores codes that are only inherited object keys', () => {
    expect(receiptErrorCode(httpError(400, { code: 'constructor' }))).toBe('UNKNOWN');
    expect(receiptErrorCode(httpError(400, { code: 'toString' }))).toBe('UNKNOWN');
  });

  it('falls back to the generic message', () => {
    expect(receiptErrorMessage(httpError(500, { error: 'File too large' }))).toBe(RECEIPT_ERROR_MESSAGES.UNKNOWN);
    expect(receiptErrorMessage(new Error('boom'))).toBe(RECEIPT_ERROR_MESSAGES.UNKNOWN);
  });
});
