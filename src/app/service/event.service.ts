import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private baseUrl = `${environment.apiUrl}/event`;
  private clubBaseUrl = `${environment.apiUrl}/club`;

  constructor(private http: HttpClient) { }

  createEvent(eventData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/create`, eventData);
  }

  getAllClubs(): Observable<any> {
    return this.http.get(`${this.clubBaseUrl}`);
  }

  getEvents(): Observable<any> {
    return this.http.get(`${this.baseUrl}`);
  }
}
