import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
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
  styleUrls: ['./weather-widget.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
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

  // Flip animation state
  isFlipped: boolean = false;
  
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
    private modalController: ModalController,
    private cdr: ChangeDetectorRef
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
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Weather widget error:', error);
        this.hasError = true;
        this.errorMessage = error.message || 'Unable to load weather data';
        this.isLoading = false;
        this.cdr.markForCheck();
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
            this.cdr.markForCheck();
          },
          error: (error) => {
            console.error('Auto-refresh weather error:', error);
            // Don't show error state during auto-refresh, keep existing data
            this.cdr.markForCheck();
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
   * Get weather icon name (legacy - kept for compatibility)
   */
  get iconName(): string {
    return this.weatherData?.conditions.iconName || 'help-outline';
  }

  /**
   * Get weather icon type for custom SVG icons
   */
  get iconType(): string {
    if (!this.weatherData) {
      return 'default';
    }

    const code = this.weatherData.conditions.code;

    if (code === 0) return 'sunny';
    if (code >= 1 && code <= 2) return 'partly-cloudy';
    if (code === 3) return 'cloudy';
    if (code >= 45 && code <= 48) return 'fog';
    if (code >= 51 && code <= 57) return 'rain'; // Drizzle is categorized as rain
    if (code >= 61 && code <= 67) return 'rain';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 80 && code <= 82) return 'showers';
    if (code >= 85 && code <= 86) return 'snow';
    if (code >= 95 && code <= 99) return 'thunderstorm';

    return 'default';
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
  getContextualErrorMessage(originalMessage: string): string {
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

  /**
   * Get dynamic background class based on weather conditions
   */
  get weatherBackgroundClass(): string {
    if (!this.weatherData || this.isLoading || this.hasError) {
      return 'weather-bg-default';
    }

    const code = this.weatherData.conditions.code;

    if (code === 0) return 'weather-bg-clear';
    if (code >= 1 && code <= 2) return 'weather-bg-partly-cloudy';
    if (code === 3) return 'weather-bg-cloudy';
    if (code >= 45 && code <= 48) return 'weather-bg-fog';
    if (code >= 51 && code <= 57) return 'weather-bg-drizzle';
    if (code >= 61 && code <= 67) return 'weather-bg-rain';
    if (code >= 71 && code <= 77) return 'weather-bg-snow';
    if (code >= 80 && code <= 82) return 'weather-bg-showers';
    if (code >= 95 && code <= 99) return 'weather-bg-thunderstorm';

    return 'weather-bg-default';
  }

  /**
   * Toggle the flip state of the weather widget
   */
  toggleFlip(): void {
    if (!this.isLoading && !this.hasError) {
      this.isFlipped = !this.isFlipped;
      this.cdr.markForCheck();
    }
  }

  /**
   * Get descriptive text for humidity levels
   */
  getHumidityDescription(humidity: number): string {
    if (humidity < 30) return 'Very dry';
    if (humidity < 60) return 'Comfortable';
    if (humidity < 80) return 'Humid';
    return 'Very humid';
  }

  /**
   * Get descriptive text for wind speed
   */
  getWindDescription(windSpeed: number): string {
    if (windSpeed < 5) return 'Calm';
    if (windSpeed < 15) return 'Light breeze';
    if (windSpeed < 25) return 'Moderate breeze';
    if (windSpeed < 40) return 'Strong breeze';
    if (windSpeed < 60) return 'High wind';
    return 'Very high wind';
  }
  
  /**
   * Get descriptive text for atmospheric pressure
   */
  getPressureDescription(pressure: number): string {
    if (pressure < 1000) return 'Low pressure';
    if (pressure < 1020) return 'Normal pressure';
    if (pressure < 1030) return 'High pressure';
    return 'Very high pressure';
  }

  /**
   * Get descriptive text for visibility
   */
  getVisibilityDescription(visibility: number): string {
    if (visibility < 1) return 'Very poor';
    if (visibility < 5) return 'Poor';
    if (visibility < 10) return 'Moderate';
    if (visibility < 20) return 'Good';
    return 'Excellent';
  }

  /**
   * Get descriptive text for UV Index
   */
  getUVIndexDescription(uvIndex: number): string {
    if (uvIndex <= 2) return 'Low';
    if (uvIndex <= 5) return 'Moderate';
    if (uvIndex <= 7) return 'High';
    if (uvIndex <= 10) return 'Very high';
    return 'Extreme';
  }

  /**
   * Check if forecast data is available
   */
  get hasForecast(): boolean {
    return !!(this.weatherData?.forecast && this.weatherData.forecast.length > 0);
  }

  /**
   * Get weather icon type for forecast item
   */
  getForecastIconType(code: number): string {
    if (code === 0) return 'sunny';
    if (code >= 1 && code <= 2) return 'partly-cloudy';
    if (code === 3) return 'cloudy';
    if (code >= 45 && code <= 48) return 'fog';
    if (code >= 51 && code <= 57) return 'rain';
    if (code >= 61 && code <= 67) return 'rain';
    if (code >= 71 && code <= 77) return 'snow';
    if (code >= 80 && code <= 82) return 'showers';
    if (code >= 85 && code <= 86) return 'snow';
    if (code >= 95 && code <= 99) return 'thunderstorm';
    return 'default';
  }
  
  /**
   * Get short description for forecast
   */
  getForecastShortDescription(description: string): string {
    const shortcuts: { [key: string]: string } = {
      'Clear sky': 'Clear',
      'Mainly clear': 'Mostly Clear',
      'Partly cloudy': 'Partly Cloudy',
      'Overcast': 'Cloudy',
      'Light drizzle': 'Light Rain',
      'Moderate drizzle': 'Rain',
      'Dense drizzle': 'Heavy Rain',
      'Slight rain': 'Light Rain',
      'Moderate rain': 'Rain',
      'Heavy rain': 'Heavy Rain',
      'Slight snow fall': 'Light Snow',
      'Moderate snow fall': 'Snow',
      'Heavy snow fall': 'Heavy Snow',
      'Slight rain showers': 'Showers',
      'Moderate rain showers': 'Showers',
      'Violent rain showers': 'Heavy Showers',
      'Thunderstorm': 'Storms'
    };
    return shortcuts[description] || description;
  }

  /**
   * TrackBy function for forecast ngFor performance optimization
   */
  trackForecastDay(index: number, day: any): string {
    return day.date;
  }
}