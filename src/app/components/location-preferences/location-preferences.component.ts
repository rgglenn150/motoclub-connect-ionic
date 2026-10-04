import { Component, OnInit, OnDestroy } from '@angular/core';
import { ModalController, ToastController, AlertController } from '@ionic/angular';
import { LocationPreferencesService, LocationPreferences, SavedLocation, LocationCoordinates } from '../../service/location-preferences.service';
import { PlacesService } from '../../service/places.service';
import { LocationData } from '../mapbox-autocomplete/mapbox-autocomplete.component';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-location-preferences',
  templateUrl: './location-preferences.component.html',
  styleUrls: ['./location-preferences.component.scss']
})
export class LocationPreferencesComponent implements OnInit, OnDestroy {
  preferences: LocationPreferences;
  isLoadingGps = false;
  currentGpsLocation: LocationCoordinates | null = null;
  searchQuery = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private alertController: AlertController,
    private locationPreferencesService: LocationPreferencesService,
    private placesService: PlacesService
  ) {
    this.preferences = this.locationPreferencesService.getCurrentPreferences();
  }

  ngOnInit() {
    // Subscribe to preferences changes
    this.locationPreferencesService.preferences$
      .pipe(takeUntil(this.destroy$))
      .subscribe(preferences => {
        this.preferences = preferences;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Close the modal
   */
  async closeModal() {
    await this.modalController.dismiss();
  }

  /**
   * Toggle GPS usage
   */
  onGpsToggleChange(event: any) {
    const useGps = event.detail.checked;
    this.locationPreferencesService.toggleGpsUsage(useGps);
    
    if (useGps) {
      this.showToast('GPS location enabled');
    } else {
      this.showToast('Manual location mode enabled');
    }
  }

  /**
   * Get current GPS location
   */
  async getCurrentGpsLocation() {
    this.isLoadingGps = true;
    
    try {
      const location = await this.placesService.getCurrentLocation();
      if (location) {
        this.currentGpsLocation = {
          latitude: location.lat,
          longitude: location.lng
        };
        
        // Try to get location name via reverse geocoding
        const locationName = await this.placesService.reverseGeocode(location.lat, location.lng);
        const displayName = locationName || `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`;
        
        this.showToast(`Current location: ${displayName}`);
      } else {
        this.showToast('Unable to get GPS location', 'warning');
      }
    } catch (error) {
      console.error('Error getting GPS location:', error);
      this.showToast('Error accessing GPS location', 'danger');
    } finally {
      this.isLoadingGps = false;
    }
  }

  /**
   * Handle location selection from search
   */
  onLocationSelected(locationData: LocationData) {
    const savedLocation = this.locationPreferencesService.createSavedLocation(
      locationData.placeName,
      {
        latitude: locationData.latitude,
        longitude: locationData.longitude
      },
      true
    );
    
    this.setAsPreferredLocation(savedLocation);
    this.searchQuery = ''; // Clear search after selection
  }

  /**
   * Set a location as preferred
   */
  setAsPreferredLocation(location: SavedLocation) {
    this.locationPreferencesService.setPreferredLocation(location);
    this.showToast(`Preferred location set to ${location.name}`);
  }

  /**
   * Clear preferred location
   */
  async clearPreferredLocation() {
    const alert = await this.alertController.create({
      header: 'Clear Preferred Location',
      message: 'This will enable GPS location mode. Continue?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Clear',
          handler: () => {
            this.locationPreferencesService.clearPreferredLocation();
            this.showToast('Preferred location cleared');
          }
        }
      ]
    });
    
    await alert.present();
  }

  /**
   * Use current GPS location as preferred
   */
  async useCurrentLocationAsPreferred() {
    if (!this.currentGpsLocation) {
      await this.getCurrentGpsLocation();
    }
    
    if (this.currentGpsLocation) {
      try {
        // Try to get a readable name for the location
        const locationName = await this.placesService.reverseGeocode(
          this.currentGpsLocation.latitude, 
          this.currentGpsLocation.longitude
        );
        
        const displayName = locationName || `${this.currentGpsLocation.latitude.toFixed(4)}, ${this.currentGpsLocation.longitude.toFixed(4)}`;
        
        const savedLocation = this.locationPreferencesService.createSavedLocation(
          displayName,
          this.currentGpsLocation,
          false // This is a GPS location, not custom
        );
        
        this.setAsPreferredLocation(savedLocation);
      } catch (error) {
        console.error('Error setting GPS location as preferred:', error);
        this.showToast('Error setting GPS location', 'danger');
      }
    }
  }

  /**
   * Select location from history
   */
  selectFromHistory(location: SavedLocation) {
    this.setAsPreferredLocation(location);
  }

  /**
   * Select location from favorites
   */
  selectFromFavorites(location: SavedLocation) {
    this.setAsPreferredLocation(location);
  }

  /**
   * Add location to favorites
   */
  addToFavorites(location: SavedLocation) {
    this.locationPreferencesService.addToFavorites(location);
    this.showToast(`${location.name} added to favorites`);
  }

  /**
   * Remove location from favorites
   */
  async removeFromFavorites(location: SavedLocation) {
    const alert = await this.alertController.create({
      header: 'Remove Favorite',
      message: `Remove ${location.name} from favorites?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Remove',
          handler: () => {
            this.locationPreferencesService.removeFromFavorites(location.id);
            this.showToast(`${location.name} removed from favorites`);
          }
        }
      ]
    });
    
    await alert.present();
  }

  /**
   * Remove location from history
   */
  async removeFromHistory(location: SavedLocation) {
    const alert = await this.alertController.create({
      header: 'Remove from History',
      message: `Remove ${location.name} from history?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Remove',
          handler: () => {
            this.locationPreferencesService.removeFromLocationHistory(location.id);
            this.showToast(`${location.name} removed from history`);
          }
        }
      ]
    });
    
    await alert.present();
  }

  /**
   * Check if location is in favorites
   */
  isLocationFavorite(locationId: string): boolean {
    return this.locationPreferencesService.isLocationFavorite(locationId);
  }

  /**
   * Clear all location history
   */
  async clearAllHistory() {
    const alert = await this.alertController.create({
      header: 'Clear History',
      message: 'Remove all locations from history?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Clear',
          handler: () => {
            this.locationPreferencesService.clearLocationHistory();
            this.showToast('Location history cleared');
          }
        }
      ]
    });
    
    await alert.present();
  }

  /**
   * Clear all favorites
   */
  async clearAllFavorites() {
    const alert = await this.alertController.create({
      header: 'Clear Favorites',
      message: 'Remove all favorite locations?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Clear',
          handler: () => {
            this.locationPreferencesService.clearFavorites();
            this.showToast('Favorites cleared');
          }
        }
      ]
    });
    
    await alert.present();
  }

  /**
   * Reset all location preferences
   */
  async resetAllPreferences() {
    const alert = await this.alertController.create({
      header: 'Reset Preferences',
      message: 'Reset all location preferences to defaults? This will clear your preferred location, history, and favorites.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Reset',
          handler: () => {
            this.locationPreferencesService.resetToDefaults();
            this.showToast('Location preferences reset');
          }
        }
      ]
    });
    
    await alert.present();
  }

  /**
   * Get formatted location display
   */
  getLocationDisplay(location: SavedLocation): string {
    return location.name;
  }

  /**
   * Get location type icon
   */
  getLocationTypeIcon(location: SavedLocation): string {
    return location.isCustom ? 'location-outline' : 'navigate-outline';
  }

  /**
   * Get relative time for location history
   */
  getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'top',
      color
    });
    await toast.present();
  }
}