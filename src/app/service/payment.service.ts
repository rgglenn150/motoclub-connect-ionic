import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Payment, RECEIPT_ERROR_MESSAGES, ReceiptError, ReceiptErrorCode, ReceiptExtraction } from '../models/payment.model';
import { BulkVerifyResponse, StatementCheckResponse } from '../models/statement-check.model';

export type { Payment };

/** A resolved status; payments only move pending → confirmed | rejected. */
export type PaymentResolution = 'confirmed' | 'rejected';

/**
 * Receipt uploads skip the service worker: on iOS, its re-sent POST can reach
 * the server with a broken body (spec 008 FR-015, research R12).
 */
const UPLOAD_PARAMS = { 'ngsw-bypass': 'true' };

/** Body of the 409 returned when a payment is already resolved (contracts/payment.md). */
export interface PaymentStatusConflict {
  message: string;
  status: PaymentResolution;
}

/** Why a receipt upload failed: status 0 never reached the API (spec 008, contracts). */
export function receiptErrorCode(err: unknown): ReceiptErrorCode {
  if (!(err instanceof HttpErrorResponse)) return 'UNKNOWN';
  if (err.status === 0) return 'NO_CONNECTION';
  const code = (err.error as Partial<ReceiptError> | null)?.code;
  // Own keys only: `in` would also match inherited names such as "constructor".
  return code && Object.prototype.hasOwnProperty.call(RECEIPT_ERROR_MESSAGES, code) ? code : 'UNKNOWN';
}

/** The message to show for a failed receipt upload (spec 008 FR-005). */
export function receiptErrorMessage(err: unknown): string {
  const code = receiptErrorCode(err);
  if (code !== 'UNKNOWN') return RECEIPT_ERROR_MESSAGES[code];
  return (err as HttpErrorResponse | null)?.error?.message || RECEIPT_ERROR_MESSAGES.UNKNOWN;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private baseUrl = `${environment.apiUrl}/payment`;

  constructor(private http: HttpClient) {}

  getPayments(collectionId: string): Observable<{ payments: Payment[] }> {
    return this.http.get<{ payments: Payment[] }>(`${this.baseUrl}/collection/${collectionId}`);
  }

  createPayment(formData: FormData): Observable<{ payment: Payment }> {
    return this.http.post<{ payment: Payment }>(`${this.baseUrl}/create`, formData, { params: UPLOAD_PARAMS });
  }

  updateStatus(paymentId: string, status: PaymentResolution): Observable<{ payment: Payment }> {
    return this.http.patch<{ payment: Payment }>(`${this.baseUrl}/${paymentId}/status`, { status });
  }

  deletePayment(paymentId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${paymentId}`);
  }

  /**
   * Check the collection's pending payments against a GCash statement (spec 004).
   * The password is sent only when given, and the server never stores either.
   */
  checkStatement(collectionId: string, file: File, password?: string): Observable<StatementCheckResponse> {
    const formData = new FormData();
    formData.append('statement', file);
    if (password) formData.append('password', password);
    return this.http.post<StatementCheckResponse>(`${this.baseUrl}/collection/${collectionId}/statement-check`, formData);
  }

  /** Verify the chosen payments in one request; already-reviewed ones come back as skipped (spec 004). */
  bulkVerify(collectionId: string, paymentIds: string[]): Observable<BulkVerifyResponse> {
    return this.http.post<BulkVerifyResponse>(`${this.baseUrl}/collection/${collectionId}/bulk-verify`, { paymentIds });
  }

  extractReceipt(file: File): Observable<ReceiptExtraction> {
    const formData = new FormData();
    formData.append('receipt', file);
    return this.http.post<ReceiptExtraction>(`${this.baseUrl}/extract-receipt`, formData, { params: UPLOAD_PARAMS });
  }
}
