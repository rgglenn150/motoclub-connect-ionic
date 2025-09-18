import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';
import { Geolocation, Position, PermissionStatus } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

declare let google: any;

export interface PlaceResult {
  place_id: string;
  description: string;
  formatted_address?: string;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

export interface EnhancedLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
  source: 'capacitor' | 'browser' | 'cached' | 'default';
  confidence: 'high' | 'medium' | 'low';
}

export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  maxAccuracy?: number;
  maxRetries?: number;
  retryDelay?: number;
}

export interface GeolocationError {
  code: number;
  message: string;
  source: 'capacitor' | 'browser' | 'permission';
}

@Injectable({
  providedIn: 'root'
})
export class PlacesService {
  private autocompleteService: any | null = null;
  private placesService: any | null = null;
  private isGoogleMapsLoaded = false;

  // Location caching and management
  private cachedLocation: EnhancedLocation | null = null;
  private locationCacheExpiry = 5 * 60 * 1000; // 5 minutes
  private pendingLocationRequest: Promise<EnhancedLocation | null> | null = null;

  // Default location configuration
  private defaultLocationOptions: LocationOptions = {
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 300000, // 5 minutes
    maxAccuracy: 100, // meters
    maxRetries: 3,
    retryDelay: 2000 // 2 seconds
  };

  constructor() {
   // this.loadGoogleMapsApi();
  }

  /**
   * Load Google Maps JavaScript API dynamically
   */
  private loadGoogleMapsApi(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if Google Maps API is already loaded
      if (typeof google !== 'undefined' && (google as any).maps && (google as any).maps.places) {
        this.initializeServices();
        resolve();
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        // Wait for existing script to load
        const checkLoaded = () => {
          if (typeof google !== 'undefined' && (google as any).maps && (google as any).maps.places) {
            this.initializeServices();
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
        return;
      }

      // Load the script
      const script = document.createElement('script');
      script.type = 'text/javascript';
      // Google Maps API disabled - using Mapbox instead
      script.src = ''; // Disabled Google Maps API
      script.async = true;
      script.defer = true;

      script.onload = () => {
        this.initializeServices();
        resolve();
      };

      script.onerror = (error) => {
        console.error('Error loading Google Maps API:', error);
        reject(error);
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Google Maps services
   */
  private initializeServices(): void {
    if (typeof google !== 'undefined' && (google as any).maps && (google as any).maps.places) {
      this.autocompleteService = new (google as any).maps.places.AutocompleteService();
      // Create a dummy map element for PlacesService (required by Google API)
      const dummyMapElement = document.createElement('div');
      const dummyMap = new (google as any).maps.Map(dummyMapElement);
      this.placesService = new (google as any).maps.places.PlacesService(dummyMap);
      this.isGoogleMapsLoaded = true;
    }
  }

  /**
   * Get place predictions based on input
   */
  getPlacePredictions(input: string): Observable<PlaceResult[]> {
    if (!input.trim()) {
      return from(Promise.resolve([]));
    }

    return from(this.getPlacePredictionsAsync(input));
  }

  private async getPlacePredictionsAsync(input: string): Promise<PlaceResult[]> {
    try {
      // Ensure Google Maps API is loaded
      if (!this.isGoogleMapsLoaded) {
        await this.loadGoogleMapsApi();
      }

      return new Promise((resolve, reject) => {
        if (!this.autocompleteService) {
          reject(new Error('Google Places Autocomplete service not available'));
          return;
        }

        const request: any = {
          input: input,
          types: ['establishment', 'geocode'], // Include both places and addresses
          componentRestrictions: { country: 'us' } // Restrict to US - modify as needed
        };

        this.autocompleteService.getPlacePredictions(request, (predictions: any, status: any) => {
          if (status === (google as any).maps.places.PlacesServiceStatus.OK && predictions) {
            const results: PlaceResult[] = predictions.map((prediction: any) => ({
              place_id: prediction.place_id,
              description: prediction.description,
              formatted_address: prediction.structured_formatting?.main_text || prediction.description
            }));
            resolve(results);
          } else if (status === (google as any).maps.places.PlacesServiceStatus.ZERO_RESULTS) {
            resolve([]);
          } else {
            console.warn('Places API request failed with status:', status);
            resolve([]);
          }
        });
      });
    } catch (error) {
      console.error('Error getting place predictions:', error);
      return [];
    }
  }

  /**
   * Get detailed place information by place_id
   */
  async getPlaceDetails(placeId: string): Promise<PlaceResult | null> {
    try {
      // Ensure Google Maps API is loaded
      if (!this.isGoogleMapsLoaded) {
        await this.loadGoogleMapsApi();
      }

      return new Promise((resolve, reject) => {
        if (!this.placesService) {
          reject(new Error('Google Places service not available'));
          return;
        }

        const request: any = {
          placeId: placeId,
          fields: ['place_id', 'formatted_address', 'geometry', 'name']
        };

        this.placesService.getDetails(request, (place: any, status: any) => {
          if (status === (google as any).maps.places.PlacesServiceStatus.OK && place) {
            const result: PlaceResult = {
              place_id: place.place_id!,
              description: place.formatted_address || place.name || '',
              formatted_address: place.formatted_address,
              geometry: place.geometry ? {
                location: {
                  lat: place.geometry.location!.lat(),
                  lng: place.geometry.location!.lng()
                }
              } : undefined
            };
            resolve(result);
          } else {
            console.warn('Place details request failed with status:', status);
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  /**
   * Check if Google Maps API is available
   */
  isApiAvailable(): boolean {
    // Google Maps API disabled - using Mapbox instead
    return false;
  }

  /**
   * Check if running on native mobile platform
   */
  private isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Check location permissions
   */
  private async checkLocationPermissions(): Promise<{ granted: boolean; error?: GeolocationError }> {
    try {
      if (this.isNativePlatform()) {
        const permissionStatus = await Geolocation.checkPermissions();
        const granted = permissionStatus.location === 'granted';

        if (!granted) {
          // Try to request permissions
          const requestResult = await Geolocation.requestPermissions();
          const finalGranted = requestResult.location === 'granted';

          if (!finalGranted) {
            return {
              granted: false,
              error: {
                code: 1,
                message: 'Location permission denied',
                source: 'permission'
              }
            };
          }
        }

        return { granted: true };
      } else {
        // For web platform, permissions are handled by browser
        return { granted: true };
      }
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return {
        granted: false,
        error: {
          code: 2,
          message: 'Permission check failed',
          source: 'permission'
        }
      };
    }
  }

  /**
   * Validate location accuracy and age
   */
  private validateLocation(position: Position | GeolocationPosition, maxAccuracy: number): boolean {
    const accuracy = position.coords.accuracy;
    const timestamp = position.timestamp;
    const now = Date.now();
    const age = now - timestamp;

    // Reject if accuracy is poor (greater than maxAccuracy meters)
    if (accuracy > maxAccuracy) {
      console.warn(`Location accuracy too poor: ${accuracy}m > ${maxAccuracy}m`);
      return false;
    }

    // Reject if location is too old (older than 5 minutes)
    if (age > 300000) {
      console.warn(`Location too old: ${age}ms`);
      return false;
    }

    return true;
  }

  /**
   * Calculate location confidence based on accuracy
   */
  private calculateConfidence(accuracy: number): 'high' | 'medium' | 'low' {
    if (accuracy <= 10) return 'high';
    if (accuracy <= 50) return 'medium';
    return 'low';
  }

  /**
   * Convert Position to EnhancedLocation
   */
  private convertToEnhancedLocation(
    position: Position | GeolocationPosition,
    source: 'capacitor' | 'browser'
  ): EnhancedLocation {
    const coords = position.coords;
    const accuracy = coords.accuracy;

    return {
      lat: coords.latitude,
      lng: coords.longitude,
      accuracy: accuracy,
      timestamp: position.timestamp,
      altitude: coords.altitude || undefined,
      altitudeAccuracy: coords.altitudeAccuracy || undefined,
      heading: coords.heading || undefined,
      speed: coords.speed || undefined,
      source: source,
      confidence: this.calculateConfidence(accuracy)
    };
  }

  /**
   * Get location using Capacitor Geolocation
   */
  private async getCapacitorLocation(options: LocationOptions): Promise<EnhancedLocation | null> {
    try {
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: options.enableHighAccuracy,
        timeout: options.timeout,
        maximumAge: options.maximumAge
      });

      if (!this.validateLocation(position, options.maxAccuracy || 100)) {
        return null;
      }

      return this.convertToEnhancedLocation(position, 'capacitor');
    } catch (error) {
      console.error('Capacitor geolocation error:', error);
      throw error;
    }
  }

  /**
   * Get location using browser geolocation
   */
  private async getBrowserLocation(options: LocationOptions): Promise<EnhancedLocation | null> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Browser geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!this.validateLocation(position, options.maxAccuracy || 100)) {
            resolve(null);
            return;
          }

          const enhancedLocation = this.convertToEnhancedLocation(position, 'browser');
          resolve(enhancedLocation);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: options.enableHighAccuracy,
          timeout: options.timeout,
          maximumAge: options.maximumAge
        }
      );
    });
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current location with retry logic and fallbacks
   */
  async getCurrentLocation(options?: Partial<LocationOptions>): Promise<EnhancedLocation | null> {
    // Prevent multiple simultaneous requests
    if (this.pendingLocationRequest) {
      return this.pendingLocationRequest;
    }

    const finalOptions = { ...this.defaultLocationOptions, ...options };

    this.pendingLocationRequest = this.getCurrentLocationInternal(finalOptions);

    try {
      const result = await this.pendingLocationRequest;
      return result;
    } finally {
      this.pendingLocationRequest = null;
    }
  }

  /**
   * Internal location retrieval with caching and fallbacks
   */
  private async getCurrentLocationInternal(options: LocationOptions): Promise<EnhancedLocation | null> {
    // Check cache first
    if (this.cachedLocation && this.isCacheValid()) {
      console.log('Returning cached location');
      return { ...this.cachedLocation, source: 'cached' };
    }

    // Check permissions
    const permissionCheck = await this.checkLocationPermissions();
    if (!permissionCheck.granted) {
      console.error('Location permission denied:', permissionCheck.error);
      return this.getFallbackLocation();
    }

    let lastError: any = null;
    const maxRetries = options.maxRetries || 3;

    // Try to get location with retries
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Location attempt ${attempt}/${maxRetries}`);

        let location: EnhancedLocation | null = null;

        // Try Capacitor first on native platforms
        if (this.isNativePlatform()) {
          try {
            location = await this.getCapacitorLocation(options);
            if (location) {
              console.log('Location obtained via Capacitor');
            }
          } catch (error) {
            console.warn('Capacitor geolocation failed:', error);
            lastError = error;
          }
        }

        // Fallback to browser geolocation
        if (!location) {
          try {
            location = await this.getBrowserLocation(options);
            if (location) {
              console.log('Location obtained via browser');
            }
          } catch (error) {
            console.warn('Browser geolocation failed:', error);
            lastError = error;
          }
        }

        if (location) {
          // Cache the successful location
          this.cachedLocation = location;
          return location;
        }

        // If no location and not last attempt, wait before retry
        if (attempt < maxRetries) {
          console.log(`Retrying in ${options.retryDelay}ms...`);
          await this.sleep(options.retryDelay || 2000);
        }

      } catch (error) {
        console.error(`Location attempt ${attempt} failed:`, error);
        lastError = error;

        if (attempt < maxRetries) {
          await this.sleep(options.retryDelay || 2000);
        }
      }
    }

    console.error('All location attempts failed:', lastError);
    return this.getFallbackLocation();
  }

  /**
   * Check if cached location is still valid
   */
  private isCacheValid(): boolean {
    if (!this.cachedLocation) return false;
    const now = Date.now();
    const age = now - this.cachedLocation.timestamp;
    return age < this.locationCacheExpiry;
  }

  /**
   * Get fallback location (could be last known, default city, etc.)
   */
  private getFallbackLocation(): EnhancedLocation | null {
    // Return cached location if available, even if expired
    if (this.cachedLocation) {
      console.log('Returning expired cached location as fallback');
      return { ...this.cachedLocation, source: 'cached' };
    }

    // Could implement default location based on app configuration
    // For now, return null to let the calling code handle it
    console.log('No fallback location available');
    return null;
  }

  /**
   * Get current location using browser geolocation (legacy method for backward compatibility)
   */
  async getCurrentLocationLegacy(): Promise<{lat: number, lng: number} | null> {
    const location = await this.getCurrentLocation();
    if (location) {
      return {
        lat: location.lat,
        lng: location.lng
      };
    }
    return null;
  }

  /**
   * Clear location cache
   */
  clearLocationCache(): void {
    this.cachedLocation = null;
    console.log('Location cache cleared');
  }

  /**
   * Get location permission status
   */
  async getLocationPermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
    try {
      if (this.isNativePlatform()) {
        const permissionStatus = await Geolocation.checkPermissions();
        const status = permissionStatus.location;

        // Handle all possible Capacitor permission states
        switch (status) {
          case 'granted':
            return 'granted';
          case 'denied':
            return 'denied';
          case 'prompt':
          case 'prompt-with-rationale':
            return 'prompt';
          default:
            return 'unknown';
        }
      } else {
        // For web platform, we can't easily check permission status without triggering a request
        return 'unknown';
      }
    } catch (error) {
      console.error('Error checking permission status:', error);
      return 'unknown';
    }
  }

  /**
   * Request location permissions explicitly
   */
  async requestLocationPermissions(): Promise<boolean> {
    try {
      if (this.isNativePlatform()) {
        const result = await Geolocation.requestPermissions();
        return result.location === 'granted';
      } else {
        // For web, permissions are requested automatically with geolocation API
        return true;
      }
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Get cached location if available
   */
  getCachedLocation(): EnhancedLocation | null {
    if (this.cachedLocation && this.isCacheValid()) {
      return { ...this.cachedLocation };
    }
    return null;
  }

  /**
   * Check if location services are available
   */
  async isLocationServiceAvailable(): Promise<boolean> {
    try {
      if (this.isNativePlatform()) {
        // On native platforms, check if Capacitor Geolocation is available
        const permissionStatus = await Geolocation.checkPermissions();
        return permissionStatus.location !== undefined;
      } else {
        // On web platforms, check if navigator.geolocation is available
        return !!navigator.geolocation;
      }
    } catch (error) {
      console.error('Error checking location service availability:', error);
      return false;
    }
  }

  /**
   * Get location with specific accuracy requirements
   */
  async getHighAccuracyLocation(maxAccuracy: number = 10): Promise<EnhancedLocation | null> {
    return this.getCurrentLocation({
      enableHighAccuracy: true,
      timeout: 30000, // Longer timeout for high accuracy
      maximumAge: 60000, // Shorter cache age for high accuracy
      maxAccuracy: maxAccuracy,
      maxRetries: 5, // More retries for high accuracy
      retryDelay: 3000 // Longer delay between retries
    });
  }

  /**
   * Get location quickly with lower accuracy requirements
   */
  async getFastLocation(maxAccuracy: number = 200): Promise<EnhancedLocation | null> {
    return this.getCurrentLocation({
      enableHighAccuracy: false,
      timeout: 5000, // Shorter timeout for quick location
      maximumAge: 600000, // Longer cache age acceptable
      maxAccuracy: maxAccuracy,
      maxRetries: 1, // Fewer retries for quick location
      retryDelay: 1000 // Shorter delay
    });
  }

  /**
   * Reverse geocode coordinates to get address
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      // Ensure Google Maps API is loaded
      if (!this.isGoogleMapsLoaded) {
        await this.loadGoogleMapsApi();
      }

      return new Promise((resolve) => {
        const geocoder = new (google as any).maps.Geocoder();
        const latlng = { lat: lat, lng: lng };

        geocoder.geocode({ location: latlng }, (results: any, status: any) => {
          if (status === (google as any).maps.GeocoderStatus.OK && results && results[0]) {
            resolve(results[0].formatted_address);
          } else {
            console.warn('Reverse geocoding failed with status:', status);
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return null;
    }
  }
}