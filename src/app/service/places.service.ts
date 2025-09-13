import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { environment } from '../../environments/environment';

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

@Injectable({
  providedIn: 'root'
})
export class PlacesService {
  private autocompleteService: any | null = null;
  private placesService: any | null = null;
  private isGoogleMapsLoaded = false;

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
   * Get current location using browser geolocation
   */
  async getCurrentLocation(): Promise<{lat: number, lng: number} | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation is not supported by this browser');
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Error getting current location:', error);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
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