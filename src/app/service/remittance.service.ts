import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { RemittanceChangeResponse, RemittanceCreate, RemittanceListResponse } from '../models/remittance.model';

/** Proof uploads skip the service worker, as receipts do (spec 008 FR-015, research R12). */
const UPLOAD_PARAMS = { 'ngsw-bypass': 'true' };

/** Remittances from collections (spec 009). Contract: specs/009-collection-remittances/contracts/README.md */
@Injectable({ providedIn: 'root' })
export class RemittanceService {
  private baseUrl = `${environment.apiUrl}/remittance`;

  constructor(private http: HttpClient) {}

  /** Summary and the records this viewer may see. */
  list(collectionId: string): Observable<RemittanceListResponse> {
    return this.http.get<RemittanceListResponse>(`${this.baseUrl}/collection/${collectionId}`);
  }

  /** Record a remittance (club admins). `proof` should already be prepared by ReceiptImageService. */
  create(remittance: RemittanceCreate, proof?: File | null): Observable<RemittanceChangeResponse> {
    const formData = new FormData();
    for (const [field, value] of Object.entries(remittance)) {
      if (value !== undefined && value !== null && value !== '') formData.append(field, String(value));
    }
    if (proof) formData.append('proof', proof);
    return this.http.post<RemittanceChangeResponse>(`${this.baseUrl}/create`, formData, { params: UPLOAD_PARAMS });
  }

  /** Void an active remittance with a reason (club admins). */
  void(remittanceId: string, reason: string): Observable<RemittanceChangeResponse> {
    return this.http.patch<RemittanceChangeResponse>(`${this.baseUrl}/${remittanceId}/void`, { reason });
  }
}
