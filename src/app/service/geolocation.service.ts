import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  MapboxGeocodingResponse,
  MapboxFeature,
  MapboxContext,
  CachedGeocodingResult
} from '../models/geolocation.model';

@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private readonly baseUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';
  private readonly accessToken = environment.mapboxAccessToken;
  private readonly cacheTimeout = 60 * 60 * 1000; // 1 hour in milliseconds
  private readonly requestTimeout = 10000; // 10 seconds

  // Cache for storing geocoded results
  private geocodingCache = new Map<string, CachedGeocodingResult>();

  constructor(private http: HttpClient) {}

  /**
   * Reverse geocode coordinates to get a human-readable address
   * @param lat - Latitude coordinate
   * @param lng - Longitude coordinate
   * @returns Observable<string | null> - Address string or null if failed
   */
  reverseGeocode(lat: number, lng: number): Observable<string | null> {
    // Validate coordinates
    if (!this.isValidCoordinate(lat, lng)) {
      console.error('GeolocationService: Invalid coordinates provided', { lat, lng });
      return of(null);
    }

    // Check cache first
    const cachedResult = this.getCachedResult(lat, lng);
    if (cachedResult) {
      return of(cachedResult);
    }

    // Make API request
    const url = this.buildGeocodingUrl(lng, lat);

    return this.http.get<MapboxGeocodingResponse>(url).pipe(
      timeout(this.requestTimeout),
      map(response => this.extractAddressFromResponse(response)),
      map(address => {
        if (address) {
          this.cacheResult(lat, lng, address);
        }
        return address;
      }),
      catchError(error => this.handleError(error, lat, lng))
    );
  }

  /**
   * Clear the geocoding cache
   */
  clearCache(): void {
    this.geocodingCache.clear();
    console.log('GeolocationService: Cache cleared');
  }

  /**
   * Get the current cache size
   * @returns number of cached entries
   */
  getCacheSize(): number {
    return this.geocodingCache.size;
  }

  /**
   * Clean expired entries from cache
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.geocodingCache.forEach((value, key) => {
      if (now - value.timestamp > this.cacheTimeout) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.geocodingCache.delete(key));

    if (expiredKeys.length > 0) {
      console.log(`GeolocationService: Cleaned ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Validate if coordinates are within valid ranges
   * @param lat - Latitude coordinate
   * @param lng - Longitude coordinate
   * @returns boolean indicating if coordinates are valid
   */
  private isValidCoordinate(lat: number, lng: number): boolean {
    return typeof lat === 'number' &&
           typeof lng === 'number' &&
           lat >= -90 &&
           lat <= 90 &&
           lng >= -180 &&
           lng <= 180 &&
           !isNaN(lat) &&
           !isNaN(lng);
  }

  /**
   * Generate cache key from coordinates
   * @param lat - Latitude coordinate
   * @param lng - Longitude coordinate
   * @returns Cache key string
   */
  private generateCacheKey(lat: number, lng: number): string {
    // Round to 4 decimal places for cache efficiency (~11m accuracy)
    const roundedLat = Math.round(lat * 10000) / 10000;
    const roundedLng = Math.round(lng * 10000) / 10000;
    return `${roundedLat},${roundedLng}`;
  }

  /**
   * Get cached result if available and not expired
   * @param lat - Latitude coordinate
   * @param lng - Longitude coordinate
   * @returns Cached address string or null
   */
  private getCachedResult(lat: number, lng: number): string | null {
    this.cleanExpiredCache();

    const cacheKey = this.generateCacheKey(lat, lng);
    const cached = this.geocodingCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
      console.log('GeolocationService: Using cached result for coordinates', { lat, lng });
      return cached.address;
    }

    return null;
  }

  /**
   * Cache the geocoding result
   * @param lat - Latitude coordinate
   * @param lng - Longitude coordinate
   * @param address - Address string to cache
   */
  private cacheResult(lat: number, lng: number, address: string): void {
    const cacheKey = this.generateCacheKey(lat, lng);
    this.geocodingCache.set(cacheKey, {
      address,
      timestamp: Date.now()
    });
    console.log('GeolocationService: Cached result for coordinates', { lat, lng, address });
  }

  /**
   * Build the Mapbox Geocoding API URL
   * @param lng - Longitude coordinate
   * @param lat - Latitude coordinate
   * @returns Complete API URL
   */
  private buildGeocodingUrl(lng: number, lat: number): string {
    const params = new URLSearchParams({
      access_token: this.accessToken,
      country: 'ph', // Restrict to Philippines
      limit: '1',
      types: 'address,poi,place,locality,neighborhood'
    });

    return `${this.baseUrl}/${lng},${lat}.json?${params.toString()}`;
  }

  /**
   * Extract address from Mapbox API response
   * @param response - Mapbox geocoding response
   * @returns Formatted address string or null
   */
  private extractAddressFromResponse(response: MapboxGeocodingResponse): string | null {
    if (!response || !response.features || response.features.length === 0) {
      return null;
    }

    const feature = response.features[0];

    // Use place_name as the primary address, fallback to text
    let address = feature.place_name || feature.text;

    // Clean up the address (remove country if it's Philippines)
    if (address.endsWith(', Philippines')) {
      address = address.replace(', Philippines', '');
    }

    return address || null;
  }

  /**
   * Handle API errors
   * @param error - HTTP error response
   * @param lat - Latitude coordinate for logging
   * @param lng - Longitude coordinate for logging
   * @returns Observable<null>
   */
  private handleError(error: HttpErrorResponse, lat: number, lng: number): Observable<null> {
    let errorMessage = 'Unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 401:
          errorMessage = 'Invalid Mapbox access token';
          break;
        case 422:
          errorMessage = 'Invalid coordinates provided';
          break;
        case 429:
          errorMessage = 'Rate limit exceeded';
          break;
        case 0:
          errorMessage = 'Network connection error';
          break;
        default:
          errorMessage = `Server error: ${error.status} - ${error.message}`;
      }
    }

    console.error('GeolocationService: Reverse geocoding failed', {
      error: errorMessage,
      coordinates: { lat, lng },
      status: error.status,
      url: error.url
    });

    return of(null);
  }
}
