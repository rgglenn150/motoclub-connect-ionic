import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core'; // Added ChangeDetectionStrategy and ChangeDetectorRef
import { WeatherService } from '../../service/weather.service';
import { LocationPreferencesService } from '../../service/location-preferences.service'; // Assuming you have this service
import { WeatherData } from '../../models/weather.model';
import { Subject, takeUntil } from 'rxjs'; // Added Subject and takeUntil
import { GeolocationService } from 'src/app/service/geolocation.service';
import {
  PlacesService,
  EnhancedLocation,
  LocationOptions,
  GeolocationError,
} from '../../service/places.service';

// Represents the evaluated verdict for the rider
interface RidingConditions {
  verdict: 'Great' | 'Caution' | 'Poor';
  title: string;
  advice: string;
  icon: string; // Ionic icon name
  animatedIconType: string; // Custom animated icon type
  colorClass: string;
}

// Location metadata for UI display
interface LocationMetadata {
  accuracy?: number;
  confidence?: 'high' | 'medium' | 'low';
  source?: 'capacitor' | 'browser' | 'cached' | 'default';
  timestamp?: number;
  permissionStatus?: 'granted' | 'denied' | 'prompt' | 'unknown';
  serviceAvailable?: boolean;
}

@Component({
  selector: 'app-weather-widget2',
  templateUrl: './weather-widget2.component.html',
  styleUrls: ['./weather-widget2.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, // Optimize change detection
})
export class WeatherWidget2Component implements OnInit, OnDestroy {
  // --- Properties ---
  public isLoading: boolean = true;
  public hasError: boolean = false;
  public errorMessage: string = '';
  public isGettingLocation: boolean = false; // New property for location loading state

  public currentWeather!: WeatherData;
  public ridingConditions!: RidingConditions;
  public lastUpdated: Date | null = null; // Changed to Date | null
  public locationName: string = 'Loading...'; // Default loading state for location

  // Enhanced location properties
  public locationMetadata: LocationMetadata = {};
  public showLocationDetails: boolean = false;
  public locationRefreshType: 'fast' | 'accurate' = 'fast';
  public isLocationServiceAvailable: boolean = true;

  private destroy$ = new Subject<void>();
  private enhancedLocation: EnhancedLocation | null = null;

  constructor(
    private weatherService: WeatherService,
    private locationPreferencesService: LocationPreferencesService, // Inject LocationPreferencesService
    private cdr: ChangeDetectorRef, // Inject ChangeDetectorRef
    private geolocationService: GeolocationService,
    private placesService: PlacesService
  ) {}

  async ngOnInit() {
    // Check location service availability and permissions
    await this.initializeLocationServices();

    // Subscribe to location preferences changes
    this.locationPreferencesService.preferences$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Reload weather data when preferences change
        this.fetchWeatherData();
      });

    this.fetchWeatherData();
  }

  /**
   * Initialize location services and check availability
   */
  private async initializeLocationServices(): Promise<void> {
    try {
      // Check if location services are available
      this.locationMetadata.serviceAvailable =
        await this.placesService.isLocationServiceAvailable();
      this.isLocationServiceAvailable = this.locationMetadata.serviceAvailable;

      // Check permission status
      this.locationMetadata.permissionStatus =
        await this.placesService.getLocationPermissionStatus();

      // Update UI
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error initializing location services:', error);
      this.isLocationServiceAvailable = false;
      this.locationMetadata.serviceAvailable = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Fetches weather data using the WeatherService and updates component state.
   * Now includes enhanced location services integration with detailed metadata.
   */
  public async fetchWeatherData(
    useHighAccuracy: boolean = false
  ): Promise<void> {
    this.isLoading = true;
    this.hasError = false;
    this.locationName = 'Loading...'; // Reset location name
    this.cdr.markForCheck();

    const preferences = this.locationPreferencesService.getCurrentPreferences();
    let weatherObservable;

    // Check if we should try to get fresh location data
    if (preferences.useGps) {
      try {
        this.isGettingLocation = true;
        this.cdr.markForCheck();

        console.log('Attempting to get enhanced location...');

        // Use enhanced location with appropriate accuracy
        const currentLocation = useHighAccuracy
          ? await this.placesService.getHighAccuracyLocation()
          : await this.placesService.getFastLocation();

        if (currentLocation) {
          console.log('Got enhanced location:', currentLocation);
          this.enhancedLocation = currentLocation;
          this.updateLocationMetadata(currentLocation);

          // Use fresh location coordinates
          weatherObservable = this.weatherService.getCurrentWeather(
            currentLocation.lat,
            currentLocation.lng
          );
        } else {
          console.log(
            'Failed to get current location, falling back to service default'
          );
          this.handleLocationError('Unable to obtain current location');
          // Fallback to weather service default location handling
          weatherObservable =
            this.weatherService.getCurrentWeatherForCurrentLocation();
        }
      } catch (error) {
        console.warn('Error getting current location:', error);
        this.handleLocationError(error as Error);
        // Fallback to weather service default location handling
        weatherObservable =
          this.weatherService.getCurrentWeatherForCurrentLocation();
      } finally {
        this.isGettingLocation = false;
        this.cdr.markForCheck();
      }
    } else if (preferences.preferredLocation) {
      // Use preferred location from settings
      const coords = preferences.preferredLocation.coordinates;
      this.locationMetadata.source = 'default';
      this.locationMetadata.confidence = 'high'; // User-selected location
      weatherObservable = this.weatherService.getCurrentWeather(
        coords.latitude,
        coords.longitude
      );
    } else {
      // Default to service's current location handling
      this.locationMetadata.source = 'default';
      weatherObservable =
        this.weatherService.getCurrentWeatherForCurrentLocation();
    }

    // Subscribe to weather data
    weatherObservable.subscribe({
      next: (data) => {
        this.currentWeather = data;
        console.log('Weather data received:', data.location);

        // Get human-readable address for the location
        this.geolocationService
          .reverseGeocode(data.location.latitude, data.location.longitude)
          .subscribe((address) => {
            console.log('Reverse geocoded address:', address);
            if (address) {
              this.locationName = address;
            } else {
              this.locationName =
                data.location.name ||
                `${data.location.latitude.toFixed(
                  1
                )}°, ${data.location.longitude.toFixed(1)}°`;
            }
            this.cdr.markForCheck();
          });

        this.ridingConditions = this.evaluateRidingConditions(data);
        this.lastUpdated = new Date();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to fetch weather data:', err);
        this.handleWeatherError(err);
      },
    });
  }

  /**
   * Update location metadata from enhanced location
   */
  private updateLocationMetadata(location: EnhancedLocation): void {
    this.locationMetadata = {
      ...this.locationMetadata,
      accuracy: location.accuracy,
      confidence: location.confidence,
      source: location.source,
      timestamp: location.timestamp,
    };
  }

  /**
   * Handle location-specific errors with appropriate user feedback
   */
  private handleLocationError(error: Error | string): void {
    const errorMessage = typeof error === 'string' ? error : error.message;

    // Update location metadata with error state
    this.locationMetadata.confidence = 'low';

    console.warn('Location error:', errorMessage);

    // Don't show location errors as main errors since we fall back to default weather
    // Just log them for debugging
  }

  /**
   * Handle weather service errors with enhanced feedback
   */
  private handleWeatherError(error: any): void {
    console.error('Failed to fetch weather data:', error);

    // Enhanced error messages based on error type
    let userMessage = 'Could not load weather. Please try again.';

    if (error.message && error.message.includes('location')) {
      userMessage =
        'Unable to determine your location. Please check location permissions and try again.';
    } else if (error.message && error.message.includes('network')) {
      userMessage =
        'Network connection error. Please check your internet connection.';
    } else if (error.status === 403) {
      userMessage = 'Weather service access denied. Please try again later.';
    }

    this.errorMessage = userMessage;
    this.hasError = true;
    this.isLoading = false;
    this.isGettingLocation = false;
    this.cdr.markForCheck();
  }

  /**
   * Analyzes real weather data to determine if it's a good day to ride.
   * @param weather - The WeatherData object from the service.
   * @returns A RidingConditions object with a verdict and advice.
   */
  private evaluateRidingConditions(weather: WeatherData): RidingConditions {
    const todayForecast =
      weather.forecast && weather.forecast.length > 0
        ? weather.forecast[0]
        : null;
    const chanceOfRain = todayForecast?.precipitationChance ?? 0;
    const windSpeed = weather.metrics.windSpeed ?? 0;
    const feelsLike =
      weather.temperature.feelsLike ?? weather.temperature.current; // Fallback for feelsLike
    const weatherCode = weather.conditions.code;
    console.log(
      'rgd. chance of raind ',
      chanceOfRain,
      ' weather code ',
      weatherCode
    );
    // POOR conditions: High chance of rain or dangerous weather
    if (chanceOfRain > 40 ) {
      // WMO codes for showers/thunderstorms

      if (weatherCode >= 45 && weatherCode <= 48) {
        return {
          verdict: 'Caution',
          title: 'Ride With Care',
          advice: 'Roads might be foggy. Be careful!',
          icon: 'umbrella',
          animatedIconType: this.getAnimatedIconType(weatherCode),
          colorClass: 'condition-caution',
        };
      } else if (weatherCode >= 51 && weatherCode <= 57) {
        let intensity = '';
        if (weatherCode === 51) {
          intensity = 'Light ';
        } else if (weatherCode === 53) {
          intensity = 'Moderate ';
        } else if (weatherCode === 55) {
          intensity = 'Dense ';
        } else if (weatherCode === 56 || weatherCode === 57) {
          intensity = 'Freezing ';
        }
        return {
          verdict: 'Caution',
          title: 'Ride With Care',
          advice:
            'Slight chance of ' +
            intensity +
            ' rain. Bring your raincoat just in case!',
          icon: 'umbrella',
          animatedIconType: this.getAnimatedIconType(weatherCode),
          colorClass: 'condition-caution',
        };
      } else if (weatherCode >= 61 && weatherCode <= 67) {
        let intensity = '';
        if (weatherCode === 61) {
          intensity = 'Slight ';
        } else if (weatherCode === 63) {
          intensity = 'Moderate ';
        } else if (weatherCode === 65) {
          intensity = 'Heavy ';
        } else {
          intensity = 'Freezing ';
        }
        return {
          verdict: 'Caution',
          title: 'Ride With Care',
          advice: intensity + ' rain. Bring your raincoat if you must go!',
          icon: 'umbrella',
          animatedIconType: this.getAnimatedIconType(weatherCode),
          colorClass: 'condition-caution',
        };
      } else if (weatherCode >= 80 && weatherCode <= 82) {
        let intensity = '';
        if (weatherCode === 80) {
          intensity = 'Slight ';
        } else if (weatherCode === 81) {
          intensity = 'Moderate ';
        } else if (weatherCode === 82) {
          intensity = 'Violent ';
        }
        return {
          verdict: 'Poor',
          title: 'Ride With Caution',
          advice:
            intensity + ' rain expected. Wear your raincoat if you must go!',
          icon: 'umbrella',
          animatedIconType: this.getAnimatedIconType(weatherCode),
          colorClass: 'condition-poor',
        };
      }
    }

    // CAUTION conditions: Strong wind, extreme heat, or fog
    if (windSpeed > 35) {
      return {
        verdict: 'Caution',
        title: 'Ride With Caution',
        advice: 'Strong winds expected. Be mindful of crosswinds.',
        icon: 'flag',
        animatedIconType: 'windy', // Specific animated icon for wind
        colorClass: 'condition-caution',
      };
    }

    if (feelsLike > 34) {
      return {
        verdict: 'Caution',
        title: 'Ride With Caution',
        advice: "It's extremely hot. Stay hydrated and take breaks.",
        icon: 'thermometer',
        animatedIconType: 'hot', // Specific animated icon for heat
        colorClass: 'condition-caution',
      };
    }

    if (weatherCode >= 45 && weatherCode <= 48) {
      // WMO codes for Fog
      return {
        verdict: 'Caution',
        title: 'Ride With Caution',
        advice: 'Foggy conditions ahead. Visibility may be low.',
        icon: 'eye-off',
        animatedIconType: 'fog',
        colorClass: 'condition-caution',
      };
    }

    // GREAT conditions: If no major issues are found
    return {
      verdict: 'Great',
      title: 'Great Day for a Ride!',
      advice: 'Weather is clear. Enjoy the open road!',
      icon: 'sparkles',
      animatedIconType: this.getAnimatedIconType(weatherCode),
      colorClass: 'condition-great',
    };
  }

  /**
   * Maps WMO weather codes to custom animated icon types.
   */
  private getAnimatedIconType(code: number): string {
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
    return 'default'; // A generic fallback icon
  }

  /**
   * Public method to manually trigger location refresh
   * This can be called from the template or other components
   */
  public refreshWeatherWithLocation(): void {
    console.log('User requested weather refresh with fresh location');
    this.fetchWeatherData(this.locationRefreshType === 'accurate');
  }

  /**
   * Refresh with high accuracy location
   */
  public refreshWithHighAccuracy(): void {
    console.log('User requested high accuracy location refresh');
    this.locationRefreshType = 'accurate';
    this.fetchWeatherData(true);
  }

  /**
   * Refresh with fast location
   */
  public refreshWithFastLocation(): void {
    console.log('User requested fast location refresh');
    this.locationRefreshType = 'fast';
    this.fetchWeatherData(false);
  }

  /**
   * Clear location cache and refresh
   */
  public clearLocationCacheAndRefresh(): void {
    console.log('Clearing location cache and refreshing');
    this.placesService.clearLocationCache();
    this.enhancedLocation = null;
    this.locationMetadata = {};
    this.fetchWeatherData();
  }

  /**
   * Toggle location details display
   */
  public toggleLocationDetails(): void {
    this.showLocationDetails = !this.showLocationDetails;
    this.cdr.markForCheck();
  }

  /**
   * Request location permissions
   */
  public async requestLocationPermissions(): Promise<void> {
    try {
      const granted = await this.placesService.requestLocationPermissions();

      if (granted) {
        this.locationMetadata.permissionStatus = 'granted';
        this.fetchWeatherData();
      } else {
        this.locationMetadata.permissionStatus = 'denied';
      }

      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      this.locationMetadata.permissionStatus = 'unknown';
      this.cdr.markForCheck();
    }
  }

  /**
   * Get location accuracy display text
   */
  public getLocationAccuracyText(): string {
    if (!this.locationMetadata.accuracy) return '';

    const accuracy = this.locationMetadata.accuracy;
    if (accuracy <= 10) return `±${accuracy.toFixed(0)}m (Excellent)`;
    if (accuracy <= 50) return `±${accuracy.toFixed(0)}m (Good)`;
    if (accuracy <= 100) return `±${accuracy.toFixed(0)}m (Fair)`;
    return `±${accuracy.toFixed(0)}m (Poor)`;
  }

  /**
   * Get location source display text
   */
  public getLocationSourceText(): string {
    switch (this.locationMetadata.source) {
      case 'capacitor':
        return 'Device GPS';
      case 'browser':
        return 'Browser Location';
      case 'cached':
        return 'Cached Location';
      case 'default':
        return 'Default Location';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get confidence badge color
   */
  public getConfidenceBadgeColor(): string {
    switch (this.locationMetadata.confidence) {
      case 'high':
        return 'success';
      case 'medium':
        return 'warning';
      case 'low':
        return 'danger';
      default:
        return 'medium';
    }
  }

  /**
   * Get permission status display text
   */
  public getPermissionStatusText(): string {
    switch (this.locationMetadata.permissionStatus) {
      case 'granted':
        return 'Location access granted';
      case 'denied':
        return 'Location access denied';
      case 'prompt':
        return 'Location permission required';
      default:
        return 'Location permission unknown';
    }
  }

  /**
   * Check if should show permission request button
   */
  public shouldShowPermissionRequest(): boolean {
    return (
      this.locationMetadata.permissionStatus === 'prompt' ||
      this.locationMetadata.permissionStatus === 'denied'
    );
  }

  /**
   * Get location age text
   */
  public getLocationAgeText(): string {
    if (!this.locationMetadata.timestamp) return '';

    const now = Date.now();
    const age = now - this.locationMetadata.timestamp;
    const minutes = Math.floor(age / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
