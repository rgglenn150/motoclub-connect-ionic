import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { WeatherService } from '../../service/weather.service';
import { LocationPreferencesService } from '../../service/location-preferences.service';
import { PlacesService } from '../../service/places.service';
import { WeatherData } from '../../models/weather.model';
import { Subscription, timer } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { LocationPreferencesComponent } from '../location-preferences/location-preferences.component';

@Component({
  selector: 'app-weather-widget',
  templateUrl: './weather-widget.component.html',
  styleUrls: ['./weather-widget.component.scss']
})
export class WeatherWidgetComponent implements OnInit, OnDestroy {
  @Input() showForecast: boolean = false;
  @Input() autoRefresh: boolean = true;
  @Input() refreshInterval: number = 600000; // 10 minutes in milliseconds
  @Input() fallbackLatitude?: number;
  @Input() fallbackLongitude?: number;

  weatherData: WeatherData | null = null;
  isLoading: boolean = true;
  hasError: boolean = false;
  errorMessage: string = '';
  lastUpdated: Date | null = null;
  
  // Network status properties (mock for now - these would come from NetworkService)
  networkStatus = { online: true };
  connectionQuality = { quality: 'good', icon: 'wifi-outline', color: 'success', description: 'Good connection' };
  isUsingCachedData = false;
  dataAge = 0;
  
  private refreshSubscription?: Subscription;
  private destroy$ = new Subject<void>();

  constructor(
    private weatherService: WeatherService,
    private locationPreferencesService: LocationPreferencesService,
    private placesService: PlacesService,
    private modalController: ModalController
  ) {}

  ngOnInit(): void {
    // Subscribe to location preferences changes
    this.locationPreferencesService.preferences$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Reload weather data when preferences change
        this.loadWeatherData();
      });
    
    this.loadWeatherData();
    this.setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  /**
   * Load weather data with location preferences integration
   */
  loadWeatherData(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    const preferences = this.locationPreferencesService.getCurrentPreferences();
    let weatherObservable;

    // Determine location strategy based on preferences
    if (!preferences.useGps && preferences.preferredLocation) {
      // Use preferred location
      const coords = preferences.preferredLocation.coordinates;
      weatherObservable = this.weatherService.getCurrentWeather(coords.latitude, coords.longitude);
    } else if (preferences.useGps) {
      // Use GPS with fallback
      weatherObservable = this.fallbackLatitude && this.fallbackLongitude
        ? this.weatherService.getWeatherWithFallback(this.fallbackLatitude, this.fallbackLongitude)
        : this.weatherService.getCurrentWeatherForCurrentLocation();
    } else {
      // Use fallback coordinates
      const fallback = preferences.fallbackCoordinates;
      weatherObservable = this.weatherService.getCurrentWeather(fallback.latitude, fallback.longitude);
    }

    weatherObservable.subscribe({
      next: (data: WeatherData) => {
        this.weatherData = data;
        this.lastUpdated = new Date();
        this.isLoading = false;
        this.hasError = false;
      },
      error: (error) => {
        console.error('Weather widget error:', error);
        this.hasError = true;
        this.errorMessage = error.message || 'Unable to load weather data';
        this.isLoading = false;
      }
    });
  }

  /**
   * Manually refresh weather data
   */
  refreshWeatherData(): void {
    this.loadWeatherData();
  }

  /**
   * Setup automatic refresh timer with location preferences integration
   */
  private setupAutoRefresh(): void {
    if (this.autoRefresh && this.refreshInterval > 0) {
      this.refreshSubscription = timer(this.refreshInterval, this.refreshInterval)
        .pipe(
          switchMap(() => {
            const preferences = this.locationPreferencesService.getCurrentPreferences();
            
            if (!preferences.useGps && preferences.preferredLocation) {
              // Use preferred location
              const coords = preferences.preferredLocation.coordinates;
              return this.weatherService.getCurrentWeather(coords.latitude, coords.longitude);
            } else if (preferences.useGps) {
              // Use GPS with fallback
              return this.fallbackLatitude && this.fallbackLongitude
                ? this.weatherService.getWeatherWithFallback(this.fallbackLatitude, this.fallbackLongitude)
                : this.weatherService.getCurrentWeatherForCurrentLocation();
            } else {
              // Use fallback coordinates
              const fallback = preferences.fallbackCoordinates;
              return this.weatherService.getCurrentWeather(fallback.latitude, fallback.longitude);
            }
          }),
          takeUntil(this.destroy$)
        )
        .subscribe({
          next: (data: WeatherData) => {
            this.weatherData = data;
            this.lastUpdated = new Date();
            this.hasError = false;
          },
          error: (error) => {
            console.error('Auto-refresh weather error:', error);
            // Don't show error state during auto-refresh, keep existing data
          }
        });
    }
  }

  /**
   * Get formatted location name with preference indication
   */
  get locationName(): string {
    if (!this.weatherData) return '';
    
    const preferences = this.locationPreferencesService.getCurrentPreferences();
    
    // If using preferred location, show its name
    if (!preferences.useGps && preferences.preferredLocation) {
      return preferences.preferredLocation.name;
    }
    
    // For GPS or other locations, use weather data location name
    if (this.weatherData.location.name) {
      return this.weatherData.location.name;
    }
    
    // Fallback to coordinates
    const lat = this.weatherData.location.latitude.toFixed(1);
    const lng = this.weatherData.location.longitude.toFixed(1);
    return `${lat}°, ${lng}°`;
  }

  /**
   * Get temperature display text
   */
  get temperatureText(): string {
    if (!this.weatherData) return '--°';
    return `${this.weatherData.temperature.current}°C`;
  }

  /**
   * Get weather condition description
   */
  get conditionText(): string {
    return this.weatherData?.conditions.description || 'Unknown';
  }

  /**
   * Get weather icon name
   */
  get iconName(): string {
    return this.weatherData?.conditions.iconName || 'help-outline';
  }

  /**
   * Get formatted last updated time
   */
  get lastUpdatedText(): string {
    if (!this.lastUpdated) return '';
    return this.lastUpdated.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Update data freshness indicators
   */
  private updateDataFreshness(): void {
    if (this.lastUpdated) {
      this.dataAge = Date.now() - this.lastUpdated.getTime();
    }
  }

  /**
   * Determine if current data is from cache
   */
  private determineDataSource(): void {
    if (!this.networkStatus.online && this.weatherData) {
      this.isUsingCachedData = true;
    } else if (this.networkStatus.online) {
      // Check if data is relatively fresh (less than 5 minutes old)
      const fiveMinutes = 5 * 60 * 1000;
      this.isUsingCachedData = this.dataAge > fiveMinutes;
    }
  }

  /**
   * Get contextual error message based on network state
   */
  private getContextualErrorMessage(originalMessage: string): string {
    if (!this.networkStatus.online) {
      return 'No internet connection. Weather data unavailable.';
    }
    
    if (this.connectionQuality.quality === 'poor') {
      return 'Poor connection. Unable to load weather data.';
    }
    
    if (this.connectionQuality.quality === 'fair') {
      return 'Slow connection. Weather service timed out.';
    }
    
    return originalMessage || 'Unable to load weather data';
  }

  /**
   * Get data freshness indicator
   */
  get dataFreshnessText(): string {
    if (!this.lastUpdated) return '';
    
    const minutes = Math.floor(this.dataAge / (1000 * 60));
    
    if (minutes < 1) {
      return 'Just updated';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else {
      const hours = Math.floor(minutes / 60);
      return `${hours}h ago`;
    }
  }

  /**
   * Get network status icon
   */
  get networkStatusIcon(): string {
    if (!this.networkStatus.online) {
      return 'cloud-offline-outline';
    }
    
    return this.connectionQuality.icon;
  }

  /**
   * Get network status color
   */
  get networkStatusColor(): string {
    if (!this.networkStatus.online) {
      return 'danger';
    }
    
    return this.connectionQuality.color;
  }

  /**
   * Check if data is stale (older than 15 minutes)
   */
  get isDataStale(): boolean {
    const fifteenMinutes = 15 * 60 * 1000;
    return this.dataAge > fifteenMinutes;
  }

  /**
   * Get refresh button state
   */
  get canRefresh(): boolean {
    return this.networkStatus.online && !this.isLoading;
  }

  /**
   * Get status message for current data state
   */
  get statusMessage(): string {
    if (!this.networkStatus.online) {
      if (this.weatherData) {
        return 'Offline - showing cached data';
      } else {
        return 'Offline - no cached data available';
      }
    }
    
    if (this.connectionQuality.quality === 'poor') {
      return 'Poor connection - updates may be slow';
    }
    
    if (this.isUsingCachedData && this.isDataStale) {
      return 'Using older cached data';
    }
    
    return '';
  }

  /**
   * Open location preferences modal
   */
  async openLocationPreferences(): Promise<void> {
    const modal = await this.modalController.create({
      component: LocationPreferencesComponent,
      cssClass: 'location-preferences-modal'
    });
    
    await modal.present();
  }

  /**
   * Get location source indicator text
   */
  get locationSourceIndicator(): string {
    const preferences = this.locationPreferencesService.getCurrentPreferences();
    
    if (!preferences.useGps && preferences.preferredLocation) {
      return 'Using preferred location';
    } else if (preferences.useGps) {
      return 'Using GPS location';
    } else {
      return 'Using default location';
    }
  }

  /**
   * Get location source icon
   */
  get locationSourceIcon(): string {
    const preferences = this.locationPreferencesService.getCurrentPreferences();
    
    if (!preferences.useGps && preferences.preferredLocation) {
      return 'star-outline';
    } else if (preferences.useGps) {
      return 'navigate-outline';
    } else {
      return 'location-outline';
    }
  }
}