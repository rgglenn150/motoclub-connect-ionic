import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core'; // Added ChangeDetectionStrategy and ChangeDetectorRef
import { WeatherService } from '../../service/weather.service';
import { LocationPreferencesService } from '../../service/location-preferences.service'; // Assuming you have this service
import { WeatherData } from '../../models/weather.model';
import { Subject, takeUntil } from 'rxjs'; // Added Subject and takeUntil
import { GeolocationService } from 'src/app/service/geolocation.service';

// Represents the evaluated verdict for the rider
interface RidingConditions {
  verdict: 'Great' | 'Caution' | 'Poor';
  title: string;
  advice: string;
  icon: string; // Ionic icon name
  animatedIconType: string; // Custom animated icon type
  colorClass: string;
}

@Component({
  selector: 'app-weather-widget2',
  templateUrl: './weather-widget2.component.html',
  styleUrls: ['./weather-widget2.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, // Optimize change detection
})
export class WeatherWidget2Component implements OnInit {
  // --- Properties ---
  public isLoading: boolean = true;
  public hasError: boolean = false;
  public errorMessage: string = '';

  public currentWeather!: WeatherData;
  public ridingConditions!: RidingConditions;
  public lastUpdated: Date | null = null; // Changed to Date | null
  public locationName: string = 'Loading...'; // Default loading state for location

  private destroy$ = new Subject<void>();

  constructor(
    private weatherService: WeatherService,
    private locationPreferencesService: LocationPreferencesService, // Inject LocationPreferencesService
    private cdr: ChangeDetectorRef, // Inject ChangeDetectorRef
    private geolocationService: GeolocationService
  ) {}

  ngOnInit() {
    // Subscribe to location preferences changes
    this.locationPreferencesService.preferences$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Reload weather data when preferences change
        this.fetchWeatherData();
      });

    this.fetchWeatherData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Fetches weather data using the WeatherService and updates component state.
   */
  public fetchWeatherData(): void {
    this.isLoading = true;
    this.hasError = false;
    this.locationName = 'Loading...'; // Reset location name
    this.cdr.markForCheck();

    const preferences = this.locationPreferencesService.getCurrentPreferences();
    let weatherObservable;

    if (!preferences.useGps && preferences.preferredLocation) {
      const coords = preferences.preferredLocation.coordinates;
      weatherObservable = this.weatherService.getCurrentWeather(
        coords.latitude,
        coords.longitude
      );
    } else {
      // Default to GPS with fallback, or just fallback if GPS is not preferred and no preferred location
      weatherObservable =
        this.weatherService.getCurrentWeatherForCurrentLocation(); // Assumes service handles fallback
    }

    weatherObservable.subscribe({
      next: (data) => {
        this.currentWeather = data;
        console.log('rgdb data ', data.location);
        this.geolocationService
          .reverseGeocode(data.location.latitude, data.location.longitude)
          .subscribe((address) => {
            console.log('rgdb address ', address);
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

      /*   this.locationName =
          data.location.name ||
          `${data.location.latitude.toFixed(
            1
          )}°, ${data.location.longitude.toFixed(1)}°`; */
        this.ridingConditions = this.evaluateRidingConditions(data);
        this.lastUpdated = new Date();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Failed to fetch weather data:', err);
        this.errorMessage =
          err.message || 'Could not load weather. Please try again.';
        this.hasError = true;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
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

    // POOR conditions: High chance of rain or dangerous weather
    if (chanceOfRain > 40 || weatherCode >= 80) {
      // WMO codes for showers/thunderstorms
      return {
        verdict: 'Poor',
        title: 'Ride With Caution',
        advice: 'High chance of rain. Grab your raincoat if you must go!',
        icon: 'umbrella',
        animatedIconType: this.getAnimatedIconType(weatherCode),
        colorClass: 'condition-poor',
      };
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
}
