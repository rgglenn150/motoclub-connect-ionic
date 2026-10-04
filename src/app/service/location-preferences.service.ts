import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface SavedLocation {
  id: string;
  name: string;
  coordinates: LocationCoordinates;
  timestamp: number;
  isCustom: boolean; // true for manually entered, false for GPS locations
}

export interface LocationPreferences {
  useGps: boolean;
  preferredLocation?: SavedLocation;
  locationHistory: SavedLocation[];
  favorites: SavedLocation[];
  fallbackCoordinates: LocationCoordinates;
}

@Injectable({
  providedIn: 'root'
})
export class LocationPreferencesService {
  private readonly storageKey = 'location_preferences';
  private readonly maxHistoryItems = 10;
  private readonly maxFavoriteItems = 5;
  
  // Default fallback to Iloilo City, Philippines (same as weather service)
  private readonly defaultFallbackCoordinates: LocationCoordinates = {
    latitude: 10.6953,
    longitude: 122.5442
  };

  private preferencesSubject = new BehaviorSubject<LocationPreferences>(this.getDefaultPreferences());
  public preferences$ = this.preferencesSubject.asObservable();

  constructor() {
    this.loadPreferences();
  }

  /**
   * Get default location preferences
   */
  private getDefaultPreferences(): LocationPreferences {
    return {
      useGps: true,
      preferredLocation: undefined,
      locationHistory: [],
      favorites: [],
      fallbackCoordinates: this.defaultFallbackCoordinates
    };
  }

  /**
   * Load preferences from localStorage
   */
  private loadPreferences(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const preferences = JSON.parse(stored) as LocationPreferences;
        // Ensure all required properties exist with proper defaults
        const validatedPreferences: LocationPreferences = {
          useGps: preferences.useGps ?? true,
          preferredLocation: preferences.preferredLocation,
          locationHistory: preferences.locationHistory ?? [],
          favorites: preferences.favorites ?? [],
          fallbackCoordinates: preferences.fallbackCoordinates ?? this.defaultFallbackCoordinates
        };
        this.preferencesSubject.next(validatedPreferences);
      }
    } catch (error) {
      console.warn('Error loading location preferences, using defaults:', error);
      this.resetToDefaults();
    }
  }

  /**
   * Save preferences to localStorage
   */
  private savePreferences(preferences: LocationPreferences): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(preferences));
      this.preferencesSubject.next(preferences);
    } catch (error) {
      console.error('Error saving location preferences:', error);
    }
  }

  /**
   * Get current preferences
   */
  getCurrentPreferences(): LocationPreferences {
    return this.preferencesSubject.value;
  }

  /**
   * Toggle GPS usage preference
   */
  toggleGpsUsage(useGps: boolean): void {
    const current = this.getCurrentPreferences();
    const updated: LocationPreferences = {
      ...current,
      useGps
    };
    this.savePreferences(updated);
  }

  /**
   * Set preferred location
   */
  setPreferredLocation(location: SavedLocation): void {
    const current = this.getCurrentPreferences();
    const updated: LocationPreferences = {
      ...current,
      preferredLocation: location,
      useGps: false // When setting manual location, disable GPS
    };
    
    // Add to history if not already there
    this.addToLocationHistory(location);
    
    this.savePreferences(updated);
  }

  /**
   * Clear preferred location (will fall back to GPS or default)
   */
  clearPreferredLocation(): void {
    const current = this.getCurrentPreferences();
    const updated: LocationPreferences = {
      ...current,
      preferredLocation: undefined,
      useGps: true // Re-enable GPS when clearing manual location
    };
    this.savePreferences(updated);
  }

  /**
   * Add location to history
   */
  addToLocationHistory(location: SavedLocation): void {
    const current = this.getCurrentPreferences();
    
    // Remove duplicate if exists
    const filteredHistory = current.locationHistory.filter(
      item => item.id !== location.id
    );
    
    // Add to beginning of array
    const updatedHistory = [location, ...filteredHistory];
    
    // Limit history size
    if (updatedHistory.length > this.maxHistoryItems) {
      updatedHistory.splice(this.maxHistoryItems);
    }
    
    const updated: LocationPreferences = {
      ...current,
      locationHistory: updatedHistory
    };
    this.savePreferences(updated);
  }

  /**
   * Remove location from history
   */
  removeFromLocationHistory(locationId: string): void {
    const current = this.getCurrentPreferences();
    const updated: LocationPreferences = {
      ...current,
      locationHistory: current.locationHistory.filter(item => item.id !== locationId)
    };
    this.savePreferences(updated);
  }

  /**
   * Add location to favorites
   */
  addToFavorites(location: SavedLocation): void {
    const current = this.getCurrentPreferences();
    
    // Check if already in favorites
    if (current.favorites.find(item => item.id === location.id)) {
      return;
    }
    
    const updatedFavorites = [...current.favorites, location];
    
    // Limit favorites size
    if (updatedFavorites.length > this.maxFavoriteItems) {
      updatedFavorites.splice(0, 1); // Remove oldest favorite
    }
    
    const updated: LocationPreferences = {
      ...current,
      favorites: updatedFavorites
    };
    this.savePreferences(updated);
  }

  /**
   * Remove location from favorites
   */
  removeFromFavorites(locationId: string): void {
    const current = this.getCurrentPreferences();
    const updated: LocationPreferences = {
      ...current,
      favorites: current.favorites.filter(item => item.id !== locationId)
    };
    this.savePreferences(updated);
  }

  /**
   * Check if location is in favorites
   */
  isLocationFavorite(locationId: string): boolean {
    return this.getCurrentPreferences().favorites.some(item => item.id === locationId);
  }

  /**
   * Set fallback coordinates
   */
  setFallbackCoordinates(coordinates: LocationCoordinates): void {
    const current = this.getCurrentPreferences();
    const updated: LocationPreferences = {
      ...current,
      fallbackCoordinates: coordinates
    };
    this.savePreferences(updated);
  }

  /**
   * Get effective location to use for weather
   * Returns coordinates based on preferences priority:
   * 1. Preferred location (if GPS disabled)
   * 2. GPS location (if enabled and available)
   * 3. Fallback coordinates
   */
  getEffectiveLocationCoordinates(): LocationCoordinates {
    const preferences = this.getCurrentPreferences();
    
    // If GPS is disabled and we have a preferred location, use it
    if (!preferences.useGps && preferences.preferredLocation) {
      return preferences.preferredLocation.coordinates;
    }
    
    // For GPS locations, the calling code should handle GPS lookup
    // Return fallback coordinates as default
    return preferences.fallbackCoordinates;
  }

  /**
   * Get saved location by ID
   */
  getLocationById(locationId: string): SavedLocation | undefined {
    const current = this.getCurrentPreferences();
    
    // Check in history first
    let location = current.locationHistory.find(item => item.id === locationId);
    if (location) return location;
    
    // Check in favorites
    location = current.favorites.find(item => item.id === locationId);
    if (location) return location;
    
    // Check if it's the preferred location
    if (current.preferredLocation?.id === locationId) {
      return current.preferredLocation;
    }
    
    return undefined;
  }

  /**
   * Create a saved location from coordinates and name
   */
  createSavedLocation(name: string, coordinates: LocationCoordinates, isCustom: boolean = true): SavedLocation {
    return {
      id: this.generateLocationId(coordinates),
      name,
      coordinates,
      timestamp: Date.now(),
      isCustom
    };
  }

  /**
   * Generate unique ID for location based on coordinates
   */
  private generateLocationId(coordinates: LocationCoordinates): string {
    const lat = Math.round(coordinates.latitude * 1000) / 1000;
    const lng = Math.round(coordinates.longitude * 1000) / 1000;
    return `${lat},${lng}`;
  }

  /**
   * Clear all location data
   */
  clearAllLocationData(): void {
    this.resetToDefaults();
  }

  /**
   * Clear specific data types
   */
  clearLocationHistory(): void {
    const current = this.getCurrentPreferences();
    const updated: LocationPreferences = {
      ...current,
      locationHistory: []
    };
    this.savePreferences(updated);
  }

  clearFavorites(): void {
    const current = this.getCurrentPreferences();
    const updated: LocationPreferences = {
      ...current,
      favorites: []
    };
    this.savePreferences(updated);
  }

  /**
   * Reset to default preferences
   */
  resetToDefaults(): void {
    const defaults = this.getDefaultPreferences();
    this.savePreferences(defaults);
  }

  /**
   * Get preferences statistics
   */
  getPreferencesStats(): {
    historyCount: number;
    favoritesCount: number;
    hasPreferredLocation: boolean;
    gpsEnabled: boolean;
  } {
    const current = this.getCurrentPreferences();
    return {
      historyCount: current.locationHistory.length,
      favoritesCount: current.favorites.length,
      hasPreferredLocation: !!current.preferredLocation,
      gpsEnabled: current.useGps
    };
  }
}