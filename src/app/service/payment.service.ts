import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Payment {
  _id: string;
  collection: string;
  club: string;
  name: string;
  amount: number;
  referenceNumber: string;
  phoneNumber?: string;
  description?: string;
  transactionDate?: string;
  receiptUrl?: string;
  createdBy: any;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'rejected';
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

  updateStatus(paymentId: string, status: 'pending' | 'confirmed' | 'rejected'): Observable<{ payment: Payment }> {
    return this.http.patch<{ payment: Payment }>(`${this.baseUrl}/${paymentId}/status`, { status });
  }

  deletePayment(paymentId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${paymentId}`);
  }

  extractReceipt(file: File): Observable<{ name: string; amount: number; referenceNumber: string; phoneNumber: string; transactionDateTime: string }> {
    const formData = new FormData();
    formData.append('receipt', file);
    return this.http.post<{ name: string; amount: number; referenceNumber: string; phoneNumber: string; transactionDateTime: string }>(`${this.baseUrl}/extract-receipt`, formData);
  }
}
