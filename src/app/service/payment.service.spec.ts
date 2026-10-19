import { HttpErrorResponse } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { RECEIPT_ERROR_MESSAGES } from '../models/payment.model';
import { PaymentService, receiptErrorCode, receiptErrorMessage } from './payment.service';

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

// Spec 008 FR-015: receipt uploads skip the service worker (research R12).
describe('PaymentService receipt uploads', () => {
  let service: PaymentService;
  let httpMock: HttpTestingController;
  const base = `${environment.apiUrl}/payment`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(PaymentService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('sends extract-receipt with ngsw-bypass', () => {
    const file = new File([new Uint8Array(8)], 'receipt.jpg', { type: 'image/jpeg' });
    service.extractReceipt(file).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${base}/extract-receipt`);
    expect(req.request.params.get('ngsw-bypass')).toBe('true');
    expect((req.request.body as FormData).get('receipt')).toBe(file);
    req.flush({});
  });

  it('sends create with ngsw-bypass', () => {
    const formData = new FormData();
    service.createPayment(formData).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${base}/create`);
    expect(req.request.params.get('ngsw-bypass')).toBe('true');
    expect(req.request.body).toBe(formData);
    req.flush({ payment: {} });
  });
});
