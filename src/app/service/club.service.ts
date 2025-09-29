import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, from, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { map, switchMap, catchError, timeout } from 'rxjs/operators';
import { PlacesService, EnhancedLocation } from './places.service';
import {
  Club,
  ClubUpdateRequest,
  ClubAvailabilityCheck,
  JoinRequest,
  ClubMember,
  ValidationResult,
  MultiValidationResult,
  NearbyClubsOptions,
  ClubWithDistance,
  NearbyClubsResponse,
  LocationCoordinates,
  UserLocationInfo,
  DistanceInfo
} from '../models/club.model';

// Re-export for backward compatibility
export {
  Club,
  ClubUpdateRequest,
  ClubAvailabilityCheck,
  JoinRequest,
  ClubMember,
  ValidationResult,
  MultiValidationResult,
  NearbyClubsOptions,
  ClubWithDistance,
  NearbyClubsResponse,
  LocationCoordinates,
  UserLocationInfo,
  DistanceInfo
} from '../models/club.model';

@Injectable({
  providedIn: 'root'
})
export class ClubService {
  private baseUrl = `${environment.apiUrl}/club`;

  constructor(
    private http: HttpClient,
    private placesService: PlacesService
  ) { }

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
   * Get nearby clubs based on user's current location
   * @param options - Optional configuration for the nearby search
   * @returns Observable<NearbyClubsResponse> - Clubs with distance data
   */
  getNearbyClubs(options?: NearbyClubsOptions): Observable<NearbyClubsResponse> {
    const defaultOptions: NearbyClubsOptions = {
      radius: 50,
      limit: 20,
      includePrivate: false,
      useUserLocation: true,
      enableHighAccuracy: false,
      maxLocationAttempts: 3
    };

    const finalOptions = { ...defaultOptions, ...options };

    // If using user location, get current location first
    if (finalOptions.useUserLocation) {
      return this.getUserLocation(finalOptions).pipe(
        switchMap(location => {
          if (!location) {
            // If location acquisition failed, try fallback coordinates
            if (finalOptions.fallbackCoordinates) {
              return this.makeNearbyClubsRequest(
                finalOptions.fallbackCoordinates.latitude,
                finalOptions.fallbackCoordinates.longitude,
                finalOptions,
                'fallback'
              );
            } else {
              return throwError({
                code: 'LOCATION_UNAVAILABLE',
                message: 'Unable to determine user location and no fallback coordinates provided',
                source: 'location'
              });
            }
          }

          return this.makeNearbyClubsRequest(
            location.lat,
            location.lng,
            finalOptions,
            this.mapLocationSource(location.source)
          );
        }),
        catchError(error => this.handleNearbyClubsError(error, finalOptions))
      );
    } else if (finalOptions.fallbackCoordinates) {
      // Use fallback coordinates directly
      return this.makeNearbyClubsRequest(
        finalOptions.fallbackCoordinates.latitude,
        finalOptions.fallbackCoordinates.longitude,
        finalOptions,
        'fallback'
      );
    } else {
      return throwError({
        code: 'NO_COORDINATES',
        message: 'No location coordinates provided',
        source: 'configuration'
      });
    }
  }

  /**
   * Get user location with fallback strategies
   */
  private getUserLocation(options: NearbyClubsOptions): Observable<EnhancedLocation | null> {
    return from(this.acquireUserLocation(options));
  }

  /**
   * Acquire user location with multiple strategies
   */
  private async acquireUserLocation(options: NearbyClubsOptions): Promise<EnhancedLocation | null> {
    try {
      // Check if location services are available
      const isLocationServiceAvailable = await this.placesService.isLocationServiceAvailable();
      if (!isLocationServiceAvailable) {
        console.warn('Location services not available');
        return null;
      }

      // Try to get cached location first for quick response
      const cachedLocation = this.placesService.getCachedLocation();
      if (cachedLocation && cachedLocation.confidence !== 'low') {
        console.log('Using cached location for nearby clubs');
        return cachedLocation;
      }

      let location: EnhancedLocation | null = null;

      // Try high accuracy if requested
      if (options.enableHighAccuracy) {
        try {
          location = await this.placesService.getHighAccuracyLocation(50); // 50m accuracy
          if (location) {
            console.log('High accuracy location acquired');
            return location;
          }
        } catch (error) {
          console.warn('High accuracy location failed:', error);
        }
      }

      // Fallback to fast location
      try {
        location = await this.placesService.getFastLocation(200); // 200m accuracy
        if (location) {
          console.log('Fast location acquired');
          return location;
        }
      } catch (error) {
        console.warn('Fast location failed:', error);
      }

      // Last resort: use cached location even if expired
      if (cachedLocation) {
        console.log('Using expired cached location as last resort');
        return cachedLocation;
      }

      return null;
    } catch (error) {
      console.error('Location acquisition failed:', error);
      return null;
    }
  }

  /**
   * Make the actual HTTP request to the nearby clubs API
   */
  private makeNearbyClubsRequest(
    latitude: number,
    longitude: number,
    options: NearbyClubsOptions,
    locationSource: 'gps' | 'fallback' | 'cached'
  ): Observable<NearbyClubsResponse> {
    // Build query parameters
    let params = new HttpParams()
      .set('latitude', latitude.toString())
      .set('longitude', longitude.toString())
      .set('radius', (options.radius || 50).toString())
      .set('limit', (options.limit || 20).toString())
      .set('includePrivate', (options.includePrivate || false).toString());

    // Make the API call with timeout
    return this.http.get<any>(`${this.baseUrl}/nearby`, { params }).pipe(
      timeout(10000), // 10 second timeout
      map(response => this.transformNearbyClubsResponse(response, locationSource)),
      catchError(error => {
        console.error('Nearby clubs API error:', error);
        return throwError({
          code: 'API_ERROR',
          message: 'Failed to fetch nearby clubs',
          source: 'api',
          originalError: error
        });
      })
    );
  }

  /**
   * Transform the backend response to match frontend interfaces
   */
  private transformNearbyClubsResponse(
    response: any,
    locationSource: 'gps' | 'fallback' | 'cached'
  ): NearbyClubsResponse {
    const clubs: ClubWithDistance[] = (response.clubs || []).map((club: any) => ({
      ...club,
      distance: {
        value: club.distance || 0,
        unit: 'km' as const,
        formatted: this.formatDistance(club.distance || 0)
      },
      memberCount: club.memberCount || 0
    }));

    return {
      clubs,
      userLocation: {
        latitude: response.userLocation?.latitude || 0,
        longitude: response.userLocation?.longitude || 0,
        accuracy: response.userLocation?.accuracy || 0,
        source: locationSource
      },
      searchRadius: response.searchRadius || 50,
      totalCount: response.total || clubs.length,
      message: response.message
    };
  }

  /**
   * Format distance for display
   */
  private formatDistance(distanceKm: number): string {
    if (distanceKm < 1) {
      const meters = Math.round(distanceKm * 1000);
      return `${meters}m`;
    } else if (distanceKm < 10) {
      return `${distanceKm.toFixed(1)}km`;
    } else {
      return `${Math.round(distanceKm)}km`;
    }
  }

  /**
   * Handle errors from nearby clubs operation
   */
  private handleNearbyClubsError(error: any, options: NearbyClubsOptions): Observable<NearbyClubsResponse> {
    console.error('Nearby clubs error:', error);

    // If we have fallback coordinates and the error is location-related, try fallback
    if (options.fallbackCoordinates &&
        (error.code === 'LOCATION_UNAVAILABLE' || error.source === 'location')) {
      console.log('Trying fallback coordinates due to location error');
      return this.makeNearbyClubsRequest(
        options.fallbackCoordinates.latitude,
        options.fallbackCoordinates.longitude,
        options,
        'fallback'
      );
    }

    // Return empty results for graceful degradation
    const fallbackResponse: NearbyClubsResponse = {
      clubs: [],
      userLocation: options.fallbackCoordinates ? {
        latitude: options.fallbackCoordinates.latitude,
        longitude: options.fallbackCoordinates.longitude,
        accuracy: 0,
        source: 'fallback'
      } : {
        latitude: 0,
        longitude: 0,
        accuracy: 0,
        source: 'fallback'
      },
      searchRadius: options.radius || 50,
      totalCount: 0,
      message: this.getErrorMessage(error)
    };

    return of(fallbackResponse);
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    switch (error.code) {
      case 'LOCATION_UNAVAILABLE':
        return 'Unable to determine your location. Please check location permissions.';
      case 'API_ERROR':
        return 'Unable to fetch nearby clubs. Please try again later.';
      case 'NO_COORDINATES':
        return 'Location coordinates required for nearby search.';
      default:
        return 'Unable to find nearby clubs. Please try again.';
    }
  }

  /**
   * Map PlacesService location source to our interface
   */
  private mapLocationSource(source: string): 'gps' | 'fallback' | 'cached' {
    switch (source) {
      case 'capacitor':
      case 'browser':
        return 'gps';
      case 'cached':
        return 'cached';
      case 'default':
      default:
        return 'fallback';
    }
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

  // --- CLUB UPDATE METHODS ---

  /**
   * Update club information.
   *
   * @param clubId - The ID of the club to update
   * @param clubData - The club data to update
   * @returns An Observable with the updated club
   */
  updateClub(clubId: string, clubData: ClubUpdateRequest): Observable<Club> {
    return this.http.put<Club>(`${this.baseUrl}/${clubId}/update`, clubData);
  }

  /**
   * Update club logo only.
   *
   * @param clubId - The ID of the club to update
   * @param file - The logo file to upload
   * @returns An Observable with the updated club
   */
  updateClubLogo(clubId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('logo', file);
    return this.http.put(`${this.baseUrl}/${clubId}/update`, formData);
  }

  /**
   * Update club information with logo upload.
   *
   * @param clubId - The ID of the club to update
   * @param clubData - The club data to update
   * @param logoFile - The logo file to upload
   * @returns An Observable with the updated club
   */
  updateClubWithLogo(clubId: string, clubData: ClubUpdateRequest, logoFile: File): Observable<Club> {
    const formData = new FormData();

    // Append club data as JSON
    if (clubData.clubName !== undefined) {
      formData.append('clubName', clubData.clubName);
    }
    if (clubData.description !== undefined) {
      formData.append('description', clubData.description);
    }
    if (clubData.location !== undefined) {
      formData.append('location', clubData.location);
    }
    if (clubData.isPrivate !== undefined) {
      formData.append('isPrivate', clubData.isPrivate.toString());
    }
    if (clubData.geolocation) {
      formData.append('geolocation', JSON.stringify(clubData.geolocation));
    }

    // Append logo file
    formData.append('logo', logoFile);

    return this.http.put<Club>(`${this.baseUrl}/${clubId}/update`, formData);
  }

  /**
   * Check if a club name is available.
   *
   * @param name - The club name to check
   * @param excludeId - Optional club ID to exclude from the check (for editing existing club)
   * @returns An Observable with availability status
   */
  checkClubNameAvailability(name: string, excludeId?: string): Observable<ClubAvailabilityCheck> {
    let url = `${this.baseUrl}/check-name/${encodeURIComponent(name)}`;
    if (excludeId) {
      url += `?exclude=${excludeId}`;
    }
    return this.http.get<ClubAvailabilityCheck>(url);
  }

  // --- VALIDATION HELPERS ---

  /**
   * Validate club name format and requirements.
   *
   * @param name - The club name to validate
   * @returns Validation result with error message if invalid
   */
  validateClubName(name: string): ValidationResult {
    if (!name || name.trim().length === 0) {
      return { valid: false, error: 'Club name is required' };
    }

    if (name.trim().length < 3) {
      return { valid: false, error: 'Club name must be at least 3 characters' };
    }

    if (name.trim().length > 50) {
      return { valid: false, error: 'Club name must be less than 50 characters' };
    }

    // Check for valid characters (alphanumeric, spaces, hyphens, apostrophes)
    const validNamePattern = /^[a-zA-Z0-9\s\-']+$/;
    if (!validNamePattern.test(name.trim())) {
      return { valid: false, error: 'Club name can only contain letters, numbers, spaces, hyphens, and apostrophes' };
    }

    return { valid: true };
  }

  /**
   * Validate club description format and requirements.
   *
   * @param description - The club description to validate
   * @returns Validation result with error message if invalid
   */
  validateClubDescription(description: string): ValidationResult {
    if (!description || description.trim().length === 0) {
      return { valid: false, error: 'Club description is required' };
    }

    if (description.trim().length < 10) {
      return { valid: false, error: 'Club description must be at least 10 characters' };
    }

    if (description.trim().length > 500) {
      return { valid: false, error: 'Club description must be less than 500 characters' };
    }

    return { valid: true };
  }

  /**
   * Validate club location format.
   *
   * @param location - The club location to validate
   * @returns Validation result with error message if invalid
   */
  validateClubLocation(location?: string): ValidationResult {
    if (!location || location.trim().length === 0) {
      return { valid: true }; // Location is optional
    }

    if (location.trim().length > 100) {
      return { valid: false, error: 'Location must be less than 100 characters' };
    }

    return { valid: true };
  }

  /**
   * Validate all club update data.
   *
   * @param clubData - The club data to validate
   * @returns Validation result with error messages if invalid
   */
  validateClubUpdateData(clubData: ClubUpdateRequest): MultiValidationResult {
    const errors: string[] = [];

    if (clubData.clubName !== undefined) {
      const nameValidation = this.validateClubName(clubData.clubName);
      if (!nameValidation.valid && nameValidation.error) {
        errors.push(nameValidation.error);
      }
    }

    if (clubData.description !== undefined) {
      const descriptionValidation = this.validateClubDescription(clubData.description);
      if (!descriptionValidation.valid && descriptionValidation.error) {
        errors.push(descriptionValidation.error);
      }
    }

    if (clubData.location !== undefined) {
      const locationValidation = this.validateClubLocation(clubData.location);
      if (!locationValidation.valid && locationValidation.error) {
        errors.push(locationValidation.error);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
