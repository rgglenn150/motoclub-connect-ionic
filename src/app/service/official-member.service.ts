import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import {
  OfficialMember,
  ClaimRequest,
  ClubReference,
  UserReference,
  CSVImportResult,
  OfficialMemberSearchParams,
  OfficialMemberSearchResponse,
  OfficialMemberFilters,
  OfficialMemberFilterResponse,
  PaginationInfo,
  OfficialMemberVisibility,
  VisibilityOption,
  PaginatedResponse
} from '../models/official-member.model';

@Injectable({
  providedIn: 'root'
})
export class OfficialMemberService {
  private baseUrl = `${environment.apiUrl}/official-member`;

  constructor(private http: HttpClient) { }

  // ==================== CRUD METHODS ====================

  /**
   * Create a new official member (admin only)
   * @param clubId - The ID of the club
   * @param memberData - Partial official member data
   * @returns Observable with created official member
   */
  createOfficialMember(clubId: string, memberData: Partial<OfficialMember>): Observable<OfficialMember> {
    return this.http.post<{ message: string; officialMember: OfficialMember }>(
      `${this.baseUrl}/${clubId}/members`,
      memberData
    ).pipe(
      map(response => response.officialMember),
      catchError(error => {
        console.error('Error creating official member:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all official members for a club with pagination
   * @param clubId - The ID of the club
   * @param pagination - Optional pagination parameters
   * @returns Observable with paginated official members
   */
  getOfficialMembers(
    clubId: string,
    pagination?: { page: number; limit: number }
  ): Observable<PaginatedResponse<OfficialMember>> {
    let params = new HttpParams();
    
    if (pagination) {
      params = params.set('page', pagination.page.toString());
      params = params.set('limit', pagination.limit.toString());
    }

    return this.http.get<{
      officialMembers: OfficialMember[];
      pagination: PaginationInfo;
    }>(`${this.baseUrl}/${clubId}/members`, { params }).pipe(
      map(response => ({
        data: response.officialMembers,
        pagination: response.pagination
      })),
      catchError(error => {
        console.error('Error getting official members:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get a single official member by ID
   * @param clubId - The ID of the club
   * @param memberId - The ID of the official member
   * @returns Observable with official member details
   */
  getOfficialMemberById(clubId: string, memberId: string): Observable<OfficialMember> {
    return this.http.get<{ officialMember: OfficialMember }>(
      `${this.baseUrl}/${clubId}/members/${memberId}`
    ).pipe(
      map(response => response.officialMember),
      catchError(error => {
        console.error('Error getting official member:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Update an official member (admin only)
   * @param clubId - The ID of the club
   * @param memberId - The ID of the official member
   * @param data - Partial data to update
   * @returns Observable with updated official member
   */
  updateOfficialMember(
    clubId: string,
    memberId: string,
    data: Partial<OfficialMember>
  ): Observable<OfficialMember> {
    return this.http.put<{ message: string; officialMember: OfficialMember }>(
      `${this.baseUrl}/${clubId}/members/${memberId}`,
      data
    ).pipe(
      map(response => response.officialMember),
      catchError(error => {
        console.error('Error updating official member:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete an official member (admin only)
   * @param clubId - The ID of the club
   * @param memberId - The ID of the official member
   * @returns Observable with deletion message
   */
  deleteOfficialMember(clubId: string, memberId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.baseUrl}/${clubId}/members/${memberId}`
    ).pipe(
      catchError(error => {
        console.error('Error deleting official member:', error);
        return throwError(() => error);
      })
    );
  }

  // ==================== CSV IMPORT/EXPORT ====================

  /**
   * Import official members from CSV file (admin only)
   * @param clubId - The ID of the club
   * @param file - CSV file to import
   * @returns Observable with import results
   */
  importFromCSV(clubId: string, file: File): Observable<CSVImportResult> {
    const formData = new FormData();
    formData.append('csv', file);

    return this.http.post<CSVImportResult>(
      `${this.baseUrl}/${clubId}/import`,
      formData
    ).pipe(
      catchError(error => {
        console.error('Error importing CSV:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Export official members to CSV (admin only)
   * @param clubId - The ID of the club
   * @returns Observable with CSV blob
   */
  exportToCSV(clubId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${clubId}/export`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Error exporting CSV:', error);
        return throwError(() => error);
      })
    );
  }

  // ==================== SEARCH/FILTER ====================

  /**
   * Search official members by query string
   * @param clubId - The ID of the club
   * @param searchParams - Search parameters including query string
   * @returns Observable with search results
   */
  searchOfficialMembers(
    clubId: string,
    searchParams: OfficialMemberSearchParams
  ): Observable<OfficialMember[]> {
    let params = new HttpParams().set('q', searchParams.q);
    
    if (searchParams.page) {
      params = params.set('page', searchParams.page.toString());
    }
    if (searchParams.limit) {
      params = params.set('limit', searchParams.limit.toString());
    }

    return this.http.get<OfficialMemberSearchResponse>(
      `${this.baseUrl}/${clubId}/search`,
      { params }
    ).pipe(
      map(response => response.officialMembers),
      catchError(error => {
        console.error('Error searching official members:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Filter official members by various criteria
   * @param clubId - The ID of the club
   * @param filters - Filter criteria
   * @returns Observable with filtered results
   */
  filterOfficialMembers(
    clubId: string,
    filters: OfficialMemberFilters
  ): Observable<OfficialMember[]> {
    let params = new HttpParams();
    
    if (filters.isActive !== undefined) {
      params = params.set('isActive', filters.isActive.toString());
    }
    if (filters.isClaimed !== undefined) {
      params = params.set('isClaimed', filters.isClaimed.toString());
    }
    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.limit) {
      params = params.set('limit', filters.limit.toString());
    }

    return this.http.get<OfficialMemberFilterResponse>(
      `${this.baseUrl}/${clubId}/filter`,
      { params }
    ).pipe(
      map(response => response.officialMembers),
      catchError(error => {
        console.error('Error filtering official members:', error);
        return throwError(() => error);
      })
    );
  }

  // ==================== CLAIM REQUESTS ====================

  /**
   * Create a claim request for an official member (member only)
   * @param clubId - The ID of the club
   * @param memberId - The ID of the official member
   * @param notes - Optional verification notes
   * @returns Observable with created claim request
   */
  createClaimRequest(
    clubId: string,
    memberId: string,
    notes?: string
  ): Observable<ClaimRequest> {
    return this.http.post<{ message: string; claimRequest: ClaimRequest }>(
      `${this.baseUrl}/${clubId}/members/${memberId}/claim`,
      { verificationNotes: notes }
    ).pipe(
      map(response => response.claimRequest),
      catchError(error => {
        console.error('Error creating claim request:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get all pending claim requests (admin only)
   * @param clubId - The ID of the club
   * @returns Observable with pending claim requests
   */
  getPendingClaimRequests(clubId: string): Observable<ClaimRequest[]> {
    return this.http.get<{ claimRequests: ClaimRequest[] }>(
      `${this.baseUrl}/${clubId}/claims/pending`
    ).pipe(
      map(response => response.claimRequests),
      catchError(error => {
        console.error('Error getting pending claim requests:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Approve a claim request (admin only)
   * @param clubId - The ID of the club
   * @param claimId - The ID of the claim request
   * @returns Observable with approval response
   */
  approveClaimRequest(clubId: string, claimId: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/${clubId}/claims/${claimId}/approve`,
      {}
    ).pipe(
      catchError(error => {
        console.error('Error approving claim request:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Reject a claim request (admin only)
   * @param clubId - The ID of the club
   * @param claimId - The ID of the claim request
   * @param notes - Optional response notes
   * @returns Observable with rejection response
   */
  rejectClaimRequest(
    clubId: string,
    claimId: string,
    notes?: string
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.baseUrl}/${clubId}/claims/${claimId}/reject`,
      { responseNotes: notes }
    ).pipe(
      catchError(error => {
        console.error('Error rejecting claim request:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current user's claim requests for a club
   * @param clubId - The ID of the club
   * @returns Observable with user's claim requests
   */
  getMyClaimRequests(clubId: string): Observable<ClaimRequest[]> {
    return this.http.get<{ claimRequests: ClaimRequest[] }>(
      `${this.baseUrl}/${clubId}/claims/my-requests`
    ).pipe(
      map(response => response.claimRequests),
      catchError(error => {
        console.error('Error getting my claim requests:', error);
        return throwError(() => error);
      })
    );
  }

  // ==================== ID CARDS ====================

  /**
   * Generate ID card for an official member
   * @param clubId - The ID of the club
   * @param memberId - The ID of the official member
   * @returns Observable with ID card image blob
   */
  generateIDCard(clubId: string, memberId: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/${clubId}/members/${memberId}/id-card`, {
      responseType: 'blob'
    }).pipe(
      catchError(error => {
        console.error('Error generating ID card:', error);
        return throwError(() => error);
      })
    );
  }

  // ==================== VISIBILITY ====================

  /**
   * Update official members visibility setting (admin only)
   * @param clubId - The ID of the club
   * @param visibility - Visibility setting (public, members, admins)
   * @returns Observable with updated visibility
   */
  updateVisibility(
    clubId: string,
    visibility: VisibilityOption
  ): Observable<OfficialMemberVisibility> {
    return this.http.put<{ message: string; visibility: VisibilityOption }>(
      `${this.baseUrl}/${clubId}/visibility`,
      { visibility }
    ).pipe(
      map(response => ({ visibility: response.visibility })),
      catchError(error => {
        console.error('Error updating visibility:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get current official members visibility setting
   * @param clubId - The ID of the club
   * @returns Observable with visibility setting
   */
  getVisibility(clubId: string): Observable<OfficialMemberVisibility> {
    return this.http.get<{ visibility: VisibilityOption }>(
      `${this.baseUrl}/${clubId}/visibility`
    ).pipe(
      map(response => ({ visibility: response.visibility })),
      catchError(error => {
        console.error('Error getting visibility:', error);
        return throwError(() => error);
      })
    );
  }
}
