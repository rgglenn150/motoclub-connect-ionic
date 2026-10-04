import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Payment } from '../models/payment.model';
import { BulkVerifyResponse, StatementCheckResponse } from '../models/statement-check.model';

export type { Payment };

/** A resolved status; payments only move pending → confirmed | rejected. */
export type PaymentResolution = 'confirmed' | 'rejected';

/** Body of the 409 returned when a payment is already resolved (contracts/payment.md). */
export interface PaymentStatusConflict {
  message: string;
  status: PaymentResolution;
}

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private baseUrl = `${environment.apiUrl}/payment`;

  constructor(private http: HttpClient) {}

  getPayments(collectionId: string): Observable<{ payments: Payment[] }> {
    return this.http.get<{ payments: Payment[] }>(`${this.baseUrl}/collection/${collectionId}`);
  }

  createPayment(formData: FormData): Observable<{ payment: Payment }> {
    return this.http.post<{ payment: Payment }>(`${this.baseUrl}/create`, formData);
  }

  updateStatus(paymentId: string, status: PaymentResolution): Observable<{ payment: Payment }> {
    return this.http.patch<{ payment: Payment }>(`${this.baseUrl}/${paymentId}/status`, { status });
  }

  deletePayment(paymentId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${paymentId}`);
  }

  /**
   * Check the collection's awaiting payments against a GCash statement (spec 004).
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

  extractReceipt(file: File): Observable<{ name: string; amount: number; referenceNumber: string; phoneNumber: string; transactionDateTime: string }> {
    const formData = new FormData();
    formData.append('receipt', file);
    return this.http.post<{ name: string; amount: number; referenceNumber: string; phoneNumber: string; transactionDateTime: string }>(`${this.baseUrl}/extract-receipt`, formData);
  }
}
