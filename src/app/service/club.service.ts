import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators'; // Import the map operator

export interface Club {
  id?: string;
  clubName: string;
  description: string;
  location?: string;
  isPrivate: boolean;
  members?: any[]; // You can create a more specific interface for members
  createdBy?: string;
  createdAt?: string;
  logoUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClubService {
  private baseUrl = `${environment.apiUrl}/club`;

  constructor(private http: HttpClient) { }

  createClub(clubData: Club): Observable<any> {
    return this.http.post(`${this.baseUrl}/create`, clubData);
  }

  /**
   * Fetches all clubs from the backend.
   *
   * @returns An Observable array of Club objects.
   */
  getAllClubs(): Observable<Club[]> {
    return this.http.get<{ message: string; clubs: Club[] }>(this.baseUrl)
      .pipe(
        map(response => response.clubs) // Extracts the 'clubs' array from the response
      );
  }

  getClubDetails(id: string): Observable<Club> {
    return this.http.get<Club>(`${this.baseUrl}/${id}`);
  }

  getClubEvents(id: string): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/event/club/${id}`);
  }

  addMember(clubId: string, memberData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/addMember`, { clubId, memberData });
  }

  joinClub(clubId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${clubId}/join`, {});
  }
}
