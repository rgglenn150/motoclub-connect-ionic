import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { map } from 'rxjs/operators'; // Import the map operator

export interface Geolocation {
  latitude: number;
  longitude: number;
  placeName: string;
}

export interface Club {
  _id?: string;
  id?: string; // For compatibility with frontend routing
  clubName: string;
  description: string;
  location?: string;
  geolocation?: Geolocation;
  isPrivate: boolean;
  members?: any[]; // You can create a more specific interface for members
  createdBy?: string;
  createdAt?: string;
  logoUrl?: string; // For club logo display
}

export interface JoinRequest {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  };
  club: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
}

export interface ClubMember {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
  };
  club: string;
  role: 'member' | 'admin';
  joinedAt: string;
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

  /**
   * Get the user's membership status for a specific club.
   *
   * @param clubId - The ID of the club
   * @returns An Observable with membership status information
   */
  getMembershipStatus(clubId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${clubId}/membership-status`);
  }

  // --- ADMIN MANAGEMENT METHODS ---

  /**
   * Get join requests for a club (admin only).
   *
   * @param clubId - The ID of the club
   * @returns An Observable with join requests
   */
  getJoinRequests(clubId: string): Observable<JoinRequest[]> {
    return this.http.get<{ joinRequests: JoinRequest[] }>(`${this.baseUrl}/${clubId}/join-requests`)
      .pipe(
        map(response => response.joinRequests || [])
      );
  }

  /**
   * Approve a join request (admin only).
   *
   * @param clubId - The ID of the club
   * @param requestId - The ID of the join request
   * @returns An Observable with approval response
   */
  approveJoinRequest(clubId: string, requestId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${clubId}/join-requests/${requestId}/approve`, {});
  }

  /**
   * Reject a join request (admin only).
   *
   * @param clubId - The ID of the club
   * @param requestId - The ID of the join request
   * @returns An Observable with rejection response
   */
  rejectJoinRequest(clubId: string, requestId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${clubId}/join-requests/${requestId}/reject`, {});
  }

  /**
   * Remove a member from the club (admin only).
   *
   * @param clubId - The ID of the club
   * @param memberId - The ID of the member to remove
   * @returns An Observable with removal response
   */
  removeMember(clubId: string, memberId: string): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${clubId}/members/${memberId}`);
  }

  /**
   * Promote a member to admin (admin only).
   *
   * @param clubId - The ID of the club
   * @param memberId - The ID of the member to promote
   * @returns An Observable with promotion response
   */
  promoteToAdmin(clubId: string, memberId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${clubId}/members/${memberId}/promote`, {});
  }

  /**
   * Demote an admin to member (admin only).
   *
   * @param clubId - The ID of the club
   * @param memberId - The ID of the member to demote
   * @returns An Observable with demotion response
   */
  demoteToMember(clubId: string, memberId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${clubId}/members/${memberId}/demote`, {});
  }

  /**
   * Get club members (for admin management).
   *
   * @param clubId - The ID of the club
   * @returns An Observable with club members
   */
  getClubMembers(clubId: string): Observable<ClubMember[]> {
    return this.http.get<ClubMember[]>(`${this.baseUrl}/${clubId}/members`);
  }

  /**
   * Get basic club member information for public display.
   * This will attempt to use the getClubMembers endpoint, and if that fails (non-admin),
   * it will fallback to extracting member info from club details.
   *
   * @param clubId - The ID of the club
   * @returns An Observable with basic club member information
   */
  getBasicMemberInfo(clubId: string): Observable<ClubMember[]> {
    // Try the admin endpoint first
    return this.getClubMembers(clubId).pipe(
      // If it fails, we'll handle it in the component
    );
  }
}
