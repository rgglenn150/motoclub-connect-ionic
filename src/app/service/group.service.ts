import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators'; // Import the map operator

export interface Group {
  _id?: string;
  clubName: string;
  description: string;
  location?: string;
  isPrivate: boolean;
  members?: any[]; // You can create a more specific interface for members
  createdBy?: string;
  createdAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private baseUrl = `${environment.apiUrl}/club`;

  constructor(private http: HttpClient) { }

  createGroup(groupData: Group): Observable<any> {
    return this.http.post(`${this.baseUrl}/create`, groupData);
  }

  uploadClubLogo(clubId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.post(`${this.baseUrl}/${clubId}/logo`, formData);
  }

  /**
   * Fetches all clubs from the backend.
   *
   * @returns An Observable array of Group objects.
   */
  getAllClubs(): Observable<Group[]> {
    return this.http.get<{ message: string; clubs: Group[] }>(this.baseUrl)
      .pipe(
        map(response => response.clubs) // Extracts the 'clubs' array from the response
      );
  }
}
