import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators'; // Import the map operator

export interface Club {
  _id?: string;
  id?: string; // For compatibility with frontend routing
  clubName: string;
  description: string;
  location?: string;
  isPrivate: boolean;
  members?: any[]; // You can create a more specific interface for members
  createdBy?: string;
  createdAt?: string;
  logoUrl?: string; // For club logo display
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

  uploadClubLogo(clubId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post(`${this.baseUrl}/${clubId}/logo`, formData);
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

  /**
   * Fetches club details by ID.
   *
   * @param clubId - The ID of the club to fetch
   * @returns An Observable with club details
   */
  getClubDetails(clubId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${clubId}`);
  }

  /**
   * Fetches events for a specific club.
   *
   * @param clubId - The ID of the club
   * @returns An Observable with club events
   */
  getClubEvents(clubId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${clubId}/events`);
  }

  /**
   * Join a club.
   *
   * @param clubId - The ID of the club to join
   * @returns An Observable with join response
   */
  joinClub(clubId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${clubId}/join`, {});
  }

  /**
   * Add a member to a club.
   *
   * @param clubId - The ID of the club
   * @param memberData - Member data to add
   * @returns An Observable with add member response
   */
  addMember(clubId: string, memberData: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/${clubId}/members`, memberData);
  }
}
