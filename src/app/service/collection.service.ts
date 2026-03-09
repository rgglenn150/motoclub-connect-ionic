import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Collection {
  _id: string;
  club: string;
  name: string;
  description?: string;
  targetAmount?: number;
  status: 'open' | 'closed';
  paymentCount: number;
  totalCollected: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class CollectionService {
  private baseUrl = `${environment.apiUrl}/collection`;

  constructor(private http: HttpClient) {}

  getCollections(clubId: string): Observable<{ collections: Collection[] }> {
    return this.http.get<{ collections: Collection[] }>(`${this.baseUrl}/club/${clubId}`);
  }

  createCollection(data: { club: string; name: string; description?: string; targetAmount?: number }): Observable<{ collection: Collection }> {
    return this.http.post<{ collection: Collection }>(`${this.baseUrl}/create`, data);
  }

  updateCollection(collectionId: string, data: Partial<Collection>): Observable<{ collection: Collection }> {
    return this.http.put<{ collection: Collection }>(`${this.baseUrl}/${collectionId}`, data);
  }

  deleteCollection(collectionId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${collectionId}`);
  }
}
